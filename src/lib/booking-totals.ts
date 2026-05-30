import type { Extra, Service } from "@/lib/booking-data";

export interface BookingTotalsData {
  service: Service | null;
  extras: Extra[];
}

function totalDurationMin(service: Service | null) {
  if (!service) return 0;

  const hours = service.duration.match(/(\d+)\s*h/);
  const minutes = service.duration.match(/(\d+)\s*min/);
  const hasHalfHour = /h\s*30/.test(service.duration);

  return (
    (hours ? Number(hours[1]) * 60 : 0) +
    (hasHalfHour ? 30 : 0) +
    (minutes ? Number(minutes[1]) : 0)
  );
}

function fmtDuration(min: number) {
  if (min === 0) return "—";

  const h = Math.floor(min / 60);
  const m = min % 60;

  if (h && m) return `${h} h ${m} min`;
  if (h) return `${h} h`;
  return `${m} min`;
}

function parsePrice(price: string) {
  return Number(price.replace(/[^\d]/g, "")) || 0;
}

function fmtPrice(price: number) {
  return "$" + price.toLocaleString("es-AR");
}

export function computeTotals(data: BookingTotalsData) {
  const dur = totalDurationMin(data.service) + data.extras.length * 15;
  const price =
    parsePrice(data.service?.price ?? "") +
    data.extras.reduce((acc, extra) => acc + parsePrice(extra.price), 0);

  return { dur: fmtDuration(dur), price: price ? fmtPrice(price) : "—" };
}
