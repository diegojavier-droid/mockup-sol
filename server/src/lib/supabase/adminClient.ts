/**
 * Supabase ADMIN client — SERVER-ONLY.
 *
 * Uses SUPABASE_SECRET_KEY. This key BYPASSES Row-Level Security.
 * The key is intentionally optional at backend startup and is required only
 * when privileged/admin functionality actually asks for this client.
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
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ServerEnv } from "../../config/env";

export type SupabaseAdminClient = SupabaseClient;

/**
 * Build a Supabase client authenticated with the secret/admin key.
 * Use ONLY for trusted backend work: admin queries, writes that bypass RLS,
 * webhook processing, maintenance jobs.
 */
export function createSupabaseAdminClient(env: ServerEnv): SupabaseAdminClient {
  if (!env.SUPABASE_SECRET_KEY) {
    throw new Error(
      "SUPABASE_SECRET_KEY is required for privileged Supabase operations. " +
        "Configure it only in the trusted backend environment that needs admin access.",
    );
  }

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
