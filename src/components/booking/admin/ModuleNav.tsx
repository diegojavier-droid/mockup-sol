/**
 * El mapa del sistema, tal como lo va a ver Sol.
 *
 * No es un menú de iconos: los módulos están agrupados por **cada cuánto
 * se tocan**, que es como los ordena en la cabeza quien los usa. Lo de
 * todos los días arriba y grande; lo de cada tanto, abajo y chico.
 *
 * Los que todavía no existen se muestran igual, apagados y con una línea
 * de qué van a contestar. Esconderlos haría que el panel parezca más
 * chico de lo que va a ser; mostrarlos como si funcionaran sería mentir.
 * Así se puede ver la forma completa del sistema y juzgar si va a ser
 * usable antes de terminar de construirlo.
 */
export type ModuleKey = "hoy" | "caja" | "salon";

export interface ModuleDef {
  key: ModuleKey | null;
  label: string;
  /** La pregunta que contesta, dicha como la diría una persona. */
  pregunta: string;
  soloSol?: boolean;
  listo: boolean;
}

export const MODULOS: { grupo: string; items: ModuleDef[] }[] = [
  {
    grupo: "Todos los días",
    items: [
      { key: "hoy", label: "Hoy", pregunta: "¿Quién viene y a qué hora?", listo: true },
      {
        key: "caja",
        label: "Los números",
        pregunta: "¿Cuánto entró y por dónde?",
        soloSol: true,
        listo: true,
      },
      { key: null, label: "Clientas", pregunta: "¿Qué le hice la última vez?", listo: false },
    ],
  },
  {
    grupo: "Cada tanto",
    items: [
      {
        key: "salon",
        label: "El salón",
        pregunta: "¿Cuánto sale y cuánto lleva cada cosa?",
        soloSol: true,
        listo: true,
      },
      {
        key: null,
        label: "Quién atiende",
        pregunta: "¿Cuánto produjo cada una?",
        soloSol: true,
        listo: false,
      },
      {
        key: null,
        label: "Proveedores",
        pregunta: "¿A quién le compro?",
        soloSol: true,
        listo: false,
      },
    ],
  },
];

export function ModuleNav({
  activo,
  isOwner,
  onElegir,
}: {
  activo: ModuleKey;
  isOwner: boolean;
  onElegir: (k: ModuleKey) => void;
}) {
  return (
    <nav aria-label="Módulos del panel" className="space-y-4">
      {MODULOS.map((grupo) => {
        const visibles = grupo.items.filter((m) => !m.soloSol || isOwner);
        if (visibles.length === 0) return null;

        return (
          <div key={grupo.grupo}>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              {grupo.grupo}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {visibles.map((m) => {
                const esActivo = m.key !== null && m.key === activo;
                return (
                  <button
                    key={m.label}
                    type="button"
                    disabled={!m.listo}
                    onClick={() => m.key && onElegir(m.key)}
                    title={m.pregunta}
                    className={
                      !m.listo
                        ? "cursor-default rounded-2xl border border-dashed border-border px-3 py-2 text-left opacity-55"
                        : esActivo
                          ? "rounded-2xl border border-champagne-deep bg-cream/70 px-3 py-2 text-left"
                          : "rounded-2xl border border-border bg-card px-3 py-2 text-left transition-colors hover:border-champagne"
                    }
                  >
                    <span className="block text-sm text-foreground">{m.label}</span>
                    <span className="block text-[11px] leading-tight text-muted-foreground">
                      {m.listo ? m.pregunta : "Todavía no"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );
}
