import { cn } from "@/lib/utils";
import { selectableCardClass } from "../booking-styles";

export function OptionPill({
  option,
  impact,
  selected,
  onSelect,
}: {
  option: string;
  impact?: string | null;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "min-h-11 rounded-full border px-4 py-2 text-sm",
        selectableCardClass,
        selected
          ? "border-champagne-deep bg-champagne text-accent-foreground"
          : "border-border bg-card text-foreground/80 hover:border-champagne",
      )}
    >
      <span>{option}</span>
      {impact ? <span className="ml-1.5 text-xs opacity-70">{impact}</span> : null}
    </button>
  );
}
