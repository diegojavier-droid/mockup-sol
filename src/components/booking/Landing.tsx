import { categories, services } from "@/lib/booking-data";

export function Landing({
  onStart,
  onSeeServices,
}: {
  onStart: () => void;
  onSeeServices: () => void;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-ivory via-cream to-sand/40">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 lg:px-8">
        <div>
          <p className="font-serif text-xl leading-none text-foreground">Sol Mai</p>
          <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
            Peluquería boutique
          </p>
        </div>
        <button
          type="button"
          onClick={onSeeServices}
          className="hidden text-xs uppercase tracking-[0.18em] text-foreground/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:block"
        >
          Servicios
        </button>
      </header>

      <main className="mx-auto max-w-6xl px-5 lg:px-8">
        <section className="grid items-center gap-10 pb-16 pt-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:pb-24 lg:pt-12">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-foreground/70 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-champagne-deep" /> Santa Fe Capital
            </span>
            <h1 className="mt-5 font-serif text-5xl leading-[1.05] text-foreground sm:text-6xl lg:text-7xl">
              Belleza serena,
              <br />
              <span className="text-champagne-deep">a tu medida.</span>
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">
              Peluquería, maquillaje y uñas en un espacio cálido y luminoso. Color y cuidado capilar
              con productos Itely Hairfashion.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={onStart}
                className="rounded-2xl bg-primary px-7 py-4 font-serif text-lg text-primary-foreground shadow-[0_20px_40px_-20px_rgba(80,55,30,0.45)] transition-all hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Reservar turno
              </button>
              <button
                type="button"
                onClick={onSeeServices}
                className="rounded-2xl border border-border bg-card/80 px-7 py-4 font-serif text-lg text-foreground transition-all hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Ver servicios
              </button>
            </div>
            <div className="mt-10 grid max-w-md grid-cols-3 gap-6 text-center">
              <Stat n="12+" l="años de oficio" />
              <Stat n="Itely" l="Hairfashion" />
              <Stat n="3" l="especialidades" />
            </div>
          </div>

          <div className="relative">
            <div className="aspect-[4/5] overflow-hidden rounded-[2rem] bg-gradient-to-br from-blonde/70 via-cream to-sand shadow-[0_40px_80px_-40px_rgba(120,90,60,0.45)]">
              <div className="flex h-full flex-col items-center justify-center gap-6 p-10 text-center">
                <div className="font-serif text-[140px] leading-none text-champagne-deep/80">S</div>
                <p className="font-serif text-2xl text-foreground/80">Sol Mai</p>
                <p className="max-w-[18ch] text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  Peluquería · Maquillaje · Uñas
                </p>
              </div>
            </div>
            <div className="absolute -bottom-6 -left-4 hidden rounded-2xl border border-border bg-card/90 p-4 shadow-lg backdrop-blur sm:block">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Próximo turno
              </p>
              <p className="mt-1 font-serif text-lg">Mañana · 11:30</p>
            </div>
          </div>
        </section>

        <section id="servicios" className="border-t border-border/60 pb-24 pt-16">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
                Especialidades
              </p>
              <h2 className="mt-2 font-serif text-4xl text-foreground">Lo que hacemos</h2>
            </div>
            <button
              type="button"
              onClick={onStart}
              className="hidden text-sm text-champagne-deep hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:block"
            >
              Reservar →
            </button>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {categories.map((c) => (
              <div key={c.id} className="rounded-2xl border border-border bg-card p-6">
                <div className="flex h-20 items-center justify-center rounded-xl bg-gradient-to-br from-cream to-sand/60 text-4xl text-champagne-deep">
                  {c.emoji}
                </div>
                <h3 className="mt-4 font-serif text-xl">{c.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{c.tagline}</p>
                <p className="mt-3 text-[11px] uppercase tracking-wider text-muted-foreground">
                  {services[c.id].length} servicios
                </p>
              </div>
            ))}
          </div>

          <div className="mt-10 flex justify-center">
            <button
              type="button"
              onClick={onStart}
              className="rounded-2xl bg-primary px-8 py-4 font-serif text-lg text-primary-foreground transition-all hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
      <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">{l}</p>
    </div>
  );
}
