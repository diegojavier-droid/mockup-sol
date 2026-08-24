/**
 * Autorización del panel interno.
 *
 * Dos condiciones, ambas obligatorias (§28):
 *   1. Un access token válido de Supabase Auth (identidad probada).
 *   2. Ese email en INTERNAL_AUTH_ALLOWED_EMAILS *y* en staff_members
 *      con rol activo (autorización explícita).
 *
 * Estar autenticado no alcanza: cualquiera puede crearse una cuenta en
 * el proyecto Supabase, así que la lista de acceso es la que manda.
 */

import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { createClient } from "@supabase/supabase-js";
import type { ServerEnv } from "../../config/env";
import { createSupabaseAdminClient } from "../../lib/supabase";
import { rejectionMessage, verifyIdentity } from "../../lib/identity/verify";

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
  role: "owner" | "staff";
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

  const allowed = env.INTERNAL_AUTH_ALLOWED_EMAILS.some(
    (e) => e.toLowerCase() === email.toLowerCase(),
  );
  if (!allowed) return null;

  const admin = createSupabaseAdminClient(env);
  const { data: rows, error: rpcError } = await admin.rpc("resolve_staff_access", {
    p_email: email,
  });
  if (rpcError) throw rpcError;

  type StaffRow = { staff_id: string; display_name: string; role: string };
  let row = (rows as StaffRow[] | null)?.[0];

  // Arranque en frío: una instalación limpia no tiene ninguna fila de
  // staff, así que nadie podría entrar nunca a configurar el sistema. La
  // primera persona de la lista de acceso que inicie sesión queda como
  // dueña; la función se cierra sola apenas existe alguien, de modo que
  // esto no es un alta de usuarios sino un único arranque.
  if (!row) {
    const { data: provisioned, error: provisionError } = await admin.rpc(
      "provision_initial_owner",
      {
        p_email: email,
        p_display_name: check.identity.firstName
          ? [check.identity.firstName, check.identity.lastName].filter(Boolean).join(" ")
          : null,
      },
    );
    if (provisionError) throw provisionError;
    row = (provisioned as StaffRow[] | null)?.[0];
  }

  if (!row) return null;

  return {
    email,
    staffId: row.staff_id,
    displayName: row.display_name,
    role: row.role === "owner" ? "owner" : "staff",
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

/** Acciones reservadas a la dueña: precios, tiempos, horarios, catálogo. */
export function requireOwner() {
  return createMiddleware<{ Variables: StaffVars }>(async (c, next) => {
    if (c.get("staff")?.role !== "owner") {
      throw new HTTPException(403, {
        message: "Esta acción la puede hacer sólo la administradora principal.",
      });
    }
    await next();
  });
}
