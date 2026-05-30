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
      onClick={onSelect}
      className={cn(
        "group flex gap-4 rounded-2xl border p-4 text-left duration-200",
        selectableCardClass,
        selected
          ? "border-champagne-deep bg-card shadow-[0_18px_36px_-26px_rgba(120,90,60,0.35)]"
          : "border-border bg-card hover:border-champagne",
      )}
    >
      <div className="flex h-16 w-16 flex-none items-center justify-center rounded-xl bg-gradient-to-br from-cream via-ivory to-blonde/50 font-serif text-xl text-champagne-deep">
        {service.name.charAt(0)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-serif text-lg leading-snug text-foreground">{service.name}</h4>
          {selected && <SelectedMark compact />}
        </div>
        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{service.desc}</p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
          {service.tag && (
            <span className={cn("rounded-full px-2 py-0.5 capitalize", tagStyle[service.tag])}>
              {service.tag}
            </span>
          )}
          <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
            {service.duration}
          </span>
          <span className="ml-auto font-serif text-base text-foreground">{service.price}</span>
        </div>
      </div>
    </button>
  );
}
