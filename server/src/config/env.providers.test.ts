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

/**
 * QUÉ CAMBIÓ, Y QUÉ NO
 *
 * Antes producción NO arrancaba si aparecía `email`. Ese guard existía
 * porque con el alta por mail y clave cualquiera se registra con el
 * correo de otro; pero también dejaba el panel detrás de Google Cloud, y
 * mientras esas credenciales no estuvieran cargadas NADIE podía entrar,
 * ni siquiera quien construye el sistema.
 *
 * Ahora `email` está admitido en la variable, pero eso NO alcanza para
 * que se acepte: en producción el servidor le pregunta a Supabase si
 * exige confirmar el correo, y si auto-confirma —o si no se pudo
 * averiguar— descarta el proveedor igual. Esa parte se prueba en
 * `lib/identity/supabase-settings.test.ts`.
 *
 * O sea: el arranque dejó de ser el lugar donde se decide, pero la
 * decisión sigue existiendo y sigue fallando del lado seguro. Lo que un
 * proveedor que no verifica el email NUNCA puede hacer es entrar por
 * ninguno de los dos caminos, y eso se prueba más abajo.
 */
describe("política de proveedores de identidad", () => {
  test("sin la variable, quedan los dos que verifican el correo", () => {
    const env = loadServerEnv(BASE);
    expect(env.INTERNAL_AUTH_ALLOWED_PROVIDERS).toEqual(["google", "email"]);
  });

  test("producción arranca con email, porque el link prueba la casilla", () => {
    const env = loadServerEnv({ ...BASE, INTERNAL_AUTH_ALLOWED_PROVIDERS: "email" });
    expect(env.INTERNAL_AUTH_ALLOWED_PROVIDERS).toEqual(["email"]);
  });

  test("y con los dos juntos también", () => {
    const env = loadServerEnv({ ...BASE, INTERNAL_AUTH_ALLOWED_PROVIDERS: "google,email" });
    expect(env.INTERNAL_AUTH_ALLOWED_PROVIDERS).toEqual(["google", "email"]);
  });

  test("pero un proveedor que NO verifica el correo sigue sin arrancar, aunque venga acompañado", () => {
    // Lo peligroso es que ESTÉ, no que esté solo.
    expect(() =>
      loadServerEnv({ ...BASE, INTERNAL_AUTH_ALLOWED_PROVIDERS: "google,email,phone" }),
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
