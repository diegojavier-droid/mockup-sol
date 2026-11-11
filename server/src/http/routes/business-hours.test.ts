import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { createAdminRoute } from "./admin";
import type { ServerEnv } from "../../config/env";

const ID = "11111111-1111-4111-8111-111111111111";
const row = { id: ID, weekday: 2, opens_at: "08:00:00", closes_at: "15:00:00", is_active: true };
const env = {
  APP_ENV: "local",
  SUPABASE_URL: "https://hours-test.invalid",
  SUPABASE_PUBLISHABLE_KEY: "test-public",
  SUPABASE_SECRET_KEY: "test-secret",
  INTERNAL_AUTH_ALLOWED_PROVIDERS: ["google"],
  INTERNAL_AUTH_ALLOWED_EMAILS: [],
} as unknown as ServerEnv;
const app = new Hono().route("/api/v1/admin", createAdminRoute(env));
const realFetch = globalThis.fetch;
let level: "view" | "full" | "none";
let calls: { url: URL; method: string; body: unknown }[];
let dbResult: unknown;
let dbStatus: number;

beforeEach(() => {
  level = "full";
  calls = [];
  dbResult = [row];
  dbStatus = 200;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (url.origin !== env.SUPABASE_URL) throw new Error(`Unexpected request: ${url.origin}`);
    if (url.pathname === "/auth/v1/user")
      return Response.json({
        id: ID,
        email: "staff@example.test",
        email_confirmed_at: "2026-01-01T00:00:00Z",
        app_metadata: { provider: "google" },
      });
    if (url.pathname === "/rest/v1/rpc/resolve_staff_session")
      return Response.json([
        {
          staff_id: ID,
          display_name: "Staff",
          role: "custom",
          role_name: "Test",
          permisos: { configuracion: level },
        },
      ]);
    if (url.pathname !== "/rest/v1/business_hours")
      throw new Error(`Unexpected path: ${url.pathname}`);
    calls.push({
      url,
      method: init?.method ?? "GET",
      body: init?.body ? JSON.parse(String(init.body)) : null,
    });
    return Response.json(dbResult, { status: dbStatus });
  }) as typeof fetch;
});
afterEach(() => {
  globalThis.fetch = realFetch;
});

function request(body?: unknown, id = ID) {
  return app.request(`/api/v1/admin/business-hours${body === undefined ? "" : `/${id}`}`, {
    method: body === undefined ? "GET" : "PATCH",
    headers: { authorization: "Bearer test-token", "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

describe("business-hours: API real con auth/permisos y transporte Supabase simulado", () => {
  test("sin sesión no lee ni escribe", async () => {
    const response = await app.request("/api/v1/admin/business-hours");
    expect(response.status).toBe(401);
    expect(calls).toHaveLength(0);
  });
  test("view puede listar pero no editar; none no puede listar", async () => {
    level = "view";
    expect((await request()).status).toBe(200);
    expect(calls[0].url.searchParams.get("order")).toBe("weekday.asc,opens_at.asc");
    calls = [];
    expect((await request({ isActive: false })).status).toBe(403);
    expect(calls).toHaveLength(0);
    level = "none";
    expect((await request()).status).toBe(403);
    expect(calls).toHaveLength(0);
  });
  test("rechaza payload vacío, campos inesperados, horas inexistentes y orden inválido antes de I/O", async () => {
    for (const body of [
      {},
      { weekday: 1 },
      { opensAt: "25:00" },
      { closesAt: "12:60" },
      { opensAt: "8:00" },
      { isActive: "false" },
      { opensAt: "15:00", closesAt: "15:00" },
      { opensAt: "20:00", closesAt: "08:00" },
    ]) {
      expect((await request(body)).status).toBe(400);
    }
    expect((await request({ isActive: false }, "invalid-id")).status).toBe(400);
    expect(calls).toHaveLength(0);
  });
  test("edita una sola franja con comparación atómica y devuelve la fila", async () => {
    dbResult = [{ ...row, is_active: false }];
    const response = await request({
      isActive: false,
      expected: { opensAt: row.opens_at, closesAt: row.closes_at, isActive: true },
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: { ok: true, hour: { ...row, is_active: false } },
    });
    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe("PATCH");
    expect(calls[0].body).toEqual({ is_active: false });
    expect(calls[0].url.searchParams.get("id")).toBe(`eq.${ID}`);
    expect(calls[0].url.searchParams.get("opens_at")).toBe("eq.08:00:00");
    expect(calls[0].url.searchParams.get("closes_at")).toBe("eq.15:00:00");
    expect(calls[0].url.searchParams.get("is_active")).toBe("eq.true");
  });
  test("los clientes anteriores pueden seguir enviando un PATCH parcial", async () => {
    expect((await request({ opensAt: "09:00" })).status).toBe(200);
    expect(calls[0].body).toEqual({ opens_at: "09:00" });
  });
  test("fila inexistente y edición obsoleta no anuncian éxito", async () => {
    dbResult = [];
    expect((await request({ isActive: false })).status).toBe(404);
    expect(
      (
        await request({
          isActive: false,
          expected: { opensAt: "08:00:00", closesAt: "15:00:00", isActive: true },
        })
      ).status,
    ).toBe(409);
  });
  test("restricciones de DB siguen protegiendo orden parcial y superposición", async () => {
    dbStatus = 400;
    dbResult = { code: "23514", message: "business_hours_time_order" };
    const order = await request({ opensAt: "16:00" });
    expect(order.status).toBe(400);
    expect(await order.text()).toContain("posterior");
    dbResult = { code: "23P01", message: "business_hours_no_overlap" };
    const overlap = await request({ isActive: true });
    expect(overlap.status).toBe(409);
    expect(await overlap.text()).toContain("superpone");
  });
});
