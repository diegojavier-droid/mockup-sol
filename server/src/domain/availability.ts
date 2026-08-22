/**
 * AvailabilityService — cálculo de horarios viables (lógica pura).
 *
 * MVP conservador (D21): cada reserva declara UNA demanda sobre el área
 * por la ventana operativa completa (C = M + setup). El motor consume
 * `ResourceDemand[]` sin saber cómo se construyó, así que evolucionar a
 * disponibilidad por recursos (silla vs profesional, usando el tiempo de
 * proceso B) sólo cambia `buildResourceDemands`, no el motor.
 */

export interface ResourceDemand {
  resource: string;
  startsAt: Date;
  endsAt: Date;
  units: number;
}

export interface BusinessHour {
  weekday: number; // 0=domingo
  opensAt: string; // "09:30"
  closesAt: string; // "18:30"
}

export interface ScheduleException {
  startsAt: Date;
  endsAt: Date;
  /** null = cierre total; negativo = merma de capacidad */
  capacityDelta: number | null;
}

export interface ExistingDemand {
  startsAt: Date;
  endsAt: Date;
  units: number;
}

export interface AvailabilityQuery {
  /** Ventana operativa a ubicar: C = M + setup */
  blockingMin: number;
  areaCapacity: number;
  businessHours: BusinessHour[];
  exceptions: ScheduleException[];
  existing: ExistingDemand[];
  rangeStart: Date;
  rangeEnd: Date;
  slotGranularityMin: number;
  minAdvanceMin: number;
  now: Date;
  /** Offset fijo del salón respecto de UTC, en minutos (Santa Fe: -180) */
  tzOffsetMin: number;
}

export interface DaySlots {
  date: string; // YYYY-MM-DD en hora del salón
  times: string[]; // HH:MM en hora del salón
}

const MS_MIN = 60_000;

function parseHm(hm: string): number {
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + (m ?? 0);
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Instante UTC del minuto `minutes` del día local `dayStartUtc`. */
function localMinuteToUtc(dayStartUtc: number, minutes: number, tzOffsetMin: number): Date {
  return new Date(dayStartUtc + (minutes - tzOffsetMin) * MS_MIN);
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Construye la demanda de recursos de una reserva.
 *
 * Punto de evolución declarado por el contrato: hoy devuelve una única
 * demanda por la ventana completa; mañana puede devolver dos (silla por
 * toda la ventana, profesional sólo por los tramos activos).
 */
export function buildResourceDemands(params: {
  areaSlug: string;
  startsAt: Date;
  blockingMin: number;
}): ResourceDemand[] {
  return [
    {
      resource: params.areaSlug,
      startsAt: params.startsAt,
      endsAt: new Date(params.startsAt.getTime() + params.blockingMin * MS_MIN),
      units: 1,
    },
  ];
}

/**
 * Capacidad efectiva del área en una ventana: base + deltas de las
 * excepciones que la solapan. Un cierre (delta null) la anula.
 */
export function effectiveCapacity(
  baseCapacity: number,
  exceptions: ScheduleException[],
  startMs: number,
  endMs: number,
): number {
  let capacity = baseCapacity;
  for (const ex of exceptions) {
    if (!overlaps(startMs, endMs, ex.startsAt.getTime(), ex.endsAt.getTime())) continue;
    if (ex.capacityDelta === null) return 0;
    capacity += ex.capacityDelta;
  }
  return Math.max(capacity, 0);
}

/**
 * Pico de ocupación simultánea dentro de la ventana candidata.
 * No es un conteo de solapes: dos reservas que solapan la ventana pero
 * no entre sí consumen un solo lugar en cada instante.
 */
export function peakUsage(existing: ExistingDemand[], startMs: number, endMs: number): number {
  const relevant = existing.filter((e) =>
    overlaps(startMs, endMs, e.startsAt.getTime(), e.endsAt.getTime()),
  );
  if (relevant.length === 0) return 0;

  const points = new Set<number>([startMs]);
  for (const e of relevant) {
    const t = e.startsAt.getTime();
    if (t > startMs && t < endMs) points.add(t);
  }

  let peak = 0;
  for (const t of points) {
    let used = 0;
    for (const e of relevant) {
      if (e.startsAt.getTime() <= t && e.endsAt.getTime() > t) used += e.units;
    }
    peak = Math.max(peak, used);
  }
  return peak;
}

export function computeAvailability(query: AvailabilityQuery): DaySlots[] {
  const {
    blockingMin,
    areaCapacity,
    businessHours,
    exceptions,
    existing,
    rangeStart,
    rangeEnd,
    slotGranularityMin,
    minAdvanceMin,
    now,
    tzOffsetMin,
  } = query;

  if (blockingMin <= 0 || areaCapacity <= 0) return [];

  const hoursByWeekday = new Map<number, BusinessHour[]>();
  for (const h of businessHours) {
    const list = hoursByWeekday.get(h.weekday) ?? [];
    list.push(h);
    hoursByWeekday.set(h.weekday, list);
  }

  const earliest = now.getTime() + minAdvanceMin * MS_MIN;
  const days: DaySlots[] = [];

  // Recorremos días calendario en hora del salón.
  const startLocal = new Date(rangeStart.getTime() + tzOffsetMin * MS_MIN);
  const firstDayUtc = Date.UTC(
    startLocal.getUTCFullYear(),
    startLocal.getUTCMonth(),
    startLocal.getUTCDate(),
  );

  for (let dayIndex = 0; dayIndex < 120; dayIndex += 1) {
    const dayStartUtc = firstDayUtc + dayIndex * 24 * 60 * MS_MIN;
    const dayLocal = new Date(dayStartUtc);
    if (localMinuteToUtc(dayStartUtc, 0, tzOffsetMin).getTime() > rangeEnd.getTime()) break;

    const weekday = dayLocal.getUTCDay();
    const windows = hoursByWeekday.get(weekday) ?? [];
    if (windows.length === 0) continue;

    const times: string[] = [];
    for (const window of windows) {
      const opens = parseHm(window.opensAt);
      const closes = parseHm(window.closesAt);

      for (let minute = opens; minute + blockingMin <= closes; minute += slotGranularityMin) {
        const slotStart = localMinuteToUtc(dayStartUtc, minute, tzOffsetMin);
        const startMs = slotStart.getTime();
        const endMs = startMs + blockingMin * MS_MIN;

        if (startMs < earliest) continue;
        if (startMs > rangeEnd.getTime()) continue;

        const capacity = effectiveCapacity(areaCapacity, exceptions, startMs, endMs);
        if (capacity <= 0) continue;
        if (peakUsage(existing, startMs, endMs) + 1 > capacity) continue;

        times.push(`${pad(Math.floor(minute / 60))}:${pad(minute % 60)}`);
      }
    }

    if (times.length > 0) {
      days.push({
        date: `${dayLocal.getUTCFullYear()}-${pad(dayLocal.getUTCMonth() + 1)}-${pad(dayLocal.getUTCDate())}`,
        times: [...new Set(times)].sort(),
      });
    }
  }

  return days;
}
