/**
 * El proveedor `email` es seguro o no según una opción de Supabase que no
 * vive en este repositorio. Estas pruebas fijan la única regla que
 * importa: ante la duda, NO se confía.
 */
import { afterEach, describe, expect, it } from "bun:test";
import {
  __resetSupabaseSettingsCache,
  emailEsConfiable,
  leerAuthSettings,
  proveedoresAdmitidos,
  type SupabaseAuthSettings,
} from "./supabase-settings";
import type { ServerEnv } from "../../config/env";

const ENV = (extra: Partial<ServerEnv> = {}) =>
  ({
    SUPABASE_URL: "https://proyecto.supabase.co",
    SUPABASE_PUBLISHABLE_KEY: "sb_publishable_x",
    APP_ENV: "production",
    INTERNAL_AUTH_ALLOWED_PROVIDERS: ["google", "email"],
    ...extra,
  }) as unknown as ServerEnv;

const original = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = original;
  __resetSupabaseSettingsCache();
});

function responderCon(body: unknown, ok = true) {
  globalThis.fetch = (async () =>
    ({ ok, json: async () => body }) as unknown as Response) as unknown as typeof fetch;
}

const settings = (p: Partial<SupabaseAuthSettings> = {}): SupabaseAuthSettings => ({
  mailerAutoconfirm: false,
  signupDisabled: false,
  google: false,
  email: true,
  ...p,
});

describe("cuándo se puede confiar en el proveedor `email`", () => {
  it("sí, si Supabase exige confirmar el correo", () => {
    // Confirmar exige abrir la casilla, y eso prueba que es tuya.
    expect(emailEsConfiable(settings({ mailerAutoconfirm: false }))).toBe(true);
  });

  it("sí, si directamente no se pueden crear cuentas nuevas", () => {
    // Las únicas que existen las creó la administradora.
    expect(emailEsConfiable(settings({ mailerAutoconfirm: true, signupDisabled: true }))).toBe(true);
  });

  it("NO, si Supabase auto-confirma y deja registrarse", () => {
    // Acá cualquiera se registra con el mail de Sol y sale un token
    // indistinguible del de ella.
    expect(emailEsConfiable(settings({ mailerAutoconfirm: true, signupDisabled: false }))).toBe(
      false,
    );
  });

  it("NO, si no se pudo averiguar", () => {
    expect(emailEsConfiable(null)).toBe(false);
  });
});

describe("leer la configuración de Supabase", () => {
  it("asume lo PEOR si falta el campo del auto-confirmado", async () => {
    // Si Supabase deja de mandarlo, no se puede seguir confiando sólo
    // porque el campo no vino.
    responderCon({ external: { google: true } });
    expect((await leerAuthSettings(ENV()))!.mailerAutoconfirm).toBe(true);
  });

  it("devuelve null si Supabase contesta con error", async () => {
    responderCon({}, false);
    expect(await leerAuthSettings(ENV())).toBeNull();
  });

  it("devuelve null si la red falla, y no lo cachea", async () => {
    let llamadas = 0;
    globalThis.fetch = (async () => {
      llamadas += 1;
      throw new Error("sin red");
    }) as unknown as typeof fetch;

    expect(await leerAuthSettings(ENV())).toBeNull();
    expect(await leerAuthSettings(ENV())).toBeNull();
    // Un corte de red no puede dejar el ingreso roto hasta que se
    // recicle la instancia: se vuelve a preguntar.
    expect(llamadas).toBe(2);
  });

  it("cachea la respuesta buena para no ir a la red en cada pedido", async () => {
    let llamadas = 0;
    globalThis.fetch = (async () => {
      llamadas += 1;
      return { ok: true, json: async () => ({ mailer_autoconfirm: false }) } as unknown as Response;
    }) as unknown as typeof fetch;

    await leerAuthSettings(ENV());
    await leerAuthSettings(ENV());
    expect(llamadas).toBe(1);
  });
});

describe("qué proveedores se admiten de verdad", () => {
  it("en producción saca `email` si Supabase auto-confirma", async () => {
    responderCon({ mailer_autoconfirm: true, external: { google: true, email: true } });
    expect(await proveedoresAdmitidos(ENV())).toEqual(["google"]);
  });

  it("en producción saca `email` si no se pudo leer la configuración", async () => {
    responderCon({}, false);
    expect(await proveedoresAdmitidos(ENV())).toEqual(["google"]);
  });

  it("en producción lo deja si Supabase exige confirmar", async () => {
    responderCon({ mailer_autoconfirm: false, external: { google: true, email: true } });
    expect(await proveedoresAdmitidos(ENV())).toEqual(["google", "email"]);
  });

  it("fuera de producción no pregunta nada", async () => {
    // El stack local emite tokens `email` y no tiene este endpoint.
    globalThis.fetch = (async () => {
      throw new Error("no debería preguntar");
    }) as unknown as typeof fetch;
    expect(await proveedoresAdmitidos(ENV({ APP_ENV: "local" }))).toEqual(["google", "email"]);
  });

  it("no pregunta si `email` ni siquiera está configurado", async () => {
    globalThis.fetch = (async () => {
      throw new Error("no debería preguntar");
    }) as unknown as typeof fetch;
    expect(await proveedoresAdmitidos(ENV({ INTERNAL_AUTH_ALLOWED_PROVIDERS: ["google"] }))).toEqual(
      ["google"],
    );
  });
});
