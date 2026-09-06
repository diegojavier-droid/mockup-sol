/**
 * QuoteService — motor de cotización puro (sin I/O).
 *
 * Reglas del contrato (Blueprint V3 + gate):
 *   * El largo selecciona la fila de tier. NUNCA actúa como modificador
 *     (gate A1): el precio del tier ya es absoluto por largo.
 *   * Los modificadores (textura, deco…) son deltas ≥ 0 sobre el precio
 *     del tier resuelto.
 *   * La salida es SIEMPRE una estimación salvo modo 'fixed'; la seña es
 *     el único número firme y se calcula sobre el mínimo estimado (C7).
 *   * A = M − B se deriva; acá solo circulan M (shown), B (process) y
 *     C (blocking = M + setup).
 */

import {
  QuoteError,
  type PriceDisplayMode,
  type QuoteSettings,
  type LengthTier,
  type QuoteInput,
  type QuoteItem,
  type QuoteResult,
  type ServiceTier,
} from "./types";

export function resolveTier(
  tiers: ServiceTier[],
  lengthTier: LengthTier | null | undefined,
): ServiceTier {
  if (tiers.length === 0) {
    throw new QuoteError("service_not_quotable", "service has no price tiers");
  }

  const unico = tiers.find((t) => t.lengthTier === "unico");
  if (lengthTier && lengthTier !== "unico") {
    const exact = tiers.find((t) => t.lengthTier === lengthTier);
    if (exact) return exact;
    if (unico) return unico;
    throw new QuoteError("tier_not_found", lengthTier);
  }

  if (unico) return unico;
  throw new QuoteError("length_required");
}

export function computeQuote(input: QuoteInput): QuoteResult {
  const { service, settings } = input;
  const tier = resolveTier(service.tiers, input.lengthTier ?? null);

  const appliedModifiers: QuoteResult["appliedModifiers"] = [];
  let modifierPrice = 0;
  let modifierDuration = 0;

  for (const [fieldSlug, optionSlug] of Object.entries(input.personalization ?? {})) {
    const field = service.fields.find((f) => f.slug === fieldSlug);
    if (!field) continue; // campo desconocido: se ignora, no cotiza
    if (field.fieldRole !== "modifier" || field.decision !== "operational") continue;

    const option = field.options.find((o) => o.slug === optionSlug);
    if (!option) {
      throw new QuoteError("unknown_option", `${fieldSlug}=${optionSlug}`);
    }

    const priceDelta =
      option.priceFixedAmount + Math.round((tier.priceMain * option.pricePercentage) / 100);
    modifierPrice += priceDelta;
    modifierDuration += option.durationDeltaMinutes;
    if (priceDelta !== 0 || option.durationDeltaMinutes !== 0) {
      appliedModifiers.push({
        fieldSlug,
        optionSlug,
        priceDelta,
        durationDelta: option.durationDeltaMinutes,
      });
    }
  }

  const extras = input.extras ?? [];
  const extrasPrice = extras.reduce((acc, e) => acc + e.priceAmount, 0);
  const extrasDuration = extras.reduce((acc, e) => acc + e.durationDeltaMinutes, 0);

  const setupMin = service.parameters.setupMinutesOverride ?? settings.defaultSetupMinutes;
  const mainDuration = tier.durationMainMin + modifierDuration;
  const durationShownMin = mainDuration + extrasDuration;
  const blockingMin = durationShownMin + setupMin;

  const estimatedMinAmount = tier.priceMain + modifierPrice + extrasPrice;
  const depositAmount = Math.round((estimatedMinAmount * settings.depositRatePct) / 100);

  const items: QuoteItem[] = [
    {
      role: "main",
      slug: service.slug,
      name: service.name,
      priceAmount: tier.priceMain + modifierPrice,
      lengthTier: tier.lengthTier,
      durationMin: mainDuration,
      processMin: tier.processMin,
      setupMin,
    },
    ...extras.map(
      (e): QuoteItem => ({
        role: "extra",
        slug: e.code,
        name: e.name,
        priceAmount: e.priceAmount,
        lengthTier: null,
        durationMin: e.durationDeltaMinutes,
        processMin: 0,
        setupMin: 0,
      }),
    ),
  ];

  const mode = service.parameters.priceDisplayMode;

  return {
    items,
    priceDisplayMode: mode,
    isEstimate: mode !== "fixed",
    estimatedMinAmount,
    estimatedMaxAmount: null,
    durationShownMin,
    processMin: tier.processMin,
    setupMin,
    blockingMin,
    depositRatePct: settings.depositRatePct,
    depositAmount,
    remainingAmount: estimatedMinAmount - depositAmount,
    requiresConsultation: service.parameters.requiresConsultation,
    appliedModifiers,
  };
}

/**
 * Varias prestaciones en un mismo turno — «color y corte».
 *
 * No reescribe el motor: compone resultados que `computeQuote` ya
 * calculó por separado. Componer una sola parte tiene que dar
 * exactamente lo mismo que cotizarla sola, y hay una prueba que lo
 * exige: así el camino de un servicio no cambia de comportamiento.
 *
 * DECISIONES, y por qué son éstas y no otras:
 *
 * · Precio: SUMA de las partes. Que un combo valga menos que la suma es
 *   una regla comercial que sólo Sol puede fijar; inventarla acá sería
 *   cobrar de menos sin que nadie lo haya decidido.
 *
 * · Duración: SUMA. Un salón real puede solapar el proceso de un color
 *   con el corte de otra clienta, pero si eso se hace —y cuánto— es
 *   operación real que no está validada. Sumar reserva de más, que es el
 *   error seguro: nunca vende un horario que no existe.
 *
 * · Setup: MÁXIMO, no suma. Es la preparación ENTRE clientas, no por
 *   prestación; sumarlo lo contaría dos veces para la misma persona. Con
 *   una sola parte el máximo es ese mismo valor, que es lo que preserva
 *   el comportamiento actual.
 *
 * · Modo de precio: gana el MENOS certero. Si una de las prestaciones
 *   está sujeta a confirmación, el turno entero lo está: prometer un
 *   número firme sobre una parte incierta es peor que decir que hay que
 *   verlo.
 *
 * · Seña: se recalcula sobre el mínimo TOTAL, no se suman las señas
 *   parciales, para que el redondeo no derive.
 */
const MODE_UNCERTAINTY: Record<PriceDisplayMode, number> = {
  fixed: 0,
  from: 1,
  subject_to_confirmation: 2,
};

export function composeQuote(parts: QuoteResult[], settings: QuoteSettings): QuoteResult {
  if (parts.length === 0) {
    throw new QuoteError("service_not_quotable", "no services to quote");
  }
  if (parts.length === 1) return parts[0];

  const items = parts.flatMap((p) => p.items);
  const estimatedMinAmount = parts.reduce((acc, p) => acc + p.estimatedMinAmount, 0);
  const durationShownMin = parts.reduce((acc, p) => acc + p.durationShownMin, 0);
  const processMin = parts.reduce((acc, p) => acc + p.processMin, 0);
  const setupMin = Math.max(...parts.map((p) => p.setupMin));

  const mode = parts.reduce<PriceDisplayMode>(
    (worst, p) =>
      MODE_UNCERTAINTY[p.priceDisplayMode] > MODE_UNCERTAINTY[worst] ? p.priceDisplayMode : worst,
    "fixed",
  );

  const depositAmount = Math.round((estimatedMinAmount * settings.depositRatePct) / 100);

  return {
    items,
    priceDisplayMode: mode,
    isEstimate: mode !== "fixed",
    estimatedMinAmount,
    estimatedMaxAmount: null,
    durationShownMin,
    processMin,
    setupMin,
    blockingMin: durationShownMin + setupMin,
    depositRatePct: settings.depositRatePct,
    depositAmount,
    remainingAmount: estimatedMinAmount - depositAmount,
    requiresConsultation: parts.some((p) => p.requiresConsultation),
    appliedModifiers: parts.flatMap((p) => p.appliedModifiers),
  };
}
