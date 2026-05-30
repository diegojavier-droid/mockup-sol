import { useMemo, useState } from "react";
import { customerContactSchema, customerIdentitySchema } from "@/lib/booking-schema";
import type { CustomerIdentityInput } from "@/lib/booking-schema";
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
import type { CustomerErrors, CustomerField, CustomerFormState } from "../steps/CustomerDataStep";

const mockReturningCustomers: CustomerFormState[] = [
  { firstName: "Mai", whatsapp: "342 555 1234", email: "mai@solmai.com" },
  { firstName: "Sofía", whatsapp: "342 600 7788", email: "sofia@example.com" },
];

const normalizeLookup = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[\s()-]/g, "");

function buildCustomerIdentity(customer: CustomerFormState): CustomerIdentityInput {
  return {
    type: "unknown",
    firstName: customer.firstName,
    contact: {
      whatsapp: customer.whatsapp,
      email: customer.email.trim() ? customer.email : undefined,
      preferredContactChannel: "whatsapp",
      acceptsTransactionalMessages: true,
      acceptsMarketingMessages: false,
    },
  };
}

function findMockCustomer(customer: CustomerFormState) {
  const whatsapp = normalizeLookup(customer.whatsapp);
  const email = customer.email.trim().toLowerCase();

  return mockReturningCustomers.find((mockCustomer) => {
    const mockWhatsapp = normalizeLookup(mockCustomer.whatsapp);
    const mockEmail = mockCustomer.email.trim().toLowerCase();

    return Boolean((whatsapp && whatsapp === mockWhatsapp) || (email && email === mockEmail));
  });
}

function validateCustomer(customer: CustomerFormState): CustomerErrors {
  const contactResult = customerContactSchema.safeParse(buildCustomerIdentity(customer).contact);
  const identityResult = customerIdentitySchema.safeParse(buildCustomerIdentity(customer));
  const errors: CustomerErrors = {};

  if (!contactResult.success) {
    for (const issue of contactResult.error.issues) {
      const field = issue.path[0];

      if (field === "whatsapp" || field === "email") {
        errors[field] = issue.message;
      }
    }
  }

  if (!identityResult.success) {
    for (const issue of identityResult.error.issues) {
      const field = issue.path[0];

      if (field === "firstName") {
        errors.firstName = issue.message;
      }
    }
  }

  return errors;
}

export function useBookingWizard(onExit: () => void, initialCategory?: CategoryId) {
  const [step, setStep] = useState(0);
  const [category, setCategory] = useState<CategoryId | null>(initialCategory ?? null);
  const [service, setService] = useState<Service | null>(null);
  const [personal, setPersonal] = useState<Personalization>({});
  const [chosenExtras, setChosenExtras] = useState<Extra[]>([]);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [customer, setCustomer] = useState<CustomerFormState>({
    firstName: "",
    whatsapp: "",
    email: "",
  });
  const [isCustomerRecognized, setIsCustomerRecognized] = useState(false);
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
    if (step === 5) return Object.keys(validateCustomer(customer)).length === 0;
    return true;
  }, [category, customer, date, personal, service, step, time]);

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

  const chooseCustomerField = (field: CustomerField, value: string) => {
    setCustomer((current) => {
      const nextCustomer = { ...current, [field]: value };

      if (field === "whatsapp" || field === "email") {
        const mockCustomer = findMockCustomer(nextCustomer);

        if (mockCustomer) {
          setIsCustomerRecognized(true);
          return mockCustomer;
        }

        setIsCustomerRecognized(false);
      }

      return nextCustomer;
    });
  };

  const customerErrors = validateCustomer(customer);

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
    chooseCustomerField,
    choosePersonalization,
    chooseService,
    chosenExtras,
    confirmed,
    customer,
    customerErrors,
    data,
    date,
    goBack: back,
    goNext: next,
    personal,
    service,
    isCustomerRecognized,
    setConfirmed,
    setTime,
    step,
    time,
    toggleExtra,
  };
}
