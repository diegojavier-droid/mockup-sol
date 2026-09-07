/**
 * Los horarios del salón, leídos de la base.
 *
 * Antes la portada tenía el horario escrito a mano en el componente, y
 * además un cartel que anunciaba «Próximo turno: Mañana 11:30» sin haber
 * mirado nunca la agenda. Los dos textos eran promesas que el salón
 * después tenía que incumplir en persona. Acá el horario sale de
 * `business_hours`, que es la misma tabla con la que se calcula la
 * disponibilidad: si Sol cambia un horario, la portada cambia sola.
 */

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";

export interface ApiBusinessHour {
  weekday: number; // 0 = domingo … 6 = sábado
  opensAt: string; // "08:00"
  closesAt: string; // "15:00"
}

const DAY_NAMES = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
] as const;

/** La semana empieza el lunes para leerla, aunque la base numere desde el domingo. */
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export interface ScheduleLine {
  /** «Martes y miércoles» */
  days: string;
  /** «8 a 15» */
  hours: string;
}

/** "08:00" → "8"; "08:30" → "8:30". Nadie dice «de las ocho cero cero». */
function shortTime(value: string): string {
  const [h, m] = value.split(":");
  const hour = String(Number(h));
  return m === "00" ? hour : `${hour}:${m}`;
}

function joinDays(weekdays: number[]): string {
  const names = weekdays.map((d) => DAY_NAMES[d]);
  let label: string;
  if (names.length === 1) label = names[0];
  else if (names.length === 2) label = `${names[0]} y ${names[1]}`;
  else label = `${names[0]} a ${names[names.length - 1]}`;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * Agrupa días seguidos con el mismo horario, que es como lo diría una
 * persona: «martes y miércoles de 8 a 15», no cuatro renglones.
 *
 * Sólo agrupa días CONSECUTIVOS en el orden de la semana: si el martes y
 * el viernes compartieran horario pero el miércoles no, mezclarlos en un
 * «martes a viernes» diría algo falso.
 */
export function toScheduleLines(hours: ApiBusinessHour[]): ScheduleLine[] {
  const byDay = new Map<number, ApiBusinessHour[]>();
  for (const hour of hours) {
    const list = byDay.get(hour.weekday) ?? [];
    list.push(hour);
    byDay.set(hour.weekday, list);
  }

  // Un día puede tener más de una franja (mañana y tarde): la firma del
  // día es la lista completa, para no fusionar días que no son iguales.
  const signature = (weekday: number): string =>
    (byDay.get(weekday) ?? [])
      .slice()
      .sort((a, b) => a.opensAt.localeCompare(b.opensAt))
      .map((h) => `${h.opensAt}-${h.closesAt}`)
      .join(",");

  const lines: ScheduleLine[] = [];
  let group: number[] = [];

  const flush = () => {
    if (group.length === 0) return;
    const ranges = (byDay.get(group[0]) ?? [])
      .slice()
      .sort((a, b) => a.opensAt.localeCompare(b.opensAt))
      .map((h) => `${shortTime(h.opensAt)} a ${shortTime(h.closesAt)}`);
    lines.push({ days: joinDays(group), hours: ranges.join(" y ") });
    group = [];
  };

  for (const weekday of WEEK_ORDER) {
    const sig = signature(weekday);
    if (sig === "") {
      flush();
      continue;
    }
    if (group.length > 0 && signature(group[group.length - 1]) !== sig) flush();
    group.push(weekday);
  }
  flush();

  return lines;
}

/**
 * Los días cerrados que vale la pena nombrar.
 *
 * Se miran sólo lunes a viernes a propósito. El sábado también está
 * fuera de la grilla, pero no porque el salón cierre: Sol atiende novias
 * y eventos esos días y se coordinan por WhatsApp. Anunciarlo como
 * «sábado cerrado» sería mentir, así que el sábado se cuenta aparte, en
 * el bloque de eventos. El domingo no se nombra porque nadie espera que
 * una peluquería abra un domingo.
 */
export function toClosedDays(hours: ApiBusinessHour[]): string {
  const open = new Set(hours.map((h) => h.weekday));
  const closed = [1, 2, 3, 4, 5].filter((d) => !open.has(d));
  if (closed.length === 0) return "";
  return `${joinDays(closed)} cerrado`;
}

export interface ApiSalonInfo {
  hours: ApiBusinessHour[];
  depositRatePct: number | null;
}

export function useSalonInfo() {
  const query = useQuery({
    queryKey: ["salon-info"],
    queryFn: () => api.get<ApiSalonInfo>("/catalog/salon"),
    staleTime: 1000 * 60 * 60,
  });

  const hours = query.data?.hours ?? [];
  return {
    hours,
    // Mientras no haya datos no se muestra un horario provisorio: es
    // preferible que falte a que diga algo que el salón no cumple.
    scheduleLines: toScheduleLines(hours),
    closedDays: toClosedDays(hours),
    depositRatePct: query.data?.depositRatePct ?? null,
    isLoading: query.isLoading,
  };
}
