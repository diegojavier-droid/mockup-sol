import { afterEach, describe, expect, spyOn, test } from "bun:test";
import {
  availabilityQueryOptions,
  hasCurrentConsent,
  pricingInput,
  quoteQueryOptions,
  submitBooking,
  type CreateBookingInput,
} from "./booking-requests";
import type { ApiPersonalizationField, ApiServiceDetail } from "./catalog-types";

function field(
  slug: string,
  overrides: Partial<ApiPersonalizationField> = {},
): ApiPersonalizationField {
  return {
    slug,
    categorySlug: "peluqueria",
    label: slug,
    fieldType: "single_choice",
    isRequired: false,
    fieldRole: "modifier",
    decision: "operational",
    options: [
      {
        slug: "opcion",
        label: "Opción",
        value: "Opción",
        durationDeltaMinutes: 10,
        priceFixedAmount: 100,
        pricePercentage: 0,
      },
    ],
    ...overrides,
  };
}
const detail = {
  slug: "corte-fem",
  personalization: [
    field("densidad"),
    field("alergias"),
    field("objetivo", { decision: "contextual" }),
    field("nota", { fieldType: "text" }),
    field("largo", { fieldRole: "tier_selector" }),
  ],
} as ApiServiceDetail;
const input = {
  serviceSlug: "corte-fem",
  lengthTier: "medio" as const,
  extraCodes: ["ampolla"],
  personalization: {
    densidad: "opcion",
    alergias: "si-importantes",
    objetivo: "opcion",
    nota: "dato privado",
    inventado: "dato privado",
    largo: "opcion",
  },
};
const booking: CreateBookingInput = {
  ...input,
  startsAt: "2030-11-12T12:00:00-03:00",
  termsVersion: "2026-09-08",
  acceptedTerms: true,
  customer: { firstName: "Prueba", phone: "+5493425550000", email: "prueba@example.test" },
  note: "Nota sintética de prueba",
};
let fetchSpy: ReturnType<typeof spyOn> | undefined;
afterEach(() => {
  fetchSpy?.mockRestore();
  fetchSpy = undefined;
});
function captureRequests() {
  const calls: { url: string; init: RequestInit }[] = [];
  fetchSpy = spyOn(globalThis, "fetch").mockImplementation((async (
    url: RequestInfo | URL,
    init?: RequestInit,
  ) => {
    calls.push({ url: String(url), init: init ?? {} });
    return new Response(JSON.stringify({ data: {} }), { status: 200 });
  }) as typeof fetch);
  return calls;
}

describe("minimización antes del consentimiento", () => {
  test("conserva sólo modificadores operativos conocidos, largo y extras", () => {
    expect(pricingInput(input, detail)).toEqual({
      serviceSlug: "corte-fem",
      lengthTier: "medio",
      extraCodes: ["ampolla"],
      personalization: { densidad: "opcion" },
    });
  });
  test("falla cerrado sin detalle, con otro servicio o con opciones desconocidas", () => {
    expect(pricingInput(input).personalization).toEqual({});
    expect(pricingInput(input, { ...detail, slug: "otro" }).personalization).toEqual({});
    expect(
      pricingInput({ ...input, personalization: { densidad: "dato libre" } }, detail)
        .personalization,
    ).toEqual({});
    expect(quoteQueryOptions(input).enabled).toBe(false);
    expect(availabilityQueryOptions(input).enabled).toBe(false);
  });
  test("alergias no entra aunque catálogo la marque operativa por error", () => {
    expect(pricingInput(input, detail).personalization).not.toHaveProperty("alergias");
  });
  test("quote y availability transmiten sólo cuerpos mínimos, nunca respuestas en URL", async () => {
    const calls = captureRequests();
    await quoteQueryOptions(input, detail).queryFn();
    await availabilityQueryOptions(input, detail).queryFn();
    expect(calls.map((call) => call.url)).toEqual(["/api/v1/quote", "/api/v1/availability"]);
    for (const call of calls) {
      expect(call.init.method).toBe("POST");
      const body = JSON.parse(String(call.init.body));
      expect(body.personalization).toEqual({ densidad: "opcion" });
      expect(String(call.init.body)).not.toContain("alergias");
      expect(String(call.init.body)).not.toContain("dato privado");
    }
    expect(JSON.parse(String(calls[1].init.body))).toEqual({
      service: "corte-fem",
      length: "medio",
      extras: "ampolla",
      personalization: { densidad: "opcion" },
      days: 21,
    });
  });
  test("la caché no contiene salud y cambiar alergias no dispara otra consulta", () => {
    const changed = { ...input, personalization: { ...input.personalization, alergias: "no" } };
    expect(quoteQueryOptions(input, detail).queryKey).toEqual(
      quoteQueryOptions(changed, detail).queryKey,
    );
    expect(availabilityQueryOptions(input, detail).queryKey).toEqual(
      availabilityQueryOptions(changed, detail).queryKey,
    );
    expect(JSON.stringify(quoteQueryOptions(input, detail).queryKey)).not.toContain("alergias");
  });
});

describe("consentimiento al enviar la reserva", () => {
  test("recarga, revocación y versión cambiada no son aceptación", () => {
    expect(hasCurrentConsent(null, "v1")).toBe(false);
    expect(hasCurrentConsent("v1", null)).toBe(false);
    expect(hasCurrentConsent("v1", "v2")).toBe(false);
    expect(hasCurrentConsent("", "")).toBe(false);
    expect(hasCurrentConsent("v1", "v1")).toBe(true);
  });
  test("sin aceptación explícita no hace ninguna solicitud de red", async () => {
    const calls = captureRequests();
    for (const acceptedTerms of [false, undefined, null, "true"]) {
      await expect(
        submitBooking({ ...booking, acceptedTerms } as CreateBookingInput),
      ).rejects.toThrow();
    }
    await expect(submitBooking({ ...booking, termsVersion: "" })).rejects.toThrow();
    expect(calls).toHaveLength(0);
  });
  test("aceptación preserva alergias, nota y datos completos en el cuerpo de reserva", async () => {
    const calls = captureRequests();
    await submitBooking(booking);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("/api/v1/bookings");
    const body = JSON.parse(String(calls[0].init.body));
    expect(body.personalization.alergias).toBe("si-importantes");
    expect(body.customer).toEqual(booking.customer);
    expect(body.note).toBe(booking.note);
    expect(body.consent).toEqual({ termsVersion: "2026-09-08" });
  });
});
