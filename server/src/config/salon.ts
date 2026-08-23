/**
 * Constantes operativas del salón que no son configurables por la dueña.
 *
 * Todo lo que Sol sí puede cambiar (seña, ventanas, granularidad,
 * horarios) vive en `business_settings` / `business_hours`, no acá.
 */

/** Santa Fe (Argentina) no aplica DST: offset fijo UTC-3. */
export const SALON_TZ_OFFSET_MIN = -180;
