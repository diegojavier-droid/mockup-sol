/**
 * Controlled barrel for Supabase server-only clients.
 *
 * SERVER-ONLY. Never import this module from src/**.
 * See docs/backend-supabase.md for the full policy.
 */

export {
  createSupabaseAdminClient,
  type SupabaseAdminClient,
} from "./adminClient";

export {
  createSupabaseAnonClient,
  type SupabaseAnonServerClient,
  type CreateAnonClientOptions,
} from "./serverClient";
