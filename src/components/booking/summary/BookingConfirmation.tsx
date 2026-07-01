import { computeBookingTotals } from "@/lib/booking-totals";
import { solMaiContact } from "@/lib/sol-mai-contact";
import type { SummaryData } from "../SummaryPanel";

export function BookingConfirmation({ data, onClose }: { data: SummaryData; onClose: () => void }) {
  const { depositPrice, depositAmount } = computeBookingTotals(data);
  const payLabel = depositAmount ? `Abonar seña — ${depositPrice}` : "Abonar seña";

  const handlePayDeposit = () => {
    window.open(solMaiContact.mercadoPagoDepositUrl, "_blank", "noopener");
  };

  return (
    <div className="flex min-h-screen items-start justify-center bg-background px-4 py-6 sm:items-center sm:py-12">
      <div className="w-full max-w-md overflow-hidden rounded-[2rem] border border-border bg-card shadow-[0_40px_80px_-40px_rgba(120,90,60,0.4)]">
        <div className="space-y-4 px-5 py-5 sm:space-y-5 sm:px-8 sm:py-8">
          {/* Estado compacto */}
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-foreground/70">
            <span className="h-1.5 w-1.5 rounded-full bg-champagne-deep" />
            Reserva guardada · falta la seña
          </div>

          {/* Resumen del turno */}
          <div className="rounded-2xl border border-border bg-cream/40 px-4 py-3">
            <p className="truncate font-serif text-lg leading-tight text-foreground">
              {data.service?.name ?? "Tu servicio"}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <span>{data.date ?? "—"}</span>
              <span className="text-border">·</span>
              <span>{data.time ?? "—"}</span>
            </div>
          </div>

          {/* Bloque de pago dominante */}
          <div className="rounded-2xl border border-champagne-deep/25 bg-gradient-to-b from-champagne/55 to-cream/60 px-5 py-4 text-center">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Seña 20%
            </p>
            <p className="mt-1 font-serif text-3xl text-foreground">{depositPrice}</p>
            <button
              type="button"
              onClick={handlePayDeposit}
              className="mt-4 block w-full rounded-full bg-primary py-3.5 text-center font-serif text-base text-primary-foreground shadow-[0_18px_40px_-18px_rgba(80,55,30,0.5)] transition-all hover:translate-y-[-1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {payLabel}
            </button>
          </div>

          {/* Cómo sigue — plegable */}
          <details className="group rounded-2xl border border-border/70 bg-cream/30 px-4 py-3">
            <summary className="flex cursor-pointer list-none items-center justify-between text-xs text-foreground/80">
              <span>Cómo sigue después del pago</span>
              <span className="text-muted-foreground transition-transform group-open:rotate-180">⌄</span>
            </summary>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
              Cuando se acredite la seña, la reserva queda confirmada.
            </p>
          </details>

          {/* Soporte discreto */}
          <div className="px-1 text-[11px] leading-relaxed text-muted-foreground/80">
            <p>Soporte: {solMaiContact.email} · {solMaiContact.whatsappDisplay}</p>
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
