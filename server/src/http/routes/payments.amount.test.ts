import { describe, expect, test } from "bun:test";

/**
 * La regla del importe, aislada de Mercado Pago.
 *
 * Antes: `amount !== null && amount < due` — con importe nulo el guard
 * se salteaba y el turno se confirmaba sin que nadie supiera cuánto
 * entró. Fallar abierto es lo peor que puede hacer un control de dinero.
 */
function decide(status: string, amount: number | null, due: number) {
  const unverifiable = status === "approved" && amount === null;
  const underpaid = status === "approved" && amount !== null && amount < due;
  if (unverifiable) return "unverified_amount";
  if (underpaid) return "underpaid";
  return status === "approved" ? "confirm" : "record";
}

describe("qué hace el webhook con el importe", () => {
  test("aprobado sin importe verificable NO confirma", () => {
    expect(decide("approved", null, 6000)).toBe("unverified_amount");
  });

  test("aprobado por menos de la seña NO confirma", () => {
    expect(decide("approved", 1, 6000)).toBe("underpaid");
    expect(decide("approved", 5999, 6000)).toBe("underpaid");
  });

  test("aprobado por el importe exacto confirma", () => {
    expect(decide("approved", 6000, 6000)).toBe("confirm");
  });

  test("aprobado por más confirma: pagar de más no es un problema", () => {
    expect(decide("approved", 9000, 6000)).toBe("confirm");
  });

  test("rechazado se registra sin confirmar, tenga importe o no", () => {
    expect(decide("rejected", 6000, 6000)).toBe("record");
    expect(decide("rejected", null, 6000)).toBe("record");
  });

  test("una seña de cero confirma con cualquier importe conocido", () => {
    expect(decide("approved", 0, 0)).toBe("confirm");
  });
});
