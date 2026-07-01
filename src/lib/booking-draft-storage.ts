import type { CategoryId, Personalization } from "@/lib/booking-data";
import type { BookingStepKey } from "@/components/booking/wizard/booking-steps";
import type { CustomerFormState } from "@/components/booking/steps/CustomerDataStep";

export const BOOKING_DRAFT_STORAGE_KEY = "sol-mai-booking-draft-v1";
export const BOOKING_DRAFT_VERSION = 1;
const BOOKING_DRAFT_TTL_MS = 2 * 60 * 60 * 1000;

export interface BookingDraftState {
  currentStepKey: BookingStepKey;
  selectedCategoryId: CategoryId | null;
  selectedServiceId: string | null;
  personalization: Personalization;
  additionalComments: string;
  selectedExtras: string[];
  selectedDate: string | null;
  selectedTime: string | null;
  customer: CustomerFormState;
  paymentPending: boolean;
}

export interface BookingDraft {
  version: typeof BOOKING_DRAFT_VERSION;
  updatedAt: string;
  expiresAt: string;
  state: BookingDraftState;
}

const isBrowser = () =>
  typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";

function buildBookingDraft(state: BookingDraftState): BookingDraft {
  const updatedAt = new Date();
  const expiresAt = new Date(updatedAt.getTime() + BOOKING_DRAFT_TTL_MS);

  return {
    version: BOOKING_DRAFT_VERSION,
    updatedAt: updatedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    state,
  };
}

export function isBookingDraftExpired(draft: BookingDraft) {
  const expiresAt = Date.parse(draft.expiresAt);

  return Number.isNaN(expiresAt) || expiresAt <= Date.now();
}

function isBookingDraft(value: unknown): value is BookingDraft {
  if (!value || typeof value !== "object") return false;

  const draft = value as Partial<BookingDraft>;
  const state = draft.state as Partial<BookingDraftState> | undefined;

  return (
    draft.version === BOOKING_DRAFT_VERSION &&
    typeof draft.updatedAt === "string" &&
    typeof draft.expiresAt === "string" &&
    !!state &&
    typeof state === "object" &&
    typeof state.currentStepKey === "string" &&
    "selectedCategoryId" in state &&
    "selectedServiceId" in state &&
    typeof state.personalization === "object" &&
    Array.isArray(state.selectedExtras) &&
    "selectedDate" in state &&
    "selectedTime" in state &&
    typeof state.customer === "object" &&
    typeof state.paymentPending === "boolean"
  );
}

export function loadBookingDraft(): BookingDraft | null {
  if (!isBrowser()) return null;

  try {
    const rawDraft = window.sessionStorage.getItem(BOOKING_DRAFT_STORAGE_KEY);
    if (!rawDraft) return null;

    const parsedDraft: unknown = JSON.parse(rawDraft);
    if (!isBookingDraft(parsedDraft) || isBookingDraftExpired(parsedDraft)) {
      clearBookingDraft();
      return null;
    }

    return parsedDraft;
  } catch {
    clearBookingDraft();
    return null;
  }
}

export function saveBookingDraft(state: BookingDraftState) {
  if (!isBrowser()) return;

  try {
    window.sessionStorage.setItem(
      BOOKING_DRAFT_STORAGE_KEY,
      JSON.stringify(buildBookingDraft(state)),
    );
  } catch {
    // sessionStorage may be unavailable or full; the wizard must keep working in memory.
  }
}

export function clearBookingDraft() {
  if (!isBrowser()) return;

  try {
    window.sessionStorage.removeItem(BOOKING_DRAFT_STORAGE_KEY);
  } catch {
    // Ignore storage failures so navigation is never blocked.
  }
}
