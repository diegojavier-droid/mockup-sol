/**
 * Panel interno — agenda, clientas y configuración.
 *
 * Todo el router exige staff autenticado y autorizado. Las acciones que
 * cambian las reglas del negocio (precios, tiempos, horarios) exigen
 * además rol owner.
 */

import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import type { ServerEnv } from "../../config/env";
import { createSupabaseAdminClient } from "../../lib/supabase";
import { requireOwner, staffAuth, type StaffVars } from "../middleware/staffAuth";
import {
  addCustomerNote,
  getBookingForStaff,
  getCustomerDetail,
  listAgenda,
  recordExecution,
  searchCustomers,
  TransitionError,
  updateBookingStatus,
} from "../../lib/admin/repository";
import {
  assignStation,
  blockStation,
  closeService,
  listStations,
  loadDashboardSummary,
  loadReconciliation,
  StationError,
  unblockStation,
} from "../../lib/admin/repository";
import { listPendingLinks, resolvePendingLink } from "../../lib/identity/repository";
import {
  createBooking,
  checkCapacity,
  markNoShow,
  BookingError,
  type CapacityCheck,
} from "../../lib/booking/repository";
import { normalizePhoneAr } from "../../domain/phone";
import { logBookingFailure, requestId } from "../../lib/observability";
import { computeQuote } from "../../domain/quote";
import { QuoteError } from "../../domain/types";
import { loadQuoteContext } from "../../lib/quote/repository";
import { createCatalogRepository } from "../../lib/catalog/repository";
import { createSupabaseAnonClient } from "../../lib/supabase";

const SALON_TZ = "-03:00";

/**
 * Qué se le dice a la persona cuando el turno no entra.
 *
 * Nunca "no disponible": eso obliga a adivinar. Se dicen los números
 * concretos, porque son los que permiten decidir si vale la pena crear
 * la excepción.
 */
function capacityConflictMessage(check: CapacityCheck): string {
  if (check.area_closed) {
    return `Ese horario está marcado como cerrado${check.area_name ? ` para ${check.area_name}` : ""}. Podés crear el turno igualmente.`;
  }
  if (check.capacity !== undefined && check.peak !== undefined) {
    const donde = check.area_name ? ` en ${check.area_name}` : "";
    return `Ese horario ya está completo${donde}: ${check.peak} de ${check.capacity} lugares ocupados. Podés crear el turno igualmente.`;
  }
  return "Ese horario supera la disponibilidad configurada. Podés crear el turno igualmente.";
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

export function createAdminRoute(env: ServerEnv) {
  const route = new Hono<{ Variables: StaffVars }>();
  route.use("*", staffAuth(env));

  route.get("/me", (c) => c.json({ data: c.get("staff") }));

  // ---------------------------------------------------------------- agenda
  route.get("/agenda", async (c) => {
    const schema = z.object({
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
      days: z.coerce.number().int().min(1).max(31).default(1),
      area: z.string().max(32).optional(),
    });
    const parsed = schema.safeParse(c.req.query());
    if (!parsed.success) throw new HTTPException(400, { message: "Consulta inválida." });

    const day = parsed.data.date ?? new Date().toISOString().slice(0, 10);
    const from = new Date(`${day}T00:00:00${SALON_TZ}`);
    const to = new Date(from.getTime() + parsed.data.days * 24 * 60 * 60_000);

    const entries = await listAgenda(createSupabaseAdminClient(env), {
      from,
      to,
      area: parsed.data.area,
    });
    return c.json({ data: { date: day, days: parsed.data.days, entries } });
  });

  route.get("/bookings/:id", async (c) => {
    const booking = await getBookingForStaff(createSupabaseAdminClient(env), c.req.param("id"));
    if (!booking) throw new HTTPException(404, { message: "No encontramos ese turno." });
    return c.json({ data: booking });
  });

  route.patch("/bookings/:id/status", async (c) => {
    const schema = z.object({
      status: z.enum(["confirmed", "attended", "cancelled", "expired"]),
    });
    const parsed = schema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) throw new HTTPException(400, { message: "Estado inválido." });

    try {
      const updated = await updateBookingStatus(createSupabaseAdminClient(env), {
        bookingId: c.req.param("id"),
        status: parsed.data.status,
      });
      return c.json({ data: updated });
    } catch (error) {
      if (error instanceof TransitionError) {
        throw new HTTPException(409, {
          message: `Un turno ${describeStatus(error.from)} no puede pasar a ${describeStatus(error.to)}.`,
        });
      }
      if (error instanceof Error && error.message === "booking_not_found") {
        throw new HTTPException(404, { message: "No encontramos ese turno." });
      }
      throw error;
    }
  });

  /**
   * Ausencia sin aviso. No es una variante de cancelar: nadie avisó y la
   * hora se perdió. Si había seña acreditada se retiene; si no la había,
   * no se inventa ninguna consecuencia económica.
   */
  route.post("/bookings/:id/no-show", async (c) => {
    const staff = c.get("staff");
    try {
      const result = await markNoShow(createSupabaseAdminClient(env), {
        bookingId: c.req.param("id"),
        actorId: staff.staffId,
        actorLabel: staff.email,
      });
      const message =
        result.deposit_status === "retained"
          ? `Registrado como ausencia. La seña de $${result.deposit_amount.toLocaleString("es-AR")} queda retenida.`
          : "Registrado como ausencia. No había seña abonada, así que no hay nada que retener.";
      return c.json({ data: { ...result, message } });
    } catch (error) {
      if (error instanceof BookingError || error instanceof Error) {
        const code = error instanceof BookingError ? error.code : error.message;
        if (code === "booking_not_found") {
          throw new HTTPException(404, { message: "No encontramos ese turno." });
        }
        if (code === "not_markable") {
          throw new HTTPException(409, {
            message: "Sólo se puede marcar ausencia en un turno que estaba tomado.",
          });
        }
      }
      throw error;
    }
  });

  /**
   * Vínculos de identidad esperando confirmación.
   *
   * Aparecen cuando alguien entra con Google y sólo coincide el teléfono
   * con una ficha existente. Hasta que el salón confirme, esa persona
   * puede reservar pero no ve el historial: el teléfono no autentica.
   */
  route.get("/pending-links", async (c) => {
    const links = await listPendingLinks(createSupabaseAdminClient(env));
    return c.json({ data: links });
  });

  route.post("/pending-links/:id", async (c) => {
    const schema = z.object({ approve: z.boolean() });
    const parsed = schema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) throw new HTTPException(400, { message: "Indicá si se aprueba." });
    const staff = c.get("staff");
    const result = await resolvePendingLink(createSupabaseAdminClient(env), {
      identityId: c.req.param("id"),
      approve: parsed.data.approve,
      actorId: staff.staffId,
      actorLabel: staff.email,
    });
    return c.json({
      data: {
        ...result,
        message: parsed.data.approve
          ? "Vinculado. Ahora ve su historial."
          : "Rechazado. La cuenta queda sin acceso a esa ficha.",
      },
    });
  });

  /**
   * Cerrar la atención. Pasa con la clienta todavía en el salón, así que
   * sólo tres cosas son obligatorias: qué se hizo, cuánto se acordó y
   * cuánto entró. Todo lo demás es opcional.
   */
  route.post("/bookings/:id/close", async (c) => {
    const schema = z.object({
      finalPrice: z.number().int().min(0),
      servicesDone: z.string().max(400).optional(),
      staffId: z.string().uuid().nullish(),
      durationMin: z.number().int().min(1).max(1440).nullish(),
      formula: z.string().max(2000).optional(),
      // NULL es un valor válido y significa "no sabemos". Nunca se estima.
      costAmount: z.number().int().min(0).nullish(),
      observation: z.string().max(1000).optional(),
      payments: z
        .array(
          z.object({
            amount: z.number().int().min(1),
            method: z.enum(["efectivo", "transferencia", "mercado_pago", "otro"]),
            kind: z.enum(["deposit", "balance", "adjustment"]).default("balance"),
            note: z.string().max(200).optional(),
          }),
        )
        .max(10)
        .default([]),
    });
    const parsed = schema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) throw new HTTPException(400, { message: "Revisá los datos del cierre." });
    const staff = c.get("staff");

    try {
      const result = await closeService(createSupabaseAdminClient(env), {
        bookingId: c.req.param("id"),
        ...parsed.data,
        actorId: staff.staffId,
        actorLabel: staff.email,
      });
      const parts = [`Atención cerrada por $${result.final_price.toLocaleString("es-AR")}.`];
      if (result.outstanding > 0) {
        parts.push(`Queda un saldo de $${result.outstanding.toLocaleString("es-AR")}.`);
      }
      return c.json({ data: { ...result, message: parts.join(" ") } });
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      if (code.includes("booking_not_found")) {
        throw new HTTPException(404, { message: "No encontramos ese turno." });
      }
      if (code.includes("not_closable")) {
        throw new HTTPException(409, {
          message: "Ese turno no se puede cerrar: fue cancelado o marcado como ausencia.",
        });
      }
      throw error;
    }
  });

  // ------------------------------------------------------------ estaciones
  // ÁREA != ESTACIÓN: el mostrador necesita poder decir "a qué sillón" y
  // "cuál está fuera de servicio". La asignación sigue siendo OPCIONAL
  // (D-06): obligarla rompería el alta rápida.

  route.get("/stations", async (c) => {
    const schema = z.object({
      area: z.string().min(1).max(64).optional(),
      at: z.string().datetime({ offset: true }).optional(),
    });
    const parsed = schema.safeParse(c.req.query());
    if (!parsed.success) throw new HTTPException(400, { message: "Consulta inválida." });

    const stations = await listStations(createSupabaseAdminClient(env), {
      area: parsed.data.area,
      at: parsed.data.at ? new Date(parsed.data.at) : undefined,
    });
    return c.json({ data: stations });
  });

  route.post("/bookings/:id/station", async (c) => {
    const schema = z.object({ stationId: z.string().uuid().nullable() });
    const parsed = schema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) throw new HTTPException(400, { message: "Elegí una estación válida." });

    try {
      await assignStation(createSupabaseAdminClient(env), {
        bookingId: c.req.param("id"),
        stationId: parsed.data.stationId,
      });
    } catch (error) {
      if (error instanceof StationError) {
        throw new HTTPException(error.code === "not_found" ? 404 : 409, {
          message:
            error.code === "not_found"
              ? "No encontramos ese turno o esa estación."
              : error.code === "blocked"
                ? "Esa estación está fuera de servicio en ese horario."
                : "Esa estación no es del área del turno.",
        });
      }
      throw error;
    }
    return c.json({ data: { ok: true } });
  });

  route.post("/stations/:id/block", async (c) => {
    const schema = z.object({
      startsAt: z.string().datetime({ offset: true }),
      endsAt: z.string().datetime({ offset: true }),
      reason: z.string().min(1).max(200),
    });
    const parsed = schema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) throw new HTTPException(400, { message: "Faltan datos del bloqueo." });

    const startsAt = new Date(parsed.data.startsAt);
    const endsAt = new Date(parsed.data.endsAt);
    if (endsAt <= startsAt) throw new HTTPException(400, { message: "El rango está al revés." });

    const result = await blockStation(createSupabaseAdminClient(env), {
      stationId: c.req.param("id"),
      startsAt,
      endsAt,
      reason: parsed.data.reason,
      createdBy: c.get("staff").staffId,
    });

    return c.json({
      data: {
        ...result,
        // Que el mostrador sepa a cuántas personas hay que reubicar: el
        // turno no se cancela, se queda sin estación.
        message:
          result.displacedBookings === 0
            ? null
            : `${result.displacedBookings} ${
                result.displacedBookings === 1 ? "turno quedó" : "turnos quedaron"
              } sin estación asignada. Siguen en la agenda: hay que reubicarlos.`,
      },
    });
  });

  route.post("/stations/blocks/:blockId/remove", async (c) => {
    await unblockStation(createSupabaseAdminClient(env), c.req.param("blockId"));
    return c.json({ data: { ok: true } });
  });

  /**
   * Qué pasa si se crea un turno en este horario. Se consulta ANTES de
   * intentar, para poder advertir con números en vez de fallar.
   */
  route.get("/capacity", async (c) => {
    const schema = z.object({
      area: z.string().min(1).max(64),
      startsAt: z.string().datetime({ offset: true }),
      endsAt: z.string().datetime({ offset: true }),
    });
    const parsed = schema.safeParse(c.req.query());
    if (!parsed.success) throw new HTTPException(400, { message: "Consulta inválida." });
    const check = await checkCapacity(createSupabaseAdminClient(env), {
      areaSlug: parsed.data.area,
      startsAt: new Date(parsed.data.startsAt),
      endsAt: new Date(parsed.data.endsAt),
    });
    if (!check.found) throw new HTTPException(404, { message: "No encontramos esa área." });
    return c.json({
      data: { ...check, message: check.fits ? null : capacityConflictMessage(check) },
    });
  });

  // Turno interno: el salón toma turnos por mostrador, teléfono y WhatsApp.
  route.post("/bookings", async (c) => {
    const schema = z
      .object({
        serviceSlug: z.string().min(1).max(64),
        lengthTier: z.enum(["corto", "medio", "largo", "xl", "unico"]).nullish(),
        personalization: z.record(z.string().max(64), z.string().max(64)).optional(),
        extraCodes: z.array(z.string().min(1).max(64)).max(10).default([]),
        startsAt: z.string().datetime({ offset: true }),
        customer: z.object({
          firstName: z.string().min(1).max(80),
          lastName: z.string().max(80).optional(),
          phone: z.string().min(6).max(30),
          email: z.string().email().max(160).optional(),
        }),
        note: z.string().max(500).optional(),
        // El canal es un dato del negocio: por dónde llegó la clienta.
        source: z.enum(["manual", "phone", "whatsapp", "walk_in"]).default("manual"),
        // Crear aunque el motor diga que no entra. Nunca silencioso.
        override: z.boolean().default(false),
        overrideReason: z.string().max(300).optional(),
      })
      // Una excepción sin motivo no es auditable, y auditarla es la
      // única razón por la que se permite saltar la disponibilidad.
      .refine((v) => !v.override || (v.overrideReason ?? "").trim().length > 0, {
        path: ["overrideReason"],
        message: "override_reason_required",
      });
    const parsed = schema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      const needsReason = parsed.error.issues.some((i) => i.message === "override_reason_required");
      throw new HTTPException(400, {
        message: needsReason
          ? "Para tomar el turno igualmente, contá por qué."
          : "Revisá los datos del turno.",
      });
    }
    const body = parsed.data;

    const phone = normalizePhoneAr(body.customer.phone);
    if (!phone) throw new HTTPException(400, { message: "Revisá el teléfono." });

    const anon = createSupabaseAnonClient(env);
    const context = await loadQuoteContext(anon, createCatalogRepository(anon), {
      serviceSlug: body.serviceSlug,
      extraCodes: body.extraCodes,
    });
    if (!context) throw new HTTPException(404, { message: "No encontramos ese servicio." });

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
        throw new HTTPException(422, { message: quoteErrorMessage(error.code) });
      }
      throw error;
    }

    const startsAt = new Date(body.startsAt);
    const staff = c.get("staff");
    try {
      // Cualquier canal interno nace confirmado y sin seña: el compromiso
      // ahí es la conversación, no el pago.
      const booking = await createBooking(createSupabaseAdminClient(env), {
        areaSlug: context.areaSlug,
        startsAt,
        endsAt: new Date(startsAt.getTime() + quote.blockingMin * 60_000),
        shownDurationMin: quote.durationShownMin,
        priceDisplayMode: quote.priceDisplayMode,
        priceEstimatedMin: quote.estimatedMinAmount,
        priceEstimatedMax: quote.estimatedMaxAmount,
        depositRate: 0,
        depositAmount: 0,
        customer: {
          first_name: body.customer.firstName,
          last_name: body.customer.lastName ?? null,
          phone_e164: phone,
          email: body.customer.email ?? null,
        },
        items: quote.items.map((item) => ({
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
        })),
        customerNote: body.note ?? null,
        source: body.source,
        createdBy: staff.staffId,
        actorLabel: staff.email,
        override: body.override,
        overrideReason: body.overrideReason ?? null,
      });
      return c.json({ data: booking }, 201);
    } catch (error) {
      if (error instanceof BookingError) {
        logBookingFailure({
          code: error.code,
          channel: body.source,
          serviceSlug: body.serviceSlug,
          areaSlug: context.areaSlug,
          startsAt: body.startsAt,
          lengthTier: body.lengthTier ?? null,
          requestId: requestId(c.req),
        });
        // El motor no dice "no": dice qué pasa y deja decidir. El detalle
        // numérico permite al frontend ofrecer [Crear igualmente].
        if (error.code === "capacity_full" || error.code === "area_closed") {
          const check = await checkCapacity(createSupabaseAdminClient(env), {
            areaSlug: context.areaSlug,
            startsAt,
            endsAt: new Date(startsAt.getTime() + quote.blockingMin * 60_000),
          });
          throw new HTTPException(409, {
            message: capacityConflictMessage(check),
            cause: { code: error.code, capacity: check },
          });
        }
        throw new HTTPException(409, { message: "No se pudo crear el turno." });
      }
      throw error;
    }
  });

  route.post("/bookings/:id/execution", async (c) => {
    const schema = z.object({
      finalPriceAmount: z.number().int().min(0).nullish(),
      actualDurationMin: z.number().int().min(1).max(1440).nullish(),
      servicesDone: z.string().max(500).nullish(),
      formula: z.string().max(2000).nullish(),
      paymentMethod: z.enum(["efectivo", "transferencia", "otro"]).nullish(),
      observation: z.string().max(1000).nullish(),
    });
    const parsed = schema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success)
      throw new HTTPException(400, { message: "Revisá los datos de la atención." });

    await recordExecution(createSupabaseAdminClient(env), {
      bookingId: c.req.param("id"),
      ...parsed.data,
      recordedBy: c.get("staff").email,
    });
    return c.json({ data: { ok: true } });
  });

  // --------------------------------------------------------------- clientas
  route.get("/customers", async (c) => {
    const q = c.req.query("q");
    const customers = await searchCustomers(createSupabaseAdminClient(env), { query: q });
    return c.json({ data: customers });
  });

  route.get("/customers/:id", async (c) => {
    const detail = await getCustomerDetail(createSupabaseAdminClient(env), c.req.param("id"));
    if (!detail) throw new HTTPException(404, { message: "No encontramos esa clienta." });
    return c.json({ data: detail });
  });

  route.post("/customers/:id/notes", async (c) => {
    const schema = z.object({ body: z.string().min(1).max(2000) });
    const parsed = schema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) throw new HTTPException(400, { message: "Escribí la nota." });

    await addCustomerNote(createSupabaseAdminClient(env), {
      customerId: c.req.param("id"),
      body: parsed.data.body,
      createdBy: c.get("staff").email,
    });
    return c.json({ data: { ok: true } }, 201);
  });

  // ---------------------------------------------------------- bloqueos
  route.get("/schedule-exceptions", async (c) => {
    const { data, error } = await createSupabaseAdminClient(env)
      .from("schedule_exceptions")
      .select("id, area_id, starts_at, ends_at, reason, capacity_delta, is_active, areas(slug)")
      .order("starts_at", { ascending: true })
      .limit(200);
    if (error) throw error;
    return c.json({ data });
  });

  route.post("/schedule-exceptions", async (c) => {
    const schema = z
      .object({
        areaSlug: z.string().max(32).nullish(),
        startsAt: z.string().datetime({ offset: true }),
        endsAt: z.string().datetime({ offset: true }),
        reason: z.string().min(1).max(200),
        capacityDelta: z.number().int().negative().nullish(),
      })
      .refine((v) => new Date(v.endsAt) > new Date(v.startsAt), {
        message: "El fin debe ser posterior al inicio.",
      });
    const parsed = schema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) throw new HTTPException(400, { message: "Revisá el bloqueo." });

    const admin = createSupabaseAdminClient(env);
    let areaId: string | null = null;
    if (parsed.data.areaSlug) {
      const { data } = await admin
        .from("areas")
        .select("id")
        .eq("slug", parsed.data.areaSlug)
        .maybeSingle();
      areaId = (data as { id: string } | null)?.id ?? null;
      if (!areaId) throw new HTTPException(404, { message: "No encontramos esa área." });
    }

    // Aviso antes de confirmar: cuántos turnos quedan dentro del bloqueo.
    const { data: affected } = await admin
      .from("bookings")
      .select("id", { count: "exact" })
      .in("status", ["pending_payment", "confirmed"])
      .lt("starts_at", parsed.data.endsAt)
      .gt("ends_at", parsed.data.startsAt);

    const { data, error } = await admin
      .from("schedule_exceptions")
      .insert({
        area_id: areaId,
        starts_at: parsed.data.startsAt,
        ends_at: parsed.data.endsAt,
        reason: parsed.data.reason,
        capacity_delta: parsed.data.capacityDelta ?? null,
        created_by: c.get("staff").email,
      })
      .select("id")
      .single();
    if (error) throw error;

    return c.json(
      {
        data: {
          id: (data as { id: string }).id,
          affectedBookings: (affected ?? []).length,
        },
      },
      201,
    );
  });

  route.delete("/schedule-exceptions/:id", async (c) => {
    const { error } = await createSupabaseAdminClient(env)
      .from("schedule_exceptions")
      .delete()
      .eq("id", c.req.param("id"));
    if (error) throw error;
    return c.json({ data: { ok: true } });
  });

  // ------------------------------------------------- configuración (owner)
  const owner = new Hono<{ Variables: StaffVars }>();
  owner.use("*", requireOwner());

  // Plata del salón: cuánto entró, cuánto se facturó y con qué margen.
  // Va detrás de `owner` por mínimo privilegio — quien atiende no
  // necesita ver la facturación total ni el margen para trabajar.
  /**
   * Seis indicadores, no cincuenta. El criterio de inclusión fue cuál
   * cambia una decisión de Sol y cuál tiene su insumo garantizado.
   *
   * El margen viaja con `available` y `coverage` porque sin costos
   * cargados no existe: la pantalla dice NO DISPONIBLE en vez de $0.
   */
  owner.get("/dashboard", async (c) => {
    const schema = z.object({
      from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    });
    const parsed = schema.safeParse(c.req.query());
    if (!parsed.success) throw new HTTPException(400, { message: "Indicá desde y hasta." });

    const from = new Date(`${parsed.data.from}T00:00:00${SALON_TZ}`);
    const to = new Date(`${parsed.data.to}T00:00:00${SALON_TZ}`);
    // `to` es inclusivo para quien mira la pantalla: del 1 al 31 incluye
    // el 31 entero.
    to.setUTCDate(to.getUTCDate() + 1);
    if (to <= from) throw new HTTPException(400, { message: "El período está al revés." });

    const data = await loadDashboardSummary(createSupabaseAdminClient(env), { from, to });
    return c.json({ data });
  });

  /**
   * Conciliación con el Excel. Dos meses comparando totales, no
   * recargando datos a mano.
   */
  owner.get("/reconciliation", async (c) => {
    const schema = z.object({
      from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      format: z.enum(["json", "csv"]).default("json"),
    });
    const parsed = schema.safeParse(c.req.query());
    if (!parsed.success) throw new HTTPException(400, { message: "Indicá desde y hasta." });

    const from = new Date(`${parsed.data.from}T00:00:00${SALON_TZ}`);
    const to = new Date(`${parsed.data.to}T00:00:00${SALON_TZ}`);
    to.setUTCDate(to.getUTCDate() + 1);

    const rows = await loadReconciliation(createSupabaseAdminClient(env), { from, to });

    if (parsed.data.format === "csv") {
      const cols = [
        "starts_at",
        "area",
        "channel",
        "customer",
        "customer_phone",
        "status",
        "estimated_amount",
        "final_amount",
        "collected_amount",
        "outstanding_amount",
        "payment_methods",
        "cost_amount",
        "margin_amount",
        "deposit_status",
        "attended_by",
      ] as const;
      const esc = (v: unknown) =>
        v === null || v === undefined ? "" : `"${String(v).replace(/"/g, '""')}"`;
      const csv = [
        cols.join(","),
        ...rows.map((r) => cols.map((k) => esc(r[k as keyof typeof r])).join(",")),
      ].join("\n");
      return c.body(csv, 200, {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="sol-mai-${parsed.data.from}_${parsed.data.to}.csv"`,
      });
    }

    const totals = rows.reduce(
      (acc, r) => ({
        estimated: acc.estimated + (r.estimated_amount ?? 0),
        final: acc.final + (r.final_amount ?? 0),
        collected: acc.collected + (r.collected_amount ?? 0),
        outstanding: acc.outstanding + (r.outstanding_amount ?? 0),
      }),
      { estimated: 0, final: 0, collected: 0, outstanding: 0 },
    );
    // El margen sólo se informa sobre las atenciones que tienen costo.
    const withCost = rows.filter((r) => r.margin_amount !== null);
    return c.json({
      data: {
        rows,
        totals,
        margin:
          withCost.length === 0
            ? { available: false, coverage: 0, amount: null }
            : {
                available: true,
                coverage: withCost.length,
                amount: withCost.reduce((a, r) => a + (r.margin_amount ?? 0), 0),
              },
      },
    });
  });

  owner.get("/settings", async (c) => {
    const { data, error } = await createSupabaseAdminClient(env)
      .from("business_settings")
      .select("key, value, description, source, confidence, updated_by, updated_at")
      .order("key");
    if (error) throw error;
    return c.json({ data });
  });

  owner.patch("/settings/:key", async (c) => {
    const schema = z.object({ value: z.union([z.number(), z.string(), z.boolean()]) });
    const parsed = schema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) throw new HTTPException(400, { message: "Valor inválido." });

    const { error } = await createSupabaseAdminClient(env)
      .from("business_settings")
      .update({
        value: parsed.data.value,
        source: "sol_adjusted",
        confidence: "high",
        updated_by: c.get("staff").email,
      })
      .eq("key", c.req.param("key"));
    if (error) throw error;
    return c.json({ data: { ok: true } });
  });

  /** Lista de "valores a confirmar": lo que todavía es supuesto. */
  owner.get("/pending-values", async (c) => {
    const { data, error } = await createSupabaseAdminClient(env)
      .from("service_price_tiers")
      .select(
        "length_tier, price_main, duration_main_min, source, source_ref, confidence, services!inner(slug, name)",
      )
      .neq("source", "sol_validated")
      .neq("source", "sol_adjusted")
      .order("confidence", { ascending: true })
      .limit(300);
    if (error) throw error;
    return c.json({ data });
  });

  owner.get("/services/:slug/tiers", async (c) => {
    const { data, error } = await createSupabaseAdminClient(env)
      .from("service_price_tiers")
      .select(
        "length_tier, price_main, price_addon, duration_main_min, duration_addon_min, process_min, source, confidence, services!inner(slug)",
      )
      .eq("services.slug", c.req.param("slug"));
    if (error) throw error;
    return c.json({ data });
  });

  owner.patch("/services/:slug/tiers/:tier", async (c) => {
    const schema = z.object({
      priceMain: z.number().int().min(0).optional(),
      durationMainMin: z.number().int().min(1).max(1440).optional(),
      processMin: z.number().int().min(0).max(1440).optional(),
    });
    const parsed = schema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success || Object.keys(parsed.data).length === 0) {
      throw new HTTPException(400, {
        message: "Revisá los valores: la duración debe ser mayor a cero.",
      });
    }

    const admin = createSupabaseAdminClient(env);
    const { data: svc } = await admin
      .from("services")
      .select("id")
      .eq("slug", c.req.param("slug"))
      .maybeSingle();
    const serviceId = (svc as { id: string } | null)?.id;
    if (!serviceId) throw new HTTPException(404, { message: "No encontramos ese servicio." });

    const patch: Record<string, unknown> = {
      source: "sol_adjusted",
      confidence: "high",
      updated_by: c.get("staff").email,
    };
    if (parsed.data.priceMain !== undefined) patch.price_main = parsed.data.priceMain;
    if (parsed.data.durationMainMin !== undefined)
      patch.duration_main_min = parsed.data.durationMainMin;
    if (parsed.data.processMin !== undefined) patch.process_min = parsed.data.processMin;

    const { error } = await admin
      .from("service_price_tiers")
      .update(patch)
      .eq("service_id", serviceId)
      .eq("length_tier", c.req.param("tier"));
    if (error) throw error;

    // Los cambios no tocan reservas ya creadas: viven en el snapshot.
    return c.json({
      data: {
        ok: true,
        note: "Los turnos ya reservados mantienen el precio y la duración con que se tomaron.",
      },
    });
  });

  owner.get("/business-hours", async (c) => {
    const { data, error } = await createSupabaseAdminClient(env)
      .from("business_hours")
      .select("id, weekday, opens_at, closes_at, is_active")
      .order("weekday");
    if (error) throw error;
    return c.json({ data });
  });

  owner.patch("/business-hours/:id", async (c) => {
    const schema = z.object({
      opensAt: z
        .string()
        .regex(/^\d{2}:\d{2}$/)
        .optional(),
      closesAt: z
        .string()
        .regex(/^\d{2}:\d{2}$/)
        .optional(),
      isActive: z.boolean().optional(),
    });
    const parsed = schema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) throw new HTTPException(400, { message: "Horario inválido." });

    const patch: Record<string, unknown> = {};
    if (parsed.data.opensAt) patch.opens_at = parsed.data.opensAt;
    if (parsed.data.closesAt) patch.closes_at = parsed.data.closesAt;
    if (parsed.data.isActive !== undefined) patch.is_active = parsed.data.isActive;

    const { error } = await createSupabaseAdminClient(env)
      .from("business_hours")
      .update(patch)
      .eq("id", c.req.param("id"));
    if (error) {
      if (String(error.message).includes("business_hours_time_order")) {
        throw new HTTPException(400, {
          message: "El horario de cierre tiene que ser posterior al de apertura.",
        });
      }
      throw error;
    }
    return c.json({ data: { ok: true } });
  });

  owner.get("/areas", async (c) => {
    const { data, error } = await createSupabaseAdminClient(env)
      .from("areas")
      .select("id, slug, name, capacity, is_bookable_online, is_active")
      .order("slug");
    if (error) throw error;
    return c.json({ data });
  });

  owner.patch("/areas/:slug", async (c) => {
    const schema = z.object({
      capacity: z.number().int().min(1).max(50).optional(),
      isBookableOnline: z.boolean().optional(),
    });
    const parsed = schema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) throw new HTTPException(400, { message: "Revisá la capacidad." });

    const patch: Record<string, unknown> = {};
    if (parsed.data.capacity !== undefined) patch.capacity = parsed.data.capacity;
    if (parsed.data.isBookableOnline !== undefined)
      patch.is_bookable_online = parsed.data.isBookableOnline;

    const { error } = await createSupabaseAdminClient(env)
      .from("areas")
      .update(patch)
      .eq("slug", c.req.param("slug"));
    if (error) throw error;
    return c.json({ data: { ok: true } });
  });

  route.route("/", owner);
  return route;
}

function describeStatus(status: string): string {
  const labels: Record<string, string> = {
    pending_payment: "pendiente de seña",
    confirmed: "confirmado",
    attended: "atendido",
    cancelled: "cancelado",
    expired: "vencido",
    no_show: "marcado como ausencia",
  };
  return labels[status] ?? status;
}
