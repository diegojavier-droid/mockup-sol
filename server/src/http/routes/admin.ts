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
import { createBooking, BookingError } from "../../lib/booking/repository";
import { normalizePhoneAr } from "../../domain/phone";
import { computeQuote } from "../../domain/quote";
import { QuoteError } from "../../domain/types";
import { loadQuoteContext } from "../../lib/quote/repository";
import { createCatalogRepository } from "../../lib/catalog/repository";
import { createSupabaseAnonClient } from "../../lib/supabase";

const SALON_TZ = "-03:00";

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

  // Turno manual: el salón sigue tomando turnos por teléfono (§14.12).
  route.post("/bookings", async (c) => {
    const schema = z.object({
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
    });
    const parsed = schema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) throw new HTTPException(400, { message: "Revisá los datos del turno." });
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
        throw new HTTPException(422, { message: "Falta un dato para calcular el turno." });
      }
      throw error;
    }

    const startsAt = new Date(body.startsAt);
    try {
      // source=manual: nace confirmado y sin seña — el compromiso ahí es
      // la conversación, no el pago.
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
        source: "manual",
      });
      return c.json({ data: booking }, 201);
    } catch (error) {
      if (error instanceof BookingError) {
        const messages: Record<string, string> = {
          capacity_full: "No hay lugar en ese horario. Elegí otro o liberá capacidad.",
          area_closed: "Ese día está cerrado. Sacá el bloqueo o elegí otra fecha.",
        };
        throw new HTTPException(409, {
          message: messages[error.code] ?? "No se pudo crear el turno.",
        });
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
  };
  return labels[status] ?? status;
}
