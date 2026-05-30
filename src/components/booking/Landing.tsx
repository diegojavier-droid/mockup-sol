import { categories, services, type CategoryId } from "@/lib/booking-data";
import heroImage from "@/assets/sol-mai-hero.jpg";
import peluImg from "@/assets/sol-mai-peluqueria.jpg";
import makeImg from "@/assets/sol-mai-maquillaje.jpg";
import nailsImg from "@/assets/sol-mai-unas.jpg";

const categoryImages: Record<string, string> = {
  peluqueria: peluImg,
  maquillaje: makeImg,
  unas: nailsImg,
};

export function Landing({
  onStart,
  onSeeServices,
}: {
  onStart: (categoryId?: CategoryId) => void;
  onSeeServices: () => void;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div
            aria-hidden="true"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card font-serif text-lg text-champagne-deep"
          >
            S
          </div>
          <div>
            <p className="font-serif text-xl leading-none text-foreground">Sol Mai</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
              Peluquería
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onSeeServices}
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
                onClick={onStart}
                className="rounded-full bg-primary px-8 py-4 font-serif text-lg text-primary-foreground shadow-[0_18px_40px_-18px_rgba(80,55,30,0.5)] transition-all hover:translate-y-[-1px] hover:shadow-[0_22px_44px_-18px_rgba(80,55,30,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Reservar turno
              </button>
              <button
                type="button"
                onClick={onSeeServices}
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

        <section id="servicios" className="border-t border-border/60 pb-24 pt-20">
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
              onClick={onStart}
              className="hidden text-sm text-champagne-deep underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:block"
            >
              Reservar →
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
                  <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-4">
                    <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                      {services[c.id].length} servicios
                    </span>
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
              </article>
            ))}
          </div>

          <div className="mt-14 flex justify-center">
            <button
              type="button"
              onClick={onStart}
              className="rounded-full bg-primary px-10 py-4 font-serif text-lg text-primary-foreground shadow-[0_18px_40px_-18px_rgba(80,55,30,0.5)] transition-all hover:translate-y-[-1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Reservar mi turno
            </button>
          </div>
        </section>
      </main>

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
