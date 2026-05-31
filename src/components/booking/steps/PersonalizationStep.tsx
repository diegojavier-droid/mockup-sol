import { personalizationFields, type CategoryId, type Personalization } from "@/lib/booking-data";
import { OptionPill } from "../cards/OptionPill";
import { StepShell } from "../wizard/StepShell";

export function PersonalizationStep({
  category,
  personal,
  onChooseOption,
}: {
  category: CategoryId;
  personal: Personalization;
  onChooseOption: (fieldId: string, option: string) => void;
}) {
  return (
    <StepShell
      title="Contanos un poco más"
      subtitle="Para preparar tu experiencia con todo el detalle."
    >
      <div className="space-y-5">
        <p className="rounded-2xl border border-champagne/40 bg-cream/60 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
          El tiempo y valor estimado se ajustan automáticamente según tu selección.
        </p>
        {personalizationFields[category].map((field) => (
          <fieldset key={field.id}>
            <legend className="mb-2 text-sm font-medium text-foreground">{field.label}</legend>
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
    </StepShell>
  );
}
