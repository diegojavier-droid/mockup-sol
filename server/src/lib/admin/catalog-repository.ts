/**
 * El catálogo y las promociones, tal como Sol los edita.
 *
 * Todo pasa por funciones de la base que validan, auditan y corren en una
 * sola transacción. Acá no hay ninguna regla de negocio: si una regla
 * viviera en este archivo, existiría en dos lugares y algún día dirían
 * cosas distintas.
 *
 * POR QUÉ NO ESCRIBE LAS TABLAS DIRECTO
 *
 * `service_role` podría hacerlo —tiene permiso— y sería menos código. No
 * se hace porque un servicio sin precios existe pero no se puede cotizar,
 * y una promoción sin disparador existe y no hace nada: las dos cosas se
 * descubren cuando una clienta ya está en la pantalla de reserva.
 */
import type { SupabaseAdminClient } from "../supabase";
import { SalonEditError } from "./salon-repository";

function rethrow(error: { message?: string } | null): never {
  throw new SalonEditError(error?.message ?? "unknown_error");
}

/** Las tres clases de prestación. Es el mismo dominio que `services.kind`. */
export type ServiceKind = "servicio" | "color" | "tratamiento";

export interface CatalogRow {
  slug: string;
  name: string;
  description: string | null;
  category: string;
  kind: ServiceKind;
  durationMin: number;
  priceAmount: number;
  /** Cuánto le cuesta al salón prestarlo. `null` es «no sabemos», nunca cero. */
  standardCost: number | null;
  isPublic: boolean;
  isActive: boolean;
}

/**
 * El catálogo entero, un renglón por servicio.
 *
 * Trae los dados de baja afuera: `deleted_at` es una baja lógica para no
 * llevarse puestos los turnos viejos, no un archivo que Sol tenga que
 * mirar.
 */
export async function listCatalog(admin: SupabaseAdminClient): Promise<CatalogRow[]> {
  const { data, error } = await admin
    .from("services")
    .select(
      "slug, name, description, kind, duration_minutes, price_amount, is_public, is_active, categories!inner(slug), service_parameters(standard_cost_amount)",
    )
    .is("deleted_at", null)
    .order("name");
  if (error) rethrow(error);

  type Fila = {
    slug: string;
    name: string;
    description: string | null;
    kind: ServiceKind;
    duration_minutes: number;
    price_amount: number;
    is_public: boolean;
    is_active: boolean;
    categories: { slug: string } | { slug: string }[];
    service_parameters: { standard_cost_amount: number | null }[] | null;
  };

  return ((data ?? []) as Fila[]).map((r) => ({
    slug: r.slug,
    name: r.name,
    description: r.description,
    category: Array.isArray(r.categories) ? (r.categories[0]?.slug ?? "") : r.categories.slug,
    kind: r.kind,
    durationMin: r.duration_minutes,
    priceAmount: r.price_amount,
    standardCost: r.service_parameters?.[0]?.standard_cost_amount ?? null,
    isPublic: r.is_public,
    isActive: r.is_active,
  }));
}

export interface CategoryRow {
  slug: string;
  name: string;
  isPublic: boolean;
}

/** Dónde se puede poner un servicio nuevo. */
export async function listCategories(admin: SupabaseAdminClient): Promise<CategoryRow[]> {
  const { data, error } = await admin
    .from("categories")
    .select("slug, name, is_public")
    .order("sort_order");
  if (error) rethrow(error);
  return ((data ?? []) as { slug: string; name: string; is_public: boolean }[]).map((r) => ({
    slug: r.slug,
    name: r.name,
    isPublic: r.is_public,
  }));
}

export async function createService(
  admin: SupabaseAdminClient,
  p: {
    slug: string;
    name: string;
    category: string;
    kind: ServiceKind;
    durationMin: number;
    price: number;
    description?: string | null;
    isPublic?: boolean;
    actorLabel?: string | null;
  },
) {
  const { data, error } = await admin.rpc("create_service", {
    p_slug: p.slug,
    p_name: p.name,
    p_category: p.category,
    p_kind: p.kind,
    p_duration: p.durationMin,
    p_price: p.price,
    p_description: p.description ?? null,
    p_is_public: p.isPublic ?? false,
    p_actor: p.actorLabel ?? null,
  });
  if (error) rethrow(error);
  return { id: data as string, slug: p.slug };
}

export async function updateService(
  admin: SupabaseAdminClient,
  p: {
    slug: string;
    name?: string | null;
    description?: string | null;
    category?: string | null;
    kind?: ServiceKind | null;
    isPublic?: boolean | null;
    isActive?: boolean | null;
    actorLabel?: string | null;
  },
) {
  const { error } = await admin.rpc("update_service", {
    p_slug: p.slug,
    p_name: p.name ?? null,
    p_description: p.description ?? null,
    p_category: p.category ?? null,
    p_kind: p.kind ?? null,
    p_is_public: p.isPublic ?? null,
    p_is_active: p.isActive ?? null,
    p_actor: p.actorLabel ?? null,
  });
  if (error) rethrow(error);
  return { slug: p.slug };
}

export async function deleteService(
  admin: SupabaseAdminClient,
  p: { slug: string; actorLabel?: string | null },
) {
  const { error } = await admin.rpc("delete_service", {
    p_slug: p.slug,
    p_actor: p.actorLabel ?? null,
  });
  if (error) rethrow(error);
  return { slug: p.slug };
}

/**
 * Cuánto le cuesta al salón prestar el servicio.
 *
 * `null` se acepta y significa «no sabemos»: sin el dato el margen queda
 * NO DISPONIBLE y no se estima. Cero diría otra cosa —que no cuesta
 * nada— y un margen sobre un cero inventado parece un número.
 */
export async function setServiceCost(
  admin: SupabaseAdminClient,
  p: { slug: string; amount: number | null; actorLabel?: string | null },
) {
  const { error } = await admin.rpc("set_service_cost", {
    p_slug: p.slug,
    p_amount: p.amount,
    p_actor: p.actorLabel ?? null,
  });
  if (error) rethrow(error);
  return { slug: p.slug, amount: p.amount };
}

/* ------------------------------------------------------------------ */
/* Promociones                                                         */
/* ------------------------------------------------------------------ */

export type BenefitKind = "precio_de_agregado" | "porcentaje" | "monto_fijo";
export type LadoDeLaRegla = "disparador" | "beneficio";

/** Un lado de la regla: o nombra una clase, o nombra un servicio. */
export interface ReglaRow {
  serviceKind: ServiceKind | null;
  serviceSlug: string | null;
}

export interface PromotionRow {
  slug: string;
  name: string;
  description: string | null;
  benefitKind: BenefitKind;
  benefitValue: number | null;
  startsOn: string | null;
  endsOn: string | null;
  isActive: boolean;
  disparadores: ReglaRow[];
  beneficios: ReglaRow[];
}

export async function listPromotions(admin: SupabaseAdminClient): Promise<PromotionRow[]> {
  const { data, error } = await admin
    .from("promotions")
    .select(
      "slug, name, description, benefit_kind, benefit_value, starts_on, ends_on, is_active, sort_order, promotion_triggers(service_kind, services(slug)), promotion_benefits(service_kind, services(slug))",
    )
    .order("sort_order");
  if (error) rethrow(error);

  // PostgREST devuelve la relación anidada como arreglo aunque sea a lo
  // sumo una fila: la regla nombra un servicio o ninguno.
  type Lado = {
    service_kind: ServiceKind | null;
    services: { slug: string } | { slug: string }[] | null;
  };
  type Fila = {
    slug: string;
    name: string;
    description: string | null;
    benefit_kind: BenefitKind;
    benefit_value: number | null;
    starts_on: string | null;
    ends_on: string | null;
    is_active: boolean;
    promotion_triggers: Lado[] | null;
    promotion_benefits: Lado[] | null;
  };

  const slugDe = (s: Lado["services"]): string | null =>
    Array.isArray(s) ? (s[0]?.slug ?? null) : (s?.slug ?? null);

  const lado = (filas: Lado[] | null): ReglaRow[] =>
    (filas ?? []).map((r) => ({
      serviceKind: r.service_kind,
      serviceSlug: slugDe(r.services),
    }));

  return ((data ?? []) as Fila[]).map((r) => ({
    slug: r.slug,
    name: r.name,
    description: r.description,
    benefitKind: r.benefit_kind,
    benefitValue: r.benefit_value,
    startsOn: r.starts_on,
    endsOn: r.ends_on,
    isActive: r.is_active,
    disparadores: lado(r.promotion_triggers),
    beneficios: lado(r.promotion_benefits),
  }));
}

export async function upsertPromotion(
  admin: SupabaseAdminClient,
  p: {
    slug: string;
    name: string;
    description?: string | null;
    benefitKind?: BenefitKind;
    benefitValue?: number | null;
    startsOn?: string | null;
    endsOn?: string | null;
    isActive?: boolean;
    actorLabel?: string | null;
  },
) {
  const { data, error } = await admin.rpc("upsert_promotion", {
    p_slug: p.slug,
    p_name: p.name,
    p_description: p.description ?? null,
    p_benefit_kind: p.benefitKind ?? "precio_de_agregado",
    p_benefit_value: p.benefitValue ?? null,
    p_starts_on: p.startsOn ?? null,
    p_ends_on: p.endsOn ?? null,
    p_is_active: p.isActive ?? true,
    p_actor: p.actorLabel ?? null,
  });
  if (error) rethrow(error);
  return { id: data as string, slug: p.slug };
}

export async function setPromotionRule(
  admin: SupabaseAdminClient,
  p: {
    slug: string;
    lado: LadoDeLaRegla;
    serviceKind?: ServiceKind | null;
    serviceSlug?: string | null;
    agregar: boolean;
    actorLabel?: string | null;
  },
) {
  const { error } = await admin.rpc("set_promotion_rule", {
    p_slug: p.slug,
    p_lado: p.lado,
    p_service_kind: p.serviceKind ?? null,
    p_service_slug: p.serviceSlug ?? null,
    p_agregar: p.agregar,
    p_actor: p.actorLabel ?? null,
  });
  if (error) rethrow(error);
  return { slug: p.slug };
}

export async function setPromotionActive(
  admin: SupabaseAdminClient,
  p: { slug: string; active: boolean; actorLabel?: string | null },
) {
  const { error } = await admin.rpc("set_promotion_active", {
    p_slug: p.slug,
    p_active: p.active,
    p_actor: p.actorLabel ?? null,
  });
  if (error) rethrow(error);
  return { slug: p.slug, isActive: p.active };
}

export async function deletePromotion(
  admin: SupabaseAdminClient,
  p: { slug: string; actorLabel?: string | null },
) {
  const { error } = await admin.rpc("delete_promotion", {
    p_slug: p.slug,
    p_actor: p.actorLabel ?? null,
  });
  if (error) rethrow(error);
  return { slug: p.slug };
}

/* ------------------------------------------------------------------ */
/* Cómo se le cuenta a la pantalla lo que falló                        */
/* ------------------------------------------------------------------ */

/**
 * Las funciones de la base rechazan en castellano, no con códigos.
 *
 * Es a propósito: el mensaje lo escribe quien conoce la regla, y así no
 * hay una tabla de traducción que se desactualice. Lo que falta es
 * decidir con qué número sale, y eso depende de qué clase de rechazo es.
 *
 * Lo que NO se reconoce sale con 500 y el mensaje genérico. Un error de
 * PostgreSQL crudo —«duplicate key value violates unique constraint»— no
 * se le muestra a Sol: no le dice nada y expone la forma de la base.
 */
export function estadoDelRechazo(mensaje: string): {
  status: 400 | 404 | 409 | 500;
  message: string;
} {
  const limpio = mensaje.trim();

  if (/^No existe /i.test(limpio)) return { status: 404, message: limpio };

  // Un slug repetido no es un error de Sol: es que ya existe algo con ese
  // nombre corto, y el 409 es lo que la pantalla usa para ofrecer reusarlo.
  if (/duplicate key|unique constraint|ya existe/i.test(limpio)) {
    return { status: 409, message: "Ya existe algo con ese identificador." };
  }

  // Los mensajes propios empiezan con mayúscula y terminan en punto: es la
  // forma que tienen los `raise exception` de estas migraciones.
  if (/^[A-ZÁÉÍÓÚÑ¿«].*[.»?]$/u.test(limpio)) return { status: 400, message: limpio };

  return { status: 500, message: "No se pudo guardar. Probá de nuevo." };
}
