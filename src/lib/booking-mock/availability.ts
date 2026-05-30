import type { MockDate } from "@/lib/booking-types";

export const mockDates = (() => {
  const today = new Date();
  const out: MockDate[] = [];
  const weekdays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const months = [
    "ene",
    "feb",
    "mar",
    "abr",
    "may",
    "jun",
    "jul",
    "ago",
    "sep",
    "oct",
    "nov",
    "dic",
  ];
  for (let i = 1; i <= 10; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    out.push({
      iso: d.toISOString().slice(0, 10),
      label: `${d.getDate()} ${months[d.getMonth()]}`,
      weekday: weekdays[d.getDay()],
      day: String(d.getDate()),
    });
  }
  return out;
})();

export const mockTimes = ["09:30", "10:30", "11:30", "13:00", "14:30", "16:00", "17:30", "18:30"];
