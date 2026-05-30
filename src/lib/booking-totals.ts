import type { CategoryId, Extra, Personalization, Service } from "@/lib/booking-data";
import { bookingRules } from "@/lib/booking-rules";
import type { BookingModifierRule } from "@/lib/booking-rules";

export interface BookingTotalsData {
  category: CategoryId | null;
  service: Service | null;
  extras: Extra[];
  personalization?: Personalization;
}

function fmtDuration(min: number) {
  if (min === 0) return "—";

  const h = Math.floor(min / 60);
  const m = min % 60;

  if (h && m) return `${h} h ${m} min`;
  if (h) return `${h} h`;
  return `${m} min`;
}

function fmtPrice(price: number) {
  return "$" + price.toLocaleString("es-AR");
}

function modifierAppliesToService(modifier: BookingModifierRule, service: Service | null) {
  if (!service) return false;

  if (modifier.excludedServiceIds?.includes(service.id)) return false;

  const hasServiceScope = Boolean(
    modifier.appliesToServiceIds?.length || modifier.appliesToServiceTags?.length,
  );

  if (!hasServiceScope) return true;

  return Boolean(
    modifier.appliesToServiceIds?.includes(service.id) ||
    (service.tag && modifier.appliesToServiceTags?.includes(service.tag)),
  );
}

function getPersonalizationModifier({
  category,
  service,
  personalization,
}: Pick<BookingTotalsData, "category" | "service" | "personalization">) {
  if (!category || !personalization) {
    return { durationMinutes: 0, priceAmount: 0 };
  }

  const rules = bookingRules[category].personalizationModifiers;

  return Object.entries(personalization).reduce(
    (totals, [fieldId, option]) => {
      const modifier = rules[fieldId]?.[option];

      if (!modifier || !modifierAppliesToService(modifier, service)) return totals;

      return {
        durationMinutes: totals.durationMinutes + modifier.durationMinutes,
        priceAmount: totals.priceAmount + modifier.priceAmount,
      };
    },
    { durationMinutes: 0, priceAmount: 0 },
  );
}

export function computeBookingTotals({
  category,
  service,
  extras,
  personalization,
}: BookingTotalsData) {
  const extrasDurationMinutes = extras.reduce((acc, extra) => acc + extra.durationMinutes, 0);
  const extrasPriceAmount = extras.reduce((acc, extra) => acc + extra.priceAmount, 0);
  const personalizationModifier = getPersonalizationModifier({
    category,
    service,
    personalization,
  });
  const durationMinutes =
    (service?.durationMinutes ?? 0) +
    extrasDurationMinutes +
    personalizationModifier.durationMinutes;
  const rawPriceAmount =
    (service?.priceAmount ?? 0) + extrasPriceAmount + personalizationModifier.priceAmount;
  const priceAmount = rawPriceAmount > 0 ? rawPriceAmount : null;

  return {
    dur: fmtDuration(durationMinutes),
    durationMinutes,
    price: priceAmount ? fmtPrice(priceAmount) : "—",
    priceAmount,
    priceIsEstimated: true,
  };
}

export const computeTotals = computeBookingTotals;
