/**
 * La promoción del salón: color y tratamiento juntos salen menos.
 *
 * POR QUÉ ESTO NO VIVE EN `computeQuote`
 *
 * `computeQuote` cotiza UNA prestación y no ve a las demás. Pero si un
 * tratamiento entra a precio de promoción no depende del tratamiento: depende
 * de si en el mismo turno hay un color. Es una regla del turno, no del
 * servicio, así que se decide antes de cotizar y el resultado se le pasa a
 * cada parte.
 *
 * DE DÓNDE SALE
 *
 * Sol lo explicó el 2026-09-12:
 *
 *   «tratamiento solo, es una cosa. tratamiento más color son dos
 *    servicios juntos, por eso la diferencia de precio es como una promoción
 *    que se hace por optar por los dos»
 *
 * Y se ve en lo que cobró de verdad. Comparando la mediana de «raíces
 * solas» contra «raíces + tratamiento» sobre 56 tickets de marzo a mayo, lo
 * que quedó para el tratamiento fue: karseell $8.000, máscara repair
 * $7.000, riflessi $9.000, fusión $11.000. Los mismos sueltos valen entre
 * $20.000 y $36.000.
 *
 * LO QUE LA REGLA NO DECIDE
 *
 * Cuáles servicios son «color». Eso es un dato del catálogo
 * (`services.kind`), no de esta función: acá sólo se lee.
 */

import type { QuoteServiceData } from "./types";

/**
 * Cuáles prestaciones del turno cotizan a precio de agregado.
 *
 * Devuelve un booleano por prestación, en el mismo orden que entró, para
 * que quien llama no tenga que volver a emparejar nada.
 *
 * La regla, entera: **si en el turno hay al menos un color y al menos un
 * tratamiento, todos los tratamientos del turno cotizan a precio de
 * agregado.** El color nunca: la promoción la hace el salón sobre el
 * tratamiento, no sobre la coloración.
 *
 * Dos tratamientos con un solo color reciben los dos la promoción. Es la
 * lectura generosa y es la que se parece a la lista de Sol, donde el
 * precio «más color» está fila por fila y no como un descuento único del
 * ticket. Si alguna vez se decide que la promoción es una sola por turno,
 * el cambio es acá y en ningún otro lado.
 */
export function aplicarPromocion(servicios: QuoteServiceData[]): boolean[] {
  const hayColor = servicios.some((s) => s.kind === "color");
  const hayTratamiento = servicios.some((s) => s.kind === "tratamiento");
  const promocionActiva = hayColor && hayTratamiento;

  return servicios.map((s) => promocionActiva && s.kind === "tratamiento");
}

/**
 * Cuánto se ahorra la clienta, para poder decírselo.
 *
 * Un descuento que no se nombra no existe: si la web cobra menos y no
 * explica por qué, la clienta no se entera de que le convino llevar los
 * dos, y la próxima vez no lo pide. Este número es para el texto, no para
 * el cálculo —el cálculo ya lo hizo `computeQuote` con el precio de
 * agregado—, así que se toma de los mismos tiers y no se recalcula aparte.
 *
 * Devuelve 0 cuando no hay promoción aplicada o cuando los tiers no permiten
 * compararla, que no es lo mismo pero para el texto da igual: no se
 * anuncia un ahorro que no se puede afirmar.
 */
export function ahorroDeLaPromocion(
  servicios: QuoteServiceData[],
  conPromocion: boolean[],
  largoPorServicio: (string | null)[],
): number {
  let ahorro = 0;

  servicios.forEach((servicio, i) => {
    if (!conPromocion[i]) return;
    const largo = largoPorServicio[i];
    const tier =
      servicio.tiers.find((t) => t.lengthTier === largo) ??
      servicio.tiers.find((t) => t.lengthTier === "unico");
    if (!tier || tier.priceAddon === null) return;
    ahorro += tier.priceMain - tier.priceAddon;
  });

  return ahorro > 0 ? ahorro : 0;
}
