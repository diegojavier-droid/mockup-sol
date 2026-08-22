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
  area: string;
  priceEstimatedMin: number;
  priceDisplayMode: string;
  depositAmount: number;
  customerNote: string | null;
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
  "id, public_token, starts_at, ends_at, shown_duration_min, status, source, price_estimated_min, price_display_mode, deposit_amount, customer_note, areas!inner(slug), customers!inner(id, first_name, last_name, phone_e164, email), booking_items(snapshot_name, role, sort_order)";

type AgendaRow = {
  id: string;
  public_token: string;
  starts_at: string;
  ends_at: string;
  shown_duration_min: number;
  status: string;
  source: string;
  price_estimated_min: number;
  price_display_mode: string;
  deposit_amount: number;
  customer_note: string | null;
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
    area: row.areas.slug,
    priceEstimatedMin: row.price_estimated_min,
    priceDisplayMode: row.price_display_mode,
    depositAmount: row.deposit_amount,
    customerNote: row.customer_note,
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
