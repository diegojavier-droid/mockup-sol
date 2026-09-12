/**
 * Panel interno — agenda, clientas y configuración.
 *
 * Todo el router exige staff autenticado y autorizado. Las acciones que
 * cambian las reglas del negocio (precios, tiempos, horarios) exigen
 * además rol owner.
 */

import { Hono, type Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import type { ServerEnv } from "../../config/env";
import { createSupabaseAdminClient } from "../../lib/supabase";
import { staffAuth, type StaffVars } from "../middleware/staffAuth";
import { MODULOS, requirePermission } from "../middleware/permisos";
import {
  INVOICING_MESSAGES,
  InvoicingError,
  listPendingInvoices,
  markInvoiced,
  readInvoicingSummary,
  unmarkInvoiced,
} from "../../lib/admin/invoicing-repository";
import {
  createRole,
  deleteRole,
  listRoles,
  RoleAdminError,
  ROLE_ADMIN_MESSAGES,
  setRolePermission,
} from "../../lib/admin/roles-repository";
import {
  createService,
  deletePromotion,
  deleteService,
  estadoDelRechazo,
  listCatalog,
  listCategories,
  listPromotions,
  setPromotionActive,
  setPromotionRule,
  setServiceCost,
  updateService,
  upsertPromotion,
} from "../../lib/admin/catalog-repository";
import {
  listProducts,
  listServiceTiers,
  setProductActive,
  setServicePrice,
  setStationActive,
  upsertProduct,
  upsertStation,
  SalonEditError,
  SALON_EDIT_MESSAGES,
} from "../../lib/admin/salon-repository";
import {
  auditActors,
  inviteStaff,
  listStaff,
  readAuditLog,
  setStaffActive,
  setStaffRole,
  StaffAdminError,
  STAFF_ADMIN_MESSAGES,
} from "../../lib/admin/staff-repository";
import {
  aplicarCambios,
  asistenteDisponible,
  interpretarInstruccion,
  proponerCambios,
} from "../../lib/admin/price-assist";
import {
  addCustomerNote,
  getBookingForStaff,
  getCustomerDetail,
  countAgendaByDay,
  listAgenda,
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
  listPendingRefunds,
  markRefundCompleted,
  revertAutoNoShow,
  getCashRegister,
  BookingError,
  type CapacityCheck,
} from "../../lib/booking/repository";
import { normalizePhoneAr } from "../../domain/phone";
import { logBookingFailure, requestId } from "../../lib/observability";
import {
  cotizarPartes,
  loadServiceParts,
  normalizeServiceParts,
  servicePartSchema,
  servicePartsErrorMessage,
  ServicePartsError,
  MAX_SERVICE_PARTS,
} from "../../lib/quote/parts";
import { QuoteError } from "../../domain/types";
import { createCatalogRepository } from "../../lib/catalog/repository";
import { createSupabaseAnonClient } from "../../lib/supabase";

const SALON_TZ = "-03:00";
/** Santa Fe está tres horas detrás de UTC y no cambia de huso. */
const SALON_TZ_OFFSET_MS = -3 * 60 * 60 * 1000;

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
  // Primero quién es y qué puede; después, si eso le alcanza para la
  // ruta que pidió. El orden importa: `requirePermission` lee lo que
  // `staffAuth` dejó en `staff`.
  route.use("*", staffAuth(env));
  route.use("*", requirePermission());

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

  /**
   * Cuántos turnos cae cada día de un rango.
   *
   * Lo pide el calendario: para pintar un mes o un año hace falta el
   * número por día, no el turno. `/agenda` devuelve el turno entero y
   * acepta 31 días, así que un año por ahí serían doce consultas
   * trayendo miles de filas completas para contarlas y tirarlas.
   *
   * El tope es 366 días —un año bisiesto— y no más: sin tope, una
   * dirección escrita a mano puede pedir una década.
   */
  route.get("/agenda/resumen", async (c) => {
    const schema = z.object({
      desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      area: z.string().max(32).optional(),
    });
    const parsed = schema.safeParse(c.req.query());
    if (!parsed.success) throw new HTTPException(400, { message: "Consulta inválida." });

    const from = new Date(`${parsed.data.desde}T00:00:00${SALON_TZ}`);
    // `hasta` entra en el resumen: se pide el día siguiente como límite
    // abierto. Sin esto, pedir del 1 al 31 dejaría el 31 afuera y nadie
    // lo notaría hasta que faltara un turno de fin de mes.
    const to = new Date(
      new Date(`${parsed.data.hasta}T00:00:00${SALON_TZ}`).getTime() + 86_400_000,
    );

    if (to <= from) throw new HTTPException(400, { message: "El rango está al revés." });
    if (to.getTime() - from.getTime() > 366 * 86_400_000) {
      throw new HTTPException(400, { message: "El rango no puede pasar de un año." });
    }

    const porDia = await countAgendaByDay(createSupabaseAdminClient(env), {
      from,
      to,
      area: parsed.data.area,
    });
    return c.json({ data: { desde: parsed.data.desde, hasta: parsed.data.hasta, porDia } });
  });

  route.get("/bookings/:id", async (c) => {
    const booking = await getBookingForStaff(createSupabaseAdminClient(env), c.req.param("id"));
    if (!booking) throw new HTTPException(404, { message: "No encontramos ese turno." });
    return c.json({ data: booking });
  });

  route.patch("/bookings/:id/status", async (c) => {
    const schema = z.object({
      status: z.enum(["confirmed", "attended", "cancelled", "expired"]),
      // Qué pasa con una seña ya acreditada al cancelar. No tiene default:
      // el sistema no elige por el salón qué hacer con la plata.
      depositOutcome: z.enum(["refund", "retain"]).nullish(),
    });
    const parsed = schema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) throw new HTTPException(400, { message: "Estado inválido." });

    try {
      const staff = c.get("staff");
      const updated = await updateBookingStatus(createSupabaseAdminClient(env), {
        bookingId: c.req.param("id"),
        status: parsed.data.status,
        actorId: staff.staffId,
        actorLabel: staff.email,
        depositOutcome: parsed.data.depositOutcome ?? null,
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
      if (error instanceof Error && error.message === "deposit_outcome_required") {
        throw new HTTPException(409, {
          message:
            "Este turno tiene la seña abonada. Antes de cancelarlo, decidí si se devuelve o se retiene.",
        });
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
   * Señas que hay que devolver y todavía no se devolvieron.
   *
   * Cuando una clienta cancela dentro de la ventana, el sistema le dice
   * «te devolvemos la seña» y marca la reserva. Pero marcarla no mueve la
   * plata: hasta que exista la devolución automática contra Mercado Pago,
   * alguien tiene que hacerla. Sin esta lista esa promesa no tenía quién
   * la ejecutara ni dónde verse.
   */
  route.get("/refunds-pending", async (c) => {
    const data = await listPendingRefunds(createSupabaseAdminClient(env));
    return c.json({ data });
  });

  route.post("/bookings/:id/refund-done", async (c) => {
    const staff = c.get("staff");
    const body = await c.req.json().catch(() => ({}));
    // El monto NO se recibe: la devolución es la seña completa y el
    // servidor la sabe. Aceptarlo dejaba que un cliente de la API
    // registrara una devolución parcial como terminada.
    const parsed = z
      .object({
        providerRef: z.string().max(120).nullish(),
      })
      .safeParse(body);
    if (!parsed.success) {
      throw new HTTPException(400, { message: "Datos inválidos para registrar la devolución." });
    }

    try {
      const result = await markRefundCompleted(createSupabaseAdminClient(env), {
        bookingId: c.req.param("id"),
        actorId: staff.staffId,
        actorLabel: staff.email,
        providerRef: parsed.data.providerRef ?? null,
      });

      const message =
        result.status === "already_completed"
          ? "Esta devolución ya estaba registrada."
          : `Devolución registrada por $${(result.amount ?? 0).toLocaleString("es-AR")}.`;
      return c.json({ data: { ...result, message } });
    } catch (error) {
      const code =
        error instanceof BookingError ? error.code : error instanceof Error ? error.message : "";
      if (code === "booking_not_found") {
        throw new HTTPException(404, { message: "No encontramos ese turno." });
      }
      if (code === "refund_not_due") {
        throw new HTTPException(409, {
          message: "Ese turno no tiene una devolución pendiente.",
        });
      }
      throw error;
    }
  });

  /**
   * «La clienta vino igual»: deshace una ausencia que marcó el sistema.
   *
   * La marca automática es una deducción a partir de un silencio, no el
   * registro de lo que pasó. Si Sol se olvidó de tocar «Llegó», la
   * clienta queda anotada como ausente y con la seña retenida, y eso
   * tiene que poder corregirse. Las ausencias que marcó una persona no
   * se tocan: ahí alguien miró y decidió.
   */
  route.post("/bookings/:id/no-show/revert", async (c) => {
    const staff = c.get("staff");
    try {
      const result = await revertAutoNoShow(createSupabaseAdminClient(env), {
        bookingId: c.req.param("id"),
        actorId: staff.staffId,
        actorLabel: staff.email,
      });
      const message =
        result.status === "already_attended"
          ? "Ese turno ya figura como atendido."
          : "Listo: el turno queda como atendido y la seña vuelve a contar como pagada.";
      return c.json({ data: { ...result, message } });
    } catch (error) {
      const code =
        error instanceof BookingError ? error.code : error instanceof Error ? error.message : "";
      if (code === "booking_not_found") {
        throw new HTTPException(404, { message: "No encontramos ese turno." });
      }
      if (code === "not_a_no_show") {
        throw new HTTPException(409, { message: "Ese turno no figura como ausencia." });
      }
      if (code === "no_show_manual") {
        throw new HTTPException(409, {
          message: "Esa ausencia la marcó una persona, así que no se deshace desde acá.",
        });
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
        /** «Color y corte» dictado por WhatsApp, en un solo turno. */
        services: z.array(servicePartSchema).min(1).max(MAX_SERVICE_PARTS).optional(),
        serviceSlug: z.string().min(1).max(64).optional(),
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
    let parts;
    let loaded;
    try {
      parts = normalizeServiceParts(body);
      loaded = await loadServiceParts(anon, createCatalogRepository(anon), {
        parts,
        extraCodes: body.extraCodes,
      });
    } catch (error) {
      if (error instanceof ServicePartsError) {
        throw new HTTPException(422, { message: servicePartsErrorMessage(error.code) });
      }
      throw error;
    }
    if (!loaded) throw new HTTPException(404, { message: "No encontramos ese servicio." });
    const context = loaded.contexts[0];

    let quote;
    let partQuotes;
    try {
      const cotizado = cotizarPartes(loaded.contexts, parts, context.settings);
      partQuotes = cotizado.partes;
      quote = cotizado.total;
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
        items: partQuotes.flatMap((partQuote, i) =>
          partQuote.items.map((item) => ({
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
            personalization: item.role === "main" ? (parts[i].personalization ?? null) : null,
          })),
        ),
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

  /**
   * El cierre de una atención vive en `POST /bookings/:id/close`, y sólo
   * ahí.
   *
   * Existía además `POST /bookings/:id/execution`, que escribía la misma
   * fila de `service_execution_records` por upsert directo, con un enum
   * de medio de pago sin `mercado_pago`, sin admitir pagos mixtos, sin
   * idempotencia y sin auditoría. Podía pisar el precio de un cierre ya
   * conciliado. Ninguna pantalla lo usaba.
   *
   * Un hecho de negocio se escribe por un solo camino: `close_service`
   * cubre todo lo que hacía —y además exige un precio final y un turno
   * en estado cerrable, que aquella ruta no pedía.
   */

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

  // --------------------------------------------------------- el salón
  //
  // Este router existía para colgarle `requireOwner()`. Ese middleware ya
  // no está: ahora cada ruta declara su módulo en `permisos.ts` y el
  // control es el mismo para todas. Se conserva agrupado sólo porque
  // ordena la lectura de mil cuatrocientas líneas.
  const owner = new Hono<{ Variables: StaffVars }>();

  /**
   * «El salón»: lo que Sol cambia sin depender de nadie.
   *
   * Precios, duraciones, estaciones y productos. Va detrás de `owner`
   * porque cambiar un precio cambia lo que se le cobra a una clienta, y
   * eso no es una tarea del mostrador.
   *
   * Cada operación devuelve el valor anterior para que la pantalla pueda
   * mostrar «antes → ahora» y ofrecer volver atrás. Deshacer, no
   * carteles de confirmación.
   */
  const salon = async <T>(c: Context<{ Variables: StaffVars }>, fn: () => Promise<T>) => {
    try {
      return c.json({ data: await fn() });
    } catch (error) {
      const code = error instanceof SalonEditError ? error.code : "";
      const known = SALON_EDIT_MESSAGES[code];
      if (known) throw new HTTPException(known.status, { message: known.message });
      throw error;
    }
  };

  /**
   * Quién puede entrar al panel.
   *
   * Hasta este bloque no existía una sola escritura a `staff_members`:
   * sumar o sacar a alguien era editar un secreto, desplegar y tocar la
   * base a mano. El día que una persona deja el salón, sacarle el acceso
   * no puede depender de que estemos nosotros.
   *
   * Va detrás de `owner` y ADEMÁS cada función de la base verifica el
   * rol. No es redundancia inútil: la ruta protege el camino que
   * conocemos, la función protege la tabla.
   */
  const staffAdmin = async <T>(c: Context<{ Variables: StaffVars }>, fn: () => Promise<T>) => {
    try {
      return c.json({ data: await fn() });
    } catch (error) {
      const code = error instanceof StaffAdminError ? error.code : "";
      const conocido = Object.keys(STAFF_ADMIN_MESSAGES).find((k) => code.includes(k));
      if (conocido) {
        const { status, message } = STAFF_ADMIN_MESSAGES[conocido]!;
        throw new HTTPException(status, { message });
      }
      throw error;
    }
  };

  const rolesAdmin = async <T>(c: Context<{ Variables: StaffVars }>, fn: () => Promise<T>) => {
    try {
      return c.json({ data: await fn() });
    } catch (error) {
      const code = error instanceof RoleAdminError ? error.code : "";
      const conocido = Object.keys(ROLE_ADMIN_MESSAGES).find((k) => code.includes(k));
      if (conocido) {
        const { status, message } = ROLE_ADMIN_MESSAGES[conocido]!;
        throw new HTTPException(status, { message });
      }
      throw error;
    }
  };

  owner.get("/staff", async (c) => staffAdmin(c, () => listStaff(createSupabaseAdminClient(env))));

  owner.post("/staff", async (c) => {
    const staff = c.get("staff");
    const parsed = z
      .object({
        email: z.string().email().max(160),
        displayName: z.string().max(120).nullish(),
        // Ya no son dos: Sol arma los roles que quiera. Que el slug
        // exista lo verifica la base (`rol_invalido`), que es donde
        // está la lista de verdad.
        role: z.string().min(1).max(32),
      })
      .safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) {
      throw new HTTPException(400, { message: "Revisá el correo y el rol." });
    }
    return staffAdmin(c, () =>
      inviteStaff(createSupabaseAdminClient(env), {
        email: parsed.data.email,
        displayName: parsed.data.displayName ?? null,
        role: parsed.data.role,
        actorId: staff.staffId,
        actorLabel: staff.email,
      }),
    );
  });

  owner.post("/staff/:id/active", async (c) => {
    const staff = c.get("staff");
    const parsed = z
      .object({ active: z.boolean() })
      .safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw new HTTPException(400, { message: "Datos inválidos." });
    return staffAdmin(c, () =>
      setStaffActive(createSupabaseAdminClient(env), {
        staffId: c.req.param("id"),
        active: parsed.data.active,
        actorId: staff.staffId,
        actorLabel: staff.email,
      }),
    );
  });

  owner.post("/staff/:id/role", async (c) => {
    const staff = c.get("staff");
    const parsed = z
      .object({ role: z.string().min(1).max(32) })
      .safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw new HTTPException(400, { message: "Ese rol no existe." });
    return staffAdmin(c, () =>
      setStaffRole(createSupabaseAdminClient(env), {
        staffId: c.req.param("id"),
        role: parsed.data.role,
        actorId: staff.staffId,
        actorLabel: staff.email,
      }),
    );
  });

  /**
   * El registro de cambios.
   *
   * `audit_log` se escribe desde el principio y hasta acá no lo leía
   * nadie. Sólo lectura: no existe la contracara y no la va a haber.
   *
   * Va detrás de `owner` porque el registro nombra clientas y montos.
   */
  owner.get("/audit", async (c) => {
    const q = c.req.query();
    const parsed = z
      .object({
        desde: z.string().datetime().optional(),
        hasta: z.string().datetime().optional(),
        actorId: z.string().uuid().optional(),
        entityType: z
          .enum(["booking", "customer", "staff_member", "service", "product", "resource"])
          .optional(),
        cursor: z.coerce.number().int().positive().optional(),
        limit: z.coerce.number().int().min(1).max(200).optional(),
      })
      .safeParse(q);
    if (!parsed.success) throw new HTTPException(400, { message: "Filtros inválidos." });

    return staffAdmin(c, () =>
      readAuditLog(createSupabaseAdminClient(env), {
        desde: parsed.data.desde ?? null,
        hasta: parsed.data.hasta ?? null,
        actorId: parsed.data.actorId ?? null,
        entityType: parsed.data.entityType ?? null,
        cursor: parsed.data.cursor ?? null,
        limit: parsed.data.limit ?? 50,
      }),
    );
  });

  owner.get("/audit/actors", async (c) =>
    staffAdmin(c, () => auditActors(createSupabaseAdminClient(env))),
  );

  owner.get("/salon/services", async (c) =>
    salon(c, () => listServiceTiers(createSupabaseAdminClient(env))),
  );

  owner.post("/salon/services/:slug/price", async (c) => {
    const staff = c.get("staff");
    const parsed = z
      .object({
        lengthTier: z.string().min(1).max(16),
        priceMain: z.number().int().positive(),
        durationMin: z.number().int().positive().max(600),
      })
      .safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) {
      throw new HTTPException(400, { message: "Revisá el precio y la duración." });
    }
    return salon(c, () =>
      setServicePrice(createSupabaseAdminClient(env), {
        slug: c.req.param("slug"),
        lengthTier: parsed.data.lengthTier,
        priceMain: parsed.data.priceMain,
        durationMin: parsed.data.durationMin,
        actorId: staff.staffId,
        actorLabel: staff.email,
      }),
    );
  });

  owner.post("/salon/stations", async (c) => {
    const staff = c.get("staff");
    const parsed = z
      .object({
        areaSlug: z.string().min(1).max(64),
        name: z.string().min(1).max(80),
        stationId: z.string().uuid().nullish(),
      })
      .safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw new HTTPException(400, { message: "Falta el nombre o el área." });
    return salon(c, () =>
      upsertStation(createSupabaseAdminClient(env), {
        areaSlug: parsed.data.areaSlug,
        name: parsed.data.name,
        stationId: parsed.data.stationId ?? null,
        actorId: staff.staffId,
        actorLabel: staff.email,
      }),
    );
  });

  owner.post("/salon/stations/:id/active", async (c) => {
    const staff = c.get("staff");
    const parsed = z
      .object({ active: z.boolean() })
      .safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw new HTTPException(400, { message: "Datos inválidos." });
    return salon(c, () =>
      setStationActive(createSupabaseAdminClient(env), {
        stationId: c.req.param("id"),
        active: parsed.data.active,
        actorId: staff.staffId,
        actorLabel: staff.email,
      }),
    );
  });

  /**
   * El asistente de precios.
   *
   * Sol escribe «subí un 15% todo peluquería» y el panel le muestra qué
   * quedaría. Nada se guarda con esta llamada: propone, y recién la
   * confirmación escribe.
   *
   * El modelo entiende la frase; las cuentas las hace el servidor. Ver
   * `price-assist.ts` para por qué es así y no al revés.
   */
  owner.get("/salon/asistente", (c) => c.json({ data: { disponible: asistenteDisponible(env) } }));

  owner.post("/salon/price-assist", async (c) => {
    const parsed = z
      .object({ instruccion: z.string().min(3).max(500) })
      .safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) {
      throw new HTTPException(400, { message: "Escribí qué querés cambiar." });
    }
    if (!asistenteDisponible(env)) {
      throw new HTTPException(503, {
        message: "El asistente no está configurado. Podés cambiar los precios a mano igual.",
      });
    }

    const admin = createSupabaseAdminClient(env);
    const filas = await listServiceTiers(admin);
    let intencion;
    try {
      intencion = await interpretarInstruccion(env, parsed.data.instruccion, filas);
    } catch (error) {
      // Que el asistente se caiga no puede tumbar la pantalla: Sol
      // sigue editando a mano, que es como funcionó siempre.
      console.error(
        JSON.stringify({
          evento: "asistente_precios_caido",
          detalle: error instanceof Error ? error.message : String(error),
          ts: new Date().toISOString(),
        }),
      );
      throw new HTTPException(502, {
        message: "No pude consultar al asistente. Probá de nuevo o cambialo a mano.",
      });
    }
    return c.json({ data: proponerCambios(intencion, filas) });
  });

  owner.post("/salon/price-assist/apply", async (c) => {
    const staff = c.get("staff");
    const parsed = z
      .object({
        cambios: z
          .array(
            z.object({
              slug: z.string().min(1).max(120),
              lengthTier: z.string().min(1).max(16),
              precioAntes: z.number().int().positive(),
              precioAhora: z.number().int().positive(),
              duracionAntes: z.number().int().positive().max(600),
              duracionAhora: z.number().int().positive().max(600),
            }),
          )
          .min(1)
          .max(200),
      })
      .safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw new HTTPException(400, { message: "No llegó qué cambiar." });

    return salon(c, () =>
      aplicarCambios(
        createSupabaseAdminClient(env),
        parsed.data.cambios.map((x) => ({ ...x, name: "", area: "" })),
        { actorId: staff.staffId, actorLabel: staff.email },
      ),
    );
  });

  owner.get("/salon/products", async (c) =>
    salon(c, () => listProducts(createSupabaseAdminClient(env))),
  );

  owner.post("/salon/products", async (c) => {
    const staff = c.get("staff");
    const parsed = z
      .object({
        name: z.string().min(1).max(120),
        brand: z.string().max(80).nullish(),
        salePrice: z.number().int().positive().nullish(),
        productId: z.string().uuid().nullish(),
      })
      .safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw new HTTPException(400, { message: "Revisá el nombre y el precio." });
    return salon(c, () =>
      upsertProduct(createSupabaseAdminClient(env), {
        name: parsed.data.name,
        brand: parsed.data.brand ?? null,
        salePrice: parsed.data.salePrice ?? null,
        productId: parsed.data.productId ?? null,
        actorId: staff.staffId,
        actorLabel: staff.email,
      }),
    );
  });

  owner.post("/salon/products/:id/active", async (c) => {
    const staff = c.get("staff");
    const parsed = z
      .object({ active: z.boolean() })
      .safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw new HTTPException(400, { message: "Datos inválidos." });
    return salon(c, () =>
      setProductActive(createSupabaseAdminClient(env), {
        productId: c.req.param("id"),
        active: parsed.data.active,
        actorId: staff.staffId,
        actorLabel: staff.email,
      }),
    );
  });

  /**
   * El catálogo, dado de alta y de baja por Sol.
   *
   * Hasta acá Sol podía cambiarle el precio a un servicio que ya existía,
   * y nada más. Los 16 tratamientos de su lista entraron por migración: un
   * archivo SQL que escribió un desarrollador. Eso convertía cada decisión
   * comercial en un pedido.
   *
   * Todas las escrituras pasan por funciones de la base que validan y
   * auditan. Acá no hay ninguna regla: esta capa traduce HTTP a llamadas y
   * rechazos a números.
   */
  const catalogo = async <T>(c: Context<{ Variables: StaffVars }>, fn: () => Promise<T>) => {
    try {
      return c.json({ data: await fn() });
    } catch (error) {
      if (!(error instanceof SalonEditError)) throw error;
      const { status, message } = estadoDelRechazo(error.code);
      throw new HTTPException(status, { message });
    }
  };

  const KIND = z.enum(["servicio", "color", "tratamiento"]);
  const SLUG = z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "El identificador va en minúsculas y con guiones.");

  owner.get("/salon/catalog", async (c) =>
    catalogo(c, () => listCatalog(createSupabaseAdminClient(env))),
  );

  owner.get("/salon/categories", async (c) =>
    catalogo(c, () => listCategories(createSupabaseAdminClient(env))),
  );

  owner.post("/salon/catalog", async (c) => {
    const staff = c.get("staff");
    const parsed = z
      .object({
        slug: SLUG,
        name: z.string().min(1).max(120),
        category: z.string().min(1).max(64),
        kind: KIND,
        durationMin: z.number().int().positive().max(1440),
        price: z.number().int().min(0),
        description: z.string().max(500).nullish(),
        isPublic: z.boolean().optional(),
      })
      .safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) {
      throw new HTTPException(400, {
        message: parsed.error.issues[0]?.message ?? "Revisá los datos del servicio.",
      });
    }
    return catalogo(c, () =>
      createService(createSupabaseAdminClient(env), { ...parsed.data, actorLabel: staff.email }),
    );
  });

  /**
   * La clase —servicio, color o tratamiento— se cambia desde acá.
   *
   * Es la respuesta a «¿mechas y balayage reciben la promoción de
   * tratamientos?». Deja de ser una pregunta para un desarrollador y pasa
   * a ser una casilla: el día que Sol marque balayage como color, la
   * promoción lo cubre sin que nadie escriba nada.
   */
  owner.patch("/salon/catalog/:slug", async (c) => {
    const staff = c.get("staff");
    const parsed = z
      .object({
        name: z.string().min(1).max(120).optional(),
        description: z.string().max(500).nullish(),
        category: z.string().min(1).max(64).optional(),
        kind: KIND.optional(),
        isPublic: z.boolean().optional(),
        isActive: z.boolean().optional(),
      })
      .safeParse(await c.req.json().catch(() => null));
    if (!parsed.success || Object.keys(parsed.data).length === 0) {
      throw new HTTPException(400, { message: "No hay nada para cambiar." });
    }
    return catalogo(c, () =>
      updateService(createSupabaseAdminClient(env), {
        slug: c.req.param("slug"),
        ...parsed.data,
        actorLabel: staff.email,
      }),
    );
  });

  owner.delete("/salon/catalog/:slug", async (c) => {
    const staff = c.get("staff");
    return catalogo(c, () =>
      deleteService(createSupabaseAdminClient(env), {
        slug: c.req.param("slug"),
        actorLabel: staff.email,
      }),
    );
  });

  /**
   * Cuánto le cuesta al salón prestar el servicio.
   *
   * `null` se acepta y quiere decir «no sabemos»: sin el dato el margen
   * queda NO DISPONIBLE y no se estima. Cero diría que no cuesta nada, y
   * un margen sobre un cero inventado parece un número.
   *
   * El primer caso real es la maquilladora tercerizada: la clienta le paga
   * al salón y el salón le paga a ella un fijo por maquillaje.
   */
  owner.post("/salon/catalog/:slug/cost", async (c) => {
    const staff = c.get("staff");
    const parsed = z
      .object({ amount: z.number().int().min(0).nullable() })
      .safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) {
      throw new HTTPException(400, { message: "El costo no puede ser negativo." });
    }
    return catalogo(c, () =>
      setServiceCost(createSupabaseAdminClient(env), {
        slug: c.req.param("slug"),
        amount: parsed.data.amount,
        actorLabel: staff.email,
      }),
    );
  });

  /* ---------------------------------------------------------------- */
  /* Promociones                                                       */
  /* ---------------------------------------------------------------- */

  /**
   * Una promoción tiene dos lados y se editan por separado: qué tiene que
   * haber en el turno para que se active, y qué baja de precio. Meterlos
   * en una sola lista haría imposible decir «con cualquier color, los
   * tratamientos salen menos», que es la promoción que el salón ya hace.
   */
  owner.get("/salon/promotions", async (c) =>
    catalogo(c, () => listPromotions(createSupabaseAdminClient(env))),
  );

  owner.post("/salon/promotions", async (c) => {
    const staff = c.get("staff");
    const parsed = z
      .object({
        slug: SLUG,
        name: z.string().min(1).max(120),
        description: z.string().max(500).nullish(),
        benefitKind: z.enum(["precio_de_agregado", "porcentaje", "monto_fijo"]).optional(),
        benefitValue: z.number().int().min(0).nullish(),
        startsOn: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .nullish(),
        endsOn: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .nullish(),
        isActive: z.boolean().optional(),
      })
      .safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) {
      throw new HTTPException(400, {
        message: parsed.error.issues[0]?.message ?? "Revisá los datos de la promoción.",
      });
    }
    return catalogo(c, () =>
      upsertPromotion(createSupabaseAdminClient(env), { ...parsed.data, actorLabel: staff.email }),
    );
  });

  /**
   * Agregar o sacar un lado de la regla.
   *
   * Por CLASE de servicio o por SERVICIO puntual, uno u otro y no los dos.
   * La primera forma es la que se mantiene sola cuando Sol agrega un
   * servicio nuevo; la segunda es para las excepciones.
   */
  owner.post("/salon/promotions/:slug/rules", async (c) => {
    const staff = c.get("staff");
    const parsed = z
      .object({
        lado: z.enum(["disparador", "beneficio"]),
        serviceKind: KIND.nullish(),
        serviceSlug: z.string().min(1).max(64).nullish(),
        agregar: z.boolean(),
      })
      .safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw new HTTPException(400, { message: "Revisá la regla." });
    return catalogo(c, () =>
      setPromotionRule(createSupabaseAdminClient(env), {
        slug: c.req.param("slug"),
        ...parsed.data,
        actorLabel: staff.email,
      }),
    );
  });

  /**
   * Apagar no es borrar. Una promoción que corrió tres meses y se apagó
   * explica turnos viejos; borrarla deja esos precios sin explicación.
   */
  owner.post("/salon/promotions/:slug/active", async (c) => {
    const staff = c.get("staff");
    const parsed = z
      .object({ active: z.boolean() })
      .safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw new HTTPException(400, { message: "Datos inválidos." });
    return catalogo(c, () =>
      setPromotionActive(createSupabaseAdminClient(env), {
        slug: c.req.param("slug"),
        active: parsed.data.active,
        actorLabel: staff.email,
      }),
    );
  });

  owner.delete("/salon/promotions/:slug", async (c) => {
    const staff = c.get("staff");
    return catalogo(c, () =>
      deletePromotion(createSupabaseAdminClient(env), {
        slug: c.req.param("slug"),
        actorLabel: staff.email,
      }),
    );
  });

  /**
   * La caja del día: cuánto entró, cuánto salió y por qué medio.
   *
   * Es la pregunta que Sol se hace todos los días al cerrar, y la única
   * de plata que no tenía respuesta: el dashboard resume un período, no
   * el día que se está terminando.
   *
   * Sale entera de cobros que ya se registran. Nadie carga nada.
   */
  owner.get("/cash-register", async (c) => {
    const parsed = z
      .object({
        day: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
      })
      .safeParse(c.req.query());
    if (!parsed.success) throw new HTTPException(400, { message: "Fecha inválida." });

    // Sin fecha, hoy en el salón. Usar la fecha del servidor daría el día
    // equivocado durante las últimas horas de atención.
    const day =
      parsed.data.day ?? new Date(Date.now() + SALON_TZ_OFFSET_MS).toISOString().slice(0, 10);
    const caja = await getCashRegister(createSupabaseAdminClient(env), day);
    return c.json({ data: caja });
  });

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

  // ------------------------------------------------------ roles (usuarios)
  owner.get("/roles", async (c) => rolesAdmin(c, () => listRoles(createSupabaseAdminClient(env))));

  owner.post("/roles", async (c) => {
    const schema = z.object({ name: z.string().min(1) });
    const parsed = schema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) throw new HTTPException(400, { message: "Poné un nombre para el rol." });
    const staff = c.get("staff");
    return rolesAdmin(c, () =>
      createRole(createSupabaseAdminClient(env), parsed.data.name, staff.staffId, staff.email),
    );
  });

  owner.post("/roles/:slug/permission", async (c) => {
    const schema = z.object({
      module: z.enum(MODULOS),
      level: z.enum(["none", "view", "full"]),
    });
    const parsed = schema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) throw new HTTPException(400, { message: "Elegí un módulo y un nivel." });
    const staff = c.get("staff");
    return rolesAdmin(c, () =>
      setRolePermission(
        createSupabaseAdminClient(env),
        c.req.param("slug"),
        parsed.data.module,
        parsed.data.level,
        staff.staffId,
        staff.email,
      ),
    );
  });

  owner.delete("/roles/:slug", async (c) => {
    const staff = c.get("staff");
    return rolesAdmin(c, () =>
      deleteRole(createSupabaseAdminClient(env), c.req.param("slug"), staff.staffId, staff.email),
    );
  });

  // ------------------------------------------------- facturación (finanzas)
  //
  // El sistema NO emite comprobantes: Sol los emite desde la app de ARCA.
  // Lo que falta hoy no es emitir, es saber qué falta emitir. Ver §8.3.
  const facturacion = async <T>(c: Context<{ Variables: StaffVars }>, fn: () => Promise<T>) => {
    try {
      return c.json({ data: await fn() });
    } catch (error) {
      const code = error instanceof InvoicingError ? error.code : "";
      const conocido = Object.keys(INVOICING_MESSAGES).find((k) => code.includes(k));
      if (conocido) {
        const { status, message } = INVOICING_MESSAGES[conocido]!;
        throw new HTTPException(status, { message });
      }
      throw error;
    }
  };

  const FECHA = /^\d{4}-\d{2}-\d{2}$/;

  owner.get("/invoicing/pending", async (c) => {
    const q = c.req.query();
    return facturacion(c, () =>
      listPendingInvoices(createSupabaseAdminClient(env), {
        desde: FECHA.test(q.from ?? "") ? q.from : null,
        hasta: FECHA.test(q.to ?? "") ? q.to : null,
      }),
    );
  });

  owner.get("/invoicing/summary", async (c) => {
    const anio = Number.parseInt(c.req.query("year") ?? "", 10);
    return facturacion(c, () =>
      readInvoicingSummary(createSupabaseAdminClient(env), Number.isFinite(anio) ? anio : null),
    );
  });

  owner.post("/bookings/:id/invoiced", async (c) => {
    const schema = z.object({
      // Entero y en pesos, igual que el resto de los importes del sistema.
      amount: z.number().int().positive(),
      on: z.string().regex(FECHA),
      number: z.string().max(60).nullish(),
    });
    const parsed = schema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      throw new HTTPException(400, { message: "Poné el importe y la fecha del comprobante." });
    }
    const staff = c.get("staff");
    return facturacion(c, () =>
      markInvoiced(createSupabaseAdminClient(env), {
        bookingId: c.req.param("id"),
        amount: parsed.data.amount,
        on: parsed.data.on,
        number: parsed.data.number ?? null,
        actorId: staff.staffId,
        actorLabel: staff.email,
      }),
    );
  });

  owner.delete("/bookings/:id/invoiced", async (c) => {
    const staff = c.get("staff");
    return facturacion(c, () =>
      unmarkInvoiced(createSupabaseAdminClient(env), {
        bookingId: c.req.param("id"),
        actorId: staff.staffId,
        actorLabel: staff.email,
      }),
    );
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
