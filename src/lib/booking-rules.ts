import type { CategoryId, Service, Tag } from "@/lib/booking-types";

export interface BookingModifierRule {
  durationMinutes: number;
  priceAmount: number;
  appliesToServiceIds?: Service["id"][];
  appliesToServiceTags?: Tag[];
  excludedServiceIds?: Service["id"][];
}

export type PersonalizationModifierRules = Record<string, Record<string, BookingModifierRule>>;

export interface CategoryBookingRules {
  personalizationModifiers: PersonalizationModifierRules;
}

const hairVolumeSensitiveServiceIds = [
  "brushing",
  "peinado-diario",
  "peinado-social",
  "recogido",
  "alisado",
  "corte-brushing",
  "alisado-corte",
  "alisado-nutricion",
  "mechas-corte-brushing",
];

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
  "color-nutricion",
  "mechas-tonalizacion",
  "balayage-nutricion",
  "alisado-corte",
  "alisado-nutricion",
  "mechas-corte-brushing",
  "color-tratamiento",
];

const transformationServiceIds = [
  "corte-fem",
  "color-global",
  "mechas",
  "babylights",
  "balayage",
  "claritos",
  "alisado",
  "corte-brushing",
  "color-nutricion",
  "mechas-tonalizacion",
  "balayage-nutricion",
  "alisado-corte",
  "alisado-nutricion",
  "mechas-corte-brushing",
  "color-tratamiento",
];

const hairVolumeSensitiveScope = {
  appliesToServiceIds: hairVolumeSensitiveServiceIds,
  appliesToServiceTags: ["color", "tratamiento", "combinado"] satisfies Tag[],
};

const technicalHairScope = {
  appliesToServiceIds: technicalHairServiceIds,
  appliesToServiceTags: ["color", "tratamiento", "combinado"] satisfies Tag[],
};

const transformationScope = {
  appliesToServiceIds: transformationServiceIds,
  appliesToServiceTags: ["color", "combinado"] satisfies Tag[],
};

export const bookingRules: Record<CategoryId, CategoryBookingRules> = {
  peluqueria: {
    personalizationModifiers: {
      largo: {
        Corto: { durationMinutes: 0, priceAmount: 0 },
        "Media melena": { durationMinutes: 5, priceAmount: 0, ...hairVolumeSensitiveScope },
        Largo: { durationMinutes: 15, priceAmount: 2500, ...hairVolumeSensitiveScope },
        "Muy largo": { durationMinutes: 30, priceAmount: 5000, ...hairVolumeSensitiveScope },
      },
      densidad: {
        Fina: { durationMinutes: 0, priceAmount: 0 },
        Media: { durationMinutes: 5, priceAmount: 0, ...hairVolumeSensitiveScope },
        Abundante: { durationMinutes: 20, priceAmount: 3500, ...hairVolumeSensitiveScope },
      },
      tipo: {
        Liso: { durationMinutes: 0, priceAmount: 0 },
        Ondulado: { durationMinutes: 5, priceAmount: 0, ...hairVolumeSensitiveScope },
        Rizado: { durationMinutes: 15, priceAmount: 2000, ...hairVolumeSensitiveScope },
        Crespo: { durationMinutes: 25, priceAmount: 3500, ...hairVolumeSensitiveScope },
      },
      quimicos: {
        Ninguno: { durationMinutes: 0, priceAmount: 0 },
        "Color reciente": { durationMinutes: 10, priceAmount: 0, ...technicalHairScope },
        "Alisado previo": { durationMinutes: 10, priceAmount: 0, ...technicalHairScope },
        Decoloración: { durationMinutes: 20, priceAmount: 2500, ...technicalHairScope },
      },
      objetivo: {
        "Cambio de look": { durationMinutes: 20, priceAmount: 2000, ...transformationScope },
        Mantenimiento: { durationMinutes: 0, priceAmount: 0 },
        "Brillo y cuidado": { durationMinutes: 5, priceAmount: 0, ...technicalHairScope },
        "Iluminar el rostro": { durationMinutes: 15, priceAmount: 1500, ...transformationScope },
      },
    },
  },
  maquillaje: {
    personalizationModifiers: {},
  },
  unas: {
    personalizationModifiers: {},
  },
};
