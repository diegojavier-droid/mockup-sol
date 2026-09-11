/**
 * `/panel/finanzas` sin sección no es un lugar: es el nombre de una
 * carpeta. Lleva a la primera sección que tenga pantalla.
 */
import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { buscarModulo, primeraSeccion } from "@/lib/panel-nav";

export const Route = createFileRoute("/panel/$modulo/")({
  beforeLoad: ({ params }) => {
    const modulo = buscarModulo(params.modulo);
    if (!modulo) throw notFound();
    throw redirect({
      to: "/panel/$modulo/$seccion",
      params: { modulo: modulo.slug, seccion: primeraSeccion(modulo).slug },
    });
  },
});
