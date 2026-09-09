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

  it("arranca sin la clave del asistente de precios", () => {
    const env = loadServerEnv({ ...BASE, ANTHROPIC_API_KEY: "" });

    expect(env.ANTHROPIC_API_KEY).toBeUndefined();
    // El modelo tiene default: que falte no puede ser un motivo para no
    // arrancar, ni para que el asistente quede a medias configurado.
    expect(env.ANTHROPIC_MODEL).toBe("claude-haiku-4-5");
  });

  it("un modelo vacío cae en el default en vez de romper el arranque", () => {
    const env = loadServerEnv({ ...BASE, ANTHROPIC_API_KEY: "sk-ant-x", ANTHROPIC_MODEL: "  " });

    expect(env.ANTHROPIC_API_KEY).toBe("sk-ant-x");
    expect(env.ANTHROPIC_MODEL).toBe("claude-haiku-4-5");
  });

  it("no toca las variables donde una cadena vacía puede significar algo", () => {
    // `INTERNAL_AUTH_ALLOWED_EMAILS` vacío podría querer decir «nadie».
    // Convertirlo en «no definido» aplicaría un default más permisivo, así
    // que la normalización NO lo alcanza y sigue fallando la validación.
    expect(() => loadServerEnv({ ...BASE, INTERNAL_AUTH_ALLOWED_EMAILS: "" })).toThrow();
  });
});
