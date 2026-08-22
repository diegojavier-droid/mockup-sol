import { Hono } from "hono";
import type { ServerEnv } from "./config/env";
import { errorHandler, notFoundHandler } from "./http/middleware/errorHandler";
import { createHealthRoute } from "./http/routes/health";
import { createCatalogRoute } from "./http/routes/catalog";
import { createQuoteRoute } from "./http/routes/quote";

export function createApp(env: ServerEnv) {
  const app = new Hono();

  const v1 = new Hono();
  v1.route("/", createHealthRoute(env));
  v1.route("/catalog", createCatalogRoute(env));
  v1.route("/quote", createQuoteRoute(env));

  app.route("/api/v1", v1);

  app.notFound(notFoundHandler);
  app.onError(errorHandler);

  return app;
}
