/**
 * Catalog repository — server-only reads from the public catalog.
 *
 * Uses the ANON client (RLS enforced). The public read policies on
 * categories / services / extras / personalization_fields /
 * personalization_options already restrict rows to
 *   is_public AND is_active AND deleted_at IS NULL.
 * We defensively repeat the same filters at query time so a misconfigured
 * policy cannot leak internal rows.
 *
 * We deliberately do NOT use the service role for public reads: RLS is
 * the enforcement boundary and the anon path is the one exercised by
 * the eventual frontend client.
 */

import type { SupabaseAnonServerClient } from "../supabase";
import type {
  CategoryDTO,
  ExtraDTO,
  PersonalizationFieldDTO,
  PersonalizationOptionDTO,
  ServiceDetailDTO,
  ServiceSummaryDTO,
} from "./dto";

type CategoryRow = {
  slug: string;
  name: string;
  tagline: string | null;
  emoji: string | null;
};

type ServiceRow = {
  slug: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price_amount: number;
  currency: string;
  tag: string | null;
  categories: { slug: string } | null;
};

type ExtraRow = {
  code: string;
  slug: string;
  name: string;
  duration_delta_minutes: number;
  price_amount: number;
  currency: string;
  categories: { slug: string } | null;
};


type OptionRow = {
  slug: string;
  label: string;
  value: string;
  sort_order: number;
};

type FieldRow = {
  slug: string;
  label: string;
  field_type: "single_choice" | "multi_choice" | "text";
  is_required: boolean;
  sort_order: number;
  categories: { slug: string } | null;
  personalization_options: OptionRow[] | null;
};

function toCategoryDTO(row: CategoryRow): CategoryDTO {
  return {
    slug: row.slug,
    name: row.name,
    tagline: row.tagline,
    emoji: row.emoji,
  };
}

function toServiceDTO(row: ServiceRow): ServiceSummaryDTO {
  return {
    slug: row.slug,
    categorySlug: row.categories?.slug ?? "",
    name: row.name,
    description: row.description,
    durationMinutes: row.duration_minutes,
    priceAmount: row.price_amount,
    currency: row.currency,
    tag: row.tag,
  };
}

function toExtraDTO(row: ExtraRow): ExtraDTO {
  return {
    id: row.code,
    slug: row.slug,
    categorySlug: row.categories?.slug ?? "",
    name: row.name,
    durationDeltaMinutes: row.duration_delta_minutes,
    priceAmount: row.price_amount,
    currency: row.currency,
  };
}


function toFieldDTO(row: FieldRow): PersonalizationFieldDTO {
  const options: PersonalizationOptionDTO[] = (row.personalization_options ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((o) => ({ slug: o.slug, label: o.label, value: o.value }));
  return {
    slug: row.slug,
    categorySlug: row.categories?.slug ?? "",
    label: row.label,
    fieldType: row.field_type,
    isRequired: row.is_required,
    options,
  };
}

export interface CatalogRepository {
  listCategories(): Promise<CategoryDTO[]>;
  listServices(params?: { categorySlug?: string }): Promise<ServiceSummaryDTO[]>;
  listExtras(params?: { categorySlug?: string }): Promise<ExtraDTO[]>;
  listPersonalizationFields(
    params?: { categorySlug?: string },
  ): Promise<PersonalizationFieldDTO[]>;
  getServiceDetail(slug: string): Promise<ServiceDetailDTO | null>;
}

export function createCatalogRepository(
  client: SupabaseAnonServerClient,
): CatalogRepository {
  return {
    async listCategories() {
      const { data, error } = await client
        .from("categories")
        .select("slug, name, tagline, emoji, sort_order")
        .eq("is_public", true)
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []).map(toCategoryDTO);
    },

    async listServices({ categorySlug } = {}) {
      let q = client
        .from("services")
        .select(
          "slug, name, description, duration_minutes, price_amount, currency, tag, sort_order, categories!inner(slug)",
        )
        .eq("is_public", true)
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("sort_order", { ascending: true });
      if (categorySlug) q = q.eq("categories.slug", categorySlug);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((r) => toServiceDTO(r as unknown as ServiceRow));
    },

    async listExtras({ categorySlug } = {}) {
      let q = client
        .from("extras")
        .select(
          "code, slug, name, duration_delta_minutes, price_amount, currency, sort_order, categories!inner(slug)",
        )
        .eq("is_public", true)
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("sort_order", { ascending: true });
      if (categorySlug) q = q.eq("categories.slug", categorySlug);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((r) => toExtraDTO(r as unknown as ExtraRow));
    },


    async listPersonalizationFields({ categorySlug } = {}) {
      let q = client
        .from("personalization_fields")
        .select(
          "slug, label, field_type, is_required, sort_order, categories!inner(slug), personalization_options(slug, label, value, sort_order)",
        )
        .eq("is_public", true)
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("sort_order", { ascending: true });
      if (categorySlug) q = q.eq("categories.slug", categorySlug);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((r) => toFieldDTO(r as unknown as FieldRow));
    },

    async getServiceDetail(slug) {
      const { data, error } = await client
        .from("services")
        .select(
          "slug, name, description, duration_minutes, price_amount, currency, tag, sort_order, categories!inner(slug)",
        )
        .eq("is_public", true)
        .eq("is_active", true)
        .is("deleted_at", null)
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;

      const svc = toServiceDTO(data as unknown as ServiceRow);
      const [extras, personalization] = await Promise.all([
        this.listExtras({ categorySlug: svc.categorySlug }),
        this.listPersonalizationFields({ categorySlug: svc.categorySlug }),
      ]);
      return { ...svc, extras, personalization };
    },
  };
}
