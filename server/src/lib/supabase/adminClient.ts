/**
 * Supabase ADMIN client — SERVER-ONLY.
 *
 * Uses SUPABASE_SECRET_KEY. This key BYPASSES Row-Level Security.
 *
 * Import rules:
 *   ✅ Allowed:
 *     - server/src/http/routes/**       (backend route handlers)
 *     - server/src/services/**          (backend services / repositories)
 *     - server/src/jobs/**              (future background jobs)
 *   ❌ Forbidden:
 *     - src/**                          (frontend / TanStack app)
 *     - src/integrations/**             (browser Supabase integration)
 *     - Any file that is bundled into the browser
 *
 * Never re-export this module through a barrel that is reachable from
 * frontend code. Never expose SUPABASE_SECRET_KEY via publicEnv.ts,
 * VITE_* variables, or any /api response body.
 *
 * Intentionally NO top-level Supabase client instantiation: importing this
 * module has no side effects. Callers must invoke `createSupabaseAdminClient(env)`
 * explicitly, which keeps the module tree-shakeable and makes it safe to
 * import in tests without a live env.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ServerEnv } from "../../config/env";

export type SupabaseAdminClient = SupabaseClient;

/**
 * Build a Supabase client authenticated with the secret/admin key.
 * Use ONLY for trusted backend work: admin queries, writes that bypass RLS,
 * webhook processing, maintenance jobs.
 *
 * Do NOT cache across requests with per-user state — the secret key has no
 * user identity. If per-user behavior is required, use the publishable client
 * and pass the user's JWT explicitly.
 */
export function createSupabaseAdminClient(env: ServerEnv): SupabaseAdminClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        "x-sol-mai-client": "server-admin",
      },
    },
  });
}
