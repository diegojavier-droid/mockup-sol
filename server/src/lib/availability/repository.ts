/**
 * Availability repository — insumos de agenda para el dominio.
 *
 * Usa el cliente ADMIN: las reservas existentes no son legibles con RLS
 * pública (y no deben serlo). Sólo se extraen las ventanas ocupadas, sin
 * datos de clienta: la disponibilidad no revela quién viene.
 */

import type { SupabaseAdminClient } from "../supabase";
import type { SupabaseAnonServerClient } from "../supabase";
import type { BusinessHour, ExistingDemand, ScheduleException } from "../../domain/availability";

export interface AreaRow {
  id: string;
  slug: string;
  capacity: number;
  isBookableOnline: boolean;
}

export interface AvailabilitySettings {
  slotGranularityMin: number;
  minAdvanceMin: number;
  maxAdvanceDays: number;
}

const DEFAULTS: AvailabilitySettings = {
  slotGranularityMin: 30,
  minAdvanceMin: 120,
  maxAdvanceDays: 30,
};

export async function loadAvailabilitySettings(
  client: SupabaseAnonServerClient,
): Promise<AvailabilitySettings> {
  const { data, error } = await client
    .from("business_settings")
    .select("key, value")
    .in("key", ["slot_granularity_minutes", "min_advance_hours", "max_advance_days"]);
  if (error) throw error;

  const byKey = new Map((data ?? []).map((r) => [r.key as string, r.value]));
  const num = (key: string, fallback: number) => {
    const raw = byKey.get(key);
    const n = typeof raw === "number" ? raw : Number(raw);
    return Number.isFinite(n) ? n : fallback;
  };
  return {
    slotGranularityMin: num("slot_granularity_minutes", DEFAULTS.slotGranularityMin),
    minAdvanceMin: num("min_advance_hours", DEFAULTS.minAdvanceMin / 60) * 60,
    maxAdvanceDays: num("max_advance_days", DEFAULTS.maxAdvanceDays),
  };
}

export async function loadArea(admin: SupabaseAdminClient, slug: string): Promise<AreaRow | null> {
  const { data, error } = await admin
    .from("areas")
    .select("id, slug, capacity, is_bookable_online")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as { id: string; slug: string; capacity: number; is_bookable_online: boolean };
  return {
    id: row.id,
    slug: row.slug,
    capacity: row.capacity,
    isBookableOnline: row.is_bookable_online,
  };
}

export async function loadBusinessHours(client: SupabaseAnonServerClient): Promise<BusinessHour[]> {
  const { data, error } = await client
    .from("business_hours")
    .select("weekday, opens_at, closes_at")
    .eq("is_active", true);
  if (error) throw error;
  return (data ?? []).map((r) => {
    const row = r as { weekday: number; opens_at: string; closes_at: string };
    return {
      weekday: row.weekday,
      opensAt: row.opens_at.slice(0, 5),
      closesAt: row.closes_at.slice(0, 5),
    };
  });
}

export async function loadScheduleExceptions(
  admin: SupabaseAdminClient,
  params: { areaId: string; from: Date; to: Date },
): Promise<ScheduleException[]> {
  const { data, error } = await admin
    .from("schedule_exceptions")
    .select("starts_at, ends_at, capacity_delta, area_id")
    .eq("is_active", true)
    .or(`area_id.is.null,area_id.eq.${params.areaId}`)
    .lt("starts_at", params.to.toISOString())
    .gt("ends_at", params.from.toISOString());
  if (error) throw error;
  return (data ?? []).map((r) => {
    const row = r as { starts_at: string; ends_at: string; capacity_delta: number | null };
    return {
      startsAt: new Date(row.starts_at),
      endsAt: new Date(row.ends_at),
      capacityDelta: row.capacity_delta,
    };
  });
}

/**
 * Ventanas ocupadas del área. El predicado de bloqueo replica
 * public.booking_blocks(): confirmadas/atendidas siempre, pendientes
 * sólo mientras el hold sigue vigente (gate C5).
 */
export async function loadBlockingDemands(
  admin: SupabaseAdminClient,
  params: { areaId: string; from: Date; to: Date; now: Date },
): Promise<ExistingDemand[]> {
  const { data, error } = await admin
    .from("bookings")
    .select("starts_at, ends_at, status, payment_required_until")
    .eq("area_id", params.areaId)
    .in("status", ["confirmed", "attended", "pending_payment"])
    .lt("starts_at", params.to.toISOString())
    .gt("ends_at", params.from.toISOString());
  if (error) throw error;

  return (data ?? [])
    .map(
      (r) =>
        r as {
          starts_at: string;
          ends_at: string;
          status: string;
          payment_required_until: string | null;
        },
    )
    .filter((row) => {
      if (row.status === "confirmed" || row.status === "attended") return true;
      if (row.status !== "pending_payment") return false;
      return (
        row.payment_required_until === null ||
        new Date(row.payment_required_until).getTime() > params.now.getTime()
      );
    })
    .map((row) => ({
      startsAt: new Date(row.starts_at),
      endsAt: new Date(row.ends_at),
      units: 1,
    }));
}
