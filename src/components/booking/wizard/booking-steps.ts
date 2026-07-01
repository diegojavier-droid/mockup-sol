export const BOOKING_STEP_KEYS = [
  "category",
  "service",
  "details",
  "extras",
  "dateTime",
  "customerData",
  "review",
] as const;

export type BookingStepKey = (typeof BOOKING_STEP_KEYS)[number];

export const BOOKING_STEP_LABELS: Record<BookingStepKey, string> = {
  category: "Categoría",
  service: "Servicio",
  details: "Detalles",
  extras: "Extras",
  dateTime: "Fecha y hora",
  customerData: "Tus datos",
  review: "Resumen",
};

export const BOOKING_STEPS = BOOKING_STEP_KEYS.map((key) => BOOKING_STEP_LABELS[key]);

export const BOOKING_STEP_INDEX: Record<BookingStepKey, number> = {
  category: 0,
  service: 1,
  details: 2,
  extras: 3,
  dateTime: 4,
  customerData: 5,
  review: 6,
};

export type WizardStep = number;

export const FINAL_BOOKING_STEP: WizardStep = BOOKING_STEP_INDEX.review;
