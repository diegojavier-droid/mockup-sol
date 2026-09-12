/**
 * Una sección del panel: `/panel/agenda/hoy`, `/panel/finanzas/caja`.
 *
 * Ésta es la ruta que arregla el problema de fondo. Antes el módulo
 * activo vivía en un `useState`, así que las cuatro pantallas del panel
 * eran la misma dirección: el botón «atrás» del navegador no volvía, no
 * se podía mandar un link diciendo «mirá esto», y recargar te dejaba
 * donde el sistema quisiera. Ahora cada sección es un lugar.
 *
 * Qué módulos y secciones existen lo dice `@/lib/panel-nav`; qué se ve
 * en cada una lo dice `secciones.tsx`. Acá sólo se resuelve la dirección
 * contra el árbol y se decide qué pasa cuando no cierra.
 */

import { createFileRoute, notFound } from "@tanstack/react-router";
import { PanelShell } from "@/components/booking/admin/PanelShell";
import { contenidoDe } from "@/components/booking/admin/secciones";
import { buscarModulo, buscarSeccion } from "@/lib/panel-nav";
import { queMostrar, useSesionPanel } from "@/lib/panel-sesion";

export const Route = createFileRoute("/panel/$modulo/$seccion")({
  // Una dirección que no existe en el árbol es un 404 antes de dibujar
  // nada. Sin esto, `/panel/inventado/cosa` mostraría el armazón vacío,
  // que es peor que decir que no está.
  beforeLoad: ({ params }) => {
    const modulo = buscarModulo(params.modulo);
    if (!modulo || !buscarSeccion(modulo, params.seccion)) throw notFound();
  },
  head: ({ params }) => {
    const modulo = buscarModulo(params.modulo);
    const seccion = modulo && buscarSeccion(modulo, params.seccion);
    return {
      meta: [
        {
          title:
            modulo && seccion ? `Sol Mai · ${modulo.label} › ${seccion.label}` : "Sol Mai · Panel",
        },
      ],
    };
  },
  component: SeccionRoute,
});

function SeccionRoute() {
  const params = Route.useParams();
  const { identidad, cargando, cerrar } = useSesionPanel();

  const modulo = buscarModulo(params.modulo)!;
  const seccion = buscarSeccion(modulo, params.seccion)!;

  // El permiso se vuelve a mirar acá aunque el armazón ya esconda lo que
  // no corresponde: esconder no es una frontera, y la dirección se puede
  // escribir a mano. El servidor niega igual; esto es para que la
  // pantalla no discrepe con la puerta.
  //
  // MIENTRAS NO SE SABE, NO SE DECIDE
  //
  // `identidad` vale `undefined` tanto si la respuesta no llegó como si
  // llegó y no hay permisos, y `puede()` contesta que no a las dos. Sin
  // separarlas, Sol abría su propio panel y leía «esto no es tuyo»
  // durante todo lo que tardara el pedido —que con el Worker frío o
  // desde el teléfono en la calle no es un parpadeo—. Decir que no por
  // no saber todavía es el peor error posible acá: el cartel dice que le
  // pida acceso a quien administra el panel, y quien administra el panel
  // es ella.
  const que = queMostrar({ identidad, cargando }, modulo.permiso);
  const contenido = que === "adelante" ? contenidoDe(modulo.slug, seccion.slug) : null;

  return (
    <PanelShell modulo={modulo} seccion={seccion} identidad={identidad} onSalir={cerrar}>
      {que === "esperando" ? (
        <p className="text-sm text-muted-foreground">Un segundo…</p>
      ) : que === "sin-permiso" ? (
        <Cartel
          titulo="Esto no es tuyo"
          texto={`Tu rol no tiene acceso a ${modulo.label}. El acceso lo da quien administra el panel.`}
        />
      ) : (
        (contenido ?? (
          <Cartel
            titulo="Todavía no"
            texto={`${modulo.label} › ${seccion.label} está en el árbol del sistema pero todavía no tiene pantalla.`}
          />
        ))
      )}
    </PanelShell>
  );
}

/**
 * Las secciones que están en el árbol y todavía no existen dicen que no
 * existen, en vez de mostrar una pantalla en blanco. El boceto decidió
 * mostrarlas: esconderlas haría parecer el sistema más chico de lo que
 * va a ser.
 */
function Cartel({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border px-5 py-10 text-center">
      <p className="font-serif text-lg text-foreground">{titulo}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">{texto}</p>
    </div>
  );
}
