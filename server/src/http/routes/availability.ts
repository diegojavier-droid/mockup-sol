/**
 * POST /api/v1/availability (GET legacy) — horarios viables para un servicio.
 *
 * La duración que se ubica es la ventana operativa (C = M + setup), que
 * el backend deriva de la cotización. La clienta nunca envía duración ni
 * ve el setup.
 */

import { Hono, type Context } from "hono";
import { recordAssistedActivityInBackground, waitUntilContextOf } from "../../lib/assisted/record";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import type { ServerEnv } from "../../config/env";
import { createSupabaseAdminClient, createSupabaseAnonClient } from "../../lib/supabase";
import { createCatalogRepository } from "../../lib/catalog/repository";
import {
  cotizarPartes,
  loadServiceParts,
  normalizeServiceParts,
  servicePartsErrorMessage,
  ServicePartsError,
} from "../../lib/quote/parts";
import { QuoteError } from "../../domain/types";
import { computeAvailability } from "../../domain/availability";
import {
  loadArea,
  loadAvailabilitySettings,
  loadBlockingDemands,
  loadBusinessHours,
  loadScheduleExceptions,
} from "../../lib/availability/repository";
import { SALON_TZ_OFFSET_MIN } from "../../config/salon";

export { SALON_TZ_OFFSET_MIN } from "../../config/salon";

const querySchema = z.object({
  /**
   * Uno o varios servicios separados por coma: `service=color,corte-fem`.
   * Si no se pide el bloque completo, la web ofrecería horarios donde
   * entra el corte pero no el color y el corte juntos.
   */
  service: z
    .string()
    .min(1)
    .max(260)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*(,[a-z0-9]+(-[a-z0-9]+)*)*$/),
  /** Un largo por servicio, en el mismo orden; uno solo se aplica a todos. */
  length: z
    .string()
    .max(64)
    .regex(/^(corto|medio|largo|xl|unico)(,(corto|medio|largo|xl|unico))*$/)
    .optional(),
  extras: z.string().max(256).optional(),
  from: z.string().datetime().optional(),
  days: z.coerce.number().int().min(1).max(60).optional(),
  personalization: z.string().max(512).optional(),
});

// JSON preserves field/option boundaries and keeps answers out of URLs.
const requestSchema = querySchema.extend({
  personalization: z
    .record(z.string().min(1).max(64), z.string().max(64))
    .refine(
      (answers) =>
        Object.entries(answers).reduce(
          (size, [field, option]) => size + field.length + option.length + 2,
          0,
        ) <= 512,
    )
    .optional(),
});

type AvailabilityInput = z.infer<typeof requestSchema>;

// Explicit adapters keep HTTP tests isolated without replacing shared modules.
const defaultDependencies = {
  createSupabaseAnonClient,
  createSupabaseAdminClient,
  createCatalogRepository,
  loadServiceParts,
  loadArea,
  loadAvailabilitySettings,
  loadBusinessHours,
  loadScheduleExceptions,
  loadBlockingDemands,
  recordAssistedActivityInBackground,
};

function parsePersonalization(raw: string | undefined): Record<string, string> | undefined {
  if (!raw) return undefined;
  const out: Record<string, string> = {};
  for (const pair of raw.split(",")) {
    const [field, option] = pair.split(":");
    if (field && option) out[field.trim()] = option.trim();
  }
  return Object.keys(out).length ? out : undefined;
}

export function createAvailabilityRoute(
  env: ServerEnv,
  dependencies: typeof defaultDependencies = defaultDependencies,
) {
  const route = new Hono();

  route.use("*", async (c, next) => {
    c.header("Cache-Control", "no-store");
    await next();
    c.header("Cache-Control", "no-store");
  });

  route.get("/", async (c) => {
    const parsed = querySchema.safeParse(c.req.query());
    if (!parsed.success) {
      throw new HTTPException(400, { message: "Invalid availability query" });
    }
    const personalization = parsePersonalization(parsed.data.personalization);
    return respond(c, { ...parsed.data, personalization });
  });

  route.post("/", async (c) => {
    const parsed = requestSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      throw new HTTPException(400, { message: "Invalid availability query" });
    }
    return respond(c, parsed.data);
  });

  async function respond(c: Context, input: AvailabilityInput) {
    // Health context is not needed to calculate slots, on either transport.
    // Rejection cannot erase legacy URLs already received by infrastructure.
    if (
      Object.keys(input.personalization ?? {}).some(
        (field) => field.trim().toLowerCase() === "alergias",
      )
    ) {
      throw new HTTPException(400, { message: "Invalid availability query" });
    }
    const anon = dependencies.createSupabaseAnonClient(env);
    const catalog = dependencies.createCatalogRepository(anon);
    const slugs = input.service.split(",").filter(Boolean);
    const lengths = input.length ? input.length.split(",") : [];
    const partsInput = slugs.map((serviceSlug, i) => ({
      serviceSlug,
      // Un solo largo se aplica a todo: pedir «medio» para color y corte
      // no debería obligar a repetirlo.
      lengthTier: (lengths.length === 1 ? lengths[0] : lengths[i]) as
        | "corto"
        | "medio"
        | "largo"
        | "xl"
        | "unico"
        | undefined,
      // La personalización acompaña al primer servicio: es el que la
      // pantalla pregunta.
      personalization: i === 0 ? input.personalization : undefined,
    }));

    let loaded;
    try {
      loaded = await dependencies.loadServiceParts(anon, catalog, {
        parts: normalizeServiceParts({ services: partsInput }),
        extraCodes: input.extras ? input.extras.split(",").filter(Boolean) : [],
      });
    } catch (error) {
      if (error instanceof ServicePartsError) {
        throw new HTTPException(422, { message: servicePartsErrorMessage(error.code) });
      }
      throw error;
    }
    if (!loaded) {
      throw new HTTPException(404, { message: "Service not found" });
    }
    const context = loaded.contexts[0];

    let blockingMin: number;
    try {
      blockingMin = cotizarPartes(loaded.contexts, partsInput, context.settings).total.blockingMin;
    } catch (error) {
      if (error instanceof QuoteError) {
        throw new HTTPException(422, { message: error.code });
      }
      throw error;
    }

    const admin = dependencies.createSupabaseAdminClient(env);
    const area = await dependencies.loadArea(admin, context.areaSlug);
    if (!area) {
      throw new HTTPException(404, { message: "Area not found" });
    }
    if (!area.isBookableOnline) {
      return c.json({
        data: { bookableOnline: false, days: [] },
      });
    }

    const settings = await dependencies.loadAvailabilitySettings(anon);
    const now = new Date();
    const rangeStart = input.from ? new Date(input.from) : now;
    const days = input.days ?? Math.min(settings.maxAdvanceDays, 21);
    const rangeEnd = new Date(rangeStart.getTime() + days * 24 * 60 * 60_000);

    const [businessHours, exceptions, existing] = await Promise.all([
      dependencies.loadBusinessHours(anon),
      dependencies.loadScheduleExceptions(admin, {
        areaId: area.id,
        from: rangeStart,
        to: rangeEnd,
      }),
      dependencies.loadBlockingDemands(admin, {
        areaId: area.id,
        from: rangeStart,
        to: rangeEnd,
        now,
      }),
    ]);

    const slots = computeAvailability({
      blockingMin,
      areaCapacity: area.capacity,
      businessHours,
      exceptions,
      existing,
      rangeStart,
      rangeEnd,
      slotGranularityMin: settings.slotGranularityMin,
      minAdvanceMin: settings.minAdvanceMin,
      now,
      tzOffsetMin: SALON_TZ_OFFSET_MIN,
    });

    // La web acaba de contestar qué horarios hay, sin que nadie del
    // salón coordinara nada.
    dependencies.recordAssistedActivityInBackground(
      admin,
      "availability_self_service",
      waitUntilContextOf(c),
    );
    return c.json({ data: { bookableOnline: true, days: slots } });
  }

  return route;
}
