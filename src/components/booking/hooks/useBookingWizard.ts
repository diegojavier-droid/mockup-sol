import { useMemo, useRef, useState } from "react";
import {
  bookingRequestPayloadSchema,
  customerContactSchema,
  customerIdentitySchema,
} from "@/lib/booking-schema";
import type { BookingRequestPayloadInput, CustomerIdentityInput } from "@/lib/booking-schema";
import {
  formatDateLabel,
  getSlotsForDate,
  getTodayKey,
  personalizationFields,
  services,
  type CategoryId,
  type Extra,
  type Personalization,
  type Service,
} from "@/lib/booking-data";
import { computeBookingOperationalTotals } from "@/lib/booking-totals";
import type {
  BookingEntryPoint,
  BookingInitialSelection,
  BookingReturnTarget,
} from "../booking-navigation-types";
import type { SummaryData } from "../SummaryPanel";
import { BOOKING_STEP_INDEX, BOOKING_STEPS, type WizardStep } from "../wizard/booking-steps";

const clampWizardStep = (value: number): WizardStep => {
  const max = BOOKING_STEPS.length - 1;
  const clamped = Math.min(Math.max(value, 0), max);
  return clamped as WizardStep;
};
import type {
  CustomerErrors,
  CustomerField,
  CustomerFormState,
  CustomerTouched,
} from "../steps/CustomerDataStep";

const ADDITIONAL_COMMENTS_MAX_LENGTH = 500;

const mockReturningCustomers: CustomerFormState[] = [
  { firstName: "Mai", whatsapp: "342 555 1234", email: "mai@solmai.com", notes: "" },
  { firstName: "Sofía", whatsapp: "342 600 7788", email: "sofia@example.com", notes: "" },
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
  additionalComments: string;
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
  additionalComments,
  chosenExtras,
  date,
  time,
  customer,
  isCustomerRecognized,
}: BookingRequestPayloadDraftData): unknown {
  const totals = computeBookingOperationalTotals({
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
      notes: buildBookingNotes(additionalComments, customer.notes),
    },
    totals: {
      durationMinutes: totals.durationMinutes,
      priceAmount: totals.priceAmount,
      priceIsEstimated: totals.priceIsEstimated,
      depositAmount: totals.depositAmount,
      remainingAmount: totals.remainingAmount,
      depositRate: totals.depositRate,
      operationalBufferMinutes: totals.operationalBufferMinutes,
      blockedDurationMinutes: totals.blockedDurationMinutes,
    },
    status: "pending_payment",
  };
}

function buildBookingNotes(additionalComments: string, customerNotes: string) {
  const comments = additionalComments.trim();
  const notes = customerNotes.trim();

  if (comments && notes) {
    return `Comentarios adicionales: ${comments}\nMensaje: ${notes}`.slice(
      0,
      ADDITIONAL_COMMENTS_MAX_LENGTH,
    );
  }
  if (comments) return comments;
  if (notes) return notes;

  return undefined;
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

  if (customer.notes.length > 500) {
    errors.notes = "Máximo 500 caracteres";
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

interface BookingNavigationContext {
  entryPoint: BookingEntryPoint;
  onExitToTarget: (target: BookingReturnTarget) => void;
  returnTarget: BookingReturnTarget;
}

function getInitialService(initialSelection?: BookingInitialSelection): Service | null {
  if (!initialSelection?.categoryId || !initialSelection.serviceId) return null;

  return (
    services[initialSelection.categoryId].find(
      (availableService) => availableService.id === initialSelection.serviceId,
    ) ?? null
  );
}

function getInitialStep(
  initialSelection?: BookingInitialSelection,
  initialService?: Service | null,
): WizardStep {
  if (!initialSelection?.categoryId) return BOOKING_STEP_INDEX.category;
  if (!initialService) return BOOKING_STEP_INDEX.service;

  return personalizationFields[initialSelection.categoryId].length > 0
    ? BOOKING_STEP_INDEX.details
    : BOOKING_STEP_INDEX.extras;
}

export function useBookingWizard(
  onExit: () => void,
  initialSelection?: BookingInitialSelection,
  navigationContext?: BookingNavigationContext,
) {
  const initialService = getInitialService(initialSelection);
  const initialStep = getInitialStep(initialSelection, initialService);
  const initialStepRef = useRef<WizardStep>(initialStep);
  const [step, setStep] = useState<WizardStep>(initialStep);
  const [category, setCategory] = useState<CategoryId | null>(initialSelection?.categoryId ?? null);
  const [service, setService] = useState<Service | null>(initialService);
  const [personal, setPersonal] = useState<Personalization>({});
  const [additionalComments, setAdditionalComments] = useState("");
  const [chosenExtras, setChosenExtras] = useState<Extra[]>([]);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [customer, setCustomer] = useState<CustomerFormState>({
    firstName: "",
    whatsapp: "",
    email: "",
    notes: "",
  });
  const [customerTouched, setCustomerTouched] = useState<CustomerTouched>({});
  const [isCustomerRecognized, setIsCustomerRecognized] = useState(false);
  const [paymentPending, setPaymentPending] = useState(false);
  const [bookingRequestError, setBookingRequestError] = useState<string | null>(null);

  const availabilityRequest = useMemo(() => {
    const totals = computeBookingOperationalTotals({
      category,
      service,
      extras: chosenExtras,
      personalization: personal,
    });

    return {
      durationMinutes: totals.durationMinutes,
      operationalBufferMinutes: totals.operationalBufferMinutes,
      ...(category && service ? { areaId: category, capacityUnits: 1 } : {}),
    };
  }, [category, chosenExtras, personal, service]);

  const data: SummaryData = useMemo(
    () => ({
      category,
      service,
      extras: chosenExtras,
      personalization: personal,
      additionalComments,
      date: date ? formatDateLabel(date) : null,
      time,
    }),
    [additionalComments, category, chosenExtras, date, personal, service, time],
  );

  const customerValidationErrors = useMemo(() => validateCustomer(customer), [customer]);
  const customerMissingRequiredFields = {
    firstName: !customer.firstName.trim(),
    whatsapp: !customer.whatsapp.trim(),
  };
  const canRequestCustomerRequiredFeedback =
    step === BOOKING_STEP_INDEX.customerData &&
    (customerMissingRequiredFields.firstName || customerMissingRequiredFields.whatsapp);

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
      return Object.keys(customerValidationErrors).length === 0;
    return true;
  }, [category, customerValidationErrors, date, personal, service, step, time]);

  const resetSelectedTurnDetails = () => {
    setService(null);
    setPersonal({});
    setAdditionalComments("");
    setChosenExtras([]);
    setDate(null);
    setTime(null);
  };

  const chooseCategory = (categoryId: CategoryId) => {
    setCategory(categoryId);
    resetSelectedTurnDetails();
  };

  const chooseCategoryAndContinue = (categoryId: CategoryId) => {
    chooseCategory(categoryId);
    setStep(BOOKING_STEP_INDEX.service);
  };

  const chooseService = (selectedService: Service) => {
    setService(selectedService);
    setChosenExtras([]);
    setStep(
      category && personalizationFields[category].length > 0
        ? BOOKING_STEP_INDEX.details
        : BOOKING_STEP_INDEX.extras,
    );
  };

  const choosePersonalization = (fieldId: string, option: string) => {
    setPersonal((current) => ({ ...current, [fieldId]: option }));
  };

  const chooseAdditionalComments = (value: string) => {
    setAdditionalComments(value.slice(0, ADDITIONAL_COMMENTS_MAX_LENGTH));
  };

  const toggleExtra = (extra: Extra) => {
    setChosenExtras((current) =>
      current.some((chosenExtra) => chosenExtra.id === extra.id)
        ? current.filter((chosenExtra) => chosenExtra.id !== extra.id)
        : [...current, extra],
    );
  };

  const chooseDate = (selectedDate: string) => {
    if (getSlotsForDate(selectedDate, getTodayKey(), availabilityRequest).length === 0) return;

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
            notes: current.notes,
          };
        }

        setIsCustomerRecognized(false);
      }

      return nextCustomer;
    });
  };

  const customerErrors = getVisibleCustomerErrors(customerValidationErrors, customerTouched);

  const requestCustomerRequiredFeedback = () => {
    setCustomerTouched((current) => ({
      ...current,
      ...(customerMissingRequiredFields.firstName ? { firstName: true } : {}),
      ...(customerMissingRequiredFields.whatsapp ? { whatsapp: true } : {}),
    }));
  };

  const confirmBookingRequest = () => {
    setBookingRequestError(null);

    const payload = buildBookingRequestPayload({
      category,
      service,
      personal,
      additionalComments,
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
    setPaymentPending(true);
  };

  const next = () => {
    if (step === BOOKING_STEP_INDEX.customerData) {
      if (Object.keys(customerValidationErrors).length === 0) {
        setStep((currentStep) => clampWizardStep(currentStep + 1));
        return;
      }

      requestCustomerRequiredFeedback();
      return;
    }

    setStep((currentStep) => clampWizardStep(currentStep + 1));
  };
  const back = () => {
    const shouldExitToReturnTarget =
      navigationContext &&
      navigationContext.entryPoint !== "hero-reserve" &&
      step === initialStepRef.current;

    if (shouldExitToReturnTarget) {
      return navigationContext.onExitToTarget(navigationContext.returnTarget);
    }

    if (step === BOOKING_STEP_INDEX.category) return onExit();

    if (step === BOOKING_STEP_INDEX.service && navigationContext?.entryPoint === "hero-reserve") {
      setCategory(null);
      resetSelectedTurnDetails();
    }

    setStep((currentStep) => clampWizardStep(currentStep - 1));
  };

  return {
    additionalComments,
    bookingRequestError,
    canNext,
    canRequestCustomerRequiredFeedback,
    category,
    chooseCategory,
    chooseAdditionalComments,
    chooseCategoryAndContinue,
    chooseDate,
    chooseCustomerField,
    choosePersonalization,
    chooseService,
    chosenExtras,
    confirmBookingRequest,
    paymentPending,
    customer,
    customerErrors,
    data,
    date,
    availabilityRequest,
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
