import { Stepper } from "./Stepper";
import { SummaryPanel } from "./SummaryPanel";
import { useBookingWizard } from "./hooks/useBookingWizard";
import { CategoryStep } from "./steps/CategoryStep";
import { CustomerDataStep } from "./steps/CustomerDataStep";
import { DateTimeStep } from "./steps/DateTimeStep";
import { ExtrasStep } from "./steps/ExtrasStep";
import { PersonalizationStep } from "./steps/PersonalizationStep";
import { ReviewStep } from "./steps/ReviewStep";
import { ServiceStep } from "./steps/ServiceStep";
import { BookingConfirmation } from "./summary/BookingConfirmation";
import { BOOKING_STEP_INDEX, BOOKING_STEPS } from "./wizard/booking-steps";
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
            {wizard.step === BOOKING_STEP_INDEX.category && (
              <CategoryStep
                category={wizard.category}
                categoryImages={categoryImages}
                onChooseCategory={wizard.chooseCategory}
              />
            )}

            {wizard.step === BOOKING_STEP_INDEX.service && wizard.category && (
              <ServiceStep
                category={wizard.category}
                service={wizard.service}
                onChooseService={wizard.chooseService}
              />
            )}

            {wizard.step === BOOKING_STEP_INDEX.details && wizard.category && (
              <PersonalizationStep
                category={wizard.category}
                personal={wizard.personal}
                onChooseOption={wizard.choosePersonalization}
              />
            )}

            {wizard.step === BOOKING_STEP_INDEX.extras && wizard.category && (
              <ExtrasStep
                category={wizard.category}
                chosenExtras={wizard.chosenExtras}
                onToggleExtra={wizard.toggleExtra}
              />
            )}

            {wizard.step === BOOKING_STEP_INDEX.dateTime && (
              <DateTimeStep
                date={wizard.date}
                time={wizard.time}
                onChooseDate={wizard.chooseDate}
                onChooseTime={wizard.setTime}
              />
            )}

            {wizard.step === BOOKING_STEP_INDEX.customerData && (
              <CustomerDataStep
                customer={wizard.customer}
                errors={wizard.customerErrors}
                isRecognized={wizard.isCustomerRecognized}
                onChangeCustomerField={wizard.chooseCustomerField}
              />
            )}

            {wizard.step === BOOKING_STEP_INDEX.review && (
              <ReviewStep
                customer={wizard.customer}
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
