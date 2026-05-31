import { z } from "zod";

import type {
  BookingRequestPayload,
  BookingRequestResult,
  BookingSelection,
  BookingTotals,
  CustomerContact,
  CustomerIdentity,
  RecurringBookingPreference,
  ReturningCustomerLookup,
} from "./booking-types";

export const contactChannelSchema = z.enum(["whatsapp", "email", "phone"]);

export const customerTypeSchema = z.enum(["new", "returning", "unknown"]);

export const bookingStatusSchema = z.literal("requested");

export const recurringBookingFrequencySchema = z.enum(["daily", "weekly", "biweekly", "monthly"]);

const emptyStringToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

export const customerContactSchema: z.ZodType<CustomerContact> = z.object({
  whatsapp: z.string().trim().min(1, "WhatsApp es requerido"),
  email: z.string().trim().email("Email inválido").nullish(),
  phone: z.string().trim().min(1).nullish(),
  preferredContactChannel: contactChannelSchema,
  acceptsTransactionalMessages: z.boolean(),
  acceptsMarketingMessages: z.boolean(),
});

export const customerIdentitySchema: z.ZodType<CustomerIdentity> = z.object({
  type: customerTypeSchema,
  firstName: z.string().trim().min(1, "Nombre es requerido"),
  lastName: z.string().trim().min(1).nullish(),
  contact: customerContactSchema,
});

export const returningCustomerLookupSchema: z.ZodType<ReturningCustomerLookup> = z
  .object({
    whatsapp: z.preprocess(emptyStringToUndefined, z.string().trim().min(1).optional()),
    email: z.preprocess(
      emptyStringToUndefined,
      z.string().trim().email("Email inválido").nullish(),
    ),
  })
  .refine((lookup) => Boolean(lookup.whatsapp || lookup.email), {
    message: "Informá WhatsApp o email para buscar la clienta",
  });

export const bookingSelectionSchema: z.ZodType<BookingSelection> = z.object({
  categoryId: z.enum(["peluqueria", "maquillaje", "unas"]),
  serviceId: z.string().trim().min(1, "Servicio es requerido"),
  extraIds: z.array(z.string().trim().min(1)).optional(),
  personalization: z.record(z.string()).optional(),
  dateId: z.string().trim().min(1, "Fecha es requerida"),
  time: z.string().trim().min(1, "Horario es requerido"),
  notes: z.string().trim().max(500, "Máximo 500 caracteres").optional(),
});

export const bookingTotalsSchema: z.ZodType<BookingTotals> = z.object({
  durationMinutes: z.number().positive("La duración debe ser positiva"),
  priceAmount: z.number().positive("El precio debe ser positivo").nullable(),
  priceIsEstimated: z.boolean(),
  operationalBufferMinutes: z.number().int().min(0).optional(),
  blockedDurationMinutes: z.number().positive().optional(),
});

export const recurringBookingPreferenceSchema: z.ZodType<RecurringBookingPreference> = z.object({
  frequency: recurringBookingFrequencySchema,
  preferredWeekdays: z.array(z.number().int().min(0).max(6)).optional(),
  preferredTime: z.string().trim().min(1).nullish(),
  notes: z.string().trim().min(1).nullish(),
});

export const bookingRequestPayloadSchema: z.ZodType<BookingRequestPayload> = z.object({
  customer: customerIdentitySchema,
  selection: bookingSelectionSchema,
  totals: bookingTotalsSchema,
  recurringPreference: recurringBookingPreferenceSchema.nullish(),
  status: bookingStatusSchema,
});

export const bookingRequestResultSchema: z.ZodType<BookingRequestResult> = z.object({
  ok: z.boolean(),
  status: bookingStatusSchema,
  requestId: z.string().trim().min(1).nullish(),
  message: z.string().trim().min(1).nullish(),
});

export type CustomerContactInput = z.infer<typeof customerContactSchema>;
export type CustomerIdentityInput = z.infer<typeof customerIdentitySchema>;
export type ReturningCustomerLookupInput = z.infer<typeof returningCustomerLookupSchema>;
export type BookingSelectionInput = z.infer<typeof bookingSelectionSchema>;
export type BookingTotalsInput = z.infer<typeof bookingTotalsSchema>;
export type BookingRequestPayloadInput = z.infer<typeof bookingRequestPayloadSchema>;
export type BookingRequestResultInput = z.infer<typeof bookingRequestResultSchema>;
