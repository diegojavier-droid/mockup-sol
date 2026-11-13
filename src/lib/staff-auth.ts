/**
 * Entrar al panel: correo y contraseña, con link y Google como alternativas.
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

import { StaffAuthStorage, StaffAuthPersistence, authDeadline, staffAuthFetch, finishStaffLogout, createStaffAuthMirror, type StaffLogoutResult } from "./staff-auth-lifecycle";
import type { SupabaseClient } from "@supabase/supabase-js";
import { clearStaffToken, writeStaffToken, subscribeStaffExpiration } from "./staff-session";

export interface PanelAuthConfig {
  supabaseUrl: string;
  publishableKey: string;
  proveedores: string[];
}

let configPrometida: Promise<PanelAuthConfig | null> | null = null;
let clientePrometido: Promise<SupabaseClient | null> | null = null;
let epoch = 0;
const persistence=new StaffAuthPersistence();
let activeClient: SupabaseClient | null = null;
let activeStorage: StaffAuthStorage | null = null;
let unsubscribeAuth: (() => void) | null = null;
let removeStorageListener: (() => void) | null = null;
let closing: Promise<StaffLogoutResult> | null = null;
function disposeRetired(retired: ReturnType<typeof retireClient>) {
  retired.storage?.dispose();
  // Never await SDK auth work inside its own event callback.
  queueMicrotask(() => { void retired.client?.auth.stopAutoRefresh().catch(() => undefined); void retired.client?.auth.dispose().catch(() => undefined); });
}
subscribeStaffExpiration(() => { void salir(); });
function vigente(generation:number) { return generation === epoch && (!activeStorage || activeStorage.current()); }
function retireClient(broadcast=true) {
  epoch++;
  unsubscribeAuth?.(); unsubscribeAuth=null;
  removeStorageListener?.(); removeStorageListener=null;
  const client=activeClient, storage=activeStorage;
  activeClient=null; activeStorage=null; clientePrometido=null;
  const localCleared=storage?.retire(broadcast) ?? persistence.canRestore();
  persistence.recordCleanup(localCleared);
  clearStaffToken();
  return {client,storage,localCleared};
}

/**
 * La configuración la sirve el Worker, no el build: así el sitio
 * publicado y el servidor que lo atiende no pueden apuntar a proyectos
 * distintos sin que nadie se entere.
 */
export function leerConfig(): Promise<PanelAuthConfig | null> {
  configPrometida ??= (async () => {
    try {
      const res = await staffAuthFetch("/api/v1/auth/panel-config");
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
async function cliente(explicitLogin=false): Promise<SupabaseClient | null> {
  if (!persistence.canRestore() && !explicitLogin && !activeClient) return null;
  const generation=epoch;
  if (closing) await closing;
  if (!persistence.canRestore() && !explicitLogin && !activeClient) return null;
  if (generation !== epoch) return null;
  clientePrometido ??= (async () => {
    const config = await leerConfig();
    if (!config || generation !== epoch) return null;

    const { createClient } = await import("@supabase/supabase-js");
    if (generation !== epoch) return null;
    const storageKey = `sb-${new URL(config.supabaseUrl).hostname.split(".")[0]}-auth-token`;
    const storage = new StaffAuthStorage(persistence.canRestore() ? almacenamientoDelNavegador() : undefined, storageKey);
    activeStorage=storage;
    const supabase = createClient(config.supabaseUrl, config.publishableKey, {
      global: { fetch: ((input:RequestInfo|URL,init?:RequestInit) => staffAuthFetch(input,init)) as typeof fetch },
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
        storageKey,
        storage,
      },
    });

    // El espejo. `onAuthStateChange` avisa también cuando Supabase renovó
    // el token solo, que es lo que evita que a Sol se le corte la sesión
    // a la hora sin explicación.
    activeClient=supabase;
    const {data:{subscription}} = supabase.auth.onAuthStateChange(createStaffAuthMirror({
      current:() => vigente(generation), matchesToken:token => storage.matchesAccessToken(token),
      isEmpty:() => storage.shouldEndSession(), token:writeStaffToken, empty:clearStaffToken,
      signedOut:() => { if (storage.shouldEndSession()) disposeRetired(retireClient(false)); },
    }));

    unsubscribeAuth=() => subscription.unsubscribe();
    if (typeof window !== "undefined") {
      const changed = (event:StorageEvent) => {
        const sessionRemoved=event.key === null || (event.key === storage.key && event.newValue === null);
        if (!sessionRemoved && event.key !== storage.markerKey) return;
        if (!storage.shouldEndSession()) return;
        disposeRetired(retireClient(false));
      };
      window.addEventListener("storage",changed);
      removeStorageListener=() => window.removeEventListener("storage",changed);
    }
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
  const generation=epoch;
  // La URL se mira ANTES de tocar Supabase. Cuando el canje sale bien el
  // SDK la limpia, así que mirarla después no permitiría distinguir
  // «volvió del mail y falló» de «entró de cero».
  const search = typeof window === "undefined" ? "" : window.location.search;
  const hash = typeof window === "undefined" ? "" : window.location.hash;

  const supabase = await cliente();
  if (!supabase) {
    await leerSesionVigente(null, () => vigente(generation));
    return { adentro: false, problema: explicarLaVuelta({ search, hash, adentro: null }) };
  }

  const response = await leerSesionVigente(supabase.auth, () => vigente(generation));
  if (!response) return {adentro:false,problema:null};
  const {data} = response;
  if (data.session?.access_token && !activeStorage?.matchesAccessToken(data.session.access_token)) return {adentro:false,problema:null};
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

export const ERROR_INGRESO = "No pudimos iniciar sesión. Revisá los datos o consultá con quien administra el panel.";

export function correoValido(email: string): boolean {
  return email.trim().length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/** Dependencias estrechas para probar sin red ni credenciales reales. */
export function crearIngresoConContrasena(deps: {
  config: () => Promise<PanelAuthConfig | null>;
  cliente: () => Promise<Pick<SupabaseClient, "auth"> | null>;
  guardarToken: (token: string) => void;
  generation?: () => number;
  beginTransition?: () => number;
  matchesToken?: (token:string) => boolean;
  vigente?: (generation:number) => boolean;
}) {
  return async (email: string, password: string): Promise<{ok: boolean; mensaje?: string}> => {
    if (!correoValido(email) || !password || password.length > 1024) return {ok: false, mensaje: ERROR_INGRESO};
    const generation=deps.beginTransition?.() ?? deps.generation?.() ?? 0;
    try {
      const config = await deps.config();
      if ((deps.vigente && !deps.vigente(generation)) || !config?.proveedores?.includes("email")) return {ok: false, mensaje: ERROR_INGRESO};
      const supabase = await deps.cliente();
      if (!supabase || (deps.vigente && !deps.vigente(generation))) return {ok: false, mensaje: ERROR_INGRESO};
      const {data, error} = await supabase.auth.signInWithPassword({email: email.trim(), password});
      if (error || !data.session?.access_token || (deps.vigente && !deps.vigente(generation))) return {ok: false, mensaje: ERROR_INGRESO};
      if (deps.matchesToken && !deps.matchesToken(data.session.access_token)) return {ok:false,mensaje:ERROR_INGRESO};
      deps.guardarToken(data.session.access_token);
      return {ok: true};
    } catch {
      return {ok: false, mensaje: ERROR_INGRESO};
    }
  };
}

/** Identifica solamente. El backend todavía debe autorizar el acceso al panel. */
export const entrarConContrasena = crearIngresoConContrasena({
  config: leerConfig, cliente:() => cliente(true), guardarToken: writeStaffToken,
  matchesToken:token => activeStorage?.matchesAccessToken(token) ?? false, generation:() => epoch, vigente,
  beginTransition:() => {
    // A different login is a new SDK/storage lifecycle, not an ordinary refresh.
    disposeRetired(retireClient());
    return epoch;
  },
});

/**
 * Pide un link de un solo uso al correo.
 *
 * ALTERNATIVA AL INGRESO CON CONTRASEÑA
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
 * No crea cuentas: el equipo debe tener su cuenta habilitada previamente.
 */
export async function pedirLinkPorMail(email: string): Promise<{ ok: boolean; mensaje?: string }> {
  const supabase = await cliente(true);
  if (!supabase) {
    return { ok: false, mensaje: "Todavía no está configurado el ingreso al panel." };
  }

  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}/agenda` },
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
  const supabase = await cliente(true);
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
  const generation=epoch;
  const supabase = await cliente();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return vigente(generation) && data.session?.access_token && activeStorage?.matchesAccessToken(data.session.access_token) ? data.session.user?.email ?? null : null;
}

/** Reject late getSession results before restoring an access-token mirror. */
export async function leerSesionVigente(
  auth: Pick<SupabaseClient["auth"],"getSession"> | null,
  current:()=>boolean,
  clear:()=>void=clearStaffToken,
) {
  try {
    const response=auth ? await auth.getSession() : null;
    if (!current()) return null;
    if (!response || response.error || !response.data.session?.access_token) clear();
    return response && !response.error ? response : null;
  } catch {
    if (current()) clear();
    return null;
  }
}

export function salir(): Promise<StaffLogoutResult> {
  if (closing) return closing;
  const retired=retireClient();
  closing=(async () => {
    // A logout can race initial configuration before the SDK exists.
    if (!retired.storage && persistence.canRestore() && configPrometida) {
      const config=await authDeadline(configPrometida).catch(() => null);
      if (!config) retired.localCleared=false;
      if (config) {
        const backing=almacenamientoDelNavegador();
        retired.storage=new StaffAuthStorage(backing,`sb-${new URL(config.supabaseUrl).hostname.split(".")[0]}-auth-token`);
        retired.localCleared=retired.storage.retire() && Boolean(backing);
      }
    }
    persistence.recordCleanup(retired.localCleared);
    return finishStaffLogout({auth:retired.client?.auth ?? null,storage:retired.storage,localCleared:retired.localCleared});
  })().finally(() => { closing=null; });
  return closing;
}
