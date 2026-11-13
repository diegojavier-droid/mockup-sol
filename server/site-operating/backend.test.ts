import {describe,expect,it} from 'bun:test';
import {databaseTransport,executeAuthenticated,isolatedEnv} from './backend';
import {DATABASE,ORIGIN,type Operation} from './contract';
const op: Operation={method:'GET',path:'/api/v1/health'};
const env=()=>isolatedEnv(k=>({SUPABASE_URL:DATABASE,SUPABASE_SECRET_KEYS:'{"default":"sb_secret_test"}',SUPABASE_PUBLISHABLE_KEYS:'{"default":"sb_publishable_test"}'}[k]));
const asFetch=(f:(input:Request|URL|string,init?:RequestInit)=>Promise<Response>)=>f as unknown as typeof fetch;
describe('canonical Site isolated backend',()=>{
 it('requires exact test project and never imports provider credentials',()=>{
  expect(()=>isolatedEnv(()=>undefined)).toThrow();
  expect(()=>isolatedEnv(k=>k==='SUPABASE_URL'?'https://production.example':undefined)).toThrow();
  expect(env().MERCADO_PAGO_ACCESS_TOKEN).toBeUndefined();
  expect(env().ANTHROPIC_API_KEY).toBeUndefined();
 });
 it('rejects non-database, Auth, fragments and redirects',async()=>{
  let calls=0;
  const fetcher=databaseTransport(op,'a'.repeat(64),asFetch(async()=>{calls++;return Response.json({});}));
  for(const target of ['https://other.example/rest/v1/bookings',DATABASE+'/auth/v1/user',DATABASE+'/rest/v1/bookings#leak',DATABASE+'/rest/v1/%62ookings']) await expect(fetcher(target)).rejects.toThrow();
  expect(calls).toBe(0);
  const redirect=databaseTransport(op,'a'.repeat(64),asFetch(async(_r,i)=>{expect(i?.redirect).toBe('manual');return new Response(null,{status:302,headers:{location:'https://other.example'}});}));
  await expect(redirect(DATABASE+'/rest/v1/bookings')).rejects.toThrow();
 });
 it('consumes nonce using restricted transport before dispatch and stops replay',async()=>{
  for(const accepted of [true,false]) {
   const seen:string[]=[];
   const transport=asFetch(async(input,init)=>{const r=input as Request;seen.push(new URL(r.url).pathname);expect(init?.redirect).toBe('manual');expect(await r.json()).toEqual({p_nonce:'00000000-0000-4000-8000-000000000001',p_expires_at:'2026-11-12T07:00:00.000Z'});return Response.json(accepted);});
   const run=executeAuthenticated(env(),op,'a'.repeat(64),'00000000-0000-4000-8000-000000000001',1794466800,transport);
   if(accepted)expect((await run).status).toBe(200);else await expect(run).rejects.toThrow('REPLAY_REJECTED');
   expect(seen).toEqual(['/rest/v1/rpc/site_operating_consume_nonce']);
  }
 });
 it('remaps only canonical creates into atomic idempotency wrapper',async()=>{
  const operation:Operation={method:'POST',path:'/api/v1/bookings',operationId:crypto.randomUUID(),body:{}};
  let seen=false;
  const wrapped=databaseTransport(operation,'b'.repeat(64),asFetch(async(input,init)=>{
   const req=input as Request;expect(req.url).toBe(DATABASE+'/rest/v1/rpc/site_operating_create');expect(init?.redirect).toBe('manual');expect(await req.json()).toEqual({p_operation_id:operation.operationId,p_request_hash:'b'.repeat(64),p_kind:'create_online_booking',p_args:{p_customer:{first_name:'Clienta de prueba'}}});seen=true;return Response.json({id:'synthetic'});
  }));
  await wrapped(DATABASE+'/rest/v1/rpc/create_online_booking',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({p_customer:{first_name:'Clienta de prueba'}})});
  expect(seen).toBe(true);
  await expect(databaseTransport(op,'b'.repeat(64))(DATABASE+'/rest/v1/rpc/create_booking',{method:'POST',body:'{}'})).rejects.toThrow();
 });
});
