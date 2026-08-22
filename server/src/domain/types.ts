/**
 * Tipos del dominio de reservas — Blueprint V3.
 *
 * Cuatro tiempos (D18):
 *   M = durationShownMin  → lo que ve la clienta (se almacena)
 *   B = processMin        → actuación/exposición (se almacena)
 *   A = M − B             → trabajo activo (SIEMPRE derivado, nunca almacenado)
 *   C = M + setup         → ventana que bloquea agenda
 */

export type LengthTier = "corto" | "medio" | "largo" | "xl" | "unico";

export type PriceDisplayMode = "fixed" | "from" | "subject_to_confirmation";

export type FieldRole = "tier_selector" | "modifier" | "context";

export interface ServiceTier {
  lengthTier: LengthTier;
  priceMain: number;
  priceAddon: number | null;
  durationMainMin: number;
  durationAddonMin: number | null;
  processMin: number;
  source: string;
  confidence: string;
}

export interface ServiceQuoteParameters {
  priceDisplayMode: PriceDisplayMode;
  lengthAffectsPrice: boolean;
  lengthAffectsDuration: boolean;
  setupMinutesOverride: number | null;
  requiresConsultation: boolean;
}

export interface ModifierOption {
  slug: string;
  label: string;
  durationDeltaMinutes: number;
  priceFixedAmount: number;
  pricePercentage: number;
}

export interface QuoteField {
  slug: string;
  label: string;
  fieldRole: FieldRole;
  decision: "operational" | "contextual" | "not_applicable";
  options: ModifierOption[];
}

export interface QuoteExtraInput {
  code: string;
  name: string;
  priceAmount: number;
  durationDeltaMinutes: number;
}

export interface QuoteServiceData {
  slug: string;
  name: string;
  categorySlug: string;
  tiers: ServiceTier[];
  parameters: ServiceQuoteParameters;
  fields: QuoteField[];
}

export interface QuoteSettings {
  depositRatePct: number;
  defaultSetupMinutes: number;
}

export interface QuoteInput {
  service: QuoteServiceData;
  lengthTier?: LengthTier | null;
  /** fieldSlug → optionSlug (solo campos modifier aportan al cálculo) */
  personalization?: Record<string, string>;
  extras?: QuoteExtraInput[];
  settings: QuoteSettings;
}

export interface QuoteItem {
  role: "main" | "extra";
  slug: string;
  name: string;
  priceAmount: number;
  lengthTier: LengthTier | null;
  durationMin: number;
  processMin: number;
  setupMin: number;
}

export interface QuoteResult {
  items: QuoteItem[];
  priceDisplayMode: PriceDisplayMode;
  /** true salvo modo 'fixed': el número es orientativo */
  isEstimate: boolean;
  estimatedMinAmount: number;
  /** null: la incertidumbre se comunica por modo, no por rango inventado */
  estimatedMaxAmount: number | null;
  durationShownMin: number; // M
  processMin: number; // B
  setupMin: number; // interno, jamás mostrado a la clienta
  blockingMin: number; // C = M + setup
  depositRatePct: number;
  /** Único número FIRME de la cotización (D4): rate × mínimo estimado */
  depositAmount: number;
  remainingAmount: number;
  requiresConsultation: boolean;
  appliedModifiers: {
    fieldSlug: string;
    optionSlug: string;
    priceDelta: number;
    durationDelta: number;
  }[];
}

export type QuoteErrorCode =
  | "length_required"
  | "tier_not_found"
  | "unknown_option"
  | "service_not_quotable";

export class QuoteError extends Error {
  constructor(
    public code: QuoteErrorCode,
    detail?: string,
  ) {
    super(detail ? `${code}: ${detail}` : code);
    this.name = "QuoteError";
  }
}
