/**
 * Reservas públicas.
 *
 *   POST /api/v1/bookings                  crear (re-cotiza en backend)
 *   GET  /api/v1/bookings/:token           ver la propia reserva
 *   POST /api/v1/bookings/:token/cancel    cancelar (regla 24 h)
 *
 * El precio NUNCA viene del cliente: se recalcula acá con el mismo
 * QuoteService, de modo que manipular el payload no cambia lo que se
 * cobra ni lo que se bloquea en la agenda.
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
import { normalizePhoneAr } from "../../domain/phone";
import { logBookingFailure, requestId } from "../../lib/observability";
import {
  BookingError,
  cancelBooking,
  createBooking,
  getBookingByToken,
  type CreateBookingItem,
} from "../../lib/booking/repository";
import { checkOfferedSlot } from "../../domain/offered-slot";
import {
  loadArea,
  loadAvailabilitySettings,
  loadBlockingDemands,
  loadBusinessHours,
  loadScheduleExceptions,
} from "../../lib/availability/repository";
import { SALON_TZ_OFFSET_MIN } from "../../config/salon";

const createSchema = z.object({
  serviceSlug: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  lengthTier: z.enum(["corto", "medio", "largo", "xl", "unico"]).nullish(),
  personalization: z.record(z.string().max(64), z.string().max(64)).optional(),
  extraCodes: z.array(z.string().min(1).max(64)).max(10).default([]),
  startsAt: z.string().datetime({ offset: true }),
  customer: z.object({
    firstName: z.string().min(1).max(80),
    lastName: z.string().max(80).optional(),
    phone: z.string().min(6).max(30),
    email: z.string().email().max(160),
    acceptsMarketing: z.boolean().default(false),
  }),
  note: z.string().max(500).optional(),
});

/** Mensajes en lenguaje humano: la UI muestra esto tal cual (§29). */
const BOOKING_ERROR_MESSAGES: Record<string, { status: 400 | 404 | 409 | 422; message: string }> = {
  capacity_full: {
    status: 409,
    message: "Ese horario ya no está disponible. Elegí otro y lo reservamos.",
  },
  area_closed: {
    status: 409,
    message: "Ese día el salón no atiende. Probá con otra fecha.",
  },
  area_not_bookable_online: {
    status: 422,
    message: "Ese servicio se coordina por mensaje. Escribinos y lo agendamos.",
  },
  area_not_found: { status: 404, message: "No encontramos ese servicio." },
  unknown_service: { status: 404, message: "No encontramos ese servicio." },
  unknown_extra: { status: 404, message: "No encontramos uno de los adicionales elegidos." },
  invalid_window: { status: 400, message: "El horario elegido no es válido." },
  not_offered: {
    status: 409,
    message: "Ese horario ya no está disponible. Elegí otro y lo reservamos.",
  },
  too_far_ahead: {
    status: 422,
    message: "Todavía no estamos tomando turnos para esa fecha. Probá con una más cercana.",
  },
  booking_not_found: { status: 404, message: "No encontramos esa reserva." },
  not_cancellable: {
    status: 409,
    message: "Esta reserva ya no se puede cancelar desde acá. Escribinos y lo vemos.",
  },
};

/**
 * Tres situaciones distintas, tres mensajes. Una reserva que nunca llegó
 * a pagar la seña no tiene nada que reintegrar: hablarle de reintegros
 * suena a penalidad y confunde.
 */
function cancellationMessage(result: {
  refund_due: boolean;
  previous_status: string;
  deposit_amount: number;
}): string {
  if (result.refund_due) return "Cancelamos tu turno. Te devolvemos la seña.";
  if (result.previous_status === "pending_payment" || result.deposit_amount === 0) {
    return "Cancelamos tu turno. No habías abonado la seña, así que no hay nada pendiente.";
  }
  return "Cancelamos tu turno. Por cancelar con menos de 24 horas de anticipación, la seña no se reintegra.";
}

function bookingHttpError(code: string): HTTPException {
  const mapped = BOOKING_ERROR_MESSAGES[code] ?? {
    status: 400 as const,
    message: "No pudimos completar la reserva. Intentá de nuevo.",
  };
  return new HTTPException(mapped.status, { message: mapped.message });
}

/**
 * Qué falta, dicho por su nombre. "Falta un dato" obliga a adivinar cuál,
 * y quien lo lee está con una clienta enfrente.
 */
function quoteErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    length_required: "Este servicio cobra según el largo del pelo: elegí uno.",
    tier_not_found: "No tenemos precio cargado para ese largo. Revisalo en Configuración.",
    unknown_option: "Una de las opciones elegidas ya no existe en el catálogo.",
    service_not_quotable: "Ese servicio todavía no tiene precio cargado.",
  };
  return messages[code] ?? "Falta un dato para calcular el turno.";
}

export function createBookingsRoute(env: ServerEnv) {
  const route = new Hono();

  route.post("/", async (c) => {
    const parsed = createSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      throw new HTTPException(400, { message: "Revisá los datos de la reserva." });
    }
    const body = parsed.data;

    const phone = normalizePhoneAr(body.customer.phone);
    if (!phone) {
      throw new HTTPException(400, {
        message: "Revisá el teléfono: necesitamos un número donde podamos escribirte.",
      });
    }

    const startsAt = new Date(body.startsAt);
    if (Number.isNaN(startsAt.getTime()) || startsAt.getTime() <= Date.now()) {
      throw new HTTPException(400, { message: "Elegí un horario futuro." });
    }

    const anon = createSupabaseAnonClient(env);
    const catalog = createCatalogRepository(anon);
    const context = await loadQuoteContext(anon, catalog, {
      serviceSlug: body.serviceSlug,
      extraCodes: body.extraCodes,
    });
    /**
     * Rechazo del canal público: se registra antes de responder.
     * Devuelve la excepción en vez de lanzarla para que TypeScript siga
     * estrechando los tipos después del `throw`.
     */
    const reject = (code: string): HTTPException => {
      logBookingFailure({
        code,
        channel: "online",
        serviceSlug: body.serviceSlug,
        areaSlug: context?.areaSlug ?? null,
        startsAt: body.startsAt,
        lengthTier: body.lengthTier ?? null,
        requestId: requestId(c.req),
      });
      return bookingHttpError(code);
    };

    if (!context) throw reject("unknown_service");

    // Autoridad de precio y duración: se recalcula, no se recibe.
    let quote;
    try {
      quote = computeQuote({
        service: context.service,
        lengthTier: body.lengthTier ?? null,
        personalization: body.personalization,
        extras: context.extras,
        settings: context.settings,
      });
    } catch (error) {
      if (error instanceof QuoteError) {
        logBookingFailure({
          code: error.code,
          channel: "online",
          serviceSlug: body.serviceSlug,
          areaSlug: context.areaSlug,
          startsAt: body.startsAt,
          lengthTier: body.lengthTier ?? null,
          requestId: requestId(c.req),
        });
        throw new HTTPException(422, { message: quoteErrorMessage(error.code) });
      }
      throw error;
    }

    const endsAt = new Date(startsAt.getTime() + quote.blockingMin * 60_000);

    // El horario tiene que ser uno de los que el salón ofrece de verdad.
    // Que el instante sea futuro no alcanza: sin esto entra un domingo a
    // las 03:00 salteando `/availability`.
    const admin = createSupabaseAdminClient(env);
    const area = await loadArea(admin, context.areaSlug);
    if (!area) throw reject("area_not_found");
    if (!area.isBookableOnline) throw reject("area_not_bookable_online");

    const now = new Date();
    const settings = await loadAvailabilitySettings(anon);
    const window = { from: new Date(startsAt.getTime() - 86_400_000), to: endsAt };
    const [businessHours, exceptions, existing] = await Promise.all([
      loadBusinessHours(anon),
      loadScheduleExceptions(admin, { areaId: area.id, ...window }),
      loadBlockingDemands(admin, { areaId: area.id, ...window, now }),
    ]);

    const rejection = checkOfferedSlot({
      startsAt,
      now,
      maxAdvanceDays: settings.maxAdvanceDays,
      availability: {
        blockingMin: quote.blockingMin,
        areaCapacity: area.capacity,
        businessHours,
        exceptions,
        existing,
        slotGranularityMin: settings.slotGranularityMin,
        minAdvanceMin: settings.minAdvanceMin,
        now,
        tzOffsetMin: SALON_TZ_OFFSET_MIN,
      },
    });
    if (rejection) throw reject(rejection);

    const items: CreateBookingItem[] = quote.items.map((item) => ({
      ...(item.role === "main"
        ? { service_slug: item.slug }
        : { extra_slug: `${context.areaSlug}-${item.slug}` }),
      role: item.role,
      name: item.name,
      price_amount: item.priceAmount,
      length_tier: item.lengthTier,
      duration_min: item.durationMin,
      process_min: item.processMin,
      setup_min: item.setupMin,
      personalization: item.role === "main" ? (body.personalization ?? null) : null,
    }));

    try {
      const booking = await createBooking(admin, {
        areaSlug: context.areaSlug,
        startsAt,
        endsAt,
        shownDurationMin: quote.durationShownMin,
        priceDisplayMode: quote.priceDisplayMode,
        priceEstimatedMin: quote.estimatedMinAmount,
        priceEstimatedMax: quote.estimatedMaxAmount,
        depositRate: quote.depositRatePct,
        depositAmount: quote.depositAmount,
        customer: {
          first_name: body.customer.firstName,
          last_name: body.customer.lastName ?? null,
          phone_e164: phone,
          email: body.customer.email,
          accepts_marketing: body.customer.acceptsMarketing,
        },
        items,
        customerNote: body.note ?? null,
        source: "online",
      });

      return c.json(
        {
          data: {
            publicToken: booking.public_token,
            status: booking.status,
            startsAt: booking.starts_at,
            paymentRequiredUntil: booking.payment_required_until,
            depositAmount: booking.deposit_amount,
            depositRatePct: quote.depositRatePct,
            estimatedAmount: quote.estimatedMinAmount,
            remainingAmount: quote.remainingAmount,
            priceDisplayMode: quote.priceDisplayMode,
            isEstimate: quote.isEstimate,
            durationShownMin: quote.durationShownMin,
          },
        },
        201,
      );
    } catch (error) {
      if (error instanceof BookingError) {
        logBookingFailure({
          code: error.code,
          channel: "online",
          serviceSlug: body.serviceSlug,
          areaSlug: context.areaSlug,
          startsAt: body.startsAt,
          lengthTier: body.lengthTier ?? null,
          requestId: requestId(c.req),
        });
        throw bookingHttpError(error.code);
      }
      throw error;
    }
  });

  route.get("/:token", async (c) => {
    const token = c.req.param("token");
    if (!/^[a-f0-9]{32}$/.test(token)) {
      throw new HTTPException(404, { message: "No encontramos esa reserva." });
    }
    const booking = await getBookingByToken(createSupabaseAdminClient(env), token);
    if (!booking) throw new HTTPException(404, { message: "No encontramos esa reserva." });
    return c.json({ data: booking });
  });

  route.post("/:token/cancel", async (c) => {
    const token = c.req.param("token");
    if (!/^[a-f0-9]{32}$/.test(token)) {
      throw new HTTPException(404, { message: "No encontramos esa reserva." });
    }
    const body = await c.req.json().catch(() => ({}));
    const reason = typeof body?.reason === "string" ? body.reason.slice(0, 300) : null;

    try {
      const result = await cancelBooking(createSupabaseAdminClient(env), {
        publicToken: token,
        reason,
      });
      return c.json({
        data: {
          status: result.status,
          refundDue: result.refund_due,
          message: cancellationMessage(result),
        },
      });
    } catch (error) {
      if (error instanceof BookingError) throw bookingHttpError(error.code);
      throw error;
    }
  });

  return route;
}
