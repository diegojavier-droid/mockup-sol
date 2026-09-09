/**
 * Lo que Sol cambia de su salón: precios, duraciones, estaciones y
 * productos.
 *
 * Todo pasa por funciones de la base que validan, auditan y devuelven el
 * valor anterior. Acá no hay ninguna regla: si una regla viviera en este
 * archivo, existiría en dos lugares y algún día dirían cosas distintas.
 */
import type { SupabaseAdminClient } from "../supabase";

export class SalonEditError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "SalonEditError";
  }
}

function rethrow(error: { message?: string } | null): never {
  throw new SalonEditError(error?.message ?? "unknown_error");
}

export interface ServiceTierRow {
  slug: string;
  name: string;
  area: string;
  lengthTier: string;
  priceMain: number;
  durationMin: number;
  isActive: boolean;
}

/** El catálogo tal como Sol lo va a editar: un renglón por tramo de largo. */
export async function listServiceTiers(admin: SupabaseAdminClient): Promise<ServiceTierRow[]> {
  const { data, error } = await admin
    .from("services")
    .select(
      "slug, name, is_active, categories!inner(slug), service_price_tiers(length_tier, price_main, duration_main_min)",
    )
    .is("deleted_at", null)
    .order("slug");
  if (error) rethrow(error);

  const rows = (data ?? []) as unknown as {
    slug: string;
    name: string;
    is_active: boolean;
    categories: { slug: string };
    service_price_tiers: { length_tier: string; price_main: number; duration_main_min: number }[];
  }[];

  return rows.flatMap((s) =>
    (s.service_price_tiers ?? [])
      .map((t) => ({
        slug: s.slug,
        name: s.name,
        area: s.categories.slug,
        lengthTier: t.length_tier,
        priceMain: t.price_main,
        durationMin: t.duration_main_min,
        isActive: s.is_active,
      }))
      .sort((a, b) => a.lengthTier.localeCompare(b.lengthTier)),
  );
}

export async function setServicePrice(
  admin: SupabaseAdminClient,
  p: {
    slug: string;
    lengthTier: string;
    priceMain: number;
    durationMin: number;
    actorId: string;
    actorLabel?: string | null;
  },
) {
  const { data, error } = await admin.rpc("set_service_price", {
    p_service_slug: p.slug,
    p_length_tier: p.lengthTier,
    p_price_main: p.priceMain,
    p_duration_min: p.durationMin,
    p_actor_id: p.actorId,
    p_actor_label: p.actorLabel ?? null,
  });
  if (error) rethrow(error);
  return data as Record<string, unknown>;
}

export async function upsertStation(
  admin: SupabaseAdminClient,
  p: {
    areaSlug: string;
    name: string;
    stationId?: string | null;
    actorId: string;
    actorLabel?: string | null;
  },
) {
  const { data, error } = await admin.rpc("upsert_station", {
    p_area_slug: p.areaSlug,
    p_name: p.name,
    p_actor_id: p.actorId,
    p_actor_label: p.actorLabel ?? null,
    p_station_id: p.stationId ?? null,
  });
  if (error) rethrow(error);
  return data as { id: string; accion: string };
}

export async function setStationActive(
  admin: SupabaseAdminClient,
  p: { stationId: string; active: boolean; actorId: string; actorLabel?: string | null },
) {
  const { data, error } = await admin.rpc("set_station_active", {
    p_station_id: p.stationId,
    p_active: p.active,
    p_actor_id: p.actorId,
    p_actor_label: p.actorLabel ?? null,
  });
  if (error) rethrow(error);
  return data as { id: string; activa: boolean };
}

export interface ProductRow {
  id: string;
  name: string;
  brand: string | null;
  salePrice: number | null;
  isActive: boolean;
}

export async function listProducts(admin: SupabaseAdminClient): Promise<ProductRow[]> {
  const { data, error } = await admin
    .from("products")
    .select("id, name, brand, sale_price, is_active")
    .order("name");
  if (error) rethrow(error);
  return (
    (data ?? []) as {
      id: string;
      name: string;
      brand: string | null;
      sale_price: number | null;
      is_active: boolean;
    }[]
  ).map((r) => ({
    id: r.id,
    name: r.name,
    brand: r.brand,
    salePrice: r.sale_price,
    isActive: r.is_active,
  }));
}

export async function upsertProduct(
  admin: SupabaseAdminClient,
  p: {
    name: string;
    brand?: string | null;
    salePrice?: number | null;
    productId?: string | null;
    actorId: string;
    actorLabel?: string | null;
  },
) {
  const { data, error } = await admin.rpc("upsert_product", {
    p_name: p.name,
    p_brand: p.brand ?? null,
    p_sale_price: p.salePrice ?? null,
    p_actor_id: p.actorId,
    p_actor_label: p.actorLabel ?? null,
    p_product_id: p.productId ?? null,
  });
  if (error) rethrow(error);
  return data as Record<string, unknown>;
}

export async function setProductActive(
  admin: SupabaseAdminClient,
  p: { productId: string; active: boolean; actorId: string; actorLabel?: string | null },
) {
  const { data, error } = await admin.rpc("set_product_active", {
    p_product_id: p.productId,
    p_active: p.active,
    p_actor_id: p.actorId,
    p_actor_label: p.actorLabel ?? null,
  });
  if (error) rethrow(error);
  return data as { id: string; activo: boolean };
}

/** Mensajes en castellano para lo que puede fallar. */
export const SALON_EDIT_MESSAGES: Record<string, { status: 400 | 404 | 409; message: string }> = {
  precio_invalido: { status: 400, message: "El precio tiene que ser mayor a cero." },
  duracion_invalida: { status: 400, message: "La duración tiene que ser mayor a cero." },
  nombre_requerido: { status: 400, message: "Falta el nombre." },
  service_not_found: { status: 404, message: "No encontramos ese servicio." },
  tier_not_found: { status: 404, message: "Ese servicio no tiene ese largo." },
  station_not_found: { status: 404, message: "No encontramos esa estación." },
  product_not_found: { status: 404, message: "No encontramos ese producto." },
  area_not_found: { status: 404, message: "No encontramos esa área." },
  estacion_con_turnos: {
    status: 409,
    message: "Esa estación tiene turnos asignados. Movelos primero y después sacala de la lista.",
  },
};
