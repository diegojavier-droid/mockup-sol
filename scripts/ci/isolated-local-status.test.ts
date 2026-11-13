import { expect, test } from 'bun:test';
import { localStatusEnvironment } from './isolated-local-status';
const fixture = { API_URL: 'http://127.0.0.1:54321', DB_URL: 'postgresql://postgres:local-fixture@127.0.0.1:54322/postgres', ANON_KEY: 'fictitious-anon', SERVICE_ROLE_KEY: 'fictitious-service' };
test('extracts explicit loopback local stack values only', () => {
  const out = localStatusEnvironment(fixture);
  expect(out.PGHOST).toBe('127.0.0.1'); expect(out.PGPORT).toBe('54322');
  expect(out.PGDATABASE).toBe('postgres'); expect(out.PGPASSWORD).toBe('local-fixture');
  expect(out.SUPABASE_LOCAL_API_URL).toBe(fixture.API_URL);
  expect(localStatusEnvironment({ ...fixture, DB_URL: fixture.DB_URL.replace('local-fixture', 'local%21fixture') }).PGPASSWORD).toBe('local!fixture');
});
test('rejects remote/ambiguous API and DB destinations before use', () => {
  for (const API_URL of ['https://ijzpmwwjuvsgcsbcbzav.supabase.co', 'http://127.1:54321', 'http://2130706433:54321', 'http://0177.0.0.1:54321', 'http://127.0.0.1:54321?', 'http://127.0.0.1:54321#', 'http://x@localhost:54321', 'http://localhost:65536', 'http://localhost:54321/path']) {
    expect(() => localStatusEnvironment({ ...fixture, API_URL })).toThrow('INVALID_DISPOSABLE_LOCAL_STATUS');
  }
  for (const DB_URL of ['postgresql://postgres:x@db.ijzpmwwjuvsgcsbcbzav.supabase.co:5432/postgres', 'postgresql://postgres:x@127.1:54322/postgres', 'postgresql://postgres:x@127.0.0.1:54322/postgres?host=remote', 'postgresql://postgres:x@127.0.0.1:54322/other', 'postgresql://other:x@127.0.0.1:54322/postgres', 'postgresql://postgres:x%0aPGHOST=remote@localhost:54322/postgres', 'postgresql:///postgres?host=/tmp']) {
    expect(() => localStatusEnvironment({ ...fixture, DB_URL })).toThrow('INVALID_DISPOSABLE_LOCAL_STATUS');
  }
});
test('rejects absent or multiline keys, never accepts dotenv shell input', () => {
  for (const value of ['', undefined, 3, 'fake\nPGHOST=remote', 'fake\0key']) {
    expect(() => localStatusEnvironment({ ...fixture, SERVICE_ROLE_KEY: value })).toThrow();
  }
  expect(() => localStatusEnvironment('API_URL=http://localhost:54321')).toThrow();
});
