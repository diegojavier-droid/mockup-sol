import { describe, expect, test } from "bun:test";
import { computeQuote, resolveTier } from "./quote";
import { QuoteError, type QuoteInput, type QuoteServiceData, type ServiceTier } from "./types";

const settings = { depositRatePct: 20, defaultSetupMinutes: 12 };

const tier = (
  over: Partial<ServiceTier> & { lengthTier: ServiceTier["lengthTier"] },
): ServiceTier => ({
  priceMain: 17000,
  priceAddon: null,
  durationMainMin: 45,
  durationAddonMin: null,
  processMin: 0,
  source: "industry_baseline",
  confidence: "low",
  ...over,
});

const baseService = (over: Partial<QuoteServiceData> = {}): QuoteServiceData => ({
  slug: "corte-fem",
  name: "Corte",
  categorySlug: "peluqueria",
  tiers: [
    tier({ lengthTier: "corto", durationMainMin: 45 }),
    tier({ lengthTier: "medio", durationMainMin: 55 }),
    tier({ lengthTier: "largo", durationMainMin: 60 }),
    tier({ lengthTier: "xl", durationMainMin: 70 }),
  ],
  parameters: {
    priceDisplayMode: "fixed",
    lengthAffectsPrice: false,
    lengthAffectsDuration: true,
    setupMinutesOverride: 10,
    requiresConsultation: false,
  },
  fields: [],
  ...over,
});

describe("resolveTier", () => {
  test("selects the exact length tier", () => {
    expect(resolveTier(baseService().tiers, "largo").durationMainMin).toBe(60);
  });

  test("falls back to unico when service has no length axis", () => {
    const tiers = [tier({ lengthTier: "unico", priceMain: 30000, durationMainMin: 30 })];
    expect(resolveTier(tiers, "xl").priceMain).toBe(30000);
    expect(resolveTier(tiers, null).priceMain).toBe(30000);
  });

  test("requires length when the service is tiered by length", () => {
    expect(() => resolveTier(baseService().tiers, null)).toThrow(QuoteError);
    try {
      resolveTier(baseService().tiers, null);
    } catch (e) {
      expect((e as QuoteError).code).toBe("length_required");
    }
  });
});

describe("computeQuote — largo como tier, nunca doble conteo (gate A1/A4)", () => {
  test("corte: mismo precio en los 4 largos, duración distinta", () => {
    const service = baseService();
    const corto = computeQuote({ service, lengthTier: "corto", settings });
    const xl = computeQuote({ service, lengthTier: "xl", settings });
    expect(corto.estimatedMinAmount).toBe(17000);
    expect(xl.estimatedMinAmount).toBe(17000);
    expect(corto.durationShownMin).toBe(45);
    expect(xl.durationShownMin).toBe(70);
  });

  test("C = M + setup; A = M − B queda derivable, no expuesto", () => {
    const service = baseService({
      tiers: [tier({ lengthTier: "unico", durationMainMin: 75, processMin: 20 })],
      parameters: { ...baseService().parameters, setupMinutesOverride: 15 },
    });
    const q = computeQuote({ service, settings });
    expect(q.durationShownMin).toBe(75); // M
    expect(q.processMin).toBe(20); // B
    expect(q.blockingMin).toBe(90); // C = 75 + 15
    expect("durationActiveMin" in q).toBe(false); // A jamás serializada
  });

  test("setup default 12 cuando el servicio no define override", () => {
    const service = baseService({
      tiers: [tier({ lengthTier: "unico" })],
      parameters: { ...baseService().parameters, setupMinutesOverride: null },
    });
    expect(computeQuote({ service, settings }).setupMin).toBe(12);
  });
});

describe("computeQuote — modificadores condicionales", () => {
  const withTextura = baseService({
    tiers: [tier({ lengthTier: "unico", priceMain: 12000, durationMainMin: 40 })],
    fields: [
      {
        slug: "tipo",
        label: "Tipo de cabello",
        fieldRole: "modifier",
        decision: "operational",
        options: [
          {
            slug: "lacio",
            label: "Liso",
            durationDeltaMinutes: 0,
            priceFixedAmount: 0,
            pricePercentage: 0,
          },
          {
            slug: "rizado",
            label: "Rizado",
            durationDeltaMinutes: 15,
            priceFixedAmount: 0,
            pricePercentage: 5,
          },
        ],
      },
      {
        slug: "quimicos",
        label: "Antecedentes",
        fieldRole: "context",
        decision: "contextual",
        options: [],
      },
    ],
  });

  test("aplica delta de opción (fijo + % sobre el precio del tier)", () => {
    const q = computeQuote({
      service: withTextura,
      personalization: { tipo: "rizado" },
      settings,
    });
    expect(q.estimatedMinAmount).toBe(12000 + Math.round((12000 * 5) / 100));
    expect(q.durationShownMin).toBe(55);
    expect(q.appliedModifiers).toHaveLength(1);
  });

  test("los campos context no cotizan aunque lleguen seleccionados", () => {
    const q = computeQuote({
      service: withTextura,
      personalization: { quimicos: "color-reciente", tipo: "lacio" },
      settings,
    });
    expect(q.estimatedMinAmount).toBe(12000);
    expect(q.appliedModifiers).toHaveLength(0);
  });

  test("opción desconocida en campo operacional es error, no silencio", () => {
    expect(() =>
      computeQuote({ service: withTextura, personalization: { tipo: "inexistente" }, settings }),
    ).toThrow(QuoteError);
  });
});

describe("computeQuote — extras y seña (gate C7/D4)", () => {
  test("extras suman precio y duración; la seña es 20% del mínimo", () => {
    const service = baseService({
      tiers: [tier({ lengthTier: "unico", priceMain: 30000, durationMainMin: 30 })],
      parameters: { ...baseService().parameters, setupMinutesOverride: 0 },
    });
    const q = computeQuote({
      service,
      extras: [{ code: "cejas", name: "Cejas", priceAmount: 12000, durationDeltaMinutes: 15 }],
      settings,
    });
    expect(q.estimatedMinAmount).toBe(42000);
    expect(q.durationShownMin).toBe(45);
    expect(q.blockingMin).toBe(45);
    expect(q.depositAmount).toBe(8400);
    expect(q.remainingAmount).toBe(33600);
    expect(q.items).toHaveLength(2);
  });
});

describe("computeQuote — estimación nunca se disfraza de precio cerrado", () => {
  test("modo 'from' y 'subject_to_confirmation' marcan isEstimate", () => {
    for (const mode of ["from", "subject_to_confirmation"] as const) {
      const service = baseService({
        tiers: [tier({ lengthTier: "unico" })],
        parameters: {
          ...baseService().parameters,
          priceDisplayMode: mode,
          requiresConsultation: mode === "subject_to_confirmation",
        },
      });
      const q = computeQuote({ service, settings });
      expect(q.isEstimate).toBe(true);
      expect(q.priceDisplayMode).toBe(mode);
    }
  });

  test("solo el modo 'fixed' se presenta como precio exacto", () => {
    const q = computeQuote({
      service: baseService({ tiers: [tier({ lengthTier: "unico" })] }),
      settings,
    });
    expect(q.isEstimate).toBe(false);
  });
});
