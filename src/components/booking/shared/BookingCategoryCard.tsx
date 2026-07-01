import type { Category, CategoryId } from "@/lib/booking-data";
import { cn } from "@/lib/utils";
import peluImg from "@/assets/sol-mai-peluqueria.jpg";
import makeImg from "@/assets/sol-mai-maquillaje.jpg";
import nailsImg from "@/assets/sol-mai-unas.jpg";
import { selectableCardClass } from "../booking-styles";
import { SelectedMark } from "../cards/SelectedMark";

const categoryImages: Record<CategoryId, string> = {
  peluqueria: peluImg,
  maquillaje: makeImg,
  unas: nailsImg,
};

const publicCategoryLabels: Record<CategoryId, string> = {
  peluqueria: "Peluquería",
  maquillaje: "Maquillaje",
  unas: "Uñas",
};

const publicCategoryDescriptions: Record<CategoryId, string> = {
  peluqueria: "Cortes, color, peinados y tratamientos pensados para cuidar tu pelo.",
  maquillaje: "Looks sociales, de evento y producción para sentirte cómoda y luminosa.",
  unas: "Uñas cuidadas: manicura, semipermanente, soft gel y detalles de nail art con terminación prolija.",
};

export function BookingCategoryCard({
  category,
  selected = false,
  variant,
  onClick,
  className,
}: {
  category: Category;
  selected?: boolean;
  variant: "public" | "wizard";
  onClick: () => void;
  className?: string;
}) {
  const isPublic = variant === "public";
  const title = isPublic ? publicCategoryLabels[category.id] : category.name;
  const description = isPublic ? publicCategoryDescriptions[category.id] : category.tagline;
  const image = categoryImages[category.id];

  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={isPublic ? `Abrir ${title}` : undefined}
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-3xl border bg-card text-left",
        selectableCardClass,
        isPublic
          ? "cursor-pointer border-border transition-all hover:-translate-y-0.5 hover:border-champagne hover:shadow-[0_30px_50px_-35px_rgba(120,90,60,0.35)]"
          : selected
            ? "border-champagne-deep duration-300 shadow-[0_25px_45px_-25px_rgba(120,90,60,0.4)] ring-1 ring-champagne-deep/30"
            : "border-border duration-300 hover:-translate-y-0.5 hover:border-champagne hover:shadow-[0_25px_45px_-30px_rgba(120,90,60,0.3)]",
        className,
      )}
    >
      <div className="relative overflow-hidden">
        <img
          src={image}
          alt={title}
          loading="lazy"
          width={800}
          height={800}
          className={cn(
            "w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]",
            isPublic ? "h-24 sm:h-32 lg:h-28" : "h-28 sm:h-32",
          )}
        />
        {!isPublic ? (
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-card/30 via-transparent to-transparent" />
        ) : null}
      </div>
      <div className={isPublic ? "flex flex-col p-3.5 sm:p-4" : "p-4"}>
        <h3 className="font-serif text-xl leading-tight text-foreground">{title}</h3>
        <p
          className={cn(
            "line-clamp-2 text-xs text-muted-foreground",
            isPublic ? "mt-1.5 leading-snug" : "mt-1 leading-snug",
          )}
        >
          {description}
        </p>
      </div>
      {!isPublic && selected ? <SelectedMark /> : null}
    </button>
  );
}
