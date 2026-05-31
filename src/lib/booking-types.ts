export type CategoryId = "peluqueria" | "maquillaje" | "unas";

export type Tag = "popular" | "combinado" | "tratamiento" | "color" | "evento";

export interface Category {
  id: CategoryId;
  name: string;
  tagline: string;
  emoji: string;
}

export interface Service {
  id: string;
  name: string;
  desc: string;
  duration: string;
  durationMinutes: number;
  price: string;
  priceAmount: number;
  tag?: Tag;
}

export interface Extra {
  id: string;
  name: string;
  durationMinutes: number;
  price: string;
  priceAmount: number;
}

export interface PersonalizationField {
  id: string;
  label: string;
  options: string[];
}

export interface MockDate {
  iso: string;
  label: string;
  weekday: string;
  day: string;
}

export interface BusinessHours {
  weekday: number;
  opensAt: string;
  closesAt: string;
  active: boolean;
}

export interface ClosedDay {
  date: string;
  reason: string;
  fullDay: boolean;
  startsAt?: string;
  endsAt?: string;
  active: boolean;
}

export interface ScheduleBlock {
  date: string;
  startsAt: string;
  endsAt: string;
  reason: string;
  active: boolean;
}

export interface AppointmentMock {
  date: string;
  startsAt: string;
  active: boolean;
}

export interface AvailableSlot {
  date: string;
  times: string[];
}

export type DayAvailabilityStatus = "available" | "past" | "closed" | "unavailable";

export type Personalization = Record<string, string>;

export type ContactChannel = "whatsapp" | "email" | "phone";

export type CustomerType = "new" | "returning" | "unknown";

export interface CustomerContact {
  whatsapp: string;
  email?: string | null;
  phone?: string | null;
  preferredContactChannel: ContactChannel;
  acceptsTransactionalMessages: boolean;
  acceptsMarketingMessages: boolean;
}

export interface CustomerIdentity {
  type: CustomerType;
  firstName: string;
  lastName?: string | null;
  contact: CustomerContact;
}

export interface ReturningCustomerLookup {
  whatsapp?: string;
  email?: string | null;
}

export type BookingStatus = "requested";

export interface BookingSelection {
  categoryId: CategoryId;
  serviceId: string;
  extraIds?: string[];
  personalization?: Personalization;
  dateId: string;
  time: string;
}

export interface BookingTotals {
  durationMinutes: number;
  priceAmount: number | null;
  priceIsEstimated: boolean;
}

export type RecurringBookingFrequency = "daily" | "weekly" | "biweekly" | "monthly";

export interface RecurringBookingPreference {
  frequency: RecurringBookingFrequency;
  preferredWeekdays?: number[];
  preferredTime?: string | null;
  notes?: string | null;
}

export interface BookingRequestPayload {
  customer: CustomerIdentity;
  selection: BookingSelection;
  totals: BookingTotals;
  recurringPreference?: RecurringBookingPreference | null;
  status: BookingStatus;
}

export interface BookingRequestResult {
  ok: boolean;
  status: BookingStatus;
  requestId?: string | null;
  message?: string | null;
}
