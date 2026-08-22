import type { ReactNode } from "react";
import type { CategoryId, Service } from "@/lib/booking-data";
import { cn } from "@/lib/utils";
import { getServiceImage } from "@/lib/service-images";
import { selectableCardClass } from "../booking-styles";
import { SelectedMark } from "../cards/SelectedMark";
import { formatServicePrice } from "@/lib/price-display";
import { useCatalog } from "@/lib/catalog-context";

export function BookingServiceCard({
  service,
  categoryId,
  selected = false,
  variant,
  onClick,
  actionLabel = "Reservar",
  showAction,
  className,
}: {
  service: Service;
  categoryId?: CategoryId | null;
  selected?: boolean;
  variant: "public" | "wizard";
  onClick: () => void;
  actionLabel?: string;
  showAction?: boolean;
  className?: string;
}) {
  const { priceDisplayModes } = useCatalog();
  const imageSrc = getServiceImage(service.id, categoryId, service.imageUrl);
  const shouldShowAction = showAction ?? false;

  if (variant === "public") {
    const content = (
      <>
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-cream">
          <img
            src={imageSrc}
            alt={service.name}
            loading="lazy"
            width={1280}
            height={736}
            className="h-full w-full object-cover transition-transform duration-[600ms] ease-out group-hover:scale-[1.04] group-active:scale-[1.02]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/10 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        </div>
        <div className="flex flex-1 flex-col gap-2 p-3.5 sm:p-4">
          <h3 className="font-serif text-lg leading-tight text-foreground sm:text-xl">
            {service.name}
          </h3>
          <p className="font-serif text-base leading-none text-foreground/85">
            {formatServicePrice(service.price, priceDisplayModes[service.id])}
          </p>
        </div>
      </>
    );

    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={`${actionLabel}: ${service.name}`}
        className={cn(
          "group flex h-full w-full flex-col overflow-hidden rounded-[1.35rem] border border-border bg-card text-left shadow-[0_18px_38px_-34px_rgba(120,90,60,0.35)] transition-all duration-300",
          "hover:-translate-y-0.5 hover:border-champagne hover:shadow-[0_28px_50px_-32px_rgba(120,90,60,0.5)]",
          "active:translate-y-0 active:scale-[0.995] active:shadow-[0_14px_28px_-22px_rgba(120,90,60,0.45)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          selected && "border-champagne-deep ring-1 ring-champagne-deep/30",
          className,
        )}
      >
        {content}
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-pressed={selected}
      data-service-id={service.id}
      onClick={onClick}
      className={cn(
        "group flex gap-3 rounded-2xl border p-3 text-left duration-200 sm:p-3.5",
        selectableCardClass,
        selected
          ? "border-champagne-deep bg-card shadow-[0_18px_36px_-26px_rgba(120,90,60,0.35)]"
          : "border-border bg-card hover:border-champagne",
        className,
      )}
    >
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-cream sm:h-24 sm:w-24">
        <img
          src={imageSrc}
          alt={service.name}
          loading="lazy"
          width={1280}
          height={736}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-serif text-lg leading-snug text-foreground">{service.name}</h4>
            </div>
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {service.desc}
            </p>
          </div>
          {selected ? <SelectedMark compact /> : null}
        </div>
        <ServiceMeta service={service} className="mt-2 text-xs">
          {shouldShowAction ? (
            <span className="ml-auto rounded-full bg-primary px-3 py-1.5 font-serif text-sm text-primary-foreground">
              {actionLabel}
            </span>
          ) : null}
        </ServiceMeta>
      </div>
    </button>
  );
}

function ServiceMeta({
  service,
  className,
  children,
}: {
  service: Service;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn("flex items-center gap-2 text-muted-foreground", className)}>
      <span>{service.duration}</span>
      <span className="h-1 w-1 rounded-full bg-champagne/70" />
      <span className="font-serif text-base text-foreground">{service.price}</span>
      {children}
    </div>
  );
}
