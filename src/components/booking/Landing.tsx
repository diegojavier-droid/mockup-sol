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
              <span className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/85 px-3 py-1.5 text-[9px] uppercase tracking-[0.2em] text-foreground/70 backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-champagne-deep" />
                Santa Fe Capital
              </span>
              <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-3">
                <p className="font-serif text-xs italic text-foreground/70">✦ Itely Hairfashion</p>
                <p className="rounded-full border border-border/60 bg-card/90 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-foreground/70 backdrop-blur">
                  Mañana · 11:30
                </p>
              </div>
            </div>
          </div>

          <div>
            <span className="hidden items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1.5 text-[10px] uppercase tracking-[0.22em] text-foreground/70 backdrop-blur sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-champagne-deep" />
              Santa Fe Capital
            </span>
            <h1 className="font-serif text-[2.55rem] leading-[1.02] text-foreground sm:mt-6 sm:text-6xl lg:text-[4.5rem]">
              Belleza <em className="not-italic text-champagne-deep">a tu medida.</em>
            </h1>
            <div className="mt-3 h-px w-14 bg-champagne-deep/40 sm:mt-6 sm:w-16" />
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:mt-6 sm:text-base">
              Tu momento de belleza empieza acá. Explorá los servicios, mirá detalles y reservá
              cuando estés lista.
            </p>
            <div className="mt-5 flex flex-col gap-2.5 sm:mt-9 sm:flex-row sm:gap-3">
              {/* Mobile: Ver servicios primero (explorar). Desktop: Reservar primero. */}
              <button
                type="button"
                onClick={scrollToSpecialties}
                className="order-1 rounded-full bg-primary px-7 py-3 font-serif text-base text-primary-foreground shadow-[0_18px_40px_-18px_rgba(80,55,30,0.5)] transition-all hover:translate-y-[-1px] hover:shadow-[0_22px_44px_-18px_rgba(80,55,30,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:order-2 sm:border sm:border-border sm:bg-card/80 sm:text-foreground sm:shadow-none sm:hover:bg-card"
              >
                Ver servicios
              </button>
              <button
                type="button"
                onClick={() =>
                  onStart({
                    entryPoint: "hero-reserve",
                    initialSelection: {},
                    returnTarget: { type: "landing" },
                  })
                }
                className="order-2 rounded-full border border-border bg-card/80 px-7 py-3 font-serif text-base text-foreground transition-all hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:order-1 sm:border-0 sm:bg-primary sm:text-primary-foreground sm:shadow-[0_18px_40px_-18px_rgba(80,55,30,0.5)] sm:hover:translate-y-[-1px] sm:hover:shadow-[0_22px_44px_-18px_rgba(80,55,30,0.55)]"
              >
                Reservar turno
              </button>
            </div>
            <div className="mt-6 hidden max-w-md grid-cols-3 gap-6 border-t border-border/60 pt-5 text-left sm:grid">
              <Stat n="Cuidado" l="artesanal" />
              <Stat n="Itely" l="Hairfashion" />
              <Stat n="Belleza" l="integral" />
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
            <div className="absolute -top-4 -right-3 hidden rotate-3 rounded-full border border-border bg-card px-4 py-2 font-serif text-xs text-foreground/80 shadow-md sm:block">
              ✦ Itely Hairfashion
            </div>
          </div>
        </section>

        <section
          id="areas"
          className="scroll-mt-8 border-t border-border/60 pb-14 pt-10 sm:pb-20 sm:pt-14"
        >
          <div className="max-w-2xl">
            <h2 className="font-serif text-4xl text-foreground lg:text-5xl">
              ¿Qué servicios te interesa conocer?
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
              <h2 className="font-serif text-4xl text-foreground lg:text-5xl">Elegí tu servicio</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
                {categoryIntro[selectedCategory]}
              </p>
            </div>

            {groupServices(selectedCategory, selectedServices).map((group, index) => (
              <div key={group.key} className={index === 0 ? "mt-6 sm:mt-8" : "mt-10 sm:mt-14"}>
                <div className="mb-4 flex items-baseline justify-between gap-3 sm:mb-5">
                  <div>
                    <h3 className="font-serif text-2xl text-foreground sm:text-3xl">
                      {group.title}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                      {group.subtitle}
                    </p>
                  </div>
                  <span className="hidden shrink-0 rounded-full border border-border bg-card px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:inline-flex">
                    {group.items.length} opciones
                  </span>
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
            entryPoint: "public-catalog",
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

function Stat({ n, l }: { n: string; l: string }) {
  return (
    <div>
      <p className="font-serif text-2xl text-foreground">{n}</p>
      <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{l}</p>
    </div>
  );
}

const categoryAccent: Record<CategoryId, string> = {
  peluqueria: "bg-cream/80",
  maquillaje: "bg-sand/60",
  unas: "bg-blonde/50",
};

const categoryIntro: Record<CategoryId, string> = {
  peluqueria:
    "Desde un corte simple hasta una transformación completa. Tocá una tarjeta para ver qué incluye.",
  maquillaje:
    "Para tu casamiento, una fiesta o un evento especial. Cada look se diseña con vos.",
  unas: "Manicura, esmaltado y diseños. Para verte prolija o lucir un detalle.",
};

type ServiceGroup = {
  key: string;
  title: string;
  subtitle: string;
  items: Service[];
};

function groupServices(categoryId: CategoryId, items: Service[]): ServiceGroup[] {
  if (categoryId !== "peluqueria") {
    return [
      {
        key: "all",
        title: "Todos los servicios",
        subtitle: "Tocá una tarjeta para ver detalles y reservar.",
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
      subtitle: "Los favoritos de nuestras clientas — un buen punto de partida.",
      items: take((service) => service.tag === "popular"),
    },
    {
      key: "color",
      title: "Color & iluminación",
      subtitle: "Para refrescar, cubrir raíz o transformar tu color.",
      items: take(
        (service) =>
          service.tag === "color" ||
          ["mechas", "babylights", "balayage", "claritos"].includes(service.id),
      ),
    },
    {
      key: "cortes",
      title: "Cortes & peinados",
      subtitle: "Diseño, forma y terminación para el día a día o un evento.",
      items: take((service) =>
        ["corte-fem", "brushing", "peinado-diario", "peinado-social", "recogido"].includes(
          service.id,
        ),
      ),
    },
    {
      key: "tratamientos",
      title: "Tratamientos",
      subtitle: "Para nutrir, reparar y devolverle vida al cabello.",
      items: take((service) => service.tag === "tratamiento" || service.id === "alisado"),
    },
    {
      key: "combos",
      title: "Combos boutique",
      subtitle: "Más servicios en una sola visita, con precio cuidado.",
      items: take((service) => service.tag === "combinado"),
    },
  ];

  const leftover = take(() => true);
  if (leftover.length > 0) {
    groups.push({
      key: "otros",
      title: "Otros servicios",
      subtitle: "Más opciones disponibles en el salón.",
      items: leftover,
    });
  }

  return groups.filter((group) => group.items.length > 0);
}

