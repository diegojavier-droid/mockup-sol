import {expect,test} from 'bun:test';
import {fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {browserProfile} from './browser-profile.mjs';
import {staffFixture} from './staff.mjs';
import {expectedTermsVersion} from '../../src/deployment/original/booking-policy';
const root=fileURLToPath(new URL('../../',import.meta.url));
test('harnesses choose original explicitly and fixtures meet current contracts',()=>{
 expect(()=>browserProfile(root,undefined)).toThrow();
 for(const file of ['agenda-e2e.mjs','booking-reload-e2e.mjs','business-hours-e2e.ts']) {
  expect(readFileSync(new URL('../'+file,import.meta.url),'utf8')).toContain('browserProfile(root,"original")');
 }
 expect(staffFixture().permisos.finanzas).toBe('full');expect(staffFixture().staffId).toBeTruthy();expect(staffFixture().role).toBe('owner');
 expect(readFileSync(new URL('./agenda.tsx',import.meta.url),'utf8')).toContain('SesionPanelCtx.Provider');
 const booking=readFileSync(new URL('./booking-reload.jsx',import.meta.url),'utf8');expect(booking).toContain('termsVersion: expectedTermsVersion');expect(booking).not.toContain('test-v1');expect(expectedTermsVersion).toBe('2026-09-08');
});
for(const profile of ['original','site-test'])test(`offline browser fixture bundles resolve ${profile} adapters without server or browser`,async()=>{
 for(const fixture of ['agenda.tsx','booking-reload.jsx','../../src/components/booking/admin/BusinessHoursScreen.tsx']) {
  const result=await Bun.build({entrypoints:[fileURLToPath(new URL(fixture,import.meta.url))],...browserProfile(root,profile),target:'browser',external:['*.css'],define:{'process.env.NODE_ENV':'"development"'}});
  expect(result.logs.filter(l=>l.level==='error')).toEqual([]);expect(result.success).toBe(true);
 }
});
