export type {
  AppointmentMock,
  AreaId,
  AvailabilityRequest,
  AvailableSlot,
  BusinessHours,
  Category,
  CategoryId,
  ClosedDay,
  DayAvailabilityStatus,
  Extra,
  MockDate,
  ScheduleBlock,
  OperationalBufferSettings,
  Personalization,
  PersonalizationField,
  Service,
  Tag,
} from "./booking-types";
export { categories } from "./booking-mock/categories";
export { services } from "./booking-mock/services";
export { extras } from "./booking-mock/extras";
export { areaCapacities } from "./booking-mock/area-capacity";
export { personalizationFields } from "./booking-mock/personalization";
export {
  appointmentsMock,
  availableSlots,
  businessHours,
  closedDays,
  formatDateLabel,
  formatShortDate,
  getDayAvailabilityStatus,
  getMonthDays,
  getMonthKey,
  getMonthLabel,
  getSlotsForDate,
  getTodayKey,
  hasAvailableSlotsInMonth,
  mockDates,
  mockTimes,
  monthNames,
  scheduleBlocks,
} from "./booking-mock/availability";

export {
  getBlockedDurationMinutes,
  getOperationalBufferMinutes,
  operationalBufferSettings,
} from "./booking-operational-buffer";
