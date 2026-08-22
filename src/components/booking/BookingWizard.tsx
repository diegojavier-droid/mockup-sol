import { useEffect, useRef, useState } from "react";
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
import { BOOKING_STEP_INDEX } from "./wizard/booking-steps";
import { BookingHeader } from "./wizard/BookingHeader";
import { WizardNavigation } from "./wizard/WizardNavigation";
import type { BookingReturnTarget } from "./booking-navigation-types";
import type { CategoryId } from "@/lib/booking-data";

export function BookingWizard({
  initialCategory,
  initialServiceId,
  onExit,
  onExitToTarget,
  returnTarget,
}: {
  initialCategory?: CategoryId;
  initialServiceId?: string;
  onExit: () => void;
  onExitToTarget: (target: BookingReturnTarget) => void;
  returnTarget: BookingReturnTarget;
}) {
  const wizard = useBookingWizard(
    onExit,
    {
      categoryId: initialCategory,
      serviceId: initialServiceId,
    },
    {
      onExitToTarget,
      returnTarget,
    },
  );
  const stepContentRef = useRef<HTMLDivElement>(null);
  const previousStepRef = useRef(wizard.step);
  const selectedServiceIdRef = useRef<string | null>(null);
  const [isMobileInputFocused, setIsMobileInputFocused] = useState(false);
  selectedServiceIdRef.current = wizard.service?.id ?? null;

  useEffect(() => {
    setIsMobileInputFocused(false);
  }, [wizard.step]);

  useEffect(() => {
    const previousStep = previousStepRef.current;
    previousStepRef.current = wizard.step;

    const animationFrame = window.requestAnimationFrame(() => {
      const selectedServiceId = selectedServiceIdRef.current;

      if (
        wizard.stepKey === "service" &&
        previousStep > BOOKING_STEP_INDEX.service &&
        selectedServiceId
      ) {
        const selectedServiceCard = stepContentRef.current?.querySelector(
          `[data-service-id="${selectedServiceId}"]`,
        );

        selectedServiceCard?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [wizard.step]);

  if (wizard.paymentPending) {
    return (
      <BookingConfirmation
        data={wizard.data}
        onClose={wizard.closeAndClearDraft}
        wasDraftRestored={wizard.wasDraftRestored}
        booking={wizard.confirmedBooking}
      />
    );
  }

  return (
    <div className="min-h-svh overflow-x-hidden bg-background">
      <BookingHeader onBack={wizard.goBack} />

      <main
        className={`mx-auto max-w-6xl px-4 ${wizard.stepKey === "review" ? "pb-[calc(env(safe-area-inset-bottom)+6rem)]" : "pb-[calc(env(safe-area-inset-bottom)+10rem)]"} pt-3 lg:px-8 lg:pb-28 lg:pt-4`}
      >
        <div className="mb-4 lg:mb-10">
          {wizard.wasDraftRestored && (
            <p className="mb-3 rounded-full border border-champagne-deep/20 bg-cream/50 px-4 py-2 text-center text-xs text-muted-foreground">
              Retomamos tu reserva en curso.
            </p>
          )}
          <Stepper
            current={wizard.step}
            labels={wizard.stepLabels}
            total={wizard.stepLabels.length}
          />
        </div>

        <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
          <div ref={stepContentRef} className="min-w-0 scroll-mt-24 lg:scroll-mt-28">
            {wizard.stepKey === "category" && (
              <CategoryStep
                category={wizard.category}
                onChooseCategory={wizard.chooseCategoryAndContinue}
              />
            )}

            {wizard.stepKey === "service" && wizard.category && (
              <ServiceStep
                category={wizard.category}
                service={wizard.service}
                onChooseService={wizard.chooseService}
              />
            )}

            {wizard.stepKey === "details" && wizard.category && (
              <PersonalizationStep
                additionalComments={wizard.additionalComments}
                category={wizard.category}
                personal={wizard.personal}
                onChangeAdditionalComments={wizard.chooseAdditionalComments}
                onChooseOption={wizard.choosePersonalization}
              />
            )}

            {wizard.stepKey === "extras" && wizard.category && (
              <ExtrasStep
                category={wizard.category}
                chosenExtras={wizard.chosenExtras}
                onToggleExtra={wizard.toggleExtra}
              />
            )}

            {wizard.stepKey === "dateTime" && (
              <DateTimeStep
                date={wizard.date}
                time={wizard.time}
                onChooseDate={wizard.chooseDate}
                onChooseTime={wizard.setTime}
                slotsByDate={wizard.slotsByDate}
                isLoadingAvailability={wizard.isLoadingAvailability}
              />
            )}

            {wizard.stepKey === "customerData" && (
              <CustomerDataStep
                customer={wizard.customer}
                errors={wizard.customerErrors}
                isRecognized={wizard.isCustomerRecognized}
                onChangeCustomerField={wizard.chooseCustomerField}
                onMobileInputFocusChange={setIsMobileInputFocused}
              />
            )}

            {wizard.stepKey === "review" && (
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
        canRequestCustomerRequiredFeedback={wizard.canRequestCustomerRequiredFeedback}
        data={wizard.data}
        onBack={wizard.goBack}
        onNext={wizard.goNext}
        step={wizard.step}
        totalSteps={wizard.stepLabels.length}
        isMobileInputFocused={isMobileInputFocused}
      />
    </div>
  );
}
