import { api } from "./client";
import type {
  ApiAvailability,
  ApiCreatedBooking,
  ApiQuote,
  ApiServiceDetail,
  LengthTier,
} from "./catalog-types";

export interface QuoteInput {
  serviceSlug: string | null;
  lengthTier?: LengthTier | null;
  personalization?: Record<string, string>;
  extraCodes?: string[];
}

/** Sólo las opciones que el motor usa para cotizar salen antes de reservar.
 * El listado por categoría no sirve: sus decisiones son siempre contextual.
 * Esperamos el detalle del servicio y fallamos cerrado mientras carga.
 */
export function pricingInput(input: QuoteInput, detail?: ApiServiceDetail) {
  const personalization: Record<string, string> = {};
  if (detail?.slug === input.serviceSlug) {
    for (const field of detail.personalization) {
      if (
        field.slug === "alergias" ||
        field.fieldRole !== "modifier" ||
        field.decision !== "operational" ||
        field.fieldType === "text"
      )
        continue;
      const option = input.personalization?.[field.slug];
      if (option && field.options.some((candidate) => candidate.slug === option)) {
        personalization[field.slug] = option;
      }
    }
  }
  return {
    serviceSlug: input.serviceSlug,
    lengthTier: input.lengthTier ?? null,
    personalization,
    extraCodes: input.extraCodes ?? [],
  };
}

export function quoteQueryOptions(input: QuoteInput, detail?: ApiServiceDetail) {
  const body = pricingInput(input, detail);
  return {
    queryKey: ["quote", body],
    queryFn: () => api.post<ApiQuote>("/quote", body),
    enabled: Boolean(input.serviceSlug && detail?.slug === input.serviceSlug),
    retry: false as const,
    staleTime: 60_000,
  };
}

export const AVAILABILITY_WINDOW_DAYS = 21;

export function availabilityQueryOptions(
  input: QuoteInput & { days?: number },
  detail?: ApiServiceDetail,
) {
  const safe = pricingInput(input, detail);
  const body = {
    service: safe.serviceSlug,
    ...(safe.lengthTier ? { length: safe.lengthTier } : {}),
    ...(safe.extraCodes.length ? { extras: safe.extraCodes.join(",") } : {}),
    personalization: safe.personalization,
    days: input.days ?? AVAILABILITY_WINDOW_DAYS,
  };
  return {
    queryKey: ["availability", body],
    // Ninguna respuesta del formulario se coloca en una URL.
    queryFn: () => api.post<ApiAvailability>("/availability", body),
    enabled: Boolean(input.serviceSlug && detail?.slug === input.serviceSlug),
    retry: false as const,
    staleTime: 30_000,
  };
}

export interface CreateBookingInput extends QuoteInput {
  startsAt: string;
  customer: {
    firstName: string;
    lastName?: string;
    phone: string;
    email: string;
    acceptsMarketing?: boolean;
  };
  note?: string;
  termsVersion: string;
  acceptedTerms: boolean;
}

export function hasCurrentConsent(acceptedVersion: string | null, currentVersion: string | null) {
  return Boolean(currentVersion && acceptedVersion === currentVersion);
}

export async function submitBooking(input: CreateBookingInput) {
  // Guard en el último límite antes de fetch, además del botón del wizard.
  // Un borrador restaurado o una llamada repetida no inventa aceptación.
  if (input.acceptedTerms !== true || !input.termsVersion) {
    throw new Error("Necesitamos que lo aceptes para poder guardar tu turno.");
  }
  return api.post<ApiCreatedBooking>("/bookings", {
    serviceSlug: input.serviceSlug,
    lengthTier: input.lengthTier ?? null,
    personalization: input.personalization ?? {},
    extraCodes: input.extraCodes ?? [],
    startsAt: input.startsAt,
    customer: input.customer,
    note: input.note,
    consent: { termsVersion: input.termsVersion },
  });
}
