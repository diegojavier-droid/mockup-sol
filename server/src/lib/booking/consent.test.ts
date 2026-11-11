import { describe, expect, test } from "bun:test";
import {
  BookingError,
  createBooking,
  createOnlineBooking,
  type CreateBookingParams,
} from "./repository";
import type { SupabaseAdminClient } from "../supabase";

const details = {
  areaSlug: "peluqueria",
  startsAt: new Date("2099-11-11T12:00:00Z"),
  endsAt: new Date("2099-11-11T12:30:00Z"),
  shownDurationMin: 30,
  priceDisplayMode: "fixed",
  priceEstimatedMin: 1000,
  priceEstimatedMax: null,
  depositRate: 20,
  depositAmount: 200,
  customer: { first_name: "CI", phone_e164: "+5493429990000", email: "ci@example.test" },
  items: [
    {
      service_slug: "corte-fem",
      role: "main" as const,
      name: "CI",
      price_amount: 1000,
      length_tier: "medio",
      duration_min: 30,
      process_min: 0,
      setup_min: 0,
      personalization: { alergias: "si-leves" },
    },
  ],
  customerNote: "Synthetic note",
};
function client(error: { message: string } | null = null) {
  const calls: { name: string; params: Record<string, unknown> }[] = [];
  const created = {
    id: "ci-booking",
    public_token: "ci-public",
    status: "pending_payment",
    source: "online" as const,
    deposit_status: "pending",
    starts_at: details.startsAt.toISOString(),
    ends_at: details.endsAt.toISOString(),
    payment_required_until: "2099-11-11T11:10:00Z",
    deposit_amount: 200,
    created_via_override: false,
  };
  const admin = {
    rpc: async (name: string, params: Record<string, unknown>) => {
      calls.push({ name, params });
      return { data: error ? null : created, error };
    },
  } as unknown as SupabaseAdminClient;
  return { admin, calls, created };
}

describe("RPC transaccional de reserva y consentimiento", () => {
  test("alta web usa una única llamada con versión, contexto y datos originales", async () => {
    const { admin, calls, created } = client();
    expect(await createOnlineBooking(admin, { ...details, termsVersion: "ci-version" })).toEqual(
      created,
    );
    expect(calls).toHaveLength(1);
    expect(calls[0].name).toBe("create_online_booking");
    expect(calls[0].params.p_terms_version).toBe("ci-version");
    expect(calls[0].params.p_items).toEqual(details.items);
    expect(calls[0].params.p_customer).toEqual(details.customer);
    expect(calls[0].params.p_customer_note).toBe(details.customerNote);
    expect(calls[0].params).not.toHaveProperty("p_override");
    expect(calls[0].params).not.toHaveProperty("p_source");
  });
  test("una falla de consentimiento no devuelve éxito ni intenta la RPC antigua", async () => {
    const { admin, calls } = client({ message: "booking_consent_not_recorded" });
    await expect(
      createOnlineBooking(admin, { ...details, termsVersion: "ci-version" }),
    ).rejects.toThrow("booking_consent_not_recorded");
    expect(calls.map((c) => c.name)).toEqual(["create_online_booking"]);
  });
  test("se conservan los errores de negocio del motor existente", async () => {
    const { admin } = client({ message: "capacity_full" });
    await expect(
      createOnlineBooking(admin, { ...details, termsVersion: "ci-version" }),
    ).rejects.toBeInstanceOf(BookingError);
  });
  test("no hay I/O sin versión de aceptación válida", async () => {
    const { admin, calls } = client();
    for (const termsVersion of ["", "   ", "x".repeat(33)]) {
      await expect(createOnlineBooking(admin, { ...details, termsVersion })).rejects.toThrow(
        "booking_consent_required",
      );
    }
    expect(calls).toHaveLength(0);
  });
  test("canales internos conservan RPC y no fabrican consentimiento", async () => {
    for (const source of ["manual", "phone", "whatsapp", "walk_in"] as const) {
      const { admin, calls } = client();
      await createBooking(admin, { ...details, source, override: true, overrideReason: "CI" });
      expect(calls).toHaveLength(1);
      expect(calls[0].name).toBe("create_booking");
      expect(calls[0].params.p_source).toBe(source);
      expect(calls[0].params.p_override).toBe(true);
      expect(calls[0].params).not.toHaveProperty("p_terms_version");
    }
  });
  test("la función interna no admite online ni siquiera con un cast", async () => {
    const { admin, calls } = client();
    const invalid = { ...details, source: "online" } as CreateBookingParams;
    await expect(
      createBooking(admin, invalid as Parameters<typeof createBooking>[1]),
    ).rejects.toThrow("online_requires_consent");
    expect(calls).toHaveLength(0);
  });
});
