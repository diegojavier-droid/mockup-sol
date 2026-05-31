import { useEffect, useRef } from "react";
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
  initialServiceId,
  onExit,
}: {
  initialCategory?: CategoryId;
  initialServiceId?: string;
  onExit: () => void;
}) {
  const wizard = useBookingWizard(onExit, {
    categoryId: initialCategory,
    serviceId: initialServiceId,
  });
  const stepContentRef = useRef<HTMLDivElement>(null);
  const previousStepRef = useRef(wizard.step);
  const selectedServiceIdRef = useRef<string | null>(null);
  selectedServiceIdRef.current = wizard.service?.id ?? null;

  useEffect(() => {
    const previousStep = previousStepRef.current;
    previousStepRef.current = wizard.step;

    const animationFrame = window.requestAnimationFrame(() => {
      const selectedServiceId = selectedServiceIdRef.current;

      if (
        wizard.step === BOOKING_STEP_INDEX.service &&
        previousStep > BOOKING_STEP_INDEX.service &&
        selectedServiceId
      ) {
        const selectedServiceCard = stepContentRef.current?.querySelector(
          `[data-service-id="${selectedServiceId}"]`,
        );

        selectedServiceCard?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      stepContentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [wizard.step]);

  if (wizard.confirmed) return <BookingConfirmation data={wizard.data} onClose={onExit} />;

  return (
    <div className="min-h-svh overflow-x-hidden bg-background">
      <BookingHeader onBack={wizard.goBack} />

      <main className="mx-auto max-w-6xl px-4 pb-[calc(env(safe-area-inset-bottom)+15rem)] pt-3 lg:px-8 lg:pb-28 lg:pt-4">
        <div className="mb-4 lg:mb-10">
          <Stepper current={wizard.step} labels={[...BOOKING_STEPS]} total={BOOKING_STEPS.length} />
        </div>

        <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
          <div ref={stepContentRef} className="min-w-0 scroll-mt-24 lg:scroll-mt-28">
            {wizard.step === BOOKING_STEP_INDEX.category && (
              <CategoryStep
                category={wizard.category}
                categoryImages={categoryImages}
                onChooseCategory={wizard.chooseCategoryAndContinue}
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
                error={wizard.bookingRequestError}
                onConfirm={wizard.confirmBookingRequest}
              />
            )}
          </div>

          {wizard.service && (
            <div className="hidden lg:block">
              <SummaryPanel data={wizard.data} />
            </div>
          )}
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
