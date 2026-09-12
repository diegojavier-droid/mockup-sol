/**
 * «Más», en el teléfono.
 *
 * No es un menú escondido: es una pantalla completa, con el nombre de
 * cada módulo y qué hay adentro. Los que todavía no existen se ven,
 * apagados y dichos —esconderlos haría parecer el sistema más chico de
 * lo que va a ser—, y el separador marca el corte de frecuencia sin
 * ponerle nombre: es lo que reemplaza a «Casi nunca, pero tiene que
 * estar».
 *
 * En la computadora esta pantalla no hace falta, porque los nueve
 * módulos están siempre a la izquierda. Igual funciona si se entra por
 * la dirección.
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { BarraAbajo } from "@/components/booking/admin/PanelShell";
import { ARBOL, primeraSeccion } from "@/lib/panel-nav";
import { puede } from "@/lib/staff-session";
import { useSesionPanel } from "@/lib/panel-sesion";

export const Route = createFileRoute("/panel/mas")({
  head: () => ({ meta: [{ title: "Sol Mai · Panel" }] }),
  component: MasRoute,
});

function MasRoute() {
  const { identidad, cargando, cerrar } = useSesionPanel();
  // Sin identidad no pasa ningún módulo el filtro, así que mientras el
  // pedido viaja esta pantalla quedaba en blanco y sin decir por qué.
  const visibles = cargando ? [] : ARBOL.filter((m) => puede(identidad, m.permiso));

  return (
    <div className="min-h-svh bg-background pb-24">
      <header className="border-b border-border bg-card px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav aria-label="Dónde estás" className="flex items-center gap-2 text-sm">
            <Link to="/panel" className="text-muted-foreground hover:underline">
              Panel
            </Link>
            <span aria-hidden="true" className="text-muted-foreground">
              ›
            </span>
            <span className="font-medium text-foreground">Más</span>
          </nav>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {identidad && (
              <span>
                {identidad.displayName}
                {identidad.roleName ? ` · ${identidad.roleName.toLowerCase()}` : ""}
              </span>
            )}
            <button type="button" onClick={cerrar} className="underline-offset-4 hover:underline">
              Salir
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
        {cargando && <p className="text-sm text-muted-foreground">Un segundo…</p>}
        <ul className="space-y-2">
          {visibles.map((m) => {
            const hayPantalla = m.secciones.some((s) => s.listo);
            const adentro = m.secciones.map((s) => s.label).join(" · ");

            return (
              <li key={m.slug}>
                {hayPantalla ? (
                  <Link
                    to="/panel/$modulo/$seccion"
                    params={{ modulo: m.slug, seccion: primeraSeccion(m).slug }}
                    className="block rounded-2xl border border-border bg-card px-4 py-3 transition-colors hover:border-champagne"
                  >
                    <span className="block text-sm text-foreground">{m.label}</span>
                    <span className="mt-0.5 block text-xs leading-tight text-muted-foreground">
                      {adentro}
                    </span>
                  </Link>
                ) : (
                  <span className="block cursor-default rounded-2xl border border-dashed border-border px-4 py-3 opacity-55">
                    <span className="block text-sm text-foreground">{m.label}</span>
                    <span className="mt-0.5 block text-xs leading-tight text-muted-foreground">
                      Todavía no · {adentro}
                    </span>
                  </span>
                )}
                {m.cortaDespues && <hr className="my-3 border-border" />}
              </li>
            );
          })}
        </ul>
      </div>

      <BarraAbajo identidad={identidad} activo="mas" />
    </div>
  );
}
