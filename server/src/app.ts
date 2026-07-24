import { Hono } from "hono";
import type { ServerEnv } from "./config/env";
import { errorHandler, notFoundHandler } from "./http/middleware/errorHandler";
import { createHealthRoute } from "./http/routes/health";
import { createCatalogRoute } from "./http/routes/catalog";

export function createApp(env: ServerEnv) {
  const app = new Hono();

  const v1 = new Hono();
  v1.route("/", createHealthRoute(env));
  v1.route("/catalog", createCatalogRoute(env));

  app.route("/api/v1", v1);

  app.notFound(notFoundHandler);
  app.onError(errorHandler);

  return app;
}
