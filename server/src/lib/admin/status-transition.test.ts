import { describe, expect, test } from "bun:test";
import { parseTransitionError, TransitionError } from "./repository";

/**
 * La regla de qué transición es legal ya no vive acá: la decide
 * `set_booking_status` en PostgreSQL, junto con el bloqueo de fila y la
 * escritura de auditoría, en una sola transacción. Lo que sí vive acá es
 * la traducción del error de base al mensaje que ve el salón, y eso es
 * lo único que estas pruebas cubren.
 *
 * La propiedad real —que el estado no cambia sin actor y que el cambio
 * queda auditado— se prueba contra PostgreSQL en el workflow de
 * clean-room, porque es ahí donde puede fallar de verdad.
 */
describe("traducción del rechazo de transición", () => {
  test("recupera origen y destino del error de PostgreSQL", () => {
    const r = parseTransitionError("invalid_transition:pending_payment->attended");
    expect(r).toEqual({ from: "pending_payment", to: "attended" });
  });

  test("lo encuentra aunque PostgREST envuelva el mensaje", () => {
    const r = parseTransitionError(
      'invalid_transition:confirmed->expired CONTEXT: PL/pgSQL function set_booking_status(uuid,text,uuid,text) line 34 at RAISE',
    );
    expect(r).toEqual({ from: "confirmed", to: "expired" });
  });

  test("un error que no es de transición no se confunde con uno", () => {
    expect(parseTransitionError("booking_not_found")).toBeNull();
    expect(parseTransitionError("actor_required")).toBeNull();
    expect(parseTransitionError("")).toBeNull();
  });

  test("no inventa una transición a partir de texto parecido", () => {
    expect(parseTransitionError("invalid_transition")).toBeNull();
    expect(parseTransitionError("invalid_transition:confirmed")).toBeNull();
  });

  test("el error traducido conserva ambos estados para el mensaje del panel", () => {
    const parsed = parseTransitionError("invalid_transition:cancelled->confirmed");
    expect(parsed).not.toBeNull();
    const error = new TransitionError(parsed!.from, parsed!.to);
    expect(error.from).toBe("cancelled");
    expect(error.to).toBe("confirmed");
    expect(error.message).toBe("invalid_transition:cancelled->confirmed");
  });
});
