/** Offline HTTP integration: real Hono router, staffAuth, provider checks and
 * permission middleware; only Supabase transport is replaced. Not a DB/RLS test. */
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import type { StaffIdentity } from './staffAuth';
import { createAdminRoute } from '../routes/admin';
import type { ServerEnv } from '../../config/env';
import { __resetSupabaseSettingsCache } from '../../lib/identity/supabase-settings';

const env = {
  APP_ENV: 'production', SUPABASE_URL: 'https://offline.invalid',
  SUPABASE_PUBLISHABLE_KEY: 'offline-public', SUPABASE_SECRET_KEY: 'offline-secret',
  INTERNAL_AUTH_ALLOWED_EMAILS: ['bootstrap@example.invalid'],
  INTERNAL_AUTH_ALLOWED_PROVIDERS: ['email'],
} as ServerEnv;
const originalFetch = globalThis.fetch;
let calls: string[];
let rows: unknown[];
let user: Record<string, unknown>;
let invalid: boolean;
let unsafeSettings: boolean;
let app: Hono;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'content-type': 'application/json' },
});
async function sessionBody(res: Response): Promise<{ data: StaffIdentity }> {
  return await res.json() as { data: StaffIdentity };
}
const staff = (permisos: Record<string, string> = { usuarios: 'view' }) => ({
  staff_id: '11111111-1111-4111-8111-111111111111', display_name: 'Prueba',
  role: 'recepcion', role_name: 'Recepción', permisos,
});
function request(path = '/me', method = 'GET', body?: unknown, token: string | null = 'offline-token') {
  return app.request('/api/v1/admin' + path, {
    method, headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), 'content-type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
beforeEach(() => {
  calls = []; rows = [staff()]; invalid = false; unsafeSettings = false;
  user = { id: '22222222-2222-4222-8222-222222222222', email: 'staff@example.invalid',
    email_confirmed_at: '2026-01-01T00:00:00Z', app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: { role: 'owner', permisos: { usuarios: 'full' } } };
  __resetSupabaseSettingsCache();
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (url.origin !== env.SUPABASE_URL) throw new Error('Unexpected destination');
    calls.push(url.pathname);
    if (url.pathname === '/auth/v1/user') return invalid
      ? json({ message: 'invalid token', code: 'bad_jwt' }, 401) : json(user);
    if (url.pathname === '/auth/v1/settings') return json({ mailer_autoconfirm: unsafeSettings,
      disable_signup: false, external: { email: true } });
    if (url.pathname === '/rest/v1/rpc/resolve_staff_session') {
      expect(JSON.parse(String(init?.body))).toEqual({ p_email: user.email });
      return json(rows);
    }
    if (url.pathname === '/rest/v1/rpc/provision_initial_owner') return json(null);
    throw new Error(`Unexpected offline request: ${url.pathname}`);
  }) as typeof fetch;
  app = new Hono().route('/api/v1/admin', createAdminRoute(env));
});
afterEach(() => { globalThis.fetch = originalFetch; __resetSupabaseSettingsCache(); });

describe('staff password identity and live role authorization (offline)', () => {
  it('anonymous is 401 without transport', async () => {
    const res = await request('/me', 'GET', undefined, null);
    expect(res.status).toBe(401);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(calls).toEqual([]);
  });
  it('invalid token is 401 before staff lookup', async () => {
    invalid = true;
    expect((await request()).status).toBe(401);
    expect(calls).toEqual(['/auth/v1/user']);
  });
  it('verified password/email identity with active staff is accepted', async () => {
    const res = await request(); expect(res.status).toBe(200);
    expect((await sessionBody(res)).data.role).toBe('recepcion');
    expect(res.headers.get('cache-control')).toBe('no-store');
  });
  it('authenticated non-staff is 403 and cannot bootstrap', async () => {
    rows = [];
    const res = await request(); expect(res.status).toBe(403);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(calls).not.toContain('/rest/v1/rpc/provision_initial_owner');
  });
  it('inactive/deleted staff disappears from resolver on the next request', async () => {
    expect((await request()).status).toBe(200);
    rows = [];
    expect((await request()).status).toBe(403);
    expect(calls.filter(p => p.endsWith('/resolve_staff_session'))).toHaveLength(2);
  });
  it('permission revocation changes the next session and blocks role writes', async () => {
    rows = [staff({ usuarios: 'full' })];
    expect((await sessionBody(await request())).data.permisos.usuarios).toBe('full');
    rows = [staff({ usuarios: 'none' })];
    expect((await sessionBody(await request())).data.permisos.usuarios).toBe('none');
    expect((await request('/staff/11111111-1111-4111-8111-111111111111/role', 'POST', { role: 'owner' })).status).toBe(403);
    expect(calls.every(p => !p.includes('set_'))).toBe(true);
  });
  it('client body and user-editable metadata cannot grant owner permissions', async () => {
    expect((await request('/roles/test/permission', 'POST', {
      role: 'owner', module: 'usuarios', level: 'full', permisos: { usuarios: 'full' },
    })).status).toBe(403);
    expect(calls.filter(p => p.startsWith('/rest/'))).toEqual(['/rest/v1/rpc/resolve_staff_session']);
  });
  it('unverified email and unsafe email-provider settings fail closed', async () => {
    user.email_confirmed_at = null;
    expect((await request()).status).toBe(401);
    user.email_confirmed_at = '2026-01-01T00:00:00Z'; unsafeSettings = true;
    __resetSupabaseSettingsCache();
    expect((await request()).status).toBe(401);
    expect(calls).not.toContain('/rest/v1/rpc/resolve_staff_session');
  });
  it('untrusted provider is rejected even with forged user metadata', async () => {
    user.app_metadata = { provider: 'unknown', providers: ['unknown'] };
    user.user_metadata = { provider: 'email', role: 'owner' };
    expect((await request()).status).toBe(401);
    expect(calls).not.toContain('/rest/v1/rpc/resolve_staff_session');
  });
  it('bootstrap allowlist cannot reactivate an account when SQL resolver stays empty', async () => {
    user.email = 'bootstrap@example.invalid'; rows = [];
    expect((await request()).status).toBe(403);
    expect(calls.filter(p => p.endsWith('/resolve_staff_session'))).toHaveLength(2);
  });
});
