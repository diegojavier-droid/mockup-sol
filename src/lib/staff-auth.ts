/**
 * Entrar al panel con Google.
 *
 * Hasta este bloque, la pantalla de ingreso pedía que alguien pegara a
 * mano un token de sesión de Supabase. Funcionaba para probar, pero
 * significaba que Sol no podía entrar sola a su propio sistema: todo lo
 * que se construyó —Personas, Roles, Facturación— quedaba detrás de un
 * campo que sólo sabe llenar quien tiene la consola abierta.
 *
 * CÓMO SE REPARTE EL TRABAJO
 *
 * Supabase maneja la sesión —el flujo PKCE, el `refresh_token`, renovar
 * el `access_token` antes de que venza— porque escribir eso a mano es
 * exactamente el tipo de código donde los errores no se ven hasta que
 * alguien queda afuera. Nosotros sólo espejamos el `access_token` vigente
 * en la misma clave que el cliente del panel ya leía.
 *
 * Ese espejo es a propósito y va en una sola dirección: Supabase es dueño
 * de la sesión, `sol-mai-staff-token` es una copia de lectura. Así el
 * cliente de la API no cambia, y las pruebas que inyectan un token
 * directamente siguen andando sin saber que Supabase existe.
 *
 * LO QUE ESTO NO CAMBIA
 *
 * Entrar con Google prueba QUIÉN es, no que tenga permiso. El servidor
 * sigue exigiendo una fila activa en `staff_members`, y sigue revisando
 * el proveedor. Cualquiera puede crearse una cuenta de Google; nadie
 * entra al panel por eso.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { clearStaffToken, writeStaffToken } from "./staff-session";

export interface PanelAuthConfig {
  supabaseUrl: string;
  publishableKey: string;
  proveedores: string[];
}

let configPrometida: Promise<PanelAuthConfig | null> | null = null;
let clientePrometido: Promise<SupabaseClient | null> | null = null;

/**
 * La configuración la sirve el Worker, no el build: así el sitio
 * publicado y el servidor que lo atiende no pueden apuntar a proyectos
 * distintos sin que nadie se entere.
 */
export function leerConfig(): Promise<PanelAuthConfig | null> {
  configPrometida ??= (async () => {
    try {
      const res = await fetch("/api/v1/auth/panel-config");
      if (!res.ok) return null;
      const { data } = (await res.json()) as { data?: PanelAuthConfig };
      if (!data?.supabaseUrl || !data?.publishableKey) return null;
      return data;
    } catch {
      return null;
    }
  })();
  return configPrometida;
}

/**
 * El cliente se arma una sola vez y recién cuando hace falta: importar
 * Supabase de entrada lo metería en el bundle de la web de las clientas,
 * que no lo usa para nada.
 */
async function cliente(): Promise<SupabaseClient | null> {
  clientePrometido ??= (async () => {
    const config = await leerConfig();
    if (!config) return null;

    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(config.supabaseUrl, config.publishableKey, {
      auth: {
        // PKCE y no el flujo implícito: con el implícito los tokens
        // vuelven en el fragmento de la URL y quedan en el historial.
        flowType: "pkce",
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        // Igual que antes: en un mostrador compartido la sesión no
        // debería sobrevivir a cerrar el navegador.
        storage: almacenamientoDeLaPestania(),
      },
    });

    // El espejo. `onAuthStateChange` avisa también cuando Supabase renovó
    // el token solo, que es lo que evita que a Sol se le corte la sesión
    // a la hora sin explicación.
    supabase.auth.onAuthStateChange((_evento, sesion) => {
      if (sesion?.access_token) writeStaffToken(sesion.access_token);
      else clearStaffToken();
    });

    return supabase;
  })();
  return clientePrometido;
}

/**
 * `sessionStorage` puede tirar excepción —modo privado, almacenamiento
 * bloqueado—. Si eso pasa, la sesión dura lo que dure la pestaña en vez
 * de romper el ingreso entero.
 */
function almacenamientoDeLaPestania(): Storage | undefined {
  try {
    const prueba = "__solmai__";
    window.sessionStorage.setItem(prueba, "1");
    window.sessionStorage.removeItem(prueba);
    return window.sessionStorage;
  } catch {
    return undefined;
  }
}

/**
 * Levanta la sesión que ya exista y la espeja. Se llama al abrir el
 * panel: si Supabase venía con sesión guardada, Sol no tiene que volver
 * a entrar.
 */
export async function recuperarSesion(): Promise<boolean> {
  const supabase = await cliente();
  if (!supabase) return false;
  const { data } = await supabase.auth.getSession();
  if (data.session?.access_token) {
    writeStaffToken(data.session.access_token);
    return true;
  }
  return false;
}

export async function entrarConGoogle(): Promise<{ ok: boolean; mensaje?: string }> {
  const supabase = await cliente();
  if (!supabase) {
    return { ok: false, mensaje: "Todavía no está configurado el ingreso con Google." };
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/agenda`,
      // Que Google vuelva a preguntar con qué cuenta: en un salón donde
      // el navegador es compartido, entrar sin elegir es entrar con la
      // cuenta de la persona anterior.
      queryParams: { prompt: "select_account" },
    },
  });

  if (error) {
    // El mensaje de Supabase viene en inglés y suele ser de configuración
    // («provider is not enabled»), que no le dice nada a quien lo lee.
    return {
      ok: false,
      mensaje: "No pudimos abrir el ingreso con Google. Avisale a quien administra el sistema.",
    };
  }
  return { ok: true };
}

export async function salir(): Promise<void> {
  clearStaffToken();
  const supabase = await cliente();
  // `scope: "local"` cierra la sesión de esta pestaña. Cerrarla en todos
  // los dispositivos es otra decisión, y es la que falta para poder
  // cortarle el acceso a un teléfono perdido.
  await supabase?.auth.signOut({ scope: "local" }).catch(() => undefined);
}
