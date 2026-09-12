/**
 * Contar turnos por día, en la zona del salón.
 *
 * La consulta en sí se prueba contra PostgreSQL en el clean-room, que es
 * donde puede fallar de verdad. Lo que se prueba acá es lo único que
 * decide el servidor sin ayuda de la base: a qué día pertenece cada
 * turno.
 *
 * Y no es un detalle: Santa Fe está tres horas detrás de UTC, así que un
 * turno de las 22:00 cae a la 01:00 UTC del día siguiente. Contarlo por
 * UTC lo pone un día más adelante en el calendario —justo el turno de
 * cierre, que es el que menos sobra— y el número de arriba contradiría a
 * la lista de abajo sin que nadie sepa cuál está mal.
 */

import { describe, expect, test } from "bun:test";
import { agruparPorDia } from "./repository";

describe("agrupar turnos por día del salón", () => {
  test("sin turnos, ningún día", () => {
    expect(agruparPorDia([])).toEqual([]);
  });

  test("cuenta los del mismo día juntos", () => {
    expect(
      agruparPorDia([
        "2026-09-15T13:00:00.000Z",
        "2026-09-15T14:30:00.000Z",
        "2026-09-16T13:00:00.000Z",
      ]),
    ).toEqual([
      { dia: "2026-09-15", turnos: 2 },
      { dia: "2026-09-16", turnos: 1 },
    ]);
  });

  test("un turno de las 22 del salón cuenta en SU día, no en el siguiente", () => {
    // 22:00 en Santa Fe = 01:00 UTC del 16. Pertenece al 15.
    expect(agruparPorDia(["2026-09-16T01:00:00.000Z"])).toEqual([{ dia: "2026-09-15", turnos: 1 }]);
  });

  test("y uno de las 00:30 del salón cuenta en el día que empieza", () => {
    // 00:30 del 16 en Santa Fe = 03:30 UTC del 16.
    expect(agruparPorDia(["2026-09-16T03:30:00.000Z"])).toEqual([{ dia: "2026-09-16", turnos: 1 }]);
  });

  test("los días salen en orden, aunque los turnos vengan desordenados", () => {
    expect(
      agruparPorDia([
        "2026-09-20T13:00:00.000Z",
        "2026-09-03T13:00:00.000Z",
        "2026-09-11T13:00:00.000Z",
      ]).map((d) => d.dia),
    ).toEqual(["2026-09-03", "2026-09-11", "2026-09-20"]);
  });

  test("cruzar el fin de mes no mezcla los días", () => {
    // 21:00 del 30 de septiembre en el salón = 00:00 UTC del 1 de octubre.
    expect(agruparPorDia(["2026-10-01T00:00:00.000Z", "2026-10-01T13:00:00.000Z"])).toEqual([
      { dia: "2026-09-30", turnos: 1 },
      { dia: "2026-10-01", turnos: 1 },
    ]);
  });

  test("una marca de tiempo rota se descarta en vez de romper la cuenta", () => {
    // Un día ilegible no puede tumbar el calendario entero.
    expect(agruparPorDia(["no es una fecha", "2026-09-15T13:00:00.000Z"])).toEqual([
      { dia: "2026-09-15", turnos: 1 },
    ]);
  });
});
