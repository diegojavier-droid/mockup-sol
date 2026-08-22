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
  const email = data?.user?.email;
  if (error || !email) return null;

  const allowed = env.INTERNAL_AUTH_ALLOWED_EMAILS.some(
    (e) => e.toLowerCase() === email.toLowerCase(),
  );
  if (!allowed) return null;

  const admin = createSupabaseAdminClient(env);
  const { data: rows, error: rpcError } = await admin.rpc("resolve_staff_access", {
    p_email: email,
  });
  if (rpcError) throw rpcError;

  const row = (rows as { staff_id: string; display_name: string; role: string }[] | null)?.[0];
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
