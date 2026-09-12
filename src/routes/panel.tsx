/**
 * El panel interno: la puerta y el contexto de sesión.
 *
 * Esta ruta es el padre de todo lo que cuelga de `/panel`. Hace dos
 * cosas y nada más: decide si hay sesión, y si la hay, deja pasar. El
 * armazón —barra lateral, barra de abajo, migas— lo pone cada pantalla
 * con `PanelShell`, porque es la pantalla la que sabe en qué módulo y en
 * qué sección está.
 *
 * La autorización la decide el backend: guardar un token acá no da
 * acceso a nada. Esto sólo evita mostrar un panel vacío a quien todavía
 * no inició sesión.
 */

import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { SignIn } from "@/components/booking/admin/SignIn";
import { useStaffIdentity } from "@/lib/api/admin-hooks";
import { readStaffToken } from "@/lib/staff-session";
import { SesionPanelCtx } from "@/lib/panel-sesion";
import { recuperarSesion, salir } from "@/lib/staff-auth";

export const Route = createFileRoute("/panel")({
  component: PanelLayout,
});

function PanelLayout() {
  // Arranca en `false` a propósito, aunque el token ya esté guardado.
  //
  // El servidor no tiene `sessionStorage`, así que dibuja la pantalla de
  // ingreso; si el cliente arrancara en `true` diría otra cosa en su
  // primer dibujo y React tiraría todo el HTML del servidor para
  // rehacerlo («hydration failed»). Se leía el token acá desde antes de
  // este bloque y el desajuste venía de entonces; se vio al medirlo.
  //
  // El efecto de abajo lo pone en `true` apenas monta, que es cuando
  // `sessionStorage` existe de verdad.
  const [hasToken, setHasToken] = useState(false);
  // Por qué quedó afuera quien volvió del mail. Antes esto se descartaba
  // y el resultado era el peor de los mundos: el formulario de nuevo, sin
  // decir nada, pidiendo el correo que la persona acababa de escribir.
  const [problemaAlVolver, setProblemaAlVolver] = useState<string | null>(null);
  const identity = useStaffIdentity();
  const qc = useQueryClient();

  // Un token ya guardado —el de una pestaña que sigue abierta, o el que
  // inyecta la prueba de punta a punta— alcanza para entrar sin volver a
  // preguntarle nada a Supabase.
  useEffect(() => {
    if (readStaffToken()) setHasToken(true);
  }, []);

  // Al volver del link del mail —o de Google— Supabase canjea el código,
  // deja la sesión guardada y `recuperarSesion` la espeja en el token que
  // usa el cliente del panel. También cubre el caso de recargar la página
  // con una sesión que ya existía.
  useEffect(() => {
    if (hasToken) return;
    let vivo = true;
    void recuperarSesion().then(({ adentro, problema }) => {
      if (!vivo) return;
      setProblemaAlVolver(problema);
      if (!adentro) return;
      qc.removeQueries({ queryKey: ["admin", "me"] });
      setHasToken(true);
    });
    return () => {
      vivo = false;
    };
  }, [hasToken, qc]);

  if (!hasToken || identity.isError) {
    return (
      <SignIn
        onToken={() => {
          // Volver a preguntar quién es. Sin esto quedaba el error del
          // 401 anterior —el de cuando todavía no había token— y la
          // pantalla seguía mostrando el login para siempre: había que
          // recargar la página para poder entrar.
          qc.removeQueries({ queryKey: ["admin", "me"] });
          setHasToken(true);
        }}
        error={hasToken ? ((identity.error as Error | null) ?? null) : null}
        aviso={problemaAlVolver}
      />
    );
  }

  return (
    <SesionPanelCtx.Provider
      value={{
        identidad: identity.data,
        // `isPending` y no `isLoading`: mientras la consulta está
        // deshabilitada —no hay token todavía— también cuenta como «no
        // sé», y es justo el instante en que se dibuja la primera
        // pantalla.
        cargando: identity.isPending,
        cerrar: () => {
          void salir().then(() => setHasToken(false));
        },
      }}
    >
      <Outlet />
    </SesionPanelCtx.Provider>
  );
}
