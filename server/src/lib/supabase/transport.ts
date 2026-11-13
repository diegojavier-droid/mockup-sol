/** Request-scoped transport for the isolated Site adapter. Default deployment is unchanged. */
import type { ServerEnv } from '../../config/env';
const transports = new WeakMap<ServerEnv, typeof fetch>();
export function bindSupabaseTransport(env: ServerEnv, transport: typeof fetch) { transports.set(env, transport); }
export function supabaseTransport(env: ServerEnv): typeof fetch | undefined { return transports.get(env); }
