/**
 * Supabase ANON / publishable client — SERVER-ONLY variant.
 *
 * Uses SUPABASE_PUBLISHABLE_KEY (the new-format opaque key that Lovable
 * Cloud provides). RLS is enforced. Intended for:
 *   - Executing catalog reads "as anon" from the backend.
 *   - Validating a user-provided JWT server-side by forwarding the
 *     caller's Bearer token via `accessToken` (future auth phase).
 *
 * Lives in `server/` so the browser Supabase integration stays isolated
 * from backend code paths.
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

function isOpaquePublishableKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

export function createSupabaseAnonClient(
  env: ServerEnv,
  options: CreateAnonClientOptions = {},
): SupabaseAnonServerClient {
  const key = env.SUPABASE_PUBLISHABLE_KEY;
  const headers: Record<string, string> = {
    "x-sol-mai-client": "server-anon",
    // New-format publishable keys are opaque strings, not JWTs. PostgREST
    // requires them in the `apikey` header; the SDK sets it, but we set it
    // here too so any custom fetch path stays correct.
    apikey: key,
  };
  if (options.accessToken) {
    headers.Authorization = `Bearer ${options.accessToken}`;
  } else if (isOpaquePublishableKey(key)) {
    // Do NOT send Authorization: Bearer <opaque publishable key>.
    // PostgREST will try to parse it as a JWT and fail with
    // "Expected 3 parts in JWT; got 1".
  }

  return createClient(env.SUPABASE_URL, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: { headers },
  });
}

