import { describe, expect, test } from "bun:test";
import { agendaActions } from "./agenda-actions";

describe("acciones de agenda: llegada y cierre independientes", () => {
  test("confirmado permite llegada y cierre directo", () => {
    expect(agendaActions({ status: "confirmed", hasServiceClosure: false })).toEqual({
      markArrival: true,
      closeService: true,
      manageBooking: true,
    });
  });

  test("Llegó y Vino igual conservan el cierre sin reabrir ausencia ni estación", () => {
    expect(agendaActions({ status: "attended", hasServiceClosure: false })).toEqual({
      markArrival: false,
      closeService: true,
      manageBooking: false,
    });
  });

  for (const status of ["confirmed", "attended"]) {
    test(`${status}: no abrir un cierre existente ni uno de estado desconocido`, () => {
      expect(agendaActions({ status, hasServiceClosure: true }).closeService).toBe(false);
      expect(agendaActions({ status }).closeService).toBe(false);
    });
  }

  for (const status of ["pending_payment", "cancelled", "expired", "no_show", "desconocido"]) {
    test(`${status}: no habilitar llegada ni cierre`, () => {
      const actions = agendaActions({ status, hasServiceClosure: false });
      expect(actions.markArrival).toBe(false);
      expect(actions.closeService).toBe(false);
      expect(actions.manageBooking).toBe(status === "pending_payment");
    });
  }
});
