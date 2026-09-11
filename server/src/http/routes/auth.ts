/**
 * Lo que el navegador necesita saber para poder iniciar sesión.
 *
 * POR QUÉ ESTO ES UN ENDPOINT Y NO UNA VARIABLE `VITE_`
 *
 * Con `VITE_` los valores se hornean en el build. Eso abre la puerta a
 * que el sitio publicado apunte a un proyecto de Supabase distinto del
 * que usa el Worker que lo atiende —y el síntoma sería «no puedo entrar»
 * sin ninguna pista de por qué—. Sirviéndolo desde acá hay una sola
 * fuente: la configuración del Worker. Si el Worker está bien, el login
 * está bien.
 *
 * QUÉ SE EXPONE, Y POR QUÉ ES SEGURO
 *
 * La URL del proyecto y la clave PUBLICABLE. Las dos son públicas por
 * diseño: cualquier aplicación de Supabase que hace login en el navegador
 * las manda en cada pedido. Medido contra la base el 2026-09-10, el rol
 * `anon` que habilita esa clave no tiene ni siquiera el GRANT sobre
 * `customers`, `bookings`, `payments`, `staff_members`, `audit_log`,
 * `customer_consents`, `customer_notes`, `service_execution_records`,
 * `roles` ni `role_permissions`: rebota con «permission denied» antes de
 * que RLS entre en juego. Lo único que alcanza es el catálogo que la web
 * pública ya muestra —categorías, servicios, extras, horarios y los siete
 * parámetros marcados como públicos—.
 *
 * La clave SECRETA no sale de acá. Hay una prueba que lo verifica.
 */

import { Hono } from "hono";
import type { ServerEnv } from "../../config/env";
import { leerAuthSettings, proveedoresAdmitidos } from "../../lib/identity/supabase-settings";

export interface PanelAuthConfig {
  supabaseUrl: string;
  publishableKey: string;
  /**
   * CON QUÉ SE PUEDE ENTRAR DE VERDAD
   *
   * No es la lista de `INTERNAL_AUTH_ALLOWED_PROVIDERS` a secas: es la
   * intersección de lo que este servidor admite con lo que el proyecto de
   * Supabase tiene efectivamente habilitado.
   *
   * La diferencia se pagó cara. La primera versión ofrecía «Entrar con
   * Google» porque el servidor lo admitía, sin que Google estuviera
   * configurado en Supabase: un botón que llevaba a un error y dejaba a
   * quien construye el sistema sin forma de entrar a su propio panel.
   * Una pantalla que ofrece lo que no funciona es peor que una que no
   * ofrece nada, porque hace perder el tiempo buscando el error del lado
   * equivocado.
   */
  proveedores: string[];
}

export function createAuthRoute(env: ServerEnv) {
  const route = new Hono();

  // GET /api/v1/auth/panel-config
  // Público a propósito: se consulta ANTES de tener sesión.
  route.get("/panel-config", async (c) => {
    const admitidos = await proveedoresAdmitidos(env);
    const settings = await leerAuthSettings(env);

    // Si no se pudo preguntarle a Supabase, se ofrece lo que el servidor
    // admite y que el intento falle con su mensaje, en vez de dejar la
    // pantalla sin ninguna puerta por un problema de red.
    const habilitado = (p: string) =>
      settings === null ? true : p === "google" ? settings.google : settings.email;

    return c.json({
      data: {
        supabaseUrl: env.SUPABASE_URL,
        publishableKey: env.SUPABASE_PUBLISHABLE_KEY,
        proveedores: admitidos.filter(habilitado),
      } satisfies PanelAuthConfig,
    });
  });

  return route;
}
