/**
 * Quote repository — arma el QuoteServiceData que consume el dominio.
 *
 * Lecturas vía cliente ANON (RLS): tiers y parámetros tienen políticas
 * públicas acotadas a servicios visibles; los settings expuestos están
 * whitelisteados por política. El cálculo en sí es del dominio puro.
 */

import type { SupabaseAnonServerClient } from "../supabase";
import type { CatalogRepository } from "../catalog/repository";
import type {
  LengthTier,
  QuoteExtraInput,
  QuoteServiceData,
  QuoteSettings,
} from "../../domain/types";

const SETTINGS_DEFAULTS: QuoteSettings = {
  depositRatePct: 20,
  defaultSetupMinutes: 12,
};

export async function loadQuoteSettings(client: SupabaseAnonServerClient): Promise<QuoteSettings> {
  const { data, error } = await client
    .from("business_settings")
    .select("key, value")
    .in("key", ["deposit_rate_pct", "default_setup_minutes"]);
  if (error) throw error;

  const byKey = new Map((data ?? []).map((r) => [r.key as string, r.value]));
  const num = (key: string, fallback: number) => {
    const raw = byKey.get(key);
    const n = typeof raw === "number" ? raw : Number(raw);
    return Number.isFinite(n) ? n : fallback;
  };
  return {
    depositRatePct: num("deposit_rate_pct", SETTINGS_DEFAULTS.depositRatePct),
    defaultSetupMinutes: num("default_setup_minutes", SETTINGS_DEFAULTS.defaultSetupMinutes),
  };
}

export interface LoadedQuoteContext {
  service: QuoteServiceData;
  extras: QuoteExtraInput[];
  settings: QuoteSettings;
  areaSlug: string;
}

export async function loadQuoteContext(
  client: SupabaseAnonServerClient,
  catalog: CatalogRepository,
  params: { serviceSlug: string; extraCodes: string[] },
): Promise<LoadedQuoteContext | null> {
  const detail = await catalog.getServiceDetail(params.serviceSlug);
  if (!detail) return null;

  const { data: paramRow, error: paramError } = await client
    .from("service_parameters")
    .select("setup_minutes_override, services!inner(slug)")
    .eq("services.slug", params.serviceSlug)
    .maybeSingle();
  if (paramError) throw paramError;

  const settings = await loadQuoteSettings(client);

  const service: QuoteServiceData = {
    slug: detail.slug,
    name: detail.name,
    categorySlug: detail.categorySlug,
    tiers: detail.tiers.map((t) => ({
      lengthTier: t.lengthTier as LengthTier,
      priceMain: t.priceMain,
      priceAddon: null,
      durationMainMin: t.durationMainMin,
      durationAddonMin: null,
      processMin: t.processMin,
      source: t.source,
      confidence: t.confidence,
    })),
    parameters: {
      priceDisplayMode: detail.parameters.priceDisplayMode,
      lengthAffectsPrice: detail.parameters.lengthAffectsPrice,
      lengthAffectsDuration: detail.parameters.lengthAffectsDuration,
      setupMinutesOverride:
        (paramRow as { setup_minutes_override: number | null } | null)?.setup_minutes_override ??
        null,
      requiresConsultation: detail.parameters.requiresConsultation,
    },
    fields: detail.personalization.map((f) => ({
      slug: f.slug,
      label: f.label,
      fieldRole: f.fieldRole,
      decision: f.decision,
      options: f.options.map((o) => ({
        slug: o.slug,
        label: o.label,
        durationDeltaMinutes: o.durationDeltaMinutes,
        priceFixedAmount: o.priceFixedAmount,
        pricePercentage: o.pricePercentage,
      })),
    })),
  };

  const wanted = new Set(params.extraCodes);
  const extras: QuoteExtraInput[] = detail.extras
    .filter((e) => wanted.has(e.id))
    .map((e) => ({
      code: e.id,
      name: e.name,
      priceAmount: e.priceAmount,
      durationDeltaMinutes: e.durationDeltaMinutes,
    }));

  return { service, extras, settings, areaSlug: detail.categorySlug };
}
