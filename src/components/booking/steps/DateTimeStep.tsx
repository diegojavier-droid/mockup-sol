import { useMemo, useState } from "react";
import {
  formatDateLabel,
  getDayAvailabilityStatus,
  getMonthDays,
  getMonthLabel,
  getSlotsForDate,
  getTodayKey,
  hasAvailableSlotsInMonth,
} from "@/lib/booking-data";
import type { AvailabilityRequest } from "@/lib/booking-data";
import { cn } from "@/lib/utils";
import { TimeSlotButton } from "../cards/TimeSlotButton";
import { StepShell } from "../wizard/StepShell";

const weekdayLabels = ["D", "L", "M", "M", "J", "V", "S"];

export function DateTimeStep({
  date,
  time,
  onChooseDate,
  onChooseTime,
  availabilityRequest,
}: {
  date: string | null;
  time: string | null;
  onChooseDate: (date: string) => void;
  onChooseTime: (time: string) => void;
  availabilityRequest: AvailabilityRequest;
}) {
  const todayKey = useMemo(() => getTodayKey(), []);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const today = new Date();

    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [dayFeedback, setDayFeedback] = useState<string | null>(null);
  const monthDays = useMemo(() => getMonthDays(visibleMonth), [visibleMonth]);
  const monthHasAvailability = useMemo(
    () => hasAvailableSlotsInMonth(visibleMonth, todayKey, availabilityRequest),
    [availabilityRequest, todayKey, visibleMonth],
  );
  const selectedSlots = useMemo(
    () => (date ? getSlotsForDate(date, todayKey, availabilityRequest) : []),
    [availabilityRequest, date, todayKey],
  );

  const moveMonth = (offset: number) => {
    setDayFeedback(null);
    setVisibleMonth(
      (currentMonth) => new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1),
    );
  };

  const handleDayClick = (dateKey: string) => {
    const status = getDayAvailabilityStatus(dateKey, todayKey, availabilityRequest);

    if (status !== "available") {
      setDayFeedback("No hay horarios para este día. Probá con otra fecha.");
      return;
    }

    setDayFeedback(null);
    onChooseDate(dateKey);
  };

  return (
    <StepShell
      title="Elegí fecha y hora"
      subtitle="Buscá el día que te quede cómodo y después elegí un horario disponible."
    >
      <div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">Elegí una fecha</p>
            <p className="mt-1 text-xs text-muted-foreground">Podés navegar entre meses.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => moveMonth(-1)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-lg text-foreground transition-colors hover:border-champagne focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              aria-label="Ver mes anterior"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => moveMonth(1)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-lg text-foreground transition-colors hover:border-champagne focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              aria-label="Ver mes siguiente"
            >
              ›
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-3xl border border-border bg-card p-3 shadow-[0_24px_50px_-42px_rgba(120,90,60,0.45)] sm:p-5">
          <div className="mb-4 text-center font-serif text-2xl text-foreground">
            {getMonthLabel(visibleMonth)}
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {weekdayLabels.map((weekday, index) => (
              <span key={`${weekday}-${index}`} className="py-2">
                {weekday}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {monthDays.map((dateKey, index) => {
              if (!dateKey) return <span key={`blank-${index}`} aria-hidden="true" />;

              const dayNumber = Number(dateKey.slice(-2));
              const status = getDayAvailabilityStatus(dateKey, todayKey, availabilityRequest);
              const selected = date === dateKey;
              const unavailable = status !== "available";

              return (
                <button
                  key={dateKey}
                  type="button"
                  aria-pressed={selected}
                  aria-disabled={unavailable}
                  onClick={() => handleDayClick(dateKey)}
                  className={cn(
                    "aspect-square rounded-2xl border text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card sm:text-base",
                    selected &&
                      "border-champagne-deep bg-champagne text-accent-foreground shadow-sm",
                    !selected &&
                      status === "available" &&
                      "border-border bg-background text-foreground hover:border-champagne hover:bg-cream",
                    !selected &&
                      status === "past" &&
                      "cursor-not-allowed border-transparent bg-muted/45 text-muted-foreground/35",
                    !selected &&
                      status === "closed" &&
                      "cursor-not-allowed border-border/70 bg-muted text-muted-foreground line-through",
                    !selected &&
                      status === "unavailable" &&
                      "cursor-not-allowed border-dashed border-border bg-card text-muted-foreground/55",
                  )}
                >
                  {dayNumber}
                </button>
              );
            })}
          </div>
        </div>

        {!monthHasAvailability && (
          <p className="mt-3 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
            No hay turnos disponibles en este mes. Probá con otro mes.
          </p>
        )}
        {dayFeedback && (
          <p className="mt-3 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
            {dayFeedback}
          </p>
        )}
      </div>

      <div className="mt-8">
        <div className="mb-3">
          <p className="text-sm font-medium text-foreground">Horarios disponibles</p>
          {date && <p className="mt-1 text-xs text-muted-foreground">{formatDateLabel(date)}</p>}
        </div>
        {date && selectedSlots.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {selectedSlots.map((slot) => (
              <TimeSlotButton
                key={slot}
                time={slot}
                disabled={!date}
                selected={time === slot}
                onSelect={() => onChooseTime(slot)}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
            {date
              ? "No hay horarios para este día. Probá con otra fecha."
              : "Elegí primero una fecha."}
          </p>
        )}
      </div>
    </StepShell>
  );
}
