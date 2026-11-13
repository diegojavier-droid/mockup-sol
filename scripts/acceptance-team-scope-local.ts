/** PREPARED CI acceptance: real local Auth/PostgREST + Hono. Never run against hosted services.
 * SQL/concurrency fixtures must finish before this script creates ephemeral Auth users.
 * No dotenv, credentials on disk, raw provider errors, payments or production defaults. */
import {createClient} from '@supabase/supabase-js';
import {Hono,type ErrorHandler} from 'hono';
import {HTTPException} from 'hono/http-exception';
import {spawnSync} from 'node:child_process';
import {createAdminRoute} from '../server/src/http/routes/admin';
import type {ServerEnv} from '../server/src/config/env';
import {MODULOS} from '../server/src/http/middleware/permisos';
import {acceptanceConfig,assertOperational,check,cleanupSql,success} from './team-scope-acceptance-helpers';

/** Preserve expected authorization/transition status, never SDK/error details. */
export const localAcceptanceErrorHandler:ErrorHandler=(error,c)=>{
 c.header('Cache-Control','no-store');
 return c.json({error:{message:'LOCAL_API_REQUEST_FAILED'}},error instanceof HTTPException?error.status:500);
};
export async function runTeamScopeAcceptance(){
 const config=acceptanceConfig(process.env); // All guards precede even client construction.
 const savedFetch=globalThis.fetch;
 globalThis.fetch=(async(input:string|URL|Request,init?:RequestInit)=>{
  const url=new URL(input instanceof Request?input.url:String(input));
  check(url.origin===config.origin&&!url.username&&!url.password,'NON_LOCAL_TRANSPORT_REJECTED');
  return savedFetch(input,{...init,redirect:'error',signal:AbortSignal.timeout(10_000)});
 }) as typeof fetch;
 const opts={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}};
 const admin=createClient(config.origin,config.secret,opts);
 const client=()=>createClient(config.origin,config.anon,opts);
 const suffix=crypto.randomUUID().replaceAll('-','').slice(0,16);
 const labels=['a','b','global'] as const;
 const roles=labels.map(label=>`ci-team-${label}-${suffix}`);
 const staffIds=labels.map(()=>crypto.randomUUID());const customerId=crypto.randomUUID();const bookingIds=labels.map(()=>crypto.randomUUID());
 const emails=[...labels,'external'].map(label=>`ci-team-${label}-${suffix}@example.invalid`);
 const users=new Set<string>();let fixtureStarted=false;
 const env={TEAM_SCOPE_ENABLED:true,APP_ENV:'local',SUPABASE_URL:config.origin,SUPABASE_PUBLISHABLE_KEY:config.anon,SUPABASE_SECRET_KEY:config.secret,INTERNAL_AUTH_ALLOWED_EMAILS:[],INTERNAL_AUTH_ALLOWED_PROVIDERS:['email']} as unknown as ServerEnv;
 const app=new Hono().route('/api/v1/admin',createAdminRoute(env));
 // Prevent Hono's default error logger from printing SDK bodies in CI.
 app.onError(localAcceptanceErrorHandler);
 const request=(token:string|undefined,path='/me',method='GET',body?:unknown)=>app.request('/api/v1/admin'+path,{method,headers:{...(token?{authorization:`Bearer ${token}`} :{}),'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const result=async(response:Response,status:number,label:string)=>{check(response.status===status,label);check(response.headers.get('cache-control')==='no-store','PRIVATE_RESPONSE_CACHEABLE');return await response.json() as {data:any};};
 const query=async<T extends {error:unknown}>(promise:PromiseLike<T>,label:string)=>success(await promise,label);
 let failed=false;
 try {
  // Require the disposable stack's untouched, synthetic baseline, not just a loopback hostname.
  const existing=await query(admin.auth.admin.listUsers({page:1,perPage:1}),'AUTH_BASELINE_READ_FAILED');check(existing.data.users.length===0,'AUTH_BASELINE_NOT_EMPTY');
  let ready=false;
  const readinessDeadline=Date.now()+15_000;
  while(Date.now()<readinessDeadline){
   const readiness=await admin.rpc('resolve_staff_session_scoped',{p_email:'site-owner@example.invalid'});
   if(!readiness.error){check(readiness.data?.[0]?.attention_enabled===true,'ATTENTION_NOT_READY');ready=true;break;}
   check(readiness.error.code==='PGRST202','SCOPED_RPC_NOT_READY');
   await new Promise(resolve=>setTimeout(resolve,200));
  }
  check(ready,'SCOPED_SCHEMA_RELOAD_TIMEOUT');
  for(const table of ['payments','bookings','customers']){
   const baseline=await query(admin.from(table).select('id').limit(1),'BASELINE_READ_FAILED');check(baseline.data?.length===0,'BASELINE_NOT_EMPTY');
  }
  const staff=await query(admin.from('staff_members').select('email,role,is_active,deleted_at'),'STAFF_BASELINE_READ_FAILED');
  check(staff.data?.length===1&&staff.data[0].email==='site-owner@example.invalid'&&staff.data[0].role==='owner'&&staff.data[0].is_active&&staff.data[0].deleted_at===null,'STAFF_BASELINE_NOT_SYNTHETIC');
  const setting=await query(admin.from('business_settings').select('value').eq('key','refund_window_hours').single(),'POLICY_READ_FAILED');check(setting.data?.value===24,'POLICY_NOT_TWENTY_FOUR');
  const area=await query(admin.from('areas').select('id').eq('slug','peluqueria').single(),'AREA_REQUIRED');check(area.data?.id,'AREA_REQUIRED');
  fixtureStarted=true;
  const accounts:Array<{email:string;password:string}>=[];
  for(const email of emails){
   const account={email,password:crypto.randomUUID()+'Aa9!'};accounts.push(account);
   const created=await query(admin.auth.admin.createUser({...account,email_confirm:true}),'AUTH_CREATE_FAILED');check(created.data.user?.id,'AUTH_ID_MISSING');users.add(created.data.user.id);
  }
  for(let i=0;i<labels.length;i++){
   await query(admin.from('roles').insert({slug:roles[i],name:'CI team '+suffix,agenda_scope:i===2?'all':'assigned'}),'ROLE_CREATE_FAILED');
   await query(admin.from('role_permissions').insert(MODULOS.map(module=>({role_slug:roles[i],module,level:i===2&&module==='finanzas'?'none':'full'}))),'PERMISSION_CREATE_FAILED');
   await query(admin.from('staff_members').insert({id:staffIds[i],slug:`ci-team-${labels[i]}-${suffix}`,display_name:'Ficticia '+labels[i],email:emails[i],role:roles[i],is_active:true}),'STAFF_CREATE_FAILED');
  }
  await query(admin.from('customers').insert({id:customerId,first_name:'Clienta ficticia',last_name:'CI',phone_e164:'+19999998'+String(parseInt(suffix.slice(0,5),16)).padStart(7,'0'),email:`ci-team-${suffix}@example.invalid`}), 'CUSTOMER_CREATE_FAILED');
  for(let i=0;i<bookingIds.length;i++){
   await query(admin.from('bookings').insert({id:bookingIds[i],customer_id:customerId,area_id:area.data.id,staff_id:i===2?null:staffIds[i],starts_at:`2099-01-01T${12+i}:00:00Z`,ends_at:`2099-01-01T${12+i}:30:00Z`,shown_duration_min:30,status:'confirmed',source:'manual',price_display_mode:'fixed',price_estimated_min:1000,deposit_rate_applied:0,deposit_amount:0,deposit_status:'none',refund_due:false,customer_note:'Comentario ficticio '+i}),'BOOKING_CREATE_FAILED');
   await query(admin.from('booking_items').insert({booking_id:bookingIds[i],role:'main',snapshot_name:'Servicio ficticio',snapshot_price_amount:1000,snapshot_duration_min:30,personalization:{alergias:'si-leves'}}),'ITEM_CREATE_FAILED');
  }
  const before=await query(admin.from('bookings').select('id,status,deposit_amount,deposit_status,refund_due,price_estimated_min').in('id',bookingIds).order('id'),'SNAPSHOT_FAILED');
  const bad=await client().auth.signInWithPassword({...accounts[0],password:crypto.randomUUID()+'Wrong!'});check(bad.error&&!bad.data.session,'WRONG_PASSWORD_ACCEPTED');
  const authClients=accounts.map(()=>client());const tokens:string[]=[];
  for(let i=0;i<accounts.length;i++){const login=await query(authClients[i].auth.signInWithPassword(accounts[i]),'PASSWORD_LOGIN_FAILED');check(login.data.session?.access_token,'TOKEN_MISSING');tokens.push(login.data.session.access_token);}
  check((await request(undefined)).status===401,'ANONYMOUS_NOT_DENIED');check((await request('invalid-token')).status===401,'INVALID_TOKEN_NOT_DENIED');check((await request(tokens[3])).status===403,'EXTERNAL_NOT_DENIED');
  await query(authClients[3].auth.updateUser({data:{role:'owner',agenda_scope:'all'}}),'METADATA_UPDATE_FAILED');check((await request(tokens[3])).status===403,'METADATA_ESCAPED_MEMBERSHIP');
  for(let i=0;i<2;i++){
   const agenda=await result(await request(tokens[i],'/agenda?date=2099-01-01'),200,'OWN_AGENDA_DENIED');check(agenda.data.entries.length===1&&agenda.data.entries[0].id===bookingIds[i],'AGENDA_SCOPE_LEAK');assertOperational(agenda.data.entries[0]);check(agenda.data.entries[0].customerNote==='Comentario ficticio '+i&&agenda.data.entries[0].allergyScenarios[0]?.answer==='si-leves','OWN_CONTEXT_LOST');
   const summary=await result(await request(tokens[i],'/agenda/resumen?desde=2099-01-01&hasta=2099-01-01'),200,'SUMMARY_DENIED');check(summary.data.porDia.length===1&&summary.data.porDia[0].turnos===1,'SUMMARY_SCOPE_LEAK');
   await result(await request(tokens[i],'/bookings/'+bookingIds[i]),200,'OWN_DETAIL_DENIED');
   for(const id of [bookingIds[1-i],bookingIds[2],crypto.randomUUID()])check((await request(tokens[i],'/bookings/'+id)).status===404,'FOREIGN_DETAIL_EXPOSED');
   for(const path of ['/customers','/customers/'+customerId,'/audit','/roles','/dashboard','/pending-links'])check((await request(tokens[i],path)).status===403,'GLOBAL_ROUTE_EXPOSED');
   for(const suffixPath of ['/close','/refund-done','/no-show','/no-show/revert'])check((await request(tokens[i],'/bookings/'+bookingIds[i]+suffixPath,'POST',{})).status===403,'LEGACY_MUTATION_EXPOSED');
   check((await request(tokens[i],'/bookings/'+bookingIds[i]+'/status','PATCH',{status:'cancelled',depositOutcome:'refund'})).status===403,'FINANCIAL_STATUS_MUTATION_EXPOSED');
  }
  const globalResponse=await request(tokens[2],'/agenda?date=2099-01-01');const globalVersion=globalResponse.headers.get('X-Staff-Access-Version');const globalData=await result(globalResponse,200,'GLOBAL_AGENDA_DENIED');check(globalData.data.entries.length===3,'GLOBAL_SCOPE_MISSING');globalData.data.entries.forEach(assertOperational);
  for(const path of ['/customers/'+customerId,'/audit','/cash-register','/refunds-pending'])check((await request(tokens[2],path)).status===403,'GLOBAL_FINANCE_EXPOSED');
  for(const suffixPath of ['/close','/refund-done','/no-show','/no-show/revert'])check((await request(tokens[2],'/bookings/'+bookingIds[0]+suffixPath,'POST',{})).status===403,'GLOBAL_FINANCIAL_MUTATION_EXPOSED');
  check((await request(tokens[2],'/bookings/'+bookingIds[0]+'/status','PATCH',{status:'cancelled',depositOutcome:'refund'})).status===403,'GLOBAL_FINANCIAL_STATUS_EXPOSED');
  check((await request(tokens[0],'/agenda?staffId='+staffIds[1])).status===400,'BROWSER_SCOPE_ACCEPTED');
  for(const body of [{actorId:staffIds[1]},{startedAt:'2000-01-01T00:00:00Z'},{payment:1}])check((await request(tokens[0],'/bookings/'+bookingIds[0]+'/attention/start','POST',body)).status===400,'BROWSER_ATTENTION_INPUT_ACCEPTED');
  for(const i of [0,1]){
   const path='/bookings/'+bookingIds[i]+'/attention/';
   check((await request(tokens[i],path+'finish','POST',{})).status===409,'FINISH_WITHOUT_START_ACCEPTED');
   const start=await result(await request(tokens[i],path+'start','POST',{}),200,'START_DENIED');check(start.data.startedAt&&start.data.finishedAt===null,'START_STATE_INVALID');
   const replay=await result(await request(tokens[i],path+'start','POST',{}),200,'START_RETRY_DENIED');check(JSON.stringify(start.data)===JSON.stringify(replay.data),'START_NOT_IDEMPOTENT');
   const finish=await result(await request(tokens[i],path+'finish','POST',{}),200,'FINISH_DENIED');check(finish.data.startedAt===start.data.startedAt&&Date.parse(finish.data.finishedAt)>=Date.parse(start.data.startedAt),'FINISH_STATE_INVALID');
   const repeat=await result(await request(tokens[i],path+'finish','POST',{}),200,'FINISH_RETRY_DENIED');check(JSON.stringify(finish.data)===JSON.stringify(repeat.data),'FINISH_NOT_IDEMPOTENT');
  }
  check((await request(tokens[0],'/bookings/'+bookingIds[1]+'/attention/start','POST',{})).status===404,'FOREIGN_ATTENTION_ACCEPTED');
  check((await request(tokens[0],'/bookings/'+bookingIds[2]+'/attention/start','POST',{})).status===404,'UNASSIGNED_ATTENTION_ACCEPTED');
  for(const caller of [client(),authClients[0]]){
   for(const table of ['booking_attention','bookings','customers'])check((await caller.from(table).select(table==='booking_attention'?'booking_id':'id')).error,'DIRECT_TABLE_EXPOSED');
   check((await caller.rpc('record_booking_attention',{p_booking_id:bookingIds[0],p_action:'start',p_actor_id:staffIds[0]})).error,'DIRECT_RPC_EXPOSED');
   check((await caller.rpc('resolve_staff_session_scoped',{p_email:emails[0]})).error,'DIRECT_SESSION_EXPOSED');
  }
  await query(admin.from('role_permissions').update({level:'view'}).eq('role_slug',roles[0]).eq('module','calendario'),'DOWNGRADE_FAILED');
  await result(await request(tokens[0],'/agenda'),200,'VIEW_READ_DENIED');check((await request(tokens[0],'/bookings/'+bookingIds[0]+'/attention/start','POST',{})).status===403,'DOWNGRADED_WRITE_ACCEPTED');
  await query(admin.from('bookings').update({staff_id:staffIds[1]}).eq('id',bookingIds[0]),'REASSIGN_FAILED');check((await request(tokens[0],'/bookings/'+bookingIds[0])).status===404,'REASSIGNMENT_NOT_REVOKED');await result(await request(tokens[1],'/bookings/'+bookingIds[0]),200,'NEW_ASSIGNEE_DENIED');
  await query(admin.from('roles').update({agenda_scope:'assigned'}).eq('slug',roles[2]),'SCOPE_DOWNGRADE_FAILED');
  const narrowed=await request(tokens[2],'/agenda?date=2099-01-01');check(narrowed.headers.get('X-Staff-Access-Version')&&narrowed.headers.get('X-Staff-Access-Version')!==globalVersion,'SCOPE_FINGERPRINT_UNCHANGED');check((await result(narrowed,200,'NARROWED_AGENDA_DENIED')).data.entries.length===0,'NARROWED_AGENDA_LEAK');
  const me=await request(tokens[2]);const version=me.headers.get('X-Staff-Access-Version');check((await result(me,200,'ME_DENIED')).data.accessVersion===version,'ME_FINGERPRINT_MISMATCH');
  await query(admin.from('staff_members').update({is_active:false}).eq('id',staffIds[1]),'DEACTIVATE_FAILED');check((await request(tokens[1])).status===403,'DEACTIVATION_NOT_APPLIED');
  const after=await query(admin.from('bookings').select('id,status,deposit_amount,deposit_status,refund_due,price_estimated_min').in('id',bookingIds).order('id'),'SNAPSHOT_FAILED');check(JSON.stringify(before.data)===JSON.stringify(after.data),'ATTENTION_CHANGED_FINANCIAL_STATE');
  const payments=await query(admin.from('payments').select('id').limit(1),'PAYMENTS_READ_FAILED');check(payments.data?.length===0,'PAYMENTS_CHANGED');
  const policy=await query(admin.from('business_settings').select('value').eq('key','refund_window_hours').single(),'POLICY_READ_FAILED');check(policy.data?.value===24,'POLICY_CHANGED');
  const audit=await query(admin.from('audit_log').select('entity_id,action').in('entity_id',bookingIds).in('action',['booking_attention_started','booking_attention_finished']),'AUDIT_READ_FAILED');
  for(const id of bookingIds.slice(0,2))for(const action of ['booking_attention_started','booking_attention_finished'])check(audit.data?.filter(r=>r.entity_id===id&&r.action===action).length===1,'IDEMPOTENT_AUDIT_COUNT_WRONG');
 } finally {
  // PostgreSQL cleanup is necessary: service_role deliberately has no DELETE on attention.
  // It never grants extra rights. Exact owned UUIDs + markers, transaction, verified empty.
  if(fixtureStarted){
   try{
    const db=config.database;
    const clean=spawnSync('psql',['-X','-v','ON_ERROR_STOP=1','-q'],{input:cleanupSql({suffix,customerId,staffIds,bookingIds,roles}),encoding:'utf8',timeout:30_000,env:{PATH:process.env.PATH,PGHOST:db.hostname,PGPORT:db.port,PGDATABASE:'postgres',PGUSER:decodeURIComponent(db.username),PGPASSWORD:decodeURIComponent(db.password),PGSSLMODE:'disable',PGCONNECT_TIMEOUT:'5'}});
    failed=clean.status!==0;
   }catch{failed=true;}
   // Resolve exact emails as well, to clean a createUser whose response was lost.
   try{const listed=await admin.auth.admin.listUsers({page:1,perPage:1000});if(listed.error)failed=true;else {if(listed.data.users.length>=1000)failed=true;for(const user of listed.data.users)if(user.email&&emails.includes(user.email))users.add(user.id);}}catch{failed=true;}
   for(const id of users)try{if((await admin.auth.admin.deleteUser(id)).error)failed=true;}catch{failed=true;}
   try{const listed=await admin.auth.admin.listUsers({page:1,perPage:1000});if(listed.error||listed.data.users.length>=1000||listed.data.users.some(u=>u.email&&emails.includes(u.email)))failed=true;}catch{failed=true;}
  }
  globalThis.fetch=savedFetch;
  check(!failed,'LOCAL_TEAM_FIXTURE_CLEANUP_FAILED');
 }
 console.log('PASS: real local Auth/PostgREST/Hono team scope, finance omission, attention, revocation, direct-access denial and checked cleanup.');
}
if(import.meta.main){try{await runTeamScopeAcceptance();}catch(error){console.error(error instanceof Error&&/^[A-Z_]+$/.test(error.message)?error.message:'LOCAL_TEAM_ACCEPTANCE_FAILED');process.exitCode=1;}}
