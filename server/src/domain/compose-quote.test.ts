import { describe, expect, test } from "bun:test";
import { composeQuote, computeQuote } from "./quote";
import {
  QuoteError,
  type QuoteServiceData,
  type QuoteSettings,
  type ServiceTier,
} from "./types";

const settings: QuoteSettings = { depositRatePct: 20, defaultSetupMinutes: 12 };

const tier = (over: Partial<ServiceTier> = {}): ServiceTier => ({
  lengthTier: "unico",
  priceMain: 10000,
  priceAddon: null,
  durationMainMin: 60,
  durationAddonMin: null,
  processMin: 0,
  source: "industry_baseline",
  confidence: "low",
  ...over,
});

const service = (over: Partial<QuoteServiceData> = {}): QuoteServiceData => ({
  slug: "corte-fem",
  name: "Corte",
  categorySlug: "peluqueria",
  tiers: [tier()],
  parameters: {
    priceDisplayMode: "fixed",
    lengthAffectsPrice: false,
    lengthAffectsDuration: false,
    setupMinutesOverride: 10,
    requiresConsultation: false,
  },
  fields: [],
  ...over,
});

const quoteOf = (over: Partial<QuoteServiceData> = {}) =>
  computeQuote({ service: service(over), settings });

/**
 * «Agendá a María para color y corte» es el ejemplo canónico que fija el
 * norte de producto. Hasta ahora no era escribible: el motor cotizaba una
 * sola prestación principal. Esto cubre qué pasa cuando son varias.
 */
describe("varias prestaciones en un mismo turno", () => {
  test("componer una sola parte da exactamente lo mismo que cotizarla sola", () => {
    const solo = quoteOf();
    expect(composeQuote([solo], settings)).toEqual(solo);
  });

  test("el precio es la suma: un combo más barato es una decisión de Sol, no del motor", () => {
    const color = quoteOf({ slug: "color", name: "Color", tiers: [tier({ priceMain: 24000 })] });
    const corte = quoteOf({ tiers: [tier({ priceMain: 17000 })] });
    expect(composeQuote([color, corte], settings).estimatedMinAmount).toBe(41000);
  });

  test("la duración se suma: solapar proceso con otra atención no está validado", () => {
    const color = quoteOf({ tiers: [tier({ durationMainMin: 90, processMin: 40 })] });
    const corte = quoteOf({ tiers: [tier({ durationMainMin: 45 })] });
    const r = composeQuote([color, corte], settings);
    expect(r.durationShownMin).toBe(135);
    expect(r.processMin).toBe(40);
  });

  test("el setup es el máximo, no la suma: es preparación entre clientas", () => {
    const a = quoteOf({ parameters: { ...service().parameters, setupMinutesOverride: 10 } });
    const b = quoteOf({ parameters: { ...service().parameters, setupMinutesOverride: 25 } });
    const r = composeQuote([a, b], settings);
    expect(r.setupMin).toBe(25);
    expect(r.blockingMin).toBe(r.durationShownMin + 25);
  });

  test("gana el modo de precio menos certero", () => {
    const fijo = quoteOf();
    const aConfirmar = quoteOf({
      parameters: { ...service().parameters, priceDisplayMode: "subject_to_confirmation" },
    });
    expect(composeQuote([fijo, aConfirmar], settings).priceDisplayMode).toBe(
      "subject_to_confirmation",
    );
    expect(composeQuote([fijo, aConfirmar], settings).isEstimate).toBe(true);
  });

  test("'from' gana a 'fixed' pero pierde contra 'sujeto a confirmación'", () => {
    const fijo = quoteOf();
    const desde = quoteOf({ parameters: { ...service().parameters, priceDisplayMode: "from" } });
    expect(composeQuote([fijo, desde], settings).priceDisplayMode).toBe("from");
  });

  test("la seña se recalcula sobre el total, no se suman las señas parciales", () => {
    // Con 12.347 cada seña parcial da 2.469,4 y redondea hacia abajo:
    // sumarlas daría 4.938, mientras que el 20% del total (24.694) es
    // 4.938,8 y redondea a 4.939. Un peso de diferencia, pero es la
    // diferencia entre cobrar el porcentaje acordado y cobrar otro.
    const a = quoteOf({ tiers: [tier({ priceMain: 12347 })] });
    const b = quoteOf({ tiers: [tier({ priceMain: 12347 })] });
    const r = composeQuote([a, b], settings);
    expect(r.estimatedMinAmount).toBe(24694);
    expect(a.depositAmount + b.depositAmount).toBe(4938);
    expect(r.depositAmount).toBe(4939);
    expect(r.remainingAmount).toBe(24694 - 4939);
  });

  test("si una prestación pide consulta previa, el turno entero la pide", () => {
    const normal = quoteOf();
    const conConsulta = quoteOf({
      parameters: { ...service().parameters, requiresConsultation: true },
    });
    expect(composeQuote([normal, conConsulta], settings).requiresConsultation).toBe(true);
  });

  test("los ítems se conservan todos, uno por prestación", () => {
    const color = quoteOf({ slug: "color", name: "Color" });
    const corte = quoteOf();
    const items = composeQuote([color, corte], settings).items;
    expect(items.filter((i) => i.role === "main").map((i) => i.slug)).toEqual(["color", "corte-fem"]);
  });

  test("componer sin prestaciones es un error, no un turno vacío", () => {
    expect(() => composeQuote([], settings)).toThrow(QuoteError);
  });
});
