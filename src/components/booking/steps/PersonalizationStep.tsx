import {isSiteTest} from "@deployment/booking-policy";
import { type CategoryId, type Personalization } from "@/lib/booking-data";
import type { PersonalizationField } from "@/lib/booking-types";
import { cn } from "@/lib/utils";
import { selectableCardClass } from "../booking-styles";
import { StepShell } from "../wizard/StepShell";
import { useCatalog } from "@/lib/catalog-context";

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
  allergies: "Para conversar al llegar",
  history: "Cuidados",
};

const currentSectionTitleByCategory: Partial<Record<CategoryId, string>> = {
  peluqueria: "Tu pelo hoy",
  unas: "Tus uñas hoy",
};

const personalizationStepTitleByCategory: Record<CategoryId, string> = {
  peluqueria: "Conozcamos tu pelo",
  maquillaje: "Preparemos tu maquillaje",
  unas: "Preparemos tus uñas",
  depilacion: "Preparemos tu depilación",
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
        {field.id === "alergias" ? "Alergias" : visibleFieldLabels[field.id] ?? field.label}
      </legend>
      {isSiteTest && field.id === "alergias" && <p className="mb-3 text-sm text-muted-foreground">Elegí un escenario de la clienta de ejemplo para conversar al llegar, antes del servicio.</p>}
      <div className="flex flex-wrap gap-1.5">
        {field.options.map((option) => (
          <Chip
            key={option}
            option={option}
            selected={personal[field.id] === option}
            onSelect={() => onChooseOption(field.id, field.id === "alergias" && personal[field.id] === option ? "" : option)}
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
  const { personalizationFields } = useCatalog();
  const buckets = bucketFields(personalizationFields[category]);

  const sections = (
    [
      { key: "goal", title: sectionTitles.goal, fields: buckets.goal },
      {
        key: "current",
        title: currentSectionTitleByCategory[category] ?? sectionTitles.current,
        fields: buckets.current,
      },
      { key: "allergies", title: sectionTitles.allergies, fields: buckets.allergies },
      { key: "history", title: sectionTitles.history, fields: buckets.history },
    ] as const
  ).filter((section) => section.fields.length > 0);

  return (
    <StepShell title={personalizationStepTitleByCategory[category]}>
      <p className="-mt-1 text-sm text-muted-foreground">
        Elegí las opciones del servicio.
      </p>

      <div className="mt-5 divide-y divide-border/40">
        {sections.map((section, index) => (
          <section key={section.key} className={cn("space-y-4", index === 0 ? "pb-5" : "py-5")}>
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

        <section className="space-y-3 py-5">
          <label htmlFor="comments-for-sol" className="block font-serif text-sm">Comentario para Sol (opcional)</label>
          <textarea id="comments-for-sol" value={additionalComments} maxLength={ADDITIONAL_COMMENTS_MAX_LENGTH}
            onChange={event => onChangeAdditionalComments(event.target.value)} rows={3}
            aria-describedby="comments-for-sol-help"
            className="w-full rounded-2xl border border-border bg-card p-3 text-sm"
          />
          <p id="comments-for-sol-help" className="text-xs text-muted-foreground">{isSiteTest ? "Para conversar con Sol o el equipo antes del servicio. Usá sólo datos ficticios de la clienta de ejemplo, no información personal real." : "Detalles, referencias o algo a tener en cuenta."}</p>
          <p className="text-xs text-muted-foreground">{additionalComments.length}/{ADDITIONAL_COMMENTS_MAX_LENGTH}</p>
        </section>

      </div>
    </StepShell>
  );
}
