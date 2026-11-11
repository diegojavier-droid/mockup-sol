import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { Hono } from "hono";
import { createBookingsRoute } from "./bookings";
import { createQuoteRoute } from "./quote";
import type { ServerEnv } from "../../config/env";

// Ningún caso debe llegar a Supabase. Un env vacío y un fetch que falla
// hacen visible cualquier I/O anterior a la validación de privacidad.
const app = new Hono()
  .route("/bookings", createBookingsRoute({} as ServerEnv))
  .route("/quote", createQuoteRoute({} as ServerEnv));
const body = {
  serviceSlug: "corte-fem",
  startsAt: "2030-11-12T12:00:00-03:00",
  customer: { firstName: "Prueba", phone: "+5493425550000", email: "prueba@example.test" },
  personalization: { alergias: "si-importantes" },
};
let fetchSpy: ReturnType<typeof spyOn> | undefined;
afterEach(() => {
  fetchSpy?.mockRestore();
  fetchSpy = undefined;
});
const post = (path: string, payload: unknown) =>
  app.request(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

describe("frontera HTTP de privacidad", () => {
  test("sin consentimiento no consulta ni escribe en Supabase", async () => {
    fetchSpy = spyOn(globalThis, "fetch").mockRejectedValue(new Error("I/O inesperado"));
    const response = await post("/bookings", body);
    expect(response.status).toBe(400);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  test("versión vieja se rechaza antes de cargar datos externos", async () => {
    fetchSpy = spyOn(globalThis, "fetch").mockRejectedValue(new Error("I/O inesperado"));
    const response = await post("/bookings", { ...body, consent: { termsVersion: "obsoleta" } });
    expect(response.status).toBe(422);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  test("cotizar no admite alergias, también en cada servicio de un combo", async () => {
    fetchSpy = spyOn(globalThis, "fetch").mockRejectedValue(new Error("I/O inesperado"));
    for (const payload of [
      body,
      { ...body, personalization: { " Alergias ": "no" } },
      { services: [{ serviceSlug: "corte-fem" }, body] },
    ]) {
      const response = await post("/quote", payload);
      expect(response.status).toBe(400);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
