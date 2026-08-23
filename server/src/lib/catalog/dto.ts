/**
 * Catalog DTO contracts — the shape returned by /api/v1/catalog/*.
 *
 * Kept intentionally separate from the SQL row shape so the internal
 * schema can evolve (rename columns, split tables, add operational
 * fields) without breaking the frontend contract.
 *
 * Fields are chosen to match what the current mock exposes to the wizard
 * so a future block can drop mocks in favour of these DTOs without
 * rewriting the UI. Internal columns (deleted_at, created_at, is_public,
 * currency defaults, sort_order raw value) are NOT part of the contract.
 */

export interface CategoryDTO {
  slug: string;
  name: string;
  tagline: string | null;
  emoji: string | null;
}

export interface ServiceSummaryDTO {
  slug: string;
  categorySlug: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  priceAmount: number;
  currency: string;
  tag: string | null;
  /**
   * Cómo debe presentarse el precio: 'fixed' exacto, 'from' → "Desde $X",
   * 'subject_to_confirmation' → "Desde $X · sujeto a confirmación
   * profesional". Nunca presentar un modo no-fixed como precio cerrado.
   */
  priceDisplayMode: "fixed" | "from" | "subject_to_confirmation";
  /** Mínimo entre los tiers del servicio (el "Desde"). */
  priceFromAmount: number;
}

export interface ExtraDTO {
  /**
   * Código de negocio corto (equivalente al `id` que usa el wizard hoy:
   * "ampolla", "pestanas", "refuerzo"). Único DENTRO de una categoría.
   * Es lo que viaja en el draft, comparaciones y totales del frontend.
   */
  id: string;
  /**
   * Slug globalmente único ({category}-{code}). Útil para rutas o
   * referencias cross-categoría; NO es lo que el wizard usa como key.
   */
  slug: string;
  categorySlug: string;
  name: string;
  durationDeltaMinutes: number;
  priceAmount: number;
  currency: string;
}

export interface PersonalizationOptionDTO {
  slug: string;
  label: string;
  value: string;
  /** Deltas para ESTE servicio (0 si no aplica). Solo campos modifier. */
  durationDeltaMinutes: number;
  priceFixedAmount: number;
  pricePercentage: number;
}

export interface PersonalizationFieldDTO {
  slug: string;
  categorySlug: string;
  label: string;
  fieldType: "single_choice" | "multi_choice" | "text";
  isRequired: boolean;
  /**
   * tier_selector: elige la fila de service_price_tiers (el largo).
   * modifier: aplica deltas por opción. context: informativo, no cotiza.
   */
  fieldRole: "tier_selector" | "modifier" | "context";
  /** Decisión para el servicio consultado (detail); 'contextual' en listados. */
  decision: "operational" | "contextual" | "not_applicable";
  options: PersonalizationOptionDTO[];
}

export interface ServiceTierDTO {
  lengthTier: "corto" | "medio" | "largo" | "xl" | "unico";
  priceMain: number;
  durationMainMin: number;
  processMin: number;
  source: string;
  confidence: string;
}

export interface ServiceParametersDTO {
  priceDisplayMode: "fixed" | "from" | "subject_to_confirmation";
  lengthAffectsPrice: boolean;
  lengthAffectsDuration: boolean;
  requiresConsultation: boolean;
}

export interface ServiceDetailDTO extends ServiceSummaryDTO {
  extras: ExtraDTO[];
  personalization: PersonalizationFieldDTO[];
  tiers: ServiceTierDTO[];
  parameters: ServiceParametersDTO;
}
