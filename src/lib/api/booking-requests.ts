import {z} from "zod";
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

/** Mirror canonical phone acceptance without importing a server module or
 * rewriting the user's payload. Keep parity covered by synthetic tests. */
export function isCanonicalCustomerPhone(raw: string): boolean {
  const value=raw.trim();
  if (!/^[+0-9(). -]+$/.test(value)) return false;
  let digits=value.replace(/\D/g, "");
  let normalized:string;
  if(value.startsWith('+')) normalized=digits;
  else if(digits.startsWith('00')) normalized=digits.slice(2);
  else if(digits.startsWith('54') && digits.length>=12) {
    const rest=digits.slice(2);
    normalized='54'+(rest.startsWith('9')?rest:'9'+rest);
  } else {
    let local=digits.replace(/^0/, '');
    local=local.replace(/^(\d{2,4})15(\d{6,8})$/, '$1$2');
    if(local.length<8 || local.length>12) return false;
    normalized='549'+local;
  }
  return /^[1-9][0-9]{6,14}$/.test(normalized);
}

export const bookingCustomerSchema = z.object({
  firstName:z.string().trim().min(1,"Ingresá el nombre.").max(80,"El nombre admite hasta 80 caracteres."),
  lastName:z.string().trim().max(80).optional(),
  phone:z.string().trim().min(6,"Revisá el teléfono.").max(30).refine(isCanonicalCustomerPhone,"Revisá el teléfono."),
  email:z.string().trim().email("Ingresá un email válido.").max(160),
  acceptsMarketing:z.literal(false).optional(),
}).strict();

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
  testAllergyScenario?: boolean;
}

export function hasCurrentConsent(acceptedVersion: string | null, currentVersion: string | null) {
  return Boolean(currentVersion && acceptedVersion === currentVersion);
}

export {submitBooking} from "@deployment/booking-policy";
