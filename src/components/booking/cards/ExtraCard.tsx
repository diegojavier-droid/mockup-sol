import type { Extra } from "@/lib/booking-data";
import { cn } from "@/lib/utils";
import { selectableCardClass } from "../booking-styles";

export function ExtraCard({
  extra,
  selected,
  onToggle,
}: {
  extra: Extra;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      className={cn(
        "flex items-center justify-between gap-3 rounded-2xl border p-4 text-left",
        selectableCardClass,
        selected ? "border-champagne-deep bg-card" : "border-border bg-card hover:border-champagne",
      )}
    >
      <div>
        <p className="font-serif text-base text-foreground">{extra.name}</p>
        <p className="text-xs text-muted-foreground">+{extra.price}</p>
      </div>
      <span
        className={cn(
          "inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs",
          selected
            ? "border-champagne-deep bg-champagne-deep text-primary-foreground"
            : "border-border text-muted-foreground",
        )}
      >
        {selected ? "✓" : "+"}
      </span>
    </button>
  );
}
