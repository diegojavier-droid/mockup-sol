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
import { puede, type Modulo, type StaffIdentity } from "@/lib/staff-session";

export type ModuleKey = "calendario" | "finanzas" | "servicios" | "personas";

export interface ModuleDef {
  key: ModuleKey | null;
  label: string;
  /** Las secciones del módulo, tal como las fija §5.0 de la arquitectura. */
  secciones: string;
  /**
   * Qué módulo de la matriz de permisos gobierna esta entrada. Es el
   * mismo nombre que usa el servidor, así que la pantalla no puede
   * discrepar con la puerta: antes acá había un `soloSol` escrito a mano
   * que había que acordarse de actualizar dos veces.
   */
  modulo: Modulo;
  listo: boolean;
}

/**
 * El árbol de §5.0, confirmado por dirección el 2026-09-10.
 *
 * Los módulos se llaman por lo que son —Calendario, Finanzas— y no por
 * lo que preguntan: esa voz es la de la web de las clientas. Quien abre
 * el panel viene a encontrar algo, veinte veces por día.
 *
 * Debajo del nombre van las secciones, que es el nivel que evita que
 * nueve módulos se conviertan en nueve pestañas planas. Todavía se
 * navega por módulo; abrir cada sección por separado es el paso
 * siguiente.
 */
export const MODULOS: { grupo: string; items: ModuleDef[] }[] = [
  {
    grupo: "Todos los días",
    items: [
      { key: "calendario", label: "Calendario", secciones: "Hoy · Semana", modulo: "calendario", listo: true },
      { key: null, label: "Clientas", secciones: "Fichas · Consentimientos", modulo: "clientas", listo: false },
      {
        key: "finanzas",
        label: "Finanzas",
        secciones: "Caja del día · Devoluciones",
        modulo: "finanzas",
        listo: true,
      },
      { key: null, label: "Inventario", secciones: "Productos · Stock", modulo: "inventario", listo: false },
    ],
  },
  {
    grupo: "Cada tanto",
    items: [
      {
        key: "servicios",
        label: "Servicios",
        secciones: "Precios y tiempos · Puestos",
        modulo: "servicios",
        listo: true,
      },
      {
        key: null,
        label: "Personal",
        secciones: "Empleados · Producción",
        modulo: "personal",
        listo: false,
      },
      {
        key: null,
        label: "Compras",
        secciones: "Proveedores · Pedidos",
        modulo: "compras",
        listo: false,
      },
    ],
  },
  {
    grupo: "Casi nunca, pero tiene que estar",
    items: [
      {
        key: "personas",
        label: "Usuarios y roles",
        secciones: "Personas · Roles · Registro de cambios",
        modulo: "usuarios",
        listo: true,
      },
      {
        key: null,
        label: "Configuración",
        secciones: "Datos del negocio · Términos",
        modulo: "configuracion",
        listo: false,
      },
    ],
  },
];

export function ModuleNav({
  activo,
  identidad,
  onElegir,
}: {
  activo: ModuleKey;
  identidad: StaffIdentity | undefined;
  onElegir: (k: ModuleKey) => void;
}) {
  return (
    <nav aria-label="Módulos del panel" className="space-y-4">
      {MODULOS.map((grupo) => {
        const visibles = grupo.items.filter((m) => puede(identidad, m.modulo));
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
                    title={m.secciones}
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
                      {m.listo ? m.secciones : "Todavía no"}
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
