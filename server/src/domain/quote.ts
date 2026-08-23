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
