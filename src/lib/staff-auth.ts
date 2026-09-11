/**
 * Entrar al panel: un link al correo, y Google como alternativa.
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
        // POR QUÉ `localStorage` Y NO `sessionStorage`
        //
        // La primera versión usaba `sessionStorage` razonando que en un
        // mostrador compartido la sesión no debería sobrevivir a cerrar
        // el navegador. Suena prolijo y rompía el ingreso entero.
        //
        // PKCE guarda acá una clave temporal cuando se pide el link, y la
        // necesita después para canjear el código por la sesión.
        // `sessionStorage` es POR PESTAÑA, y el link del mail lo abre el
        // cliente de correo en una pestaña nueva: esa pestaña no tiene la
        // clave, el canje falla y quien entró vuelve a ver el formulario
        // sin entender por qué.
        //
        // Y aunque funcionara, obligaría a Sol a pedir un link por mail
        // cada mañana, con un tope de un par de correos por hora. El
        // mostrador compartido se resuelve con el botón «Salir», que ya
        // está, no dejando a todo el mundo afuera todos los días.
        storage: almacenamientoDelNavegador(),
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
 * `localStorage` puede tirar excepción —modo privado, almacenamiento
 * bloqueado—. Si eso pasa se devuelve `undefined` y Supabase usa su
 * propio almacenamiento en memoria: la sesión dura lo que dure la
 * pestaña, que es peor pero no rompe el ingreso.
 */
function almacenamientoDelNavegador(): Storage | undefined {
  try {
    const prueba = "__solmai__";
    window.localStorage.setItem(prueba, "1");
    window.localStorage.removeItem(prueba);
    return window.localStorage;
  } catch {
    return undefined;
  }
}

/**
 * Qué contarle a quien volvió del mail y no entró.
 *
 * Hay tres finales posibles al volver y hasta ahora los tres se veían
 * igual —el formulario otra vez, sin una palabra—, que es exactamente lo
 * que hizo imposible diagnosticar el primer intento:
 *
 *   1. Supabase rechazó el link y lo dice en la URL (`error_code`). El
 *      caso típico es `otp_expired`: el link ya se usó o pasaron las
 *      horas. Algunos clientes de correo previsualizan los links, y esa
 *      previsualización quema el link antes de que lo abra la persona.
 *   2. El link se canjeó pero el canje falló en silencio. PKCE deja una
 *      clave temporal en este navegador al pedir el link, y sin esa
 *      clave el código no sirve: pasa cuando el link se pide en la
 *      computadora y se abre en el teléfono.
 *   3. No volvió de ningún mail: entró de cero y todavía no pidió nada.
 *
 * Es una función aparte y sin `window` a propósito: así los tres finales
 * se pueden probar sin navegador.
 *
 * `adentro` es `null` cuando no se pudo ni intentar el canje —no hay
 * configuración de ingreso—, porque ahí la ausencia de sesión no prueba
 * que el link estuviera mal.
 */
export function explicarLaVuelta(entrada: {
  search: string;
  hash: string;
  adentro: boolean | null;
}): string | null {
  const query = new URLSearchParams(entrada.search.replace(/^\?/, ""));
  const hash = new URLSearchParams(entrada.hash.replace(/^#/, ""));
  const leer = (clave: string) => query.get(clave) ?? hash.get(clave);

  if (leer("error_code") === "otp_expired") {
    return "Ese link ya venció o se usó una vez. Pedite uno nuevo y abrilo apenas te llegue.";
  }
  if (leer("error_code") || leer("error")) {
    return "No pudimos completar el ingreso con ese link. Pedite uno nuevo.";
  }
  if (entrada.adentro === false && (query.has("code") || hash.has("code"))) {
    return "Ese link se abrió en otro navegador. Pedí uno nuevo desde el mismo navegador donde lo vas a abrir.";
  }
  return null;
}

/** Cómo terminó el intento de entrar, y qué decirle a quien quedó afuera. */
export interface EstadoDeIngreso {
  /** Hay sesión: el panel puede abrirse. */
  adentro: boolean;
  /** Qué salió mal, si salió algo mal. */
  problema: string | null;
}

/**
 * Levanta la sesión que ya exista y la espeja. Se llama al abrir el
 * panel: si Supabase venía con sesión guardada, Sol no tiene que volver
 * a entrar. Y si viene del link del mail, este es el momento en que
 * Supabase canjea el código por la sesión.
 */
export async function recuperarSesion(): Promise<EstadoDeIngreso> {
  // La URL se mira ANTES de tocar Supabase. Cuando el canje sale bien el
  // SDK la limpia, así que mirarla después no permitiría distinguir
  // «volvió del mail y falló» de «entró de cero».
  const search = typeof window === "undefined" ? "" : window.location.search;
  const hash = typeof window === "undefined" ? "" : window.location.hash;

  const supabase = await cliente();
  if (!supabase) {
    return { adentro: false, problema: explicarLaVuelta({ search, hash, adentro: null }) };
  }

  const { data } = await supabase.auth.getSession();
  const adentro = Boolean(data.session?.access_token);
  if (data.session?.access_token) writeStaffToken(data.session.access_token);

  const problema = explicarLaVuelta({ search, hash, adentro });
  // La URL queda con el error pegado; sin limpiarla, recargar repite el
  // mismo cartel para siempre y reintentar parece no hacer nada.
  if (problema) {
    try {
      window.history.replaceState({}, "", window.location.pathname);
    } catch {
      /* sin history el cartel se repite: molesto, no roto */
    }
  }

  return { adentro, problema };
}

/**
 * Pide un link de un solo uso al correo.
 *
 * POR QUÉ ESTE ES EL CAMINO PRINCIPAL Y NO GOOGLE
 *
 * Prueba lo mismo que probaría Google —que la casilla es suya, porque
 * para entrar hay que abrirla— sin exigir un cliente de OAuth en Google
 * Cloud ni que la persona tenga cuenta de Google.
 *
 * NO es «sin configurar nada afuera». Se dijo así una vez y era falso.
 * Supabase valida a dónde puede volver el link contra su lista de
 * Redirect URLs, y si `emailRedirectTo` no está en esa lista usa el Site
 * URL —que en un proyecto nuevo viene en `localhost:3000`—. Ese fue el
 * primer fallo real: el link llegaba y devolvía a una máquina que no
 * existía. Esas dos cosas se cargan a mano en Authentication → URL
 * Configuration y no hay forma de hacerlas desde acá.
 *
 * Lo otro que hay que saber: el correo de Supabase tiene un cupo de un
 * par de envíos por hora. Alcanza para probar y no para usarlo todos los
 * días; antes de que Sol dependa de esto hay que cargar un SMTP propio.
 *
 * SÍ crea la cuenta de Supabase si no existe, y tiene que ser así: la
 * primera vez que entra la administradora todavía no tiene ninguna. Eso
 * no regala nada. Tener cuenta de Supabase no abre el panel: el servidor
 * exige además una fila activa en `staff_members`, que se administra
 * desde adentro. Cualquiera puede pedirse un link y confirmar que el
 * mail es suyo; entrar es otra cosa.
 */
export async function pedirLinkPorMail(email: string): Promise<{ ok: boolean; mensaje?: string }> {
  const supabase = await cliente();
  if (!supabase) {
    return { ok: false, mensaje: "Todavía no está configurado el ingreso al panel." };
  }

  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: { emailRedirectTo: `${window.location.origin}/agenda` },
  });

  if (error) {
    // Supabase limita cuántos correos manda por hora. Vale la pena
    // distinguirlo: «probá de nuevo» a secas haría que alguien reintente
    // diez veces y empeore el bloqueo.
    const demasiados = error.status === 429 || /rate limit/i.test(error.message ?? "");
    return {
      ok: false,
      mensaje: demasiados
        ? "Se pidieron muchos links seguidos. Esperá unos minutos y volvé a intentar."
        : "No pudimos mandar el link. Avisale a quien administra el sistema.",
    };
  }
  return { ok: true };
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

/**
 * Con qué correo quedó identificada la sesión.
 *
 * Sirve para un solo caso, pero es el que deja a alguien trabado: la
 * identidad se aceptó y el acceso no. Sin decir con qué cuenta entró, la
 * pantalla pide el correo de nuevo y quien lo lee pide otro link —que no
 * va a arreglar nada y que además consume el cupo de correos por hora.
 */
export async function correoDeLaSesion(): Promise<string | null> {
  const supabase = await cliente();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.email ?? null;
}

export async function salir(): Promise<void> {
  clearStaffToken();
  const supabase = await cliente();
  // `scope: "local"` cierra la sesión de esta pestaña. Cerrarla en todos
  // los dispositivos es otra decisión, y es la que falta para poder
  // cortarle el acceso a un teléfono perdido.
  await supabase?.auth.signOut({ scope: "local" }).catch(() => undefined);
}
