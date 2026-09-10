/**
 * Lo que este endpoint publica lo lee cualquiera sin sesión, así que lo
 * que importa no es que devuelva lo correcto —eso se ve— sino que no
 * devuelva de más. Una clave secreta filtrada acá abre la base entera:
 * `service_role` saltea RLS por definición.
 */
import { describe, expect, test } from "bun:test";
import { createAuthRoute } from "./auth";
import type { ServerEnv } from "../../config/env";

const SECRETO = "sb_secret_no_debe_salir_nunca_de_aca";

const ENV = {
  SUPABASE_URL: "https://proyecto.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_abc123",
  SUPABASE_SECRET_KEY: SECRETO,
  INTERNAL_AUTH_ALLOWED_PROVIDERS: ["google"],
  INTERNAL_AUTH_ALLOWED_EMAILS: ["sol@solmai.test"],
  ANTHROPIC_API_KEY: "sk-ant-tampoco-esto",
  MP_ACCESS_TOKEN: "ni-esto",
} as unknown as ServerEnv;

async function pedir() {
  const res = await createAuthRoute(ENV).request("/panel-config");
  return { status: res.status, texto: await res.text() };
}

describe("la configuración pública del panel", () => {
  test("dice con qué proyecto y con qué clave publicable entrar", async () => {
    const { status, texto } = await pedir();
    expect(status).toBe(200);
    const { data } = JSON.parse(texto);
    expect(data.supabaseUrl).toBe("https://proyecto.supabase.co");
    expect(data.publishableKey).toBe("sb_publishable_abc123");
  });

  test("dice con qué proveedores se puede entrar, para no ofrecer un botón que el backend rechaza", async () => {
    const { texto } = await pedir();
    expect(JSON.parse(texto).data.proveedores).toEqual(["google"]);
  });

  test("NO filtra la clave secreta", async () => {
    const { texto } = await pedir();
    expect(texto).not.toContain(SECRETO);
    expect(texto).not.toContain("sb_secret");
  });

  test("NO filtra ningún otro secreto del entorno", async () => {
    const { texto } = await pedir();
    expect(texto).not.toContain("sk-ant-");
    expect(texto).not.toContain("ni-esto");
  });

  test("NO filtra a quién se le permite arrancar en frío", async () => {
    // `INTERNAL_AUTH_ALLOWED_EMAILS` no es un secreto que abra nada por sí
    // solo, pero decir públicamente qué cuenta puede provisionarse como
    // dueña es señalarle a cualquiera a quién apuntar.
    const { texto } = await pedir();
    expect(texto).not.toContain("sol@solmai.test");
  });

  test("devuelve exactamente tres campos y ninguno más", async () => {
    // Un campo agregado sin pensar es cómo se filtra algo la próxima vez.
    const { texto } = await pedir();
    expect(Object.keys(JSON.parse(texto).data).sort()).toEqual([
      "proveedores",
      "publishableKey",
      "supabaseUrl",
    ]);
  });
});
