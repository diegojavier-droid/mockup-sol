/**
 * Contratos que devuelve /api/v1 (espejo de server/src/lib/catalog/dto.ts).
 *
 * Se declaran acá y no se importan de server/ porque src/ no puede
 * depender de server/ (guard de CI): el Worker entrypoint es la única
 * excepción y no comparte bundle con el navegador.
 */

export type LengthTier = "corto" | "medio" | "largo" | "xl" | "unico";
export type PriceDisplayMode = "fixed" | "from" | "subject_to_confirmation";
export type FieldRole = "tier_selector" | "modifier" | "context";
export type FieldDecision = "operational" | "contextual" | "not_applicable";

export interface ApiCategory {
  slug: string;
  name: string;
  tagline: string | null;
  emoji: string | null;
}

export interface ApiService {
  slug: string;
  categorySlug: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  priceAmount: number;
  currency: string;
  tag: string | null;
  priceDisplayMode: PriceDisplayMode;
  priceFromAmount: number;
}

export interface ApiExtra {
  id: string;
  slug: string;
  categorySlug: string;
  name: string;
  durationDeltaMinutes: number;
  priceAmount: number;
  currency: string;
}

export interface ApiPersonalizationOption {
  slug: string;
  label: string;
  value: string;
  durationDeltaMinutes: number;
  priceFixedAmount: number;
  pricePercentage: number;
}

export interface ApiPersonalizationField {
  slug: string;
  categorySlug: string;
  label: string;
  fieldType: "single_choice" | "multi_choice" | "text";
  isRequired: boolean;
  fieldRole: FieldRole;
  decision: FieldDecision;
  options: ApiPersonalizationOption[];
}

export interface ApiServiceTier {
  lengthTier: LengthTier;
  priceMain: number;
  durationMainMin: number;
  processMin: number;
  source: string;
  confidence: string;
}

export interface ApiServiceDetail extends ApiService {
  extras: ApiExtra[];
  personalization: ApiPersonalizationField[];
  tiers: ApiServiceTier[];
  parameters: {
    priceDisplayMode: PriceDisplayMode;
    lengthAffectsPrice: boolean;
    lengthAffectsDuration: boolean;
    requiresConsultation: boolean;
  };
}

export interface ApiQuoteItem {
  role: "main" | "extra";
  slug: string;
  name: string;
  priceAmount: number;
  lengthTier: LengthTier | null;
  durationMin: number;
}

export interface ApiQuote {
  items: ApiQuoteItem[];
  priceDisplayMode: PriceDisplayMode;
  isEstimate: boolean;
  estimatedMinAmount: number;
  estimatedMaxAmount: number | null;
  durationShownMin: number;
  depositRatePct: number;
  depositAmount: number;
  remainingAmount: number;
  requiresConsultation: boolean;
}

export interface ApiAvailability {
  bookableOnline: boolean;
  days: { date: string; times: string[] }[];
}

export interface ApiCreatedBooking {
  publicToken: string;
  status: string;
  startsAt: string;
  paymentRequiredUntil: string | null;
  depositAmount: number;
  estimatedAmount: number;
  remainingAmount: number;
  priceDisplayMode: PriceDisplayMode;
  isEstimate: boolean;
  durationShownMin: number;
}

export interface ApiBookingView {
  publicToken: string;
  status: string;
  startsAt: string;
  endsAt: string;
  shownDurationMin: number;
  priceDisplayMode: PriceDisplayMode;
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
