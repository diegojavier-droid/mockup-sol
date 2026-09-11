/**
 * El armazón del panel: lo que no cambia cuando cambiás de pantalla.
 *
 * Tres piezas, y las tres salen del mismo árbol (`@/lib/panel-nav`):
 *
 * 1. En la computadora, los nueve módulos a la izquierda, siempre a la
 *    vista. Sin rótulos de grupo: el orden sigue siendo el de la
 *    frecuencia de uso, pero la etiqueta que lo nombraba se fue porque
 *    describía al sistema en vez de ayudar a encontrar. Quedan dos
 *    separadores mudos.
 *
 * 2. En el teléfono, cuatro destinos fijos abajo —Agenda, Clientas,
 *    Finanzas y Más— que no se mueven nunca. Cada uno lleva dibujo Y
 *    palabra: un icono solo es ambiguo, y acá eso importa más que en
 *    otros productos.
 *
 * 3. Migas de pan. Son el arreglo del «volver»: cada paso es un lugar al
 *    que se puede subir. Antes el único botón de volver del panel decía
 *    «← Volver al sitio público» y te echaba.
 *
 * LO QUE ESTE ARCHIVO NO HACE
 *
 * No decide qué puede ver cada persona: eso lo decide el servidor, que
 * niega el pedido igual. Acá sólo se esconde lo que el permiso no deja
 * pasar, para no mostrarle a nadie puertas cerradas todos los días.
 */

import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  ARBOL,
  BARRA_TELEFONO,
  buscarModulo,
  primeraSeccion,
  type ModuloDef,
  type Seccion,
} from "@/lib/panel-nav";
import { puede, type StaffIdentity } from "@/lib/staff-session";

/* Dibujos de la barra de abajo. Trazo simple, heredan el color del
   texto: no son ilustraciones, son señales. */
const ICONOS: Record<string, ReactNode> = {
  agenda: (
    <>
      <rect x="3" y="4.5" width="14" height="12.5" rx="2" />
      <path d="M3 8.5h14M7 2.5v4M13 2.5v4" />
    </>
  ),
  clientas: (
    <>
      <circle cx="10" cy="7" r="3.2" />
      <path d="M4 17c0-3.2 2.7-5.2 6-5.2s6 2 6 5.2" />
    </>
  ),
  finanzas: (
    <>
      <rect x="2.5" y="5" width="15" height="10" rx="2" />
      <circle cx="10" cy="10" r="2.4" />
    </>
  ),
  mas: (
    <>
      <circle cx="4.5" cy="10" r="1.4" />
      <circle cx="10" cy="10" r="1.4" />
      <circle cx="15.5" cy="10" r="1.4" />
    </>
  ),
};

function Icono({ nombre }: { nombre: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {ICONOS[nombre]}
    </svg>
  );
}

export function PanelShell({
  modulo,
  seccion,
  identidad,
  onSalir,
  children,
}: {
  modulo: ModuloDef;
  seccion: Seccion;
  identidad: StaffIdentity | undefined;
  onSalir: () => void;
  children: ReactNode;
}) {
  const visibles = ARBOL.filter((m) => puede(identidad, m.permiso));
  const secciones = modulo.secciones;

  return (
    <div className="min-h-svh bg-background lg:flex">
      {/* ---------- la computadora: los nueve módulos a la izquierda ---------- */}
      <nav
        aria-label="Módulos del panel"
        className="hidden w-56 shrink-0 border-r border-border bg-card lg:flex lg:flex-col"
      >
        <Link to="/" className="block px-4 py-5 font-serif text-lg text-foreground">
          Sol Mai
        </Link>
        <div className="flex-1 space-y-0.5 px-2 pb-4">
          {visibles.map((m) => (
            <div key={m.slug}>
              <EntradaLateral modulo={m} activo={m.slug === modulo.slug} />
              {m.cortaDespues && <hr className="my-2 border-border" />}
            </div>
          ))}
        </div>
      </nav>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* ---------- migas, quién sos, y salir ---------- */}
        <header className="border-b border-border bg-card px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Migas modulo={modulo} seccion={seccion} />
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              {identidad && (
                <span className="hidden sm:inline">
                  {identidad.displayName}
                  {identidad.roleName ? ` · ${identidad.roleName.toLowerCase()}` : ""}
                </span>
              )}
              <button
                type="button"
                onClick={onSalir}
                className="underline-offset-4 hover:underline"
              >
                Salir
              </button>
            </div>
          </div>
        </header>

        {/* ---------- las secciones del módulo abierto ----------
            En el teléfono la fila se desliza de verdad: la primera
            versión del boceto decía «se desliza» en un comentario y
            tenía `overflow: hidden`, así que lo cortado era
            inalcanzable. */}
        {secciones.length > 1 && (
          <div className="border-b border-border bg-card">
            <nav
              aria-label={`Secciones de ${modulo.label}`}
              className="flex gap-2 overflow-x-auto px-4 py-2 sm:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {secciones.map((s) =>
                s.listo ? (
                  <Link
                    key={s.slug}
                    to="/panel/$modulo/$seccion"
                    params={{ modulo: modulo.slug, seccion: s.slug }}
                    aria-current={s.slug === seccion.slug ? "page" : undefined}
                    className={
                      s.slug === seccion.slug
                        ? "shrink-0 rounded-full border border-champagne-deep bg-champagne/40 px-4 py-1.5 text-sm text-foreground"
                        : "shrink-0 rounded-full border border-border px-4 py-1.5 text-sm text-muted-foreground transition-colors hover:border-champagne"
                    }
                  >
                    {s.label}
                  </Link>
                ) : (
                  <span
                    key={s.slug}
                    title="Todavía no"
                    className="shrink-0 cursor-default rounded-full border border-dashed border-border px-4 py-1.5 text-sm text-muted-foreground opacity-55"
                  >
                    {s.label}
                  </span>
                ),
              )}
            </nav>
          </div>
        )}

        {/* `pb-24` en el teléfono deja lugar para la barra de abajo, que
            es fija: sin eso tapa la última fila de cada lista. */}
        <main className="flex-1 px-4 py-6 pb-24 sm:px-6 lg:pb-6">
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>
      </div>

      <BarraAbajo identidad={identidad} activo={modulo.slug} />
    </div>
  );
}

/**
 * Los cuatro destinos fijos del teléfono. No se mueven nunca: lo único
 * que cambia es cuál está encendido.
 *
 * Vive afuera de `PanelShell` porque la pantalla «Más» también la
 * necesita y no tiene módulo abierto.
 */
export function BarraAbajo({
  identidad,
  activo,
}: {
  identidad: StaffIdentity | undefined;
  /** El slug del módulo abierto, o «mas» en la pantalla Más. */
  activo: string;
}) {
  return (
    <nav
      aria-label="Ir a"
      className="fixed inset-x-0 bottom-0 z-20 flex border-t border-border bg-card pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      {BARRA_TELEFONO.map((slug) => {
        const m = buscarModulo(slug)!;
        if (!puede(identidad, m.permiso)) return null;
        return (
          <DestinoAbajo
            key={slug}
            modulo={m}
            activo={m.slug === activo}
            icono={<Icono nombre={slug} />}
          />
        );
      })}
      <Link
        to="/panel/mas"
        aria-current={activo === "mas" ? "page" : undefined}
        className={
          activo === "mas"
            ? "flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium text-foreground"
            : "flex flex-1 flex-col items-center gap-1 py-2 text-[11px] text-muted-foreground"
        }
      >
        <Icono nombre="mas" />
        <span>Más</span>
      </Link>
    </nav>
  );
}

function EntradaLateral({ modulo, activo }: { modulo: ModuloDef; activo: boolean }) {
  const destino = primeraSeccion(modulo);
  const hayPantalla = modulo.secciones.some((s) => s.listo);

  if (!hayPantalla) {
    return (
      <span
        title="Todavía no"
        className="block cursor-default rounded-xl px-3 py-2 text-sm text-muted-foreground opacity-55"
      >
        {modulo.label}
      </span>
    );
  }

  return (
    <Link
      to="/panel/$modulo/$seccion"
      params={{ modulo: modulo.slug, seccion: destino.slug }}
      aria-current={activo ? "page" : undefined}
      className={
        activo
          ? "block rounded-xl bg-champagne/40 px-3 py-2 text-sm text-foreground"
          : "block rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-cream/60 hover:text-foreground"
      }
    >
      {modulo.label}
    </Link>
  );
}

function DestinoAbajo({
  modulo,
  activo,
  icono,
}: {
  modulo: ModuloDef;
  activo: boolean;
  icono: ReactNode;
}) {
  const hayPantalla = modulo.secciones.some((s) => s.listo);

  // Apagada y a la vista: se decidió mostrar el tamaño real del sistema
  // antes que una barra que cambia de forma el día que Clientas llegue.
  if (!hayPantalla) {
    return (
      <span
        aria-disabled="true"
        title="Todavía no"
        className="flex flex-1 cursor-default flex-col items-center gap-1 py-2 text-[11px] text-muted-foreground opacity-45"
      >
        {icono}
        <span>{modulo.label}</span>
      </span>
    );
  }

  return (
    <Link
      to="/panel/$modulo/$seccion"
      params={{ modulo: modulo.slug, seccion: primeraSeccion(modulo).slug }}
      aria-current={activo ? "page" : undefined}
      className={
        activo
          ? "flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium text-foreground"
          : "flex flex-1 flex-col items-center gap-1 py-2 text-[11px] text-muted-foreground"
      }
    >
      {icono}
      <span>{modulo.label}</span>
    </Link>
  );
}

/**
 * Migas de pan.
 *
 * Cada paso anterior es un link que sube un nivel. El último es dónde
 * estás y no se toca: un link a la pantalla que ya estás mirando no
 * lleva a ningún lado.
 */
function Migas({ modulo, seccion }: { modulo: ModuloDef; seccion: Seccion }) {
  return (
    <nav aria-label="Dónde estás" className="flex items-center gap-2 text-sm">
      <Link to="/panel" className="text-muted-foreground hover:underline">
        Panel
      </Link>
      <span aria-hidden="true" className="text-muted-foreground">
        ›
      </span>
      <Link
        to="/panel/$modulo/$seccion"
        params={{ modulo: modulo.slug, seccion: primeraSeccion(modulo).slug }}
        className="text-muted-foreground hover:underline"
      >
        {modulo.label}
      </Link>
      <span aria-hidden="true" className="text-muted-foreground">
        ›
      </span>
      <span className="font-medium text-foreground">{seccion.label}</span>
    </nav>
  );
}

export { Migas };
