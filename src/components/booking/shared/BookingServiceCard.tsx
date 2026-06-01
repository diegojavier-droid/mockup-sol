import type { ReactNode } from "react";
import type { CategoryId, Service } from "@/lib/booking-data";
import { cn } from "@/lib/utils";
import { getServiceImage } from "@/lib/service-images";
import { selectableCardClass, tagStyle } from "../booking-styles";
import { SelectedMark } from "../cards/SelectedMark";

export function BookingServiceCard({
  service,
  categoryId,
  selected = false,
  variant,
  onClick,
  actionLabel = "Reservar",
  showAction = true,
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
  const imageSrc = getServiceImage(service.id, categoryId, service.imageUrl);

  if (variant === "public") {
    return (
      <article
        className={cn(
          "flex h-full flex-col overflow-hidden rounded-[1.35rem] border border-border bg-card shadow-[0_18px_38px_-34px_rgba(120,90,60,0.35)] transition-all hover:border-champagne hover:shadow-[0_24px_44px_-36px_rgba(120,90,60,0.45)]",
          selected && "border-champagne-deep ring-1 ring-champagne-deep/30",
          className,
        )}
      >
        <div className="aspect-[16/10] w-full overflow-hidden bg-cream">
          <img
            src={imageSrc}
            alt={service.name}
            loading="lazy"
            width={1280}
            height={736}
            className="h-full w-full object-cover transition-transform duration-500 hover:scale-[1.03]"
          />
        </div>
        <div className="flex flex-1 flex-col p-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-serif text-xl leading-tight text-foreground">{service.name}</h3>
            <ServiceTag service={service} publicVariant />
          </div>

          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {service.desc}
          </p>

          <ServiceMeta service={service} className="mt-3 text-sm" />

          {showAction ? (
            <button
              type="button"
              onClick={onClick}
              className="mt-4 rounded-full bg-primary px-5 py-2.5 font-serif text-base text-primary-foreground transition-all hover:translate-y-[-1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
              aria-label={`${actionLabel} ${service.name}`}
            >
              {actionLabel}
            </button>
          ) : null}
        </div>
      </article>
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
              <ServiceTag service={service} />
            </div>
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {service.desc}
            </p>
          </div>
          {selected ? <SelectedMark compact /> : null}
        </div>
        <ServiceMeta service={service} className="mt-2 text-xs">
          {showAction ? (
            <span className="ml-auto rounded-full bg-primary px-3 py-1.5 font-serif text-sm text-primary-foreground">
              {actionLabel}
            </span>
          ) : null}
        </ServiceMeta>
      </div>
    </button>
  );
}

function ServiceTag({
  service,
  publicVariant = false,
}: {
  service: Service;
  publicVariant?: boolean;
}) {
  if (service.tag !== "popular") {
    return null;
  }

  if (publicVariant) {
    return (
      <span className="shrink-0 rounded-full border border-champagne/50 bg-cream px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] text-champagne-deep">
        Popular
      </span>
    );
  }

  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.12em]",
        tagStyle.popular,
      )}
    >
      Popular
    </span>
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
