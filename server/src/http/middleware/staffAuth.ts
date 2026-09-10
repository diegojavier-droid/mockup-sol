/**
 * Autorización del panel interno.
 *
 * Dos condiciones, ambas obligatorias (§28):
 *   1. Un access token válido de Supabase Auth, emitido por un proveedor
 *      que verifica el email (identidad probada).
 *   2. Una fila activa en `staff_members` (autorización explícita), que
 *      administra la dueña desde el panel.
 *
 * Estar autenticado no alcanza: cualquiera puede crearse una cuenta en
 * el proyecto Supabase, así que la autorización es una decisión aparte.
 *
 * `INTERNAL_AUTH_ALLOWED_EMAILS` ya NO se revisa en cada pedido: gobierna
 * sólo el arranque en frío. El porqué está explicado donde se usa.
 *
 * Este middleware contesta QUIÉN ES y QUÉ PUEDE. Si además le alcanza para
 * la ruta que pidió lo decide `requirePermission()`, en `permisos.ts`.
 */

import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { createClient } from "@supabase/supabase-js";
import type { ServerEnv } from "../../config/env";
import { createSupabaseAdminClient } from "../../lib/supabase";
import { rejectionMessage, verifyIdentity } from "../../lib/identity/verify";
import type { MapaDePermisos } from "./permisos";

/**
 * Con qué se entra al panel: lo que diga
 * `INTERNAL_AUTH_ALLOWED_PROVIDERS`, por defecto sólo Google.
 *
 * El panel da acceso a la agenda y a las fichas, así que un token
 * emitido por un alta de email y clave con el correo de la dueña no
 * puede alcanzar. La lista de emails sigue siendo la segunda condición,
 * no la única.
 */

export interface StaffIdentity {
  email: string;
  staffId: string;
  displayName: string;
  /** El slug del rol. Ya no es una lista fija: Sol arma los roles. */
  role: string;
  /** Cómo se llama ese rol en la pantalla. */
  roleName: string;
  /**
   * Qué puede tocar, módulo por módulo. Viene resuelto en la misma
   * consulta que la identidad, así que no hay una segunda ida a la base
   * por pedido ni un momento en que la sesión y sus permisos no
   * coincidan: si Sol le saca Finanzas a alguien, el pedido siguiente ya
   * viene sin Finanzas.
   */
  permisos: MapaDePermisos;
}

export type StaffVars = { staff: StaffIdentity };

async function resolveIdentity(env: ServerEnv, token: string): Promise<StaffIdentity | null> {
  const auth = createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const { data, error } = await auth.auth.getUser(token);
  if (error || !data?.user) return null;

  // Mismo criterio que la identidad de la clienta: el token prueba que
  // lo emitió este proyecto, no con qué proveedor ni que el email sea
  // suyo. Sin esto, la lista de acceso quedaba como única barrera.
  const check = verifyIdentity(data.user, env.INTERNAL_AUTH_ALLOWED_PROVIDERS);
  if (!check.ok) {
    console.warn("[sol-mai-api] acceso al panel rechazado:", check.reason);
    throw new HTTPException(403, { message: rejectionMessage(check.reason) });
  }
  const email = check.identity.email;

  const admin = createSupabaseAdminClient(env);

  type StaffRow = {
    staff_id: string;
    display_name: string;
    role: string;
    role_name: string;
    permisos: MapaDePermisos | null;
  };

  const sesion = async (): Promise<StaffRow | undefined> => {
    const { data, error } = await admin.rpc("resolve_staff_session", { p_email: email });
    if (error) throw error;
    return (data as StaffRow[] | null)?.[0];
  };

  let row = await sesion();

  // ---------------------------------------------------------------
  // QUÉ CAMBIÓ ACÁ, Y POR QUÉ
  //
  // Antes `INTERNAL_AUTH_ALLOWED_EMAILS` se revisaba SIEMPRE, y era la
  // primera condición. Eso volvía imposible dar de alta a alguien sin
  // desplegar, que es el agujero que este bloque cierra: el día que una
  // persona deja el salón, sacarle el acceso no puede depender de que
  // nosotros estemos disponibles.
  //
  // Ahora la lista gobierna SÓLO el arranque en frío. Con el sistema ya
  // andando, quien manda es `staff_members`, que administra la dueña.
  //
  // Qué se pierde: si alguien pudiera escribir en `staff_members` sin
  // pasar por nuestras funciones, antes la lista lo frenaba igual. Pero
  // escribir esa tabla exige la clave de servicio —está revocada para
  // `anon` y `authenticated`— y quien tenga esa clave ya puede leer
  // todo directamente. La lista no era una defensa real contra eso.
  //
  // Qué se gana: Sol le saca el acceso a alguien y deja de entrar en el
  // pedido siguiente, sin que intervenga nadie.
  //
  // La lista sigue siendo obligatoria y sigue protegiendo lo que de
  // verdad protegía: que en una instalación nueva no sea dueña la
  // primera cuenta de Google que pase por la puerta.
  // ---------------------------------------------------------------
  if (!row) {
    const habilitadaParaArrancar = env.INTERNAL_AUTH_ALLOWED_EMAILS.some(
      (e) => e.toLowerCase() === email.toLowerCase(),
    );
    if (!habilitadaParaArrancar) return null;

    const { error: provisionError } = await admin.rpc("provision_initial_owner", {
      p_email: email,
      p_display_name: check.identity.firstName
        ? [check.identity.firstName, check.identity.lastName].filter(Boolean).join(" ")
        : null,
    });
    if (provisionError) throw provisionError;
    // Se vuelve a preguntar en vez de usar lo que devolvió el alta: así la
    // sesión recién creada sale del mismo lugar que todas las demás y no
    // hay un segundo camino por el que armar los permisos.
    row = await sesion();
  }

  if (!row) return null;

  return {
    email,
    staffId: row.staff_id,
    displayName: row.display_name,
    role: row.role,
    roleName: row.role_name,
    permisos: row.permisos ?? {},
  };
}

export function staffAuth(env: ServerEnv) {
  return createMiddleware<{ Variables: StaffVars }>(async (c, next) => {
    const header = c.req.header("authorization") ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    if (!token) {
      throw new HTTPException(401, { message: "Iniciá sesión para entrar al panel." });
    }

    const identity = await resolveIdentity(env, token);
    if (!identity) {
      throw new HTTPException(403, { message: "Tu cuenta no tiene acceso al panel." });
    }

    c.set("staff", identity);
    await next();
  });
}

/**
 * `requireOwner()` ya no existe.
 *
 * Gobernaba veintiocho rutas con una sola pregunta —«¿sos la dueña?»—, y
 * ese es justamente el `if` binario que este bloque reemplaza. Ahora cada
 * ruta declara su módulo y su nivel en `permisos.ts`, y `requirePermission()`
 * es el único que decide. Dejar los dos conviviendo habría dado un sistema
 * donde un rol con Finanzas completo igual rebotaba, sin que la pantalla
 * pudiera explicar por qué.
 *
 * Lo que protegía sigue protegido: el rol `owner` tiene los nueve módulos
 * en `full`, así que la dueña llega exactamente a lo mismo que antes, y
 * ningún otro rol nace con permisos.
 */
