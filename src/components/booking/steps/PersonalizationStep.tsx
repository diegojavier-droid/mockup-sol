import { useState } from "react";

import { personalizationFields, type CategoryId, type Personalization } from "@/lib/booking-data";
import type { PersonalizationField } from "@/lib/booking-types";
import { cn } from "@/lib/utils";
import { selectableCardClass } from "../booking-styles";
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
  // allergies
  alergias: "allergies",
  // history & care
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

const sectionTitles: Record<Intent, string> = {
  goal: "Lo que buscás",
  current: "Cómo estás hoy",
  allergies: "Salud",
  history: "Cuidados",
};

const currentSectionTitleByCategory: Partial<Record<CategoryId, string>> = {
  peluqueria: "Tu cabello hoy",
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

function Chip({
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
        "min-h-10 rounded-full border px-3.5 py-1.5 text-[13px] leading-none",
        selectableCardClass,
        selected
          ? "border-champagne-deep bg-champagne text-accent-foreground"
          : "border-border/70 bg-transparent text-foreground/80 hover:border-champagne",
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
}: {
  field: PersonalizationField;
  personal: Personalization;
  onChooseOption: (fieldId: string, option: string) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm text-foreground/85">
        {visibleFieldLabels[field.id] ?? field.label}
      </legend>
      <div className="flex flex-wrap gap-1.5">
        {field.options.map((option) => (
          <Chip
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

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-3 font-serif text-[13px] tracking-[0.04em] text-foreground/70">{children}</h3>
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

  const sections: { key: Intent; title: string; fields: PersonalizationField[] }[] = [
    { key: "goal", title: sectionTitles.goal, fields: buckets.goal },
    {
      key: "current",
      title: currentSectionTitleByCategory[category] ?? sectionTitles.current,
      fields: buckets.current,
    },
    { key: "allergies", title: sectionTitles.allergies, fields: buckets.allergies },
    { key: "history", title: sectionTitles.history, fields: buckets.history },
  ].filter((section) => section.fields.length > 0);

  return (
    <StepShell title={personalizationStepTitleByCategory[category]}>
      <p className="-mt-1 text-sm text-muted-foreground">
        Cuanto más nos contás, mejor preparamos tu visita.
      </p>

      <div className="mt-5 divide-y divide-border/40">
        {sections.map((section, index) => (
          <section
            key={section.key}
            className={cn("space-y-4", index === 0 ? "pb-5" : "py-5")}
          >
            <SectionEyebrow>{section.title}</SectionEyebrow>
            <div className="space-y-4">
              {section.fields.map((field) => (
                <FieldRow
                  key={field.id}
                  field={field}
                  personal={personal}
                  onChooseOption={onChooseOption}
                />
              ))}
            </div>
          </section>
        ))}

        {/* Nota — disclosure */}
        <div className="pt-5">
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
