/**
 * Qué prueba realmente un token de Supabase Auth.
 *
 * Que `getUser()` devuelva un usuario sólo prueba que el token lo emitió
 * ESTE proyecto de Supabase. No prueba con qué proveedor entró, ni que
 * el email sea suyo.
 *
 * La diferencia no es teórica: con el alta por email y clave habilitada
 * —que es el default de Supabase— cualquiera se registra con el correo
 * de otra persona y obtiene un token válido con ese email. Si el
 * servidor lo etiqueta como "Google", ese token abre la ficha ajena.
 *
 * Por eso acá se exigen las dos cosas que el token sí puede probar:
 * el proveedor que lo emitió, y que el proveedor haya verificado el
 * email.
 */

export type IdentityRejection = "missing_email" | "email_not_verified" | "provider_not_allowed";

export interface SupabaseUserLike {
  id?: string | null;
  email?: string | null;
  email_confirmed_at?: string | null;
  confirmed_at?: string | null;
  app_metadata?: { provider?: string | null; providers?: string[] | null } | null;
  user_metadata?: Record<string, unknown> | null;
  identities?: Array<{ provider?: string | null }> | null;
}

export interface TrustedIdentity<P extends string = string> {
  subject: string;
  email: string;
  /** El proveedor que efectivamente emitió el token, no uno supuesto. */
  provider: P;
  firstName: string | null;
  lastName: string | null;
}

export type IdentityCheck<P extends string = string> =
  | { ok: true; identity: TrustedIdentity<P> }
  | { ok: false; reason: IdentityRejection };

/**
 * Todos los proveedores que el token declara. Supabase pone el último
 * usado en `provider` y el conjunto en `providers`; una cuenta puede
 * tener varios vinculados.
 */
function declaredProviders(user: SupabaseUserLike): string[] {
  const out = new Set<string>();
  const single = user.app_metadata?.provider;
  if (typeof single === "string" && single) out.add(single.toLowerCase());
  for (const p of user.app_metadata?.providers ?? []) {
    if (typeof p === "string" && p) out.add(p.toLowerCase());
  }
  for (const i of user.identities ?? []) {
    if (typeof i?.provider === "string" && i.provider) out.add(i.provider.toLowerCase());
  }
  return [...out];
}

function readName(user: SupabaseUserLike): { firstName: string | null; lastName: string | null } {
  const meta = (user.user_metadata ?? {}) as {
    full_name?: string;
    given_name?: string;
    family_name?: string;
  };
  const full = meta.full_name?.trim().split(/\s+/) ?? [];
  return {
    firstName: meta.given_name ?? full[0] ?? null,
    lastName: meta.family_name ?? (full.length > 1 ? full.slice(1).join(" ") : null),
  };
}

/**
 * @param allowedProviders proveedores admitidos, en minúsculas. Vacío
 *        rechaza todo: no hay política implícita de "cualquiera sirve".
 */
export function verifyIdentity<P extends string>(
  user: SupabaseUserLike | null | undefined,
  allowedProviders: readonly P[],
): IdentityCheck<P> {
  if (!user?.email || !user.id) return { ok: false, reason: "missing_email" };

  // Sin email verificado por el proveedor, el email es una afirmación
  // del que se registró, no un hecho.
  const verifiedAt = user.email_confirmed_at ?? user.confirmed_at ?? null;
  if (!verifiedAt) return { ok: false, reason: "email_not_verified" };

  const declared = new Set(declaredProviders(user));
  // Se devuelve el valor de la lista permitida, no el string suelto del
  // token: así el proveedor conserva su tipo y no se cuela uno inventado.
  const match = allowedProviders.find((p) => declared.has(p.toLowerCase()));
  if (!match) return { ok: false, reason: "provider_not_allowed" };

  const { firstName, lastName } = readName(user);
  return {
    ok: true,
    identity: { subject: user.id, email: user.email, provider: match, firstName, lastName },
  };
}

/** Mensaje para la persona. No revela cuál de las condiciones falló. */
export function rejectionMessage(reason: IdentityRejection): string {
  if (reason === "email_not_verified") {
    return "Necesitamos que confirmes tu correo antes de entrar.";
  }
  return "Entrá con tu cuenta de Google.";
}
