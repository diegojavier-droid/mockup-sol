import { useEffect, useMemo, useRef, useState } from "react";
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
  extras,
  personalizationFields,
  services,
  type CategoryId,
  type Extra,
  type Personalization,
  type Service,
} from "@/lib/booking-data";
import { computeBookingOperationalTotals } from "@/lib/booking-totals";
import {
  clearBookingDraft,
  loadBookingDraft,
  saveBookingDraft,
  type BookingDraftState,
} from "@/lib/booking-draft-storage";
import type { BookingInitialSelection, BookingReturnTarget } from "../booking-navigation-types";
import type { SummaryData } from "../SummaryPanel";
import {
  BOOKING_STEP_LABELS,
  BOOKING_STEP_INDEX,
  type BookingStepKey,
  type WizardStep,
} from "../wizard/booking-steps";
import type {
  CustomerErrors,
  CustomerField,
  CustomerFormState,
  CustomerTouched,
} from "../steps/CustomerDataStep";

const alwaysVisibleSteps: BookingStepKey[] = ["category", "service"];
const checkoutSteps: BookingStepKey[] = ["dateTime", "customerData", "review"];

function categoryHasPersonalization(category: CategoryId | null) {
  return category ? personalizationFields[category].length > 0 : true;
}

function categoryHasExtras(category: CategoryId | null) {
  return category ? extras[category].length > 0 : true;
}

function buildVisibleBookingStepKeys(category: CategoryId | null): BookingStepKey[] {
  return [
    ...alwaysVisibleSteps,
    ...(categoryHasPersonalization(category) ? (["details"] as const) : []),
    ...(categoryHasExtras(category) ? (["extras"] as const) : []),
    ...checkoutSteps,
  ];
}

function getStepLabels(stepKeys: BookingStepKey[]) {
  return stepKeys.map((stepKey) => BOOKING_STEP_LABELS[stepKey]);
}

function getStepPosition(stepKeys: BookingStepKey[], stepKey: BookingStepKey): WizardStep {
  const position = stepKeys.indexOf(stepKey);
  return Math.max(position, 0);
}

function getStepKey(stepKeys: BookingStepKey[], step: WizardStep): BookingStepKey {
  return stepKeys[step] ?? stepKeys[stepKeys.length - 1];
}

function getNextStepAfterService(category: CategoryId | null): WizardStep {
  const stepKeys = buildVisibleBookingStepKeys(category);
  return getStepPosition(stepKeys, stepKeys[BOOKING_STEP_INDEX.service + 1] ?? "dateTime");
}

function clampWizardStep(value: number, stepKeys: BookingStepKey[]): WizardStep {
  const max = stepKeys.length - 1;
  return Math.min(Math.max(value, 0), max);
}

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
      email: customer.email,
      preferredContactChannel: "email",
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
    notificationChannels: {
      email: true,
      whatsapp: true,
    },
    reminder: {
      enabled: true,
      offsetMinutes: 30,
      channels: ["email", "whatsapp"],
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

  return getNextStepAfterService(initialSelection.categoryId);
}

function getServiceById(categoryId: CategoryId | null, serviceId: string | null): Service | null {
  if (!categoryId || !serviceId) return null;

  return (
    services[categoryId].find((availableService) => availableService.id === serviceId) ?? null
  );
}

function getExtrasByIds(categoryId: CategoryId | null, extraIds: string[]) {
  if (!categoryId) return [];

  return extras[categoryId].filter((extra) => extraIds.includes(extra.id));
}

function getRestoredStep(
  stepKey: BookingStepKey,
  categoryId: CategoryId | null,
  selectedService: Service | null,
): WizardStep {
  const stepKeys = buildVisibleBookingStepKeys(categoryId);
  if (!categoryId) return getStepPosition(stepKeys, "category");
  if (!selectedService && BOOKING_STEP_INDEX[stepKey] > BOOKING_STEP_INDEX.service) {
    return getStepPosition(stepKeys, "service");
  }

  const restoredStep = stepKeys.indexOf(stepKey);

  if (restoredStep >= 0) return restoredStep;

  return clampWizardStep(BOOKING_STEP_INDEX[stepKey] ?? BOOKING_STEP_INDEX.category, stepKeys);
}

function getInitialDraftState(initialSelection?: BookingInitialSelection) {
  if (initialSelection?.categoryId || initialSelection?.serviceId) {
    clearBookingDraft();
    return null;
  }

  return loadBookingDraft()?.state ?? null;
}

export function useBookingWizard(
  onExit: () => void,
  initialSelection?: BookingInitialSelection,
  navigationContext?: BookingNavigationContext,
) {
  const [restoredDraft] = useState<BookingDraftState | null>(() =>
    getInitialDraftState(initialSelection),
  );
  const initialService = getInitialService(initialSelection);
  const restoredService = restoredDraft
    ? getServiceById(restoredDraft.selectedCategoryId, restoredDraft.selectedServiceId)
    : null;
  const initialStep = restoredDraft
    ? getRestoredStep(
        restoredDraft.currentStepKey,
        restoredDraft.selectedCategoryId,
        restoredService,
      )
    : getInitialStep(initialSelection, initialService);
  const initialStepRef = useRef<WizardStep>(initialStep);
  const [step, setStep] = useState<WizardStep>(initialStep);
  const [category, setCategory] = useState<CategoryId | null>(
    restoredDraft?.selectedCategoryId ?? initialSelection?.categoryId ?? null,
  );
  const [service, setService] = useState<Service | null>(restoredService ?? initialService);
  const [personal, setPersonal] = useState<Personalization>(restoredDraft?.personalization ?? {});
  const [additionalComments, setAdditionalComments] = useState(
    restoredDraft?.additionalComments ?? "",
  );
  const [chosenExtras, setChosenExtras] = useState<Extra[]>(
    restoredDraft
      ? getExtrasByIds(restoredDraft.selectedCategoryId, restoredDraft.selectedExtras)
      : [],
  );
  const [date, setDate] = useState<string | null>(restoredDraft?.selectedDate ?? null);
  const [time, setTime] = useState<string | null>(restoredDraft?.selectedTime ?? null);
  const [customer, setCustomer] = useState<CustomerFormState>({
    firstName: restoredDraft?.customer.firstName ?? "",
    whatsapp: restoredDraft?.customer.whatsapp ?? "",
    email: restoredDraft?.customer.email ?? "",
    notes: restoredDraft?.customer.notes ?? "",
  });
  const [customerTouched, setCustomerTouched] = useState<CustomerTouched>({});
  const [isCustomerRecognized, setIsCustomerRecognized] = useState(false);
  const [paymentPending, setPaymentPending] = useState(restoredDraft?.paymentPending ?? false);
  const [bookingRequestError, setBookingRequestError] = useState<string | null>(null);

  const visibleStepKeys = useMemo(() => buildVisibleBookingStepKeys(category), [category]);
  const stepKey = getStepKey(visibleStepKeys, step);
  const stepLabels = useMemo(() => getStepLabels(visibleStepKeys), [visibleStepKeys]);

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
    email: !customer.email.trim(),
  };
  const canRequestCustomerRequiredFeedback =
    stepKey === "customerData" &&
    (customerMissingRequiredFields.firstName ||
      customerMissingRequiredFields.whatsapp ||
      customerMissingRequiredFields.email);

  const canNext = useMemo(() => {
    if (stepKey === "category") return !!category;
    if (stepKey === "service") return !!service;
    if (stepKey === "details") {
      return category
        ? personalizationFields[category].every((field) => personal[field.id])
        : false;
    }
    if (stepKey === "extras") return true;
    if (stepKey === "dateTime") return !!date && !!time;
    if (stepKey === "customerData")
      return Object.keys(customerValidationErrors).length === 0;
    return true;
  }, [category, customerValidationErrors, date, personal, service, stepKey, time]);

  useEffect(() => {
    const hasDraftContent =
      !!category ||
      !!service ||
      Object.keys(personal).length > 0 ||
      !!additionalComments ||
      chosenExtras.length > 0 ||
      !!date ||
      !!time ||
      !!customer.firstName ||
      !!customer.whatsapp ||
      !!customer.email ||
      !!customer.notes ||
      paymentPending;

    if (!hasDraftContent) {
      clearBookingDraft();
      return;
    }

    saveBookingDraft({
      currentStepKey: stepKey,
      selectedCategoryId: category,
      selectedServiceId: service?.id ?? null,
      personalization: personal,
      additionalComments,
      selectedExtras: chosenExtras.map((extra) => extra.id),
      selectedDate: date,
      selectedTime: time,
      customer,
      paymentPending,
    });
  }, [
    additionalComments,
    category,
    chosenExtras,
    customer,
    date,
    paymentPending,
    personal,
    service,
    stepKey,
    time,
  ]);

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
    clearBookingDraft();
    chooseCategory(categoryId);
    setStep(BOOKING_STEP_INDEX.service);
  };

  const chooseService = (selectedService: Service) => {
    setService(selectedService);
    setChosenExtras([]);
    setStep(getNextStepAfterService(category));
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
      ...(customerMissingRequiredFields.email ? { email: true } : {}),
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
    if (stepKey === "customerData") {
      if (Object.keys(customerValidationErrors).length === 0) {
        setStep((currentStep) => clampWizardStep(currentStep + 1, visibleStepKeys));
        return;
      }

      requestCustomerRequiredFeedback();
      return;
    }

    setStep((currentStep) => clampWizardStep(currentStep + 1, visibleStepKeys));
  };
  const back = () => {
    const shouldExitToReturnTarget = navigationContext && step === initialStepRef.current;

    if (shouldExitToReturnTarget) {
      return navigationContext.onExitToTarget(navigationContext.returnTarget);
    }

    if (stepKey === "category") {
      clearBookingDraft();
      return onExit();
    }

    setStep((currentStep) => clampWizardStep(currentStep - 1, visibleStepKeys));
  };

  const closeAndClearDraft = () => {
    clearBookingDraft();
    onExit();
  };

  return {
    additionalComments,
    bookingRequestError,
    canNext,
    canRequestCustomerRequiredFeedback,
    category,
    wasDraftRestored: !!restoredDraft,
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
    closeAndClearDraft,
    goNext: next,
    personal,
    service,
    isCustomerRecognized,
    setTime,
    step,
    stepKey,
    stepLabels,
    time,
    toggleExtra,
  };
}
