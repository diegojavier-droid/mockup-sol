import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

type ApiApp = {
  fetch: (request: Request, env?: unknown, ctx?: unknown) => Promise<Response> | Response;
};

let apiAppPromise: Promise<ApiApp> | undefined;

// Worker bindings arrive on the `env` fetch argument; Node tooling reads
// process.env. loadServerEnv() accepts one source, so merge both — bindings
// win over the (possibly empty) process.env.
function collectEnvStrings(env: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (env && typeof env === "object") {
    for (const [key, value] of Object.entries(env as Record<string, unknown>)) {
      if (typeof value === "string") out[key] = value;
    }
  }
  return out;
}

async function getApiApp(workerEnv: unknown): Promise<ApiApp> {
  if (!apiAppPromise) {
    apiAppPromise = (async () => {
      const [{ createApp }, { loadServerEnv }] = await Promise.all([
        import("../server/src/app"),
        import("../server/src/config/env"),
      ]);
      const env = loadServerEnv({ ...process.env, ...collectEnvStrings(workerEnv) });
      return createApp(env) as ApiApp;
    })();
    // A failed boot (missing secrets) must not poison every later request:
    // secrets can be fixed without redeploying, and CF may reuse the isolate.
    apiAppPromise.catch(() => {
      apiAppPromise = undefined;
    });
  }
  return apiAppPromise;
}

async function handleApiRequest(request: Request, env: unknown, ctx: unknown): Promise<Response> {
  try {
    const app = await getApiApp(env);
    return await app.fetch(request, env, ctx);
  } catch (error) {
    console.error("[sol-mai-api] worker boot failed:", error);
    return Response.json(
      { error: { message: "Service temporarily unavailable", status: 503 } },
      { status: 503 },
    );
  }
}

/**
 * Cierra las reservas cuyo hold venció sin que llegara la seña.
 *
 * No libera capacidad: de eso ya se encarga `booking_blocks()`, que deja
 * de contar un `pending_payment` vencido en el mismo instante en que
 * vence. Lo que hace es dejar el estado guardado igual al estado real,
 * para que la agenda del salón no muestre pendientes eternos.
 */
async function handleScheduled(env: unknown): Promise<void> {
  const [{ createSupabaseAdminClient }, { loadServerEnv }, { expireStaleBookings }] =
    await Promise.all([
      import("../server/src/lib/supabase"),
      import("../server/src/config/env"),
      import("../server/src/lib/booking/repository"),
    ]);

  const serverEnv = loadServerEnv({ ...process.env, ...collectEnvStrings(env) });
  const expired = await expireStaleBookings(createSupabaseAdminClient(serverEnv));
  if (expired > 0) {
    console.log(`[sol-mai-cron] ${expired} reserva(s) vencida(s) sin seña`);
  }
}

export default {
  async scheduled(
    _event: unknown,
    env: unknown,
    ctx: { waitUntil?: (p: Promise<unknown>) => void },
  ) {
    const work = handleScheduled(env).catch((error) => {
      console.error("[sol-mai-cron] expire_stale_bookings falló:", error);
    });
    ctx?.waitUntil?.(work);
    await work;
  },

  async fetch(request: Request, env: unknown, ctx: unknown) {
    const { pathname } = new URL(request.url);
    if (pathname === "/api" || pathname.startsWith("/api/")) {
      return handleApiRequest(request, env, ctx);
    }

    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
