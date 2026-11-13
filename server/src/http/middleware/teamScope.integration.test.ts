/** Offline actual Hono+auth+permission+repository integration; transport stub, NOT DB proof. */
import {beforeEach,afterEach,expect,it} from 'bun:test';
import {Hono} from 'hono';
import {createAdminRoute} from '../routes/admin';
import {errorHandler} from './errorHandler';
import {MODULOS,PERMISOS} from './permisos';
import type {ServerEnv} from '../../config/env';
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222';
const OWN='33333333-3333-4333-8333-333333333333',OTHER='44444444-4444-4444-8444-444444444444',NONE='55555555-5555-4555-8555-555555555555';
const env={TEAM_SCOPE_ENABLED:true,APP_ENV:'local',SUPABASE_URL:'http://127.0.0.1:54321',SUPABASE_PUBLISHABLE_KEY:'test',SUPABASE_SECRET_KEY:'test',INTERNAL_AUTH_ALLOWED_PROVIDERS:['email'],INTERNAL_AUTH_ALLOWED_EMAILS:[]} as unknown as ServerEnv;
const full=Object.fromEntries(MODULOS.map(m=>[m,'full']));
let row:any;let calls:URL[];let bodies:any[];let missingRpc:boolean;let rpcError:string|undefined;let entries:any[];let app:Hono;let legacyClosed:boolean;
const oldFetch=globalThis.fetch;
const booking=(id:string,staff_id:string|null)=>({id,staff_id,starts_at:'2030-01-01T12:00:00Z',ends_at:'2030-01-01T13:00:00Z',shown_duration_min:60,status:'confirmed',source:'online',customer_note:'Contexto propio',areas:{slug:'peluqueria'},customers:{first_name:'Prueba',last_name:null},resources:null,booking_items:[{snapshot_name:'Corte',role:'main',sort_order:0,personalization:{alergias:'si-leves'}}],booking_attention:[]});
beforeEach(()=>{
 row={staff_id:A,display_name:'Prueba',role:'profesional',role_name:'Profesional',agenda_scope:'assigned',attention_enabled:true,permisos:{...full}};
 calls=[];bodies=[];legacyClosed=false;missingRpc=false;rpcError=undefined;entries=[booking(OWN,A),booking(OTHER,B),booking(NONE,null)];
 globalThis.fetch=(async(input:string|URL|Request,init?:RequestInit)=>{
  const request=(input instanceof Request?new Request(input,init):new Request(String(input),init));const url=new URL(request.url);calls.push(url);expect(url.origin).toBe(env.SUPABASE_URL);
  if(url.pathname==='/auth/v1/user')return Response.json({id:A,email:'test@example.invalid',email_confirmed_at:'2026-01-01',app_metadata:{provider:'email'}});
  if(url.pathname.endsWith('/resolve_staff_session_scoped'))return missingRpc?Response.json({message:'missing scoped function'},{status:404}):Response.json(row?[row]:[]);
  if(url.pathname==='/rest/v1/bookings'){
   const staff=url.searchParams.get('staff_id')?.slice(3);const id=url.searchParams.get('id')?.slice(3);
   return Response.json(entries.filter(e=>(!staff||e.staff_id===staff)&&(!id||e.id===id)));
  }
  if(url.pathname==='/rest/v1/service_execution_records')return Response.json(legacyClosed?[{booking_id:OWN}]:[]);
  if(url.pathname.endsWith('/record_booking_attention')){
   const body=await request.json() as Record<string,unknown>;bodies.push(body);
   if(rpcError)return Response.json({message:rpcError},{status:400});
   if(body.p_actor_id!==row.staff_id||!entries.some(e=>e.id===body.p_booking_id&&e.staff_id===row.staff_id))return Response.json({message:'booking_not_accessible'},{status:400});
   return Response.json({booking_id:body.p_booking_id,started_at:'2030-01-01T12:01:00Z',finished_at:body.p_action==='finish'?'2030-01-01T12:45:00Z':null});
  }
  throw Error('Unexpected network '+url.pathname);
 }) as typeof fetch;
 app=new Hono().route('/api/v1/admin',createAdminRoute(env));app.onError(errorHandler);
});
afterEach(()=>{globalThis.fetch=oldFetch;});
function request(path:string,method='GET',body?:unknown){return app.request('/api/v1/admin'+path,{method,headers:{authorization:'Bearer test','content-type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});}
function dataCalls(){return calls.filter(u=>!u.pathname.includes('/auth/')&&!u.pathname.includes('resolve_staff_session'));}
it('assigned sees only A, no unassigned/B; explicit DTO and SELECT omit finances/tokens/contact/history',async()=>{
 const response=await request('/agenda?date=2030-01-01');expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toBe('no-store');
 const {data}=await response.json() as any;expect(data.entries.map((e:any)=>e.id)).toEqual([OWN]);
 const e=data.entries[0];expect(e.view).toBe('operational');expect(e.status).toBe('scheduled');expect(e.customerNote).toBe('Contexto propio');expect(e.allergyScenarios).toHaveLength(1);expect(e.canStartAttention).toBe(true);
 const serialized=JSON.stringify(e);for(const forbidden of ['price','deposit','payment','publicToken','phone','email','customerId','pending_payment','hasServiceClosure'])expect(serialized).not.toContain(forbidden);
 const query=dataCalls()[0];expect(query.searchParams.get('staff_id')).toBe('eq.'+A);
 expect(query.searchParams.get('select')).not.toMatch(/price|deposit|payment|public_token|phone|email|service_execution/);
});
it('detail foreign/null/missing share404 and summary is assignment scoped',async()=>{
 for(const id of [OTHER,NONE,'99999999-9999-4999-8999-999999999999'])expect((await request('/bookings/'+id)).status).toBe(404);
 expect((await request('/bookings/'+OWN)).status).toBe(200);
 const summary=await (await request('/agenda/resumen?desde=2030-01-01&hasta=2030-01-01')).json() as any;
 expect(summary.data.porDia).toEqual([{dia:'2030-01-01',turnos:1}]);
 for(const url of dataCalls().filter(u=>u.pathname==='/rest/v1/bookings'))expect(url.searchParams.get('staff_id')).toBe('eq.'+A);
});
it('every global/legacy route denied even with all modular permissions; no data egress',async()=>{
 for(const [method,path,body] of [['GET','/customers?q=secret',undefined],['GET','/customers/'+OTHER,undefined],['GET','/audit',undefined],['GET','/pending-links',undefined],['GET','/dashboard',undefined],['GET','/areas',undefined],['POST','/bookings',{}],['PATCH','/bookings/'+OTHER+'/status',{status:'cancelled',depositOutcome:'refund'}],['POST','/bookings/'+OWN+'/close',{}],['POST','/bookings/'+OWN+'/no-show',{}],['POST','/bookings/'+OWN+'/refund-done',{}],['POST','/staff/'+A+'/role',{role:'owner'}]] as const)expect((await request(path,method,body)).status).toBe(403);
 expect(dataCalls()).toEqual([]);
});
it('browser cannot select scope/actor/time or forge global access',async()=>{
 for(const path of ['/agenda?staffId='+B,'/agenda?agenda_scope=all','/agenda/resumen?desde=2030-01-01&hasta=2030-01-01&staff_id='+B,'/bookings/'+OWN+'?scope=all'])expect((await request(path)).status).toBe(400);
 for(const body of [{actorId:B},{staffId:B},{startedAt:'2000-01-01'},{action:'finish'},{price:0}])expect((await request('/bookings/'+OWN+'/attention/start','POST',body)).status).toBe(400);
 expect(dataCalls()).toEqual([]);
});
it('membership reassignment, downgrade, deactivation take effect next request; missing scope is assigned',async()=>{
 expect((await request('/bookings/'+OWN)).status).toBe(200);entries[0].staff_id=B;expect((await request('/bookings/'+OWN)).status).toBe(404);
 row.agenda_scope=undefined;expect((await (await request('/me')).json() as any).data.agendaScope).toBe('assigned');
 row.permisos.calendario='none';expect((await request('/agenda')).status).toBe(403);row=null;expect((await request('/me')).status).toBe(403);
});
it('global scope without finance gets operational DTO, no history/legacy financial mutations',async()=>{
 row.agenda_scope='all';row.permisos.finanzas='none';
 const {data}=await (await request('/agenda')).json() as any;expect(data.entries).toHaveLength(3);expect(data.entries.every((e:any)=>e.view==='operational')).toBe(true);
 calls=[];
 for(const [method,path] of [['GET','/customers/'+OTHER],['GET','/audit'],['GET','/refunds-pending'],['POST','/bookings/'+OWN+'/close'],['POST','/bookings/'+OWN+'/refund-done'],['PATCH','/bookings/'+OWN+'/status'],['POST','/bookings/'+OWN+'/no-show'],['POST','/bookings/'+OWN+'/no-show/revert']])expect((await request(path,method,{})).status).toBe(403);
 expect(dataCalls()).toEqual([]);
});
it('attention accepts only server actor; foreign404, invalid transition409, missing migration503 without success',async()=>{
 const response=await request('/bookings/'+OWN+'/attention/start','POST',{});expect(response.status).toBe(200);expect(bodies[0]).toEqual({p_booking_id:OWN,p_actor_id:A,p_action:'start'});
 expect((await request('/bookings/'+OTHER+'/attention/start','POST',{})).status).toBe(404);
 rpcError='attention_not_started';expect((await request('/bookings/'+OWN+'/attention/finish','POST',{})).status).toBe(409);
 rpcError='private arbitrary db detail';const failed=await request('/bookings/'+OWN+'/attention/start','POST',{});expect(failed.status).toBe(503);expect(await failed.text()).not.toContain(rpcError);
 row.attention_enabled=false;calls=[];expect((await request('/bookings/'+OWN+'/attention/start','POST',{})).status).toBe(503);expect(dataCalls()).toEqual([]);
});
it('pilot resolver missing fails closed without legacy fallback',async()=>{
 missingRpc=true;const response=await request('/agenda');expect(response.status).toBe(503);expect(dataCalls()).toEqual([]);expect(calls.some(u=>u.pathname.endsWith('/resolve_staff_session'))).toBe(false);
});

it('all declared routes outside assigned allowlist fail before domain I/O',async()=>{
 const allowed=new Set(['GET /agenda','GET /agenda/resumen','GET /bookings/:id','POST /bookings/:id/attention/start','POST /bookings/:id/attention/finish']);
 for(const key of Object.keys(PERMISOS)){
  if(allowed.has(key))continue;
  const [method,path]=key.split(' ');const resolved=path.replace(/:[A-Za-z]+/g,OWN);
  expect((await request(resolved,method,method==='GET'?undefined:{})).status).toBe(403);
 }
 expect(dataCalls()).toEqual([]);
});
it('authorization fingerprint follows next200 downgrade and permission errors; contains no raw identity',async()=>{
 row.agenda_scope='all';row.permisos.finanzas='none';
 const me=await request('/me');const initial=(await me.json() as any).data.accessVersion;
 expect(initial).toMatch(/^[a-f0-9]{64}$/);expect(me.headers.get('X-Staff-Access-Version')).toBe(initial);
 const broad=await request('/agenda');expect(broad.headers.get('X-Staff-Access-Version')).toBe(initial);
 row.agenda_scope='assigned';const reduced=await request('/agenda');expect(reduced.status).toBe(200);
 const next=reduced.headers.get('X-Staff-Access-Version');expect(next).not.toBe(initial);
 const forbidden=await request('/customers');expect(forbidden.status).toBe(403);expect(forbidden.headers.get('X-Staff-Access-Version')).toBe(next);
 expect((await (await request('/me')).json() as any).data.accessVersion).toBe(next);
});

it('legacy completion suppresses start without inventing timestamps; started tracking can still finish',async()=>{
 legacyClosed=true;
 let res=await request('/bookings/'+OWN);let e=(await res.json() as any).data;
 expect(e.closedBeforeTracking).toBe(true);expect(e.canStartAttention).toBe(false);expect(e.attention).toEqual({startedAt:null,finishedAt:null});
 entries[0].booking_attention=[{started_at:'2030-01-01T12:00:00Z',finished_at:null}];
 res=await request('/bookings/'+OWN);e=(await res.json() as any).data;
 expect(e.closedBeforeTracking).toBe(false);expect(e.canFinishAttention).toBe(true);
 for(const call of dataCalls().filter(u=>u.pathname==='/rest/v1/service_execution_records')){
  expect(call.searchParams.get('select')).toBe('booking_id');expect(call.searchParams.get('booking_id')).toBe('in.('+OWN+')');
 }
});
