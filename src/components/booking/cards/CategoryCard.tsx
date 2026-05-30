import type { Category } from "@/lib/booking-data";
import { cn } from "@/lib/utils";
import { selectableCardClass } from "../booking-styles";
import { SelectedMark } from "./SelectedMark";

export function CategoryCard({
  category,
  image,
  selected,
  onSelect,
}: {
  category: Category;
  image: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "group relative overflow-hidden rounded-3xl border bg-card text-left duration-300",
        selectableCardClass,
        selected
          ? "border-champagne-deep shadow-[0_25px_45px_-25px_rgba(120,90,60,0.4)] ring-1 ring-champagne-deep/30"
          : "border-border hover:-translate-y-0.5 hover:border-champagne hover:shadow-[0_25px_45px_-30px_rgba(120,90,60,0.3)]",
      )}
    >
      <div className="relative overflow-hidden">
        <img
          src={image}
          alt={category.name}
          loading="lazy"
          width={800}
          height={800}
          className="h-40 w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-card/30 via-transparent to-transparent" />
      </div>
      <div className="p-5">
        <h3 className="font-serif text-2xl text-foreground">{category.name}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{category.tagline}</p>
      </div>
      {selected && <SelectedMark />}
    </button>
  );
}
