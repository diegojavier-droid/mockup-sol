/**
 * GET /api/v1/availability — horarios viables para un servicio.
 *
 * La duración que se ubica es la ventana operativa (C = M + setup), que
 * el backend deriva de la cotización. La clienta nunca envía duración ni
 * ve el setup.
 */

import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import type { ServerEnv } from "../../config/env";
import { createSupabaseAdminClient, createSupabaseAnonClient } from "../../lib/supabase";
import { createCatalogRepository } from "../../lib/catalog/repository";
import { loadQuoteContext } from "../../lib/quote/repository";
import { computeQuote } from "../../domain/quote";
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
  service: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  length: z.enum(["corto", "medio", "largo", "xl", "unico"]).optional(),
  extras: z.string().max(256).optional(),
  from: z.string().datetime().optional(),
  days: z.coerce.number().int().min(1).max(60).optional(),
  personalization: z.string().max(512).optional(),
});

function parsePersonalization(raw: string | undefined): Record<string, string> | undefined {
  if (!raw) return undefined;
  const out: Record<string, string> = {};
  for (const pair of raw.split(",")) {
    const [field, option] = pair.split(":");
    if (field && option) out[field.trim()] = option.trim();
  }
  return Object.keys(out).length ? out : undefined;
}

export function createAvailabilityRoute(env: ServerEnv) {
  const route = new Hono();

  route.get("/", async (c) => {
    const parsed = querySchema.safeParse(c.req.query());
    if (!parsed.success) {
      throw new HTTPException(400, { message: "Invalid availability query" });
    }

    const anon = createSupabaseAnonClient(env);
    const catalog = createCatalogRepository(anon);
    const context = await loadQuoteContext(anon, catalog, {
      serviceSlug: parsed.data.service,
      extraCodes: parsed.data.extras ? parsed.data.extras.split(",").filter(Boolean) : [],
    });
    if (!context) {
      throw new HTTPException(404, { message: "Service not found" });
    }

    let blockingMin: number;
    try {
      blockingMin = computeQuote({
        service: context.service,
        lengthTier: parsed.data.length ?? null,
        personalization: parsePersonalization(parsed.data.personalization),
        extras: context.extras,
        settings: context.settings,
      }).blockingMin;
    } catch (error) {
      if (error instanceof QuoteError) {
        throw new HTTPException(422, { message: error.code });
      }
      throw error;
    }

    const admin = createSupabaseAdminClient(env);
    const area = await loadArea(admin, context.areaSlug);
    if (!area) {
      throw new HTTPException(404, { message: "Area not found" });
    }
    if (!area.isBookableOnline) {
      return c.json({
        data: { bookableOnline: false, days: [] },
      });
    }

    const settings = await loadAvailabilitySettings(anon);
    const now = new Date();
    const rangeStart = parsed.data.from ? new Date(parsed.data.from) : now;
    const days = parsed.data.days ?? Math.min(settings.maxAdvanceDays, 21);
    const rangeEnd = new Date(rangeStart.getTime() + days * 24 * 60 * 60_000);

    const [businessHours, exceptions, existing] = await Promise.all([
      loadBusinessHours(anon),
      loadScheduleExceptions(admin, { areaId: area.id, from: rangeStart, to: rangeEnd }),
      loadBlockingDemands(admin, { areaId: area.id, from: rangeStart, to: rangeEnd, now }),
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

    return c.json({ data: { bookableOnline: true, days: slots } });
  });

  return route;
}
