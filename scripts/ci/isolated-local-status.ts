/** Read only a newly started disposable Supabase stack's status. No remote fallback. */
import { readFileSync, appendFileSync } from 'node:fs';

const reject = (): never => { throw new Error('INVALID_DISPOSABLE_LOCAL_STATUS'); };
function port(value: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 65535) reject();
  return n;
}
function scalar(value: unknown): string {
  if (typeof value !== 'string' || value.length < 1 || value.length > 16_384 || /[\r\n\0]/.test(value)) reject();
  return value;
}
export function localStatusEnvironment(input: unknown): Record<string, string> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) reject();
  const data = input as Record<string, unknown>;
  const api = scalar(data.API_URL);
  // Check raw authority, not just WHATWG URL: 127.1/integer/octal IPs normalize.
  const apiParts = /^http:\/\/(127\.0\.0\.1|localhost):([1-9][0-9]{0,4})\/?$/.exec(api);
  if (!apiParts) reject();
  port(apiParts[2]);
  const db = scalar(data.DB_URL);
  const dbParts = /^postgres(?:ql)?:\/\/postgres:([^@\/?#\s]+)@(127\.0\.0\.1|localhost):([1-9][0-9]{0,4})\/postgres$/.exec(db);
  if (!dbParts) reject();
  let password: string;
  try { password = scalar(decodeURIComponent(dbParts[1])); } catch { return reject(); }
  return {
    SUPABASE_LOCAL_API_URL: api.replace(/\/$/, ''),
    SUPABASE_LOCAL_DB_URL: db,
    SUPABASE_LOCAL_ANON_KEY: scalar(data.ANON_KEY),
    SUPABASE_LOCAL_SERVICE_ROLE_KEY: scalar(data.SERVICE_ROLE_KEY),
    PGHOST: dbParts[2], PGPORT: String(port(dbParts[3])),
    PGDATABASE: 'postgres', PGUSER: 'postgres', PGPASSWORD: password,
  };
}

if (import.meta.main) {
  try {
    if (process.env.GITHUB_ACTIONS !== 'true' || !process.env.GITHUB_ENV || !process.argv[2]
      || process.env.SUPABASE_ACCESS_TOKEN || process.env.SUPABASE_DB_PASSWORD) reject();
    const values = localStatusEnvironment(JSON.parse(readFileSync(process.argv[2], 'utf8')));
    // GitHub consumes these commands as masks, not log text. Never upload the file.
    for (const name of ['SUPABASE_LOCAL_ANON_KEY', 'SUPABASE_LOCAL_SERVICE_ROLE_KEY', 'SUPABASE_LOCAL_DB_URL', 'PGPASSWORD']) {
      console.log(`::add-mask::${values[name].replace(/%/g, '%25')}`);
    }
    appendFileSync(process.env.GITHUB_ENV, Object.entries(values).map(([key, value]) => `${key}=${value}\n`).join(''));
    console.log('Disposable local API and database origins verified.');
  } catch {
    console.error('INVALID_DISPOSABLE_LOCAL_STATUS'); process.exitCode = 1;
  }
}
