/** Read-only source guard. Does not apply migrations or contact a deployment. */
import { readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import assert from 'node:assert/strict';
import ts from 'typescript';

const read = p => readFile(p, 'utf8');
async function jsonc(path) {
  const parsed = ts.parseConfigFileTextToJson(path, await read(path));
  assert(!parsed.error, `Invalid JSONC: ${path}`);
  return parsed.config;
}
async function files(dir) {
  const out=[];
  for (const e of await readdir(dir, {withFileTypes:true})) {
    const path=join(dir,e.name);
    if(e.isDirectory()) out.push(...await files(path)); else out.push(path);
  }
  return out;
}
for(const path of ['tsconfig.json','tsconfig.site-test.json']) {
  const parsed=ts.parseJsonConfigFileContent(await jsonc(path),ts.sys,process.cwd(),undefined,path);
  assert.equal(parsed.errors.length,0,`Invalid TypeScript program: ${path}`);
  for(const expected of ['src/components/booking/admin/AgendaScreen.tsx','src/components/booking/hooks/useBookingWizard.ts','src/lib/staff-auth.ts']) {
    assert(parsed.fileNames.some(name=>name.replaceAll('\\','/').endsWith('/'+expected)),`Typecheck excludes ${expected}: ${path}`);
  }
}
const original=await jsonc('wrangler.jsonc');
const site=await jsonc('wrangler.site-test.jsonc');
assert.equal(original.main,'src/server.ts');
assert.equal(original.name,'sol-mai-peluqueria');
assert.deepEqual(original.triggers?.crons,['*/5 * * * *']);
assert.equal(site.main,'src/server-site-test.ts');
assert.equal(site.name,'sol-mai-site-private-demo');
assert.equal(site.vars?.APP_ENV,'site-demo');
assert.equal(site.triggers?.crons?.length ?? 0,0);
for (const key of Object.keys(site.vars ?? {})) assert(!/SECRET|TOKEN|PASSWORD|PRIVATE|SUPABASE/i.test(key),`Site config must not store credentials: ${key}`);
assert(!/site-operating|SITE_TEST_|@deployment/.test(await read('src/server.ts')),'Original entry must retain its own API/auth/cron');
assert((await read('src/server-site-test.ts')).includes('dispatchSiteRequest'),'Site entry must retain owner dispatch');
for(const path of await files('supabase/migrations')) {
  if(!path.endsWith('.sql')) continue;
  assert(!/site[_-](operating|test)|site-owner@example\.invalid/i.test(path+'\n'+await read(path)),`Isolated Site migration in canonical runner: ${path}`);
}
const protectedFiles=new Set(['src/server.ts','src/server-site-test.ts']);
for(const path of await files('src')) {
  if(!/\.[cm]?[jt]sx?$/.test(path)||/\.test\./.test(path)||protectedFiles.has(path)) continue;
  assert(!/(?:from\s*|import\s*\()['"][^'"]*\bserver\//.test(await read(path)),`Browser source imports server-only code: ${path}`);
}
const packageJson=JSON.parse(await read('package.json'));
assert(packageJson.scripts['build:original'].includes('SOL_MAI_PROFILE=original'));
assert(packageJson.scripts['build:site-test'].includes('SOL_MAI_PROFILE=site-test'));
assert(packageJson.scripts.build.includes('build:original'));
assert(packageJson.scripts.deploy.includes('build:original'));
assert(!/SITE_TEST_|site-operating/.test(await read('server/src/config/legal.ts')),'Canonical terms must not silently become Site terms');
console.log('PASS: distinct entries, original cron, Site credentials absent, isolated migrations excluded, frontend/server imports separated');
