import { useState } from "react";
import { categories, services, type CategoryId, type Service, type Tag } from "@/lib/booking-data";
import heroImage from "@/assets/sol-mai-hero.jpg";
import peluImg from "@/assets/sol-mai-peluqueria.jpg";
import makeImg from "@/assets/sol-mai-maquillaje.jpg";
import nailsImg from "@/assets/sol-mai-unas.jpg";
import solMaiLogo from "@/assets/sol-mai-logo-header.png";

const categoryImages: Record<CategoryId, string> = {
  peluqueria: peluImg,
  maquillaje: makeImg,
  unas: nailsImg,
};

const specialtyLabels: Record<CategoryId, string> = {
  peluqueria: "Peluquería",
  maquillaje: "Maquillaje",
  unas: "Uñas",
};

const specialtyDescriptions: Record<CategoryId, string> = {
  peluqueria: "Cortes, color, peinados y tratamientos pensados para cuidar tu pelo.",
  maquillaje: "Looks sociales, de evento y producción para sentirte cómoda y luminosa.",
  unas: "Manicura, semipermanente, soft gel y detalles de nail art con terminación prolija.",
};

const specialtyVisuals: Record<CategoryId, string> = {
  peluqueria: "✂",
  maquillaje: "✿",
  unas: "✦",
};

const tagLabels: Record<Tag, string> = {
  popular: "Popular",
  color: "Color",
  tratamiento: "Tratamiento",
  evento: "Evento",
  combinado: "Combinado",
};

type SpecialtyService = Service & { categoryId: CategoryId };

export function Landing({
  onStart,
}: {
  onStart: (categoryId?: CategoryId, serviceId?: string) => void;
}) {
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | null>(null);

  const selectedCategoryData = selectedCategory
    ? categories.find((category) => category.id === selectedCategory)
    : null;
  const selectedServices: SpecialtyService[] = selectedCategory
    ? services[selectedCategory].map((service) => ({ ...service, categoryId: selectedCategory }))
    : [];

  const scrollToSpecialties = () => {
    window.requestAnimationFrame(() => {
      document.getElementById("areas")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const showSpecialtyServices = (categoryId: CategoryId) => {
    setSelectedCategory(categoryId);
    window.requestAnimationFrame(() => {
      document
        .getElementById("servicios-especialidad")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
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
          onClick={scrollToSpecialties}
          className="hidden text-xs uppercase tracking-[0.22em] text-foreground/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:block"
        >
          Especialidades
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
                onClick={scrollToSpecialties}
                className="rounded-full border border-border bg-card/80 px-8 py-4 font-serif text-lg text-foreground transition-all hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Ver especialidades
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

        <section
          id="areas"
          className="scroll-mt-8 border-t border-border/60 pb-14 pt-14 sm:pb-20 sm:pt-20"
        >
          <div className="max-w-2xl">
            <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
              Especialidades
            </p>
            <h2 className="mt-3 font-serif text-4xl text-foreground lg:text-5xl">Lo que hacemos</h2>
            <div className="mt-4 h-px w-12 bg-champagne-deep/40" />
            <p className="mt-5 text-base leading-relaxed text-muted-foreground">
              Elegí primero el área que querés explorar. Después te mostramos solo los servicios de
              esa especialidad para que la reserva sea más simple.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:gap-5 lg:grid-cols-3">
            {categories.map((category) => (
              <article
                key={category.id}
                onClick={() => showSpecialtyServices(category.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    showSpecialtyServices(category.id);
                  }
                }}
                role="button"
                tabIndex={0}
                className="group cursor-pointer overflow-hidden rounded-3xl border border-border bg-card transition-all hover:-translate-y-0.5 hover:border-champagne hover:shadow-[0_30px_50px_-35px_rgba(120,90,60,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                aria-label={`Abrir ${specialtyLabels[category.id]}`}
              >
                <div className="overflow-hidden">
                  <img
                    src={categoryImages[category.id]}
                    alt={specialtyLabels[category.id]}
                    loading="lazy"
                    width={800}
                    height={800}
                    className="h-32 w-full object-cover transition-transform duration-700 group-hover:scale-[1.04] sm:h-40 lg:h-36"
                  />
                </div>
                <div className="flex flex-col p-4 sm:p-5">
                  <h3 className="font-serif text-2xl leading-tight text-foreground">
                    {specialtyLabels[category.id]}
                  </h3>
                  <p className="mt-2 line-clamp-2 text-sm leading-snug text-muted-foreground">
                    {specialtyDescriptions[category.id]}
                  </p>
                  <div className="mt-4 flex">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onStart(category.id);
                      }}
                      className="rounded-full bg-primary px-5 py-2.5 font-serif text-base text-primary-foreground transition-all hover:translate-y-[-1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                      aria-label={`Reservar ${specialtyLabels[category.id]}`}
                    >
                      Reservar
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {selectedCategory && selectedCategoryData ? (
          <section
            id="servicios-especialidad"
            className="scroll-mt-8 border-t border-border/60 pb-16 pt-14 sm:pb-24 sm:pt-20"
          >
            <div className="max-w-2xl">
              <h2 className="font-serif text-4xl text-foreground lg:text-5xl">
                Servicios de {specialtyLabels[selectedCategory].toLowerCase()}
              </h2>
              <div className="mt-4 h-px w-12 bg-champagne-deep/40" />
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                Seleccioná el servicio que buscás.
              </p>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {selectedServices.map((service) => (
                <ServiceSpecialtyCard
                  key={`${service.categoryId}-${service.id}`}
                  service={service}
                  onReserve={() => onStart(service.categoryId, service.id)}
                />
              ))}
            </div>
          </section>
        ) : null}
      </main>

      <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        Sol Mai Peluquería · Santa Fe Capital · Representante Itely Hairfashion
      </footer>
    </div>
  );
}

function ServiceSpecialtyCard({
  service,
  onReserve,
}: {
  service: SpecialtyService;
  onReserve: () => void;
}) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-[1.6rem] border border-border bg-card shadow-[0_20px_42px_-38px_rgba(120,90,60,0.35)] transition-all hover:border-champagne hover:shadow-[0_26px_48px_-38px_rgba(120,90,60,0.45)]">
      <ServiceVisual service={service} />

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-serif text-xl leading-tight text-foreground">{service.name}</h3>
          {service.tag ? (
            <span className="shrink-0 rounded-full border border-champagne/50 bg-cream px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] text-champagne-deep">
              {tagLabels[service.tag]}
            </span>
          ) : null}
        </div>

        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {service.desc}
        </p>

        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-cream/50 px-3 py-2 text-sm">
          <span className="font-serif text-foreground">{service.duration}</span>
          <span className="h-1 w-1 rounded-full bg-champagne/70" />
          <span className="ml-auto font-serif text-base text-foreground">
            Desde {service.price}
          </span>
        </div>

        <button
          type="button"
          onClick={onReserve}
          className="mt-4 rounded-full bg-primary px-5 py-2.5 font-serif text-base text-primary-foreground transition-all hover:translate-y-[-1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
          aria-label={`Reservar ${service.name}`}
        >
          Reservar
        </button>
      </div>
    </article>
  );
}

function ServiceVisual({ service }: { service: SpecialtyService }) {
  if (service.imageUrl) {
    return (
      <img
        src={service.imageUrl}
        alt={service.name}
        loading="lazy"
        width={800}
        height={520}
        className="h-24 w-full object-cover sm:h-32"
      />
    );
  }

  return (
    <div className="relative flex h-24 items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(215,185,126,0.32),transparent_38%),linear-gradient(135deg,rgba(250,244,234,0.96),rgba(236,222,202,0.8))] sm:h-32">
      <div className="absolute -right-8 -top-12 h-28 w-28 rounded-full border border-champagne/30" />
      <div className="absolute -bottom-16 -left-10 h-36 w-36 rounded-full border border-champagne/20" />
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-champagne/40 bg-card/75 font-serif text-3xl text-champagne-deep shadow-sm backdrop-blur sm:h-16 sm:w-16">
        {service.visual ?? specialtyVisuals[service.categoryId]}
      </div>
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
