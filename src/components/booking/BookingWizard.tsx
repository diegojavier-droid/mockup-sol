import { Stepper } from "./Stepper";
import { SummaryPanel } from "./SummaryPanel";
import { useBookingWizard } from "./hooks/useBookingWizard";
import { CategoryStep } from "./steps/CategoryStep";
import { DateTimeStep } from "./steps/DateTimeStep";
import { ExtrasStep } from "./steps/ExtrasStep";
import { PersonalizationStep } from "./steps/PersonalizationStep";
import { ReviewStep } from "./steps/ReviewStep";
import { ServiceStep } from "./steps/ServiceStep";
import { BookingConfirmation } from "./summary/BookingConfirmation";
import { BOOKING_STEPS } from "./wizard/booking-steps";
import { BookingHeader } from "./wizard/BookingHeader";
import { WizardNavigation } from "./wizard/WizardNavigation";
import type { CategoryId } from "@/lib/booking-data";
import peluImg from "@/assets/sol-mai-peluqueria.jpg";
import makeImg from "@/assets/sol-mai-maquillaje.jpg";
import nailsImg from "@/assets/sol-mai-unas.jpg";

const categoryImages: Record<CategoryId, string> = {
  peluqueria: peluImg,
  maquillaje: makeImg,
  unas: nailsImg,
};

export function BookingWizard({
  initialCategory,
  onExit,
}: {
  initialCategory?: CategoryId;
  onExit: () => void;
}) {
  const wizard = useBookingWizard(onExit, initialCategory);

  if (wizard.confirmed) return <BookingConfirmation data={wizard.data} onClose={onExit} />;

  return (
    <div className="min-h-screen bg-background">
      <BookingHeader onBack={wizard.goBack} />

      <main className="mx-auto max-w-6xl px-4 pb-40 pt-4 lg:px-8 lg:pb-28">
        <div className="mb-6 lg:mb-10">
          <Stepper current={wizard.step} labels={[...BOOKING_STEPS]} total={BOOKING_STEPS.length} />
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
          <div className="min-w-0">
            {wizard.step === 0 && (
              <CategoryStep
                category={wizard.category}
                categoryImages={categoryImages}
                onChooseCategory={wizard.chooseCategory}
              />
            )}

            {wizard.step === 1 && wizard.category && (
              <ServiceStep
                category={wizard.category}
                service={wizard.service}
                onChooseService={wizard.chooseService}
              />
            )}

            {wizard.step === 2 && wizard.category && (
              <PersonalizationStep
                category={wizard.category}
                personal={wizard.personal}
                onChooseOption={wizard.choosePersonalization}
              />
            )}

            {wizard.step === 3 && wizard.category && (
              <ExtrasStep
                category={wizard.category}
                chosenExtras={wizard.chosenExtras}
                onToggleExtra={wizard.toggleExtra}
              />
            )}

            {wizard.step === 4 && (
              <DateTimeStep
                date={wizard.date}
                time={wizard.time}
                onChooseDate={wizard.chooseDate}
                onChooseTime={wizard.setTime}
              />
            )}

            {wizard.step === 5 && (
              <ReviewStep
                data={wizard.data}
                personal={wizard.personal}
                onConfirm={() => wizard.setConfirmed(true)}
              />
            )}
          </div>

          <div className="hidden lg:block">
            <SummaryPanel data={wizard.data} />
          </div>
        </div>
      </main>

      <WizardNavigation
        canNext={wizard.canNext}
        data={wizard.data}
        onBack={wizard.goBack}
        onNext={wizard.goNext}
        step={wizard.step}
      />
    </div>
  );
}
