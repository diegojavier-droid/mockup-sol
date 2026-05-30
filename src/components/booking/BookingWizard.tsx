import { useState } from "react";
import {
  categories,
  services,
  extras as extrasMap,
  personalizationFields,
  mockDates,
  mockTimes,
  type CategoryId,
  type Service,
  type Extra,
  type Tag,
} from "@/lib/booking-data";
import { Stepper } from "./Stepper";
import { SummaryPanel, computeTotals, type SummaryData } from "./SummaryPanel";

type Personalization = Record<string, string>;

const STEPS = ["Categoría", "Servicio", "Detalles", "Extras", "Fecha y hora", "Resumen"];

const tagStyle: Record<Tag, string> = {
  popular: "bg-champagne text-accent-foreground",
  combinado: "bg-blonde/60 text-foreground/80",
  tratamiento: "bg-cream text-foreground/70 border border-border",
  color: "bg-wood/30 text-foreground/80",
  evento: "bg-sand text-foreground/80",
};

export function BookingWizard({ onExit }: { onExit: () => void }) {
  const [step, setStep] = useState(0);
  const [category, setCategory] = useState<CategoryId | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [personal, setPersonal] = useState<Personalization>({});
  const [chosenExtras, setChosenExtras] = useState<Extra[]>([]);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const data: SummaryData = {
    category,
    service,
    extras: chosenExtras,
    date: date ? mockDates.find((d) => d.iso === date)?.label ?? null : null,
    time,
  };

  const canNext = (() => {
    if (step === 0) return !!category;
    if (step === 1) return !!service;
    if (step === 2) return category ? personalizationFields[category].every((f) => personal[f.id]) : false;
    if (step === 3) return true;
    if (step === 4) return !!date && !!time;
    return true;
  })();

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => {
    if (step === 0) return onExit();
    setStep((s) => s - 1);
  };

  if (confirmed) return <Confirmation data={data} onClose={onExit} />;

  return (
    <div className="min-h-screen bg-background">
      <Header onBack={back} />

      <div className="mx-auto max-w-6xl px-4 pb-40 pt-4 lg:px-8 lg:pb-12">
        <div className="mb-6 lg:mb-10">
          <Stepper current={step} total={STEPS.length} labels={STEPS} />
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
          <div className="min-w-0">
            {step === 0 && (
              <StepShell title="¿Qué te gustaría reservar?" subtitle="Elegí una categoría para comenzar.">
                <div className="grid gap-4 sm:grid-cols-3">
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => { setCategory(c.id); setService(null); setPersonal({}); setChosenExtras([]); }}
                      className={`group relative overflow-hidden rounded-2xl border p-6 text-left transition-all duration-300 ${
                        category === c.id
                          ? "border-champagne-deep bg-card shadow-[0_20px_40px_-25px_rgba(120,90,60,0.35)]"
                          : "border-border bg-card hover:border-champagne hover:shadow-[0_20px_40px_-30px_rgba(120,90,60,0.25)]"
                      }`}
                    >
                      <div className="flex h-24 items-center justify-center rounded-xl bg-gradient-to-br from-cream to-sand/60 text-4xl text-champagne-deep">
                        {c.emoji}
                      </div>
                      <h3 className="mt-4 font-serif text-2xl text-foreground">{c.name}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{c.tagline}</p>
                      {category === c.id && (
                        <span className="absolute right-4 top-4 inline-flex h-6 w-6 items-center justify-center rounded-full bg-champagne-deep text-[11px] text-primary-foreground">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </StepShell>
            )}

            {step === 1 && category && (
              <StepShell
                title="Elegí tu servicio"
                subtitle={`${services[category].length} opciones disponibles en ${categories.find((c) => c.id === category)?.name.toLowerCase()}.`}
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  {services[category].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setService(s)}
                      className={`group flex gap-4 rounded-2xl border p-4 text-left transition-all duration-200 ${
                        service?.id === s.id
                          ? "border-champagne-deep bg-card shadow-[0_18px_36px_-26px_rgba(120,90,60,0.35)]"
                          : "border-border bg-card hover:border-champagne"
                      }`}
                    >
                      <div className="flex h-16 w-16 flex-none items-center justify-center rounded-xl bg-gradient-to-br from-cream via-ivory to-blonde/50 font-serif text-xl text-champagne-deep">
                        {s.name.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-serif text-lg leading-snug text-foreground">{s.name}</h4>
                          {service?.id === s.id && (
                            <span className="inline-flex h-5 w-5 flex-none items-center justify-center rounded-full bg-champagne-deep text-[10px] text-primary-foreground">✓</span>
                          )}
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{s.desc}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                          {s.tag && (
                            <span className={`rounded-full px-2 py-0.5 capitalize ${tagStyle[s.tag]}`}>{s.tag}</span>
                          )}
                          <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">{s.duration}</span>
                          <span className="ml-auto font-serif text-base text-foreground">{s.price}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </StepShell>
            )}

            {step === 2 && category && (
              <StepShell title="Contanos un poco más" subtitle="Para preparar tu experiencia con todo el detalle.">
                <div className="space-y-5">
                  {personalizationFields[category].map((f) => (
                    <div key={f.id}>
                      <p className="mb-2 text-sm font-medium text-foreground">{f.label}</p>
                      <div className="flex flex-wrap gap-2">
                        {f.options.map((o) => (
                          <button
                            key={o}
                            onClick={() => setPersonal((p) => ({ ...p, [f.id]: o }))}
                            className={`rounded-full border px-4 py-2 text-sm transition-all ${
                              personal[f.id] === o
                                ? "border-champagne-deep bg-champagne text-accent-foreground"
                                : "border-border bg-card text-foreground/80 hover:border-champagne"
                            }`}
                          >
                            {o}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </StepShell>
            )}

            {step === 3 && category && (
              <StepShell title="¿Sumamos algún extra?" subtitle="Opcional. Podés saltear este paso.">
                <div className="grid gap-3 sm:grid-cols-2">
                  {extrasMap[category].map((e) => {
                    const selected = chosenExtras.some((x) => x.id === e.id);
                    return (
                      <button
                        key={e.id}
                        onClick={() =>
                          setChosenExtras((prev) =>
                            selected ? prev.filter((x) => x.id !== e.id) : [...prev, e]
                          )
                        }
                        className={`flex items-center justify-between gap-3 rounded-2xl border p-4 text-left transition-all ${
                          selected
                            ? "border-champagne-deep bg-card"
                            : "border-border bg-card hover:border-champagne"
                        }`}
                      >
                        <div>
                          <p className="font-serif text-base text-foreground">{e.name}</p>
                          <p className="text-xs text-muted-foreground">+{e.price}</p>
                        </div>
                        <span
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs ${
                            selected
                              ? "border-champagne-deep bg-champagne-deep text-primary-foreground"
                              : "border-border text-muted-foreground"
                          }`}
                        >
                          {selected ? "✓" : "+"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </StepShell>
            )}

            {step === 4 && (
              <StepShell title="Fecha y hora" subtitle="Disponibilidad simulada para esta demo.">
                <div>
                  <p className="mb-3 text-sm font-medium text-foreground">Próximas fechas</p>
                  <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:px-0">
                    {mockDates.map((d) => (
                      <button
                        key={d.iso}
                        onClick={() => setDate(d.iso)}
                        className={`flex min-w-[68px] flex-col items-center rounded-2xl border px-3 py-3 transition-all ${
                          date === d.iso
                            ? "border-champagne-deep bg-champagne text-accent-foreground"
                            : "border-border bg-card hover:border-champagne"
                        }`}
                      >
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{d.weekday}</span>
                        <span className="font-serif text-2xl">{d.day}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-7">
                  <p className="mb-3 text-sm font-medium text-foreground">Horarios disponibles</p>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {mockTimes.map((t) => (
                      <button
                        key={t}
                        disabled={!date}
                        onClick={() => setTime(t)}
                        className={`rounded-xl border py-3 font-serif text-base transition-all ${
                          time === t
                            ? "border-champagne-deep bg-champagne text-accent-foreground"
                            : "border-border bg-card hover:border-champagne disabled:opacity-40"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  {!date && <p className="mt-3 text-xs text-muted-foreground">Elegí primero una fecha.</p>}
                </div>
              </StepShell>
            )}

            {step === 5 && (
              <StepShell title="Revisemos tu reserva" subtitle="Si todo está bien, confirmá tu interés.">
                <FinalSummary data={data} personal={personal} />
                <button
                  onClick={() => setConfirmed(true)}
                  className="mt-6 w-full rounded-2xl bg-primary py-4 font-serif text-lg text-primary-foreground transition-all hover:opacity-95"
                >
                  Confirmar interés
                </button>
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  El salón confirmará el turno por WhatsApp.
                </p>
              </StepShell>
            )}
          </div>

          <div className="hidden lg:block">
            <SummaryPanel data={data} />
          </div>
        </div>
      </div>

      {/* Sticky mobile footer */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 px-4 py-3 backdrop-blur-md lg:hidden">
        <div className="mb-3"><SummaryPanel data={data} variant="bottom" /></div>
        <div className="flex gap-2">
          <button
            onClick={back}
            className="flex-1 rounded-xl border border-border bg-background py-3 text-sm text-foreground/80 transition-all hover:bg-cream"
          >
            {step === 0 ? "Cerrar" : "Atrás"}
          </button>
          {step < STEPS.length - 1 && (
            <button
              onClick={next}
              disabled={!canNext}
              className="flex-[1.4] rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground transition-all disabled:opacity-40"
            >
              Continuar
            </button>
          )}
        </div>
      </div>

      {/* Desktop nav */}
      <div className="hidden lg:block">
        <div className="fixed inset-x-0 bottom-6 mx-auto max-w-6xl px-8">
          <div className="ml-auto flex max-w-[calc(100%-372px)] justify-end gap-2">
            <button
              onClick={back}
              className="rounded-xl border border-border bg-card px-6 py-3 text-sm text-foreground/80 shadow-sm transition-all hover:bg-cream"
            >
              {step === 0 ? "Cerrar" : "Atrás"}
            </button>
            {step < STEPS.length - 1 && (
              <button
                onClick={next}
                disabled={!canNext}
                className="rounded-xl bg-primary px-8 py-3 text-sm font-medium text-primary-foreground shadow-md transition-all disabled:opacity-40"
              >
                Continuar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 lg:px-8">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <span className="text-base">←</span> Volver
        </button>
        <div className="text-center">
          <p className="font-serif text-lg leading-none text-foreground">Sol Mai</p>
          <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Peluquería · Santa Fe</p>
        </div>
        <div className="w-12" />
      </div>
    </header>
  );
}

function StepShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-serif text-3xl text-foreground lg:text-4xl">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground lg:text-base">{subtitle}</p>
      <div className="mt-6 lg:mt-8">{children}</div>
    </section>
  );
}

function FinalSummary({ data, personal }: { data: SummaryData; personal: Personalization }) {
  const cat = categories.find((c) => c.id === data.category);
  const { dur, price } = computeTotals(data);
  const fields = data.category ? personalizationFields[data.category] : [];

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Categoría" value={cat?.name ?? "—"} />
        <Field label="Servicio" value={data.service?.name ?? "—"} />
        <Field label="Fecha" value={data.date ?? "—"} />
        <Field label="Hora" value={data.time ?? "—"} />
        <Field label="Duración estimada" value={dur} />
        <Field label="Precio estimado" value={price} />
      </div>

      {data.extras.length > 0 && (
        <div className="mt-5 border-t border-border pt-5">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Extras</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {data.extras.map((e) => (
              <span key={e.id} className="rounded-full bg-cream px-3 py-1 text-xs">{e.name} · {e.price}</span>
            ))}
          </div>
        </div>
      )}

      {fields.length > 0 && (
        <div className="mt-5 border-t border-border pt-5">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Tus preferencias</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {fields.map((f) => (
              <div key={f.id}>
                <p className="text-[11px] text-muted-foreground">{f.label}</p>
                <p className="text-sm text-foreground/90">{personal[f.id] ?? "—"}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-serif text-lg text-foreground">{value}</p>
    </div>
  );
}

function Confirmation({ data, onClose }: { data: SummaryData; onClose: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-ivory via-cream to-sand/40 px-4">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-[0_30px_60px_-30px_rgba(120,90,60,0.3)]">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-champagne text-2xl text-champagne-deep">✓</div>
        <h2 className="mt-5 font-serif text-3xl text-foreground">¡Gracias!</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Recibimos tu interés de reserva para {data.service?.name ?? "tu servicio"} el {data.date} a las {data.time}.
        </p>
        <p className="mt-4 rounded-xl bg-cream p-4 text-xs leading-relaxed text-foreground/70">
          El salón confirmará el turno por WhatsApp a la brevedad. Si necesitás reprogramar, también podés escribirnos por ahí.
        </p>
        <button
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-primary py-3 text-sm text-primary-foreground transition-all hover:opacity-95"
        >
          Volver al inicio
        </button>
      </div>
    </div>
  );
}
