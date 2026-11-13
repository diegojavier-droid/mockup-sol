import {describe,it,expect} from 'bun:test';
import {readFileSync} from 'node:fs';
import {dispatchSiteRequest,siteRouteKind} from './site-entry';
import {ORIGIN} from './contract';
const env={SITE_TEST_OWNER_SUB:'owner-test',SITE_TEST_SIGNING_PRIVATE_JWK:'configured-runtime-secret'};
const paths=['/panel','/panel/','/panel/agenda/hoy','/agenda','/agenda/','/operaciones','/operaciones/','/%70anel','/%61genda','/%6fperaciones','//panel//agenda/hoy','/PANEL/AGENDA/HOY','/x/../panel'];
describe('private Site HTML boundary',()=>{
 it('rejects every private direct route and alias before SSR without injected owner',async()=>{
  let renders=0;const render=async()=>{renders++;return new Response('private HTML');};
  for(const path of paths){
   for(const [headers,config,status] of [
    [{},env,401],
    [{Authorization:'Bearer service-bypass-only'},env,401],
    [{'oai-authenticated-user-id':'someone-else'},env,403],
    [{'oai-authenticated-user-id':'owner-test'},{},503],
   ] as const){
    const response=await dispatchSiteRequest(new Request(ORIGIN+path,{headers}),config,render);
    expect(response.status).toBe(status);expect(response.headers.get('Cache-Control')).toBe('no-store');expect(await response.text()).not.toContain('private HTML');
   }
  }
  expect(renders).toBe(0);
 });
 it('fails closed on alternate encodings before SSR',async()=>{
  let renders=0;
  for(const path of ['/panel%2Fagenda','/%2570anel','/%252fpanel','/%2e/panel','/%5cpanel','/panel%00','/%not-valid']){
   const response=await dispatchSiteRequest(new Request(ORIGIN+path),env,async()=>{renders++;return new Response('private');});
   expect([400,401]).toContain(response.status);
  }
  expect(renders).toBe(0);
 });
 it('allows verified owner HTML only at exact Site origin and never caches private output',async()=>{
  let renders=0;const render=async()=>{renders++;return new Response('owner HTML',{headers:{'Cache-Control':'public,max-age=60'}});};
  for(const path of ['/panel','/panel/agenda/hoy?date=2026-12-01','/agenda','/operaciones']){
   const response=await dispatchSiteRequest(new Request(ORIGIN+path,{headers:{'oai-authenticated-user-id':'owner-test'}}),env,render);
   expect(response.status).toBe(200);expect(await response.text()).toBe('owner HTML');expect(response.headers.get('Cache-Control')).toBe('no-store');
  }
  expect(renders).toBe(4);
  expect((await dispatchSiteRequest(new Request('https://other.invalid/panel',{headers:{'oai-authenticated-user-id':'owner-test'}}),env,render)).status).toBe(403);
  expect(renders).toBe(4);
 });
 it('keeps public pages on their existing SSR path without imposing panel authentication',async()=>{
  for(const path of ['/','/reservar','/reserva/'+'a'.repeat(32),'/privacidad','/terminos']){
   const response=await dispatchSiteRequest(new Request(ORIGIN+path),{},async()=>new Response('public HTML',{headers:{'X-SSR':'public'}}));
   expect(response.status).toBe(200);expect(response.headers.get('X-SSR')).toBe('public');expect(await response.text()).toBe('public HTML');
  }
 });
 it('keeps API routes in owner-gated gateway, never SSR including decoded api prefix',async()=>{
  let renders=0;
  for(const path of ['/api/v1/health','/%61pi/v1/health','/API/v1/health']){
   expect(siteRouteKind(new URL(ORIGIN+path).pathname)).toBe('api');
   const response=await dispatchSiteRequest(new Request(ORIGIN+path),env,async()=>{renders++;return new Response('not API');});
   expect(response.status).toBe(401);
  }
  expect(renders).toBe(0);
 });
 it('entrypoint dispatch wraps lazy SSR loading rather than gating after render',()=>{
  const source=readFileSync(new URL('../../src/server-site-test.ts',import.meta.url),'utf8');
  expect(source).toContain('return dispatchSiteRequest(request, env as OperatingEnv, async () => {');
  expect(source.indexOf('const handler = await getServerEntry()',source.indexOf('export default'))).toBeGreaterThan(source.indexOf('return dispatchSiteRequest'));
 });
});
