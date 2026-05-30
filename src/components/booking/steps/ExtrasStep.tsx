import { extras, type CategoryId, type Extra } from "@/lib/booking-data";
import { ExtraCard } from "../cards/ExtraCard";
import { StepShell } from "../wizard/StepShell";

export function ExtrasStep({
  category,
  chosenExtras,
  onToggleExtra,
}: {
  category: CategoryId;
  chosenExtras: Extra[];
  onToggleExtra: (extra: Extra) => void;
}) {
  return (
    <StepShell title="¿Sumamos algún extra?" subtitle="Opcional. Podés saltear este paso.">
      <div className="grid gap-3 sm:grid-cols-2">
        {extras[category].map((extra) => (
          <ExtraCard
            key={extra.id}
            extra={extra}
            selected={chosenExtras.some((chosenExtra) => chosenExtra.id === extra.id)}
            onToggle={() => onToggleExtra(extra)}
          />
        ))}
      </div>
    </StepShell>
  );
}
