/**
 * Las estaciones del salón.
 *
 * Sirve para una cosa concreta: sacar un puesto de servicio cuando se
 * rompe o está en reparación, y que la disponibilidad lo refleje sin
 * que nadie tenga que acordarse de no dar turnos ahí.
 *
 * Los turnos que ya estaban en esa estación NO se cancelan: quedan sin
 * estación y siguen en la agenda. La clienta viene igual; hay que
 * reubicarla, no darla de baja.
 */

import { useMemo, useState } from "react";
import { useBlockStation, useStations, useUnblockStation } from "@/lib/api/admin-hooks";

/** Fecha del salón (UTC-3), no la del dispositivo de quien mira. */
function salonToday(offsetDays = 0): string {
  return new Date(Date.now() - 180 * 60_000 + offsetDays * 86_400_000).toISOString().slice(0, 10);
}

function salonDayLabel(iso: string): string {
  const d = new Date(new Date(iso).getTime() - 180 * 60_000);
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function StationsDialog({ onClose }: { onClose: () => void }) {
  const stations = useStations();
  const block = useBlockStation();
  const unblock = useUnblockStation();

  const [target, setTarget] = useState<string | null>(null);
  const [from, setFrom] = useState(() => salonToday());
  const [to, setTo] = useState(() => salonToday(1));
  const [reason, setReason] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const byArea = useMemo(() => {
    const map = new Map<string, NonNullable<typeof stations.data>>();
    for (const s of stations.data ?? []) {
      const list = map.get(s.area) ?? [];
      list.push(s);
      map.set(s.area, list);
    }
    return [...map.entries()];
  }, [stations.data]);

  const canSubmit = target !== null && reason.trim().length > 0 && to > from;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/30 p-0 sm:items-center sm:p-4">
      <div className="max-h-[90svh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-champagne-deep/20 bg-card p-5 sm:rounded-3xl">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-serif text-lg text-foreground">Estaciones</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Cerrar
          </button>
        </div>

        {feedback && (
          <p className="mt-3 rounded-2xl border border-champagne-deep/30 bg-champagne/20 px-4 py-3 text-sm text-foreground">
            {feedback}
          </p>
        )}
        {error && (
          <p className="mt-3 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}

        {stations.isPending && (
          <p className="mt-4 text-sm text-muted-foreground">Buscando estaciones…</p>
        )}

        <div className="mt-4 space-y-4">
          {byArea.map(([area, list]) => (
            <section key={area}>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{area}</p>
              <ul className="mt-1.5 space-y-1.5">
                {list.map((s) => (
                  <li
                    key={s.id}
                    className={`flex flex-wrap items-center justify-between gap-2 rounded-2xl border px-3 py-2 text-sm ${
                      s.blockedUntil
                        ? "border-amber-500/40 bg-amber-500/10"
                        : "border-border bg-background"
                    }`}
                  >
                    <span className="text-foreground">
                      {s.name}
                      {s.blockedUntil && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          fuera de servicio hasta el {salonDayLabel(s.blockedUntil)} ·{" "}
                          {s.blockReason}
                        </span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setFeedback(null);
                        setTarget(target === s.id ? null : s.id);
                      }}
                      className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-champagne"
                    >
                      {target === s.id ? "Cancelar" : "Sacar de servicio"}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        {target && (
          <div className="mt-5 rounded-2xl border border-border bg-background p-4">
            <p className="text-sm text-foreground">¿Hasta cuándo y por qué?</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Desde
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Hasta
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>
            </div>
            <label className="mt-3 block text-[11px] uppercase tracking-wider text-muted-foreground">
              Motivo
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Se rompió el sillón"
                className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>

            <button
              type="button"
              disabled={!canSubmit || block.isPending}
              onClick={() => {
                setError(null);
                block.mutate(
                  {
                    stationId: target,
                    startsAt: `${from}T00:00:00-03:00`,
                    endsAt: `${to}T00:00:00-03:00`,
                    reason: reason.trim(),
                  },
                  {
                    onSuccess: (r) => {
                      setTarget(null);
                      setReason("");
                      setFeedback(
                        r.message ?? "Listo: esa estación no cuenta para la disponibilidad.",
                      );
                    },
                    onError: (e) => setError((e as Error).message),
                  },
                );
              }}
              className="mt-4 w-full rounded-full bg-primary py-2.5 font-serif text-sm text-primary-foreground transition-all hover:translate-y-[-1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              {block.isPending ? "Guardando…" : "Sacar de servicio"}
            </button>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Los turnos que ya estaban ahí no se cancelan: quedan sin estación y siguen en la
              agenda para reubicarlos.
            </p>
          </div>
        )}

        <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
          La capacidad de cada área sale de sus estaciones activas. Para cambiarla, agregá o sacá
          estaciones — no hay un número suelto que editar.
        </p>
        {unblock.isPending && <p className="mt-2 text-xs text-muted-foreground">Actualizando…</p>}
      </div>
    </div>
  );
}
