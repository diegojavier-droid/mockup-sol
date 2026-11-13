import {afterEach,describe,expect,it} from 'bun:test';
import {Hono} from 'hono';
import type {ServerEnv} from '../src/config/env';
import {TERMS_VERSION} from '../src/config/legal';
import {createAdminRoute} from '../src/http/routes/admin';
import {createBookingsRoute} from '../src/http/routes/bookings';
import {createCatalogRoute} from '../src/http/routes/catalog';
import {bindSupabaseTransport} from '../src/lib/supabase/transport';
import {SITE_TERMS_VERSION} from './contract';
const originalFetch=globalThis.fetch;
afterEach(()=>{globalThis.fetch=originalFetch;});
const env=()=>({APP_ENV:'local',SUPABASE_URL:'https://fixture.invalid',SUPABASE_PUBLISHABLE_KEY:'fake-public',SUPABASE_SECRET_KEY:'fake-secret',INTERNAL_AUTH_ALLOWED_EMAILS:[],INTERNAL_AUTH_ALLOWED_PROVIDERS:['email']} as unknown as ServerEnv);
describe('shared core with explicit deployment policies',()=>{
 it('keeps original and Site legal versions distinct in catalogue and rejects crossed consent before I/O',async()=>{
  expect(TERMS_VERSION).toBe('2026-09-08');expect(SITE_TERMS_VERSION).toBe('2026-11-12-site');
  for(const version of [TERMS_VERSION,SITE_TERMS_VERSION]) {
   const config=env();let calls=0;
   bindSupabaseTransport(config,(async(input:Request|URL|string)=>{
    calls++;const url=new URL(input instanceof Request?input.url:String(input));
    if(url.pathname==='/rest/v1/business_hours')return Response.json([]);
    if(url.pathname==='/rest/v1/business_settings')return Response.json({value:20});
    throw new Error('Unexpected catalogue fixture request');
   }) as typeof fetch);
   const policy=version===TERMS_VERSION?undefined:{termsVersion:version};
   const res=await createCatalogRoute(config,policy).request('/salon');
   expect(res.status).toBe(200);expect((await res.json() as {data:{termsVersion:string}}).data.termsVersion).toBe(version);
   calls=0;
   const other=version===TERMS_VERSION?SITE_TERMS_VERSION:TERMS_VERSION;
   const rejected=await createBookingsRoute(config,policy).request('/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({serviceSlug:'corte-fem',startsAt:'2030-12-01T12:00:00Z',customer:{firstName:'Prueba',phone:'+5493425550000',email:'fixture@example.invalid'},consent:{termsVersion:other}})});
   expect(rejected.status).toBe(422);expect(calls).toBe(0);
  }
 });
 it('original staff gate preserves contact, note and allowlisted allergy without exposing raw context',async()=>{
  const config=env();let active=false;let bookingReads=0;
  globalThis.fetch=(async(input:Request|URL|string)=>{
   const url=new URL(input instanceof Request?input.url:String(input));
   if(url.origin!==config.SUPABASE_URL)throw new Error('Unexpected fixture destination');
   if(url.pathname==='/auth/v1/user')return Response.json({id:'test-subject',email:'fixture@example.invalid',email_confirmed_at:'2026-01-01',app_metadata:{provider:'email'}});
   if(url.pathname==='/rest/v1/rpc/resolve_staff_session')return Response.json(active?[{staff_id:'staff',display_name:'Prueba',role:'mostrador',role_name:'Mostrador',agenda_scope:'all',permisos:{calendario:'full',finanzas:'view'}}]:[]);
   if(url.pathname==='/rest/v1/bookings'){
    bookingReads++;
    return Response.json({id:'row-from-db',customer_note:'Nota original de prueba',areas:{slug:'peluqueria'},resources:null,customers:{id:'customer',first_name:'Ficticia',last_name:'Prueba',phone_e164:'+5493425550000',email:'fixture@example.invalid'},booking_items:[{snapshot_name:'Corte',role:'main',sort_order:0,personalization:{alergias:'si-leves',secretContext:'never expose'}}],service_execution_records:null});
   }
   throw new Error('Unexpected fixture request');
  }) as typeof fetch;
  const app=new Hono().route('/admin',createAdminRoute(config));
  expect((await app.request('/admin/bookings/11111111-1111-4111-8111-111111111111')).status).toBe(401);
  const req=()=>app.request('/admin/bookings/11111111-1111-4111-8111-111111111111',{headers:{authorization:'Bearer fixture'}});
  expect((await req()).status).toBe(403);expect(bookingReads).toBe(0);
  active=true;const res=await req();expect(res.status).toBe(200);
  const text=await res.text();const dto=JSON.parse(text).data;
  expect(dto.customerNote).toBe('Nota original de prueba');expect(dto.customer.email).toBe('fixture@example.invalid');
  expect(dto.allergyScenarios).toEqual([{serviceName:'Corte',answer:'si-leves'}]);expect(text).not.toContain('secretContext');
 });
});
