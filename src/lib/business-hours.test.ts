/**
 * El horario que ve la clienta.
 *
 * Esta lógica es chica pero se equivoca de maneras caras: si agrupa mal,
 * la portada anuncia que el salón abre un día que está cerrado, y quien
 * da la cara cuando la clienta llega es Sol.
 */

import { describe, expect, it } from "bun:test";
import { toClosedDays, toScheduleLines, type ApiBusinessHour } from "./business-hours";

// El horario real de Sol Mai, tal como queda después de la migración
// 20260907120000_real_business_hours.sql.
const SOL_MAI: ApiBusinessHour[] = [
  { weekday: 2, opensAt: "08:00", closesAt: "15:00" },
  { weekday: 3, opensAt: "08:00", closesAt: "15:00" },
  { weekday: 4, opensAt: "13:00", closesAt: "20:00" },
  { weekday: 5, opensAt: "13:00", closesAt: "20:00" },
];

describe("toScheduleLines", () => {
  it("agrupa los días seguidos que comparten horario", () => {
    expect(toScheduleLines(SOL_MAI)).toEqual([
      { days: "Martes y miércoles", hours: "8 a 15" },
      { days: "Jueves y viernes", hours: "13 a 20" },
    ]);
  });

  it("no fusiona días que comparten horario pero no son consecutivos", () => {
    // Martes y viernes iguales, miércoles distinto: decir «martes a
    // viernes de 8 a 15» sería falso para el jueves.
    const lines = toScheduleLines([
      { weekday: 2, opensAt: "08:00", closesAt: "15:00" },
      { weekday: 3, opensAt: "13:00", closesAt: "20:00" },
      { weekday: 5, opensAt: "08:00", closesAt: "15:00" },
    ]);
    expect(lines).toEqual([
      { days: "Martes", hours: "8 a 15" },
      { days: "Miércoles", hours: "13 a 20" },
      { days: "Viernes", hours: "8 a 15" },
    ]);
  });

  it("un día cerrado en el medio corta el grupo", () => {
    // Lunes y miércoles iguales con el martes cerrado: si el hueco no
    // cortara, saldría «lunes a miércoles» y el martes está cerrado.
    const lines = toScheduleLines([
      { weekday: 1, opensAt: "09:00", closesAt: "18:00" },
      { weekday: 3, opensAt: "09:00", closesAt: "18:00" },
    ]);
    expect(lines).toEqual([
      { days: "Lunes", hours: "9 a 18" },
      { days: "Miércoles", hours: "9 a 18" },
    ]);
  });

  it("tres días o más seguidos se dicen como rango", () => {
    const lines = toScheduleLines([
      { weekday: 1, opensAt: "09:00", closesAt: "18:00" },
      { weekday: 2, opensAt: "09:00", closesAt: "18:00" },
      { weekday: 3, opensAt: "09:00", closesAt: "18:00" },
      { weekday: 4, opensAt: "09:00", closesAt: "18:00" },
    ]);
    expect(lines).toEqual([{ days: "Lunes a jueves", hours: "9 a 18" }]);
  });

  it("muestra los minutos sólo cuando los hay", () => {
    const lines = toScheduleLines([{ weekday: 6, opensAt: "09:30", closesAt: "14:00" }]);
    expect(lines).toEqual([{ days: "Sábado", hours: "9:30 a 14" }]);
  });

  it("un día con dos franjas las muestra las dos y no se fusiona con un día de una", () => {
    const lines = toScheduleLines([
      { weekday: 2, opensAt: "09:00", closesAt: "13:00" },
      { weekday: 2, opensAt: "16:00", closesAt: "20:00" },
      { weekday: 3, opensAt: "09:00", closesAt: "13:00" },
    ]);
    expect(lines).toEqual([
      { days: "Martes", hours: "9 a 13 y 16 a 20" },
      { days: "Miércoles", hours: "9 a 13" },
    ]);
  });

  it("sin horarios no inventa nada", () => {
    expect(toScheduleLines([])).toEqual([]);
  });
});

describe("toClosedDays", () => {
  it("nombra el lunes cerrado de Sol Mai", () => {
    expect(toClosedDays(SOL_MAI)).toBe("Lunes cerrado");
  });

  it("no anuncia el sábado como cerrado", () => {
    // El sábado está fuera de la grilla porque las novias y los eventos
    // se coordinan por WhatsApp, no porque el salón cierre. Decir
    // «sábado cerrado» sería mentirle a la clienta.
    expect(toClosedDays(SOL_MAI)).not.toContain("ábado");
  });

  it("no anuncia el domingo, que nadie espera abierto", () => {
    expect(toClosedDays(SOL_MAI)).not.toContain("omingo");
  });

  it("si no falta ningún día de semana, no dice nada", () => {
    const full: ApiBusinessHour[] = [1, 2, 3, 4, 5].map((weekday) => ({
      weekday,
      opensAt: "09:00",
      closesAt: "18:00",
    }));
    expect(toClosedDays(full)).toBe("");
  });
});
