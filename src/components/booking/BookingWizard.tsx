import type { ReactNode } from "react";
import { useState } from "react";
import {
  categories,
  extras as extrasMap,
  mockDates,
  mockTimes,
  personalizationFields,
  services,
  type CategoryId,
  type Extra,
  type Service,
  type Tag,
} from "@/lib/booking-data";
import { cn } from "@/lib/utils";
import { Stepper } from "./Stepper";
import { computeTotals } from "@/lib/booking-totals";
import { SummaryPanel, type SummaryData } from "./SummaryPanel";
import peluImg from "@/assets/sol-mai-peluqueria.jpg";
import makeImg from "@/assets/sol-mai-maquillaje.jpg";
import nailsImg from "@/assets/sol-mai-unas.jpg";

const categoryImages: Record<CategoryId, string> = {
  peluqueria: peluImg,
  maquillaje: makeImg,
  unas: nailsImg,
};

type Personalization = Record<string, string>;

const STEPS = ["Categoría", "Servicio", "Detalles", "Extras", "Fecha y hora", "Resumen"];

const tagStyle: Record<Tag, string> = {
  popular: "bg-champagne text-accent-foreground",
  combinado: "bg-blonde/60 text-foreground/80",
  tratamiento: "border border-border bg-cream text-foreground/70",
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
    date: date ? (mockDates.find((d) => d.iso === date)?.label ?? null) : null,
    time,
  };

  const canNext = (() => {
    if (step === 0) return !!category;
    if (step === 1) return !!service;
    if (step === 2) {
      return category
        ? personalizationFields[category].every((field) => personal[field.id])
        : false;
    }
    if (step === 3) return true;
    if (step === 4) return !!date && !!time;
    return true;
  })();

  const chooseCategory = (categoryId: CategoryId) => {
    setCategory(categoryId);
    setService(null);
    setPersonal({});
    setChosenExtras([]);
    setDate(null);
    setTime(null);
  };

  const chooseService = (selectedService: Service) => {
    setService(selectedService);
    setChosenExtras([]);
  };

  const chooseDate = (selectedDate: string) => {
    setDate(selectedDate);
    setTime(null);
  };

  const next = () => setStep((currentStep) => Math.min(currentStep + 1, STEPS.length - 1));
  const back = () => {
    if (step === 0) return onExit();
    setStep((currentStep) => currentStep - 1);
  };

  if (confirmed) return <Confirmation data={data} onClose={onExit} />;

  return (
    <div className="min-h-screen bg-background">
      <Header onBack={back} />

      <main className="mx-auto max-w-6xl px-4 pb-40 pt-4 lg:px-8 lg:pb-28">
        <div className="mb-6 lg:mb-10">
          <Stepper current={step} labels={STEPS} total={STEPS.length} />
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
          <div className="min-w-0">
            {step === 0 && (
              <StepShell
                title="¿Qué te gustaría reservar?"
                subtitle="Elegí una categoría para comenzar."
              >
                <div className="grid gap-5 sm:grid-cols-3">
                  {categories.map((currentCategory) => {
                    const selected = category === currentCategory.id;

                    return (
                      <button
                        key={currentCategory.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => chooseCategory(currentCategory.id)}
                        className={cn(
                          "group relative overflow-hidden rounded-3xl border bg-card text-left transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                          selected
                            ? "border-champagne-deep shadow-[0_25px_45px_-25px_rgba(120,90,60,0.4)] ring-1 ring-champagne-deep/30"
                            : "border-border hover:border-champagne hover:shadow-[0_25px_45px_-30px_rgba(120,90,60,0.3)] hover:-translate-y-0.5",
                        )}
                      >
                        <div className="relative overflow-hidden">
                          <img
                            src={categoryImages[currentCategory.id]}
                            alt={currentCategory.name}
                            loading="lazy"
                            width={800}
                            height={800}
                            className="h-40 w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                          />
                          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-card/30 via-transparent to-transparent" />
                        </div>
                        <div className="p-5">
                          <h3 className="font-serif text-2xl text-foreground">
                            {currentCategory.name}
                          </h3>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {currentCategory.tagline}
                          </p>
                        </div>
                        {selected && <SelectedMark />}
                      </button>
                    );
                  })}
                </div>
              </StepShell>
            )}

            {step === 1 && category && (
              <StepShell
                title="Elegí tu servicio"
                subtitle={`${services[category].length} opciones disponibles en ${categories
                  .find((currentCategory) => currentCategory.id === category)
                  ?.name.toLowerCase()}.`}
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  {services[category].map((currentService) => {
                    const selected = service?.id === currentService.id;

                    return (
                      <button
                        key={currentService.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => chooseService(currentService)}
                        className={cn(
                          "group flex gap-4 rounded-2xl border p-4 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                          selected
                            ? "border-champagne-deep bg-card shadow-[0_18px_36px_-26px_rgba(120,90,60,0.35)]"
                            : "border-border bg-card hover:border-champagne",
                        )}
                      >
                        <div className="flex h-16 w-16 flex-none items-center justify-center rounded-xl bg-gradient-to-br from-cream via-ivory to-blonde/50 font-serif text-xl text-champagne-deep">
                          {currentService.name.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-serif text-lg leading-snug text-foreground">
                              {currentService.name}
                            </h4>
                            {selected && <SelectedMark compact />}
                          </div>
                          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                            {currentService.desc}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                            {currentService.tag && (
                              <span
                                className={cn(
                                  "rounded-full px-2 py-0.5 capitalize",
                                  tagStyle[currentService.tag],
                                )}
                              >
                                {currentService.tag}
                              </span>
                            )}
                            <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                              {currentService.duration}
                            </span>
                            <span className="ml-auto font-serif text-base text-foreground">
                              {currentService.price}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </StepShell>
            )}

            {step === 2 && category && (
              <StepShell
                title="Contanos un poco más"
                subtitle="Para preparar tu experiencia con todo el detalle."
              >
                <div className="space-y-5">
                  {personalizationFields[category].map((field) => (
                    <fieldset key={field.id}>
                      <legend className="mb-2 text-sm font-medium text-foreground">
                        {field.label}
                      </legend>
                      <div className="flex flex-wrap gap-2">
                        {field.options.map((option) => {
                          const selected = personal[field.id] === option;

                          return (
                            <button
                              key={option}
                              type="button"
                              aria-pressed={selected}
                              onClick={() =>
                                setPersonal((current) => ({ ...current, [field.id]: option }))
                              }
                              className={cn(
                                "rounded-full border px-4 py-2 text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                                selected
                                  ? "border-champagne-deep bg-champagne text-accent-foreground"
                                  : "border-border bg-card text-foreground/80 hover:border-champagne",
                              )}
                            >
                              {option}
                            </button>
                          );
                        })}
                      </div>
                    </fieldset>
                  ))}
                </div>
              </StepShell>
            )}

            {step === 3 && category && (
              <StepShell
                title="¿Sumamos algún extra?"
                subtitle="Opcional. Podés saltear este paso."
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  {extrasMap[category].map((extra) => {
                    const selected = chosenExtras.some(
                      (chosenExtra) => chosenExtra.id === extra.id,
                    );

                    return (
                      <button
                        key={extra.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() =>
                          setChosenExtras((current) =>
                            selected
                              ? current.filter((chosenExtra) => chosenExtra.id !== extra.id)
                              : [...current, extra],
                          )
                        }
                        className={cn(
                          "flex items-center justify-between gap-3 rounded-2xl border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                          selected
                            ? "border-champagne-deep bg-card"
                            : "border-border bg-card hover:border-champagne",
                        )}
                      >
                        <div>
                          <p className="font-serif text-base text-foreground">{extra.name}</p>
                          <p className="text-xs text-muted-foreground">+{extra.price}</p>
                        </div>
                        <span
                          className={cn(
                            "inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs",
                            selected
                              ? "border-champagne-deep bg-champagne-deep text-primary-foreground"
                              : "border-border text-muted-foreground",
                          )}
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
              <StepShell
                title="Elegí fecha y hora"
                subtitle="Disponibilidad de ejemplo para validar la experiencia."
              >
                <div>
                  <p className="mb-3 text-sm font-medium text-foreground">Fecha</p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                    {mockDates.map((mockDate) => {
                      const selected = date === mockDate.iso;

                      return (
                        <button
                          key={mockDate.iso}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => chooseDate(mockDate.iso)}
                          className={cn(
                            "rounded-2xl border p-4 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                            selected
                              ? "border-champagne-deep bg-card"
                              : "border-border bg-card hover:border-champagne",
                          )}
                        >
                          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                            {mockDate.weekday}
                          </p>
                          <p className="mt-1 font-serif text-2xl text-foreground">{mockDate.day}</p>
                          <p className="text-xs text-muted-foreground">{mockDate.label}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-8">
                  <p className="mb-3 text-sm font-medium text-foreground">Horario</p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {mockTimes.map((mockTime) => {
                      const disabled = !date;
                      const selected = time === mockTime;

                      return (
                        <button
                          key={mockTime}
                          type="button"
                          aria-pressed={selected}
                          disabled={disabled}
                          onClick={() => setTime(mockTime)}
                          className={cn(
                            "rounded-xl border py-3 font-serif text-base transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-40",
                            selected
                              ? "border-champagne-deep bg-champagne text-accent-foreground"
                              : "border-border bg-card hover:border-champagne",
                          )}
                        >
                          {mockTime}
                        </button>
                      );
                    })}
                  </div>
                  {!date && (
                    <p className="mt-3 text-xs text-muted-foreground">Elegí primero una fecha.</p>
                  )}
                </div>
              </StepShell>
            )}

            {step === 5 && (
              <StepShell
                title="Revisemos tu reserva"
                subtitle="Si todo está bien, confirmá tu interés."
              >
                <FinalSummary data={data} personal={personal} />
                <button
                  type="button"
                  onClick={() => setConfirmed(true)}
                  className="mt-6 w-full rounded-full bg-primary py-4 font-serif text-lg text-primary-foreground shadow-[0_20px_40px_-18px_rgba(80,55,30,0.55)] transition-all hover:translate-y-[-1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  Confirmar interés ✦
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
      </main>

      <WizardNavigation canNext={canNext} data={data} onBack={back} onNext={next} step={step} />
    </div>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 lg:px-8">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <span aria-hidden="true" className="text-base">
            ←
          </span>
          Volver
        </button>
        <div className="text-center">
          <p className="font-serif text-lg leading-none text-foreground">Sol Mai</p>
          <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            Peluquería · Santa Fe
          </p>
        </div>
        <div className="w-12" />
      </div>
    </header>
  );
}

function StepShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby="booking-step-title">
      <h2 id="booking-step-title" className="font-serif text-3xl text-foreground lg:text-4xl">
        {title}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground lg:text-base">{subtitle}</p>
      <div className="mt-6 lg:mt-8">{children}</div>
    </section>
  );
}

function SelectedMark({ compact = false }: { compact?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex flex-none items-center justify-center rounded-full bg-champagne-deep text-primary-foreground",
        compact ? "h-5 w-5 text-[10px]" : "absolute right-4 top-4 h-6 w-6 text-[11px]",
      )}
    >
      ✓
    </span>
  );
}

function WizardNavigation({
  canNext,
  data,
  onBack,
  onNext,
  step,
}: {
  canNext: boolean;
  data: SummaryData;
  onBack: () => void;
  onNext: () => void;
  step: number;
}) {
  const isFinalStep = step === STEPS.length - 1;

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 px-4 py-3 backdrop-blur-md lg:hidden">
        <div className="mb-3">
          <SummaryPanel data={data} variant="bottom" />
        </div>
        <div className="flex gap-2">
          <NavBackButton onBack={onBack} step={step} />
          {!isFinalStep && <NavNextButton canNext={canNext} onNext={onNext} />}
        </div>
      </div>

      <div className="hidden lg:block">
        <div className="fixed inset-x-0 bottom-6 mx-auto max-w-6xl px-8">
          <div className="ml-auto flex max-w-[calc(100%-372px)] justify-end gap-2">
            <NavBackButton onBack={onBack} step={step} />
            {!isFinalStep && <NavNextButton canNext={canNext} onNext={onNext} />}
          </div>
        </div>
      </div>
    </>
  );
}

function NavBackButton({ onBack, step }: { onBack: () => void; step: number }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className="flex-1 rounded-full border border-border bg-card px-6 py-3.5 font-serif text-base text-foreground/80 shadow-sm transition-all hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:flex-none lg:px-8"
    >
      ← {step === 0 ? "Cerrar" : "Atrás"}
    </button>
  );
}

function NavNextButton({ canNext, onNext }: { canNext: boolean; onNext: () => void }) {
  return (
    <button
      type="button"
      onClick={onNext}
      disabled={!canNext}
      className="flex-[1.4] rounded-full bg-primary px-8 py-3.5 font-serif text-base text-primary-foreground shadow-[0_14px_30px_-14px_rgba(80,55,30,0.55)] transition-all hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:flex-none lg:px-10"
    >
      Continuar →
    </button>
  );
}

function FinalSummary({ data, personal }: { data: SummaryData; personal: Personalization }) {
  const cat = categories.find((currentCategory) => currentCategory.id === data.category);
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
            {data.extras.map((extra) => (
              <span key={extra.id} className="rounded-full bg-cream px-3 py-1 text-xs">
                {extra.name} · {extra.price}
              </span>
            ))}
          </div>
        </div>
      )}

      {fields.length > 0 && (
        <div className="mt-5 border-t border-border pt-5">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Tus preferencias
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {fields.map((field) => (
              <div key={field.id}>
                <p className="text-[11px] text-muted-foreground">{field.label}</p>
                <p className="text-sm text-foreground/90">{personal[field.id] ?? "—"}</p>
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
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md overflow-hidden rounded-[2rem] border border-border bg-card text-center shadow-[0_40px_80px_-40px_rgba(120,90,60,0.4)]">
        <div className="bg-gradient-to-b from-cream/80 to-card px-8 pb-6 pt-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-champagne-deep/30 bg-champagne text-2xl text-champagne-deep">
            ✓
          </div>
          <p className="mt-5 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            Reserva enviada
          </p>
          <h2 className="mt-2 font-serif text-4xl leading-tight text-foreground">¡Gracias!</h2>
          <div className="mx-auto mt-4 h-px w-10 bg-champagne-deep/40" />
        </div>

        <div className="space-y-5 px-8 pb-8 pt-6">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Recibimos tu interés de reserva.
          </p>
          <div className="rounded-2xl border border-border bg-cream/40 px-5 py-4 text-left">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Servicio
            </p>
            <p className="mt-1 font-serif text-lg text-foreground">
              {data.service?.name ?? "Tu servicio"}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border/70 pt-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Fecha
                </p>
                <p className="mt-0.5 font-serif text-base text-foreground">{data.date ?? "—"}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Hora
                </p>
                <p className="mt-0.5 font-serif text-base text-foreground">{data.time ?? "—"}</p>
              </div>
            </div>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            El salón confirmará tu turno por WhatsApp a la brevedad. Si necesitás reprogramar,
            también podés escribirnos por ahí.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-full bg-primary py-4 font-serif text-base text-primary-foreground shadow-[0_18px_40px_-18px_rgba(80,55,30,0.5)] transition-all hover:translate-y-[-1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    </div>
  );
}
