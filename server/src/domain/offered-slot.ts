/**
 * ¿El horario pedido es uno de los que el salón realmente ofrece?
 *
 * `/availability` calcula los horarios viables, pero nada obliga a una
 * clienta a pasar por ahí: `POST /bookings` recibe un instante suelto.
 * Sin esta comprobación se puede reservar un martes a las 03:00, un
 * domingo con el salón cerrado, a las 10:07 fuera de la grilla o dentro
 * de dos años — y sale una reserva pagable para un horario que nunca se
 * ofreció.
 *
 * La respuesta la da el mismo motor que arma la grilla pública, así que
 * no hay dos definiciones de "horario ofrecido" que puedan divergir.
 *
 * Sólo aplica al canal público. El salón reserva por `manual` y ahí sí
 * puede tomar una excepción fuera de horario: es su agenda.
 */

import { computeAvailability, type AvailabilityQuery } from "./availability";

export type SlotRejection = "too_far_ahead" | "not_offered";

const MS_MIN = 60_000;
const MS_DAY = 24 * 60 * MS_MIN;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Fecha y hora del salón (no del navegador ni del servidor) para un instante. */
export function toSalonDateTime(at: Date, tzOffsetMin: number): { date: string; time: string } {
  const local = new Date(at.getTime() + tzOffsetMin * MS_MIN);
  return {
    date: `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}`,
    time: `${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}`,
  };
}

export function checkOfferedSlot(params: {
  startsAt: Date;
  now: Date;
  maxAdvanceDays: number;
  availability: Omit<AvailabilityQuery, "rangeStart" | "rangeEnd">;
}): SlotRejection | null {
  const { startsAt, now, maxAdvanceDays, availability } = params;

  if (startsAt.getTime() > now.getTime() + maxAdvanceDays * MS_DAY) {
    return "too_far_ahead";
  }

  // Acotar el rango al instante pedido hace que el motor calcule
  // exactamente ese día y descarte lo posterior: la grilla que devuelve
  // es la misma que vería la clienta, no una aproximación.
  const days = computeAvailability({
    ...availability,
    rangeStart: startsAt,
    rangeEnd: startsAt,
  });

  const { date, time } = toSalonDateTime(startsAt, availability.tzOffsetMin);
  const day = days.find((d) => d.date === date);
  if (!day || !day.times.includes(time)) return "not_offered";

  return null;
}
