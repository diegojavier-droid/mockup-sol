import { useMemo, useState } from "react";
import {
  bookingRequestPayloadSchema,
  customerContactSchema,
  customerIdentitySchema,
} from "@/lib/booking-schema";
import type { BookingRequestPayloadInput, CustomerIdentityInput } from "@/lib/booking-schema";
import {
  formatDateLabel,
  getSlotsForDate,
  personalizationFields,
  services,
  type CategoryId,
  type Extra,
  type Personalization,
  type Service,
} from "@/lib/booking-data";
import { computeTotals } from "@/lib/booking-totals";
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

export function buildCustomerIdentity(
  customer: CustomerFormState,
  isRecognized = false,
): CustomerIdentityInput {
  return {
    type: isRecognized ? "returning" : "unknown",
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

interface BookingRequestPayloadDraftData {
  category: CategoryId | null;
  service: Service | null;
  personal: Personalization;
  chosenExtras: Extra[];
  date: string | null;
  time: string | null;
  customer: CustomerFormState;
  isCustomerRecognized: boolean;
}

export function buildBookingRequestPayload({
  category,
  service,
  personal,
  chosenExtras,
  date,
  time,
  customer,
  isCustomerRecognized,
}: BookingRequestPayloadDraftData): unknown {
  const totals = computeTotals({
    category,
    service,
    extras: chosenExtras,
    personalization: personal,
  });

  return {
    customer: buildCustomerIdentity(customer, isCustomerRecognized),
    selection: {
      categoryId: category,
      serviceId: service?.id,
      extraIds: chosenExtras.map((extra) => extra.id),
      personalization: personal,
      dateId: date,
      time,
    },
    totals: {
      durationMinutes: totals.durationMinutes,
      priceAmount: totals.priceAmount,
      priceIsEstimated: totals.priceIsEstimated,
    },
    status: "requested",
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

interface InitialBookingSelection {
  categoryId?: CategoryId;
  serviceId?: string;
}

function getInitialService(initialSelection?: InitialBookingSelection): Service | null {
  if (!initialSelection?.categoryId || !initialSelection.serviceId) return null;

  return (
    services[initialSelection.categoryId].find(
      (availableService) => availableService.id === initialSelection.serviceId,
    ) ?? null
  );
}

function getInitialStep(
  initialSelection?: InitialBookingSelection,
  initialService?: Service | null,
) {
  if (!initialSelection?.categoryId) return BOOKING_STEP_INDEX.category;
  if (!initialService) return BOOKING_STEP_INDEX.service;

  return personalizationFields[initialSelection.categoryId].length > 0
    ? BOOKING_STEP_INDEX.details
    : BOOKING_STEP_INDEX.extras;
}

export function useBookingWizard(onExit: () => void, initialSelection?: InitialBookingSelection) {
  const initialService = getInitialService(initialSelection);
  const [step, setStep] = useState(getInitialStep(initialSelection, initialService));
  const [category, setCategory] = useState<CategoryId | null>(initialSelection?.categoryId ?? null);
  const [service, setService] = useState<Service | null>(initialService);
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
  const [bookingRequestError, setBookingRequestError] = useState<string | null>(null);

  const data: SummaryData = useMemo(
    () => ({
      category,
      service,
      extras: chosenExtras,
      personalization: personal,
      date: date ? formatDateLabel(date) : null,
      time,
    }),
    [category, chosenExtras, date, personal, service, time],
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

  const chooseCategoryAndContinue = (categoryId: CategoryId) => {
    chooseCategory(categoryId);
    setStep(BOOKING_STEP_INDEX.service);
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
    if (getSlotsForDate(selectedDate).length === 0) return;

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

  const confirmBookingRequest = () => {
    setBookingRequestError(null);

    const payload = buildBookingRequestPayload({
      category,
      service,
      personal,
      chosenExtras,
      date,
      time,
      customer,
      isCustomerRecognized,
    });
    const payloadResult = bookingRequestPayloadSchema.safeParse(payload);

    if (!payloadResult.success) {
      console.error("Booking request payload validation error", payloadResult.error);
      setBookingRequestError(
        "No pudimos preparar la solicitud. Revisá tus datos o intentá nuevamente.",
      );
      return;
    }

    const bookingRequestPayload: BookingRequestPayloadInput = payloadResult.data;
    console.log("Booking request payload", bookingRequestPayload);
    setConfirmed(true);
  };

  const next = () => setStep((currentStep) => Math.min(currentStep + 1, BOOKING_STEPS.length - 1));
  const back = () => {
    if (step === BOOKING_STEP_INDEX.category) return onExit();
    setStep((currentStep) => currentStep - 1);
  };

  return {
    bookingRequestError,
    canNext,
    category,
    chooseCategory,
    chooseCategoryAndContinue,
    chooseDate,
    chooseCustomerField,
    choosePersonalization,
    chooseService,
    chosenExtras,
    confirmBookingRequest,
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
    setTime,
    step,
    time,
    toggleExtra,
  };
}
