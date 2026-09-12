/**
 * Quién está mirando el panel, disponible desde cualquier pantalla de
 * adentro.
 *
 * POR QUÉ ESTO NO VIVE EN `src/routes/panel.tsx`
 *
 * Ahí estuvo primero y no funcionaba. TanStack Start parte cada ruta en
 * dos al compilar —el archivo de la ruta por un lado y su componente por
 * otro (`?tsr-split=component`)—, así que un `createContext` declarado
 * en un archivo de ruta se instancia una vez por pedazo: el layout
 * guardaba la sesión en una copia del contexto y la sección la buscaba
 * en otra. El síntoma era «useSesionPanel se usa adentro de /panel» en
 * una pantalla que estaba, efectivamente, adentro de `/panel`.
 *
 * Un archivo común no se parte, así que el contexto es uno solo. Ésta es
 * la razón de que este archivo exista y no haya que volver a mudarlo
 * adentro de las rutas.
 */

import { createContext, useContext } from "react";
import { puede, type Modulo, type StaffIdentity } from "@/lib/staff-session";

export interface SesionPanel {
  identidad: StaffIdentity | undefined;
  /**
   * Todavía no volvió la respuesta de quién sos.
   *
   * Hace falta porque `identidad` vale `undefined` en dos situaciones
   * opuestas —no llegó, o llegó y no hay— y confundirlas le dice a Sol
   * que no tiene permiso en su propio panel mientras el pedido viaja.
   * Es el mismo error que el bloque anterior arregló en el servidor
   * entre el 401 y el 403, una capa más arriba.
   */
  cargando: boolean;
  cerrar: () => void;
}

export const SesionPanelCtx = createContext<SesionPanel | null>(null);

export function useSesionPanel(): SesionPanel {
  const ctx = useContext(SesionPanelCtx);
  if (!ctx) throw new Error("useSesionPanel se usa adentro de /panel");
  return ctx;
}

/** Qué corresponde dibujar en una sección del panel. */
export type QueMostrar = "esperando" | "sin-permiso" | "adelante";

/**
 * La decisión de si se abre una sección, separada de la pantalla para
 * poder probarla.
 *
 * Son TRES respuestas y no dos, y ahí estuvo el error: `identidad` vale
 * `undefined` tanto cuando la respuesta de quién sos no llegó como
 * cuando llegó y no alcanza, así que preguntarle sólo a `puede()` le
 * contestaba «no tenés permiso» a quien todavía no había sido
 * preguntado. Sol abría su propio panel y leía que le pidiera acceso a
 * quien administra el panel, que es ella.
 *
 * Esto NO es la frontera de seguridad: el servidor niega igual. Es para
 * que la pantalla no diga una cosa distinta de la puerta.
 */
export function queMostrar(
  sesion: Pick<SesionPanel, "identidad" | "cargando">,
  modulo: Modulo,
): QueMostrar {
  if (sesion.cargando) return "esperando";
  return puede(sesion.identidad, modulo) ? "adelante" : "sin-permiso";
}
