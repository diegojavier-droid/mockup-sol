/**
 * Facturación.
 *
 * El sistema NO emite comprobantes: Sol los emite desde la app de ARCA y
 * acá registra cuáles emitió. El porqué está en §8.3 de la arquitectura,
 * y se resume en que el certificado que haría falta es una llave que
 * emite documentos fiscales a su nombre.
 *
 * Igual que el resto de la administración, ninguna regla vive acá: las
 * funciones de la base verifican el permiso, validan y auditan.
 */
import type { SupabaseAdminClient } from "../supabase";

export class InvoicingError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "InvoicingError";
  }
}

function rethrow(error: { message?: string } | null): never {
  throw new InvoicingError(error?.message ?? "unknown_error");
}

export interface PendingInvoice {
  bookingId: string;
  cuando: string;
  clienta: string;
  servicios: string;
  cobrado: number;
  medio: string | null;
}

export async function listPendingInvoices(
  admin: SupabaseAdminClient,
  p: { desde?: string | null; hasta?: string | null } = {},
): Promise<PendingInvoice[]> {
  const { data, error } = await admin.rpc("pending_invoices", {
    p_desde: p.desde ?? null,
    p_hasta: p.hasta ?? null,
  });
  if (error) rethrow(error);
  return (
    (data ?? []) as {
      booking_id: string;
      cuando: string;
      clienta: string;
      servicios: string;
      cobrado: number;
      medio: string | null;
    }[]
  ).map((r) => ({
    bookingId: r.booking_id,
    cuando: r.cuando,
    clienta: r.clienta,
    servicios: r.servicios,
    cobrado: r.cobrado,
    medio: r.medio,
  }));
}

export interface InvoicingSummary {
  anio: number;
  facturado: number;
  pendiente: number;
  cuantosPendientes: number;
  /** El tope de la categoría. `null` cuando el contador todavía no lo cargó. */
  tope: number | null;
  topeCargado: boolean;
}

export async function readInvoicingSummary(
  admin: SupabaseAdminClient,
  year?: number | null,
): Promise<InvoicingSummary> {
  const { data, error } = await admin.rpc("invoicing_summary", { p_year: year ?? null });
  if (error) rethrow(error);
  const r = data as {
    anio: number;
    facturado: number;
    pendiente: number;
    cuantos_pendientes: number;
    tope: number | null;
    tope_cargado: boolean;
  };
  return {
    anio: r.anio,
    facturado: r.facturado,
    pendiente: r.pendiente,
    cuantosPendientes: r.cuantos_pendientes,
    tope: r.tope,
    topeCargado: r.tope_cargado,
  };
}

export async function markInvoiced(
  admin: SupabaseAdminClient,
  p: {
    bookingId: string;
    amount: number;
    on: string;
    number?: string | null;
    actorId: string;
    actorLabel?: string | null;
  },
) {
  const { data, error } = await admin.rpc("mark_invoiced", {
    p_booking_id: p.bookingId,
    p_amount: p.amount,
    p_on: p.on,
    p_number: p.number ?? null,
    p_actor_id: p.actorId,
    p_actor_label: p.actorLabel ?? null,
  });
  if (error) rethrow(error);
  return data as { bookingId: string; importe: number; fecha: string; facturado: boolean };
}

export async function unmarkInvoiced(
  admin: SupabaseAdminClient,
  p: { bookingId: string; actorId: string; actorLabel?: string | null },
) {
  const { data, error } = await admin.rpc("unmark_invoiced", {
    p_booking_id: p.bookingId,
    p_actor_id: p.actorId,
    p_actor_label: p.actorLabel ?? null,
  });
  if (error) rethrow(error);
  return data as { bookingId: string; facturado: boolean };
}

/**
 * Cada guard, dicho de manera que se entienda con una clienta enfrente.
 */
export const INVOICING_MESSAGES: Record<string, { status: 400 | 403 | 404 | 409; message: string }> =
  {
    sin_permiso_finanzas: { status: 403, message: "No tenés acceso a Finanzas." },
    turno_sin_cerrar: {
      status: 409,
      message: "Ese turno todavía no está cerrado, así que no hay importe que facturar.",
    },
    ya_facturado: { status: 409, message: "Esa atención ya figura facturada." },
    no_estaba_facturado: { status: 409, message: "Esa atención no figuraba facturada." },
    importe_invalido: { status: 400, message: "Poné el importe que figura en el comprobante." },
    fecha_requerida: { status: 400, message: "Poné la fecha del comprobante." },
    fecha_futura: { status: 400, message: "La fecha del comprobante no puede ser posterior a hoy." },
  };
