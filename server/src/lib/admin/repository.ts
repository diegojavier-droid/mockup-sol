/**
 * Panel interno — lecturas y escrituras operativas.
 *
 * Todo pasa por el cliente admin porque el dominio de reservas no es
 * legible con RLS pública. La autorización ya se resolvió en el
 * middleware; acá sólo se consulta.
 */

import type { SupabaseAdminClient } from "../supabase";

export interface AgendaEntry {
  id: string;
  publicToken: string;
  startsAt: string;
  endsAt: string;
  shownDurationMin: number;
  status: string;
  source: string;
  depositStatus: string;
  /** Se creó superando la disponibilidad. La agenda lo distingue. */
  createdViaOverride: boolean;
  overrideReason: string | null;
  area: string;
  priceEstimatedMin: number;
  priceDisplayMode: string;
  depositAmount: number;
  customerNote: string | null;
  /** Estación asignada. NULL es válido: la asignación es opcional (D-06). */
  station: { id: string; code: string; name: string } | null;
  customer: {
    id: string;
    firstName: string;
    lastName: string | null;
    phone: string;
    email: string | null;
  };
  services: string[];
}

const AGENDA_SELECT =
  "id, public_token, starts_at, ends_at, shown_duration_min, status, source, deposit_status, created_via_override, override_reason, price_estimated_min, price_display_mode, deposit_amount, customer_note, resource_id, resources(id, code, name), areas!inner(slug), customers!inner(id, first_name, last_name, phone_e164, email), booking_items(snapshot_name, role, sort_order)";

type AgendaRow = {
  id: string;
  public_token: string;
  starts_at: string;
  ends_at: string;
  shown_duration_min: number;
  status: string;
  source: string;
  deposit_status: string;
  created_via_override: boolean;
  override_reason: string | null;
  price_estimated_min: number;
  price_display_mode: string;
  deposit_amount: number;
  customer_note: string | null;
  resource_id: string | null;
  resources: { id: string; code: string; name: string } | null;
  areas: { slug: string };
  customers: {
    id: string;
    first_name: string;
    last_name: string | null;
    phone_e164: string;
    email: string | null;
  };
  booking_items: { snapshot_name: string; role: string; sort_order: number }[];
};

function toAgendaEntry(row: AgendaRow): AgendaEntry {
  return {
    id: row.id,
    publicToken: row.public_token,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    shownDurationMin: row.shown_duration_min,
    status: row.status,
    source: row.source,
    depositStatus: row.deposit_status,
    createdViaOverride: row.created_via_override,
    overrideReason: row.override_reason,
    area: row.areas.slug,
    priceEstimatedMin: row.price_estimated_min,
    priceDisplayMode: row.price_display_mode,
    depositAmount: row.deposit_amount,
    customerNote: row.customer_note,
    station: row.resources
      ? { id: row.resources.id, code: row.resources.code, name: row.resources.name }
      : null,
    customer: {
      id: row.customers.id,
      firstName: row.customers.first_name,
      lastName: row.customers.last_name,
      phone: row.customers.phone_e164,
      email: row.customers.email,
    },
    services: (row.booking_items ?? [])
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((i) => i.snapshot_name),
  };
}

export async function listAgenda(
  admin: SupabaseAdminClient,
  params: { from: Date; to: Date; area?: string },
): Promise<AgendaEntry[]> {
  let query = admin
    .from("bookings")
    .select(AGENDA_SELECT)
    .gte("starts_at", params.from.toISOString())
    .lt("starts_at", params.to.toISOString())
    .order("starts_at", { ascending: true });
  if (params.area) query = query.eq("areas.slug", params.area);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((r) => toAgendaEntry(r as unknown as AgendaRow));
}

export async function getBookingForStaff(
  admin: SupabaseAdminClient,
  bookingId: string,
): Promise<AgendaEntry | null> {
  const { data, error } = await admin
    .from("bookings")
    .select(AGENDA_SELECT)
    .eq("id", bookingId)
    .maybeSingle();
  if (error) throw error;
  return data ? toAgendaEntry(data as unknown as AgendaRow) : null;
}

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending_payment: ["confirmed", "cancelled", "expired"],
  confirmed: ["attended", "cancelled"],
  expired: ["confirmed", "cancelled"],
  attended: [],
  cancelled: [],
  // Una ausencia es terminal: se registró que la hora se perdió. Revertirla
  // sería reescribir lo que pasó, no corregir un estado.
  no_show: [],
};

export class TransitionError extends Error {
  constructor(
    public from: string,
    public to: string,
  ) {
    super(`invalid_transition:${from}->${to}`);
    this.name = "TransitionError";
  }
}

export async function updateBookingStatus(
  admin: SupabaseAdminClient,
  params: { bookingId: string; status: string },
): Promise<AgendaEntry> {
  const { data: current, error: readError } = await admin
    .from("bookings")
    .select("status")
    .eq("id", params.bookingId)
    .maybeSingle();
  if (readError) throw readError;
  if (!current) throw new Error("booking_not_found");

  const from = (current as { status: string }).status;
  if (!(ALLOWED_TRANSITIONS[from] ?? []).includes(params.status)) {
    throw new TransitionError(from, params.status);
  }

  const patch: Record<string, unknown> = { status: params.status };
  if (params.status === "cancelled") patch.cancelled_at = new Date().toISOString();

  const { error } = await admin.from("bookings").update(patch).eq("id", params.bookingId);
  if (error) throw error;

  const updated = await getBookingForStaff(admin, params.bookingId);
  if (!updated) throw new Error("booking_not_found");
  return updated;
}

export interface CustomerSummary {
  id: string;
  firstName: string;
  lastName: string | null;
  phone: string;
  email: string | null;
  acceptsMarketing: boolean;
  lastVisitAt: string | null;
  nextBookingAt: string | null;
  visitCount: number;
}

export async function searchCustomers(
  admin: SupabaseAdminClient,
  params: { query?: string; limit?: number },
): Promise<CustomerSummary[]> {
  let q = admin
    .from("customers")
    .select(
      "id, first_name, last_name, phone_e164, email, accepts_marketing, bookings(starts_at, status)",
    )
    .order("created_at", { ascending: false })
    .limit(params.limit ?? 30);

  if (params.query) {
    const term = params.query.replace(/[%,()]/g, " ").trim();
    if (term) {
      q = q.or(
        `first_name.ilike.%${term}%,last_name.ilike.%${term}%,phone_e164.ilike.%${term}%,email.ilike.%${term}%`,
      );
    }
  }

  const { data, error } = await q;
  if (error) throw error;

  const now = Date.now();
  return (data ?? []).map((r) => {
    const row = r as unknown as {
      id: string;
      first_name: string;
      last_name: string | null;
      phone_e164: string;
      email: string | null;
      accepts_marketing: boolean;
      bookings: { starts_at: string; status: string }[] | null;
    };
    const bookings = row.bookings ?? [];
    // Una visita es un turno atendido. Un turno pasado que nunca se marcó
    // atendido no cuenta: puede haber sido una ausencia.
    const past = bookings
      .filter((b) => b.status === "attended")
      .sort((a, b) => Date.parse(b.starts_at) - Date.parse(a.starts_at));
    const future = bookings
      .filter(
        (b) =>
          new Date(b.starts_at).getTime() >= now &&
          (b.status === "confirmed" || b.status === "pending_payment"),
      )
      .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));
    return {
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      phone: row.phone_e164,
      email: row.email,
      acceptsMarketing: row.accepts_marketing,
      lastVisitAt: past[0]?.starts_at ?? null,
      nextBookingAt: future[0]?.starts_at ?? null,
      visitCount: bookings.filter((b) => b.status === "attended").length,
    };
  });
}

export interface CustomerDetail extends CustomerSummary {
  history: {
    bookingId: string;
    startsAt: string;
    status: string;
    services: string[];
    estimatedAmount: number;
    finalPriceAmount: number | null;
    formula: string | null;
  }[];
  notes: { id: string; body: string; createdBy: string | null; createdAt: string }[];
}

export async function getCustomerDetail(
  admin: SupabaseAdminClient,
  customerId: string,
): Promise<CustomerDetail | null> {
  const summaries = await searchCustomers(admin, { limit: 1000 });
  const summary = summaries.find((s) => s.id === customerId);
  if (!summary) return null;

  const [{ data: bookings, error: bError }, { data: notes, error: nError }] = await Promise.all([
    admin
      .from("bookings")
      .select(
        "id, starts_at, status, price_estimated_min, booking_items(snapshot_name, sort_order), service_execution_records(final_price_amount, formula)",
      )
      .eq("customer_id", customerId)
      .order("starts_at", { ascending: false })
      .limit(50),
    admin
      .from("customer_notes")
      .select("id, body, created_by, created_at")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  if (bError) throw bError;
  if (nError) throw nError;

  return {
    ...summary,
    history: (bookings ?? []).map((r) => {
      const row = r as unknown as {
        id: string;
        starts_at: string;
        status: string;
        price_estimated_min: number;
        booking_items: { snapshot_name: string; sort_order: number }[] | null;
        service_execution_records: {
          final_price_amount: number | null;
          formula: string | null;
        } | null;
      };
      return {
        bookingId: row.id,
        startsAt: row.starts_at,
        status: row.status,
        services: (row.booking_items ?? [])
          .slice()
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((i) => i.snapshot_name),
        estimatedAmount: row.price_estimated_min,
        finalPriceAmount: row.service_execution_records?.final_price_amount ?? null,
        formula: row.service_execution_records?.formula ?? null,
      };
    }),
    notes: (notes ?? []).map((r) => {
      const row = r as unknown as {
        id: string;
        body: string;
        created_by: string | null;
        created_at: string;
      };
      return {
        id: row.id,
        body: row.body,
        createdBy: row.created_by,
        createdAt: row.created_at,
      };
    }),
  };
}

export async function addCustomerNote(
  admin: SupabaseAdminClient,
  params: { customerId: string; body: string; createdBy: string },
): Promise<void> {
  const { error } = await admin.from("customer_notes").insert({
    customer_id: params.customerId,
    body: params.body,
    created_by: params.createdBy,
  });
  if (error) throw error;
}

export async function recordExecution(
  admin: SupabaseAdminClient,
  params: {
    bookingId: string;
    finalPriceAmount?: number | null;
    actualDurationMin?: number | null;
    servicesDone?: string | null;
    formula?: string | null;
    paymentMethod?: string | null;
    observation?: string | null;
    recordedBy: string;
  },
): Promise<void> {
  const { error } = await admin.from("service_execution_records").upsert(
    {
      booking_id: params.bookingId,
      final_price_amount: params.finalPriceAmount ?? null,
      actual_duration_min: params.actualDurationMin ?? null,
      services_done: params.servicesDone ?? null,
      formula: params.formula ?? null,
      payment_method: params.paymentMethod ?? null,
      observation: params.observation ?? null,
      recorded_by: params.recordedBy,
      recorded_at: new Date().toISOString(),
    },
    { onConflict: "booking_id" },
  );
  if (error) throw error;
}

// ---------------------------------------------------------------------
// Cierre de atención y conciliación
// ---------------------------------------------------------------------

export interface ClosePaymentLine {
  amount: number;
  method: "efectivo" | "transferencia" | "mercado_pago" | "otro";
  kind?: "deposit" | "balance" | "adjustment";
  note?: string | null;
}

export interface CloseServiceParams {
  bookingId: string;
  finalPrice: number;
  servicesDone?: string | null;
  staffId?: string | null;
  durationMin?: number | null;
  formula?: string | null;
  costAmount?: number | null;
  observation?: string | null;
  payments?: ClosePaymentLine[];
  actorId?: string | null;
  actorLabel?: string | null;
}

export interface CloseServiceResult {
  booking_id: string;
  status: string;
  final_price: number;
  estimated: number;
  collected: number;
  outstanding: number;
}

export async function closeService(
  admin: SupabaseAdminClient,
  params: CloseServiceParams,
): Promise<CloseServiceResult> {
  const { data, error } = await admin.rpc("close_service", {
    p_booking_id: params.bookingId,
    p_final_price: params.finalPrice,
    p_services_done: params.servicesDone ?? null,
    p_staff_id: params.staffId ?? null,
    p_duration_min: params.durationMin ?? null,
    p_formula: params.formula ?? null,
    p_cost_amount: params.costAmount ?? null,
    p_observation: params.observation ?? null,
    p_payments: params.payments ?? [],
    p_actor_id: params.actorId ?? null,
    p_actor_label: params.actorLabel ?? null,
  });
  if (error) throw error;
  return data as CloseServiceResult;
}

export interface ReconciliationRow {
  booking_id: string;
  starts_at: string;
  area: string;
  channel: string;
  customer: string;
  customer_phone: string;
  status: string;
  estimated_amount: number;
  final_amount: number | null;
  collected_amount: number;
  outstanding_amount: number;
  payment_methods: string | null;
  cost_amount: number | null;
  /** NULL significa NO DISPONIBLE: sin costo cargado no se estima margen. */
  margin_amount: number | null;
  deposit_status: string;
  attended_by: string | null;
  closed_at: string | null;
}

export async function loadReconciliation(
  admin: SupabaseAdminClient,
  params: { from: Date; to: Date },
): Promise<ReconciliationRow[]> {
  const { data, error } = await admin
    .from("reconciliation_report")
    .select("*")
    .gte("starts_at", params.from.toISOString())
    .lt("starts_at", params.to.toISOString())
    .order("starts_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ReconciliationRow[];
}

/** Un área en el desglose de ocupación. */
export interface DashboardAreaOccupancy {
  area: string;
  name: string;
  sold_minutes: number;
  capacity_minutes: number;
  /** NULL cuando el área no abrió: cerrada no es 0 %, es sin dato. */
  rate_pct: number | null;
}

export interface DashboardSummary {
  from: string;
  to: string;
  collected_amount: number;
  invoiced_amount: number;
  attended_count: number;
  average_ticket: number;
  bookings_by_channel: Record<string, number>;
  bookings_by_status: Record<string, number>;
  retained_deposits: number;
  new_customers: number;
  active_customers: number;
  occupancy: {
    basis: "stations";
    sold_minutes: number;
    capacity_minutes: number;
    rate_pct: number | null;
    by_area: DashboardAreaOccupancy[];
  };
  /**
   * `available: false` significa NO DISPONIBLE, no cero. `coverage` dice
   * sobre cuántas atenciones se calculó: un margen sobre 2 de 40 no es
   * el margen del mes y la pantalla tiene que poder decirlo.
   */
  margin: { available: boolean; coverage: number; amount: number | null };
  top_services: Array<{ name: string; count: number }>;
}

export async function loadDashboardSummary(
  admin: SupabaseAdminClient,
  params: { from: Date; to: Date },
): Promise<DashboardSummary> {
  const { data, error } = await admin.rpc("dashboard_summary", {
    p_from: params.from.toISOString(),
    p_to: params.to.toISOString(),
  });
  if (error) throw error;
  return data as DashboardSummary;
}

// ---------------------------------------------------------------- recursos

export interface StationRow {
  id: string;
  area: string;
  code: string;
  name: string;
  isActive: boolean;
  /** Bloqueo vigente en el rango consultado, si lo hay. */
  blockedUntil: string | null;
  blockReason: string | null;
}

export async function listStations(
  admin: SupabaseAdminClient,
  params: { area?: string; at?: Date } = {},
): Promise<StationRow[]> {
  let query = admin
    .from("resources")
    .select("id, code, name, is_active, areas!inner(slug)")
    .eq("kind", "physical")
    .order("sort_order", { ascending: true });
  if (params.area) query = query.eq("areas.slug", params.area);

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as unknown as {
    id: string;
    code: string;
    name: string;
    is_active: boolean;
    areas: { slug: string };
  }[];

  // Un bloqueo vigente cambia lo que el mostrador puede ofrecer, así que
  // viaja con la estación en vez de exigir una segunda consulta.
  const at = (params.at ?? new Date()).toISOString();
  const { data: blocks, error: blockError } = await admin
    .from("resource_blocks")
    .select("resource_id, ends_at, reason")
    .lte("starts_at", at)
    .gt("ends_at", at);
  if (blockError) throw blockError;

  const blocked = new Map(
    ((blocks ?? []) as { resource_id: string; ends_at: string; reason: string }[]).map((b) => [
      b.resource_id,
      b,
    ]),
  );

  return rows.map((r) => {
    const block = blocked.get(r.id);
    return {
      id: r.id,
      area: r.areas.slug,
      code: r.code,
      name: r.name,
      isActive: r.is_active,
      blockedUntil: block?.ends_at ?? null,
      blockReason: block?.reason ?? null,
    };
  });
}

export class StationError extends Error {
  constructor(public code: "not_found" | "wrong_area" | "blocked") {
    super(code);
    this.name = "StationError";
  }
}

/**
 * Asignar (o desasignar, con `stationId: null`) la estación de un turno.
 *
 * La estación tiene que ser del área del turno: mandar a alguien a la
 * camilla de Depilación para un color no es una preferencia discutible,
 * es un error de datos.
 */
export async function assignStation(
  admin: SupabaseAdminClient,
  params: { bookingId: string; stationId: string | null },
): Promise<void> {
  if (params.stationId !== null) {
    const { data: booking, error: bookingError } = await admin
      .from("bookings")
      .select("area_id, starts_at, ends_at")
      .eq("id", params.bookingId)
      .maybeSingle();
    if (bookingError) throw bookingError;
    if (!booking) throw new StationError("not_found");

    const b = booking as { area_id: string; starts_at: string; ends_at: string };

    const { data: station, error: stationError } = await admin
      .from("resources")
      .select("id, area_id, is_active")
      .eq("id", params.stationId)
      .eq("kind", "physical")
      .maybeSingle();
    if (stationError) throw stationError;
    if (!station) throw new StationError("not_found");

    const st = station as { id: string; area_id: string; is_active: boolean };
    if (st.area_id !== b.area_id || !st.is_active) throw new StationError("wrong_area");

    // Fuera de servicio en ese horario: asignarla igual sería prometer
    // un puesto que no existe.
    const { data: blocks, error: blockError } = await admin
      .from("resource_blocks")
      .select("id")
      .eq("resource_id", st.id)
      .lt("starts_at", b.ends_at)
      .gt("ends_at", b.starts_at);
    if (blockError) throw blockError;
    if ((blocks ?? []).length > 0) throw new StationError("blocked");
  }

  const { error } = await admin
    .from("bookings")
    .update({ resource_id: params.stationId, updated_at: new Date().toISOString() })
    .eq("id", params.bookingId);
  if (error) throw error;
}

/** Estación fuera de servicio por un rango, con motivo. */
export async function blockStation(
  admin: SupabaseAdminClient,
  params: {
    stationId: string;
    startsAt: Date;
    endsAt: Date;
    reason: string;
    createdBy: string | null;
  },
): Promise<{ id: string; displacedBookings: number }> {
  const { data, error } = await admin
    .from("resource_blocks")
    .insert({
      resource_id: params.stationId,
      starts_at: params.startsAt.toISOString(),
      ends_at: params.endsAt.toISOString(),
      reason: params.reason,
      created_by: params.createdBy,
    })
    .select("id")
    .single();
  if (error) throw error;

  // Los turnos que ya estaban en esa estación quedan SIN estación, no
  // cancelados: la clienta viene igual, hay que reubicarla. Cancelar por
  // una reparación sería destruir información del salón.
  const { data: freed, error: freeError } = await admin
    .from("bookings")
    .update({ resource_id: null, updated_at: new Date().toISOString() })
    .eq("resource_id", params.stationId)
    .lt("starts_at", params.endsAt.toISOString())
    .gt("ends_at", params.startsAt.toISOString())
    .select("id");
  if (freeError) throw freeError;

  return { id: (data as { id: string }).id, displacedBookings: (freed ?? []).length };
}

export async function unblockStation(admin: SupabaseAdminClient, blockId: string): Promise<void> {
  const { error } = await admin.from("resource_blocks").delete().eq("id", blockId);
  if (error) throw error;
}
