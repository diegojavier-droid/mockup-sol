/**
 * Un secreto opcional vacío no puede tirar abajo el Worker.
 *
 * El despliegue publica los secretos de Mercado Pago desde GitHub. Si
 * todavía no se cargaron —o se borró el valor y quedó la clave—, llegan
 * como cadena vacía. El esquema exige `min(1)`, así que sin normalizar
 * eso el arranque falla y se cae el sitio entero por una integración que
 * ni siquiera está en uso.
 */

import { afterEach, describe, expect, it } from "bun:test";
import { loadServerEnv, __resetServerEnvCache } from "./env";

const BASE = {
  NODE_ENV: "test",
  APP_ENV: "local",
  API_BASE_URL: "http://localhost:3001",
  PUBLIC_WEB_BASE_URL: "http://localhost:8080",
  SUPABASE_URL: "http://127.0.0.1:54321",
  SUPABASE_PUBLISHABLE_KEY: "anon-key",
  SUPABASE_SECRET_KEY: "service-key",
  INTERNAL_AUTH_ALLOWED_EMAILS: "dev@sol-mai.test",
  INTERNAL_AUTH_JWT_AUDIENCE: "sol-mai-internal",
} as NodeJS.ProcessEnv;

// El env se cachea después del primer parseo.
afterEach(() => __resetServerEnvCache());

describe("secretos opcionales vacíos", () => {
  it("arranca con las claves de Mercado Pago vacías, y las deja sin configurar", () => {
    const env = loadServerEnv({
      ...BASE,
      MERCADO_PAGO_ACCESS_TOKEN: "",
      MERCADO_PAGO_WEBHOOK_SECRET: "   ",
    });

    expect(env.MERCADO_PAGO_ACCESS_TOKEN).toBeUndefined();
    expect(env.MERCADO_PAGO_WEBHOOK_SECRET).toBeUndefined();
  });

  it("cuando traen valor, lo conserva tal cual", () => {
    const env = loadServerEnv({
      ...BASE,
      MERCADO_PAGO_ACCESS_TOKEN: "APP_USR-token",
    });

    expect(env.MERCADO_PAGO_ACCESS_TOKEN).toBe("APP_USR-token");
  });

  it("no toca las variables donde una cadena vacía puede significar algo", () => {
    // `INTERNAL_AUTH_ALLOWED_EMAILS` vacío podría querer decir «nadie».
    // Convertirlo en «no definido» aplicaría un default más permisivo, así
    // que la normalización NO lo alcanza y sigue fallando la validación.
    expect(() => loadServerEnv({ ...BASE, INTERNAL_AUTH_ALLOWED_EMAILS: "" })).toThrow();
  });
});
