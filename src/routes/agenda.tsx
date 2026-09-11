/**
 * La dirección vieja del panel.
 *
 * El panel dejó de ser una sola pantalla con el módulo guardado en un
 * `useState` y pasó a tener una dirección por sección. `/agenda` queda
 * como puerta: está escrita en los links que ya circulan, en la memoria
 * del navegador de quien lo usa todos los días, y —esto es lo que
 * obliga a tener cuidado— en la lista de Redirect URLs autorizadas del
 * proyecto de Supabase.
 *
 * POR QUÉ ESTO NO ES UN `redirect()` COMÚN
 *
 * Acá vuelve el link del mail, y vuelve con el código pegado en la
 * dirección (`?code=…`, o un `#error=…` si falló). `recuperarSesion()`
 * lee esa dirección ANTES de tocar Supabase, y el SDK necesita el código
 * ahí para canjearlo. Un redirect que tire la parte de atrás de la
 * dirección dejaría afuera a quien acaba de abrir su mail, que es el
 * camino principal de ingreso.
 *
 * Así que se reemplaza la dirección entera, con lo que traiga, y el
 * canje lo hace `/panel` como siempre.
 *
 * Mientras `emailRedirectTo` siga apuntando acá, este archivo no se
 * borra. Cambiarlo a `/panel` exige agregar esa URL en el dashboard de
 * Supabase primero: si no está en la lista, Supabase manda al Site URL y
 * el link del mail deja de entrar.
 */

import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/agenda")({
  component: AgendaVieja,
});

function AgendaVieja() {
  useEffect(() => {
    const { search, hash } = window.location;
    window.location.replace(`/panel/agenda/hoy${search}${hash}`);
  }, []);

  return null;
}
