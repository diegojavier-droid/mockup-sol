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
    <StepShell title="Solicitá el enlace para confirmar con seña">
      <p className="-mt-1 text-sm text-muted-foreground">
        Revisá los datos y solicitá el enlace para pagar la seña del 20%. Tu turno queda confirmado cuando se acredita.
      </p>
      <div className="mt-5">
        <BookingSummaryDetails customer={customer} data={data} personal={personal} />
      </div>
      {error && (
        <p className="mt-5 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={onConfirm}
        className="mt-6 w-full rounded-full bg-primary py-4 font-serif text-lg text-primary-foreground shadow-[0_20px_40px_-18px_rgba(80,55,30,0.55)] transition-all hover:translate-y-[-1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        Solicitar enlace de pago
      </button>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        Sol Mai te enviará el enlace por WhatsApp o email. El saldo se abona en el salón.
      </p>

    </StepShell>
  );
}
