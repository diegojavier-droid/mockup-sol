import type { SummaryData } from "../SummaryPanel";

export function BookingConfirmation({ data, onClose }: { data: SummaryData; onClose: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md overflow-hidden rounded-[2rem] border border-border bg-card text-center shadow-[0_40px_80px_-40px_rgba(120,90,60,0.4)]">
        <div className="bg-gradient-to-b from-cream/80 to-card px-8 pb-6 pt-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-champagne-deep/30 bg-champagne text-2xl text-champagne-deep">
            ✓
          </div>
          <p className="mt-5 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            Reserva enviada
          </p>
          <h2 className="mt-2 font-serif text-4xl leading-tight text-foreground">¡Gracias!</h2>
          <div className="mx-auto mt-4 h-px w-10 bg-champagne-deep/40" />
        </div>

        <div className="space-y-5 px-8 pb-8 pt-6">
          <div className="rounded-2xl border border-border bg-cream/40 px-5 py-4 text-left">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Servicio</p>
            <p className="mt-1 font-serif text-lg text-foreground">
              {data.service?.name ?? "Tu servicio"}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border/70 pt-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Fecha
                </p>
                <p className="mt-0.5 font-serif text-base text-foreground">{data.date ?? "—"}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Hora
                </p>
                <p className="mt-0.5 font-serif text-base text-foreground">{data.time ?? "—"}</p>
              </div>
            </div>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Te confirmamos el turno por WhatsApp.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-full bg-primary py-4 font-serif text-base text-primary-foreground shadow-[0_18px_40px_-18px_rgba(80,55,30,0.5)] transition-all hover:translate-y-[-1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    </div>
  );
}
