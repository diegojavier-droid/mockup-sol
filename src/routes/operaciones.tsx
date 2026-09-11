/**
 * `/operaciones` dejó de existir.
 *
 * Nunca fue una página: eran dos secciones de Servicios que quedaron
 * sueltas —tiempo entre turnos y días cerrados— en una pantalla cuyo
 * único botón de volver decía «← Volver al sitio público» y echaba del
 * panel a quien lo tocaba. Ahora son Servicios › Horarios, con migas
 * para subir.
 */
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/operaciones")({
  beforeLoad: () => {
    throw redirect({
      to: "/panel/$modulo/$seccion",
      params: { modulo: "servicios", seccion: "horarios" },
    });
  },
});
