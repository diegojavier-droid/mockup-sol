/**
 * Que ninguna ruta del panel quede sin dueño.
 *
 * Esta prueba no mira una lista escrita a mano: le pregunta a Hono qué
 * rutas tiene registradas de verdad y las compara contra la declaración.
 * Es la diferencia entre «me acordé de declararlas todas» y «no hay
 * ninguna sin declarar».
 */
import { describe, expect, it } from "bun:test";
import { Hono } from "hono";
import { createAdminRoute } from "../routes/admin";
import type { ServerEnv } from "../../config/env";
import { alcanza, claveDeRuta, MODULOS, PERMISOS, puede, SIN_MODULO } from "./permisos";

/**
 * Sólo se necesita para que el router se construya; ningún handler llega
 * a ejecutarse, porque lo único que se mira es la tabla de rutas.
 */
const ENV_FALSO = {
  SUPABASE_URL: "https://ejemplo.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "publica",
  SUPABASE_SECRET_KEY: "secreta",
  INTERNAL_AUTH_ALLOWED_EMAILS: [],
  INTERNAL_AUTH_ALLOWED_PROVIDERS: ["google"],
} as unknown as ServerEnv;

const PREFIJO = "/api/v1/admin";

function rutasDelPanel(): string[] {
  const app = new Hono();
  const v1 = new Hono();
  v1.route("/admin", createAdminRoute(ENV_FALSO));
  app.route("/api/v1", v1);

  return app.routes
    // Los middlewares se registran como `ALL`; lo que se declara son las
    // rutas que atienden.
    .filter((r) => r.method !== "ALL")
    .map((r) => claveDeRuta(r.method, r.path, PREFIJO))
    .filter((clave, i, todas) => todas.indexOf(clave) === i)
    .sort();
}

describe("cada ruta del panel tiene un permiso declarado", () => {
  it("no hay ninguna ruta sin declarar", () => {
    const declaradas = new Set([...Object.keys(PERMISOS), ...SIN_MODULO]);
    const sinDeclarar = rutasDelPanel().filter((r) => !declaradas.has(r));

    expect(sinDeclarar).toEqual([]);
  });

  it("no sobra ninguna declaración", () => {
    const reales = new Set(rutasDelPanel());
    const sobran = [...Object.keys(PERMISOS), ...SIN_MODULO].filter((k) => !reales.has(k));

    expect(sobran).toEqual([]);
  });

  it("todas las rutas declaradas apuntan a un módulo que existe", () => {
    const modulos = new Set<string>(MODULOS);
    for (const [clave, permiso] of Object.entries(PERMISOS)) {
      expect(modulos.has(permiso.modulo)).toBe(true);
    }
  });

  it("ninguna ruta que escribe pide sólo `view`", () => {
    const queEscriben = Object.entries(PERMISOS).filter(([clave]) =>
      /^(POST|PATCH|PUT|DELETE) /.test(clave),
    );
    const flojas = queEscriben.filter(([, p]) => p.nivel !== "full").map(([clave]) => clave);

    expect(flojas).toEqual([]);
  });
});

describe("qué alcanza para qué", () => {
  it("`full` alcanza para mirar y para cambiar", () => {
    expect(alcanza("full", "view")).toBe(true);
    expect(alcanza("full", "full")).toBe(true);
  });

  it("`view` alcanza para mirar y NO para cambiar", () => {
    expect(alcanza("view", "view")).toBe(true);
    expect(alcanza("view", "full")).toBe(false);
  });

  it("`none` no alcanza para nada", () => {
    expect(alcanza("none", "view")).toBe(false);
    expect(alcanza("none", "full")).toBe(false);
  });

  it("un módulo que no está en el mapa no alcanza para nada", () => {
    expect(alcanza(undefined, "view")).toBe(false);
    expect(alcanza(undefined, "full")).toBe(false);
  });
});

describe("lo que hoy puede quien atiende el mostrador", () => {
  // Exactamente lo que la migración le dio: calendario y clientas
  // completos, nada más. Si alguien cambia la tabla de rutas y le mueve
  // un módulo, esta prueba lo cuenta.
  const mostrador = { calendario: "full", clientas: "full" } as const;

  it("llega a la agenda y a las fichas", () => {
    expect(puede(mostrador, PERMISOS["GET /agenda"]!)).toBe(true);
    expect(puede(mostrador, PERMISOS["POST /bookings"]!)).toBe(true);
    expect(puede(mostrador, PERMISOS["GET /customers"]!)).toBe(true);
    expect(puede(mostrador, PERMISOS["POST /customers/:id/notes"]!)).toBe(true);
  });

  it("sigue pudiendo cerrar un turno y marcar una seña devuelta", () => {
    // Son operaciones del turno, no de la caja: quien está con la clienta
    // enfrente tiene que poder hacerlas.
    expect(puede(mostrador, PERMISOS["POST /bookings/:id/close"]!)).toBe(true);
    expect(puede(mostrador, PERMISOS["POST /bookings/:id/refund-done"]!)).toBe(true);
    expect(puede(mostrador, PERMISOS["GET /refunds-pending"]!)).toBe(true);
  });

  it("no ve la plata", () => {
    expect(puede(mostrador, PERMISOS["GET /cash-register"]!)).toBe(false);
    expect(puede(mostrador, PERMISOS["GET /dashboard"]!)).toBe(false);
    expect(puede(mostrador, PERMISOS["GET /reconciliation"]!)).toBe(false);
  });

  it("no toca precios, ni el salón, ni los permisos de nadie", () => {
    expect(puede(mostrador, PERMISOS["POST /salon/services/:slug/price"]!)).toBe(false);
    expect(puede(mostrador, PERMISOS["PATCH /business-hours/:id"]!)).toBe(false);
    expect(puede(mostrador, PERMISOS["PATCH /settings/:key"]!)).toBe(false);
    expect(puede(mostrador, PERMISOS["GET /staff"]!)).toBe(false);
    expect(puede(mostrador, PERMISOS["POST /roles/:slug/permission"]!)).toBe(false);
    expect(puede(mostrador, PERMISOS["GET /audit"]!)).toBe(false);
  });
});

describe("lo que puede la administradora", () => {
  const duena = Object.fromEntries(MODULOS.map((m) => [m, "full"]));

  it("llega a todas las rutas del panel, sin excepción", () => {
    const rebotan = Object.entries(PERMISOS)
      .filter(([, p]) => !puede(duena, p))
      .map(([clave]) => clave);
    expect(rebotan).toEqual([]);
  });
});

describe("un rol nuevo no puede nada", () => {
  const recienNacido = Object.fromEntries(MODULOS.map((m) => [m, "none"]));

  it("rebota en las 51 rutas", () => {
    const pasan = Object.entries(PERMISOS)
      .filter(([, p]) => puede(recienNacido, p))
      .map(([clave]) => clave);
    expect(pasan).toEqual([]);
  });
});
