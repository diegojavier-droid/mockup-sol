/**
 * Mercado Pago Checkout Pro — una preference por reserva.
 *
 * `external_reference` viaja con el id de la reserva: es lo que permite
 * conciliar el webhook con el turno. Sin eso, un pago aprobado no sabría
 * a qué reserva pertenece (el motivo por el que el link fijo quedó
 * descartado para producción).
 */

import type { ServerEnv } from "../../config/env";
import {
  PaymentsNotConfiguredError,
  type PaymentEvent,
  type PaymentLookup,
  type PaymentProvider,
  type PreferenceRequest,
  type PreferenceResult,
} from "./provider";

const MP_API = "https://api.mercadopago.com";

export function createMercadoPagoProvider(env: ServerEnv): PaymentProvider {
  const token = env.MERCADO_PAGO_ACCESS_TOKEN;

  const lookupPayment: PaymentLookup = async (paymentId) => {
    if (!token) return null;
    const res = await fetch(`${MP_API}/v1/payments/${encodeURIComponent(paymentId)}`, {
      headers: { authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      status?: string;
      transaction_amount?: number;
      external_reference?: string;
    };
    return {
      status: body.status ?? "unknown",
      amount: typeof body.transaction_amount === "number" ? body.transaction_amount : null,
      externalReference: body.external_reference ?? null,
      raw: body,
    };
  };

  return {
    name: "mercado_pago",
    configured: Boolean(token),

    async createPreference(req: PreferenceRequest): Promise<PreferenceResult> {
      if (!token) throw new PaymentsNotConfiguredError();

      const res = await fetch(`${MP_API}/checkout/preferences`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          items: [
            {
              title: req.title,
              quantity: 1,
              currency_id: "ARS",
              unit_price: req.amount,
            },
          ],
          payer: { email: req.payerEmail },
          external_reference: req.bookingId,
          notification_url: req.notificationUrl,
          back_urls: {
            success: req.successUrl,
            failure: req.failureUrl,
            pending: req.failureUrl,
          },
          auto_return: "approved",
        }),
      });

      if (!res.ok) {
        throw new Error(`mercado_pago preference failed: ${res.status} ${await res.text()}`);
      }
      const body = (await res.json()) as { id?: string; init_point?: string };
      if (!body.id || !body.init_point) {
        throw new Error("mercado_pago preference response missing id/init_point");
      }
      return { checkoutUrl: body.init_point, providerRef: body.id };
    },

    async parseWebhook(payload: unknown, lookup = lookupPayment): Promise<PaymentEvent | null> {
      const body = payload as {
        type?: string;
        action?: string;
        data?: { id?: string | number };
      } | null;
      const kind = body?.type ?? body?.action?.split(".")[0];
      if (kind !== "payment") return null;

      const paymentId = body?.data?.id;
      if (paymentId === undefined || paymentId === null) return null;

      const detail = await lookup(String(paymentId));
      if (!detail) {
        return {
          providerRef: String(paymentId),
          bookingId: null,
          amount: null,
          status: "unknown",
          raw: payload,
        };
      }

      const status: PaymentEvent["status"] =
        detail.status === "approved"
          ? "approved"
          : detail.status === "rejected" || detail.status === "cancelled"
            ? "rejected"
            : detail.status === "pending" || detail.status === "in_process"
              ? "pending"
              : "unknown";

      return {
        providerRef: String(paymentId),
        bookingId: detail.externalReference,
        amount: detail.amount === null ? null : Math.round(detail.amount),
        status,
        raw: detail.raw,
      };
    },
  };
}
