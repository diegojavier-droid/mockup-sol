import { SummaryPanel, type SummaryData } from "../SummaryPanel";
import { BOOKING_STEPS } from "./booking-steps";

export function WizardNavigation({
  canNext,
  data,
  onBack,
  onNext,
  step,
  isMobileInputFocused = false,
}: {
  canNext: boolean;
  data: SummaryData;
  onBack: () => void;
  onNext: () => void;
  step: number;
  isMobileInputFocused?: boolean;
}) {
  const isCategoryStep = step === 0;
  const isFinalStep = step === BOOKING_STEPS.length - 1;
  const showNextButton = !isCategoryStep && !isFinalStep;
  const showSummary = Boolean(data.service);
  const showMobileSummary = showSummary && !isMobileInputFocused;

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-2 backdrop-blur-md lg:hidden">
        {showMobileSummary && (
          <div className="mb-2">
            <SummaryPanel data={data} variant="bottom" />
          </div>
        )}
        <div className="flex gap-2">
          <NavBackButton onBack={onBack} step={step} />
          {showNextButton && <NavNextButton canNext={canNext} onNext={onNext} />}
        </div>
      </div>

      <div className="hidden lg:block">
        <div className="fixed inset-x-0 bottom-6 mx-auto max-w-6xl px-8">
          <div className="ml-auto flex max-w-[calc(100%-372px)] justify-end gap-2">
            <NavBackButton onBack={onBack} step={step} />
            {showNextButton && <NavNextButton canNext={canNext} onNext={onNext} />}
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
      className="min-h-11 flex-1 rounded-full border border-border bg-card px-4 py-2.5 font-serif text-sm text-foreground/80 shadow-sm transition-all hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:flex-none lg:px-8 lg:py-3.5 lg:text-base"
    >
      {step === 0 ? "← Volver al inicio" : "← Atrás"}
    </button>
  );
}

function NavNextButton({ canNext, onNext }: { canNext: boolean; onNext: () => void }) {
  return (
    <button
      type="button"
      onClick={onNext}
      disabled={!canNext}
      className="min-h-11 flex-[1.2] rounded-full bg-primary px-5 py-2.5 font-serif text-sm text-primary-foreground shadow-[0_14px_30px_-14px_rgba(80,55,30,0.55)] transition-all hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:flex-none lg:px-10 lg:py-3.5 lg:text-base"
    >
      Continuar →
    </button>
  );
}
