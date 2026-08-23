import { extras as extrasByCategory } from "@/lib/booking-mock/extras";
import { services } from "@/lib/booking-mock/services";
import {
  bookingServiceRuleMatrix,
  getPersonalizationImpactLabel,
  validateBookingRuleCoverage,
} from "@/lib/booking-rules";
import { computeBookingOperationalTotals, computeBookingTotals } from "@/lib/booking-totals";
import { appointmentsMock, getSlotsForDate } from "@/lib/booking-mock/availability";
import { getOperationalBufferMinutes } from "@/lib/booking-operational-buffer";
import type { AppointmentMock, AreaId, CategoryId, Personalization } from "@/lib/booking-types";

const failures: string[] = [];
const coverage = validateBookingRuleCoverage();

if (!coverage.ok) failures.push(`Rule coverage failed: ${JSON.stringify(coverage)}`);

const findService = (category: CategoryId, serviceId: string) => {
  const service = services[category].find((candidate) => candidate.id === serviceId);

  if (!service) throw new Error(`Unknown service ${category}/${serviceId}`);

  return service;
};

const assert = (condition: boolean, message: string) => {
  if (!condition) failures.push(message);
};

const makeAppointment = (overrides: Partial<AppointmentMock>): AppointmentMock => ({
  date: "2026-06-06",
  startsAt: "10:00",
  areaId: "peluqueria",
  serviceName: "Corte femenino",
  blockedDurationMinutes: 60,
  active: true,
  ...overrides,
});

const availableAtTen = (areaId: AreaId, capacityUnits = 1) =>
  getSlotsForDate("2026-06-06", "2026-05-31", {
    durationMinutes: 45,
    operationalBufferMinutes: 15,
    areaId,
    capacityUnits,
  }).includes("10:00");

const withTemporaryAppointments = (temporaryAppointments: AppointmentMock[], test: () => void) => {
  const originalLength = appointmentsMock.length;

  appointmentsMock.push(...temporaryAppointments);

  try {
    test();
  } finally {
    appointmentsMock.splice(originalLength);
  }
};

const findExtra = (category: CategoryId, extraId: string) => {
  const extra = extrasByCategory[category].find((candidate) => candidate.id === extraId);

  if (!extra) throw new Error(`Unknown extra ${category}/${extraId}`);

  return extra;
};

const totals = (
  category: CategoryId,
  serviceId: string,
  personalization: Personalization,
  extraIds: string[] = [],
) =>
  computeBookingTotals({
    category,
    service: findService(category, serviceId),
    extras: extraIds.map((extraId) => findExtra(category, extraId)),
    personalization,
  });

const operationalTotals = (
  category: CategoryId,
  serviceId: string,
  personalization: Personalization,
  extraIds: string[] = [],
) =>
  computeBookingOperationalTotals({
    category,
    service: findService(category, serviceId),
    extras: extraIds.map((extraId) => findExtra(category, extraId)),
    personalization,
  });

const impact = (category: CategoryId, serviceId: string, fieldId: string, option: string) =>
  getPersonalizationImpactLabel({
    category,
    service: findService(category, serviceId),
    fieldId,
    option,
  });

const cases: Array<[CategoryId, string, Personalization]> = [
  ["peluqueria", "corte-fem", { largo: "Muy largo", densidad: "Abundante", tipo: "Rizado" }],
  ["peluqueria", "brushing", { largo: "Muy largo", densidad: "Abundante", tipo: "Crespo" }],
  ["peluqueria", "balayage", { largo: "Largo", densidad: "Abundante", tipo: "Rizado" }],
  ["peluqueria", "color-global", { largo: "Largo", densidad: "Abundante", tipo: "Rizado" }],
  ["peluqueria", "retoque-raiz", { largo: "Muy largo", densidad: "Abundante", tipo: "Crespo" }],
  ["peluqueria", "alisado", { largo: "Largo", densidad: "Abundante", tipo: "Crespo" }],
  ["peluqueria", "nutricion", { largo: "Largo", densidad: "Abundante", tipo: "Rizado" }],
  ["maquillaje", "mk-social", { prueba: "Sí", estilo: "Glam" }],
  ["unas", "semi", { estado: "Con semipermanente", terminacion: "Color liso" }],
];

for (const [category, serviceId, personalization] of cases) {
  assert(
    Boolean(bookingServiceRuleMatrix[serviceId]),
    `${serviceId} has no explicit service matrix entry`,
  );
  assert(
    totals(category, serviceId, personalization).durationMinutes >=
      findService(category, serviceId).durationMinutes,
    `${serviceId} total duration regressed`,
  );
}

assert(
  totals("peluqueria", "corte-fem", { largo: "Muy largo" }).durationMinutes === 70,
  "Corte femenino very long hair must add 25 min",
);
assert(
  impact("peluqueria", "corte-fem", "largo", "Muy largo") === "+25 min",
  "Corte femenino impact chip must match duration-only rule",
);
assert(
  totals("peluqueria", "brushing", { densidad: "Abundante" }).priceAmount === 11000,
  "Brushing abundant density must add 10% price",
);
assert(
  impact("peluqueria", "retoque-raiz", "tipo", "Crespo") === null,
  "Retoque root hair type is contextual and must not show impact chip",
);
assert(
  totals("maquillaje", "mk-social", { prueba: "Sí" }).durationMinutes === 45,
  "Makeup personalization must not alter totals",
);
assert(
  impact("maquillaje", "mk-social", "prueba", "Sí") === null,
  "Makeup contextual answer must not show impact chip",
);
assert(
  totals("unas", "semi", { estado: "Con semipermanente" }, ["retiro-extra"]).durationMinutes === 70,
  "Nails removal extra must add 25 min",
);
assert(
  totals("unas", "semi", { estado: "Con semipermanente" }, ["retiro-extra"]).priceAmount === 13500,
  "Nails removal extra must add fixed price",
);
assert(
  impact("unas", "semi", "estado", "Con semipermanente") === null,
  "Nails current state is contextual and must not show impact chip",
);

const corteVisibleTotals = totals("peluqueria", "corte-fem", {});
const corteOperationalTotals = operationalTotals("peluqueria", "corte-fem", {});
assert(
  corteVisibleTotals.durationMinutes === 45,
  "Corte femenino visible duration must remain 45 min",
);
assert(
  corteOperationalTotals.operationalBufferMinutes === 10,
  "Corte femenino must apply peluqueria internal preparation time",
);
assert(
  corteOperationalTotals.blockedDurationMinutes ===
    corteVisibleTotals.durationMinutes + corteOperationalTotals.operationalBufferMinutes,
  "Corte femenino blocked duration must be visible duration plus buffer",
);

const balayageOperationalTotals = operationalTotals(
  "peluqueria",
  "balayage",
  { largo: "Largo", densidad: "Abundante", tipo: "Rizado" },
  ["toni-extra"],
);
assert(
  balayageOperationalTotals.durationMinutes > findService("peluqueria", "balayage").durationMinutes,
  "Balayage visible duration must include personalization and extras",
);
assert(
  balayageOperationalTotals.operationalBufferMinutes === 15,
  "Balayage must apply service-specific internal preparation time",
);
assert(
  balayageOperationalTotals.blockedDurationMinutes ===
    balayageOperationalTotals.durationMinutes + balayageOperationalTotals.operationalBufferMinutes,
  "Balayage blocked duration must include service-specific buffer",
);

const inactiveBufferMinutes = getOperationalBufferMinutes({
  category: "peluqueria",
  service: findService("peluqueria", "balayage"),
  settings: {
    defaultBufferMinutes: 10,
    byCategory: { peluqueria: 10 },
    byServiceId: { balayage: 15 },
    active: false,
  },
});
assert(inactiveBufferMinutes === 0, "Inactive buffer settings must return 0 internal minutes");
assert(
  balayageOperationalTotals.durationMinutes + inactiveBufferMinutes ===
    balayageOperationalTotals.durationMinutes,
  "Inactive buffer must keep blocked duration equal to visible duration",
);

withTemporaryAppointments([makeAppointment({ areaId: "peluqueria" })], () => {
  assert(availableAtTen("maquillaje"), "A hair appointment must not block makeup at the same time");
  assert(availableAtTen("unas"), "A hair appointment must not block nails at the same time");
  assert(availableAtTen("depilacion"), "A hair appointment must not block waxing at the same time");
});

withTemporaryAppointments(
  [makeAppointment({ areaId: "maquillaje", serviceName: "Maquillaje social" })],
  () => {
    assert(
      availableAtTen("peluqueria"),
      "A makeup appointment must not block hair at the same time",
    );
  },
);

withTemporaryAppointments(
  [makeAppointment({ areaId: "unas", serviceName: "Semipermanente" })],
  () => {
    assert(
      availableAtTen("peluqueria"),
      "A nails appointment must not block hair at the same time",
    );
  },
);

withTemporaryAppointments(
  Array.from({ length: 4 }, () => makeAppointment({ areaId: "peluqueria" })),
  () => {
    assert(availableAtTen("peluqueria"), "Hair must allow up to 5 simultaneous appointments");
  },
);

withTemporaryAppointments(
  Array.from({ length: 5 }, () => makeAppointment({ areaId: "peluqueria" })),
  () => {
    assert(
      !availableAtTen("peluqueria"),
      "The 6th simultaneous hair appointment must not be available",
    );
  },
);

withTemporaryAppointments(
  [makeAppointment({ areaId: "maquillaje", serviceName: "Maquillaje social" })],
  () => {
    assert(
      !availableAtTen("maquillaje"),
      "The 2nd simultaneous makeup appointment must not be available",
    );
  },
);
assert(availableAtTen("maquillaje"), "Makeup must allow 1 appointment when capacity is free");

withTemporaryAppointments(
  [makeAppointment({ areaId: "unas", serviceName: "Semipermanente" })],
  () => {
    assert(!availableAtTen("unas"), "The 2nd simultaneous nails appointment must not be available");
  },
);
assert(availableAtTen("unas"), "Nails must allow 1 appointment when capacity is free");

withTemporaryAppointments([makeAppointment({ areaId: "depilacion", serviceName: "Cejas" })], () => {
  assert(
    !availableAtTen("depilacion"),
    "The 2nd simultaneous waxing appointment must not be available in MVP",
  );
});
assert(availableAtTen("depilacion"), "Waxing must allow 1 appointment when capacity is free");

withTemporaryAppointments([makeAppointment({ areaId: "maquillaje", active: false })], () => {
  assert(availableAtTen("maquillaje"), "An inactive appointment must not consume capacity");
});

withTemporaryAppointments([makeAppointment({ areaId: "maquillaje", date: "2026-06-13" })], () => {
  assert(availableAtTen("maquillaje"), "An appointment on another date must not consume capacity");
});

const saturdayBalayageSlots = getSlotsForDate("2026-06-06", "2026-05-31", {
  durationMinutes: 180,
  operationalBufferMinutes: 15,
});
assert(
  !saturdayBalayageSlots.includes("11:00"),
  "Availability must not offer a slot where service plus buffer exceeds closing time",
);
assert(
  saturdayBalayageSlots.includes("10:00"),
  "Availability should still offer a slot that fits service plus buffer before closing time",
);

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(
  `Validated ${Object.keys(bookingServiceRuleMatrix).length} explicit service personalization entries.`,
);
