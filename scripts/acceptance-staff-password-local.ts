/** Real Auth + real DB acceptance, exclusively against the ephemeral local stack.
 * No dotenv, no remote defaults, no passwords/tokens written or printed. */
import { createClient } from '@supabase/supabase-js';
import { Hono } from 'hono';
import { createAdminRoute } from '../server/src/http/routes/admin';
import type { ServerEnv } from '../server/src/config/env';

export function localAuthOrigin(raw: string | undefined): string {
  if (!raw) throw new Error('LOCAL_AUTH_URL_REQUIRED');
  if(!/^http:\/\/(?:localhost|127\.0\.0\.1):[0-9]+\/?$/.test(raw)) throw new Error('LOCAL_AUTH_ORIGIN_REQUIRED');
  const url = new URL(raw);
  if (url.protocol !== 'http:' || !['localhost', '127.0.0.1'].includes(url.hostname)
    || !url.port || url.username || url.password || url.pathname !== '/' || url.search || url.hash)
    throw new Error('LOCAL_AUTH_ORIGIN_REQUIRED');
  return url.origin;
}
const check: (condition: unknown, label: string) => asserts condition = (condition, label) => {
  if (!condition) throw new Error(label);
};
function successful(result: { error: unknown }, label: string) {
  if (result.error) throw new Error(label); // Never log provider error bodies/credentials.
}
export async function runLocalAcceptance() {
  check(process.env.LOCAL_AUTH_ACCEPTANCE === 'ephemeral-clean-room', 'EXPLICIT_LOCAL_OPT_IN_REQUIRED');
  const origin = localAuthOrigin(process.env.SUPABASE_LOCAL_API_URL);
  const anon = process.env.SUPABASE_LOCAL_ANON_KEY;
  const secret = process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY;
  check(anon && secret, 'LOCAL_KEYS_REQUIRED');
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    check(url.origin === origin && !url.username && !url.password, 'NON_LOCAL_TRANSPORT_REJECTED');
    return originalFetch(input, { ...init, redirect: 'error', signal: AbortSignal.timeout(10_000) });
  }) as typeof fetch;
  const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
  const admin = createClient(origin, secret, options);
  const client = () => createClient(origin, anon, options);
  const suffix = crypto.randomUUID().replaceAll('-', '').slice(0, 16);
  const role = `ci-${suffix}`;
  const staffId = crypto.randomUUID();
  const users: string[] = [];
  let roleCreated = false;
  let staffCreated = false;
  const env = {
    APP_ENV: 'local', SUPABASE_URL: origin, SUPABASE_PUBLISHABLE_KEY: anon,
    SUPABASE_SECRET_KEY: secret, INTERNAL_AUTH_ALLOWED_EMAILS: [],
    INTERNAL_AUTH_ALLOWED_PROVIDERS: ['email'],
  } as unknown as ServerEnv;
  const app = new Hono().route('/api/v1/admin', createAdminRoute(env));
  const req = (token?: string, path = '/me', method = 'GET', body?: unknown) =>
    app.request('/api/v1/admin' + path, { method, headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}), 'content-type': 'application/json',
    }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  let cleanupFailed = false;
  try {
    const accounts: Array<{ email: string; password: string }> = [];
    for (const label of ['staff', 'external']) {
      const email = `ci-${label}-${suffix}@example.invalid`;
      const password = `${crypto.randomUUID()}Aa9!`;
      const result = await admin.auth.admin.createUser({ email, password, email_confirm: true });
      successful(result, 'CREATE_LOCAL_AUTH_USER_FAILED');
      check(result.data.user?.id, 'LOCAL_AUTH_USER_MISSING');
      users.push(result.data.user.id); accounts.push({ email, password });
    }
    successful(await admin.from('roles').insert({ slug: role, name: 'CI password acceptance' }), 'CREATE_ROLE_FAILED');
    roleCreated = true;
    successful(await admin.from('role_permissions').insert({ role_slug: role, module: 'usuarios', level: 'full' }), 'CREATE_PERMISSION_FAILED');
    successful(await admin.from('staff_members').insert({ id: staffId, slug: role, display_name: 'CI ficticia',
      email: accounts[0].email, role, is_active: true }), 'CREATE_STAFF_FAILED');
    staffCreated = true;
    const wrong = await client().auth.signInWithPassword({ ...accounts[0], password: `${crypto.randomUUID()}Wrong!` });
    check(wrong.error && !wrong.data.session, 'WRONG_PASSWORD_ACCEPTED');
    const authClient = client();
    const login = await authClient.auth.signInWithPassword(accounts[0]);
    successful(login, 'PASSWORD_LOGIN_FAILED');
    const token = login.data.session?.access_token;
    check(token, 'PASSWORD_SESSION_MISSING');
    check((await req()).status === 401, 'ANONYMOUS_NOT_401');
    check((await req('invalid-token')).status === 401, 'INVALID_TOKEN_NOT_401');
    check((await req(token)).status === 200, 'STAFF_NOT_ACCEPTED');
    const externalClient = client();
    const outside = await externalClient.auth.signInWithPassword(accounts[1]);
    successful(outside, 'EXTERNAL_PASSWORD_LOGIN_FAILED');
    check(outside.data.session?.access_token, 'EXTERNAL_SESSION_MISSING');
    check((await req(outside.data.session.access_token)).status === 403, 'NON_STAFF_NOT_403');
    successful(await externalClient.auth.updateUser({ data: { role: 'owner', permisos: { usuarios: 'full' } } }), 'LOCAL_METADATA_UPDATE_FAILED');
    check((await req(outside.data.session.access_token)).status === 403, 'USER_METADATA_GRANTED_ACCESS');
    const path = `/roles/${role}/permission`;
    const body = { module: 'usuarios', level: 'full' };
    check((await req(token, path, 'POST', body)).status === 403, 'ASSIGNED_GLOBAL_WRITE_NOT_DENIED');
    successful(await admin.from('role_permissions').update({ level: 'view' }).eq('role_slug', role).eq('module', 'usuarios'), 'DOWNGRADE_FAILED');
    check((await req(token, path, 'POST', body)).status === 403, 'REVOKED_WRITE_NOT_403');
    const downgraded = await (await req(token)).json() as {data?:{agendaScope?:string;permisos?:{usuarios?:string}}};
    check(downgraded.data?.agendaScope === 'assigned' && downgraded.data?.permisos?.usuarios === 'view', 'DOWNGRADE_NOT_VISIBLE');
    check((await req(token, '/roles')).status === 403, 'ASSIGNED_GLOBAL_READ_NOT_DENIED');
    successful(await admin.from('staff_members').update({ is_active: false }).eq('id', staffId), 'DEACTIVATION_FAILED');
    check((await req(token)).status === 403, 'DEACTIVATED_STAFF_NOT_403');
    successful(await admin.from('staff_members').update({ is_active: true }).eq('id', staffId), 'REACTIVATION_FAILED');
    successful(await authClient.auth.signOut({ scope: 'local' }), 'PROVIDER_LOGOUT_FAILED');
    const replayStatus = (await req(token)).status;
    check(replayStatus === 200 || replayStatus === 401, 'UNEXPECTED_LOGOUT_RESULT');
    console.log(`LOCAL Auth logout: previous access JWT HTTP ${replayStatus}; session RPC not installed.`);
    console.log('PASS: local password login, rejection, real membership, assigned global denial, observed role downgrade and deactivation.');
  } finally {
    // Only IDs created by this run. Cleanup is checked, never silently ignored.
    const clean = async (action: () => PromiseLike<{ error: unknown }>) => {
      try { cleanupFailed = Boolean((await action()).error) || cleanupFailed; }
      catch { cleanupFailed = true; }
    };
    if (staffCreated) await clean(() => admin.from('staff_members').delete().eq('id', staffId));
    if (roleCreated) {
      await clean(() => admin.from('role_permissions').delete().eq('role_slug', role));
      await clean(() => admin.from('roles').delete().eq('slug', role));
    }
    for (const id of users) await clean(() => admin.auth.admin.deleteUser(id));
    globalThis.fetch = originalFetch;
    check(!cleanupFailed, 'LOCAL_FIXTURE_CLEANUP_FAILED');
  }
}
if (import.meta.main) {
  try { await runLocalAcceptance(); }
  catch (error) {
    // All own labels are static. Do not print unknown SDK/network error details.
    const message = error instanceof Error && /^[A-Z_]+$/.test(error.message)
      ? error.message : 'LOCAL_AUTH_ACCEPTANCE_FAILED';
    console.error(message); process.exitCode = 1;
  }
}
