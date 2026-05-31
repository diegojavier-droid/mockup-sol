import { services } from "@/lib/booking-mock/services";
import {
  bookingServiceRuleMatrix,
  getPersonalizationImpactLabel,
  validateBookingRuleCoverage,
} from "@/lib/booking-rules";
import { computeBookingTotals } from "@/lib/booking-totals";
import type { CategoryId, Personalization } from "@/lib/booking-types";

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

const totals = (category: CategoryId, serviceId: string, personalization: Personalization) =>
  computeBookingTotals({
    category,
    service: findService(category, serviceId),
    extras: [],
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
  ["unas", "semi", { retiro: "Sí", nailart: "Sí" }],
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
  totals("unas", "semi", { retiro: "Sí" }).durationMinutes === 70,
  "Nails removal must add 25 min",
);
assert(
  totals("unas", "semi", { retiro: "Sí" }).priceAmount === 13500,
  "Nails removal must add fixed price",
);
assert(
  impact("unas", "semi", "retiro", "Sí") === "+25 min · +$3.500",
  "Nails removal impact chip must match totals",
);

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(
  `Validated ${Object.keys(bookingServiceRuleMatrix).length} explicit service personalization entries.`,
);
