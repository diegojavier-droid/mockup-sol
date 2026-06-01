import { useState } from "react";

import { personalizationFields, type CategoryId, type Personalization } from "@/lib/booking-data";
import type { PersonalizationField } from "@/lib/booking-types";
import { cn } from "@/lib/utils";
import { selectableCardClass } from "../booking-styles";
import { OptionPill } from "../cards/OptionPill";
import { StepShell } from "../wizard/StepShell";

const ADDITIONAL_COMMENTS_MAX_LENGTH = 500;

type Intent = "goal" | "current" | "allergies" | "history";

const fieldIntent: Record<string, Intent> = {
  // goals / aspirational
  objetivo: "goal",
  estilo: "goal",
  evento: "goal",
  horario: "goal",
  terminacion: "goal",
  // current state
  largo: "current",
  densidad: "current",
  tipo: "current",
  estado: "current",
  // allergies (always visible)
  alergias: "allergies",
  // history & care (collapsed)
  quimicos: "history",
  prueba: "history",
};

const visibleFieldLabels: Record<string, string> = {
  quimicos: "Tratamientos previos",
  objetivo: "¿Qué buscás lograr?",
  estilo: "¿Qué estilo te imaginás?",
  evento: "¿Para qué evento es?",
  horario: "Horario del evento",
  terminacion: "Terminación favorita",
  largo: "Largo",
  densidad: "Densidad",
  tipo: "Tipo",
  estado: "Estado actual",
  alergias: "¿Tenés alergias?",
  prueba: "¿Querés prueba previa?",
};

const currentSectionTitleByCategory: Record<CategoryId, string> = {
  peluqueria: "Tu cabello hoy",
  maquillaje: "Sobre vos hoy",
  unas: "Tus uñas hoy",
};

const personalizationStepTitleByCategory: Record<CategoryId, string> = {
  peluqueria: "Conozcamos tu cabello",
  maquillaje: "Preparemos tu maquillaje",
  unas: "Preparemos tus uñas",
};

function bucketFields(fields: PersonalizationField[]) {
  const buckets: Record<Intent, PersonalizationField[]> = {
    goal: [],
    current: [],
    allergies: [],
    history: [],
  };
  for (const field of fields) {
    const intent = fieldIntent[field.id] ?? "current";
    buckets[intent].push(field);
  }
  return buckets;
}

function CompactPill({
  option,
  selected,
  onSelect,
}: {
  option: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "min-h-9 rounded-full border px-3 py-1.5 text-[13px]",
        selectableCardClass,
        selected
          ? "border-champagne-deep bg-champagne text-accent-foreground"
          : "border-border/70 bg-transparent text-foreground/75 hover:border-champagne",
      )}
    >
      {option}
    </button>
  );
}

function FieldRow({
  field,
  personal,
  onChooseOption,
  compact = false,
  emphasis = false,
}: {
  field: PersonalizationField;
  personal: Personalization;
  onChooseOption: (fieldId: string, option: string) => void;
  compact?: boolean;
  emphasis?: boolean;
}) {
  const Pill = compact ? CompactPill : OptionPill;
  return (
    <fieldset>
      <legend
        className={cn(
          "mb-2 text-foreground",
          emphasis ? "text-[15px] font-medium" : "text-sm",
          compact && "text-xs font-medium uppercase tracking-wide text-muted-foreground",
        )}
      >
        {visibleFieldLabels[field.id] ?? field.label}
      </legend>
      <div className={cn("flex flex-wrap", compact ? "gap-1.5" : "gap-2")}>
        {field.options.map((option) => (
          <Pill
            key={option}
            option={option}
            selected={personal[field.id] === option}
            onSelect={() => onChooseOption(field.id, option)}
          />
        ))}
      </div>
    </fieldset>
  );
}

export function PersonalizationStep({
  additionalComments,
  category,
  personal,
  onChangeAdditionalComments,
  onChooseOption,
}: {
  additionalComments: string;
  category: CategoryId;
  personal: Personalization;
  onChangeAdditionalComments: (value: string) => void;
  onChooseOption: (fieldId: string, option: string) => void;
}) {
  const buckets = bucketFields(personalizationFields[category]);
  const [noteOpen, setNoteOpen] = useState(additionalComments.trim().length > 0);

  return (
    <StepShell title={personalizationStepTitleByCategory[category]}>
      <p className="-mt-1 text-sm text-muted-foreground">
        Cuanto más nos contás, mejor preparamos tu visita.
      </p>

      <div className="mt-4 overflow-hidden rounded-3xl border border-border bg-card/70 shadow-[0_18px_36px_-34px_rgba(120,90,60,0.35)]">
        {/* 1. Lo que buscás — protagonista */}
        {buckets.goal.length > 0 && (
          <section className="px-5 py-5 lg:px-6 lg:py-6">
            <h3 className="font-serif text-xl text-foreground lg:text-2xl">Lo que buscás</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Lo más importante para que Sol Mai piense tu visita.
            </p>
            <div className="mt-4 space-y-4">
              {buckets.goal.map((field) => (
                <FieldRow
                  key={field.id}
                  field={field}
                  personal={personal}
                  onChooseOption={onChooseOption}
                  emphasis
                />
              ))}
            </div>
          </section>
        )}

        {/* 2. Tu cabello hoy — compacto */}
        {buckets.current.length > 0 && (
          <section className="border-t border-border/60 px-5 py-4 lg:px-6 lg:py-5">
            <h3 className="text-sm font-medium text-foreground">
              {currentSectionTitleByCategory[category]}
            </h3>
            <div className="mt-3 space-y-3">
              {buckets.current.map((field) => (
                <FieldRow
                  key={field.id}
                  field={field}
                  personal={personal}
                  onChooseOption={onChooseOption}
                  compact
                />
              ))}
            </div>
          </section>
        )}

        {/* 3. Alergias — visible */}
        {buckets.allergies.length > 0 && (
          <section className="border-t border-border/60 px-5 py-4 lg:px-6 lg:py-5">
            {buckets.allergies.map((field) => (
              <FieldRow
                key={field.id}
                field={field}
                personal={personal}
                onChooseOption={onChooseOption}
              />
            ))}
          </section>
        )}

        {/* 4. Cuidados y antecedentes — colapsado */}
        {buckets.history.length > 0 && (
          <details className="group border-t border-border/60">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-sm text-foreground lg:px-6">
              <span className="flex flex-col">
                <span className="font-medium">Cuidados y antecedentes</span>
                <span className="text-xs text-muted-foreground">
                  Opcional. Nos ayuda a cuidarte mejor.
                </span>
              </span>
              <span
                aria-hidden
                className="text-muted-foreground transition-transform group-open:rotate-180"
              >
                ▾
              </span>
            </summary>
            <div className="space-y-3 px-5 pb-5 lg:px-6 lg:pb-6">
              {buckets.history.map((field) => (
                <FieldRow
                  key={field.id}
                  field={field}
                  personal={personal}
                  onChooseOption={onChooseOption}
                />
              ))}
            </div>
          </details>
        )}

        {/* 5. Nota — disclosure */}
        <div className="border-t border-border/60 px-5 py-4 lg:px-6 lg:py-5">
          {noteOpen ? (
            <label className="block">
              <span className="text-sm font-medium text-foreground">Nota para Sol Mai</span>
              <textarea
                autoFocus={additionalComments.length === 0}
                className="mt-2 min-h-20 w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-base text-foreground shadow-sm transition-colors placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
                maxLength={ADDITIONAL_COMMENTS_MAX_LENGTH}
                onChange={(event) => onChangeAdditionalComments(event.target.value)}
                placeholder="Detalles, referencias o algo a tener en cuenta."
                value={additionalComments}
              />
              <span className="mt-1.5 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <button
                  type="button"
                  className="text-muted-foreground underline-offset-2 hover:underline"
                  onClick={() => {
                    onChangeAdditionalComments("");
                    setNoteOpen(false);
                  }}
                >
                  Quitar nota
                </button>
                <span>
                  {additionalComments.length}/{ADDITIONAL_COMMENTS_MAX_LENGTH}
                </span>
              </span>
            </label>
          ) : (
            <button
              type="button"
              onClick={() => setNoteOpen(true)}
              className="text-sm text-foreground/80 underline-offset-4 hover:text-foreground hover:underline"
            >
              + Agregar una nota para Sol Mai
            </button>
          )}
        </div>
      </div>
    </StepShell>
  );
}
