import { businessHours, closedDays, scheduleBlocks } from "@/lib/booking-data";

export function ClosedDaysBlocksPanel() {
  const activeClosedDays = closedDays.filter((closedDay) => closedDay.active);
  const inactiveClosedDays = closedDays.filter((closedDay) => !closedDay.active);
  const activeBlocks = scheduleBlocks.filter((block) => block.active);

  return (
    <section className="rounded-[2rem] border border-border bg-card p-5 shadow-[0_30px_70px_-55px_rgba(120,90,60,0.5)] sm:p-7">
      <div className="flex flex-col gap-2 border-b border-border/70 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
            Configuración operativa
          </p>
          <h1 className="mt-2 font-serif text-3xl text-foreground sm:text-4xl">
            Días cerrados y bloqueos
          </h1>
        </div>
        <span className="w-fit rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
          Mock funcional
        </span>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-3xl border border-border bg-background p-4">
          <h2 className="font-serif text-2xl text-foreground">Días cerrados</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Preparado para administrar feriados, vacaciones y días personales.
          </p>
          <div className="mt-4 space-y-3">
            {[...activeClosedDays, ...inactiveClosedDays].map((closedDay) => (
              <article
                key={`${closedDay.date}-${closedDay.reason}`}
                className="rounded-2xl bg-card p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{closedDay.date}</p>
                    <p className="mt-1 text-sm text-muted-foreground">Motivo: {closedDay.reason}</p>
                  </div>
                  <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
                    {closedDay.active ? "Activo" : "Inactivo"}
                  </span>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>
                    <dt>Día cerrado</dt>
                    <dd className="font-medium text-foreground">
                      {closedDay.fullDay ? "Completo" : "Parcial"}
                    </dd>
                  </div>
                  {!closedDay.fullDay && (
                    <div>
                      <dt>Horario desde / hasta</dt>
                      <dd className="font-medium text-foreground">
                        {closedDay.startsAt ?? "Apertura"} – {closedDay.endsAt ?? "Cierre"}
                      </dd>
                    </div>
                  )}
                </dl>
              </article>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-background p-4">
          <h2 className="font-serif text-2xl text-foreground">Bloqueos parciales</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Preparado para capacitaciones, trámites o bloqueos por horario.
          </p>
          <div className="mt-4 space-y-3">
            {activeBlocks.map((block) => (
              <article key={`${block.date}-${block.startsAt}`} className="rounded-2xl bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{block.date}</p>
                    <p className="mt-1 text-sm text-muted-foreground">Motivo: {block.reason}</p>
                  </div>
                  <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
                    Activo
                  </span>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>
                    <dt>Horario desde</dt>
                    <dd className="font-medium text-foreground">{block.startsAt}</dd>
                  </div>
                  <div>
                    <dt>Horario hasta</dt>
                    <dd className="font-medium text-foreground">{block.endsAt}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-3xl border border-border bg-background p-4">
        <h2 className="font-serif text-2xl text-foreground">Horarios del negocio</h2>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {businessHours.map((hours) => (
            <div key={hours.weekday} className="rounded-2xl bg-card px-4 py-3 text-sm">
              <p className="font-medium text-foreground">Día {hours.weekday}</p>
              <p className="text-muted-foreground">
                {hours.opensAt} – {hours.closesAt} · {hours.active ? "Activo" : "Inactivo"}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
