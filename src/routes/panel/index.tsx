/**
 * Quien abre `/panel` sin pedir nada entra directo a Agenda › Hoy, que
 * es lo que se mira veinte veces por día.
 */
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/panel/")({
  beforeLoad: () => {
    throw redirect({
      to: "/panel/$modulo/$seccion",
      params: { modulo: "agenda", seccion: "hoy" },
    });
  },
});
