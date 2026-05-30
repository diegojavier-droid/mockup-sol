import { cn } from "@/lib/utils";
import { selectableCardClass } from "../booking-styles";

export function TimeSlotButton({
  time,
  disabled,
  selected,
  onSelect,
}: {
  time: string;
  disabled: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "rounded-xl border py-3 font-serif text-base disabled:cursor-not-allowed disabled:opacity-40",
        selectableCardClass,
        selected
          ? "border-champagne-deep bg-champagne text-accent-foreground"
          : "border-border bg-card hover:border-champagne",
      )}
    >
      {time}
    </button>
  );
}
