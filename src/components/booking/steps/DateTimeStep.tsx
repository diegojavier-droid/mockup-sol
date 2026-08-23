import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatDateLabel, getMonthDays, getMonthLabel, getTodayKey } from "@/lib/booking-data";
import type { DayAvailabilityStatus } from "@/lib/booking-data";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { TimeSlotButton } from "../cards/TimeSlotButton";
import { StepShell } from "../wizard/StepShell";

const weekdayLabels = ["D", "L", "M", "M", "J", "V", "S"];
const shortWeekdays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const shortMonths = [
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

const CAROUSEL_LOOKAHEAD_DAYS = 21;

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function fromDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);

  return new Date(year, month - 1, day);
}

interface CarouselDay {
  dateKey: string;
  weekday: string;
  day: number;
  month: string;
  showMonth: boolean;
}

function buildUpcomingDays(): CarouselDay[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days: CarouselDay[] = [];
  let previousMonth = -1;

  for (let offset = 0; offset < CAROUSEL_LOOKAHEAD_DAYS; offset += 1) {
    const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
    const month = cursor.getMonth();
    const showMonth = month !== previousMonth;
    previousMonth = month;

    days.push({
      dateKey: toDateKey(cursor),
      weekday: shortWeekdays[cursor.getDay()],
      day: cursor.getDate(),
      month: shortMonths[month],
      showMonth,
    });
  }

  return days;
}

export function DateTimeStep({
  date,
  time,
  onChooseDate,
  onChooseTime,
  slotsByDate,
  isLoadingAvailability = false,
}: {
  date: string | null;
  time: string | null;
  onChooseDate: (date: string) => void;
  onChooseTime: (time: string) => void;
  /** Disponibilidad real calculada por el backend: fecha → horarios. */
  slotsByDate: Map<string, string[]>;
  isLoadingAvailability?: boolean;
}) {
  const todayKey = useMemo(() => getTodayKey(), []);
  const upcomingDays = useMemo(() => buildUpcomingDays(), []);
  const dayStatus = useCallback(
    (dateKey: string): DayAvailabilityStatus => {
      if (dateKey < todayKey) return "past";
      return (slotsByDate.get(dateKey) ?? []).length > 0 ? "available" : "unavailable";
    },
    [slotsByDate, todayKey],
  );
  const availableUpcomingDays = useMemo(
    () => upcomingDays.filter(({ dateKey }) => dayStatus(dateKey) === "available"),
    [dayStatus, upcomingDays],
  );

  const [showMonthView, setShowMonthView] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [dayFeedback, setDayFeedback] = useState<string | null>(null);

  const monthDays = useMemo(() => getMonthDays(visibleMonth), [visibleMonth]);
  const monthHasAvailability = useMemo(
    () => monthDays.some((dateKey) => dateKey !== null && dayStatus(dateKey) === "available"),
    [dayStatus, monthDays],
  );
  const selectedSlots = useMemo(
    () => (date ? (slotsByDate.get(date) ?? []) : []),
    [date, slotsByDate],
  );

  const selectedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!date || !selectedRef.current) return;
    selectedRef.current.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [date]);

  const moveMonth = (offset: number) => {
    setDayFeedback(null);
    setVisibleMonth(
      (currentMonth) => new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1),
    );
  };

  const handleCarouselPick = (dateKey: string) => {
    setDayFeedback(null);
    onChooseDate(dateKey);
  };

  const handleMonthPick = (dateKey: string) => {
    const status = dayStatus(dateKey);

    if (status !== "available") {
      setDayFeedback("No hay horarios para este día. Probá con otra fecha.");
      return;
    }

    setDayFeedback(null);
    onChooseDate(dateKey);
    setShowMonthView(false);
  };

  const selectedInCarousel = date ? availableUpcomingDays.some((d) => d.dateKey === date) : false;
  const selectedLabel = date
    ? (() => {
        const d = fromDateKey(date);
        return `${shortWeekdays[d.getDay()]} ${d.getDate()} ${shortMonths[d.getMonth()]}`;
      })()
    : null;

  return (
    <StepShell title="¿Cuándo te gustaría venir?">
      {/* Resumen de selección */}
      {selectedLabel && (
        <div className="mb-3 flex items-center gap-2 rounded-2xl border border-champagne-deep/30 bg-cream/50 px-4 py-2.5 text-sm">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Elegiste
          </span>
          <span className="font-serif text-foreground">
            {selectedLabel}
            {time ? ` · ${time}` : ""}
          </span>
        </div>
      )}

      <Collapsible open={showMonthView} onOpenChange={setShowMonthView}>
        {/* Carrusel de días */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">Elegí un día</p>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {showMonthView ? "Ocultar calendario" : "Ver calendario"}
              </button>
            </CollapsibleTrigger>
          </div>

          {availableUpcomingDays.length > 0 ? (
            <div
              className="-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              role="listbox"
              aria-label="Próximos días disponibles"
            >
              <div className="flex gap-2">
                {availableUpcomingDays.map((day) => {
                  const selected = date === day.dateKey;
                  return (
                    <button
                      key={day.dateKey}
                      ref={selected ? selectedRef : undefined}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => handleCarouselPick(day.dateKey)}
                      className={cn(
                        "flex min-w-[64px] shrink-0 flex-col items-center rounded-2xl border px-3 py-2.5 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                        selected
                          ? "border-champagne-deep bg-champagne text-accent-foreground shadow-sm"
                          : "border-border bg-card text-foreground hover:border-champagne",
                      )}
                    >
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {day.weekday}
                      </span>
                      <span className="mt-0.5 font-serif text-xl leading-none">{day.day}</span>
                      {day.showMonth && (
                        <span className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                          {day.month}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
              No hay días con cupo en las próximas semanas. Probá abrir el calendario.
            </p>
          )}

          {date && !selectedInCarousel && !showMonthView && (
            <p className="mt-2 text-xs text-muted-foreground">
              Fecha elegida fuera de las próximas semanas — abrí el calendario para modificarla.
            </p>
          )}
        </div>

        {/* Calendario mensual: sección plegable liviana, sin bottom sheet */}
        <CollapsibleContent className="overflow-hidden">
          <div className="mt-4 rounded-3xl border border-border/70 bg-card/60 p-3 sm:p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-serif text-base text-foreground">{getMonthLabel(visibleMonth)}</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => moveMonth(-1)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-base text-foreground transition-colors hover:border-champagne focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  aria-label="Ver mes anterior"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => moveMonth(1)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-base text-foreground transition-colors hover:border-champagne focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  aria-label="Ver mes siguiente"
                >
                  ›
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              {weekdayLabels.map((weekday, index) => (
                <span key={`${weekday}-${index}`} className="py-1">
                  {weekday}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {monthDays.map((dateKey, index) => {
                if (!dateKey) return <span key={`blank-${index}`} aria-hidden="true" />;

                const dayNumber = Number(dateKey.slice(-2));
                const status = dayStatus(dateKey);
                const selected = date === dateKey;
                const unavailable = status !== "available";

                return (
                  <button
                    key={dateKey}
                    type="button"
                    aria-pressed={selected}
                    aria-disabled={unavailable}
                    onClick={() => handleMonthPick(dateKey)}
                    className={cn(
                      "aspect-square rounded-lg border text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
                      selected &&
                        "border-champagne-deep bg-champagne text-accent-foreground shadow-sm",
                      !selected &&
                        status === "available" &&
                        "border-border bg-background text-foreground hover:border-champagne hover:bg-cream",
                      !selected &&
                        status === "past" &&
                        "cursor-not-allowed border-transparent bg-muted/40 text-muted-foreground/35",
                      !selected &&
                        status === "closed" &&
                        "cursor-not-allowed border-border/60 bg-muted text-muted-foreground line-through",
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

            {!monthHasAvailability && (
              <p className="mt-2 rounded-xl border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
                No hay turnos disponibles en este mes. Probá con otro mes.
              </p>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {dayFeedback && (
        <p className="mt-3 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          {dayFeedback}
        </p>
      )}

      {/* Horarios */}
      <div className="mt-5">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <p className="text-sm font-medium text-foreground">Horarios</p>
          {date && <p className="text-xs text-muted-foreground">{formatDateLabel(date)}</p>}
        </div>
        {date && selectedSlots.length > 0 ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
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
              : "Elegí primero un día."}
          </p>
        )}
      </div>
    </StepShell>
  );
}
