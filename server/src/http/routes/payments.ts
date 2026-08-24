/**
 * Pagos de seña.
 *
 *   POST /api/v1/payments/checkout/:token   crea la preference de la reserva
 *   POST /api/v1/payments/webhook           autoridad de confirmación (§25)
 *
 * El webhook siempre responde 200 salvo error interno: los proveedores
 * reintentan ante 4xx/5xx y un evento que no nos aplica no es un fallo.
 * La idempotencia la garantiza payments.provider_ref (unique) más la
 * sentencia condicional de confirm_booking_payment.
 */

import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { ServerEnv } from "../../config/env";
import { createSupabaseAdminClient } from "../../lib/supabase";
import { createMercadoPagoProvider } from "../../lib/payments/mercadoPago";
import { PaymentsNotConfiguredError } from "../../lib/payments/provider";
import { verifyMercadoPagoSignature } from "../../lib/payments/signature";
import { getBookingByToken } from "../../lib/booking/repository";

export function createPaymentsRoute(env: ServerEnv) {
  const route = new Hono();
  const provider = createMercadoPagoProvider(env);

  route.post("/checkout/:token", async (c) => {
    const token = c.req.param("token");
    if (!/^[a-f0-9]{32}$/.test(token)) {
      throw new HTTPException(404, { message: "No encontramos esa reserva." });
    }

    const admin = createSupabaseAdminClient(env);
    const booking = await getBookingByToken(admin, token);
    if (!booking) throw new HTTPException(404, { message: "No encontramos esa reserva." });

    if (booking.status !== "pending_payment") {
      throw new HTTPException(409, {
        message:
          booking.status === "confirmed"
            ? "Tu turno ya está confirmado."
            : "Esta reserva ya no admite el pago de la seña.",
      });
    }

    // El turno deja de estar retenido en cuanto vence la ventana, lo
    // decida o no el barrido de vencidos: cobrar una seña acá sería
    // cobrar por un horario que ya puede haber tomado otra persona.
    if (
      booking.paymentRequiredUntil &&
      new Date(booking.paymentRequiredUntil).getTime() <= Date.now()
    ) {
      throw new HTTPException(409, {
        message:
          "Se venció el tiempo para reservar este horario. Elegí uno nuevo y lo tomamos al toque.",
      });
    }

    const { data: idRow, error: idError } = await admin
      .from("bookings")
      .select("id")
      .eq("public_token", token)
      .single();
    if (idError) throw idError;
    const bookingId = (idRow as { id: string }).id;

    const { data: emailRow } = await admin
      .from("bookings")
      .select("customers!inner(email)")
      .eq("public_token", token)
      .single();
    const payerEmail =
      (emailRow as { customers?: { email?: string | null } } | null)?.customers?.email ?? "";

    try {
      const preference = await provider.createPreference({
        bookingId,
        publicToken: token,
        title: `Seña · ${booking.items[0]?.name ?? "Turno Sol Mai"}`,
        amount: booking.depositAmount,
        payerEmail,
        successUrl: `${env.PUBLIC_WEB_BASE_URL}/reserva/${token}?pago=ok`,
        failureUrl: `${env.PUBLIC_WEB_BASE_URL}/reserva/${token}?pago=pendiente`,
        notificationUrl: `${env.API_BASE_URL}/api/v1/payments/webhook`,
      });

      await admin.from("payments").insert({
        booking_id: bookingId,
        provider: provider.name,
        provider_ref: `pref:${preference.providerRef}`,
        amount: booking.depositAmount,
        status: "preference_created",
        raw_payload: { checkoutUrl: preference.checkoutUrl },
      });

      return c.json({
        data: {
          checkoutUrl: preference.checkoutUrl,
          depositAmount: booking.depositAmount,
          paymentRequiredUntil: booking.paymentRequiredUntil,
        },
      });
    } catch (error) {
      if (error instanceof PaymentsNotConfiguredError) {
        // Sin credenciales del propietario no se puede cobrar online. La
        // reserva sigue viva y el salón la coordina; no se finge un pago.
        return c.json(
          {
            data: {
              checkoutUrl: null,
              depositAmount: booking.depositAmount,
              paymentRequiredUntil: booking.paymentRequiredUntil,
              message:
                "El pago online todavía no está habilitado. Te escribimos para coordinar la seña.",
            },
          },
          200,
        );
      }
      throw error;
    }
  });

  route.post("/webhook", async (c) => {
    const payload = (await c.req.json().catch(() => null)) as {
      data?: { id?: string | number };
      id?: string | number;
    } | null;
    if (!payload) return c.json({ received: true, handled: false }, 200);

    // El webhook es la ÚNICA autoridad que confirma un turno. Que una
    // notificación llegue desde internet no prueba quién la mandó: sin
    // firma válida no se toca nada.
    const dataId = payload.data?.id ?? payload.id;
    const check = await verifyMercadoPagoSignature({
      secret: env.MERCADO_PAGO_WEBHOOK_SECRET,
      signatureHeader: c.req.header("x-signature"),
      requestId: c.req.header("x-request-id"),
      dataId: dataId === undefined ? undefined : String(dataId),
    });

    if (!check.valid) {
      // 401 y no 200: un emisor legítimo tiene que enterarse de que su
      // notificación fue rechazada, no creer que se procesó.
      console.warn("[sol-mai-api] webhook rechazado:", check.reason);
      throw new HTTPException(401, { message: "Invalid webhook signature" });
    }

    // Sin lookup explícito el proveedor consulta el pago en su propia API:
    // el webhook sólo trae un id, nunca el estado. Confiar en el cuerpo
    // sería dejar que quien firma también decida el importe.
    const event = await provider.parseWebhook(payload);

    if (!event) return c.json({ received: true, handled: false }, 200);
    if (!event.bookingId) {
      console.warn("[sol-mai-api] payment webhook without external_reference", event.providerRef);
      return c.json({ received: true, handled: false }, 200);
    }

    const admin = createSupabaseAdminClient(env);

    // El importe tiene que corresponder con la seña de ESA reserva. Un
    // pago de $1 no confirma un turno de $8.000.
    const { data: expected } = await admin
      .from("bookings")
      .select("deposit_amount")
      .eq("id", event.bookingId)
      .maybeSingle();

    if (!expected) {
      console.warn("[sol-mai-api] webhook para una reserva inexistente", event.bookingId);
      return c.json({ received: true, handled: false }, 200);
    }

    const due = (expected as { deposit_amount: number }).deposit_amount;

    // Un importe que no se puede verificar no confirma nada. Antes, si el
    // proveedor no devolvía `transaction_amount`, el guard se salteaba y
    // el turno quedaba confirmado sin que nadie supiera cuánto entró:
    // fallar abierto es lo peor que puede hacer un control de dinero.
    const unverifiable = event.status === "approved" && event.amount === null;
    const underpaid = event.status === "approved" && event.amount !== null && event.amount < due;

    if (unverifiable || underpaid) {
      console.warn(
        JSON.stringify({
          evento: "pago_no_confirmado",
          motivo: unverifiable ? "importe_no_verificable" : "importe_insuficiente",
          bookingId: event.bookingId,
          providerRef: event.providerRef,
          llego: event.amount,
          seña: due,
          ts: new Date().toISOString(),
        }),
      );
      // Se registra el pago pero NO confirma: queda como excepción manual.
      await admin.rpc("confirm_booking_payment", {
        p_booking_id: event.bookingId,
        p_provider: provider.name,
        p_provider_ref: event.providerRef,
        p_amount: event.amount,
        p_status: unverifiable ? "unverified_amount" : "underpaid",
        p_raw: event.raw ?? {},
      });
      return c.json(
        {
          received: true,
          handled: false,
          outcome: unverifiable ? "unverified_amount" : "underpaid",
        },
        200,
      );
    }

    const { data, error } = await admin.rpc("confirm_booking_payment", {
      p_booking_id: event.bookingId,
      p_provider: provider.name,
      p_provider_ref: event.providerRef,
      p_amount: event.amount,
      p_status: event.status,
      p_raw: event.raw ?? {},
    });
    if (error) throw error;

    return c.json({ received: true, handled: true, outcome: data }, 200);
  });

  return route;
}
