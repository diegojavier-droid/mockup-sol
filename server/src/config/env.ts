import { z } from "zod";

/**
 * Server-only environment contract.
 *
 * IMPORTANT:
 *   - This module MUST NOT be imported from any frontend code (src/**).
 *   - Strict validation runs only when `loadServerEnv()` is called at
 *     backend startup (server/src/index.ts). It does NOT run during the
 *     Vite/TanStack frontend build.
 *   - Never expose these values with a VITE_ prefix. Anything the client
 *     needs must go through server/src/config/publicEnv.ts.
 */

const nonEmpty = z.string().min(1, "must not be empty");

const csvEmails = z
  .string()
  .min(1, "must contain at least one email")
  .transform((raw) =>
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  )
  .pipe(z.array(z.string().email()).min(1));

const serverEnvSchema = z.object({
  // Runtime
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_ENV: z.enum(["local", "staging", "production"]),

  // Public-facing base URLs (safe to reference, not secret)
  API_BASE_URL: z.string().url(),
  PUBLIC_WEB_BASE_URL: z.string().url(),

  // Supabase — server-only. SERVICE_ROLE_KEY is a hard secret.
  // Naming aligns with Lovable Cloud, which injects SUPABASE_PUBLISHABLE_KEY
  // (the new-format opaque publishable key, `sb_publishable_*`). No aliases.
  SUPABASE_URL: z.string().url(),
  SUPABASE_PUBLISHABLE_KEY: nonEmpty,
  SUPABASE_SERVICE_ROLE_KEY: nonEmpty,

  // Internal auth (staff/owner console access via JWT)
  INTERNAL_AUTH_JWT_AUDIENCE: nonEmpty,
  INTERNAL_AUTH_ALLOWED_EMAILS: csvEmails,

  // ---- Reserved for future phases (optional now) ----------------------
  MERCADO_PAGO_ACCESS_TOKEN: z.string().min(1).optional(),
  MERCADO_PAGO_WEBHOOK_SECRET: z.string().min(1).optional(),
  EMAIL_PROVIDER_API_KEY: z.string().min(1).optional(),
  WHATSAPP_PROVIDER_TOKEN: z.string().min(1).optional(),
  INTERNAL_SIGNING_SECRET: z.string().min(1).optional(),

  // Optional network binding
  PORT: z
    .string()
    .regex(/^\d+$/)
    .transform((v) => Number(v))
    .optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | null = null;

export function loadServerEnv(source: NodeJS.ProcessEnv = process.env): ServerEnv {
  if (cached) return cached;
  const parsed = serverEnvSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Invalid server environment configuration:\n${issues}\n` +
        `See docs/backend-env.md for the required variables.`,
    );
  }
  cached = parsed.data;
  return cached;
}

/** For tests only. */
export function __resetServerEnvCache() {
  cached = null;
}
