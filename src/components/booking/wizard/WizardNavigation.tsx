import { SummaryPanel, type SummaryData } from "../SummaryPanel";
import { BOOKING_STEPS } from "./booking-steps";

export function WizardNavigation({
  canNext,
  data,
  onBack,
  onNext,
  step,
}: {
  canNext: boolean;
  data: SummaryData;
  onBack: () => void;
  onNext: () => void;
  step: number;
}) {
  const isFinalStep = step === BOOKING_STEPS.length - 1;

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 px-4 py-3 backdrop-blur-md lg:hidden">
        <div className="mb-3">
          <SummaryPanel data={data} variant="bottom" />
        </div>
        <div className="flex gap-2">
          <NavBackButton onBack={onBack} step={step} />
          {!isFinalStep && <NavNextButton canNext={canNext} onNext={onNext} />}
        </div>
      </div>

      <div className="hidden lg:block">
        <div className="fixed inset-x-0 bottom-6 mx-auto max-w-6xl px-8">
          <div className="ml-auto flex max-w-[calc(100%-372px)] justify-end gap-2">
            <NavBackButton onBack={onBack} step={step} />
            {!isFinalStep && <NavNextButton canNext={canNext} onNext={onNext} />}
          </div>
        </div>
      </div>
    </>
  );
}

function NavBackButton({ onBack, step }: { onBack: () => void; step: number }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className="flex-1 rounded-full border border-border bg-card px-6 py-3.5 font-serif text-base text-foreground/80 shadow-sm transition-all hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:flex-none lg:px-8"
    >
      ← {step === 0 ? "Cerrar" : "Atrás"}
    </button>
  );
}

function NavNextButton({ canNext, onNext }: { canNext: boolean; onNext: () => void }) {
  return (
    <button
      type="button"
      onClick={onNext}
      disabled={!canNext}
      className="flex-[1.4] rounded-full bg-primary px-8 py-3.5 font-serif text-base text-primary-foreground shadow-[0_14px_30px_-14px_rgba(80,55,30,0.55)] transition-all hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:flex-none lg:px-10"
    >
      Continuar →
    </button>
  );
}
