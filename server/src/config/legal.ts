/**
 * Versión vigente de los términos y la política de privacidad.
 *
 * Es la fuente de verdad del sistema, y el front la recibe en
 * `GET /catalog/salon` en vez de tener su propia copia. Así una pestaña
 * abierta hace dos semanas, con el texto viejo en pantalla, no puede
 * registrar una aceptación como si fuera del texto nuevo: manda la
 * versión que le dieron, el servidor ve que no coincide y le pide
 * recargar.
 *
 * Cambiar el texto SIN cambiar esta constante es el único error grave
 * posible acá: dejaría filas afirmando que alguien aceptó algo que nunca
 * vio. Se sube la fecha en el mismo commit que toca el texto.
 */
export const TERMS_VERSION = "2026-09-08";
