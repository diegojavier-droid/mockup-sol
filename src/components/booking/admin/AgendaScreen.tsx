/**
 * La agenda del salón.
 *
 * Es la pantalla que se abre veinte veces por día, así que manda lo
 * operativo: qué hay ahora, quién viene, y poder tomar un turno sin
 * pensar. Todo lo demás es secundario.
 */

import { useMemo, useState } from "react";
import {
  useAgenda,
  useAreas,
  useMarkNoShow,
  useUpdateBookingStatus,
  type AgendaEntry,
} from "@/lib/api/admin-hooks";
import { NewBookingDialog } from "./NewBookingDialog";

type Range = "hoy" | "manana" | "semana";

const RANGES: { id: Range; label: string; days: number; offset: number }[] = [
  { id: "hoy", label: "Hoy", days: 1, offset: 0 },
  { id: "manana", label: "Mañana", days: 1, offset: 1 },
  { id: "semana", label: "Semana", days: 7, offset: 0 },
];

/** Fecha del salón (UTC-3), no la del dispositivo de quien mira. */
function salonToday(offsetDays = 0): string {
  const now = new Date(Date.now() - 180 * 60_000 + offsetDays * 86_400_000);
  return now.toISOString().slice(0, 10);
}

function salonTime(iso: string): string {
  const d = new Date(new Date(iso).getTime() - 180 * 60_000);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

function salonDayLabel(iso: string): string {
  const d = new Date(new Date(iso).getTime() - 180 * 60_000);
  const dias = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  return `${dias[d.getUTCDay()]} ${d.getUTCDate()}`;
}

const STATUS_LABEL: Record<string, string> = {
  pending_payment: "Falta la seña",
  confirmed: "Confirmado",
  attended: "Atendido",
  cancelled: "Cancelado",
  expired: "Vencido",
  no_show: "No vino",
};

const SOURCE_LABEL: Record<string, string> = {
  online: "Web",
  manual: "Mostrador",
  phone: "Teléfono",
  whatsapp: "WhatsApp",
  walk_in: "Sin turno",
};

function statusTone(status: string): string {
  if (status === "confirmed") return "border-champagne-deep/40 bg-champagne/30 text-foreground";
  if (status === "attended") return "border-border bg-cream/50 text-muted-foreground";
  if (status === "pending_payment") return "border-amber-500/40 bg-amber-500/10 text-foreground";
  if (status === "no_show") return "border-destructive/40 bg-destructive/10 text-destructive";
  return "border-border bg-muted/40 text-muted-foreground";
}

export function AgendaScreen() {
  const [range, setRange] = useState<Range>("hoy");
  // "¿Tenés algo para el 15?" es pregunta de todos los días: la agenda
  // tiene que poder ir a una fecha, no sólo a hoy y esta semana.
  const [pickedDate, setPickedDate] = useState<string>("");
  const [area, setArea] = useState<string>("");
  const [creating, setCreating] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const cfg = RANGES.find((r) => r.id === range)!;
  const date = pickedDate || salonToday(cfg.offset);
  const days = pickedDate ? 1 : cfg.days;
  const agenda = useAgenda({ date, days, area: area || undefined });
  const areas = useAreas();

  const entries = agenda.data?.entries ?? [];
  const byDay = useMemo(() => {
    const groups = new Map<string, AgendaEntry[]>();
    for (const e of entries) {
      const key = new Date(new Date(e.startsAt).getTime() - 180 * 60_000)
        .toISOString()
        .slice(0, 10);
      groups.set(key, [...(groups.get(key) ?? []), e]);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [entries]);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl leading-tight text-foreground">Agenda</h1>
          <p className="text-sm text-muted-foreground">
            {agenda.isLoading
              ? "Buscando turnos…"
              : `${entries.length} ${entries.length === 1 ? "turno" : "turnos"}`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="rounded-full bg-primary px-5 py-2.5 font-serif text-sm text-primary-foreground shadow-sm transition-all hover:translate-y-[-1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          + Nuevo turno
        </button>
      </header>

      <div className="flex flex-wrap gap-2">
        {RANGES.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => {
              setRange(r.id);
              setPickedDate("");
            }}
            aria-pressed={range === r.id && !pickedDate}
            className={`rounded-full border px-4 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              range === r.id && !pickedDate
                ? "border-champagne-deep bg-champagne/40 text-foreground"
                : "border-border bg-card text-muted-foreground hover:border-champagne"
            }`}
          >
            {r.label}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <span className="sr-only sm:not-sr-only">Otra fecha</span>
          <input
            type="date"
            value={pickedDate}
            onChange={(e) => setPickedDate(e.target.value)}
            aria-label="Ver otra fecha"
            className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterChip active={area === ""} onClick={() => setArea("")}>
          Todas
        </FilterChip>
        {(areas.data ?? []).map((a) => (
          <FilterChip key={a.slug} active={area === a.slug} onClick={() => setArea(a.slug)}>
            {a.name}
          </FilterChip>
        ))}
      </div>

      {feedback && (
        <p className="rounded-2xl border border-champagne-deep/30 bg-cream/60 px-4 py-3 text-sm text-foreground/85">
          {feedback}
        </p>
      )}

      {agenda.isError && (
        <p className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {(agenda.error as Error).message}
        </p>
      )}

      {!agenda.isLoading && entries.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border px-5 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            No hay turnos{" "}
            {pickedDate
              ? "ese día"
              : range === "hoy"
                ? "para hoy"
                : range === "manana"
                  ? "para mañana"
                  : "esta semana"}
            {area ? " en esta área" : ""}.
          </p>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="mt-3 text-sm text-foreground underline-offset-4 hover:underline"
          >
            Tomar un turno
          </button>
        </div>
      )}

      {byDay.map(([day, dayEntries]) => (
        <section key={day} className="space-y-2">
          {days > 1 && (
            <h2 className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {salonDayLabel(dayEntries[0].startsAt)}
            </h2>
          )}
          {dayEntries.map((entry) => (
            <BookingRow key={entry.id} entry={entry} onFeedback={setFeedback} />
          ))}
        </section>
      ))}

      {creating && (
        <NewBookingDialog
          onClose={() => setCreating(false)}
          onCreated={(msg) => {
            setCreating(false);
            setFeedback(msg);
          }}
        />
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        active
          ? "border-foreground/30 bg-foreground/5 text-foreground"
          : "border-border bg-card text-muted-foreground hover:border-champagne"
      }`}
    >
      {children}
    </button>
  );
}

function BookingRow({
  entry,
  onFeedback,
}: {
  entry: AgendaEntry;
  onFeedback: (msg: string) => void;
}) {
  const [confirmingNoShow, setConfirmingNoShow] = useState(false);
  const noShow = useMarkNoShow();
  const status = useUpdateBookingStatus();
  const open = entry.status === "confirmed" || entry.status === "pending_payment";

  return (
    <article className={`rounded-2xl border px-4 py-3 ${statusTone(entry.status)}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div className="flex items-baseline gap-3">
          <span className="font-serif text-lg tabular-nums">{salonTime(entry.startsAt)}</span>
          <span className="text-sm">
            {entry.customer.firstName} {entry.customer.lastName ?? ""}
          </span>
        </div>
        <span className="text-[11px] uppercase tracking-wider opacity-80">
          {STATUS_LABEL[entry.status] ?? entry.status}
        </span>
      </div>

      <p className="mt-1 text-xs opacity-85">
        {entry.services.join(" + ") || "Servicio"} · {entry.shownDurationMin} min · {entry.area}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wider">
        <span className="rounded-full border border-current/20 px-2 py-0.5 opacity-70">
          {SOURCE_LABEL[entry.source] ?? entry.source}
        </span>
        {entry.createdViaOverride && (
          <span
            className="rounded-full border border-amber-600/40 bg-amber-500/15 px-2 py-0.5 text-amber-700 dark:text-amber-400"
            title={entry.overrideReason ?? "Creado por excepción"}
          >
            Excepción
          </span>
        )}
        {entry.depositStatus === "retained" && (
          <span className="rounded-full border border-current/20 px-2 py-0.5 opacity-70">
            Seña retenida
          </span>
        )}
      </div>

      {open && (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-current/10 pt-2.5">
          {entry.status === "confirmed" && (
            <RowAction
              onClick={() =>
                status.mutate(
                  { bookingId: entry.id, status: "attended" },
                  { onSuccess: () => onFeedback("Turno marcado como atendido.") },
                )
              }
              disabled={status.isPending}
            >
              Atendida
            </RowAction>
          )}

          {confirmingNoShow ? (
            <>
              <span className="text-xs opacity-80">
                ¿No vino?{" "}
                {entry.depositStatus === "paid"
                  ? "La seña queda retenida."
                  : "No hay seña que retener."}
              </span>
              <RowAction
                danger
                disabled={noShow.isPending}
                onClick={() =>
                  noShow.mutate(entry.id, {
                    onSuccess: (r) => {
                      setConfirmingNoShow(false);
                      onFeedback(r.message);
                    },
                  })
                }
              >
                Sí, no vino
              </RowAction>
              <RowAction onClick={() => setConfirmingNoShow(false)}>Cancelar</RowAction>
            </>
          ) : (
            <RowAction onClick={() => setConfirmingNoShow(true)}>No vino</RowAction>
          )}
        </div>
      )}
    </article>
  );
}

function RowAction({
  children,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full border px-3 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 ${
        danger
          ? "border-destructive/40 text-destructive hover:bg-destructive/10"
          : "border-current/25 hover:bg-foreground/5"
      }`}
    >
      {children}
    </button>
  );
}
