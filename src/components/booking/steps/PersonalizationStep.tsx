import { personalizationFields, type CategoryId, type Personalization } from "@/lib/booking-data";
import type { PersonalizationField } from "@/lib/booking-types";
import { OptionPill } from "../cards/OptionPill";
import { StepShell } from "../wizard/StepShell";

const fieldGroupIds = {
  hair: ["largo", "densidad", "tipo", "estado", "terminacion", "evento", "horario"],
  history: ["quimicos", "alergias", "retiro", "prueba"],
  goal: ["objetivo", "estilo", "nailart"],
};

const groupTitles = {
  hair: "Tu cabello",
  history: "Historial reciente",
  goal: "Qué querés lograr",
};

type FieldGroup = keyof typeof fieldGroupIds;

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
  category,
  personal,
  onChooseOption,
}: {
  category: CategoryId;
  personal: Personalization;
  onChooseOption: (fieldId: string, option: string) => void;
}) {
  const groupedFields = groupPersonalizationFields(personalizationFields[category]);

  return (
    <StepShell
      title="Contanos un poco más"
      subtitle="Para preparar tu experiencia con todo el detalle."
    >
      <div className="space-y-5">
        <p className="rounded-2xl border border-champagne/40 bg-cream/60 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
          El tiempo y valor estimado se ajustan automáticamente según tu selección.
        </p>
        {groupedFields.map(({ group, fields }) => (
          <section
            key={group}
            className="rounded-3xl border border-border bg-card/70 p-4 shadow-[0_18px_36px_-34px_rgba(120,90,60,0.35)]"
          >
            <h3 className="font-serif text-xl text-foreground">{groupTitles[group]}</h3>
            <div className="mt-4 space-y-4">
              {fields.map((field) => (
                <fieldset key={field.id}>
                  <legend className="mb-2 text-sm font-medium text-foreground">
                    {field.label}
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
