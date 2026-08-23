import { describe, expect, test } from "bun:test";
import {
  buildResourceDemands,
  computeAvailability,
  effectiveCapacity,
  peakUsage,
  type AvailabilityQuery,
  type ExistingDemand,
} from "./availability";

const TZ = -180; // Santa Fe, UTC-3

/** Instante UTC de una hora local del salón. */
const local = (iso: string, hm: string) => {
  const [h, m] = hm.split(":").map(Number);
  return new Date(Date.parse(`${iso}T00:00:00Z`) + (h * 60 + m - TZ) * 60_000);
};

// 2026-09-01 es martes.
const MON = "2026-08-31";
const TUE = "2026-09-01";

const baseQuery = (over: Partial<AvailabilityQuery> = {}): AvailabilityQuery => ({
  blockingMin: 30,
  areaCapacity: 1,
  businessHours: [
    { weekday: 2, opensAt: "09:30", closesAt: "12:30" }, // martes
  ],
  exceptions: [],
  existing: [],
  rangeStart: local(TUE, "00:00"),
  rangeEnd: local(TUE, "23:59"),
  slotGranularityMin: 30,
  minAdvanceMin: 0,
  now: local("2026-08-25", "10:00"),
  tzOffsetMin: TZ,
  ...over,
});

describe("peakUsage — concurrencia, no conteo de solapes", () => {
  const demand = (from: string, to: string): ExistingDemand => ({
    startsAt: local(TUE, from),
    endsAt: local(TUE, to),
    units: 1,
  });

  test("dos reservas que solapan la ventana pero no entre sí valen 1", () => {
    const peak = peakUsage(
      [demand("09:00", "10:30"), demand("11:30", "13:00")],
      local(TUE, "10:00").getTime(),
      local(TUE, "12:00").getTime(),
    );
    expect(peak).toBe(1);
  });

  test("dos reservas simultáneas valen 2", () => {
    const peak = peakUsage(
      [demand("10:00", "12:00"), demand("10:30", "11:30")],
      local(TUE, "10:00").getTime(),
      local(TUE, "12:00").getTime(),
    );
    expect(peak).toBe(2);
  });

  test("una reserva que termina justo al empezar la ventana no ocupa", () => {
    expect(
      peakUsage(
        [demand("09:00", "10:00")],
        local(TUE, "10:00").getTime(),
        local(TUE, "11:00").getTime(),
      ),
    ).toBe(0);
  });
});

describe("effectiveCapacity", () => {
  const start = local(TUE, "10:00").getTime();
  const end = local(TUE, "11:00").getTime();

  test("sin excepciones mantiene la capacidad base", () => {
    expect(effectiveCapacity(5, [], start, end)).toBe(5);
  });

  test("un cierre (delta null) la anula", () => {
    const ex = [
      { startsAt: local(TUE, "09:00"), endsAt: local(TUE, "13:00"), capacityDelta: null },
    ];
    expect(effectiveCapacity(5, ex, start, end)).toBe(0);
  });

  test("un delta negativo la reduce y nunca baja de cero", () => {
    const ex = [{ startsAt: local(TUE, "09:00"), endsAt: local(TUE, "13:00"), capacityDelta: -2 }];
    expect(effectiveCapacity(5, ex, start, end)).toBe(3);
    expect(effectiveCapacity(1, ex, start, end)).toBe(0);
  });

  test("una excepción fuera de la ventana no afecta", () => {
    const ex = [
      { startsAt: local(TUE, "15:00"), endsAt: local(TUE, "16:00"), capacityDelta: null },
    ];
    expect(effectiveCapacity(5, ex, start, end)).toBe(5);
  });
});

describe("computeAvailability", () => {
  test("respeta apertura, cierre y granularidad", () => {
    const days = computeAvailability(baseQuery());
    expect(days).toHaveLength(1);
    expect(days[0].date).toBe(TUE);
    // 09:30..12:30 con bloques de 30 min: el último que entra empieza 12:00
    expect(days[0].times).toEqual(["09:30", "10:00", "10:30", "11:00", "11:30", "12:00"]);
  });

  test("un turno que excede el cierre no se ofrece", () => {
    const days = computeAvailability(baseQuery({ blockingMin: 180 }));
    expect(days[0].times).toEqual(["09:30"]);
  });

  test("días sin horario configurado no aparecen", () => {
    const days = computeAvailability(
      baseQuery({ rangeStart: local(MON, "00:00"), rangeEnd: local(MON, "23:59") }),
    );
    expect(days).toHaveLength(0);
  });

  test("capacidad 1: una reserva bloquea sus slots solapados", () => {
    const days = computeAvailability(
      baseQuery({
        existing: [{ startsAt: local(TUE, "10:00"), endsAt: local(TUE, "11:00"), units: 1 }],
      }),
    );
    expect(days[0].times).toEqual(["09:30", "11:00", "11:30", "12:00"]);
  });

  test("capacidad 5: la misma reserva no bloquea nada", () => {
    const days = computeAvailability(
      baseQuery({
        areaCapacity: 5,
        existing: [{ startsAt: local(TUE, "10:00"), endsAt: local(TUE, "11:00"), units: 1 }],
      }),
    );
    expect(days[0].times).toHaveLength(6);
  });

  test("capacidad 5 saturada en una franja la retira", () => {
    const existing = Array.from({ length: 5 }, () => ({
      startsAt: local(TUE, "10:00"),
      endsAt: local(TUE, "11:00"),
      units: 1,
    }));
    const days = computeAvailability(baseQuery({ areaCapacity: 5, existing }));
    expect(days[0].times).toEqual(["09:30", "11:00", "11:30", "12:00"]);
  });

  test("un cierre elimina el día completo", () => {
    const days = computeAvailability(
      baseQuery({
        exceptions: [
          { startsAt: local(TUE, "00:00"), endsAt: local(TUE, "23:59"), capacityDelta: null },
        ],
      }),
    );
    expect(days).toHaveLength(0);
  });

  test("una merma de capacidad reduce la oferta como corresponde", () => {
    const days = computeAvailability(
      baseQuery({
        areaCapacity: 2,
        exceptions: [
          { startsAt: local(TUE, "09:00"), endsAt: local(TUE, "13:00"), capacityDelta: -1 },
        ],
        existing: [{ startsAt: local(TUE, "10:00"), endsAt: local(TUE, "11:00"), units: 1 }],
      }),
    );
    expect(days[0].times).toEqual(["09:30", "11:00", "11:30", "12:00"]);
  });

  test("la anticipación mínima descarta los slots demasiado próximos", () => {
    const days = computeAvailability(baseQuery({ now: local(TUE, "09:00"), minAdvanceMin: 120 }));
    expect(days[0].times).toEqual(["11:00", "11:30", "12:00"]);
  });

  test("sin capacidad o sin duración no hay oferta", () => {
    expect(computeAvailability(baseQuery({ areaCapacity: 0 }))).toHaveLength(0);
    expect(computeAvailability(baseQuery({ blockingMin: 0 }))).toHaveLength(0);
  });
});

describe("buildResourceDemands — punto de evolución (D21)", () => {
  test("el MVP declara una demanda por la ventana operativa completa", () => {
    const demands = buildResourceDemands({
      areaSlug: "depilacion",
      startsAt: local(TUE, "10:00"),
      blockingMin: 30,
    });
    expect(demands).toHaveLength(1);
    expect(demands[0].resource).toBe("depilacion");
    expect(demands[0].units).toBe(1);
    expect(demands[0].endsAt.getTime() - demands[0].startsAt.getTime()).toBe(30 * 60_000);
  });
});
