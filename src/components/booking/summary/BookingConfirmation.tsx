import { useState } from "react";
import { useDepositCheckout } from "@/lib/api/booking-hooks";
import type { ApiCreatedBooking } from "@/lib/api/catalog-types";
import { solMaiContact } from "@/lib/sol-mai-contact";
import type { SummaryData } from "../SummaryPanel";

function formatPrice(amount: number) {
  return `$${amount.toLocaleString("es-AR")}`;
}

type LocalPaymentView = "pending" | "informed";

export function BookingConfirmation({
  data,
  onClose,
  wasDraftRestored = false,
  booking,
}: {
  data: SummaryData;
  onClose: () => void;
  wasDraftRestored?: boolean;
  /** La reserva ya persistida. Sin ella no hay seña que cobrar. */
  booking?: ApiCreatedBooking | null;
}) {
  const depositAmount = booking?.depositAmount ?? 0;
  const depositPrice = formatPrice(depositAmount);
  const payLabel = depositAmount ? `Abonar seña — ${depositPrice}` : "Abonar seña";
  const [view, setView] = useState<LocalPaymentView>("pending");
  const checkout = useDepositCheckout();
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);

  // El link de pago se crea para ESTA reserva: así el webhook sabe qué
  // turno confirmar. Un link fijo no permitiría conciliarlo.
  const handlePayDeposit = async () => {
    if (!booking) return;
    setCheckoutMessage(null);
    try {
      const result = await checkout.mutateAsync(booking.publicToken);
      if (result.checkoutUrl) {
        window.open(result.checkoutUrl, "_blank", "noopener");
      } else {
        setCheckoutMessage(
          result.message ??
            "El pago online todavía no está habilitado. Te escribimos para coordinar la seña.",
        );
      }
    } catch (error) {
      setCheckoutMessage(
        error instanceof Error ? error.message : "No pudimos abrir el pago. Probá de nuevo.",
      );
    }
  };

  return (
    <div className="flex min-h-screen items-start justify-center bg-background px-4 py-6 sm:items-center sm:py-12">
      <div className="w-full max-w-md overflow-hidden rounded-[2rem] border border-border bg-card shadow-[0_40px_80px_-40px_rgba(120,90,60,0.4)]">
        <div className="space-y-4 px-5 py-5 sm:space-y-5 sm:px-8 sm:py-8">
          {wasDraftRestored && (
            <p className="rounded-full border border-champagne-deep/20 bg-cream/50 px-4 py-2 text-center text-xs text-muted-foreground">
              Retomamos tu reserva en curso.
            </p>
          )}

          {/* Estado compacto */}
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-foreground/70">
            <span className="h-1.5 w-1.5 rounded-full bg-champagne-deep" />
            {view === "pending"
              ? "Reserva guardada · falta la seña"
              : "Pago pendiente de verificación"}
          </div>

          {/* Resumen del turno */}
          <div className="min-w-0 rounded-2xl border border-border bg-cream/40 px-4 py-3">
            <p className="min-w-0 truncate font-serif text-lg leading-tight text-foreground">
              {data.service?.name ?? "Tu servicio"}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <span>{data.date ?? "—"}</span>
              <span className="text-border">·</span>
              <span>{data.time ?? "—"}</span>
            </div>
          </div>

          {view === "pending" ? (
            <>
              {/* Bloque de pago dominante */}
              <div className="rounded-2xl border border-champagne-deep/25 bg-gradient-to-b from-champagne/55 to-cream/60 px-5 py-4 text-center">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Seña 20%
                </p>
                <p className="mt-1 font-serif text-3xl text-foreground">{depositPrice}</p>
                <button
                  type="button"
                  onClick={handlePayDeposit}
                  disabled={!booking || checkout.isPending}
                  className="mt-4 block w-full rounded-full bg-primary py-3.5 text-center font-serif text-base text-primary-foreground shadow-[0_18px_40px_-18px_rgba(80,55,30,0.5)] transition-all hover:translate-y-[-1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-60"
                >
                  {checkout.isPending ? "Abriendo el pago…" : payLabel}
                </button>
                {checkoutMessage ? (
                  <p className="mt-3 rounded-2xl bg-cream/60 px-4 py-3 text-[12px] leading-relaxed text-foreground/80">
                    {checkoutMessage}
                  </p>
                ) : (
                  <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                    Pagás en Mercado Pago. Sol Mai no ve ni guarda tus datos de tarjeta.
                  </p>
                )}
              </div>

              {/* Ya pagué — link discreto */}
              <button
                type="button"
                onClick={() => setView("informed")}
                className="block w-full py-1 text-center text-xs text-foreground/70 underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Ya pagué
              </button>
            </>
          ) : (
            <>
              {/* Estado local: pago informado */}
              <div className="rounded-2xl border border-champagne-deep/25 bg-gradient-to-b from-champagne/40 to-cream/50 px-5 py-4">
                <p className="text-[11px] leading-relaxed text-foreground/85">
                  Si completaste el pago, Sol Mai verificará la acreditación y te confirmará por
                  email y WhatsApp.
                </p>
                <button
                  type="button"
                  onClick={() => setView("pending")}
                  className="mt-4 block w-full rounded-full border border-champagne-deep/40 bg-card py-3 text-center font-serif text-sm text-foreground transition-all hover:border-champagne-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  Volver a intentar pago
                </button>
              </div>
            </>
          )}

          {/* Soporte discreto */}
          <div className="min-w-0 px-1 text-[11px] leading-relaxed text-muted-foreground/80">
            <p className="break-words">
              Soporte: <span className="break-all">{solMaiContact.email}</span> ·{" "}
              {solMaiContact.whatsappDisplay}
            </p>
          </div>

          {/* Volver al inicio — bajo peso */}
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 text-center font-serif text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    </div>
  );
}
