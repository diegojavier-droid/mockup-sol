/**
 * Cómo se presenta un precio a la clienta.
 *
 * El backend decide el modo por servicio; el frontend sólo lo respeta.
 * Nunca se muestra un precio abierto como cerrado ni al revés: decir
 * "Desde $12.000" cuando la depilación de cejas siempre sale $12.000
 * genera una duda que no existe (§23 mínima sorpresa).
 */

import type { PriceDisplayMode } from "@/lib/api/catalog-types";

export function formatServicePrice(price: string, mode: PriceDisplayMode | undefined): string {
  return mode === "fixed" ? price : `Desde ${price}`;
}

/** Aclaración adicional sólo cuando el trabajo depende del diagnóstico. */
export function priceQualifier(mode: PriceDisplayMode | undefined): string | null {
  if (mode === "subject_to_confirmation") return "Estimación sujeta a confirmación profesional";
  return null;
}
