import type { MockDate } from "@/lib/booking-data";
import { cn } from "@/lib/utils";
import { selectableCardClass } from "../booking-styles";

export function DateCard({
  date,
  selected,
  onSelect,
}: {
  date: MockDate;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "rounded-2xl border p-4 text-center",
        selectableCardClass,
        selected ? "border-champagne-deep bg-card" : "border-border bg-card hover:border-champagne",
      )}
    >
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{date.weekday}</p>
      <p className="mt-1 font-serif text-2xl text-foreground">{date.day}</p>
      <p className="text-xs text-muted-foreground">{date.label}</p>
    </button>
  );
}
