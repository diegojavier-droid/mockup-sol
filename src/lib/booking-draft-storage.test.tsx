import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { BookingConfirmation } from "@/components/booking/summary/BookingConfirmation";
import {
  BOOKING_DRAFT_STORAGE_KEY,
  BOOKING_DRAFT_VERSION,
  clearBookingDraft,
  loadBookingDraft,
  saveBookingDraft,
  type BookingDraftState,
} from "./booking-draft-storage";

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
const stored = new Map<string, string>();
const state: BookingDraftState = {
  currentStepKey: "customerData",
  selectedCategoryId: "depilacion",
  selectedServiceId: "cejas",
  personalization: {},
  additionalComments: "",
  selectedExtras: [],
  selectedDate: "2030-11-12",
  selectedTime: "12:00",
  customer: { firstName: "Prueba", whatsapp: "3425550000", email: "test@example.test" },
  paymentPending: false,
};

beforeEach(() => {
  stored.clear();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      sessionStorage: {
        getItem: (key: string) => stored.get(key) ?? null,
        setItem: (key: string, value: string) => stored.set(key, value),
        removeItem: (key: string) => stored.delete(key),
      },
    },
  });
});
afterEach(() => {
  if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
  else Reflect.deleteProperty(globalThis, "window");
});

describe("booking draft lifecycle", () => {
  test("preserves an unfinished selection on reload", () => {
    saveBookingDraft(state);
    expect(loadBookingDraft()?.state).toEqual(state);
  });

  test("the post-create effect cannot recreate a pending draft", () => {
    saveBookingDraft(state);
    clearBookingDraft();
    saveBookingDraft({ ...state, paymentPending: true });
    expect(loadBookingDraft()).toBeNull();
    expect(stored.has(BOOKING_DRAFT_STORAGE_KEY)).toBe(false);
  });

  test("a pending save removes any previous editable draft", () => {
    saveBookingDraft(state);
    saveBookingDraft({ ...state, paymentPending: true });
    expect(stored.size).toBe(0);
  });

  test("legacy pending drafts remain recognizable but cannot be saved again", () => {
    stored.set(
      BOOKING_DRAFT_STORAGE_KEY,
      JSON.stringify({
        version: BOOKING_DRAFT_VERSION,
        updatedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        state: { ...state, paymentPending: true },
      }),
    );
    const legacy = loadBookingDraft();
    expect(legacy?.state.paymentPending).toBe(true);
    saveBookingDraft(legacy!.state);
    expect(loadBookingDraft()).toBeNull();
  });

  test("storage denied at the getter does not break navigation or submission", () => {
    Object.defineProperty(window, "sessionStorage", {
      get() {
        throw new Error("Storage disabled");
      },
    });
    expect(() => saveBookingDraft(state)).not.toThrow();
    expect(() => saveBookingDraft({ ...state, paymentPending: true })).not.toThrow();
    expect(() => clearBookingDraft()).not.toThrow();
    expect(loadBookingDraft()).toBeNull();
  });

  test("legacy missing reference never displays a payable or confirmed booking", () => {
    const html = renderToStaticMarkup(<BookingConfirmation booking={null} onClose={() => {}} />);
    expect(html).toContain("No encontramos esa reserva");
    expect(html).toContain("Volver al inicio");
    expect(html).not.toContain("$0");
    expect(html).not.toContain("Pagar la seña");
    expect(html).not.toContain("Ya pagué");
    expect(html).not.toContain("Reserva guardada");
  });
});
