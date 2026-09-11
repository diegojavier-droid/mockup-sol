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
import type { StaffIdentity } from "@/lib/staff-session";

export interface SesionPanel {
  identidad: StaffIdentity | undefined;
  cerrar: () => void;
}

export const SesionPanelCtx = createContext<SesionPanel | null>(null);

export function useSesionPanel(): SesionPanel {
  const ctx = useContext(SesionPanelCtx);
  if (!ctx) throw new Error("useSesionPanel se usa adentro de /panel");
  return ctx;
}
