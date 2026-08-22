import { serve } from "@hono/node-server";
import { createApp } from "./app";
import { loadServerEnv } from "./config/env";

const env = loadServerEnv();
const app = createApp(env);
const port = env.PORT ?? 3001;

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[sol-mai-api] listening on http://localhost:${info.port} (${env.APP_ENV})`);
});
