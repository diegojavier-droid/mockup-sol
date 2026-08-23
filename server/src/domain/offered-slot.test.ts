import { describe, expect, test } from "bun:test";
import { checkOfferedSlot, toSalonDateTime } from "./offered-slot";
import type { AvailabilityQuery } from "./availability";

const TZ = -180; // Santa Fe, UTC-3

/** Martes 2026-09-01 a la hora del salón indicada. */
function salon(day: number, hm: string): Date {
  const [h, m] = hm.split(":").map(Number);
  return new Date(Date.UTC(2026, 8, day, h - TZ / 60, m));
}

const base: Omit<AvailabilityQuery, "rangeStart" | "rangeEnd"> = {
  blockingMin: 60,
  areaCapacity: 1,
  // Martes a sábado, 09:00 a 18:00. Domingo y lunes cerrado.
  businessHours: [2, 3, 4, 5, 6].map((weekday) => ({
    weekday,
    opensAt: "09:00",
    closesAt: "18:00",
  })),
  exceptions: [],
  existing: [],
  slotGranularityMin: 30,
  minAdvanceMin: 120,
  now: salon(1, "08:00"),
  tzOffsetMin: TZ,
};

describe("checkOfferedSlot", () => {
  test("acepta un horario de la grilla", () => {
    // 2026-09-01 es martes.
    expect(
      checkOfferedSlot({
        startsAt: salon(1, "11:00"),
        now: base.now,
        maxAdvanceDays: 30,
        availability: base,
      }),
    ).toBeNull();
  });

  test("rechaza la madrugada", () => {
    expect(
      checkOfferedSlot({
        startsAt: salon(1, "03:00"),
        now: base.now,
        maxAdvanceDays: 30,
        availability: base,
      }),
    ).toBe("not_offered");
  });

  test("rechaza un día en que el salón no abre", () => {
    // 2026-09-06 es domingo.
    expect(
      checkOfferedSlot({
        startsAt: salon(6, "11:00"),
        now: base.now,
        maxAdvanceDays: 30,
        availability: base,
      }),
    ).toBe("not_offered");
  });

  test("rechaza un horario fuera de la grilla de 30 minutos", () => {
    expect(
      checkOfferedSlot({
        startsAt: salon(1, "10:07"),
        now: base.now,
        maxAdvanceDays: 30,
        availability: base,
      }),
    ).toBe("not_offered");
  });

  test("rechaza un turno que no cierra antes de la hora de cierre", () => {
    // 17:30 + 60 min de ventana operativa pasa las 18:00.
    expect(
      checkOfferedSlot({
        startsAt: salon(1, "17:30"),
        now: base.now,
        maxAdvanceDays: 30,
        availability: base,
      }),
    ).toBe("not_offered");
  });

  test("rechaza lo que viola la anticipación mínima", () => {
    // Falta menos de 2 h para las 09:00.
    expect(
      checkOfferedSlot({
        startsAt: salon(1, "09:00"),
        now: salon(1, "08:00"),
        maxAdvanceDays: 30,
        availability: base,
      }),
    ).toBe("not_offered");
  });

  test("rechaza más allá de la anticipación máxima", () => {
    expect(
      checkOfferedSlot({
        startsAt: salon(29, "11:00"),
        now: base.now,
        maxAdvanceDays: 7,
        availability: base,
      }),
    ).toBe("too_far_ahead");
  });

  test("rechaza un horario que otra reserva ya ocupa", () => {
    expect(
      checkOfferedSlot({
        startsAt: salon(1, "11:00"),
        now: base.now,
        maxAdvanceDays: 30,
        availability: {
          ...base,
          existing: [{ startsAt: salon(1, "11:00"), endsAt: salon(1, "12:00"), units: 1 }],
        },
      }),
    ).toBe("not_offered");
  });

  test("rechaza un horario dentro de un cierre programado", () => {
    expect(
      checkOfferedSlot({
        startsAt: salon(1, "11:00"),
        now: base.now,
        maxAdvanceDays: 30,
        availability: {
          ...base,
          exceptions: [
            { startsAt: salon(1, "10:00"), endsAt: salon(1, "13:00"), capacityDelta: null },
          ],
        },
      }),
    ).toBe("not_offered");
  });

  test("la fecha y hora se leen en hora del salón, no en UTC", () => {
    // 2026-09-01T23:30-03:00 es 2026-09-02T02:30Z: el día no debe correrse.
    expect(toSalonDateTime(salon(1, "23:30"), TZ)).toEqual({
      date: "2026-09-01",
      time: "23:30",
    });
  });
});
