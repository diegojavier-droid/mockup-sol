/**
 * Mientras no se sabe quién sos, no se decide.
 *
 * Esta prueba existe por un defecto que se publicó: la sección miraba
 * `puede(identidad, ...)` a secas, y como `identidad` vale `undefined`
 * mientras el pedido de `/me` viaja, la pantalla mostraba «esto no es
 * tuyo» a cualquiera durante toda la espera. A Sol, en su propio panel,
 * con un cartel diciéndole que le pidiera acceso a quien lo administra.
 *
 * Ni el `typecheck`, ni los 214 tests, ni las 28 comprobaciones en
 * navegador lo agarraron: todas esperaban a que la pantalla terminara de
 * cargar antes de mirarla, que es justo el instante que se rompía.
 */

import { describe, expect, test } from "bun:test";
import { queMostrar } from "./panel-sesion";
import type { StaffIdentity } from "./staff-session";

const SOL = {
  email: "sol@ejemplo.test",
  staffId: "1",
  displayName: "Sol",
  role: "duena",
  roleName: "Administradora",
  permisos: { calendario: "full", finanzas: "full" },
} as StaffIdentity;

const MOSTRADOR = { ...SOL, permisos: { calendario: "full" } } as StaffIdentity;

describe("qué se dibuja en una sección", () => {
  test("mientras la identidad no llegó, se espera: no se dice que no", () => {
    // El caso del defecto. `identidad` es `undefined` porque el pedido
    // todavía viaja, no porque falten permisos.
    expect(queMostrar({ identidad: undefined, cargando: true }, "finanzas")).toBe("esperando");
  });

  test("y eso vale aunque el módulo sea uno que la persona sí puede ver", () => {
    expect(queMostrar({ identidad: undefined, cargando: true }, "calendario")).toBe("esperando");
  });

  test("con la identidad puesta y permiso, se abre", () => {
    expect(queMostrar({ identidad: SOL, cargando: false }, "finanzas")).toBe("adelante");
  });

  test("con la identidad puesta y sin permiso, se dice que no", () => {
    expect(queMostrar({ identidad: MOSTRADOR, cargando: false }, "finanzas")).toBe("sin-permiso");
  });

  test("si terminó de cargar y no hay identidad, también se dice que no", () => {
    // Terminó y no hay: eso sí es «no te alcanza», y acá el cartel
    // corresponde.
    expect(queMostrar({ identidad: undefined, cargando: false }, "finanzas")).toBe("sin-permiso");
  });

  test("un módulo que la persona no tiene en la matriz es «no», no «esperando»", () => {
    expect(queMostrar({ identidad: SOL, cargando: false }, "compras")).toBe("sin-permiso");
  });
});
