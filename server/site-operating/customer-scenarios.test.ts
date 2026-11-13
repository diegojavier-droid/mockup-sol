import {describe,it,expect} from 'bun:test';
import {parseOperation,ORIGIN,DATABASE,type Operation} from './contract';
import {SITE_TERMS_VERSION as TERMS_VERSION} from './contract';
import {operatingGateway} from './gateway';
import {canonicalOperationBody,isolatedEnv,trustedTestBookingIds} from './backend';
import {bindSupabaseTransport} from '../src/lib/supabase/transport';
import {listAgenda,getBookingForStaff,updateBookingStatus} from '../src/lib/admin/repository';
import type {SupabaseAdminClient} from '../src/lib/supabase';
const customer={firstName:'Ana de ejemplo',lastName:'Inventada',email:'ana@example.net',phone:'+5493425550199',acceptsMarketing:false};
const base={serviceSlug:'corte-fem',startsAt:'2026-12-01T12:00:00Z',customer,testCustomerScenario:true,consent:{termsVersion:TERMS_VERSION}};
const operation=(body:unknown,path='/api/v1/bookings'):Operation=>({method:'POST',path,operationId:'d17ba69b-28d0-426e-a201-9df8fb8bc477',body});
const env=()=>isolatedEnv(k=>({SUPABASE_URL:DATABASE,SUPABASE_SECRET_KEYS:'{"default":"sb_secret_test"}',SUPABASE_PUBLISHABLE_KEYS:'{"default":"sb_publishable_test"}'}[k]));
describe('owner-attested invented contacts',()=>{
 it('accepts varied bounded contacts without prescribed names, domains or phone numbers',()=>{
  for(const c of [customer,{firstName:'María José',email:'maria@other.example',phone:'0342 15 555 0198'}, {...customer,firstName:'A'.repeat(80),lastName:'B'.repeat(80)}]) {
   const web=parseOperation(operation({...base,customer:c}));
   expect((web.body as Record<string,unknown>).customer).toEqual(c);
   const {consent,...admin}=base;
   expect(parseOperation(operation({...admin,customer:c,source:'phone'},'/api/v1/admin/bookings'))).toBeDefined();
   expect(canonicalOperationBody(web)).not.toHaveProperty('testCustomerScenario');
   expect(canonicalOperationBody(parseOperation(operation({...admin,customer:c},'/api/v1/admin/bookings')))).not.toHaveProperty('testCustomerScenario');
  }
 });
 it('rejects absent/false marker, unknown keys, invalid contacts, bounds and marketing before egress',async()=>{
  const {testCustomerScenario,...unmarked}=base;
  const bad=[unmarked,{...base,testCustomerScenario:false},...[
   {firstName:''},{firstName:'  '},{firstName:'x'.repeat(81)},{lastName:'x'.repeat(81)},
   {phone:'abc3425550199'},{phone:'123'},{phone:'1'.repeat(31)},{phone:'54'+'1'.repeat(26)},{email:'invalid'},{email:'x'.repeat(161)+'@example.com'},
   {acceptsMarketing:true},{privateContext:'secret'},
  ].map(p=>({...base,customer:{...customer,...p}}))];
  let calls=0;const transport=(async()=>{calls++;return Response.json({});}) as unknown as typeof fetch;
  for(const body of bad){
   expect(()=>parseOperation(operation(body))).toThrow();
   const request=new Request(ORIGIN+'/api/v1/bookings',{method:'POST',headers:{origin:ORIGIN,'Content-Type':'application/json','oai-authenticated-user-id':'owner','X-Idempotency-Key':operation(body).operationId!},body:JSON.stringify(body)});
   expect((await operatingGateway(request,{SITE_TEST_OWNER_SUB:'owner',SITE_TEST_SIGNING_PRIVATE_JWK:'unused'},transport)).status).toBe(400);
  }
  expect(calls).toBe(0);
 });
 it('does not expand the quote, availability, consent or context channels',()=>{
  for(const path of ['/api/v1/quote','/api/v1/availability'])expect(()=>parseOperation({method:'POST',path,body:{serviceSlug:'corte-fem',customer,testCustomerScenario:true}})).toThrow();
  const {consent,...withoutConsent}=base;
  expect(()=>parseOperation(operation(withoutConsent))).toThrow();
  expect(()=>parseOperation(operation({...base,personalization:{alergias:'no'}}))).toThrow();
  expect(()=>parseOperation(operation({...base,note:'comment'}))).toThrow();
 });
});
describe('ledger provenance rather than fixed contact matching',()=>{
 it('resolves only requested IDs present in durable ledger and rejects wrong project/errors',async()=>{
  const config=env();let calls=0;
  bindSupabaseTransport(config,(async(input:Request|URL|string)=>{
   calls++;const url=new URL(input instanceof Request?input.url:String(input));
   expect(url.pathname).toBe('/rest/v1/site_operating_creates');expect(url.searchParams.get('select')).toBe('booking_id');
   return Response.json([{booking_id:'trusted'},{booking_id:'unrequested'}]);
  }) as unknown as typeof fetch);
  expect([...await trustedTestBookingIds(config,['trusted','untrusted'])]).toEqual(['trusted']);expect(calls).toBe(1);
  expect([...await trustedTestBookingIds(config,[])]).toEqual([]);expect(calls).toBe(1);
  await expect(trustedTestBookingIds({...config,SUPABASE_URL:'https://production.invalid'},['trusted'])).rejects.toThrow('WRONG_TEST_PROJECT');
  bindSupabaseTransport(config,(async()=>Response.json({message:'private failure'},{status:500})) as unknown as typeof fetch);
  await expect(trustedTestBookingIds(config,['trusted'])).rejects.toThrow('PROVENANCE_UNAVAILABLE');
 });
 it('agenda/ficha disclose bounded context for ledger-backed rows with varied contacts, never default/unknown provenance',async()=>{
  const row={id:'from-db',customers:{id:'customer',first_name:'Ana de ejemplo',last_name:'Inventada',email:'ana@example.net',phone_e164:'+5493425550199'},customer_note:'Comentario inventado',areas:{slug:'peluqueria'},resources:null,service_execution_records:null,booking_items:[{snapshot_name:'Corte',role:'main',sort_order:0,personalization:{alergias:'si-leves',privateKey:'never project'}}]};
  const query={select:()=>query,gte:()=>query,lt:()=>query,eq:()=>query,order:async()=>({data:[row],error:null}),maybeSingle:async()=>({data:row,error:null})};
  const admin={from:()=>query,rpc:async()=>({error:null})} as unknown as SupabaseAdminClient;
  const trusted=async(ids:readonly string[])=>{expect(ids).toEqual(['from-db']);return new Set(['from-db']);};
  const original=await listAgenda(admin,{from:new Date(0),to:new Date(1)});
  expect(original[0].customerNote).toBe('Comentario inventado');
  expect(original[0].allergyScenarios).toEqual([{serviceName:'Corte',answer:'si-leves'}]);
  await expect(listAgenda(admin,{from:new Date(0),to:new Date(1)}, {mode:'site'} as never)).rejects.toThrow('SITE_PROVENANCE_REQUIRED');
  await expect(listAgenda(admin,{from:new Date(0),to:new Date(1)}, {mode:'site',resolveTrusted:async()=>{throw new Error('ledger unavailable');}})).rejects.toThrow('ledger unavailable');
  for(const provenance of [async()=>new Set<string>(),trusted]) {
   const rows=await listAgenda(admin,{from:new Date(0),to:new Date(1)},{mode:'site',resolveTrusted:provenance});
   const detail=await getBookingForStaff(admin,'browser-id-is-not-permission',{mode:'site',resolveTrusted:provenance});
   const updated=await updateBookingStatus(admin,{bookingId:'browser-id-is-not-permission',status:'attended',actorId:'staff'}, {mode:'site',resolveTrusted:provenance});
   for(const view of [rows[0],detail!,updated]) {
    expect(view.customerNote).toBe(provenance===trusted?'Comentario inventado':null);
    expect(view.allergyScenarios).toEqual(provenance===trusted?[{serviceName:'Corte',answer:'si-leves'}]:[]);
    expect(JSON.stringify(view)).not.toContain('privateKey');
   }
  }
 });
});
