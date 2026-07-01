import type { ServerEnv } from "./env";

/**
 * Public-safe subset of the server env.
 *
 * Anything returned here MAY be sent to the browser (e.g. via a
 * dedicated /api/v1/public-config endpoint in future phases).
 *
 * MUST NEVER include:
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - MERCADO_PAGO_ACCESS_TOKEN
 *   - MERCADO_PAGO_WEBHOOK_SECRET
 *   - EMAIL_PROVIDER_API_KEY
 *   - WHATSAPP_PROVIDER_TOKEN
 *   - INTERNAL_SIGNING_SECRET
 *   - INTERNAL_AUTH_ALLOWED_EMAILS (PII / access list)
 */
export interface PublicEnv {
  appEnv: ServerEnv["APP_ENV"];
  apiBaseUrl: string;
  publicWebBaseUrl: string;
}

export function toPublicEnv(env: ServerEnv): PublicEnv {
  return {
    appEnv: env.APP_ENV,
    apiBaseUrl: env.API_BASE_URL,
    publicWebBaseUrl: env.PUBLIC_WEB_BASE_URL,
  };
}
