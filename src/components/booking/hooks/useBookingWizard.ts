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
import { BOOKING_STEP_INDEX, BOOKING_STEPS } from "../wizard/booking-steps";
import type {
  CustomerErrors,
  CustomerField,
  CustomerFormState,
  CustomerTouched,
} from "../steps/CustomerDataStep";

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
  const identityResult = customerIdentitySchema.safeParse(buildCustomerIdentity(customer));
  const contactResult = customerContactSchema.safeParse(buildCustomerIdentity(customer).contact);
  const errors: CustomerErrors = {};

  if (!identityResult.success) {
    for (const issue of identityResult.error.issues) {
      const [section, field] = issue.path;

      if (section === "firstName") {
        errors.firstName = issue.message;
      }

      if (section === "contact" && (field === "whatsapp" || field === "email")) {
        errors[field] = issue.message;
      }
    }
  }

  if (!contactResult.success) {
    for (const issue of contactResult.error.issues) {
      const field = issue.path[0];

      if (field === "whatsapp" || field === "email") {
        errors[field] = issue.message;
      }
    }
  }

  return errors;
}

function getVisibleCustomerErrors(
  errors: CustomerErrors,
  touched: CustomerTouched,
): CustomerErrors {
  return Object.fromEntries(
    Object.entries(errors).filter(([field]) => touched[field as CustomerField]),
  ) as CustomerErrors;
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
  const [customerTouched, setCustomerTouched] = useState<CustomerTouched>({});
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
    if (step === BOOKING_STEP_INDEX.category) return !!category;
    if (step === BOOKING_STEP_INDEX.service) return !!service;
    if (step === BOOKING_STEP_INDEX.details) {
      return category
        ? personalizationFields[category].every((field) => personal[field.id])
        : false;
    }
    if (step === BOOKING_STEP_INDEX.extras) return true;
    if (step === BOOKING_STEP_INDEX.dateTime) return !!date && !!time;
    if (step === BOOKING_STEP_INDEX.customerData)
      return Object.keys(validateCustomer(customer)).length === 0;
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
    setCustomerTouched((current) => ({ ...current, [field]: true }));
    setCustomer((current) => {
      const nextCustomer = { ...current, [field]: value };

      if (field === "whatsapp" || field === "email") {
        const mockCustomer = findMockCustomer(nextCustomer);

        if (mockCustomer) {
          setIsCustomerRecognized(true);

          return {
            firstName: current.firstName.trim() ? current.firstName : mockCustomer.firstName,
            whatsapp: nextCustomer.whatsapp.trim() ? nextCustomer.whatsapp : mockCustomer.whatsapp,
            email: nextCustomer.email.trim() ? nextCustomer.email : mockCustomer.email,
          };
        }

        setIsCustomerRecognized(false);
      }

      return nextCustomer;
    });
  };

  const customerValidationErrors = validateCustomer(customer);
  const customerErrors = getVisibleCustomerErrors(customerValidationErrors, customerTouched);

  const next = () => setStep((currentStep) => Math.min(currentStep + 1, BOOKING_STEPS.length - 1));
  const back = () => {
    if (step === BOOKING_STEP_INDEX.category) return onExit();
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
