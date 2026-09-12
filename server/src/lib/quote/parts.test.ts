/**
 * El cableado de la promoción.
 *
 * POR QUÉ ESTE ARCHIVO EXISTE APARTE DE `promocion.test.ts`
 *
 * Aquellas pruebas cubren la REGLA: dado un turno, cuáles prestaciones
 * entran a precio de promoción. Ésta cubre que la regla se APLIQUE de verdad
 * al cotizar. Son cosas distintas y se rompen por separado: se comprobó
 * cambiando `comoAgregado: conPromocion[i]` por `comoAgregado: false` en
 * `cotizarPartes`, y las 72 pruebas del dominio siguieron pasando. Una
 * regla correcta que nadie llama cobra igual que no tenerla.
 */

import { describe, expect, it } from "bun:test";
import { cotizarPartes } from "./parts";
import type { LoadedQuoteContext } from "./repository";
import type { QuoteServiceData, QuoteSettings, ServiceTier } from "../../domain/types";

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

function contexto(
  slug: string,
  kind: QuoteServiceData["kind"],
  priceMain: number,
  priceAddon: number | null = null,
): LoadedQuoteContext {
  const service: QuoteServiceData = {
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
  return { service, extras: [], settings, areaSlug: "peluqueria" };
}

// Precios reales de la lista de Sol.
const raices = () => contexto("retoque-raiz", "color", 28000);
const karseell = () => contexto("karseell", "tratamiento", 20000, 7000);
const corte = () => contexto("corte-fem", "servicio", 15000);

const enCorto = (n: number) =>
  Array.from({ length: n }, () => ({ serviceSlug: "x", lengthTier: "corto" as const }));

describe("cotizarPartes", () => {
  it("aplica la promoción cuando el turno lleva color y tratamiento", () => {
    const r = cotizarPartes([raices(), karseell()], enCorto(2), settings);
    // 28.000 de raíces + 7.000 de karseell arriba del color, no 20.000.
    expect(r.total.estimatedMinAmount).toBe(35000);
    expect(r.conPromocion).toEqual([false, true]);
  });

  it("sin color cobra los dos precios sueltos", () => {
    const r = cotizarPartes([corte(), karseell()], enCorto(2), settings);
    expect(r.total.estimatedMinAmount).toBe(35000); // 15.000 + 20.000
    expect(r.conPromocion).toEqual([false, false]);
  });

  it("un tratamiento solo no recibe la promoción", () => {
    const r = cotizarPartes([karseell()], enCorto(1), settings);
    expect(r.total.estimatedMinAmount).toBe(20000);
  });

  it("la seña sale sobre el total con la promoción ya aplicada", () => {
    const r = cotizarPartes([raices(), karseell()], enCorto(2), settings);
    expect(r.total.depositAmount).toBe(7000); // 20% de 35.000
  });

  it("devuelve también cada parte, que es lo que arma los items del turno", () => {
    const r = cotizarPartes([raices(), karseell()], enCorto(2), settings);
    expect(r.partes).toHaveLength(2);
    expect(r.partes[0].estimatedMinAmount).toBe(28000);
    expect(r.partes[1].estimatedMinAmount).toBe(7000);
  });

  it("la promoción también libera agenda: el tratamiento ocupa menos", () => {
    const conColor = cotizarPartes([raices(), karseell()], enCorto(2), settings);
    const sinColor = cotizarPartes([corte(), karseell()], enCorto(2), settings);
    // 45 + 15 contra 45 + 45: el tratamiento se aplica durante el color.
    expect(conColor.total.durationShownMin).toBe(60);
    expect(sinColor.total.durationShownMin).toBe(90);
  });

  it("un tratamiento sin precio de promoción no se regala", () => {
    const nutricion = contexto("nutricion", "tratamiento", 17000, null);
    const r = cotizarPartes([raices(), nutricion], enCorto(2), settings);
    expect(r.conPromocion).toEqual([false, true]);
    expect(r.total.estimatedMinAmount).toBe(45000); // 28.000 + 17.000
  });
});
