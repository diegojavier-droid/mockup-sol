/**
 * Qué tiene habilitado el proyecto de Supabase, preguntado a Supabase.
 *
 * POR QUÉ ESTO EXISTE
 *
 * Entrar con un link al mail usa el proveedor `email`. Ese proveedor es
 * seguro o inseguro según UNA opción del panel de Supabase que no vive en
 * este repositorio:
 *
 *   · `mailer_autoconfirm: false` —el default— significa que para tener
 *     el mail confirmado hubo que abrir la casilla y hacer clic. Eso
 *     prueba que el mail es tuyo, igual que lo probaría Google.
 *
 *   · `mailer_autoconfirm: true` significa que Supabase da por confirmado
 *     cualquier alta sin mandar nada. Con eso, cualquiera se registra con
 *     el mail de Sol y el token que sale es indistinguible del de ella.
 *
 * El código no puede elegir esa opción, pero sí puede negarse a confiar
 * cuando está mal puesta. Eso es lo que hace este módulo: si Supabase
 * auto-confirma, o si no se pudo averiguar, el proveedor `email` no se
 * acepta en producción. Falla del lado seguro.
 *
 * `GET /auth/v1/settings` es público y no lleva secretos: devuelve qué
 * proveedores están habilitados y cómo está configurado el correo.
 */

import type { ServerEnv } from "../../config/env";

export interface SupabaseAuthSettings {
  /** Supabase da por confirmado el mail sin mandar nada. */
  mailerAutoconfirm: boolean;
  /** No se pueden crear cuentas nuevas desde afuera. */
  signupDisabled: boolean;
  /** Proveedores externos habilitados en el proyecto. */
  google: boolean;
  /** El alta por mail (link o clave) está habilitada. */
  email: boolean;
}

interface RespuestaCruda {
  mailer_autoconfirm?: boolean;
  disable_signup?: boolean;
  external?: Record<string, boolean> & { google?: boolean; email?: boolean };
}

/**
 * Se cachea por instancia del Worker. Cambiar una opción en Supabase se
 * refleja cuando la instancia se recicla; para una opción que se toca una
 * vez en la vida del proyecto, preguntar en cada pedido sería gastar una
 * ida a la red por pedido para no enterarse de nada nuevo.
 */
let cache: { url: string; settings: SupabaseAuthSettings } | null = null;

export function __resetSupabaseSettingsCache() {
  cache = null;
}

export async function leerAuthSettings(env: ServerEnv): Promise<SupabaseAuthSettings | null> {
  if (cache && cache.url === env.SUPABASE_URL) return cache.settings;

  let crudo: RespuestaCruda;
  try {
    const res = await fetch(`${env.SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY },
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) return null;
    crudo = (await res.json()) as RespuestaCruda;
  } catch {
    // Sin respuesta no hay permiso. No se cachea el fallo: un corte de red
    // no puede dejar el ingreso roto hasta que se recicle la instancia.
    return null;
  }

  const settings: SupabaseAuthSettings = {
    // `?? true` a propósito: si Supabase deja de mandar el campo, se
    // asume lo PEOR y el proveedor `email` deja de aceptarse.
    mailerAutoconfirm: crudo.mailer_autoconfirm ?? true,
    signupDisabled: crudo.disable_signup ?? false,
    google: crudo.external?.google === true,
    email: crudo.external?.email === true,
  };
  cache = { url: env.SUPABASE_URL, settings };
  return settings;
}

/**
 * ¿Se puede confiar en un token del proveedor `email` en producción?
 *
 * Sí cuando el mail confirmado prueba que la casilla es de quien entra:
 * o porque Supabase exige confirmarlo, o porque directamente no deja
 * crear cuentas nuevas y entonces las únicas que existen las creó la
 * administradora.
 */
export function emailEsConfiable(settings: SupabaseAuthSettings | null): boolean {
  if (!settings) return false;
  return settings.mailerAutoconfirm === false || settings.signupDisabled === true;
}

/**
 * Los proveedores que de verdad se admiten en este pedido: los
 * configurados, menos `email` si en producción no se puede confiar en él.
 */
export async function proveedoresAdmitidos(env: ServerEnv): Promise<string[]> {
  const configurados = env.INTERNAL_AUTH_ALLOWED_PROVIDERS;
  if (env.APP_ENV !== "production" || !configurados.includes("email")) return configurados;

  const confiable = emailEsConfiable(await leerAuthSettings(env));
  if (confiable) return configurados;

  console.warn(
    "[sol-mai-api] el proveedor `email` no se acepta: Supabase auto-confirma los correos " +
      "o no se pudo leer su configuración. Encendé «Confirm email» en " +
      "Authentication → Sign In / Providers para que confirmar exija abrir la casilla.",
  );
  return configurados.filter((p) => p !== "email");
}
