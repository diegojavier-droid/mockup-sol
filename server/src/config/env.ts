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

/**
 * Proveedores en los que se puede confiar el email en PRODUCCIÓN.
 *
 * La política de identidad vincula automáticamente por email
 * coincidente. Eso sólo es seguro si el proveedor VERIFICA que el email
 * es de quien entra. Con el alta por email y clave —el default de
 * Supabase— cualquiera se registra con el correo de otra persona, así
 * que admitirlo en producción reabriría el acceso a fichas ajenas.
 *
 * CI lo abre a `email` a propósito, porque Supabase local sólo emite
 * esos tokens; por eso el guard mira `APP_ENV` en vez de prohibirlo
 * siempre.
 */
/**
 * `email` entra en la lista, pero NO alcanza con ponerlo acá: en
 * producción se acepta sólo si Supabase exige confirmar el correo, cosa
 * que se le pregunta a Supabase en cada arranque de instancia
 * (`lib/identity/supabase-settings.ts`). Si auto-confirma, o si no se
 * pudo averiguar, el proveedor se descarta igual.
 *
 * El motivo de tenerlo: entrar con un link al mail no exige credenciales
 * de Google Cloud ni que la persona tenga cuenta de Google, y el link
 * prueba que la casilla es suya igual que lo probaría Google.
 */
const TRUSTED_PRODUCTION_PROVIDERS = ["google", "email"] as const;

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

  // Supabase — publishable access is enough for the current read-only catalog
  // API. The secret/admin key remains optional until a trusted write/admin
  // capability actually needs it.
  SUPABASE_URL: z.string().url(),
  SUPABASE_PUBLISHABLE_KEY: nonEmpty,
  SUPABASE_SECRET_KEY: nonEmpty.optional(),

  // Internal auth (staff/owner console access via JWT)
  INTERNAL_AUTH_JWT_AUDIENCE: nonEmpty,
  INTERNAL_AUTH_ALLOWED_EMAILS: csvEmails,
  /**
   * Proveedores de identidad admitidos, separados por coma.
   *
   * El default es `google` y así queda en producción: la vinculación
   * automática por email coincidente supone un proveedor que verifica el
   * email, y admitir uno que no lo verifique convierte esa vinculación
   * en una vía de acceso a fichas ajenas.
   *
   * Existe como variable para que CI pueda ejercitar el flujo real con
   * el proveedor que Supabase le permite crear. Vacío NO significa
   * "cualquiera": el schema exige al menos un valor.
   */
  INTERNAL_AUTH_ALLOWED_PROVIDERS: z
    .string()
    .default("google,email")
    .transform((raw) =>
      raw
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    )
    .pipe(z.array(z.string().min(1)).min(1)),

  // ---- Reserved for future phases (optional now) ----------------------
  MERCADO_PAGO_ACCESS_TOKEN: z.string().min(1).optional(),
  MERCADO_PAGO_WEBHOOK_SECRET: z.string().min(1).optional(),
  EMAIL_PROVIDER_API_KEY: z.string().min(1).optional(),
  WHATSAPP_PROVIDER_TOKEN: z.string().min(1).optional(),
  INTERNAL_SIGNING_SECRET: z.string().min(1).optional(),

  /**
   * Clave de la API de Claude, para el asistente de precios del panel.
   *
   * Es opcional a propósito: sin ella el panel sigue entero y Sol edita
   * precio por precio como siempre. Lo único que desaparece es el campo
   * donde se le escribe la instrucción en castellano, y desaparece
   * entero —no queda un botón que falle—.
   */
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  /**
   * Modelo a usar. Existe como variable para poder cambiarlo sin
   * desplegar código, no porque haya que tocarlo: el default alcanza.
   * La tarea es entender una frase corta, no razonar.
   */
  ANTHROPIC_MODEL: z.string().min(1).default("claude-haiku-4-5"),

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

  // Supabase local tooling still emits the legacy SERVICE_ROLE_KEY variable.
  // Accept it only as a compatibility alias. Owned cloud projects should use
  // SUPABASE_SECRET_KEY once privileged backend writes are introduced.
  const normalizedSource: NodeJS.ProcessEnv = {
    ...source,
    SUPABASE_SECRET_KEY: source.SUPABASE_SECRET_KEY ?? source.SUPABASE_SERVICE_ROLE_KEY,
  };

  // Un secreto opcional definido pero VACÍO vale lo mismo que no
  // definido. Sin esto, el Worker no arranca: el esquema exige `min(1)` y
  // una cadena vacía falla la validación, así que el sitio entero se cae
  // por una integración que ni siquiera está en uso.
  //
  // No es hipotético: el despliegue publica estos secretos desde GitHub,
  // y un secreto creado sin valor —o borrado a medias— llega como "".
  //
  // Se limita a esta lista a propósito. Hacerlo con TODAS las variables
  // sería más prolijo y más peligroso: en `INTERNAL_AUTH_ALLOWED_EMAILS`
  // una cadena vacía puede significar «nadie», y convertirla en «no
  // definida» dejaría que se aplique un default más permisivo.
  const OPTIONAL_SECRETS = [
    "MERCADO_PAGO_ACCESS_TOKEN",
    "MERCADO_PAGO_WEBHOOK_SECRET",
    "EMAIL_PROVIDER_API_KEY",
    "WHATSAPP_PROVIDER_TOKEN",
    "INTERNAL_SIGNING_SECRET",
    "ANTHROPIC_API_KEY",
    "ANTHROPIC_MODEL",
  ] as const;

  for (const key of OPTIONAL_SECRETS) {
    if (normalizedSource[key]?.trim() === "") delete normalizedSource[key];
  }

  const parsed = serverEnvSchema.safeParse(normalizedSource);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Invalid server environment configuration:\n${issues}\n` +
        `See docs/backend-env.md for the required variables.`,
    );
  }
  // Producción no arranca con una política de identidad insegura. Una
  // variable mal puesta es un error de despliegue silencioso: preferimos
  // que el servidor no levante antes que servir fichas ajenas.
  if (parsed.data.APP_ENV === "production") {
    const untrusted = parsed.data.INTERNAL_AUTH_ALLOWED_PROVIDERS.filter(
      (p) =>
        !TRUSTED_PRODUCTION_PROVIDERS.includes(p as (typeof TRUSTED_PRODUCTION_PROVIDERS)[number]),
    );
    if (untrusted.length > 0) {
      throw new Error(
        `Invalid server environment configuration:\n` +
          `  - INTERNAL_AUTH_ALLOWED_PROVIDERS: ${untrusted.join(", ")} no verifica el email y ` +
          `no puede usarse con APP_ENV=production.\n` +
          `    En producción sólo se admite: ${TRUSTED_PRODUCTION_PROVIDERS.join(", ")}.\n` +
          `    La vinculación automática por email coincidente supone un proveedor que ` +
          `verifica el email; con uno que no lo hace, cualquiera entra a la ficha de otra persona.`,
      );
    }
  }

  cached = parsed.data;
  return cached;
}

/** For tests only. */
export function __resetServerEnvCache() {
  cached = null;
}
