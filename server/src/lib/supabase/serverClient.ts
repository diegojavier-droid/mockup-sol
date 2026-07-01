/**
 * Supabase ANON client — SERVER-ONLY variant.
 *
 * Uses SUPABASE_ANON_KEY. RLS is enforced. This client is intended for:
 *   - Validating a user-provided JWT server-side (future internal auth).
 *   - Executing queries "as the caller" by attaching the caller's Bearer
 *     token via the `accessToken` / global headers pattern in a future phase.
 *
 * It lives in `server/` (never in `src/`) so that the browser Supabase
 * integration stays isolated from backend code paths.
 *
 * Import rules mirror adminClient.ts:
 *   ✅ Allowed under server/**
 *   ❌ Forbidden under src/**
 *
 * No side effects at import time.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ServerEnv } from "../../config/env";

export type SupabaseAnonServerClient = SupabaseClient;

export interface CreateAnonClientOptions {
  /** Optional Bearer token to forward as the caller identity. */
  accessToken?: string;
}

export function createSupabaseAnonClient(
  env: ServerEnv,
  options: CreateAnonClientOptions = {},
): SupabaseAnonServerClient {
  const headers: Record<string, string> = {
    "x-sol-mai-client": "server-anon",
  };
  if (options.accessToken) {
    headers.Authorization = `Bearer ${options.accessToken}`;
  }

  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: { headers },
  });
}
