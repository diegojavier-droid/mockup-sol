import type { Personalization } from "@/lib/booking-data";
import type { CustomerFormState } from "./CustomerDataStep";
import { BookingSummaryDetails } from "../summary/BookingSummaryDetails";
import type { SummaryData } from "../SummaryPanel";
import { StepShell } from "../wizard/StepShell";

export function ReviewStep({
  customer,
  data,
  personal,
  error,
  onConfirm,
}: {
  customer: CustomerFormState;
  data: SummaryData;
  personal: Personalization;
  error: string | null;
  onConfirm: () => void;
}) {
  return (
    <StepShell title="Revisá y confirmá tu solicitud">
      <p className="-mt-1 text-sm text-muted-foreground">
        Primero registramos tu solicitud en estado pendiente de seña. En el paso siguiente vas a poder abonar la seña del 20%.
      </p>
      <div className="mt-5">
        <BookingSummaryDetails customer={customer} data={data} personal={personal} />
      </div>
      {error && (
        <p className="mt-5 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="mt-5 rounded-2xl border border-border bg-cream/40 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
        <p>Recibirás la confirmación por email y WhatsApp cuando se acredite la seña.</p>
        <p>Te enviaremos un recordatorio 30 minutos antes del turno.</p>
      </div>
      <button
        type="button"
        onClick={onConfirm}
        className="mt-6 w-full rounded-full bg-primary py-4 font-serif text-lg text-primary-foreground shadow-[0_20px_40px_-18px_rgba(80,55,30,0.55)] transition-all hover:translate-y-[-1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        Confirmar solicitud
      </button>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        En el paso siguiente vas a poder abonar la seña del 20%. La solicitud pasa a confirmada cuando se acredita.
      </p>
    </StepShell>
  );
}
