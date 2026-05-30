import type { Personalization } from "@/lib/booking-data";
import type { CustomerFormState } from "./CustomerDataStep";
import { BookingSummaryDetails } from "../summary/BookingSummaryDetails";
import type { SummaryData } from "../SummaryPanel";
import { StepShell } from "../wizard/StepShell";

export function ReviewStep({
  customer,
  data,
  personal,
  onConfirm,
}: {
  customer: CustomerFormState;
  data: SummaryData;
  personal: Personalization;
  onConfirm: () => void;
}) {
  return (
    <StepShell title="Revisemos tu reserva" subtitle="Si todo está bien, confirmá tu interés.">
      <BookingSummaryDetails customer={customer} data={data} personal={personal} />
      <button
        type="button"
        onClick={onConfirm}
        className="mt-6 w-full rounded-full bg-primary py-4 font-serif text-lg text-primary-foreground shadow-[0_20px_40px_-18px_rgba(80,55,30,0.55)] transition-all hover:translate-y-[-1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        Confirmar interés ✦
      </button>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        El salón confirmará el turno por WhatsApp.
      </p>
    </StepShell>
  );
}
