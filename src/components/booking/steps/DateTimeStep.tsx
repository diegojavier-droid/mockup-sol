/**
 * Elegir día y hora.
 *
 * La versión anterior tenía dos selectores compitiendo: un carrusel
 * horizontal que mostraba SÓLO los días con lugar, y un calendario
 * mensual escondido detrás de un link chiquito que decía «Ver
 * calendario». Eso fallaba de tres maneras en un teléfono:
 *
 *   1. El carrusel salteaba días sin decir por qué. Con el salón cerrado
 *      los lunes, la clienta veía «mar 9 · mié 10 · jue 11 · vie 12 ·
 *      mar 16» y los huecos parecían un error del sitio.
 *   2. Los días que no entraban en pantalla se descubrían arrastrando, y
 *      no había ninguna señal de que hubiera más a la derecha.
 *   3. El calendario de verdad estaba escondido, así que quien quería
 *      ver el mes tenía que adivinar que ese link existía.
 *
 * Ahora hay UNA sola cosa: la semana completa, siete columnas que entran
 * enteras en cualquier teléfono, con flechas para moverse de semana. Los
 * días cerrados se muestran cerrados y los llenos se muestran llenos, en
 * vez de desaparecer. Ver el estado de un día es más importante que
 * ahorrar un renglón.
 */

import { useEffect, useMemo, useState } from "react";
import { formatDateLabel, getTodayKey } from "@/lib/booking-data";
import { cn } from "@/lib/utils";
import { useSalonInfo } from "@/lib/business-hours";
import { AVAILABILITY_WINDOW_DAYS } from "@/lib/api/booking-hooks";
import { whatsappLink } from "@/lib/sol-mai-contact";
import { TimeSlotButton } from "../cards/TimeSlotButton";
import { StepShell } from "../wizard/StepShell";

/** La semana se lee de lunes a domingo; la base numera 0 = domingo. */
const WEEKDAY_LABELS: Record<number, string> = {
  1: "Lun",
  2: "Mar",
  3: "Mié",
  4: "Jue",
  5: "Vie",
  6: "Sáb",
  0: "Dom",
};
const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

/** Antes de esta hora es «mañana»; desde acá, «tarde». */
const AFTERNOON_FROM = "13:00";

type DayState =
  | "available" // hay lugar
  | "full" // el salón abre pero no queda lugar
  | "closed" // el salón no atiende ese día
  | "events" // sábado: novias y eventos, que se coordinan por WhatsApp
  | "past" // ya pasó
  | "beyond"; // más allá de la ventana que se consultó

/**
 * El sábado no está en la grilla de horarios, pero no está cerrado: Sol
 * atiende novias y eventos esos días y se coordinan hablando. Marcarlo
 * «cerrado» sería mentirle a la clienta y perder el pedido más caro que
 * entra al salón.
 */
const SATURDAY = 6;

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** El lunes de la semana que contiene `date`. */
function startOfWeek(date: Date): Date {
  const offset = (date.getDay() + 6) % 7; // domingo (0) queda a 6 del lunes
  return addDays(date, -offset);
}

function monthLabel(from: Date, to: Date): string {
  const one = `${MONTHS[from.getMonth()]}`;
  if (from.getMonth() === to.getMonth()) {
    return `${one} ${from.getFullYear()}`;
  }
  const other = MONTHS[to.getMonth()];
  return from.getFullYear() === to.getFullYear()
    ? `${one} · ${other} ${to.getFullYear()}`
    : `${one} ${from.getFullYear()} · ${other} ${to.getFullYear()}`;
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
  const today = useMemo(() => fromDateKey(todayKey), [todayKey]);
  const lastDayKey = useMemo(
    () => toDateKey(addDays(today, AVAILABILITY_WINDOW_DAYS - 1)),
    [today],
  );

  // Los horarios del salón permiten distinguir «cerrado» de «lleno».
  // Son dos mensajes distintos para la clienta: uno no cambia nunca y el
  // otro se resuelve probando otro horario.
  const { hours } = useSalonInfo();
  const openWeekdays = useMemo(() => new Set(hours.map((h) => h.weekday)), [hours]);

  const dayState = (dateKey: string): DayState => {
    if (dateKey < todayKey) return "past";
    if (dateKey > lastDayKey) return "beyond";
    if ((slotsByDate.get(dateKey) ?? []).length > 0) return "available";
    // Sin horarios cargados todavía no se puede afirmar que un día esté
    // cerrado: se lo trata como lleno, que es lo reversible.
    const weekday = fromDateKey(dateKey).getDay();
    if (openWeekdays.size > 0 && !openWeekdays.has(weekday)) {
      return weekday === SATURDAY ? "events" : "closed";
    }
    return "full";
  };

  const firstAvailableKey = useMemo(() => {
    for (let offset = 0; offset < AVAILABILITY_WINDOW_DAYS; offset += 1) {
      const key = toDateKey(addDays(today, offset));
      if ((slotsByDate.get(key) ?? []).length > 0) return key;
    }
    return null;
  }, [slotsByDate, today]);

  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(today));

  // Que la primera semana que se ve sea una con lugar. Abrir el paso en
  // una semana vacía —muy posible si hoy es viernes a la tarde— hace
  // creer que no hay turnos cuando el martes siguiente está libre.
  useEffect(() => {
    if (date) {
      setWeekStart(startOfWeek(fromDateKey(date)));
      return;
    }
    if (firstAvailableKey) setWeekStart(startOfWeek(fromDateKey(firstAvailableKey)));
  }, [date, firstAvailableKey]);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart],
  );
  const weekEnd = weekDays[weekDays.length - 1];

  // No se puede retroceder antes de hoy ni avanzar más allá de lo que se
  // consultó: una semana vacía por falta de datos se lee igual que una
  // semana sin lugar, y no es lo mismo.
  const canGoBack = toDateKey(weekStart) > todayKey;
  const canGoForward = toDateKey(addDays(weekStart, 7)) <= lastDayKey;

  const selectedSlots = useMemo(
    () => (date ? (slotsByDate.get(date) ?? []) : []),
    [date, slotsByDate],
  );
  const morning = selectedSlots.filter((slot) => slot < AFTERNOON_FROM);
  const afternoon = selectedSlots.filter((slot) => slot >= AFTERNOON_FROM);

  const weekHasSomething = weekDays.some((day) => dayState(toDateKey(day)) === "available");
  const weekHasEventDay = weekDays.some((day) => dayState(toDateKey(day)) === "events");
  const eventsWhatsappUrl = whatsappLink(
    "¡Hola Sol Mai! Quiero consultar por un peinado de novia o un evento un sábado.",
  );

  return (
    <StepShell title="¿Cuándo te gustaría venir?">
      <div className="rounded-3xl border border-border bg-card/60 p-3 sm:p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setWeekStart((current) => addDays(current, -7))}
            disabled={!canGoBack}
            aria-label="Semana anterior"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-background text-lg text-foreground transition-colors hover:border-champagne disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
          >
            ‹
          </button>
          <p className="font-serif text-base capitalize text-foreground sm:text-lg">
            {monthLabel(weekStart, weekEnd)}
          </p>
          <button
            type="button"
            onClick={() => setWeekStart((current) => addDays(current, 7))}
            disabled={!canGoForward}
            aria-label="Semana siguiente"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-background text-lg text-foreground transition-colors hover:border-champagne disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
          >
            ›
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-1.5" role="listbox" aria-label="Elegí un día">
          {weekDays.map((day) => {
            const dateKey = toDateKey(day);
            const state = dayState(dateKey);
            const selected = date === dateKey;
            const pickable = state === "available";

            return (
              <button
                key={dateKey}
                type="button"
                role="option"
                aria-selected={selected}
                aria-disabled={!pickable}
                disabled={!pickable}
                onClick={() => onChooseDate(dateKey)}
                className={cn(
                  "flex flex-col items-center rounded-2xl border px-0.5 py-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
                  selected && "border-champagne-deep bg-champagne text-accent-foreground shadow-sm",
                  !selected &&
                    pickable &&
                    "border-border bg-background text-foreground hover:border-champagne hover:bg-cream",
                  !selected &&
                    !pickable &&
                    "cursor-not-allowed border-transparent bg-muted/35 text-muted-foreground/50",
                )}
              >
                <span className="text-[9px] uppercase tracking-wider sm:text-[10px]">
                  {WEEKDAY_LABELS[day.getDay()]}
                </span>
                <span className="mt-0.5 font-serif text-lg leading-none sm:text-xl">
                  {day.getDate()}
                </span>
                <span className="mt-1 text-[8px] leading-none sm:text-[9px]">
                  {state === "available" ? (
                    <span
                      aria-hidden
                      className={cn(
                        "block h-1 w-1 rounded-full",
                        selected ? "bg-accent-foreground/70" : "bg-champagne-deep",
                      )}
                    />
                  ) : state === "closed" ? (
                    "cerrado"
                  ) : state === "events" ? (
                    "eventos"
                  ) : state === "full" ? (
                    "sin lugar"
                  ) : (
                    <span aria-hidden className="block h-1 w-1" />
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {!weekHasSomething && !isLoadingAvailability ? (
          <p className="mt-3 rounded-2xl border border-border bg-background px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
            Esta semana no queda lugar.{" "}
            {canGoForward
              ? "Pasá a la siguiente con la flecha de la derecha."
              : "Escribinos por WhatsApp y buscamos un hueco."}
          </p>
        ) : null}

        {/* «Eventos» necesita explicación: si no, el sábado se lee como
            un día roto. Y el pedido de una novia es el más caro que
            entra al salón: vale la pena que tenga su camino. */}
        {weekHasEventDay ? (
          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
            Los sábados son para novias y eventos.{" "}
            {eventsWhatsappUrl ? (
              <a
                href={eventsWhatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground underline underline-offset-2 hover:text-champagne-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
              >
                Escribinos y lo coordinamos.
              </a>
            ) : (
              "Consultanos y lo coordinamos."
            )}
          </p>
        ) : null}
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <p className="text-sm font-medium text-foreground">
            {date ? "Elegí tu horario" : "Horarios"}
          </p>
          {date ? <p className="text-xs text-muted-foreground">{formatDateLabel(date)}</p> : null}
        </div>

        {date && selectedSlots.length > 0 ? (
          <div className="space-y-4">
            {[
              { key: "manana", label: "Mañana", slots: morning },
              { key: "tarde", label: "Tarde", slots: afternoon },
            ]
              .filter((group) => group.slots.length > 0)
              .map((group) => (
                <div key={group.key}>
                  {/* El rótulo sólo aparece si el día tiene los dos
                      momentos: con una sola tanda es ruido. */}
                  {morning.length > 0 && afternoon.length > 0 ? (
                    <p className="mb-1.5 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                      {group.label}
                    </p>
                  ) : null}
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {group.slots.map((slot) => (
                      <TimeSlotButton
                        key={slot}
                        time={slot}
                        disabled={false}
                        selected={time === slot}
                        onSelect={() => onChooseTime(slot)}
                      />
                    ))}
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
            {isLoadingAvailability
              ? "Buscando horarios…"
              : date
                ? "No quedan horarios ese día. Probá con otro."
                : "Tocá un día de arriba y te mostramos los horarios."}
          </p>
        )}
      </div>
    </StepShell>
  );
}
