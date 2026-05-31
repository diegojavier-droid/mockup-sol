import type { CategoryId, Service, Tag } from "@/lib/booking-types";

export type PriceModifier =
  | { type: "none" }
  | { type: "fixed"; amount: number }
  | { type: "percentage"; percentage: number };

export interface BookingModifierRule {
  durationMinutes?: number;
  price?: PriceModifier;
  appliesToServiceIds?: Service["id"][];
  appliesToServiceTags?: Tag[];
  excludedServiceIds?: Service["id"][];
}

export interface PersonalizationOptionRule extends BookingModifierRule {
  label: string;
}

export interface PersonalizationFieldRule {
  type: "operational" | "contextual";
  options?: Record<string, PersonalizationOptionRule>;
}

export type PersonalizationModifierRules = Record<string, PersonalizationFieldRule>;

export interface CategoryBookingRules {
  personalizationModifiers: PersonalizationModifierRules;
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

const technicalHairServiceIds = [
  "color-global",
  "retoque-raiz",
  "tonalizacion",
  "bano-luz",
  "mechas",
  "babylights",
  "balayage",
  "claritos",
  "alisado",
  "botox",
  "nutricion",
  "color-nutricion",
  "mechas-tonalizacion",
  "balayage-nutricion",
  "alisado-corte",
  "alisado-nutricion",
  "mechas-corte-brushing",
  "color-tratamiento",
];

const stylingHairServiceIds = [
  "brushing",
  "peinado-diario",
  "peinado-social",
  "recogido",
  "corte-brushing",
];

const hairOperationalScope = {
  appliesToServiceIds: [...technicalHairServiceIds, ...stylingHairServiceIds],
  appliesToServiceTags: ["color", "tratamiento", "combinado", "evento"] satisfies Tag[],
  excludedServiceIds: ["corte-fem"],
};

export const bookingRules: Record<CategoryId, CategoryBookingRules> = {
  peluqueria: {
    personalizationModifiers: {
      largo: {
        type: "operational",
        options: {
          Corto: { label: "corto", durationMinutes: 0, price: { type: "none" } },
          "Media melena": {
            label: "medio",
            durationMinutes: 15,
            price: { type: "none" },
            ...hairOperationalScope,
          },
          Largo: {
            label: "largo",
            durationMinutes: 30,
            price: { type: "percentage", percentage: 10 },
            ...hairOperationalScope,
          },
          "Muy largo": {
            label: "muy_largo",
            durationMinutes: 45,
            price: { type: "percentage", percentage: 20 },
            ...hairOperationalScope,
          },
        },
      },
      densidad: {
        type: "operational",
        options: {
          Fina: { label: "baja", durationMinutes: 0, price: { type: "none" } },
          Media: { label: "media", durationMinutes: 0, price: { type: "none" } },
          Abundante: {
            label: "alta",
            durationMinutes: 20,
            price: { type: "percentage", percentage: 10 },
            ...hairOperationalScope,
          },
        },
      },
      tipo: {
        type: "operational",
        options: {
          Liso: { label: "lacio", durationMinutes: 0, price: { type: "none" } },
          Ondulado: {
            label: "ondulado",
            durationMinutes: 10,
            price: { type: "none" },
            ...hairOperationalScope,
          },
          Rizado: {
            label: "rizado",
            durationMinutes: 15,
            price: { type: "percentage", percentage: 5 },
            ...hairOperationalScope,
          },
          Crespo: {
            label: "afro",
            durationMinutes: 25,
            price: { type: "percentage", percentage: 10 },
            ...hairOperationalScope,
          },
        },
      },
      quimicos: { type: "contextual" },
      alergias: { type: "contextual" },
      objetivo: { type: "contextual" },
    },
  },
  maquillaje: {
    personalizationModifiers: {
      evento: { type: "contextual" },
      horario: { type: "contextual" },
      estilo: { type: "contextual" },
      prueba: { type: "contextual" },
    },
  },
  unas: {
    personalizationModifiers: {
      estado: { type: "contextual" },
      terminacion: { type: "contextual" },
      retiro: {
        type: "operational",
        options: {
          Sí: {
            label: "retiro_previo",
            durationMinutes: 25,
            price: { type: "fixed", amount: 3500 },
          },
          No: { label: "sin_retiro_previo", durationMinutes: 0, price: { type: "none" } },
        },
      },
      nailart: { type: "contextual" },
    },
  },
};

function modifierAppliesToService(modifier: BookingModifierRule, service: Service | null) {
  if (!service) return false;

  if (modifier.excludedServiceIds?.includes(service.id)) return false;

  const hasServiceScope = Boolean(
    modifier.appliesToServiceIds?.length || modifier.appliesToServiceTags?.length,
  );

  if (!hasServiceScope) return true;

  return Boolean(
    modifier.appliesToServiceIds?.includes(service.id) ||
    (service.tag && modifier.appliesToServiceTags?.includes(service.tag)),
  );
}

function computePriceModifierAmount(price: PriceModifier | undefined, service: Service | null) {
  if (!price || price.type === "none") return 0;
  if (price.type === "fixed") return price.amount;

  return Math.round(((service?.priceAmount ?? 0) * price.percentage) / 100);
}

function getPricePercentage(price: PriceModifier | undefined) {
  return price?.type === "percentage" ? price.percentage : 0;
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
  if (!category) return null;

  const fieldRule = bookingRules[category].personalizationModifiers[fieldId];
  const optionRule = fieldRule?.type === "operational" ? fieldRule.options?.[option] : null;

  if (!optionRule || !modifierAppliesToService(optionRule, service)) return null;

  return optionRule;
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
    (totals, [fieldId, option]) => {
      const rule = getPersonalizationOptionRule({ category, service, fieldId, option });

      if (!rule) return totals;

      const durationMinutes = rule.durationMinutes ?? 0;
      const priceAmount = computePriceModifierAmount(rule.price, service);
      const pricePercentage = getPricePercentage(rule.price);

      return {
        durationMinutes: totals.durationMinutes + durationMinutes,
        priceAmount: totals.priceAmount + priceAmount,
        appliedModifiers: [
          ...totals.appliedModifiers,
          { fieldId, option, durationMinutes, priceAmount, pricePercentage },
        ],
      };
    },
    { durationMinutes: 0, priceAmount: 0, appliedModifiers: [] },
  );
}
