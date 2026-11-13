import {api,ApiError} from "@/lib/api/client";
import {pricingInput,bookingCustomerSchema,type CreateBookingInput} from "@/lib/api/booking-requests";
import type {ApiCreatedBooking,ApiServiceDetail} from "@/lib/api/catalog-types";
export const expectedTermsVersion = "2026-09-08";
export const isSiteTest: boolean = false;
export const persistBookingDraft: boolean = true;
export const allowRealPayments: boolean = true;
export async function submitBooking(input: CreateBookingInput) {
  // Guard en el último límite antes de fetch, además del botón del wizard.
  // Un borrador restaurado o una llamada repetida no inventa aceptación.
  if (input.acceptedTerms !== true || input.termsVersion !== expectedTermsVersion) {
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
