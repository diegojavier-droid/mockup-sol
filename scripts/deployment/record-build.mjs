/** Record hashes of a local build. This script never uploads or deploys it. */
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const profile=process.argv[2];
assert(['original','site-test'].includes(profile),'Explicit deployment profile required');
const config=JSON.parse(await readFile('dist/server/wrangler.json','utf8'));
assert.equal(config.name,profile==='original'?'sol-mai-peluqueria':'sol-mai-site-private-demo','Wrong Worker artifact for requested profile');
assert.equal(config.triggers?.crons?.length??0,profile==='original'?1:0,'Wrong scheduled-job profile');
const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const tree=execFileSync('git',['rev-parse','HEAD^{tree}'],{encoding:'utf8'}).trim();
const dirty=execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim().length>0;
const canonicalCommit=process.env.SOL_MAI_CANONICAL_SOURCE || sha;
assert(/^[a-f0-9]{40}$/.test(canonicalCommit),'Canonical source must be a full Git commit hash');
const canonicalTree=execFileSync('git',['rev-parse',`${canonicalCommit}^{tree}`],{encoding:'utf8'}).trim();
assert.equal(canonicalTree,tree,'A Site delivery commit must have the exact canonical source tree');
if(canonicalCommit!==sha) execFileSync('git',['merge-base','--is-ancestor',canonicalCommit,sha]);
const artifacts=[];
async function scan(dir) {
  for(const entry of await readdir(dir,{withFileTypes:true})) {
    const path=join(dir,entry.name);
    if(entry.isDirectory()) { await scan(path); continue; }
    if(entry.name==='build-provenance.json') continue;
    const bytes=await readFile(path);
    artifacts.push({path,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length});
    if(/\.(js|mjs|json|map)$/.test(path)) {
      const text=bytes.toString('utf8');
      assert(!/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|sb_secret_[A-Za-z0-9_-]{20,}|"kty"\s*:\s*"EC"[^\n]{0,500}"d"\s*:\s*"[A-Za-z0-9_-]{43}"/.test(text),`Credential pattern in artifact: ${path}`);
      if(path.startsWith('dist/client/')) assert(!/SITE_TEST_SIGNING_PRIVATE_JWK|SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY|MERCADO_PAGO_ACCESS_TOKEN|WHATSAPP_PROVIDER_TOKEN|EMAIL_PROVIDER_API_KEY/.test(text),`Server-only configuration in browser artifact: ${path}`);
    }
  }
}
await scan('dist');
if(profile==='site-test') await scan('.sites-runtime/operating-edge');
artifacts.sort((a,b)=>a.path.localeCompare(b.path));
const manifest={schema:1,profile,sourceCommit:canonicalCommit,sourceTree:tree,deliveryCommit:sha,dirty,artifacts};
await writeFile('dist/server/build-provenance.json',JSON.stringify(manifest,null,2)+'\n');
console.log(`Recorded ${artifacts.length} artifact hashes for ${profile} at ${sha}${dirty?' (working tree changes; not a releasable source SHA)':''}`);
