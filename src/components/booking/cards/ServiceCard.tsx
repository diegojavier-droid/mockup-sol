import type { Service } from "@/lib/booking-data";
import { cn } from "@/lib/utils";
import { selectableCardClass, tagStyle } from "../booking-styles";
import { SelectedMark } from "./SelectedMark";

export function ServiceCard({
  service,
  selected,
  onSelect,
}: {
  service: Service;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      data-service-id={service.id}
      onClick={onSelect}
      className={cn(
        "group rounded-2xl border p-3 text-left duration-200 sm:p-4",
        selectableCardClass,
        selected
          ? "border-champagne-deep bg-card shadow-[0_18px_36px_-26px_rgba(120,90,60,0.35)]"
          : "border-border bg-card hover:border-champagne",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-serif text-lg leading-snug text-foreground">{service.name}</h4>
            {service.tag === "popular" && (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.12em]",
                  tagStyle.popular,
                )}
              >
                Popular
              </span>
            )}
          </div>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {service.desc}
          </p>
        </div>
        {selected && <SelectedMark compact />}
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <span>{service.duration}</span>
        <span className="h-1 w-1 rounded-full bg-champagne/70" />
        <span className="font-serif text-base text-foreground">{service.price}</span>
        <span className="ml-auto rounded-full bg-primary px-3 py-1.5 font-serif text-sm text-primary-foreground">
          Reservar
        </span>
      </div>
    </button>
  );
}
