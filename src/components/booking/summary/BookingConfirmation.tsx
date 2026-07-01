import { computeBookingTotals } from "@/lib/booking-totals";
import { solMaiContact } from "@/lib/sol-mai-contact";
import type { SummaryData } from "../SummaryPanel";

export function BookingConfirmation({ data, onClose }: { data: SummaryData; onClose: () => void }) {
  const { depositPrice, depositAmount } = computeBookingTotals(data);

  const handlePayDeposit = () => {
    window.open(solMaiContact.mercadoPagoDepositUrl, "_blank", "noopener");
  };

  const payLabel = depositAmount ? `Abonar seña — ${depositPrice}` : "Abonar seña";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-6 sm:py-12">
      <div className="w-full max-w-md overflow-hidden rounded-[2rem] border border-border bg-card shadow-[0_40px_80px_-40px_rgba(120,90,60,0.4)]">
        {/* Header compacto */}
        <div className="bg-gradient-to-b from-cream/80 to-card px-6 pb-4 pt-6 text-center sm:px-8 sm:pb-6 sm:pt-10">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-champagne-deep/30 bg-champagne text-lg text-champagne-deep sm:h-16 sm:w-16 sm:text-2xl">
            ✓
          </div>
          <h2 className="mt-3 font-serif text-2xl leading-tight text-foreground sm:mt-5 sm:text-4xl">
            Solicitud registrada
          </h2>
          <p className="mt-2 inline-flex items-center gap-2 rounded-full border border-champagne-deep/30 bg-champagne/40 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-foreground/70">
            <span className="h-1.5 w-1.5 rounded-full bg-champagne-deep" />
            Estado: pendiente de seña
          </p>
        </div>

        <div className="space-y-4 px-6 pb-8 pt-4 sm:space-y-5 sm:px-8 sm:pt-6">
          {/* Resumen del turno — compacto */}
          <div className="rounded-2xl border border-border bg-cream/40 px-4 py-3">
            <p className="truncate font-serif text-base text-foreground">
              {data.service?.name ?? "Tu servicio"}
            </p>
            <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
              <span>{data.date ?? "—"}</span>
              <span className="text-border">·</span>
              <span>{data.time ?? "—"}</span>
            </div>
          </div>

          {/* Card principal de pago */}
          <div className="rounded-2xl border border-champagne-deep/20 bg-gradient-to-b from-champagne/50 to-cream/60 px-5 py-5 text-center">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Seña del 20%
            </p>
            <p className="mt-1 font-serif text-2xl text-foreground">{depositPrice}</p>
            <button
              type="button"
              onClick={handlePayDeposit}
              className="mt-4 block w-full rounded-full bg-primary py-3.5 text-center font-serif text-base text-primary-foreground shadow-[0_18px_40px_-18px_rgba(80,55,30,0.5)] transition-all hover:translate-y-[-1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {payLabel}
            </button>
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              Tu turno se confirma cuando se acredita la seña.
            </p>
          </div>

          {/* Cómo sigue — mini lista compacta */}
          <div className="rounded-2xl border border-border/70 bg-cream/30 px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Cómo sigue
            </p>
            <ul className="mt-2 space-y-1.5">
              <li className="flex items-start gap-2 text-xs text-foreground/80">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-champagne-deep" />
                Solicitud registrada
              </li>
              <li className="flex items-start gap-2 text-xs text-foreground/80">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-champagne-deep" />
                Seña pendiente
              </li>
              <li className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-border" />
                Confirmación · Te avisamos por email y WhatsApp
              </li>
              <li className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-border" />
                Recordatorio 30 min antes
              </li>
            </ul>
          </div>

          {/* Soporte discreto */}
          <div className="rounded-2xl border border-border/70 bg-cream/30 px-4 py-3">
            <p className="text-xs text-muted-foreground">¿Problemas con el pago?</p>
            <p className="text-[11px] text-muted-foreground/80">
              Podés intentarlo nuevamente desde esta pantalla.
            </p>
            <div className="mt-2 space-y-0.5 text-[11px] text-muted-foreground/80">
              <p>WhatsApp {solMaiContact.whatsappDisplay}</p>
              <p>{solMaiContact.email}</p>
            </div>
          </div>

          {/* Volver al inicio */}
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-full border border-border bg-card py-3 font-serif text-sm text-muted-foreground transition-all hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    </div>
  );
}
