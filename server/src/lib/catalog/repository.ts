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
  ServiceParametersDTO,
  ServiceSummaryDTO,
  ServiceTierDTO,
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
  service_parameters: { price_display_mode: string } | null;
  service_price_tiers: { price_main: number }[] | null;
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
  field_role: "tier_selector" | "modifier" | "context";
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
  const tierPrices = (row.service_price_tiers ?? []).map((t) => t.price_main);
  const priceFromAmount = tierPrices.length ? Math.min(...tierPrices) : row.price_amount;
  const mode = row.service_parameters?.price_display_mode;
  return {
    slug: row.slug,
    categorySlug: row.categories?.slug ?? "",
    name: row.name,
    description: row.description,
    durationMinutes: row.duration_minutes,
    priceAmount: row.price_amount,
    currency: row.currency,
    tag: row.tag,
    priceDisplayMode: mode === "fixed" || mode === "subject_to_confirmation" ? mode : "from",
    priceFromAmount,
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
    .map((o) => ({
      slug: o.slug,
      label: o.label,
      value: o.value,
      durationDeltaMinutes: 0,
      priceFixedAmount: 0,
      pricePercentage: 0,
    }));
  return {
    slug: row.slug,
    categorySlug: row.categories?.slug ?? "",
    label: row.label,
    fieldType: row.field_type,
    isRequired: row.is_required,
    fieldRole: row.field_role,
    decision: "contextual",
    options,
  };
}

export interface CatalogRepository {
  listCategories(): Promise<CategoryDTO[]>;
  listServices(params?: { categorySlug?: string }): Promise<ServiceSummaryDTO[]>;
  listExtras(params?: { categorySlug?: string }): Promise<ExtraDTO[]>;
  listPersonalizationFields(params?: { categorySlug?: string }): Promise<PersonalizationFieldDTO[]>;
  getServiceDetail(slug: string): Promise<ServiceDetailDTO | null>;
}

export function createCatalogRepository(client: SupabaseAnonServerClient): CatalogRepository {
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
          "slug, name, description, duration_minutes, price_amount, currency, tag, sort_order, categories!inner(slug), service_parameters(price_display_mode), service_price_tiers(price_main)",
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
          "slug, label, field_type, is_required, sort_order, field_role, categories!inner(slug), personalization_options!personalization_options_field_id_fkey(slug, label, value, sort_order)",
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
          "id, slug, name, description, duration_minutes, price_amount, currency, tag, sort_order, categories!inner(slug), service_parameters(price_display_mode, length_affects_price, length_affects_duration, requires_consultation), service_price_tiers(length_tier, price_main, duration_main_min, process_min, source, confidence)",
        )
        .eq("is_public", true)
        .eq("is_active", true)
        .is("deleted_at", null)
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;

      const row = data as unknown as Omit<
        ServiceRow,
        "service_parameters" | "service_price_tiers"
      > & {
        id: string;
        service_parameters: {
          price_display_mode: string;
          length_affects_price: boolean;
          length_affects_duration: boolean;
          requires_consultation: boolean;
        } | null;
        service_price_tiers:
          | {
              length_tier: ServiceTierDTO["lengthTier"];
              price_main: number;
              duration_main_min: number;
              process_min: number;
              source: string;
              confidence: string;
            }[]
          | null;
      };
      const svc = toServiceDTO(row);

      const [extras, personalization, rulesRes, modifiersRes] = await Promise.all([
        this.listExtras({ categorySlug: svc.categorySlug }),
        this.listPersonalizationFields({ categorySlug: svc.categorySlug }),
        client
          .from("service_personalization_rules")
          .select(
            "decision, personalization_fields!service_personalization_rules_field_id_fkey!inner(slug)",
          )
          .eq("service_id", row.id),
        client
          .from("service_personalization_option_modifiers")
          .select(
            "duration_delta_minutes, price_fixed_amount, price_percentage, personalization_fields!service_personalization_option_modifiers_field_id_fkey(slug), personalization_options!spom_field_option_fk(slug)",
          )
          .eq("service_id", row.id),
      ]);
      if (rulesRes.error) throw rulesRes.error;
      if (modifiersRes.error) throw modifiersRes.error;

      const decisionByField = new Map<string, PersonalizationFieldDTO["decision"]>();
      for (const r of (rulesRes.data ?? []) as unknown as {
        decision: PersonalizationFieldDTO["decision"];
        personalization_fields: { slug: string } | null;
      }[]) {
        if (r.personalization_fields?.slug) {
          decisionByField.set(r.personalization_fields.slug, r.decision);
        }
      }

      const modifierByFieldOption = new Map<
        string,
        { durationDeltaMinutes: number; priceFixedAmount: number; pricePercentage: number }
      >();
      for (const m of (modifiersRes.data ?? []) as unknown as {
        duration_delta_minutes: number;
        price_fixed_amount: number;
        price_percentage: number;
        personalization_fields: { slug: string } | null;
        personalization_options: { slug: string } | null;
      }[]) {
        const f = m.personalization_fields?.slug;
        const o = m.personalization_options?.slug;
        if (f && o) {
          modifierByFieldOption.set(`${f}:${o}`, {
            durationDeltaMinutes: m.duration_delta_minutes,
            priceFixedAmount: m.price_fixed_amount,
            pricePercentage: Number(m.price_percentage),
          });
        }
      }

      const fields = personalization.map((f) => ({
        ...f,
        decision: decisionByField.get(f.slug) ?? "contextual",
        options: f.options.map((o) => ({
          ...o,
          ...(modifierByFieldOption.get(`${f.slug}:${o.slug}`) ?? {}),
        })),
      }));

      const tiers: ServiceTierDTO[] = (row.service_price_tiers ?? []).map((t) => ({
        lengthTier: t.length_tier,
        priceMain: t.price_main,
        durationMainMin: t.duration_main_min,
        processMin: t.process_min,
        source: t.source,
        confidence: t.confidence,
      }));

      const parameters: ServiceParametersDTO = row.service_parameters
        ? {
            priceDisplayMode: svc.priceDisplayMode,
            lengthAffectsPrice: row.service_parameters.length_affects_price,
            lengthAffectsDuration: row.service_parameters.length_affects_duration,
            requiresConsultation: row.service_parameters.requires_consultation,
          }
        : {
            priceDisplayMode: "from",
            lengthAffectsPrice: false,
            lengthAffectsDuration: false,
            requiresConsultation: false,
          };

      return { ...svc, extras, personalization: fields, tiers, parameters };
    },
  };
}
