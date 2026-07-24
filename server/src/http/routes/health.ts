import { Hono } from "hono";
import type { ServerEnv } from "../../config/env";

export const SERVICE_NAME = "sol-mai-api";
export const SERVICE_VERSION = "0.1.0";

export function createHealthRoute(env: ServerEnv) {
  const route = new Hono();

  // GET /api/v1/health
  // Public. No auth. No DB. No secrets. No Supabase project ref.
  route.get("/health", (c) =>
    c.json({
      status: "ok",
      service: SERVICE_NAME,
      environment: env.APP_ENV,
      version: SERVICE_VERSION,
      time: new Date().toISOString(),
    }),
  );

  return route;
}
