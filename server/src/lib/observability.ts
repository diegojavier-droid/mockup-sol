/**
 * Trazabilidad de reservas que no se pudieron hacer.
 *
 * Un `capacity_full` o un `length_required` viajan como 4xx y se pierden:
 * la pregunta "una clienta intentó reservar y no pudo, ¿por qué?" no
 * tenía respuesta en ningún lado. `audit_log` sólo guarda lo que el
 * salón HACE; esto guarda lo que el sistema RECHAZA.
 *
 * Una línea JSON por rechazo, a stdout, que es donde Cloudflare las
 * recoge. Nada más: alcanza para diagnosticar y no hay que operarlo.
 */

export interface BookingFailure {
  code: string;
  channel: string;
  serviceSlug?: string | null;
  areaSlug?: string | null;
  startsAt?: string | null;
  lengthTier?: string | null;
  requestId?: string | null;
}

/**
 * Identificador de la petición. Cloudflare pone `cf-ray`; si no está, se
 * genera uno para poder correlacionar las líneas de un mismo intento.
 */
export function requestId(headers: {
  get?: (k: string) => string | null | undefined;
  header?: (k: string) => string | undefined;
}): string {
  const read = (k: string) => headers.header?.(k) ?? headers.get?.(k) ?? undefined;
  return read("cf-ray") ?? read("x-request-id") ?? crypto.randomUUID();
}

export function logBookingFailure(f: BookingFailure): void {
  console.warn(
    JSON.stringify({
      evento: "reserva_rechazada",
      ts: new Date().toISOString(),
      requestId: f.requestId ?? null,
      motivo: f.code,
      canal: f.channel,
      servicio: f.serviceSlug ?? null,
      area: f.areaSlug ?? null,
      // El horario pedido es la mitad del diagnóstico: sin él no se sabe
      // si el problema fue el día, la hora o la capacidad.
      horario: f.startsAt ?? null,
      largo: f.lengthTier ?? null,
    }),
  );
}
