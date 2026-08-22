import { useEffect, useMemo, useRef, useState } from "react";
import {
  bookingRequestPayloadSchema,
  customerContactSchema,
  customerIdentitySchema,
} from "@/lib/booking-schema";
import type { BookingRequestPayloadInput, CustomerIdentityInput } from "@/lib/booking-schema";
import {
  formatDateLabel,
  type CategoryId,
  type Extra,
  type Personalization,
  type Service,
} from "@/lib/booking-data";
import { useCatalog, type CatalogData } from "@/lib/catalog-context";
import { useAvailability, useCreateBooking, useQuote } from "@/lib/api/booking-hooks";
import type { ApiCreatedBooking, LengthTier } from "@/lib/api/catalog-types";
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

/** Mismo criterio que el generador de seed: la etiqueta viaja como slug. */
function slugifyOption(label: string) {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
const checkoutSteps: BookingStepKey[] = ["dateTime", "customerData", "review"];

function categoryHasPersonalization(catalog: CatalogData, category: CategoryId | null) {
  return category ? catalog.personalizationFields[category].length > 0 : true;
}

function categoryHasExtras(catalog: CatalogData, category: CategoryId | null) {
  return category ? catalog.extras[category].length > 0 : true;
}

// El wizard sólo muestra pasos que piden una decisión real: si el
// servicio no tiene personalización o extras, esos pasos no existen.
function buildVisibleBookingStepKeys(
  catalog: CatalogData,
  category: CategoryId | null,
): BookingStepKey[] {
  return [
    ...alwaysVisibleSteps,
    ...(categoryHasPersonalization(catalog, category) ? (["details"] as const) : []),
    ...(categoryHasExtras(catalog, category) ? (["extras"] as const) : []),
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

function getNextStepAfterService(catalog: CatalogData, category: CategoryId | null): WizardStep {
  const stepKeys = buildVisibleBookingStepKeys(catalog, category);
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

function getInitialService(
  catalog: CatalogData,
  initialSelection?: BookingInitialSelection,
): Service | null {
  if (!initialSelection?.categoryId || !initialSelection.serviceId) return null;

  return (
    catalog.services[initialSelection.categoryId].find(
      (availableService) => availableService.id === initialSelection.serviceId,
    ) ?? null
  );
}

function getInitialStep(
  catalog: CatalogData,
  initialSelection?: BookingInitialSelection,
  initialService?: Service | null,
): WizardStep {
  if (!initialSelection?.categoryId) return BOOKING_STEP_INDEX.category;
  if (!initialService) return BOOKING_STEP_INDEX.service;

  return getNextStepAfterService(catalog, initialSelection.categoryId);
}

function getServiceById(
  catalog: CatalogData,
  categoryId: CategoryId | null,
  serviceId: string | null,
): Service | null {
  if (!categoryId || !serviceId) return null;

  return (
    catalog.services[categoryId].find((availableService) => availableService.id === serviceId) ??
    null
  );
}

function getExtrasByIds(catalog: CatalogData, categoryId: CategoryId | null, extraIds: string[]) {
  if (!categoryId) return [];

  return catalog.extras[categoryId].filter((extra) => extraIds.includes(extra.id));
}

function getRestoredStep(
  catalog: CatalogData,
  stepKey: BookingStepKey,
  categoryId: CategoryId | null,
  selectedService: Service | null,
): WizardStep {
  const stepKeys = buildVisibleBookingStepKeys(catalog, categoryId);
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
  const catalog = useCatalog();
  const [restoredDraft] = useState<BookingDraftState | null>(() =>
    getInitialDraftState(initialSelection),
  );
  const initialService = getInitialService(catalog, initialSelection);
  const restoredService = restoredDraft
    ? getServiceById(catalog, restoredDraft.selectedCategoryId, restoredDraft.selectedServiceId)
    : null;
  const initialStep = restoredDraft
    ? getRestoredStep(
        catalog,
        restoredDraft.currentStepKey,
        restoredDraft.selectedCategoryId,
        restoredService,
      )
    : getInitialStep(catalog, initialSelection, initialService);
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
      ? getExtrasByIds(catalog, restoredDraft.selectedCategoryId, restoredDraft.selectedExtras)
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
  const [confirmedBooking, setConfirmedBooking] = useState<ApiCreatedBooking | null>(null);

  const visibleStepKeys = useMemo(
    () => buildVisibleBookingStepKeys(catalog, category),
    [catalog, category],
  );
  const stepKey = getStepKey(visibleStepKeys, step);
  const stepLabels = useMemo(() => getStepLabels(visibleStepKeys), [visibleStepKeys]);

  // El largo es una dimensión estructural: selecciona el tier de precio
  // y duración en el backend. El resto de las respuestas son modificadores.
  const lengthTier = useMemo<LengthTier | null>(() => {
    const raw = personal["largo"];
    if (!raw) return null;
    const map: Record<string, LengthTier> = {
      Corto: "corto",
      "Media melena": "medio",
      Largo: "largo",
      "Muy largo": "xl",
    };
    return map[raw] ?? null;
  }, [personal]);

  const personalizationSlugs = useMemo(() => {
    const out: Record<string, string> = {};
    for (const [fieldId, option] of Object.entries(personal)) {
      if (fieldId === "largo") continue;
      out[fieldId] = slugifyOption(option);
    }
    return out;
  }, [personal]);

  const quoteInput = useMemo(
    () => ({
      serviceSlug: service?.id ?? null,
      lengthTier,
      personalization: personalizationSlugs,
      extraCodes: chosenExtras.map((extra) => extra.id),
    }),
    [service?.id, lengthTier, personalizationSlugs, chosenExtras],
  );

  // Precio y duración los calcula el backend: el frontend sólo muestra.
  const quoteQuery = useQuote(quoteInput);
  const quote = quoteQuery.data ?? null;

  const availabilityQuery = useAvailability(quoteInput);
  const availableDays = useMemo(() => availabilityQuery.data?.days ?? [], [availabilityQuery.data]);
  const bookableOnline = availabilityQuery.data?.bookableOnline ?? true;

  const slotsByDate = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const day of availableDays) map.set(day.date, day.times);
    return map;
  }, [availableDays]);

  const createBookingMutation = useCreateBooking();

  const availabilityRequest = useMemo(() => {
    return {
      durationMinutes: quote?.durationShownMin ?? 0,
      ...(category && service ? { areaId: category, capacityUnits: 1 } : {}),
    };
  }, [quote?.durationShownMin, category, service]);

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
        ? catalog.personalizationFields[category].every((field) => personal[field.id])
        : false;
    }
    if (stepKey === "extras") return true;
    if (stepKey === "dateTime") return !!date && !!time;
    if (stepKey === "customerData") return Object.keys(customerValidationErrors).length === 0;
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
    setStep(getNextStepAfterService(catalog, category));
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
    if ((slotsByDate.get(selectedDate) ?? []).length === 0) return;

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

  /**
   * Crea la reserva de verdad. El backend recalcula precio y duración,
   * así que lo que se manda es la selección, nunca importes.
   */
  const confirmBookingRequest = async () => {
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

    if (!payloadResult.success || !service || !date || !time) {
      setBookingRequestError(
        "No pudimos preparar la solicitud. Revisá tus datos o intentá nuevamente.",
      );
      return;
    }

    try {
      const created = await createBookingMutation.mutateAsync({
        serviceSlug: service.id,
        lengthTier,
        personalization: personalizationSlugs,
        extraCodes: chosenExtras.map((extra) => extra.id),
        // El horario elegido es hora del salón (Santa Fe, UTC-3).
        startsAt: `${date}T${time}:00-03:00`,
        customer: {
          firstName: customer.firstName.trim(),
          phone: customer.whatsapp.trim(),
          email: customer.email.trim(),
          acceptsMarketing: false,
        },
        note: additionalComments.trim() || undefined,
      });

      setConfirmedBooking(created);
      setPaymentPending(true);
      clearBookingDraft();
    } catch (error) {
      // El backend habla en lenguaje humano; se muestra tal cual.
      setBookingRequestError(
        error instanceof Error ? error.message : "No pudimos confirmar el turno. Intentá otra vez.",
      );
    }
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
    confirmedBooking,
    isConfirming: createBookingMutation.isPending,
    quote,
    quoteError: quoteQuery.error as Error | null,
    availableDays,
    slotsByDate,
    bookableOnline,
    isLoadingAvailability: availabilityQuery.isLoading,
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
