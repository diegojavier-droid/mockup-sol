/**
 * Proveedor de pagos — contrato mínimo para cobrar la seña.
 *
 * El webhook es la autoridad de confirmación (§25): el navegador nunca
 * confirma un pago. La implementación real es Mercado Pago Checkout Pro
 * con una preference por reserva; el stub permite operar y testear sin
 * credenciales, sin fingir que el pago ocurrió.
 */

export interface PreferenceRequest {
  bookingId: string;
  publicToken: string;
  title: string;
  amount: number;
  payerEmail: string;
  successUrl: string;
  failureUrl: string;
  notificationUrl: string;
}

export interface PreferenceResult {
  checkoutUrl: string;
  providerRef: string;
}

export interface PaymentEvent {
  providerRef: string;
  bookingId: string | null;
  amount: number | null;
  status: "approved" | "pending" | "rejected" | "unknown";
  raw: unknown;
}

export interface PaymentProvider {
  readonly name: string;
  readonly configured: boolean;
  createPreference(req: PreferenceRequest): Promise<PreferenceResult>;
  /** Traduce la notificación del proveedor a un evento del dominio. */
  parseWebhook(payload: unknown, lookup?: PaymentLookup): Promise<PaymentEvent | null>;
}

/** Consulta el pago en el proveedor (el webhook trae sólo el id). */
export type PaymentLookup = (paymentId: string) => Promise<{
  status: string;
  amount: number | null;
  externalReference: string | null;
  raw: unknown;
} | null>;

export class PaymentsNotConfiguredError extends Error {
  constructor() {
    super("payments_not_configured");
    this.name = "PaymentsNotConfiguredError";
  }
}
