import { useMemo, useState } from "react";
import { categories, services, type CategoryId, type Service, type Tag } from "@/lib/booking-data";
import heroImage from "@/assets/sol-mai-hero.jpg";
import peluImg from "@/assets/sol-mai-peluqueria.jpg";
import makeImg from "@/assets/sol-mai-maquillaje.jpg";
import nailsImg from "@/assets/sol-mai-unas.jpg";
import solMaiLogo from "@/assets/sol-mai-logo-header.png";

const categoryImages: Record<string, string> = {
  peluqueria: peluImg,
  maquillaje: makeImg,
  unas: nailsImg,
};

const tagLabels: Record<Tag, string> = {
  popular: "Popular",
  color: "Color",
  tratamiento: "Tratamiento",
  evento: "Evento",
  combinado: "Combinado",
};

const allServices = categories.flatMap((category) =>
  services[category.id].map((service) => ({
    ...service,
    categoryId: category.id,
    categoryName: category.name,
  })),
);

type PublicService = Service & { categoryId: CategoryId; categoryName: string };

export function Landing({
  onStart,
}: {
  onStart: (categoryId?: CategoryId, serviceId?: string) => void;
}) {
  const [activeCategory, setActiveCategory] = useState<CategoryId | "todos">("todos");

  const filteredServices = useMemo(() => {
    if (activeCategory === "todos") return allServices;

    return allServices.filter((service) => service.categoryId === activeCategory);
  }, [activeCategory]);

  const scrollToServices = (categoryId: CategoryId | "todos" = "todos") => {
    setActiveCategory(categoryId);
    window.requestAnimationFrame(() => {
      document.getElementById("servicios")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="inline-flex flex-col items-center">
            <div className="relative h-11 w-[172px] overflow-hidden sm:h-14 sm:w-[216px]">
              <img
                src={solMaiLogo}
                alt="Sol Mai Peluquería"
                className="absolute -left-[63px] -top-[63px] h-[190px] w-auto max-w-none object-contain sm:-left-[79px] sm:-top-[79px] sm:h-[238px]"
              />
            </div>
            <p className="mt-0.5 w-full text-center text-[9px] uppercase tracking-[0.28em] text-muted-foreground sm:text-[10px]">
              Peluquería
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => scrollToServices()}
          className="hidden text-xs uppercase tracking-[0.22em] text-foreground/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:block"
        >
          Servicios
        </button>
      </header>

      <main className="mx-auto max-w-6xl px-5 lg:px-8">
        <section className="grid items-center gap-12 pb-20 pt-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:pb-28 lg:pt-12">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1.5 text-[10px] uppercase tracking-[0.22em] text-foreground/70 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-champagne-deep" />
              Santa Fe Capital
            </span>
            <h1 className="mt-6 font-serif text-[2.8rem] leading-[1.02] text-foreground sm:text-6xl lg:text-[4.5rem]">
              Belleza,
              <br />
              <em className="not-italic text-champagne-deep">a tu medida.</em>
            </h1>
            <div className="mt-6 h-px w-16 bg-champagne-deep/40" />
            <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground">
              Peluquería, maquillaje y uñas en un espacio cálido y luminoso. Color y cuidado capilar
              con productos Itely Hairfashion, en el corazón de Santa Fe.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => onStart()}
                className="rounded-full bg-primary px-8 py-4 font-serif text-lg text-primary-foreground shadow-[0_18px_40px_-18px_rgba(80,55,30,0.5)] transition-all hover:translate-y-[-1px] hover:shadow-[0_22px_44px_-18px_rgba(80,55,30,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Reservar turno
              </button>
              <button
                type="button"
                onClick={() => scrollToServices()}
                className="rounded-full border border-border bg-card/80 px-8 py-4 font-serif text-lg text-foreground transition-all hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Ver servicios
              </button>
            </div>
            <div className="mt-12 grid max-w-md grid-cols-3 gap-6 border-t border-border/60 pt-6 text-left">
              <Stat n="12+" l="años de oficio" />
              <Stat n="Itely" l="Hairfashion" />
              <Stat n="3" l="especialidades" />
            </div>
          </div>

          <div className="relative">
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

        <section id="areas" className="border-t border-border/60 pb-20 pt-20">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
                Especialidades
              </p>
              <h2 className="mt-3 font-serif text-4xl text-foreground lg:text-5xl">
                Lo que hacemos
              </h2>
              <div className="mt-4 h-px w-12 bg-champagne-deep/40" />
            </div>
            <button
              type="button"
              onClick={() => scrollToServices()}
              className="hidden text-sm text-champagne-deep underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:block"
            >
              Ver servicios →
            </button>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {categories.map((c) => (
              <article
                key={c.id}
                className="group overflow-hidden rounded-3xl border border-border bg-card transition-all hover:border-champagne hover:shadow-[0_30px_50px_-35px_rgba(120,90,60,0.35)]"
              >
                <div className="overflow-hidden">
                  <img
                    src={categoryImages[c.id]}
                    alt={c.name}
                    loading="lazy"
                    width={800}
                    height={800}
                    className="h-52 w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                  />
                </div>
                <div className="p-6">
                  <h3 className="font-serif text-2xl text-foreground">{c.name}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{c.tagline}</p>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
                    <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                      {services[c.id].length} servicios
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => scrollToServices(c.id)}
                        className="cursor-pointer rounded-full px-2 py-1 font-serif text-sm text-champagne-deep underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                        aria-label={`Ver servicios de ${c.name}`}
                      >
                        Ver servicios
                      </button>
                      <button
                        type="button"
                        onClick={() => onStart(c.id)}
                        className="cursor-pointer rounded-full px-2 py-1 font-serif text-sm text-champagne-deep underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                        aria-label={`Reservar ${c.name}`}
                      >
                        Reservar →
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="servicios" className="scroll-mt-8 border-t border-border/60 pb-24 pt-20">
          <div className="max-w-2xl">
            <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
              Catálogo público
            </p>
            <h2 className="mt-3 font-serif text-4xl text-foreground lg:text-5xl">Servicios</h2>
            <div className="mt-4 h-px w-12 bg-champagne-deep/40" />
            <p className="mt-5 text-base leading-relaxed text-muted-foreground">
              Explorá tratamientos, duración estimada y valores orientativos antes de elegir tu
              turno. Cuando encuentres el servicio ideal, podés reservarlo directamente.
            </p>
          </div>

          <div className="mt-8 flex gap-2 overflow-x-auto pb-2 sm:flex-wrap sm:overflow-visible">
            <FilterChip
              active={activeCategory === "todos"}
              label="Todos"
              onClick={() => scrollToServices("todos")}
            />
            {categories.map((category) => (
              <FilterChip
                key={category.id}
                active={activeCategory === category.id}
                label={category.name}
                onClick={() => scrollToServices(category.id)}
              />
            ))}
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredServices.map((service) => (
              <ServiceCatalogCard
                key={`${service.categoryId}-${service.id}`}
                service={service}
                onReserve={() => onStart(service.categoryId, service.id)}
              />
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        Sol Mai Peluquería · Santa Fe Capital · Representante Itely Hairfashion
      </footer>
    </div>
  );
}

function ServiceCatalogCard({
  service,
  onReserve,
}: {
  service: PublicService;
  onReserve: () => void;
}) {
  return (
    <article className="flex h-full flex-col rounded-3xl border border-border bg-card p-5 shadow-[0_24px_50px_-42px_rgba(120,90,60,0.35)] transition-all hover:border-champagne hover:shadow-[0_30px_55px_-40px_rgba(120,90,60,0.45)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            {service.categoryName}
          </p>
          <h3 className="mt-2 font-serif text-2xl leading-tight text-foreground">{service.name}</h3>
        </div>
        {service.tag ? (
          <span className="shrink-0 rounded-full border border-champagne/50 bg-cream px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-champagne-deep">
            {tagLabels[service.tag]}
          </span>
        ) : null}
      </div>

      <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">{service.desc}</p>

      <div className="mt-5 grid grid-cols-2 gap-3 rounded-2xl bg-cream/50 p-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Duración</p>
          <p className="mt-1 font-serif text-base text-foreground">{service.duration}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Precio</p>
          <p className="mt-1 font-serif text-base text-foreground">Desde {service.price}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={onReserve}
        className="mt-5 rounded-full bg-primary px-5 py-3 font-serif text-base text-primary-foreground transition-all hover:translate-y-[-1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
        aria-label={`Reservar ${service.name}`}
      >
        Reservar
      </button>
    </article>
  );
}

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full border px-4 py-2 text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-foreground hover:border-champagne hover:text-champagne-deep"
      }`}
    >
      {label}
    </button>
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
