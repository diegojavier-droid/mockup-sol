import type {
  AppointmentMock,
  AreaId,
  AvailabilityRequest,
  AvailableSlot,
  BusinessHours,
  ClosedDay,
  DayAvailabilityStatus,
  MockDate,
  ScheduleBlock,
} from "@/lib/booking-types";
import { areaCapacities } from "./area-capacity";

const weekdays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const longWeekdays = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export const monthNames = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const summerVacationClosedDays: ClosedDay[] = Array.from({ length: 28 }, (_, index) => ({
  date: `2027-02-${String(index + 1).padStart(2, "0")}`,
  reason: "Vacaciones",
  fullDay: true,
  active: true,
}));

export const businessHours: BusinessHours[] = [
  { weekday: 1, opensAt: "09:30", closesAt: "18:30", active: true },
  { weekday: 2, opensAt: "09:30", closesAt: "18:30", active: true },
  { weekday: 3, opensAt: "09:30", closesAt: "18:30", active: true },
  { weekday: 4, opensAt: "09:30", closesAt: "18:30", active: true },
  { weekday: 5, opensAt: "09:30", closesAt: "18:30", active: true },
  { weekday: 6, opensAt: "10:00", closesAt: "14:00", active: true },
];

export const closedDays: ClosedDay[] = [
  { date: "2026-06-20", reason: "Feriado", fullDay: true, active: true },
  { date: "2026-07-09", reason: "Feriado", fullDay: true, active: true },
  { date: "2026-07-20", reason: "Día personal", fullDay: true, active: false },
  { date: "2026-08-17", reason: "Feriado", fullDay: true, active: true },
  {
    date: "2026-12-24",
    reason: "Víspera de Navidad",
    fullDay: false,
    startsAt: "14:00",
    active: true,
  },
  { date: "2026-12-25", reason: "Navidad", fullDay: true, active: true },
  { date: "2027-01-01", reason: "Año nuevo", fullDay: true, active: true },
  ...summerVacationClosedDays,
];

export const scheduleBlocks: ScheduleBlock[] = [
  {
    date: "2026-06-21",
    startsAt: "13:00",
    endsAt: "18:00",
    reason: "Capacitación",
    active: true,
  },
  {
    date: "2026-06-24",
    startsAt: "09:30",
    endsAt: "12:30",
    reason: "Trámite personal",
    active: true,
  },
  {
    date: "2026-07-03",
    startsAt: "15:00",
    endsAt: "18:30",
    reason: "Evento externo",
    active: true,
  },
  {
    date: "2026-09-12",
    startsAt: "10:00",
    endsAt: "14:00",
    reason: "Capacitación",
    active: false,
  },
];

export const appointmentsMock: AppointmentMock[] = [
  {
    date: "2026-06-02",
    startsAt: "10:30",
    areaId: "peluqueria",
    serviceName: "Corte femenino",
    serviceDurationMinutes: 45,
    preparationMinutes: 10,
    blockedDurationMinutes: 55,
    active: true,
  },
  {
    date: "2026-06-02",
    startsAt: "11:30",
    areaId: "peluqueria",
    serviceName: "Brushing",
    serviceDurationMinutes: 30,
    preparationMinutes: 10,
    blockedDurationMinutes: 40,
    active: true,
  },
  {
    date: "2026-06-05",
    startsAt: "14:30",
    areaId: "maquillaje",
    serviceName: "Maquillaje social",
    serviceDurationMinutes: 45,
    preparationMinutes: 5,
    blockedDurationMinutes: 50,
    active: true,
  },
  {
    date: "2026-06-10",
    startsAt: "16:00",
    areaId: "peluqueria",
    serviceName: "Balayage",
    serviceDurationMinutes: 180,
    preparationMinutes: 15,
    blockedDurationMinutes: 195,
    active: true,
  },
  {
    date: "2026-07-14",
    startsAt: "09:30",
    areaId: "peluqueria",
    serviceName: "Corte femenino",
    serviceDurationMinutes: 45,
    preparationMinutes: 10,
    blockedDurationMinutes: 55,
    active: true,
  },
];

const slotIntervalMinutes = 60;

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function fromDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);

  return new Date(year, month - 1, day);
}

function toMinutes(time: string) {
  const [hours, minutes = 0] = time.split(":").map(Number);

  return hours * 60 + minutes;
}

function toTimeLabel(totalMinutes: number) {
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const minutes = String(totalMinutes % 60).padStart(2, "0");

  return `${hours}:${minutes}`;
}

function rangesOverlap(startA: number, endA: number, startB: number, endB: number) {
  return startA < endB && endA > startB;
}

function overlapsRange(slotStart: number, slotEnd: number, startsAt?: string, endsAt?: string) {
  const blockStart = toMinutes(startsAt ?? "00:00");
  const blockEnd = toMinutes(endsAt ?? "23:59");

  return rangesOverlap(slotStart, slotEnd, blockStart, blockEnd);
}

function getAppointmentEndMinutes(appointment: AppointmentMock) {
  return (
    toMinutes(appointment.startsAt) + (appointment.blockedDurationMinutes ?? slotIntervalMinutes)
  );
}

export function inferLegacyAreaId(serviceName?: string): AreaId {
  const normalizedServiceName = serviceName?.toLowerCase() ?? "";

  if (normalizedServiceName.includes("maquillaje")) return "maquillaje";

  if (
    ["uñas", "manicura", "semi", "kapping", "soft gel", "nail"].some((keyword) =>
      normalizedServiceName.includes(keyword),
    )
  ) {
    return "unas";
  }

  return "peluqueria";
}

export function resolveAppointmentAreaId(appointment: AppointmentMock): AreaId {
  return appointment.areaId ?? inferLegacyAreaId(appointment.serviceName);
}

export function getAppointmentCapacityUnits(appointment: AppointmentMock) {
  return appointment.capacityUnits ?? 1;
}

export function getAreaCapacity(areaId: AreaId) {
  return areaCapacities[areaId];
}

export function getTodayKey() {
  return toDateKey(new Date());
}

export function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function getMonthLabel(date: Date) {
  return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatDateLabel(dateKey: string) {
  const date = fromDateKey(dateKey);

  return `${longWeekdays[date.getDay()]} ${date.getDate()} de ${months[date.getMonth()]}`;
}

export function formatShortDate(dateKey: string): MockDate {
  const date = fromDateKey(dateKey);

  return {
    iso: dateKey,
    label: `${date.getDate()} ${months[date.getMonth()]}`,
    weekday: weekdays[date.getDay()],
    day: String(date.getDate()),
  };
}

export function getMonthDays(monthDate: Date) {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const totalDays = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
  const blanks = Array.from({ length: firstDay.getDay() }, () => null);
  const days = Array.from({ length: totalDays }, (_, index) =>
    toDateKey(new Date(monthDate.getFullYear(), monthDate.getMonth(), index + 1)),
  );

  return [...blanks, ...days];
}

export function getSlotsForDate(
  dateKey: string,
  todayKey = getTodayKey(),
  request: AvailabilityRequest = { durationMinutes: slotIntervalMinutes },
): string[] {
  if (dateKey < todayKey) return [];

  const date = fromDateKey(dateKey);
  const dayHours = businessHours.find((hours) => hours.weekday === date.getDay() && hours.active);

  if (!dayHours) return [];

  const fullDayClosed = closedDays.some(
    (closedDay) => closedDay.active && closedDay.fullDay && closedDay.date === dateKey,
  );

  if (fullDayClosed) return [];

  const dayClosedRanges = closedDays.filter(
    (closedDay) => closedDay.active && !closedDay.fullDay && closedDay.date === dateKey,
  );
  const dayBlocks = scheduleBlocks.filter((block) => block.active && block.date === dateKey);
  const dayAppointments = appointmentsMock.filter(
    (appointment) => appointment.active && appointment.date === dateKey,
  );
  const requestedAreaId = request.areaId;
  const requestedCapacityUnits = request.capacityUnits ?? 1;
  const areaCapacity = requestedAreaId ? getAreaCapacity(requestedAreaId) : 1;
  const areaAppointments = requestedAreaId
    ? dayAppointments.filter(
        (appointment) => resolveAppointmentAreaId(appointment) === requestedAreaId,
      )
    : dayAppointments;
  const slots: string[] = [];

  const requestedBlockedDuration =
    request.durationMinutes + (request.operationalBufferMinutes ?? 0);

  for (
    let minutes = toMinutes(dayHours.opensAt);
    minutes + requestedBlockedDuration <= toMinutes(dayHours.closesAt);
    minutes += slotIntervalMinutes
  ) {
    const slot = toTimeLabel(minutes);
    const slotEnd = minutes + requestedBlockedDuration;
    const isClosed = dayClosedRanges.some((range) =>
      overlapsRange(minutes, slotEnd, range.startsAt, range.endsAt),
    );
    const isBlocked = dayBlocks.some((block) =>
      overlapsRange(minutes, slotEnd, block.startsAt, block.endsAt),
    );
    const usedCapacity = areaAppointments.reduce((total, appointment) => {
      const appointmentOverlaps = rangesOverlap(
        minutes,
        slotEnd,
        toMinutes(appointment.startsAt),
        getAppointmentEndMinutes(appointment),
      );

      return appointmentOverlaps ? total + getAppointmentCapacityUnits(appointment) : total;
    }, 0);
    const hasCapacity = usedCapacity + requestedCapacityUnits <= areaCapacity;

    if (!isClosed && !isBlocked && hasCapacity) {
      slots.push(slot);
    }
  }

  return slots;
}

export function getDayAvailabilityStatus(
  dateKey: string,
  todayKey = getTodayKey(),
  request: AvailabilityRequest = { durationMinutes: slotIntervalMinutes },
): DayAvailabilityStatus {
  if (dateKey < todayKey) return "past";

  const date = fromDateKey(dateKey);
  const fullDayClosed = closedDays.some(
    (closedDay) => closedDay.active && closedDay.fullDay && closedDay.date === dateKey,
  );

  if (fullDayClosed) return "closed";

  const dayHours = businessHours.find((hours) => hours.weekday === date.getDay() && hours.active);

  if (!dayHours || getSlotsForDate(dateKey, todayKey, request).length === 0) return "unavailable";

  return "available";
}

export function hasAvailableSlotsInMonth(
  monthDate: Date,
  todayKey = getTodayKey(),
  request: AvailabilityRequest = { durationMinutes: slotIntervalMinutes },
) {
  return getMonthDays(monthDate).some(
    (dateKey) => dateKey && getDayAvailabilityStatus(dateKey, todayKey, request) === "available",
  );
}

export const availableSlots: AvailableSlot[] = (() => {
  const today = new Date();
  const horizonEnd = new Date(today.getFullYear() + 1, today.getMonth() + 7, 0);
  const slots: AvailableSlot[] = [];

  for (const cursor = new Date(today); cursor <= horizonEnd; cursor.setDate(cursor.getDate() + 1)) {
    const date = toDateKey(cursor);
    const times = getSlotsForDate(date, toDateKey(today));

    if (times.length > 0) {
      slots.push({ date, times });
    }
  }

  return slots;
})();

export const mockDates = Array.from({ length: 10 }, (_, index) => {
  const date = new Date();
  date.setDate(date.getDate() + index + 1);

  return formatShortDate(toDateKey(date));
});

export const mockTimes = ["09:30", "10:30", "11:30", "13:00", "14:30", "16:00", "17:30", "18:30"];
