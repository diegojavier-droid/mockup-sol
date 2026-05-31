import { personalizationFields, type CategoryId, type Personalization } from "@/lib/booking-data";
import type { PersonalizationField } from "@/lib/booking-types";
import { OptionPill } from "../cards/OptionPill";
import { StepShell } from "../wizard/StepShell";

const ADDITIONAL_COMMENTS_MAX_LENGTH = 500;

const fieldGroupIds = {
  hair: ["largo", "densidad", "tipo", "estado", "terminacion", "evento", "horario"],
  history: ["quimicos", "alergias", "retiro", "prueba"],
  goal: ["objetivo", "estilo", "nailart"],
};

type FieldGroup = keyof typeof fieldGroupIds;

const personalizationStepCopyByCategory = {
  peluqueria: {
    title: "Conozcamos tu cabello",
    primaryGroupTitle: "Tu cabello",
  },
  maquillaje: {
    title: "Preparemos tu maquillaje",
    primaryGroupTitle: "Tu evento",
  },
  unas: {
    title: "Preparemos tus uñas",
    primaryGroupTitle: "Tus uñas",
  },
} satisfies Record<CategoryId, { title: string; primaryGroupTitle: string }>;

const secondaryGroupTitles = {
  history: "Historial y cuidados",
  goal: "Lo que buscás",
} satisfies Record<Exclude<FieldGroup, "hair">, string>;

const visibleFieldLabels: Record<string, string> = {
  quimicos: "Tratamientos o procesos recientes",
};

function groupPersonalizationFields(fields: PersonalizationField[]) {
  const remainingFields = [...fields];

  return (Object.keys(fieldGroupIds) as FieldGroup[])
    .map((group) => {
      const groupedFields = fieldGroupIds[group]
        .map((fieldId) => remainingFields.find((field) => field.id === fieldId))
        .filter(Boolean) as PersonalizationField[];

      for (const field of groupedFields) {
        const fieldIndex = remainingFields.findIndex(
          (remainingField) => remainingField.id === field.id,
        );
        if (fieldIndex >= 0) remainingFields.splice(fieldIndex, 1);
      }

      return { group, fields: groupedFields };
    })
    .filter(({ fields }) => fields.length > 0)
    .concat(
      remainingFields.length > 0 ? [{ group: "goal" as FieldGroup, fields: remainingFields }] : [],
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
  const groupedFields = groupPersonalizationFields(personalizationFields[category]);
  const stepCopy = personalizationStepCopyByCategory[category];

  return (
    <StepShell title={stepCopy.title}>
      <div className="space-y-4 lg:space-y-5">
        {groupedFields.map(({ group, fields }) => (
          <section
            key={group}
            className="rounded-3xl border border-border bg-card/70 p-4 shadow-[0_18px_36px_-34px_rgba(120,90,60,0.35)] lg:p-5"
          >
            <h3 className="font-serif text-lg text-foreground lg:text-xl">
              {group === "hair" ? stepCopy.primaryGroupTitle : secondaryGroupTitles[group]}
            </h3>
            <div className="mt-3 space-y-3 lg:mt-4 lg:space-y-4">
              {fields.map((field) => (
                <fieldset key={field.id}>
                  <legend className="mb-2 text-sm font-medium text-foreground">
                    {visibleFieldLabels[field.id] ?? field.label}
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {field.options.map((option) => (
                      <OptionPill
                        key={option}
                        option={option}
                        selected={personal[field.id] === option}
                        onSelect={() => onChooseOption(field.id, option)}
                      />
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
          </section>
        ))}

      </div>
    </StepShell>
  );
}
