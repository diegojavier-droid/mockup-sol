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
}

export interface PersonalizationFieldDTO {
  slug: string;
  categorySlug: string;
  label: string;
  fieldType: "single_choice" | "multi_choice" | "text";
  isRequired: boolean;
  options: PersonalizationOptionDTO[];
}

export interface ServiceDetailDTO extends ServiceSummaryDTO {
  extras: ExtraDTO[];
  personalization: PersonalizationFieldDTO[];
}
