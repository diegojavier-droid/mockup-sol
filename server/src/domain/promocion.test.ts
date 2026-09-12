/**
 * La promoción de color + tratamiento.
 *
 * Los precios de estas pruebas son los reales de la lista de Sol:
 * karseell sale $20.000 suelto y $7.000 arriba de un color, raíces de
 * Exiline sale $28.000. Usar los de verdad hace que una prueba que falla
 * diga algo sobre el salón y no sobre un número inventado.
 */

import { describe, expect, it } from "bun:test";
import { aplicarPromocion, ahorroDeLaPromocion } from "./promocion";
import { computeQuote, tierEfectivo } from "./quote";
import type { QuoteServiceData, QuoteSettings, ServiceTier } from "./types";

const settings: QuoteSettings = { depositRatePct: 20, defaultSetupMinutes: 12 };

function tier(priceMain: number, priceAddon: number | null): ServiceTier {
  return {
    lengthTier: "corto",
    priceMain,
    priceAddon,
    durationMainMin: 45,
    durationAddonMin: priceAddon === null ? null : 15,
    processMin: 20,
    source: "sol_pricelist",
    confidence: "medium",
  };
}

function servicio(
  slug: string,
  kind: QuoteServiceData["kind"],
  priceMain: number,
  priceAddon: number | null = null,
): QuoteServiceData {
  return {
    slug,
    name: slug,
    categorySlug: "peluqueria",
    kind,
    tiers: [tier(priceMain, priceAddon)],
    parameters: {
      priceDisplayMode: "from",
      lengthAffectsPrice: true,
      lengthAffectsDuration: false,
      setupMinutesOverride: null,
      requiresConsultation: false,
    },
    fields: [],
  };
}

const raices = () => servicio("retoque-raiz", "color", 28000);
const karseell = () => servicio("karseell", "tratamiento", 20000, 7000);
const corte = () => servicio("corte-fem", "servicio", 15000);

describe("aplicarPromocion", () => {
  it("un tratamiento con un color entra a precio de promoción", () => {
    expect(aplicarPromocion([raices(), karseell()])).toEqual([false, true]);
  });

  it("el color nunca entra a precio de promoción: la hace el salón sobre el tratamiento", () => {
    const [colorConPromocion] = aplicarPromocion([raices(), karseell()]);
    expect(colorConPromocion).toBe(false);
  });

  it("un tratamiento solo paga precio de tratamiento solo", () => {
    expect(aplicarPromocion([karseell()])).toEqual([false]);
  });

  it("un corte no dispara la promoción: la regla es color, no «dos cosas»", () => {
    expect(aplicarPromocion([corte(), karseell()])).toEqual([false, false]);
  });

  it("un color solo no cambia nada", () => {
    expect(aplicarPromocion([raices()])).toEqual([false]);
  });

  it("dos tratamientos con un color reciben los dos la promoción", () => {
    const otro = servicio("riflessi", "tratamiento", 21000, 8000);
    expect(aplicarPromocion([raices(), karseell(), otro])).toEqual([false, true, true]);
  });

  it("el orden no importa: el tratamiento puede venir primero", () => {
    expect(aplicarPromocion([karseell(), raices()])).toEqual([true, false]);
  });

  it("un turno vacío no rompe", () => {
    expect(aplicarPromocion([])).toEqual([]);
  });
});

describe("tierEfectivo", () => {
  it("sin promoción cobra el precio normal", () => {
    expect(tierEfectivo(tier(20000, 7000), false)).toEqual({ precio: 20000, duracion: 45 });
  });

  it("con promoción cobra el precio de agregado y ocupa menos tiempo", () => {
    expect(tierEfectivo(tier(20000, 7000), true)).toEqual({ precio: 7000, duracion: 15 });
  });

  it("un tratamiento sin precio de promoción cobra el normal aunque haya color", () => {
    // NULL significa «no hay promoción para esto», nunca cero: cobrar $0
    // sería regalar el tratamiento por un dato que falta.
    expect(tierEfectivo(tier(25000, null), true)).toEqual({ precio: 25000, duracion: 45 });
  });
});

describe("computeQuote con la promoción aplicada", () => {
  it("cotiza el tratamiento al precio de agregado", () => {
    const q = computeQuote({
      service: karseell(),
      lengthTier: "corto",
      settings,
      comoAgregado: true,
    });
    expect(q.estimatedMinAmount).toBe(7000);
    expect(q.items[0].priceAmount).toBe(7000);
  });

  it("sin la marca cotiza al precio suelto", () => {
    const q = computeQuote({ service: karseell(), lengthTier: "corto", settings });
    expect(q.estimatedMinAmount).toBe(20000);
  });

  it("la seña se calcula sobre lo que se cobra, no sobre el precio suelto", () => {
    const q = computeQuote({
      service: karseell(),
      lengthTier: "corto",
      settings,
      comoAgregado: true,
    });
    expect(q.depositAmount).toBe(1400); // 20% de 7.000, no de 20.000
    expect(q.remainingAmount).toBe(5600);
  });

  it("el turno entero sale lo que Sol cobra de verdad", () => {
    const conPromocion = aplicarPromocion([raices(), karseell()]);
    const color = computeQuote({
      service: raices(),
      lengthTier: "corto",
      settings,
      comoAgregado: conPromocion[0],
    });
    const trat = computeQuote({
      service: karseell(),
      lengthTier: "corto",
      settings,
      comoAgregado: conPromocion[1],
    });
    // $28.000 de raíces + $7.000 de karseell arriba del color.
    expect(color.estimatedMinAmount + trat.estimatedMinAmount).toBe(35000);
  });
});

describe("ahorroDeLaPromocion", () => {
  it("dice cuánto se ahorró, para poder contárselo a la clienta", () => {
    const servicios = [raices(), karseell()];
    const conPromocion = aplicarPromocion(servicios);
    expect(ahorroDeLaPromocion(servicios, conPromocion, ["corto", "corto"])).toBe(13000);
  });

  it("sin promoción no hay ahorro que anunciar", () => {
    const servicios = [karseell()];
    expect(ahorroDeLaPromocion(servicios, aplicarPromocion(servicios), ["corto"])).toBe(0);
  });

  it("un tratamiento sin precio de promoción no suma ahorro inventado", () => {
    const sinPromocion = servicio("nutricion", "tratamiento", 17000, null);
    const servicios = [raices(), sinPromocion];
    const conPromocion = aplicarPromocion(servicios);
    expect(conPromocion).toEqual([false, true]);
    expect(ahorroDeLaPromocion(servicios, conPromocion, ["corto", "corto"])).toBe(0);
  });
});
