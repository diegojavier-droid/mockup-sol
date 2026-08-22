import type { CategoryId, Service } from "@/lib/booking-types";
import { services } from "@/lib/booking-mock/services";

export type PriceModifier =
  | { type: "none" }
  | { type: "fixed"; amount: number }
  | { type: "percentage"; percentage: number };

export interface PersonalizationOptionRule {
  label: string;
  durationMinutes?: number;
  price?: PriceModifier;
}

export type PersonalizationFieldDecision =
  | { type: "operational"; options: Record<string, PersonalizationOptionRule> }
  | { type: "contextual" }
  | { type: "not_applicable" };

export type PersonalizationModifierRules = Record<string, PersonalizationFieldDecision>;

export interface CategoryBookingRules {
  fallbackServiceDecision: "no_personalization_modifiers";
  personalizationModifiers: PersonalizationModifierRules;
}

export interface ServicePersonalizationRuleMatrixEntry {
  category: CategoryId;
  fields: PersonalizationModifierRules;
}

export interface AppliedBookingModifier {
  fieldId: string;
  option: string;
  durationMinutes: number;
  priceAmount: number;
  pricePercentage: number;
}

export interface BookingModifierTotals {
  durationMinutes: number;
  priceAmount: number;
  appliedModifiers: AppliedBookingModifier[];
}

const noPrice = { type: "none" } satisfies PriceModifier;

const option = (
  label: string,
  durationMinutes = 0,
  price: PriceModifier = noPrice,
): PersonalizationOptionRule => ({ label, durationMinutes, price });

const contextual = { type: "contextual" } satisfies PersonalizationFieldDecision;
const notApplicable = { type: "not_applicable" } satisfies PersonalizationFieldDecision;

const hairContextFields = {
  quimicos: contextual,
  alergias: contextual,
  objetivo: contextual,
} satisfies PersonalizationModifierRules;

const noHairPriceLength = {
  Corto: option("corto"),
  "Media melena": option("medio", 10),
  Largo: option("largo", 15),
  "Muy largo": option("muy_largo", 25),
};

const stylingLength = {
  Corto: option("corto"),
  "Media melena": option("medio", 15),
  Largo: option("largo", 30),
  "Muy largo": option("muy_largo", 45),
};

const lightPriceStylingLength = {
  Corto: option("corto"),
  "Media melena": option("medio", 10),
  Largo: option("largo", 20, { type: "percentage", percentage: 5 }),
  "Muy largo": option("muy_largo", 30, { type: "percentage", percentage: 8 }),
};

const colorLength = {
  Corto: option("corto"),
  "Media melena": option("medio", 15, { type: "percentage", percentage: 5 }),
  Largo: option("largo", 30, { type: "percentage", percentage: 10 }),
  "Muy largo": option("muy_largo", 45, { type: "percentage", percentage: 20 }),
};

const lightColorLength = {
  Corto: option("corto"),
  "Media melena": option("medio", 10, { type: "percentage", percentage: 5 }),
  Largo: option("largo", 20, { type: "percentage", percentage: 10 }),
  "Muy largo": option("muy_largo", 30, { type: "percentage", percentage: 15 }),
};

const highlightsLength = {
  Corto: option("corto"),
  "Media melena": option("medio", 20, { type: "percentage", percentage: 8 }),
  Largo: option("largo", 40, { type: "percentage", percentage: 15 }),
  "Muy largo": option("muy_largo", 60, { type: "percentage", percentage: 25 }),
};

const smoothingLength = {
  Corto: option("corto"),
  "Media melena": option("medio", 30, { type: "percentage", percentage: 10 }),
  Largo: option("largo", 45, { type: "percentage", percentage: 20 }),
  "Muy largo": option("muy_largo", 60, { type: "percentage", percentage: 30 }),
};

const treatmentLength = {
  Corto: option("corto"),
  "Media melena": option("medio", 10),
  Largo: option("largo", 15, { type: "percentage", percentage: 5 }),
  "Muy largo": option("muy_largo", 25, { type: "percentage", percentage: 10 }),
};

const rootRetouchLength = {
  Corto: option("corto"),
  "Media melena": option("medio"),
  Largo: option("largo", 5),
  "Muy largo": option("muy_largo", 10),
};

const cutDensity = {
  Fina: option("baja"),
  Media: option("media"),
  Abundante: option("alta", 15),
};

const stylingDensity = {
  Fina: option("baja"),
  Media: option("media"),
  Abundante: option("alta", 20, { type: "percentage", percentage: 10 }),
};

const lightDensity = {
  Fina: option("baja"),
  Media: option("media"),
  Abundante: option("alta", 15, { type: "percentage", percentage: 5 }),
};

const colorDensity = {
  Fina: option("baja"),
  Media: option("media"),
  Abundante: option("alta", 20, { type: "percentage", percentage: 10 }),
};

const highlightsDensity = {
  Fina: option("baja"),
  Media: option("media"),
  Abundante: option("alta", 30, { type: "percentage", percentage: 15 }),
};

const smoothingDensity = {
  Fina: option("baja"),
  Media: option("media"),
  Abundante: option("alta", 30, { type: "percentage", percentage: 15 }),
};

const treatmentDensity = {
  Fina: option("baja"),
  Media: option("media"),
  Abundante: option("alta", 15, { type: "percentage", percentage: 5 }),
};

const rootRetouchDensity = {
  Fina: option("baja"),
  Media: option("media"),
  Abundante: option("alta", 10, { type: "percentage", percentage: 5 }),
};

const cutType = {
  Liso: option("lacio"),
  Ondulado: option("ondulado"),
  Rizado: option("rizado", 10),
  Crespo: option("afro", 15),
};

const stylingType = {
  Liso: option("lacio"),
  Ondulado: option("ondulado"),
  Rizado: option("rizado", 15),
  Crespo: option("afro", 25),
};

const lightPriceStylingType = {
  Liso: option("lacio"),
  Ondulado: option("ondulado"),
  Rizado: option("rizado", 15, { type: "percentage", percentage: 5 }),
  Crespo: option("afro", 25, { type: "percentage", percentage: 8 }),
};

const lightHairType = {
  Liso: option("lacio"),
  Ondulado: option("ondulado"),
  Rizado: option("rizado", 10),
  Crespo: option("afro", 15),
};

const highlightsType = {
  Liso: option("lacio"),
  Ondulado: option("ondulado"),
  Rizado: option("rizado", 20),
  Crespo: option("afro", 30),
};

const smoothingType = {
  Liso: option("lacio"),
  Ondulado: option("ondulado", 15, { type: "percentage", percentage: 5 }),
  Rizado: option("rizado", 30, { type: "percentage", percentage: 10 }),
  Crespo: option("afro", 45, { type: "percentage", percentage: 15 }),
};

const contextualType = {
  Liso: option("lacio"),
  Ondulado: option("ondulado"),
  Rizado: option("rizado"),
  Crespo: option("afro"),
};

const operational = (options: Record<string, PersonalizationOptionRule>) =>
  ({ type: "operational", options }) satisfies PersonalizationFieldDecision;

const hairFields = ({
  largo,
  densidad,
  tipo,
  quimicos = contextual,
  alergias = contextual,
  objetivo = contextual,
}: {
  largo: Record<string, PersonalizationOptionRule> | "contextual" | "not_applicable";
  densidad: Record<string, PersonalizationOptionRule> | "contextual" | "not_applicable";
  tipo: Record<string, PersonalizationOptionRule> | "contextual" | "not_applicable";
  quimicos?: PersonalizationFieldDecision;
  alergias?: PersonalizationFieldDecision;
  objetivo?: PersonalizationFieldDecision;
}) => ({
  largo:
    largo === "contextual"
      ? contextual
      : largo === "not_applicable"
        ? notApplicable
        : operational(largo),
  densidad:
    densidad === "contextual"
      ? contextual
      : densidad === "not_applicable"
        ? notApplicable
        : operational(densidad),
  tipo:
    tipo === "contextual"
      ? contextual
      : tipo === "not_applicable"
        ? notApplicable
        : operational(tipo),
  quimicos,
  alergias,
  objetivo,
});

const makeupFields = {
  evento: contextual,
  horario: contextual,
  estilo: contextual,
  prueba: contextual,
} satisfies PersonalizationModifierRules;

const nailFields = {
  estado: contextual,
  terminacion: contextual,
} satisfies PersonalizationModifierRules;

export const bookingServiceRuleMatrix: Record<string, ServicePersonalizationRuleMatrixEntry> = {
  "corte-fem": {
    category: "peluqueria",
    fields: hairFields({ largo: noHairPriceLength, densidad: cutDensity, tipo: cutType }),
  },
  brushing: {
    category: "peluqueria",
    fields: hairFields({ largo: stylingLength, densidad: stylingDensity, tipo: stylingType }),
  },
  "peinado-diario": {
    category: "peluqueria",
    fields: hairFields({
      largo: lightPriceStylingLength,
      densidad: lightDensity,
      tipo: lightPriceStylingType,
      quimicos: notApplicable,
    }),
  },
  "peinado-social": {
    category: "peluqueria",
    fields: hairFields({
      largo: lightPriceStylingLength,
      densidad: lightDensity,
      tipo: lightPriceStylingType,
      quimicos: notApplicable,
    }),
  },
  recogido: {
    category: "peluqueria",
    fields: hairFields({
      largo: lightPriceStylingLength,
      densidad: lightDensity,
      tipo: lightPriceStylingType,
      quimicos: notApplicable,
    }),
  },
  "color-global": {
    category: "peluqueria",
    fields: hairFields({ largo: colorLength, densidad: colorDensity, tipo: lightHairType }),
  },
  "retoque-raiz": {
    category: "peluqueria",
    fields: hairFields({
      largo: rootRetouchLength,
      densidad: rootRetouchDensity,
      tipo: "contextual",
    }),
  },
  tonalizacion: {
    category: "peluqueria",
    fields: hairFields({ largo: lightColorLength, densidad: colorDensity, tipo: lightHairType }),
  },
  "bano-luz": {
    category: "peluqueria",
    fields: hairFields({ largo: lightColorLength, densidad: colorDensity, tipo: lightHairType }),
  },
  mechas: {
    category: "peluqueria",
    fields: hairFields({
      largo: highlightsLength,
      densidad: highlightsDensity,
      tipo: highlightsType,
    }),
  },
  babylights: {
    category: "peluqueria",
    fields: hairFields({
      largo: highlightsLength,
      densidad: highlightsDensity,
      tipo: highlightsType,
    }),
  },
  balayage: {
    category: "peluqueria",
    fields: hairFields({
      largo: highlightsLength,
      densidad: highlightsDensity,
      tipo: highlightsType,
    }),
  },
  claritos: {
    category: "peluqueria",
    fields: hairFields({
      largo: highlightsLength,
      densidad: highlightsDensity,
      tipo: highlightsType,
    }),
  },
  alisado: {
    category: "peluqueria",
    fields: hairFields({ largo: smoothingLength, densidad: smoothingDensity, tipo: smoothingType }),
  },
  botox: {
    category: "peluqueria",
    fields: hairFields({ largo: treatmentLength, densidad: treatmentDensity, tipo: lightHairType }),
  },
  nutricion: {
    category: "peluqueria",
    fields: hairFields({ largo: treatmentLength, densidad: treatmentDensity, tipo: lightHairType }),
  },
  hidratacion: {
    category: "peluqueria",
    fields: hairFields({ largo: treatmentLength, densidad: treatmentDensity, tipo: lightHairType }),
  },
  reparacion: {
    category: "peluqueria",
    fields: hairFields({ largo: treatmentLength, densidad: treatmentDensity, tipo: lightHairType }),
  },
  reconstruccion: {
    category: "peluqueria",
    fields: hairFields({ largo: treatmentLength, densidad: treatmentDensity, tipo: lightHairType }),
  },
  "post-color": {
    category: "peluqueria",
    fields: hairFields({ largo: treatmentLength, densidad: treatmentDensity, tipo: lightHairType }),
  },
  "corte-brushing": {
    category: "peluqueria",
    fields: hairFields({ largo: stylingLength, densidad: stylingDensity, tipo: stylingType }),
  },
  "color-nutricion": {
    category: "peluqueria",
    fields: hairFields({ largo: colorLength, densidad: colorDensity, tipo: lightHairType }),
  },
  "mechas-tonalizacion": {
    category: "peluqueria",
    fields: hairFields({
      largo: highlightsLength,
      densidad: highlightsDensity,
      tipo: highlightsType,
    }),
  },
  "balayage-nutricion": {
    category: "peluqueria",
    fields: hairFields({
      largo: highlightsLength,
      densidad: highlightsDensity,
      tipo: highlightsType,
    }),
  },
  "alisado-corte": {
    category: "peluqueria",
    fields: hairFields({ largo: smoothingLength, densidad: smoothingDensity, tipo: smoothingType }),
  },
  "alisado-nutricion": {
    category: "peluqueria",
    fields: hairFields({ largo: smoothingLength, densidad: smoothingDensity, tipo: smoothingType }),
  },
  "mechas-corte-brushing": {
    category: "peluqueria",
    fields: hairFields({
      largo: highlightsLength,
      densidad: highlightsDensity,
      tipo: highlightsType,
    }),
  },
  "color-tratamiento": {
    category: "peluqueria",
    fields: hairFields({ largo: colorLength, densidad: colorDensity, tipo: lightHairType }),
  },
  "mk-social": { category: "maquillaje", fields: makeupFields },
  "mk-fiesta": { category: "maquillaje", fields: makeupFields },
  "mk-evento": { category: "maquillaje", fields: makeupFields },
  "mk-novia": { category: "maquillaje", fields: makeupFields },
  "mk-prueba": { category: "maquillaje", fields: makeupFields },
  semi: { category: "unas", fields: nailFields },
  kapping: { category: "unas", fields: nailFields },
  softgel: { category: "unas", fields: nailFields },
  nailart: { category: "unas", fields: nailFields },
  mani: { category: "unas", fields: nailFields },
  retiro: { category: "unas", fields: nailFields },
  "depi-rostro-completo": { category: "depilacion", fields: {} },
  "depi-cejas": { category: "depilacion", fields: {} },
  "depi-bigote": { category: "depilacion", fields: {} },
  "depi-bozo-menton": { category: "depilacion", fields: {} },
};

export const bookingRules: Record<CategoryId, CategoryBookingRules> = {
  peluqueria: {
    fallbackServiceDecision: "no_personalization_modifiers",
    personalizationModifiers: hairContextFields,
  },
  maquillaje: {
    fallbackServiceDecision: "no_personalization_modifiers",
    personalizationModifiers: makeupFields,
  },
  unas: {
    fallbackServiceDecision: "no_personalization_modifiers",
    personalizationModifiers: nailFields,
  },
  depilacion: {
    fallbackServiceDecision: "no_personalization_modifiers",
    personalizationModifiers: {},
  },
};

function computePriceModifierAmount(price: PriceModifier | undefined, service: Service | null) {
  if (!price || price.type === "none") return 0;
  if (price.type === "fixed") return price.amount;

  return Math.round(((service?.priceAmount ?? 0) * price.percentage) / 100);
}

function getPricePercentage(price: PriceModifier | undefined) {
  return price?.type === "percentage" ? price.percentage : 0;
}

function getFieldDecision({
  category,
  service,
  fieldId,
}: {
  category: CategoryId | null;
  service: Service | null;
  fieldId: string;
}) {
  if (!category || !service) return null;

  const serviceRule = bookingServiceRuleMatrix[service.id];

  if (!serviceRule) return bookingRules[category].personalizationModifiers[fieldId] ?? null;
  if (serviceRule.category !== category) return null;

  return serviceRule.fields[fieldId] ?? null;
}

export function getPersonalizationFieldDecision({
  category,
  service,
  fieldId,
}: {
  category: CategoryId | null;
  service: Service | null;
  fieldId: string;
}) {
  return getFieldDecision({ category, service, fieldId });
}

export function getPersonalizationOptionRule({
  category,
  service,
  fieldId,
  option,
}: {
  category: CategoryId | null;
  service: Service | null;
  fieldId: string;
  option: string;
}) {
  const fieldRule = getFieldDecision({ category, service, fieldId });

  if (fieldRule?.type !== "operational") return null;

  return fieldRule.options[option] ?? null;
}

export function getPersonalizationImpactLabel({
  category,
  service,
  fieldId,
  option,
}: {
  category: CategoryId | null;
  service: Service | null;
  fieldId: string;
  option: string;
}) {
  const rule = getPersonalizationOptionRule({ category, service, fieldId, option });

  if (!rule) return null;

  const impacts = [];
  const durationMinutes = rule.durationMinutes ?? 0;
  const pricePercentage = getPricePercentage(rule.price);

  if (durationMinutes > 0) impacts.push(`+${durationMinutes} min`);
  if (rule.price?.type === "fixed" && rule.price.amount > 0) {
    impacts.push(`+$${rule.price.amount.toLocaleString("es-AR")}`);
  }
  if (pricePercentage > 0) impacts.push(`+${pricePercentage}%`);

  return impacts.length ? impacts.join(" · ") : null;
}

export function getPersonalizationModifierTotals({
  category,
  service,
  personalization,
}: {
  category: CategoryId | null;
  service: Service | null;
  personalization?: Record<string, string>;
}): BookingModifierTotals {
  if (!category || !personalization) {
    return { durationMinutes: 0, priceAmount: 0, appliedModifiers: [] };
  }

  return Object.entries(personalization).reduce<BookingModifierTotals>(
    (totals, [fieldId, selectedOption]) => {
      const rule = getPersonalizationOptionRule({
        category,
        service,
        fieldId,
        option: selectedOption,
      });

      if (!rule) return totals;

      const durationMinutes = rule.durationMinutes ?? 0;
      const priceAmount = computePriceModifierAmount(rule.price, service);
      const pricePercentage = getPricePercentage(rule.price);

      if (durationMinutes <= 0 && priceAmount <= 0 && pricePercentage <= 0) return totals;

      return {
        durationMinutes: totals.durationMinutes + durationMinutes,
        priceAmount: totals.priceAmount + priceAmount,
        appliedModifiers: [
          ...totals.appliedModifiers,
          { fieldId, option: selectedOption, durationMinutes, priceAmount, pricePercentage },
        ],
      };
    },
    { durationMinutes: 0, priceAmount: 0, appliedModifiers: [] },
  );
}

export function validateBookingRuleCoverage() {
  const serviceEntries = Object.entries(services).flatMap(([category, categoryServices]) =>
    categoryServices.map((service) => ({ category: category as CategoryId, service })),
  );
  const serviceIds = new Set(serviceEntries.map(({ service }) => service.id));
  const matrixIds = Object.keys(bookingServiceRuleMatrix);
  const missingServices = serviceEntries
    .filter(({ service }) => !bookingServiceRuleMatrix[service.id])
    .map(({ service }) => service.id);
  const orphanMatrixEntries = matrixIds.filter((serviceId) => !serviceIds.has(serviceId));
  const wrongCategoryEntries = serviceEntries
    .filter(({ category, service }) => bookingServiceRuleMatrix[service.id]?.category !== category)
    .map(({ service }) => service.id);

  return {
    ok: !missingServices.length && !orphanMatrixEntries.length && !wrongCategoryEntries.length,
    missingServices,
    orphanMatrixEntries,
    wrongCategoryEntries,
  };
}
