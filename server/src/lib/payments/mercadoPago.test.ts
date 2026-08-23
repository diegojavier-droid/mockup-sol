import { describe, expect, test } from "bun:test";
import { createMercadoPagoProvider } from "./mercadoPago";
import { PaymentsNotConfiguredError, type PaymentLookup } from "./provider";

const env = (over: Record<string, unknown> = {}) =>
  ({
    APP_ENV: "local",
    API_BASE_URL: "http://localhost:3001",
    PUBLIC_WEB_BASE_URL: "http://localhost:5173",
    SUPABASE_URL: "http://localhost",
    SUPABASE_PUBLISHABLE_KEY: "k",
    INTERNAL_AUTH_JWT_AUDIENCE: "a",
    INTERNAL_AUTH_ALLOWED_EMAILS: ["x@y.z"],
    NODE_ENV: "test",
    ...over,
  }) as never;

const lookup =
  (result: Awaited<ReturnType<PaymentLookup>>): PaymentLookup =>
  async () =>
    result;

describe("mercado pago provider", () => {
  test("sin token no finge un pago: falla explícitamente", async () => {
    const provider = createMercadoPagoProvider(env());
    expect(provider.configured).toBe(false);
    await expect(
      provider.createPreference({
        bookingId: "b1",
        publicToken: "t",
        title: "Seña",
        amount: 6000,
        payerEmail: "a@b.c",
        successUrl: "http://ok",
        failureUrl: "http://fail",
        notificationUrl: "http://hook",
      }),
    ).rejects.toBeInstanceOf(PaymentsNotConfiguredError);
  });

  test("con token queda configurado", () => {
    expect(createMercadoPagoProvider(env({ MERCADO_PAGO_ACCESS_TOKEN: "TEST-1" })).configured).toBe(
      true,
    );
  });

  test("ignora notificaciones que no son de pago", async () => {
    const provider = createMercadoPagoProvider(env({ MERCADO_PAGO_ACCESS_TOKEN: "T" }));
    expect(await provider.parseWebhook({ type: "plan", data: { id: 1 } }, lookup(null))).toBeNull();
    expect(await provider.parseWebhook({}, lookup(null))).toBeNull();
    expect(await provider.parseWebhook({ type: "payment" }, lookup(null))).toBeNull();
  });

  test("acepta las dos formas de notificación de Mercado Pago", async () => {
    const provider = createMercadoPagoProvider(env({ MERCADO_PAGO_ACCESS_TOKEN: "T" }));
    const detail = {
      status: "approved",
      amount: 6000,
      externalReference: "booking-1",
      raw: { id: 99 },
    };
    for (const payload of [
      { type: "payment", data: { id: 99 } },
      { action: "payment.created", data: { id: 99 } },
    ]) {
      const event = await provider.parseWebhook(payload, lookup(detail));
      expect(event?.status).toBe("approved");
      expect(event?.bookingId).toBe("booking-1");
      expect(event?.amount).toBe(6000);
      expect(event?.providerRef).toBe("99");
    }
  });

  test("mapea los estados del proveedor al dominio", async () => {
    const provider = createMercadoPagoProvider(env({ MERCADO_PAGO_ACCESS_TOKEN: "T" }));
    const cases: [string, "approved" | "pending" | "rejected" | "unknown"][] = [
      ["approved", "approved"],
      ["rejected", "rejected"],
      ["cancelled", "rejected"],
      ["pending", "pending"],
      ["in_process", "pending"],
      ["refunded", "unknown"],
    ];
    for (const [providerStatus, expected] of cases) {
      const event = await provider.parseWebhook(
        { type: "payment", data: { id: 1 } },
        lookup({ status: providerStatus, amount: 1, externalReference: "b", raw: {} }),
      );
      expect(event?.status).toBe(expected);
    }
  });

  test("si el pago no se puede consultar, no se inventa un aprobado", async () => {
    const provider = createMercadoPagoProvider(env({ MERCADO_PAGO_ACCESS_TOKEN: "T" }));
    const event = await provider.parseWebhook({ type: "payment", data: { id: 7 } }, lookup(null));
    expect(event?.status).toBe("unknown");
    expect(event?.bookingId).toBeNull();
  });
});
