import { describe, expect, test, afterEach } from "bun:test";
import { loadServerEnv, __resetServerEnvCache } from "./env";

const BASE = {
  APP_ENV: "production",
  API_BASE_URL: "https://api.solmai.ar",
  PUBLIC_WEB_BASE_URL: "https://solmai.ar",
  SUPABASE_URL: "https://proyecto.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "anon-key",
  SUPABASE_SECRET_KEY: "service-key",
  INTERNAL_AUTH_JWT_AUDIENCE: "sol-mai-internal",
  INTERNAL_AUTH_ALLOWED_EMAILS: "sol@solmai.ar",
  PORT: "3001",
} as NodeJS.ProcessEnv;

afterEach(() => __resetServerEnvCache());

describe("política de proveedores de identidad", () => {
  test("sin la variable, producción queda en google", () => {
    const env = loadServerEnv(BASE);
    expect(env.INTERNAL_AUTH_ALLOWED_PROVIDERS).toEqual(["google"]);
  });

  test("producción NO arranca con email: es el proveedor del ataque", () => {
    expect(() => loadServerEnv({ ...BASE, INTERNAL_AUTH_ALLOWED_PROVIDERS: "email" })).toThrow(
      /no verifica el email/,
    );
  });

  test("tampoco arranca si email viene acompañado de google", () => {
    // Lo peligroso es que ESTÉ, no que esté solo.
    expect(() =>
      loadServerEnv({ ...BASE, INTERNAL_AUTH_ALLOWED_PROVIDERS: "google,email" }),
    ).toThrow(/no verifica el email/);
  });

  test("ni con otros proveedores que no verifican", () => {
    for (const p of ["facebook", "phone", "anonymous"]) {
      expect(() => loadServerEnv({ ...BASE, INTERNAL_AUTH_ALLOWED_PROVIDERS: p })).toThrow(
        /no verifica el email/,
      );
      __resetServerEnvCache();
    }
  });

  test("producción con google explícito sí arranca", () => {
    const env = loadServerEnv({ ...BASE, INTERNAL_AUTH_ALLOWED_PROVIDERS: "google" });
    expect(env.INTERNAL_AUTH_ALLOWED_PROVIDERS).toEqual(["google"]);
  });

  test("CI (APP_ENV=local) sí puede usar email para sus fixtures", () => {
    const env = loadServerEnv({
      ...BASE,
      APP_ENV: "local",
      INTERNAL_AUTH_ALLOWED_PROVIDERS: "email",
    });
    expect(env.INTERNAL_AUTH_ALLOWED_PROVIDERS).toEqual(["email"]);
  });

  test("staging tampoco es producción: puede aflojar la política", () => {
    const env = loadServerEnv({
      ...BASE,
      APP_ENV: "staging",
      INTERNAL_AUTH_ALLOWED_PROVIDERS: "email",
    });
    expect(env.INTERNAL_AUTH_ALLOWED_PROVIDERS).toEqual(["email"]);
  });

  test("una lista vacía no habilita a nadie: falla al cargar", () => {
    expect(() =>
      loadServerEnv({ ...BASE, APP_ENV: "local", INTERNAL_AUTH_ALLOWED_PROVIDERS: "" }),
    ).toThrow();
  });
});
