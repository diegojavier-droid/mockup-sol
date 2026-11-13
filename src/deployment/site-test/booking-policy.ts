import {api,ApiError} from "@/lib/api/client";
import {pricingInput,bookingCustomerSchema,type CreateBookingInput} from "@/lib/api/booking-requests";
import type {ApiCreatedBooking,ApiServiceDetail} from "@/lib/api/catalog-types";
export const expectedTermsVersion = "2026-11-12-site";
export const isSiteTest: boolean = true;
export const persistBookingDraft: boolean = false;
export const allowRealPayments: boolean = false;
// In-memory only: a retry after a lost response reuses the same intent key.
const trialIntents = new Map<string, { key: string; pending?: Promise<ApiCreatedBooking> }>();

export async function submitBooking(input: CreateBookingInput) {
  if (input.acceptedTerms !== true || input.termsVersion !== expectedTermsVersion) {
    throw new Error("Marcá la casilla para continuar.");
  }
  if (!input.serviceSlug || !Number.isFinite(Date.parse(input.startsAt))) {
    throw new Error("Elegí un servicio y un horario.");
  }
  if (input.note !== undefined && (typeof input.note !== "string" || input.note.length > 500)) {
    throw new Error("El comentario para Sol admite hasta 500 caracteres.");
  }
  const customerResult = bookingCustomerSchema.safeParse(input.customer);
  if (!customerResult.success) throw new Error(customerResult.error.issues[0].message);
  const customer = {...customerResult.data,acceptsMarketing:false as const};
  const note = input.note?.trim();
  const detail = await api.get<ApiServiceDetail>(`/catalog/services/${encodeURIComponent(input.serviceSlug)}`);
  const safe = pricingInput(input, detail);
  const allergy = input.testAllergyScenario === true ? input.personalization?.alergias : undefined;
  const allergyField = detail.personalization.find(field => field.slug === "alergias" && field.fieldRole === "context" && field.fieldType === "single_choice");
  if (allergy !== undefined && (!["no", "si-leves", "si-importantes"].includes(allergy) || !allergyField?.options.some(option => option.slug === allergy))) {
    throw new Error("Elegí uno de los escenarios ficticios de alergias disponibles.");
  }
  const body = { ...safe, extraCodes: [...safe.extraCodes].sort(),
    personalization: Object.fromEntries(Object.entries({...safe.personalization, ...(allergy ? {alergias:allergy} : {})}).sort(([a], [b]) => a.localeCompare(b))),
    ...(allergy ? {testAllergyScenario:true as const} : {}),
    ...(note ? {note, testCommentScenario:true as const} : {}),
    startsAt: new Date(input.startsAt).toISOString(),
    customer,
    testCustomerScenario:true as const,
    consent: { termsVersion: input.termsVersion } };
  // Keep free-form/context values out of intent-cache keys. The request body
  // remains unchanged; only its digest indexes in-memory retry metadata.
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(body)));
  const signature = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
  const intent = trialIntents.get(signature) ?? { key: crypto.randomUUID() };
  trialIntents.set(signature, intent);
  if (!intent.pending) {
    intent.pending = api.post<ApiCreatedBooking>("/bookings", body, { "X-Idempotency-Key": intent.key })
      .catch((error) => {
        intent.pending = undefined;
        if (error instanceof ApiError && error.status >= 400 && error.status < 500 && ![408, 425, 429].includes(error.status)) trialIntents.delete(signature);
        throw error;
      });
  }
  return intent.pending;
}
