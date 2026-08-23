/**
 * "Hola María. ¿Qué querés hacer hoy?"
 *
 * Para una clienta que ya vino, la reserva no debería empezar con un
 * catálogo: debería empezar con lo que ya se hizo. Son hasta tres
 * servicios REALIZADOS —no reservas—, porque una reserva cancelada no
 * es un servicio.
 *
 * Sin historial no se muestra nada y la clienta ve el catálogo normal.
 * Nunca una pantalla vacía pidiendo disculpas.
 */

import { useRecentServices, type RecentService } from "@/lib/api/identity-hooks";

function lastTime(iso: string): string {
  const d = new Date(new Date(iso).getTime() - 180 * 60_000);
  const meses = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];
  return `${d.getUTCDate()} de ${meses[d.getUTCMonth()]}`;
}

export function KnownCustomerBlock({
  enabled,
  onRepeat,
}: {
  enabled: boolean;
  onRepeat: (service: RecentService) => void;
}) {
  const recent = useRecentServices(enabled);

  const services = recent.data?.services ?? [];
  if (!enabled || recent.isLoading || services.length === 0) return null;

  const name = recent.data?.firstName;

  return (
    <section className="mx-auto w-full max-w-3xl px-4">
      <div className="rounded-3xl border border-champagne-deep/25 bg-gradient-to-b from-champagne/35 to-cream/50 p-5 sm:p-6">
        <h2 className="font-serif text-2xl leading-tight text-foreground">
          {name ? `Hola ${name}.` : "Hola de nuevo."}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">¿Qué querés hacer hoy?</p>

        <ul className="mt-4 space-y-2">
          {services.map((s) => (
            <li key={s.serviceSlug}>
              <button
                type="button"
                onClick={() => onRepeat(s)}
                className="flex w-full items-baseline justify-between gap-3 rounded-2xl border border-champagne-deep/20 bg-card px-4 py-3 text-left transition-colors hover:border-champagne-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="min-w-0">
                  <span className="block truncate font-serif text-lg leading-tight text-foreground">
                    {s.serviceName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Última vez: {lastTime(s.lastDoneAt)}
                  </span>
                </span>
                <span className="flex-none text-xs text-foreground/70">Repetir</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
