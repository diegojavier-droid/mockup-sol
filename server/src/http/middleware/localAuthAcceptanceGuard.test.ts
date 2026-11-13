import { expect, it } from 'bun:test';
import { localAuthOrigin } from '../../../../scripts/acceptance-staff-password-local';
it('real Auth acceptance permits only explicit HTTP loopback origins with ports', () => {
  expect(localAuthOrigin('http://127.0.0.1:54321')).toBe('http://127.0.0.1:54321');
  expect(localAuthOrigin('http://localhost:54321/')).toBe('http://localhost:54321');
  for (const value of [undefined, '', 'https://example.supabase.co', 'http://localhost',
    'http://localhost.evil:54321', 'http://localhost:54321/path', 'http://x@localhost:54321',
    'http://localhost:54321/?remote=1', 'https://localhost:54321', 'http://[::1]:54321']) {
    expect(() => localAuthOrigin(value)).toThrow();
  }
});
