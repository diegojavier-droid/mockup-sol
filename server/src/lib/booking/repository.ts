/**
 * Booking repository — envoltorio tipado de las RPCs transaccionales.
 *
 * Toda la integridad (lock por área+día, capacidad pico, hold, snapshot)
 * vive en PostgreSQL. Acá sólo se traduce el resultado a errores de
 * dominio con mensajes que el frontend puede convertir en lenguaje humano.
 */

import type { SupabaseAdminClient } from "../supabase";

export type BookingErrorCode =
  | "invalid_window"
  | "area_not_found"
  | "area_not_bookable_online"
  | "area_closed"
  | "capacity_full"
  | "unknown_service"
  | "unknown_extra"
  | "booking_not_found"
  | "not_cancellable";

export class BookingError extends Error {
  constructor(public code: BookingErrorCode) {
    super(code);
    this.name = "BookingError";
  }
}

const KNOWN_CODES = new Set<BookingErrorCode>([
  "invalid_window",
  "area_not_found",
  "area_not_bookable_online",
  "area_closed",
  "capacity_full",
  "unknown_service",
  "unknown_extra",
  "booking_not_found",
  "not_cancellable",
]);

function rethrow(error: { message?: string } | null): never {
  const message = (error?.message ?? "").trim();
  for (const code of KNOWN_CODES) {
    if (message === code || message.includes(code)) throw new BookingError(code);
  }
  throw new Error(message || "booking rpc failed");
}

export interface CreateBookingItem {
  service_slug?: string;
  extra_slug?: string;
  role: "main" | "addon" | "extra";
  name: string;
  price_amount: number;
  length_tier: string | null;
  duration_min: number;
  process_min: number;
  setup_min: number;
  personalization?: Record<string, string> | null;
}

export interface CreateBookingParams {
  areaSlug: string;
  startsAt: Date;
  endsAt: Date;
  shownDurationMin: number;
  priceDisplayMode: string;
  priceEstimatedMin: number;
  priceEstimatedMax: number | null;
  depositRate: number;
  depositAmount: number;
  customer: {
    first_name: string;
    last_name?: string | null;
    phone_e164: string;
    email?: string | null;
    accepts_marketing?: boolean;
  };
  items: CreateBookingItem[];
  customerNote?: string | null;
  /** Canal. Sólo `online` es autogestionado por la clienta. */
  source: BookingSource;
  /** Persona del salón que la creó. Null en el canal público. */
  createdBy?: string | null;
  /** Email o nombre del actor, para que la bitácora sobreviva a una baja. */
  actorLabel?: string | null;
  /** Crear superando la disponibilidad configurada. Nunca desde `online`. */
  override?: boolean;
  overrideReason?: string | null;
}

export const BOOKING_SOURCES = ["online", "manual", "phone", "whatsapp", "walk_in"] as const;
export type BookingSource = (typeof BOOKING_SOURCES)[number];

export interface CreatedBooking {
  id: string;
  public_token: string;
  status: string;
  source: BookingSource;
  deposit_status: string;
  starts_at: string;
  ends_at: string;
  payment_required_until: string | null;
  deposit_amount: number;
  created_via_override: boolean;
}

export async function createBooking(
  admin: SupabaseAdminClient,
  params: CreateBookingParams,
): Promise<CreatedBooking> {
  const { data, error } = await admin.rpc("create_booking", {
    p_area_slug: params.areaSlug,
    p_starts_at: params.startsAt.toISOString(),
    p_ends_at: params.endsAt.toISOString(),
    p_shown_duration_min: params.shownDurationMin,
    p_price_display_mode: params.priceDisplayMode,
    p_price_estimated_min: params.priceEstimatedMin,
    p_price_estimated_max: params.priceEstimatedMax,
    p_deposit_rate: params.depositRate,
    p_deposit_amount: params.depositAmount,
    p_customer: params.customer,
    p_items: params.items,
    p_customer_note: params.customerNote ?? null,
    p_source: params.source,
    p_created_by: params.createdBy ?? null,
    p_actor_label: params.actorLabel ?? null,
    p_override: params.override ?? false,
    p_override_reason: params.overrideReason ?? null,
  });
  if (error) rethrow(error);
  return data as CreatedBooking;
}

export async function cancelBooking(
  admin: SupabaseAdminClient,
  params: { publicToken: string; reason?: string | null },
): Promise<{
  status: string;
  refund_due: boolean;
  previous_status: string;
  deposit_amount: number;
}> {
  const { data, error } = await admin.rpc("cancel_booking", {
    p_public_token: params.publicToken,
    p_reason: params.reason ?? null,
  });
  if (error) rethrow(error);
  return data as {
    status: string;
    refund_due: boolean;
    previous_status: string;
    deposit_amount: number;
  };
}

export interface CapacityCheck {
  found: boolean;
  area?: string;
  area_name?: string;
  capacity?: number;
  peak?: number;
  area_closed?: boolean;
  fits?: boolean;
}

/**
 * Qué va a pasar si se crea este turno. Devuelve los números, no un
 * veredicto: sin ellos la persona tiene que adivinar por qué no entra.
 */
export async function checkCapacity(
  admin: SupabaseAdminClient,
  params: { areaSlug: string; startsAt: Date; endsAt: Date },
): Promise<CapacityCheck> {
  const { data, error } = await admin.rpc("check_capacity", {
    p_area_slug: params.areaSlug,
    p_starts_at: params.startsAt.toISOString(),
    p_ends_at: params.endsAt.toISOString(),
  });
  if (error) rethrow(error);
  return data as CapacityCheck;
}

export async function markNoShow(
  admin: SupabaseAdminClient,
  params: { bookingId: string; actorId?: string | null; actorLabel?: string | null },
): Promise<{ status: string; deposit_status: string; deposit_amount: number }> {
  const { data, error } = await admin.rpc("mark_no_show", {
    p_booking_id: params.bookingId,
    p_actor_id: params.actorId ?? null,
    p_actor_label: params.actorLabel ?? null,
  });
  if (error) rethrow(error);
  return data as { status: string; deposit_status: string; deposit_amount: number };
}

export async function expireStaleBookings(admin: SupabaseAdminClient): Promise<number> {
  const { data, error } = await admin.rpc("expire_stale_bookings");
  if (error) rethrow(error);
  return (data as number) ?? 0;
}

export interface BookingView {
  publicToken: string;
  status: string;
  startsAt: string;
  endsAt: string;
  shownDurationMin: number;
  priceDisplayMode: string;
  priceEstimatedMin: number;
  depositAmount: number;
  depositRateApplied: number;
  paymentRequiredUntil: string | null;
  refundDue: boolean | null;
  customerNote: string | null;
  area: string;
  customer: { firstName: string; lastName: string | null };
  items: {
    role: string;
    name: string;
    priceAmount: number;
    lengthTier: string | null;
    durationMin: number;
  }[];
}

export async function getBookingByToken(
  admin: SupabaseAdminClient,
  publicToken: string,
): Promise<BookingView | null> {
  const { data, error } = await admin
    .from("bookings")
    .select(
      "public_token, status, starts_at, ends_at, shown_duration_min, price_display_mode, price_estimated_min, deposit_amount, deposit_rate_applied, payment_required_until, refund_due, customer_note, areas!inner(slug), customers!inner(first_name, last_name), booking_items(role, snapshot_name, snapshot_price_amount, snapshot_length_tier, snapshot_duration_min, sort_order)",
    )
    .eq("public_token", publicToken)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const row = data as unknown as {
    public_token: string;
    status: string;
    starts_at: string;
    ends_at: string;
    shown_duration_min: number;
    price_display_mode: string;
    price_estimated_min: number;
    deposit_amount: number;
    deposit_rate_applied: number;
    payment_required_until: string | null;
    refund_due: boolean | null;
    customer_note: string | null;
    areas: { slug: string };
    customers: { first_name: string; last_name: string | null };
    booking_items: {
      role: string;
      snapshot_name: string;
      snapshot_price_amount: number;
      snapshot_length_tier: string | null;
      snapshot_duration_min: number;
      sort_order: number;
    }[];
  };

  return {
    publicToken: row.public_token,
    status: row.status,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    shownDurationMin: row.shown_duration_min,
    priceDisplayMode: row.price_display_mode,
    priceEstimatedMin: row.price_estimated_min,
    depositAmount: row.deposit_amount,
    depositRateApplied: Number(row.deposit_rate_applied),
    paymentRequiredUntil: row.payment_required_until,
    refundDue: row.refund_due,
    customerNote: row.customer_note,
    area: row.areas.slug,
    customer: { firstName: row.customers.first_name, lastName: row.customers.last_name },
    items: (row.booking_items ?? [])
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((i) => ({
        role: i.role,
        name: i.snapshot_name,
        priceAmount: i.snapshot_price_amount,
        lengthTier: i.snapshot_length_tier,
        durationMin: i.snapshot_duration_min,
      })),
  };
}
