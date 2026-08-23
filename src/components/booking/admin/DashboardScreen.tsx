/**
 * Los números del salón.
 *
 * Seis indicadores, no cincuenta. El criterio de inclusión no fue cuál
 * suena mejor sino cuál cambia una decisión de Sol y cuál tiene su
 * insumo garantizado por el sistema.
 *
 * El margen aparece SÓLO si hay costos cargados, y siempre dice sobre
 * cuántas atenciones se calculó. Un margen sobre 2 de 40 atenciones no
 * es el margen del mes: parece un dato y no lo es.
 */

import { useMemo, useState } from "react";
import { useDashboard, type DashboardSummary } from "@/lib/api/admin-hooks";

type Preset = "semana" | "mes" | "anterior";

/** Fecha del salón (UTC-3), no la del dispositivo de quien mira. */
function salonDate(offsetDays = 0): Date {
  return new Date(Date.now() - 180 * 60_000 + offsetDays * 86_400_000);
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function rangeFor(preset: Preset): { from: string; to: string; label: string } {
  const today = salonDate();
  if (preset === "semana") {
    // Semana del salón: lunes a hoy.
    const dow = (today.getUTCDay() + 6) % 7;
    const monday = salonDate(-dow);
    return { from: iso(monday), to: iso(today), label: "Esta semana" };
  }
  if (preset === "mes") {
    const first = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
    return { from: iso(first), to: iso(today), label: "Este mes" };
  }
  const first = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1));
  const last = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 0));
  return { from: iso(first), to: iso(last), label: "Mes anterior" };
}

function money(n: number): string {
  return `$${n.toLocaleString("es-AR")}`;
}

const CHANNEL_LABEL: Record<string, string> = {
  online: "Web",
  manual: "Mostrador",
  phone: "Teléfono",
  whatsapp: "WhatsApp",
  walk_in: "Sin turno",
};

const STATUS_LABEL: Record<string, string> = {
  pending_payment: "Falta la seña",
  confirmed: "Confirmado",
  attended: "Atendido",
  cancelled: "Cancelado",
  expired: "Vencido",
  no_show: "No vino",
};

export function DashboardScreen() {
  const [preset, setPreset] = useState<Preset>("semana");
  const range = useMemo(() => rangeFor(preset), [preset]);
  const query = useDashboard({ from: range.from, to: range.to });

  return (
    <section>
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-serif text-xl text-foreground">Los números</h2>
        <p className="text-xs text-muted-foreground">
          {range.from} al {range.to}
        </p>
      </header>

      <div className="mt-3 flex flex-wrap gap-2">
        {(["semana", "mes", "anterior"] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPreset(p)}
            className={`rounded-full border px-4 py-2 text-sm transition-colors ${
              preset === p
                ? "border-champagne-deep bg-champagne/40 text-foreground"
                : "border-border bg-card text-muted-foreground hover:border-champagne"
            }`}
          >
            {rangeFor(p).label}
          </button>
        ))}
      </div>

      {query.isPending && (
        <p className="mt-6 text-sm text-muted-foreground">Buscando los números…</p>
      )}
      {query.isError && (
        <p className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {(query.error as Error).message}
        </p>
      )}
      {query.data && <Summary data={query.data} />}
    </section>
  );
}

function Card({ label, value, hint }: { label: string; value: string; hint?: string | null }) {
  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-3">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-serif text-2xl text-foreground">{value}</p>
      {hint && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Summary({ data }: { data: DashboardSummary }) {
  const channels = Object.entries(data.bookings_by_channel).sort((a, b) => b[1] - a[1]);
  const statuses = Object.entries(data.bookings_by_status).sort((a, b) => b[1] - a[1]);
  const online = data.bookings_by_channel.online ?? 0;
  const totalBookings = Object.values(data.bookings_by_channel).reduce((a, b) => a + b, 0);

  return (
    <div className="mt-5 space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <Card
          label="Cobrado"
          value={money(data.collected_amount)}
          hint="Pagos acreditados, en cualquier medio."
        />
        <Card
          label="Facturado"
          value={money(data.invoiced_amount)}
          hint={`${data.attended_count} ${data.attended_count === 1 ? "atención cerrada" : "atenciones cerradas"}.`}
        />
        <Card
          label="Ticket promedio"
          value={data.attended_count > 0 ? money(data.average_ticket) : "—"}
          hint={
            data.attended_count > 0
              ? "Sobre el precio final, no el estimado."
              : "Todavía no hay atenciones cerradas."
          }
        />
        <Card
          label="Ocupación"
          value={data.occupancy.rate_pct === null ? "—" : `${data.occupancy.rate_pct}%`}
          hint={
            data.occupancy.rate_pct === null
              ? "El salón no abrió en este período."
              : `Sobre estaciones. ${Math.round(data.occupancy.sold_minutes / 60)} de ${Math.round(
                  data.occupancy.capacity_minutes / 60,
                )} horas-estación.`
          }
        />
      </div>

      {/* El global mezcla sillones con camilla: sin apertura por área, un
          12 % puede esconder Peluquería llena. */}
      {data.occupancy.by_area.some((a) => a.capacity_minutes > 0) && (
        <div className="rounded-2xl border border-border bg-card px-4 py-3">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Ocupación por área
          </p>
          <ul className="mt-2 space-y-2">
            {data.occupancy.by_area
              .filter((a) => a.capacity_minutes > 0)
              .map((a) => (
                <li key={a.area} className="flex items-center gap-3 text-sm">
                  <span className="w-24 shrink-0 text-muted-foreground">{a.name}</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-cream">
                    <span
                      className="block h-full rounded-full bg-champagne-deep"
                      style={{ width: `${Math.min(a.rate_pct ?? 0, 100)}%` }}
                    />
                  </span>
                  <span className="w-12 shrink-0 text-right tabular-nums text-foreground">
                    {a.rate_pct === null ? "—" : `${a.rate_pct}%`}
                  </span>
                </li>
              ))}
          </ul>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card px-4 py-3">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Reservas por canal
          </p>
          {channels.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Sin reservas en el período.</p>
          ) : (
            <>
              <ul className="mt-2 space-y-1 text-sm">
                {channels.map(([k, n]) => (
                  <li key={k} className="flex justify-between">
                    <span className="text-muted-foreground">{CHANNEL_LABEL[k] ?? k}</span>
                    <span className="tabular-nums text-foreground">{n}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {online === 0
                  ? "Todavía ninguna reserva entró sola por la web."
                  : `${Math.round((online / totalBookings) * 100)}% entró sola por la web.`}
              </p>
            </>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card px-4 py-3">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Reservas por estado
          </p>
          {statuses.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Sin reservas en el período.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm">
              {statuses.map(([k, n]) => (
                <li key={k} className="flex justify-between">
                  <span className="text-muted-foreground">{STATUS_LABEL[k] ?? k}</span>
                  <span className="tabular-nums text-foreground">{n}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card
          label="Clientas nuevas"
          value={String(data.new_customers)}
          hint={`${data.active_customers} ${
            data.active_customers === 1 ? "clienta distinta" : "clientas distintas"
          } en el período.`}
        />
        <Card
          label="Señas retenidas"
          value={money(data.retained_deposits)}
          hint={
            data.retained_deposits === 0
              ? "Nadie faltó con la seña paga."
              : "De turnos marcados como no vino."
          }
        />
      </div>

      {/* NO DISPONIBLE no es cero. Sin costos cargados el margen no
          existe, y mostrar $0 sería inventar un dato. */}
      <div className="rounded-2xl border border-border bg-card px-4 py-3">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Margen</p>
        {data.margin.available ? (
          <>
            <p className="mt-1 font-serif text-2xl text-foreground">
              {money(data.margin.amount ?? 0)}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Calculado sobre {data.margin.coverage} de {data.attended_count}{" "}
              {data.attended_count === 1 ? "atención" : "atenciones"}
              {data.margin.coverage < data.attended_count
                ? ": las demás no tienen el costo cargado, así que este número todavía no es el margen del período."
                : "."}
            </p>
          </>
        ) : (
          <>
            <p className="mt-1 font-serif text-2xl text-muted-foreground">No disponible</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              El margen necesita el costo de cada atención. Mientras no esté cargado, el sistema
              prefiere no mostrar nada antes que mostrar un número que parezca real.
            </p>
          </>
        )}
      </div>

      {data.top_services.length > 0 && (
        <div className="rounded-2xl border border-border bg-card px-4 py-3">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Servicios más hechos
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {data.top_services.map((s) => (
              <li key={s.name} className="flex justify-between gap-3">
                <span className="text-muted-foreground">{s.name}</span>
                <span className="tabular-nums text-foreground">{s.count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
