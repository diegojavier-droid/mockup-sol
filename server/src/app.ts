import { Hono } from "hono";
import type { ServerEnv } from "./config/env";
import { errorHandler, notFoundHandler } from "./http/middleware/errorHandler";
import { createHealthRoute } from "./http/routes/health";
import { createCatalogRoute } from "./http/routes/catalog";
import { createQuoteRoute } from "./http/routes/quote";
import { createAvailabilityRoute } from "./http/routes/availability";
import { createBookingsRoute } from "./http/routes/bookings";
import { createIdentityRoute } from "./http/routes/identity";
import { createPaymentsRoute } from "./http/routes/payments";
import { createAdminRoute } from "./http/routes/admin";

export function createApp(env: ServerEnv) {
  const app = new Hono();

  const v1 = new Hono();
  v1.route("/", createHealthRoute(env));
  v1.route("/catalog", createCatalogRoute(env));
  v1.route("/quote", createQuoteRoute(env));
  v1.route("/availability", createAvailabilityRoute(env));
  v1.route("/bookings", createBookingsRoute(env));
  v1.route("/identity", createIdentityRoute(env));
  v1.route("/payments", createPaymentsRoute(env));
  v1.route("/admin", createAdminRoute(env));

  app.route("/api/v1", v1);

  app.notFound(notFoundHandler);
  app.onError(errorHandler);

  return app;
}
