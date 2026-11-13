import {expect,test} from 'bun:test';
import type {SupabaseClient} from '@supabase/supabase-js';
import {StaffAuthStorage,StaffAuthPersistence,finishStaffLogout,createStaffAuthMirror,staffAuthFetch,authDeadline} from './staff-auth-lifecycle';
import {crearIngresoConContrasena,leerSesionVigente} from './staff-auth';
function memory(){const map=new Map<string,string>();return {map,getItem:(k:string)=>map.get(k)??null,setItem:(k:string,v:string)=>{map.set(k,v);},removeItem:(k:string)=>{map.delete(k);}};}
const key='sb-test-auth-token';
test('logout error still clears persistence and blocks late refresh writes',async()=>{
 const backing=memory();const storage=new StaffAuthStorage(backing,key);
 storage.setItem(key,'synthetic-session');storage.setItem(`${key}-code-verifier`,'synthetic-pkce');
 const events:string[]=[];const cleared=storage.retire();
 expect(backing.getItem(key)).toBeNull();expect(storage.getItem(key)).toBe('synthetic-session');
 const result=await finishStaffLogout({storage,localCleared:cleared,auth:{
  stopAutoRefresh:async()=>{events.push('stop');},
  signOut:async()=>{events.push('signOut');storage.setItem(key,'late-refresh');return {error:new Error('network')};},
  dispose:async()=>{events.push('dispose');},
 }});
 expect(events).toEqual(['stop','signOut','dispose']);expect(result.localCleared).toBe(true);expect(result.providerSignedOut).toBe(false);
 expect(backing.getItem(key)).toBeNull();expect(storage.getItem(key)).toBeNull();expect(backing.getItem(`${key}-code-verifier`)).toBeNull();
});
test('provider success is separate from local clearing, throws are handled',async()=>{
 for(const outcome of ['ok','throw'] as const){const storage=new StaffAuthStorage(memory(),key);let disposed=false;
 const result=await finishStaffLogout({storage,localCleared:storage.retire(),auth:{stopAutoRefresh:async()=>{},signOut:async()=>{if(outcome==='throw')throw Error('offline');return {error:null};},dispose:async()=>{disposed=true;}}});
 expect(result.providerSignedOut).toBe(outcome==='ok');expect(disposed).toBe(true);}
});
test('another tab generation rejects a stale refresh even before storage event runs',()=>{
 const backing=memory();const tab1=new StaffAuthStorage(backing,key);const tab2=new StaffAuthStorage(backing,key);
 tab1.setItem(key,'old');tab2.retire();expect(tab1.current()).toBe(false);tab1.setItem(key,'late');expect(backing.getItem(key)).toBeNull();
 const fresh=new StaffAuthStorage(backing,key);fresh.setItem(key,'new-login');tab1.retire(false);tab1.dispose();expect(backing.getItem(key)).toBe('new-login');
});
test('blocked persistent removal is reported, not claimed cleared',()=>{
 const backing=memory();backing.setItem(key,'old');const storage=new StaffAuthStorage({...backing,removeItem:()=>{throw Error('blocked');}},key);
 expect(storage.retire()).toBe(false);storage.setItem(key,'late');expect(backing.getItem(key)).toBe('old');
});
test('late getSession is discarded after retirement',async()=>{
 let resolve!:(value:unknown)=>void;let current=true;
 const auth={getSession:()=>new Promise(r=>{resolve=r;})} as unknown as Pick<SupabaseClient['auth'],'getSession'>;
 const restore=leerSesionVigente(auth,()=>current);current=false;resolve({data:{session:{access_token:'late'}},error:null});expect(await restore).toBeNull();
});
test('late password login cannot mirror a token after logout',async()=>{
 let epoch=0;let resolve!:(value:unknown)=>void;const tokens:string[]=[];
 const login=crearIngresoConContrasena({config:async()=>({supabaseUrl:'https://example.invalid',publishableKey:'test',proveedores:['email']}),
 cliente:async()=>({auth:{signInWithPassword:()=>new Promise(r=>{resolve=r;})}} as unknown as Pick<SupabaseClient,'auth'>),
 guardarToken:t=>tokens.push(t),generation:()=>epoch,vigente:e=>e===epoch});
 const attempt=login('a@example.invalid','synthetic');await Promise.resolve();await Promise.resolve();epoch++;resolve({data:{session:{access_token:'late'}},error:null});
 expect((await attempt).ok).toBe(false);expect(tokens).toEqual([]);
});

test('old auth callbacks cannot mirror refreshed tokens or clear a new session',()=>{
 let current=true;const tokens:string[]=[];let empty=0,signedOut=0;
 const callback=createStaffAuthMirror({current:()=>current,matchesToken:()=>true,isEmpty:()=>true,token:t=>tokens.push(t),empty:()=>{empty++;},signedOut:()=>{signedOut++;}});
 callback('TOKEN_REFRESHED',{access_token:'first'});expect(tokens).toEqual(['first']);
 current=false;callback('TOKEN_REFRESHED',{access_token:'stale'});callback('SIGNED_OUT',null);callback('INITIAL_SESSION',null);
 expect(tokens).toEqual(['first']);expect(empty).toBe(0);expect(signedOut).toBe(0);
 current=true;callback('SIGNED_OUT',null);expect(signedOut).toBe(1);
});

test('hanging provider and dispose do not block logout or resurrect a later account',async()=>{
 const backing=memory();const old=new StaffAuthStorage(backing,key);old.setItem(key,'old');
 let resolve!:(value:{error:null})=>void;let disposed=false;
 const localCleared=old.retire();
 const pending=finishStaffLogout({storage:old,localCleared,timeoutMs:5,auth:{stopAutoRefresh:async()=>{},
  signOut:()=>new Promise(r=>{resolve=r;}),dispose:()=>{disposed=true;return new Promise(()=>{});}}});
 expect(backing.getItem(key)).toBeNull();
 const result=await pending;expect(result.localCleared).toBe(true);expect(result.providerSignedOut).toBe(false);expect(disposed).toBe(true);
 const next=new StaffAuthStorage(backing,key);next.setItem(key,'new-account');
 old.setItem(key,'late-account');resolve({error:null});await Promise.resolve();
 expect(backing.getItem(key)).toBe('new-account');expect(result.providerSignedOut).toBe(false);
});
test('configuration and auth fetch have a deadline even if fetch ignores abort',async()=>{
 let signal:AbortSignal|undefined;
 const fetcher=((_input:RequestInfo|URL,init?:RequestInit)=>{signal=init?.signal??undefined;return new Promise<Response>(()=>{});}) as typeof fetch;
 await expect(staffAuthFetch('/api/v1/auth/panel-config',undefined,5,fetcher)).rejects.toThrow('timed out');expect(signal?.aborted).toBe(true);
 await expect(authDeadline(new Promise(()=>{}),5)).rejects.toThrow('timed out');
});
test('auth body reads are bounded too',async()=>{
 const fetcher=(async()=>({arrayBuffer:()=>new Promise(()=>{})})) as unknown as typeof fetch;
 await expect(staffAuthFetch('https://example.invalid',undefined,5,fetcher)).rejects.toThrow('timed out');
});

test('no SDK configuration, empty session and errors clear only the current mirror',async()=>{
 for (const variant of ['no-config','empty','error','throw'] as const) {
   let cleared=0;
   const auth=variant==='no-config'?null:{getSession:async()=>{
    if(variant==='throw')throw Error('offline');
    return {data:{session:null},error:variant==='error'?new Error('expired'):null};
   }} as unknown as Pick<SupabaseClient['auth'],'getSession'>;
   await leerSesionVigente(auth,()=>true,()=>{cleared++;});expect(cleared).toBe(1);
   await leerSesionVigente(auth,()=>false,()=>{cleared++;});expect(cleared).toBe(1);
 }
});

test('login B retires restoration A before A can mirror or persist',async()=>{
 let epoch=0;const backing=memory();const oldStorage=new StaffAuthStorage(backing,key);oldStorage.setItem(key,'account-A');
 let resolveA!:(value:unknown)=>void;const tokens:string[]=[];
 const restoreEpoch=epoch;
 const restore=leerSesionVigente({getSession:()=>new Promise(resolve=>{resolveA=resolve;})} as unknown as Pick<SupabaseClient['auth'],'getSession'>,()=>epoch===restoreEpoch).then(response=>{
  if(response?.data.session?.access_token)tokens.push(response.data.session.access_token);
 });
 const login=crearIngresoConContrasena({beginTransition:()=>{oldStorage.retire();oldStorage.dispose();return ++epoch;},
  config:async()=>({supabaseUrl:'https://example.invalid',publishableKey:'test',proveedores:['email']}),
  cliente:async()=>({auth:{signInWithPassword:async()=>({data:{session:{access_token:'account-B'}},error:null})}} as unknown as Pick<SupabaseClient,'auth'>),
  guardarToken:token=>tokens.push(token),vigente:g=>g===epoch});
 expect((await login('b@example.invalid','synthetic')).ok).toBe(true);
 const nextStorage=new StaffAuthStorage(backing,key);nextStorage.setItem(key,'account-B');
 oldStorage.setItem(key,'late-account-A');resolveA({data:{session:{access_token:'account-A'}},error:null});await restore;
 expect(tokens).toEqual(['account-B']);expect(backing.getItem(key)).toBe('account-B');
});

test('retirement snapshots the latest same-generation session from another tab',()=>{
 const backing=memory();backing.setItem(key,'session-A');const old=new StaffAuthStorage(backing,key);
 backing.setItem(key,'session-B');expect(old.retire()).toBe(true);
 expect(old.getItem(key)).toBe('session-B');expect(backing.getItem(key)).toBeNull();
});
test('retirement after marker change never removes a newer account',()=>{
 const backing=memory();const old=new StaffAuthStorage(backing,key);old.setItem(key,'account-A');
 const closingTab=new StaffAuthStorage(backing,key);closingTab.retire();
 const fresh=new StaffAuthStorage(backing,key);fresh.setItem(key,'account-B');
 expect(old.retire()).toBe(true);expect(backing.getItem(key)).toBe('account-B');expect(old.getItem(key)).toBeNull();
});

test('delayed storage-removal and signed-out events cannot end a current B session',()=>{
 const backing=memory();const storage=new StaffAuthStorage(backing,key);storage.setItem(key,'account-B');
 let ended=0;
 // Both event paths inspect current storage, not the stale event payload.
 const signedOut=()=>{if(storage.shouldEndSession())ended++;};
 signedOut();signedOut();expect(ended).toBe(0);expect(backing.getItem(key)).toBe('account-B');
 backing.removeItem(key);signedOut();expect(ended).toBe(1);
});
test('failed removal quarantines persistence; explicit login only uses memory',()=>{
 const backing=memory();backing.setItem(key,'leftover-A');const policy=new StaffAuthPersistence();
 policy.recordCleanup(false);expect(policy.canRestore()).toBe(false);
 policy.recordCleanup(true);expect(policy.canRestore()).toBe(false);
 const next=new StaffAuthStorage(policy.storage(backing as unknown as Storage),key);
 expect(next.getItem(key)).toBeNull();next.setItem(key,'account-B');
 expect(next.getItem(key)).toBe('account-B');expect(backing.getItem(key)).toBe('leftover-A');
});

test('late signed-in and refresh events must match the current persisted token',()=>{
 for(const backing of [memory(),undefined]) {
  const storage=new StaffAuthStorage(backing,key);const tokens:string[]=[];let empty=0;
  const callback=createStaffAuthMirror({current:()=>storage.current(),matchesToken:t=>storage.matchesAccessToken(t),isEmpty:()=>storage.shouldEndSession(),token:t=>tokens.push(t),empty:()=>{empty++;},signedOut:()=>{}});
  storage.setItem(key,JSON.stringify({access_token:'account-B'}));
  callback('TOKEN_REFRESHED',{access_token:'old-A'});callback('SIGNED_IN',{access_token:'old-A'});callback('INITIAL_SESSION',null);
  expect(tokens).toEqual([]);expect(empty).toBe(0);
  callback('SIGNED_IN',{access_token:'account-B'});
  storage.setItem(key,JSON.stringify({access_token:'rotated-B'}));callback('TOKEN_REFRESHED',{access_token:'rotated-B'});
  expect(tokens).toEqual(['account-B','rotated-B']);
  storage.setItem(key,JSON.stringify({access_token:'pkce-session'}));callback('INITIAL_SESSION',{access_token:'pkce-session'});
  expect(tokens.at(-1)).toBe('pkce-session');
 }
});
test('malformed persisted session never accepts an event token',()=>{
 const storage=new StaffAuthStorage(memory(),key);for(const raw of ['broken','null','[]','{}','{"access_token":42}']) {
 storage.setItem(key,raw);expect(storage.matchesAccessToken('event-token')).toBe(false);}
});
