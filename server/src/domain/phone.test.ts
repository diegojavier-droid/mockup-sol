import { describe, expect, test } from "bun:test";
import { normalizePhoneAr } from "./phone";

describe("normalizePhoneAr", () => {
  test("todas las formas que escribe una clienta de Santa Fe convergen", () => {
    const variants = [
      "+5493425551234",
      "5493425551234",
      "03425551234",
      "0342 15 555 1234",
      "342 555 1234",
      "(342) 555-1234",
    ];
    const normalized = variants.map(normalizePhoneAr);
    expect(new Set(normalized).size).toBe(1);
    expect(normalized[0]).toBe("+5493425551234");
  });

  test("respeta un internacional ya válido", () => {
    expect(normalizePhoneAr("+34911223344")).toBe("+34911223344");
    expect(normalizePhoneAr("0034911223344")).toBe("+34911223344");
  });

  test("rechaza entradas que no son teléfonos", () => {
    expect(normalizePhoneAr("")).toBeNull();
    expect(normalizePhoneAr("   ")).toBeNull();
    expect(normalizePhoneAr("abc")).toBeNull();
    expect(normalizePhoneAr("123")).toBeNull();
    expect(normalizePhoneAr("+0123456789")).toBeNull();
  });

  test("la salida siempre cumple el CHECK de la columna phone_e164", () => {
    const pattern = /^\+[1-9][0-9]{6,14}$/;
    for (const input of ["+5493425551234", "3425551234", "0342 15 555 1234", "+34911223344"]) {
      const out = normalizePhoneAr(input);
      expect(out).not.toBeNull();
      expect(pattern.test(out!)).toBe(true);
    }
  });
});
