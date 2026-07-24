import { useMemo, useState } from "react";
import {
  appointmentsMock,
  categories,
  operationalBufferSettings,
  services,
  type OperationalBufferSettings,
} from "@/lib/booking-data";

function minutesLabel(minutes: number) {
  return `${minutes} min`;
}

export function OperationalBufferPanel() {
  const [settings, setSettings] = useState<OperationalBufferSettings>(operationalBufferSettings);
  const highlightedServices = useMemo(
    () =>
      Object.entries(settings.byServiceId).map(([serviceId, minutes]) => {
        const service = Object.values(services)
          .flat()
          .find((candidate) => candidate.id === serviceId);

        return {
          serviceId,
          serviceName: service?.name ?? serviceId,
          minutes,
        };
      }),
    [settings.byServiceId],
  );

  return (
    <section className="rounded-[2rem] border border-border bg-card p-5 shadow-[0_30px_70px_-55px_rgba(120,90,60,0.5)] sm:p-7">
      <div className="flex flex-col gap-2 border-b border-border/70 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
            Configuración operativa
          </p>
          <h1 className="mt-2 font-serif text-3xl text-foreground sm:text-4xl">
            Tiempo de preparación entre turnos
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Minutos internos para limpieza y preparación. No se muestran en la experiencia pública.
          </p>
        </div>
        <label className="flex w-fit items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={settings.active}
            onChange={(event) =>
              setSettings((current) => ({ ...current, active: event.currentTarget.checked }))
            }
            className="h-3.5 w-3.5 accent-primary"
          />
          Activo
        </label>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-3xl border border-border bg-background p-4">
          <h2 className="font-serif text-2xl text-foreground">Limpieza y preparación</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Valor general que se aplica cuando no hay una regla más específica.
          </p>
          <label className="mt-4 block text-sm text-muted-foreground">
            Minutos internos
            <input
              type="number"
              min={0}
              value={settings.defaultBufferMinutes}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  defaultBufferMinutes: Number(event.currentTarget.value),
                }))
              }
              className="mt-2 w-full rounded-2xl border border-border bg-card px-4 py-3 text-base text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
        </div>

        <div className="rounded-3xl border border-border bg-background p-4">
          <h2 className="font-serif text-2xl text-foreground">Por categoría</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {categories.map((category) => (
              <label key={category.id} className="rounded-2xl bg-card p-4 text-sm">
                <span className="font-medium text-foreground">{category.name}</span>
                <span className="mt-1 block text-xs text-muted-foreground">Minutos internos</span>
                <input
                  type="number"
                  min={0}
                  value={settings.byCategory[category.id] ?? settings.defaultBufferMinutes}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      byCategory: {
                        ...current.byCategory,
                        [category.id]: Number(event.currentTarget.value),
                      },
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-3xl border border-border bg-background p-4">
        <h2 className="font-serif text-2xl text-foreground">Por servicio</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Estos valores tienen prioridad sobre categoría y general.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {highlightedServices.map((service) => (
            <label key={service.serviceId} className="rounded-2xl bg-card p-4 text-sm">
              <span className="font-medium text-foreground">{service.serviceName}</span>
              <span className="mt-1 block text-xs text-muted-foreground">Minutos internos</span>
              <input
                type="number"
                min={0}
                value={service.minutes}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    byServiceId: {
                      ...current.byServiceId,
                      [service.serviceId]: Number(event.currentTarget.value),
                    },
                  }))
                }
                className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
          ))}
        </div>
      </div>

      <div className="mt-5 rounded-3xl border border-border bg-background p-4">
        <h2 className="font-serif text-2xl text-foreground">Vista interna de turnos</h2>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {appointmentsMock.slice(0, 4).map((appointment) => (
            <article
              key={`${appointment.date}-${appointment.startsAt}`}
              className="rounded-2xl bg-card p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-foreground">
                    {appointment.serviceName ?? "Turno"} · {appointment.startsAt}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{appointment.date}</p>
                </div>
                <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
                  Activo
                </span>
              </div>
              <dl className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                <div>
                  <dt>Duración del servicio</dt>
                  <dd className="font-medium text-foreground">
                    {minutesLabel(appointment.serviceDurationMinutes ?? 0)}
                  </dd>
                </div>
                <div>
                  <dt>Preparación interna</dt>
                  <dd className="font-medium text-foreground">
                    {minutesLabel(appointment.preparationMinutes ?? 0)}
                  </dd>
                </div>
                <div>
                  <dt>Tiempo bloqueado en agenda</dt>
                  <dd className="font-medium text-foreground">
                    {minutesLabel(appointment.blockedDurationMinutes ?? 0)}
                  </dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
