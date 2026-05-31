import type { CategoryId, OperationalBufferSettings, Service } from "@/lib/booking-types";

export const operationalBufferSettings: OperationalBufferSettings = {
  defaultBufferMinutes: 10,
  byCategory: {
    peluqueria: 10,
    maquillaje: 5,
    unas: 5,
  },
  byServiceId: {
    balayage: 15,
    alisado: 15,
  },
  active: true,
};

export function getOperationalBufferMinutes({
  category,
  service,
  settings = operationalBufferSettings,
}: {
  category: CategoryId | null;
  service: Pick<Service, "id"> | null;
  settings?: OperationalBufferSettings;
}) {
  if (!settings.active) return 0;

  if (service?.id && settings.byServiceId[service.id] !== undefined) {
    return settings.byServiceId[service.id];
  }

  if (category && settings.byCategory[category] !== undefined) {
    return settings.byCategory[category] ?? settings.defaultBufferMinutes;
  }

  return settings.defaultBufferMinutes;
}

export function getBlockedDurationMinutes({
  visibleDurationMinutes,
  operationalBufferMinutes,
}: {
  visibleDurationMinutes: number;
  operationalBufferMinutes: number;
}) {
  return visibleDurationMinutes + operationalBufferMinutes;
}
