import {afterEach, beforeEach, describe, expect, it} from 'bun:test';
import {ApiError} from './api/client';
import {adminApi} from './api/admin-client';
import {clearStaffToken, expireStaffSession, readStaffSessionGeneration, readStaffToken, subscribeStaffExpiration, subscribeStaffSession, writeStaffToken} from './staff-session';
import {clearPanelQueryClient, createPanelQueryClient} from './panel-query-client';
import {readFileSync} from 'node:fs';
const originalFetch=globalThis.fetch;
const originalWindow=Object.getOwnPropertyDescriptor(globalThis,'window');
const values=new Map<string,string>();
const storage={getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>values.set(k,v),removeItem:(k:string)=>values.delete(k)};
function deferred<T>() { let resolve!:(value:T)=>void; const promise=new Promise<T>(r=>{resolve=r;});return {promise,resolve}; }
beforeEach(()=>{Object.defineProperty(globalThis,'window',{value:{sessionStorage:storage},configurable:true});values.clear();clearStaffToken();});
afterEach(()=>{clearStaffToken();globalThis.fetch=originalFetch;if(originalWindow)Object.defineProperty(globalThis,'window',originalWindow);else Reflect.deleteProperty(globalThis,'window');});
const fakeJwt = (sub:string,session_id:string,exp:number) => `${btoa('{}')}.${btoa(JSON.stringify({sub,session_id,exp}))}.not-a-signature`;
const actorA='11111111-1111-4111-8111-111111111111', actorB='22222222-2222-4222-8222-222222222222', sessionA='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',sessionB='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
describe('session and data generation boundary',()=>{
 it('notifies changes, deduplicates identical token, expires SDK only on explicit expiration',()=>{
  const events:number[]=[];let expired=0;
  const stop=subscribeStaffSession(()=>events.push(readStaffSessionGeneration()));const stopExpired=subscribeStaffExpiration(()=>expired++);
  writeStaffToken('synthetic-A');writeStaffToken('synthetic-A');writeStaffToken('synthetic-refresh');expect(events.length).toBe(2);expect(expired).toBe(0);
  clearStaffToken();expect(readStaffToken()).toBeNull();expireStaffSession();expect(expired).toBe(1);expect(events.length).toBeGreaterThanOrEqual(4);expect(events.every((value,index)=>index===0 || value>events[index-1])).toBe(true);stop();stopExpired();
 });
 it('memory is authoritative if persistent writes/removals fail',()=>{
  values.set('sol-mai-staff-token','stale-storage-token');
  Object.defineProperty(globalThis,'window',{value:{sessionStorage:{...storage,setItem:()=>{throw Error('blocked');},removeItem:()=>{throw Error('blocked');}}},configurable:true});
  writeStaffToken('fresh-memory-token');expect(readStaffToken()).toBe('fresh-memory-token');clearStaffToken();expect(readStaffToken()).toBeNull();expect(values.get('sol-mai-staff-token')).toBe('stale-storage-token');
 });
 it('same-session token refresh preserves in-flight PATCH outcome and cache generation',async()=>{
  const d=deferred<Response>();let signal:AbortSignal|undefined;writeStaffToken(fakeJwt(actorA,sessionA,1));const generation=readStaffSessionGeneration();
  globalThis.fetch=((_input:Parameters<typeof fetch>[0],init?:Parameters<typeof fetch>[1])=>{signal=init?.signal as AbortSignal;return d.promise;}) as unknown as unknown as typeof fetch;
  const pending=adminApi.patch<{saved:boolean}>('/salon/services/x',{name:'fictional'});writeStaffToken(fakeJwt(actorA,sessionA,2));expect(readStaffSessionGeneration()).toBe(generation);expect(signal?.aborted).toBe(false);d.resolve(Response.json({data:{saved:true}}));expect(await pending).toEqual({saved:true});
  writeStaffToken(fakeJwt(actorB,sessionB,3));expect(readStaffSessionGeneration()).toBeGreaterThan(generation);
 });
 it('an expired old access token cannot clear its freshly rotated same-session replacement',async()=>{
  const d=deferred<Response>();let expired=0;const stop=subscribeStaffExpiration(()=>expired++);writeStaffToken(fakeJwt(actorA,sessionA,1));globalThis.fetch=(()=>d.promise) as unknown as unknown as typeof fetch;const pending=adminApi.get('/me').catch(e=>e);const fresh=fakeJwt(actorA,sessionA,2);writeStaffToken(fresh);d.resolve(Response.json({error:{message:'expired old token'}},{status:401}));await pending;expect(readStaffToken()).toBe(fresh);expect(expired).toBe(0);stop();
 });
 it('uses only current bearer and never caches authenticated requests',async()=>{
  writeStaffToken('synthetic-A');
  globalThis.fetch=(async(input:Parameters<typeof fetch>[0],init?:Parameters<typeof fetch>[1])=>{expect(input).toBe('/api/v1/admin/me');expect(init?.cache).toBe('no-store');expect(new Headers(init?.headers).get('authorization')).toBe('Bearer synthetic-A');return Response.json({data:{role:'reception',staffId:actorA,email:'fictional@example.invalid',displayName:'Ejemplo',roleName:'Recepción',permisos:{calendario:'view'}}});}) as unknown as unknown as typeof fetch;
  expect(await adminApi.get<StaffIdentity>('/me')).toEqual({role:'reception',staffId:actorA,email:'fictional@example.invalid',displayName:'Ejemplo',roleName:'Recepción',permisos:{calendario:'view'}});
 });
 it('aborts A and rejects late successful response after switching to B',async()=>{
  const d=deferred<Response>();let signal:AbortSignal|undefined;writeStaffToken('synthetic-A');
  globalThis.fetch=((_input:Parameters<typeof fetch>[0],init?:Parameters<typeof fetch>[1])=>{signal=init?.signal as AbortSignal;return d.promise;}) as unknown as unknown as typeof fetch;
  const pending=adminApi.get('/agenda').catch(e=>e);writeStaffToken('synthetic-B');expect(signal?.aborted).toBe(true);
  d.resolve(Response.json({data:{privateA:'must not appear'}}));const result=await pending;expect(result).toBeInstanceOf(ApiError);expect((result as ApiError).status).toBe(409);expect(readStaffToken()).toBe('synthetic-B');
 });
 it('old 401 never logs B out or triggers SDK expiration',async()=>{
  const d=deferred<Response>();let expired=0;const stop=subscribeStaffExpiration(()=>expired++);writeStaffToken('synthetic-A');
  globalThis.fetch=(()=>d.promise) as unknown as unknown as typeof fetch;const pending=adminApi.get('/me').catch(e=>e);writeStaffToken('synthetic-B');d.resolve(Response.json({error:{message:'expired'}},{status:401}));await pending;expect(readStaffToken()).toBe('synthetic-B');expect(expired).toBe(0);stop();
 });
 it('logout discards a late mutation result, even when fetch ignores abort',async()=>{
  const d=deferred<Response>();writeStaffToken('synthetic-A');globalThis.fetch=(()=>d.promise) as unknown as unknown as typeof fetch;
  const pending=adminApi.post('/bookings',{name:'fictional'}).catch(e=>e);clearStaffToken();d.resolve(Response.json({data:{id:'old'}}));expect(await pending).toBeInstanceOf(ApiError);expect(readStaffToken()).toBeNull();
 });
 it('generation check also covers delayed body reads',async()=>{
  const body=deferred<string>();writeStaffToken('synthetic-A');globalThis.fetch=(async()=>({ok:true,status:200,text:()=>body.promise}) as Response) as unknown as unknown as typeof fetch;
  const pending=adminApi.get('/me').catch(e=>e);await Promise.resolve();writeStaffToken('synthetic-B');body.resolve(JSON.stringify({data:{name:'A'}}));expect(await pending).toBeInstanceOf(ApiError);
 });
 it('current 401 clears mirror and invalidates SDK even with malformed JSON',async()=>{
  writeStaffToken('synthetic-A');let expired=0;const stop=subscribeStaffExpiration(()=>expired++);globalThis.fetch=(async()=>new Response('not JSON',{status:401})) as unknown as unknown as typeof fetch;
  expect(await adminApi.get('/me').catch(e=>e)).toBeInstanceOf(ApiError);expect(expired).toBe(1);expect(readStaffToken()).toBeNull();stop();
 });
 it('403 keeps identity, missing token never sends HTTP',async()=>{
  let calls=0;writeStaffToken('synthetic-A');globalThis.fetch=(async()=>{calls++;return Response.json({error:{message:'no access'}},{status:403});}) as unknown as unknown as typeof fetch;
  expect((await adminApi.get('/me').catch(e=>e) as ApiError).status).toBe(403);expect(readStaffToken()).toBe('synthetic-A');clearStaffToken();expect((await adminApi.get('/me').catch(e=>e) as ApiError).status).toBe(401);expect(calls).toBe(1);
 });
 it('separate QueryClients never expose A data to B; retirement clears mutations and stops late cache writes',async()=>{
  const a=createPanelQueryClient(),b=createPanelQueryClient();a.setQueryData(['admin','agenda'],['private A']);a.getMutationCache().build(a,{mutationFn:async()=>({privateA:true})});expect(b.getQueryData(['admin','agenda'])).toBeUndefined();
  const d=deferred<string>();const pending=a.fetchQuery({queryKey:['admin','late'],queryFn:()=>d.promise}).catch(()=>undefined);
  clearPanelQueryClient(a);d.resolve('old A');await pending;expect(a.getQueryCache().getAll().length).toBe(0);expect(a.getMutationCache().getAll().length).toBe(0);expect(b.getQueryCache().getAll().length).toBe(0);clearPanelQueryClient(b);
 });
 it('panel always restores SDK, gates first identity call and keeps a private cache per generation',()=>{
  const source=readFileSync(new URL('../components/booking/admin/PanelAccess.tsx',import.meta.url),'utf8');expect(source).toContain('useSyncExternalStore(subscribeStaffSession');expect(source.indexOf('if(!readStaffToken())return <SignIn')).toBeLessThan(source.indexOf('<QueryClientProvider key={generation}')); expect(source).not.toContain('if (readStaffToken()) setHasToken(true)');expect(source).toContain('<QueryClientProvider key={generation}');expect(source).toContain('if(!identity.data)');
 });
});

import {readUncertainStaffOutcome,dismissUncertainStaffOutcome,denyStaffAccess,readStaffAccessVersion,observeStaffAccess,type StaffIdentity} from './staff-session';
it('same-session access downgrade aborts old request without clearing token',async()=>{
 writeStaffToken(fakeJwt(actorA,sessionA,1));
 const identity={staffId:actorA,role:'staff',agendaScope:'all',permisos:{calendario:'full',finanzas:'full'}} as StaffIdentity;
 observeStaffAccess(identity);const before=readStaffSessionGeneration();
 const d=deferred<Response>();let signal:AbortSignal|undefined;
 globalThis.fetch=((_input:unknown,init?:RequestInit)=>{signal=init?.signal as AbortSignal;return d.promise;}) as unknown as typeof fetch;
 const pending=adminApi.get('/agenda').catch(e=>e);
 observeStaffAccess({...identity,agendaScope:'assigned'});
 expect(signal?.aborted).toBe(true);expect(readStaffSessionGeneration()).toBeGreaterThan(before);expect(readStaffToken()).not.toBeNull();
 d.resolve(Response.json({data:{financial:'old'}}));expect(await pending).toBeInstanceOf(ApiError);
});
it('late older identity response cannot re-expand observed access',async()=>{
 writeStaffToken(fakeJwt(actorA,sessionA,1));const a=deferred<Response>(),b=deferred<Response>();let calls=0;
 globalThis.fetch=(()=>++calls===1?a.promise:b.promise) as unknown as typeof fetch;
 const older=adminApi.get('/me').catch(e=>e);const newer=adminApi.get<StaffIdentity>('/me');
 b.resolve(Response.json({data:{staffId:actorA,role:'staff',agendaScope:'assigned',permisos:{calendario:'full'}}}));expect((await newer).agendaScope).toBe('assigned');
 a.resolve(Response.json({data:{staffId:actorA,role:'staff',agendaScope:'all',permisos:{calendario:'full',finanzas:'full'}}}));expect(await older).toBeInstanceOf(ApiError);
});

it('successful agenda response with different access version is discarded until me confirms',async()=>{
 writeStaffToken(fakeJwt(actorA,sessionA,1));
 const identity={staffId:actorA,role:'staff',agendaScope:'all',permisos:{calendario:'full',finanzas:'full'},accessVersion:'version-all'};
 globalThis.fetch=(async()=>Response.json({data:identity},{headers:{'X-Staff-Access-Version':'version-all'}})) as unknown as typeof fetch;
 await adminApi.get('/me');const generation=readStaffSessionGeneration();
 globalThis.fetch=(async()=>Response.json({data:{entries:[]}},{headers:{'X-Staff-Access-Version':'version-assigned'}})) as unknown as typeof fetch;
 expect(await adminApi.get('/agenda').catch(e=>e)).toBeInstanceOf(ApiError);
 expect(readStaffSessionGeneration()).toBeGreaterThan(generation);expect(readStaffToken()).not.toBeNull();
 // The discrepant response does not become an identity or an accepted version.
 expect(readStaffAccessVersion()).toBe('version-all');
 globalThis.fetch=(async()=>Response.json({data:{...identity,agendaScope:'assigned',accessVersion:'version-assigned'}},{headers:{'X-Staff-Access-Version':'version-assigned'}})) as unknown as typeof fetch;
 expect((await adminApi.get<StaffIdentity>('/me')).agendaScope).toBe('assigned');expect(readStaffAccessVersion()).toBe('version-assigned');
});
it('latest me denial aborts old reads and writes before body parsing; repeats are stable and reactivation never revives old results',async()=>{
 writeStaffToken(fakeJwt(actorA,sessionA,1));
 const identity={staffId:actorA,role:'staff',agendaScope:'all',permisos:{calendario:'full'},accessVersion:'v1'};
 const me=()=>Response.json({data:identity},{headers:{'X-Staff-Access-Version':'v1'}});
 globalThis.fetch=(async()=>me()) as unknown as typeof fetch;await adminApi.get('/me');
 const read=deferred<Response>(),write=deferred<Response>();const signals:AbortSignal[]=[];
 globalThis.fetch=((url:unknown,init?:RequestInit)=>{signals.push(init!.signal as AbortSignal);return String(url).endsWith('/agenda')?read.promise:write.promise;}) as unknown as typeof fetch;
 const oldRead=adminApi.get('/agenda').catch(e=>e);const oldWrite=adminApi.post('/bookings/b/attention/start',{}).catch(e=>e);
 const before=readStaffSessionGeneration();
 globalThis.fetch=(async()=>new Response('<html>denied</html>',{status:403})) as unknown as typeof fetch;
 expect(await adminApi.get('/me').catch(e=>e)).toBeInstanceOf(ApiError);
 const deniedGeneration=readStaffSessionGeneration();expect(deniedGeneration).toBeGreaterThan(before);expect(signals.every(s=>s.aborted)).toBe(true);
 await adminApi.get('/me').catch(e=>e);expect(readStaffSessionGeneration()).toBe(deniedGeneration);expect(readStaffToken()).not.toBeNull();
 globalThis.fetch=(async()=>me()) as unknown as typeof fetch;await adminApi.get('/me');
 read.resolve(Response.json({data:{old:'all'}},{headers:{'X-Staff-Access-Version':'v1'}}));write.resolve(Response.json({data:{saved:true}},{headers:{'X-Staff-Access-Version':'v1'}}));
 expect(await oldRead).toBeInstanceOf(ApiError);expect(((await oldWrite) as ApiError).message).toContain('Revisá el turno antes de repetir');
});
it('older me denial cannot override newer valid identity',async()=>{
 writeStaffToken(fakeJwt(actorA,sessionA,1));const a=deferred<Response>(),b=deferred<Response>();let calls=0;
 globalThis.fetch=(()=>++calls===1?a.promise:b.promise) as unknown as typeof fetch;
 const older=adminApi.get('/me').catch(e=>e),newer=adminApi.get('/me');
 b.resolve(Response.json({data:{staffId:actorA,role:'staff',permisos:{calendario:'full'}}}));await newer;const generation=readStaffSessionGeneration();
 a.resolve(new Response('denied',{status:403}));expect(await older).toBeInstanceOf(ApiError);expect(readStaffSessionGeneration()).toBe(generation);
});
it('non-JSON 403 on a mutation retires requests, and malformed me200 denies once',async()=>{
 writeStaffToken(fakeJwt(actorA,sessionA,1));const before=readStaffSessionGeneration();
 globalThis.fetch=(async()=>new Response('<html>forbidden</html>',{status:403})) as unknown as typeof fetch;
 await adminApi.patch('/bookings/b/status',{status:'attended'}).catch(e=>e);expect(readStaffSessionGeneration()).toBeGreaterThan(before);
 globalThis.fetch=(async()=>new Response('not-json',{status:200})) as unknown as typeof fetch;
 await adminApi.get('/me').catch(e=>e);const denied=readStaffSessionGeneration();
 await adminApi.get('/me').catch(e=>e);expect(readStaffSessionGeneration()).toBe(denied);
});

it('explicit authorization mismatch on 409 retires access without accepting that header',async()=>{
 writeStaffToken(fakeJwt(actorA,sessionA,1));
 globalThis.fetch=(async()=>Response.json({data:{staffId:actorA,role:'staff',permisos:{calendario:'full'},accessVersion:'all'}},{headers:{'X-Staff-Access-Version':'all'}})) as unknown as typeof fetch;
 await adminApi.get('/me');const before=readStaffSessionGeneration();
 globalThis.fetch=(async()=>Response.json({error:{message:'conflict'}},{status:409,headers:{'X-Staff-Access-Version':'assigned'}})) as unknown as typeof fetch;
 const result=await adminApi.post('/bookings/b/attention/start',{}).catch(e=>e);
 expect(readStaffSessionGeneration()).toBeGreaterThan(before);expect(readStaffAccessVersion()).toBe('all');expect((result as ApiError).message).toContain('No pudimos confirmar el resultado');
});

it('older delayed identity body cannot revoke newer same-access identity',async()=>{
 for(const status of [200,401]) {
  clearStaffToken();writeStaffToken(fakeJwt(actorA,sessionA,1));
  const body=deferred<string>();let started=false;
  globalThis.fetch=(async()=>({ok:status===200,status,headers:new Headers(),text:()=>{started=true;return body.promise;}} as Response)) as unknown as typeof fetch;
  const older=adminApi.get('/me').catch(e=>e);while(!started)await Promise.resolve();
  globalThis.fetch=(async()=>Response.json({data:{staffId:actorA,role:'staff',permisos:{calendario:'full'}}})) as unknown as typeof fetch;
  await adminApi.get('/me');const generation=readStaffSessionGeneration();
  body.resolve('malformed');expect(await older).toBeInstanceOf(ApiError);expect(readStaffSessionGeneration()).toBe(generation);expect(readStaffToken()).not.toBeNull();
 }
});

it('aborted mutation response body yields controlled uncertain result and persistent notice',async()=>{
 writeStaffToken(fakeJwt(actorA,sessionA,1));dismissUncertainStaffOutcome();
 let rejectBody!:(error:Error)=>void;let reading=false;
 globalThis.fetch=(async()=>({ok:true,status:200,headers:new Headers(),text:()=>{reading=true;return new Promise<string>((_,reject)=>{rejectBody=reject;});}} as Response)) as unknown as typeof fetch;
 const pending=adminApi.post('/bookings/b/attention/start',{}).catch(e=>e);while(!reading)await Promise.resolve();
 denyStaffAccess();rejectBody(new DOMException('aborted','AbortError'));
 const error=await pending;expect(error).toBeInstanceOf(ApiError);expect((error as ApiError).message).toContain('Revisá el turno antes de repetir');expect(readUncertainStaffOutcome()).toBe(true);dismissUncertainStaffOutcome();
});
