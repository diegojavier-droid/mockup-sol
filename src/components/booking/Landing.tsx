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

const tagLabels: Partial<Record<Tag, string>> = {
  popular: "Popular",
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
        <section className="grid items-center gap-10 pb-12 pt-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:pb-20 lg:pt-12">
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
            <div className="mt-8 grid max-w-md grid-cols-3 gap-6 border-t border-border/60 pt-5 text-left">
              <Stat n="Cuidado" l="artesanal" />
              <Stat n="Itely" l="Hairfashion" />
              <Stat n="Belleza" l="integral" />
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
          className="scroll-mt-8 border-t border-border/60 pb-14 pt-10 sm:pb-20 sm:pt-14"
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
                    className="h-24 w-full object-cover transition-transform duration-700 group-hover:scale-[1.04] sm:h-32 lg:h-28"
                  />
                </div>
                <div className="flex flex-col p-3.5 sm:p-4">
                  <h3 className="font-serif text-xl leading-tight text-foreground">
                    {specialtyLabels[category.id]}
                  </h3>
                  <p className="mt-1.5 line-clamp-2 text-xs leading-snug text-muted-foreground">
                    {specialtyDescriptions[category.id]}
                  </p>
                  <div className="mt-3 flex">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onStart(category.id);
                      }}
                      className="rounded-full bg-primary px-4 py-2 font-serif text-sm text-primary-foreground transition-all hover:translate-y-[-1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
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
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory(null);
                  window.requestAnimationFrame(() => {
                    document.getElementById("areas")?.scrollIntoView({ behavior: "smooth" });
                  });
                }}
                className="mb-5 inline-flex items-center rounded-full border border-border bg-card px-4 py-2 font-serif text-sm text-foreground transition-colors hover:border-champagne hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                ← Volver a especialidades
              </button>
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
    <article className="flex h-full flex-col rounded-[1.35rem] border border-border bg-card p-4 shadow-[0_18px_38px_-34px_rgba(120,90,60,0.35)] transition-all hover:border-champagne hover:shadow-[0_24px_44px_-36px_rgba(120,90,60,0.45)]">
      <div className="flex flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-serif text-xl leading-tight text-foreground">{service.name}</h3>
          {service.tag === "popular" ? (
            <span className="shrink-0 rounded-full border border-champagne/50 bg-cream px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] text-champagne-deep">
              {tagLabels[service.tag]}
            </span>
          ) : null}
        </div>

        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {service.desc}
        </p>

        <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <span>{service.duration}</span>
          <span className="h-1 w-1 rounded-full bg-champagne/70" />
          <span className="font-serif text-base text-foreground">{service.price}</span>
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

function Stat({ n, l }: { n: string; l: string }) {
  return (
    <div>
      <p className="font-serif text-2xl text-foreground">{n}</p>
      <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{l}</p>
    </div>
  );
}
