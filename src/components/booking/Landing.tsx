import { useEffect, useState } from "react";
import { categories, services, type CategoryId, type Service } from "@/lib/booking-data";
import type { StartBookingInput } from "./booking-navigation-types";
import { BookingCategoryCard } from "./shared/BookingCategoryCard";
import { BookingServiceCard } from "./shared/BookingServiceCard";
import { ServiceDetailsDrawer } from "./shared/ServiceDetailsDrawer";
import heroImage from "@/assets/sol-mai-hero.jpg";
import solMaiLogo from "@/assets/sol-mai-logo-header.png";

export function Landing({
  onSelectPublicCategory,
  onStart,
  restoreServicesViewKey,
  selectedCategory,
}: {
  onSelectPublicCategory: (categoryId: CategoryId | null) => void;
  onStart: (input: StartBookingInput) => void;
  restoreServicesViewKey: number;
  selectedCategory: CategoryId | null;
}) {
  const selectedCategoryData = selectedCategory
    ? categories.find((category) => category.id === selectedCategory)
    : null;
  const rawServices = selectedCategory ? services[selectedCategory] : [];
  // Populares primero, sin mutar el mock.
  const selectedServices = [...rawServices].sort((a, b) => {
    const aPop = a.tag === "popular" ? 0 : 1;
    const bPop = b.tag === "popular" ? 0 : 1;
    return aPop - bPop;
  });
  const [previewService, setPreviewService] = useState<Service | null>(null);

  const scrollToSpecialties = () => {
    window.requestAnimationFrame(() => {
      document.getElementById("areas")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const showSpecialtyServices = (categoryId: CategoryId) => {
    onSelectPublicCategory(categoryId);
    window.requestAnimationFrame(() => {
      document
        .getElementById("servicios-especialidad")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  useEffect(() => {
    if (!selectedCategory || restoreServicesViewKey === 0) return;

    const animationFrame = window.requestAnimationFrame(() => {
      document
        .getElementById("servicios-especialidad")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [restoreServicesViewKey, selectedCategory]);

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3 sm:py-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="inline-flex flex-col items-center">
            <div className="relative h-9 w-[140px] overflow-hidden sm:h-14 sm:w-[216px]">
              <img
                src={solMaiLogo}
                alt="Sol Mai Peluquería"
                className="absolute -left-[51px] -top-[51px] h-[154px] w-auto max-w-none object-contain sm:-left-[79px] sm:-top-[79px] sm:h-[238px]"
              />
            </div>
            <p className="mt-0.5 w-full text-center text-[8px] uppercase tracking-[0.28em] text-muted-foreground sm:text-[10px]">
              Peluquería
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={scrollToSpecialties}
          className="hidden text-xs uppercase tracking-[0.22em] text-foreground/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:block"
        >
          Reservar
        </button>
      </header>

      <main className="mx-auto max-w-6xl px-5 lg:px-8">
        <section className="grid items-center gap-7 pb-14 pt-2 sm:gap-10 sm:pb-12 sm:pt-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:pb-20 lg:pt-12">
          {/* Hero visual mobile — boutique, cálido */}
          <div className="relative -mx-1 sm:hidden">
            <div className="relative overflow-hidden rounded-[1.75rem] border border-border/70 bg-cream shadow-[0_30px_60px_-40px_rgba(120,90,60,0.45)]">
              <img
                src={heroImage}
                alt="Interior cálido y luminoso de Sol Mai Peluquería"
                width={1024}
                height={1024}
                className="h-[260px] w-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-cream/95 via-cream/40 to-transparent" />
              <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-foreground/55 px-2.5 py-0.5 text-[10px] font-medium text-background/95 backdrop-blur-sm">
                <span className="h-1 w-1 rounded-full bg-champagne-deep" />
                Santa Fe
              </span>
              <div className="absolute bottom-3 right-3">
                <div className="rounded-xl border border-border/50 bg-card/85 px-2.5 py-1 text-right backdrop-blur-sm">
                  <p className="text-[8px] uppercase tracking-[0.18em] text-muted-foreground">
                    Próximo turno
                  </p>
                  <p className="font-serif text-[11px] leading-tight text-foreground">
                    Mañana · 11:30
                  </p>
                </div>
              </div>
            </div>
            <p className="mt-2.5 flex items-center gap-1.5 px-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              <span className="h-1 w-1 rounded-full bg-champagne-deep" />
              República de Siria 3798 · Santa Fe
            </p>
          </div>

          <div>
            <span className="hidden items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1.5 text-[10px] uppercase tracking-[0.22em] text-foreground/70 backdrop-blur sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-champagne-deep" />
              República de Siria 3798 · Santa Fe
            </span>
            <h1 className="font-serif text-[2.55rem] leading-[1.02] text-foreground sm:mt-6 sm:text-6xl lg:text-[4.5rem]">
              Belleza <em className="not-italic text-champagne-deep">a tu medida.</em>
            </h1>
            <div className="mt-3 h-px w-14 bg-champagne-deep/40 sm:mt-6 sm:w-16" />
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:mt-6 sm:text-base">
              Reservá online con seña del 20%. Saldo a abonar en el salón.
            </p>

            <div className="mt-5 flex flex-col gap-2.5 sm:mt-9 sm:flex-row sm:gap-3">
              <button
                type="button"
                onClick={scrollToSpecialties}
                className="rounded-full bg-primary px-7 py-3 font-serif text-base text-primary-foreground shadow-[0_18px_40px_-18px_rgba(80,55,30,0.5)] transition-all hover:translate-y-[-1px] hover:shadow-[0_22px_44px_-18px_rgba(80,55,30,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Ver servicios
              </button>
            </div>
          </div>

          <div className="relative hidden sm:block">
            <div className="overflow-hidden rounded-[2rem] border border-border/70 bg-cream shadow-[0_50px_90px_-50px_rgba(120,90,60,0.5)]">
              <img
                src={heroImage}
                alt="Interior cálido y luminoso de Sol Mai Peluquería"
                width={1024}
                height={1280}
                className="h-[520px] w-full object-cover lg:h-[600px]"
              />
            </div>
            <div className="absolute -bottom-5 left-5 hidden rounded-2xl border border-border bg-card/95 px-5 py-3 shadow-lg backdrop-blur sm:block">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Próximo turno disponible
              </p>
              <p className="mt-1 font-serif text-lg text-foreground">Mañana · 11:30</p>
            </div>
          </div>
        </section>

        <section
          id="areas"
          className="scroll-mt-8 border-t border-border/60 pb-14 pt-10 sm:pb-20 sm:pt-14"
        >
          <div className="max-w-2xl">
            <h2 className="font-serif text-4xl text-foreground lg:text-5xl">
              Nuestras especialidades
            </h2>
          </div>

          <div className="mt-5 grid gap-4 sm:mt-6 sm:gap-5 lg:grid-cols-3">
            {categories.map((category) => (
              <BookingCategoryCard
                key={category.id}
                category={category}
                selected={selectedCategory === category.id}
                variant="public"
                onClick={() => showSpecialtyServices(category.id)}
              />
            ))}
          </div>
        </section>

        {selectedCategory && selectedCategoryData ? (
          <section
            id="servicios-especialidad"
            className="scroll-mt-8 border-t border-border/60 pb-16 pt-8 sm:pb-24 sm:pt-10"
          >
            <div className="max-w-2xl">
              <button
                type="button"
                onClick={() => {
                  onSelectPublicCategory(null);
                  window.requestAnimationFrame(() => {
                    document.getElementById("areas")?.scrollIntoView({ behavior: "smooth" });
                  });
                }}
                className="mb-4 inline-flex items-center rounded-full border border-border bg-card px-4 py-2 font-serif text-sm text-foreground transition-colors hover:border-champagne hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                ← Volver
              </button>
              <p
                className={`mb-2 inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground ${categoryAccent[selectedCategory]}`}
              >
                <span>{selectedCategoryData.emoji}</span>
                <span>{selectedCategoryData.name}</span>
              </p>
              <h2 className="font-serif text-4xl text-foreground lg:text-5xl">
                {selectedCategoryData.name}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
                {categoryIntro[selectedCategory]}
              </p>
            </div>

            {groupServices(selectedCategory, selectedServices).map((group, index) => (
              <div key={group.key} className={index === 0 ? "mt-6 sm:mt-8" : "mt-10 sm:mt-14"}>
                <div className="mb-4 sm:mb-5">
                  <h3 className="font-serif text-2xl text-foreground sm:text-3xl">{group.title}</h3>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {group.items.map((service) => (
                    <BookingServiceCard
                      key={`${selectedCategory}-${service.id}`}
                      service={service}
                      categoryId={selectedCategory}
                      variant="public"
                      actionLabel="Ver servicio"
                      onClick={() => setPreviewService(service)}
                    />
                  ))}
                </div>
              </div>
            ))}

            {/* Cierre del catálogo: CTA principal + navegación secundaria discreta */}
            <div className="mt-10 flex flex-col items-center gap-5 border-t border-border/60 pt-8 sm:mt-14 sm:pt-10">
              <button
                type="button"
                onClick={() =>
                  onStart({
                    initialSelection: { categoryId: selectedCategory },
                    returnTarget: { type: "catalog", categoryId: selectedCategory },
                  })
                }
                className="inline-flex items-center justify-center rounded-full bg-primary px-7 py-3 font-serif text-base text-primary-foreground shadow-[0_18px_40px_-22px_rgba(80,55,30,0.55)] transition-all hover:translate-y-[-1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Reservar en {selectedCategoryData.name.toLowerCase()}
              </button>

              <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground/80">
                  Ver también
                </span>
                {categories
                  .filter((category) => category.id !== selectedCategory)
                  .map((category, index, arr) => (
                    <span key={category.id} className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => showSpecialtyServices(category.id)}
                        className="font-serif text-foreground/80 underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      >
                        {category.name}
                      </button>
                      {index < arr.length - 1 ? (
                        <span aria-hidden className="text-border">
                          ·
                        </span>
                      ) : null}
                    </span>
                  ))}
              </div>
            </div>
          </section>
        ) : null}
      </main>

      <ServiceDetailsDrawer
        service={previewService}
        categoryId={selectedCategory}
        open={previewService !== null}
        onOpenChange={(open) => {
          if (!open) setPreviewService(null);
        }}
        onReserve={() => {
          if (!previewService || !selectedCategory) return;
          onStart({
            initialSelection: {
              categoryId: selectedCategory,
              serviceId: previewService.id,
            },
            returnTarget: { type: "catalog", categoryId: selectedCategory },
          });
          setPreviewService(null);
        }}
      />

      <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        Sol Mai Peluquería · Santa Fe Capital · Representante Itely Hairfashion
      </footer>
    </div>
  );
}

const categoryAccent: Record<CategoryId, string> = {
  peluqueria: "bg-cream/80",
  maquillaje: "bg-sand/60",
  unas: "bg-blonde/50",
  depilacion: "bg-cream/70",
};

const categoryIntro: Record<CategoryId, string> = {
  peluqueria: "Cortes, color, peinados y tratamientos.",
  maquillaje: "Looks de novia, evento y producción.",
  unas: "Uñas cuidadas, semipermanente y diseño.",
  depilacion: "Depilación facial, cejas y bozo.",
};

type ServiceGroup = {
  key: string;
  title: string;
  items: Service[];
};

function groupServices(categoryId: CategoryId, items: Service[]): ServiceGroup[] {
  if (categoryId !== "peluqueria") {
    return [
      {
        key: "all",
        title: "Todos los servicios",
        items,
      },
    ];
  }

  const used = new Set<string>();
  const take = (predicate: (service: Service) => boolean): Service[] => {
    const picked = items.filter((service) => !used.has(service.id) && predicate(service));
    picked.forEach((service) => used.add(service.id));
    return picked;
  };

  const groups: ServiceGroup[] = [
    {
      key: "populares",
      title: "Más elegidos",
      items: take((service) => service.tag === "popular"),
    },
    {
      key: "color",
      title: "Color & iluminación",
      items: take(
        (service) =>
          service.tag === "color" ||
          ["mechas", "babylights", "balayage", "claritos"].includes(service.id),
      ),
    },
    {
      key: "cortes",
      title: "Cortes & peinados",
      items: take((service) =>
        ["corte-fem", "brushing", "peinado-diario", "peinado-social", "recogido"].includes(
          service.id,
        ),
      ),
    },
    {
      key: "tratamientos",
      title: "Tratamientos",
      items: take((service) => service.tag === "tratamiento" || service.id === "alisado"),
    },
    {
      key: "combos",
      title: "Combos boutique",
      items: take((service) => service.tag === "combinado"),
    },
  ];

  const leftover = take(() => true);
  if (leftover.length > 0) {
    groups.push({
      key: "otros",
      title: "Otros servicios",
      items: leftover,
    });
  }

  return groups.filter((group) => group.items.length > 0);
}
