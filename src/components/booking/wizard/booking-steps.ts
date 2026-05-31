export const BOOKING_STEPS = [
  "Categoría",
  "Servicio",
  "Detalles",
  "Extras",
  "Fecha y hora",
  "Tus datos",
  "Resumen",
] as const;

export const BOOKING_STEP_INDEX = {
  category: 0,
  service: 1,
  details: 2,
  extras: 3,
  dateTime: 4,
  customerData: 5,
  review: 6,
} as const;

export type WizardStep = (typeof BOOKING_STEP_INDEX)[keyof typeof BOOKING_STEP_INDEX];

export const FINAL_BOOKING_STEP: WizardStep = BOOKING_STEP_INDEX.review;
