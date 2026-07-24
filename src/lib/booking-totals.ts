import type { CategoryId, Extra, Personalization, Service } from "@/lib/booking-data";
import {
  getOperationalBufferMinutes,
  getBlockedDurationMinutes,
} from "@/lib/booking-operational-buffer";
import { getPersonalizationModifierTotals } from "@/lib/booking-rules";

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

export const BOOKING_DEPOSIT_RATE = 0.2;

export function fmtPrice(price: number) {
  return "$" + price.toLocaleString("es-AR");
}

function computeDepositAmounts(priceAmount: number | null) {
  if (!priceAmount) return { depositAmount: null, remainingAmount: null };

  const depositAmount = priceAmount * BOOKING_DEPOSIT_RATE;

  return {
    depositAmount,
    remainingAmount: priceAmount - depositAmount,
  };
}

export function computeBookingTotals({
  category,
  service,
  extras,
  personalization,
}: BookingTotalsData) {
  const extrasDurationMinutes = extras.reduce((acc, extra) => acc + extra.durationMinutes, 0);
  const extrasPriceAmount = extras.reduce((acc, extra) => acc + extra.priceAmount, 0);
  const personalizationModifier = getPersonalizationModifierTotals({
    category,
    service,
    personalization,
  });
  const durationMinutes =
    (service?.durationMinutes ?? 0) +
    personalizationModifier.durationMinutes +
    extrasDurationMinutes;
  const rawPriceAmount =
    (service?.priceAmount ?? 0) + personalizationModifier.priceAmount + extrasPriceAmount;
  const priceAmount = rawPriceAmount > 0 ? rawPriceAmount : null;
  const { depositAmount, remainingAmount } = computeDepositAmounts(priceAmount);

  return {
    dur: fmtDuration(durationMinutes),
    durationMinutes,
    price: priceAmount ? fmtPrice(priceAmount) : "—",
    priceAmount,
    depositAmount,
    depositPrice: depositAmount ? fmtPrice(depositAmount) : "—",
    remainingAmount,
    remainingPrice: remainingAmount ? fmtPrice(remainingAmount) : "—",
    depositRate: BOOKING_DEPOSIT_RATE,
    priceIsEstimated: true,
  };
}

export function computeBookingOperationalTotals(data: BookingTotalsData) {
  const totals = computeBookingTotals(data);
  const operationalBufferMinutes = getOperationalBufferMinutes({
    category: data.category,
    service: data.service,
  });
  const blockedDurationMinutes = getBlockedDurationMinutes({
    visibleDurationMinutes: totals.durationMinutes,
    operationalBufferMinutes,
  });

  return {
    ...totals,
    operationalBufferMinutes,
    blockedDurationMinutes,
    blockedDur: fmtDuration(blockedDurationMinutes),
  };
}

export const computeTotals = computeBookingTotals;
