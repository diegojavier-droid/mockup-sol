import { describe, expect, test } from "bun:test";
import { verifyIdentity, type SupabaseUserLike } from "./verify";

const GOOGLE = ["google"] as const;

function user(over: Partial<SupabaseUserLike> = {}): SupabaseUserLike {
  return {
    id: "user-1",
    email: "clienta@ejemplo.ar",
    email_confirmed_at: "2026-08-01T10:00:00Z",
    app_metadata: { provider: "google", providers: ["google"] },
    user_metadata: { full_name: "Marina Lopez" },
    ...over,
  };
}

describe("qué prueba realmente un token de Supabase", () => {
  test("1. Google válido y verificado entra", () => {
    const r = verifyIdentity(user(), GOOGLE);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.identity.email).toBe("clienta@ejemplo.ar");
      expect(r.identity.provider).toBe("google");
      expect(r.identity.firstName).toBe("Marina");
    }
  });

  test("2. Google SIN email verificado no entra", () => {
    const r = verifyIdentity(user({ email_confirmed_at: null, confirmed_at: null }), GOOGLE);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("email_not_verified");
  });

  test("3. token de email+clave con el email de la víctima NO entra", () => {
    // El vector real: alta por email y clave —default de Supabase— con
    // el correo de otra persona. El token es válido; la identidad no.
    const r = verifyIdentity(
      user({ app_metadata: { provider: "email", providers: ["email"] } }),
      GOOGLE,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("provider_not_allowed");
  });

  test("4. otro proveedor OAuth tampoco entra", () => {
    for (const p of ["facebook", "github", "apple", "phone"]) {
      const r = verifyIdentity(user({ app_metadata: { provider: p, providers: [p] } }), GOOGLE);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toBe("provider_not_allowed");
    }
  });

  test("5. el email viaja tal cual lo declaró el proveedor", () => {
    const r = verifyIdentity(user({ email: "Otra@Ejemplo.AR" }), GOOGLE);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.identity.email).toBe("Otra@Ejemplo.AR");
  });

  test("6. sin email no entra aunque el token sea válido", () => {
    const r = verifyIdentity(user({ email: null }), GOOGLE);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("missing_email");
  });

  test("7. token inexistente (getUser devolvió null) no entra", () => {
    expect(verifyIdentity(null, GOOGLE).ok).toBe(false);
    expect(verifyIdentity(undefined, GOOGLE).ok).toBe(false);
  });

  test("8. una cuenta con Google entre varios proveedores entra", () => {
    // Supabase deja vincular credenciales: si Google está vinculado y
    // verificado, la persona es quien dice ser.
    const r = verifyIdentity(
      user({ app_metadata: { provider: "email", providers: ["email", "google"] } }),
      GOOGLE,
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.identity.provider).toBe("google");
  });

  test("9. `identities` también cuenta como declaración de proveedor", () => {
    const r = verifyIdentity(
      user({ app_metadata: null, identities: [{ provider: "google" }] }),
      GOOGLE,
    );
    expect(r.ok).toBe(true);
  });

  test("10. una lista de proveedores vacía no habilita a nadie", () => {
    // Sin política explícita no se entra: nunca "si no hay lista, pasa".
    const r = verifyIdentity(user(), []);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("provider_not_allowed");
  });

  test("11. `confirmed_at` sirve cuando falta `email_confirmed_at`", () => {
    const r = verifyIdentity(
      user({ email_confirmed_at: null, confirmed_at: "2026-08-01T10:00:00Z" }),
      GOOGLE,
    );
    expect(r.ok).toBe(true);
  });
});
