import { describe, expect, it } from "bun:test";
import { formatPesos, priceViewFromQuote } from "./booking-price";
import type { ApiQuote } from "./api/catalog-types";

/**
 * Estas pruebas cuidan una sola cosa: que el precio que ve la clienta sea
 * el del servidor y nada más.
 *
 * Antes lo calculaba el navegador con una matriz escrita a mano y una tasa
 * de seña constante. Coincidía con la base por casualidad, y el día que
 * Sol cambiara un precio dejaba de coincidir.
 */
const base: ApiQuote = {
  items: [],
  priceDisplayMode: "fixed",
  isEstimate: false,
  estimatedMinAmount: 18000,
  estimatedMaxAmount: null,
  durationShownMin: 45,
  depositRatePct: 20,
  depositAmount: 3600,
  remainingAmount: 14400,
  requiresConsultation: false,
} as ApiQuote;

describe("el precio que ve la clienta", () => {
  it("sin cotización no inventa ningún número", () => {
    expect(priceViewFromQuote(null)).toBeNull();
    expect(priceViewFromQuote(undefined)).toBeNull();
  });

  it("muestra el importe que mandó el servidor", () => {
    expect(priceViewFromQuote(base)?.price).toBe("$18.000");
  });

  it("si el servidor cambia el precio, cambia lo que se muestra", () => {
    const masCaro = { ...base, estimatedMinAmount: 25000, depositAmount: 5000, remainingAmount: 20000 };
    const view = priceViewFromQuote(masCaro);
    expect(view?.price).toBe("$25.000");
    expect(view?.depositPrice).toBe("$5.000");
    expect(view?.remainingPrice).toBe("$20.000");
  });

  it("la seña y el saldo salen del servidor, no de una constante", () => {
    // 15% en vez del 20% de siempre: si estuviera constante en el código,
    // esta prueba fallaría.
    const otraTasa = { ...base, depositRatePct: 15, depositAmount: 2700, remainingAmount: 15300 };
    const view = priceViewFromQuote(otraTasa);
    expect(view?.depositRatePct).toBe(15);
    expect(view?.depositPrice).toBe("$2.700");
  });

  it("dice «Desde» cuando el precio es un piso", () => {
    expect(priceViewFromQuote({ ...base, priceDisplayMode: "from" })?.price).toBe("Desde $18.000");
    expect(priceViewFromQuote({ ...base, isEstimate: true })?.price).toBe("Desde $18.000");
  });

  it("formatea en pesos argentinos", () => {
    expect(formatPesos(52000)).toBe("$52.000");
    expect(formatPesos(0)).toBe("$0");
  });
});
