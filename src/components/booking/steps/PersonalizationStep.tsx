import {
  personalizationFields,
  type CategoryId,
  type Personalization,
  type Service,
} from "@/lib/booking-data";
import { getPersonalizationImpactLabel } from "@/lib/booking-rules";
import { OptionPill } from "../cards/OptionPill";
import { StepShell } from "../wizard/StepShell";

export function PersonalizationStep({
  category,
  personal,
  service,
  onChooseOption,
}: {
  category: CategoryId;
  personal: Personalization;
  service: Service | null;
  onChooseOption: (fieldId: string, option: string) => void;
}) {
  return (
    <StepShell
      title="Contanos un poco más"
      subtitle="Para preparar tu experiencia con todo el detalle."
    >
      <div className="space-y-5">
        {personalizationFields[category].map((field) => (
          <fieldset key={field.id}>
            <legend className="mb-2 text-sm font-medium text-foreground">{field.label}</legend>
            <div className="flex flex-wrap gap-2">
              {field.options.map((option) => (
                <OptionPill
                  key={option}
                  option={option}
                  impact={getPersonalizationImpactLabel({
                    category,
                    service,
                    fieldId: field.id,
                    option,
                  })}
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
