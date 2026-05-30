import { useMemo, useState } from "react";
import {
  mockDates,
  personalizationFields,
  type CategoryId,
  type Extra,
  type Personalization,
  type Service,
} from "@/lib/booking-data";
import type { SummaryData } from "../SummaryPanel";
import { BOOKING_STEPS } from "../wizard/booking-steps";

export function useBookingWizard(onExit: () => void, initialCategory?: CategoryId) {
  const [step, setStep] = useState(0);
  const [category, setCategory] = useState<CategoryId | null>(initialCategory ?? null);
  const [service, setService] = useState<Service | null>(null);
  const [personal, setPersonal] = useState<Personalization>({});
  const [chosenExtras, setChosenExtras] = useState<Extra[]>([]);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const data: SummaryData = useMemo(
    () => ({
      category,
      service,
      extras: chosenExtras,
      date: date ? (mockDates.find((mockDate) => mockDate.iso === date)?.label ?? null) : null,
      time,
    }),
    [category, chosenExtras, date, service, time],
  );

  const canNext = useMemo(() => {
    if (step === 0) return !!category;
    if (step === 1) return !!service;
    if (step === 2) {
      return category
        ? personalizationFields[category].every((field) => personal[field.id])
        : false;
    }
    if (step === 3) return true;
    if (step === 4) return !!date && !!time;
    return true;
  }, [category, date, personal, service, step, time]);

  const chooseCategory = (categoryId: CategoryId) => {
    setCategory(categoryId);
    setService(null);
    setPersonal({});
    setChosenExtras([]);
    setDate(null);
    setTime(null);
  };

  const chooseService = (selectedService: Service) => {
    setService(selectedService);
    setChosenExtras([]);
  };

  const choosePersonalization = (fieldId: string, option: string) => {
    setPersonal((current) => ({ ...current, [fieldId]: option }));
  };

  const toggleExtra = (extra: Extra) => {
    setChosenExtras((current) =>
      current.some((chosenExtra) => chosenExtra.id === extra.id)
        ? current.filter((chosenExtra) => chosenExtra.id !== extra.id)
        : [...current, extra],
    );
  };

  const chooseDate = (selectedDate: string) => {
    setDate(selectedDate);
    setTime(null);
  };

  const next = () => setStep((currentStep) => Math.min(currentStep + 1, BOOKING_STEPS.length - 1));
  const back = () => {
    if (step === 0) return onExit();
    setStep((currentStep) => currentStep - 1);
  };

  return {
    canNext,
    category,
    chooseCategory,
    chooseDate,
    choosePersonalization,
    chooseService,
    chosenExtras,
    confirmed,
    data,
    date,
    goBack: back,
    goNext: next,
    personal,
    service,
    setConfirmed,
    setTime,
    step,
    time,
    toggleExtra,
  };
}
