import {afterEach,expect,test} from 'bun:test';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {SesionPanelCtx} from './panel-sesion';
import {AttentionActions} from '../components/booking/admin/AttentionActions';
import {adminApi} from './api/admin-client';
import type {OperationalAgendaEntry} from './api/admin-hooks';
import type {StaffIdentity} from './staff-session';
(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
const originalPost=adminApi.post;
afterEach(()=>{adminApi.post=originalPost;});
const identity={staffId:'p',agendaScope:'assigned',attentionEnabled:true,permisos:{calendario:'full'}} as StaffIdentity;
const entry={id:'b',view:'operational',status:'scheduled',closedBeforeTracking:false,attention:{startedAt:null,finishedAt:null},canStartAttention:true,canFinishAttention:false} as OperationalAgendaEntry;
async function mount(row=entry,staff=identity){
 const client=new QueryClient({defaultOptions:{queries:{retry:false},mutations:{retry:false}}});let tree!:ReactTestRenderer;
 await act(async()=>{tree=create(<QueryClientProvider client={client}><SesionPanelCtx.Provider value={{identidad:staff,cargando:false,cerrar:()=>{}}}><AttentionActions entry={row}/></SesionPanelCtx.Provider></QueryClientProvider>);});
 return {tree,close:async()=>{await act(async()=>tree.unmount());client.clear();}};
}
test('double click sends one operational event; failure restores retry without financial payload',async()=>{
 let calls=0;let fail!:(e:Error)=>void;let payload:unknown;
 adminApi.post=((path:string,body:unknown)=>{calls++;payload=body;expect(path).toBe('/bookings/b/attention/start');return new Promise((_,reject)=>{fail=reject;});}) as typeof adminApi.post;
 const {tree,close}=await mount();
 await act(async()=>{const click=tree.root.findByType('button').props.onClick;click();click();await new Promise(r=>setTimeout(r,5));});
 expect(calls).toBe(1);expect(payload).toEqual({});expect(tree.root.findByType('button').props.disabled).toBe(true);
 await act(async()=>{fail(new Error('No se pudo guardar.'));await new Promise(r=>setTimeout(r,5));});
 expect(tree.root.findByType('button').props.disabled).toBe(false);expect(tree.root.findByProps({role:'alert'}).children).toContain('No se pudo guardar.');
 await close();
});
test('feature disabled hides controls and server capabilities govern finish, not booking payment status',async()=>{
 const disabled=await mount(entry,{...identity,attentionEnabled:false});expect(disabled.tree.toJSON()).toBe(null);await disabled.close();
 const current=await mount({...entry,attention:{startedAt:'2026-11-13T12:00:00Z',finishedAt:null},canStartAttention:false,canFinishAttention:true});
 expect(current.tree.root.findByType('button').children).toContain('Finalizar atención');await current.close();
 const done=await mount({...entry,attention:{startedAt:'2026-11-13T12:00:00Z',finishedAt:'2026-11-13T12:30:00Z'},canStartAttention:false});expect(done.tree.root.findAllByType('button')).toHaveLength(0);await done.close();
});

import {ScopedPanel,staffAccessKey} from '../components/booking/admin/ScopedPanel';
import {useQueryClient} from '@tanstack/react-query';
test('scope downgrade discards private cache while token refresh with unchanged permissions preserves it',async()=>{
 const clients:QueryClient[]=[];
 function Probe(){const client=useQueryClient();clients.push(client);return <span>{client.getQueryData<string>(['private'])??'empty'}</span>;}
 let tree!:ReactTestRenderer;
 const all={...identity,agendaScope:'all' as const};
 await act(async()=>{tree=create(<ScopedPanel identity={all} onClose={()=>{}}><Probe/></ScopedPanel>);});
 const previous=clients.at(-1)!;previous.setQueryData(['private'],'financial-data');
 await act(async()=>tree.update(<ScopedPanel identity={{...all}} onClose={()=>{}}><Probe/></ScopedPanel>));
 expect(clients.at(-1)).toBe(previous);expect(staffAccessKey(all)).toBe(staffAccessKey({...all}));
 await act(async()=>tree.update(<ScopedPanel identity={identity} onClose={()=>{}}><Probe/></ScopedPanel>));
 expect(clients.at(-1)).not.toBe(previous);expect(clients.at(-1)!.getQueryData(['private'])).toBeUndefined();expect(previous.getQueryData(['private'])).toBeUndefined();
 await act(async()=>tree.unmount());
});

test('legacy closure has no invented times or start; missing closure signal fails conservatively',async()=>{
 const closed=await mount({...entry,closedBeforeTracking:true,canStartAttention:true});
 expect(closed.tree.root.findAllByType('button')).toHaveLength(0);
 const text=JSON.stringify(closed.tree.toJSON());expect(text).toContain('Atención finalizada');expect(text).not.toContain('Inicio:');expect(text).not.toContain('Fin:');await closed.close();
 const missing=await mount({...entry,closedBeforeTracking:undefined,canStartAttention:true});
 expect(missing.tree.root.findAllByType('button')).toHaveLength(0);expect(JSON.stringify(missing.tree.toJSON())).not.toContain('Atención finalizada');await missing.close();
 const started=await mount({...entry,closedBeforeTracking:true,attention:{startedAt:'2026-11-13T12:00:00Z',finishedAt:null},canStartAttention:false,canFinishAttention:true});
 expect(started.tree.root.findByType('button').children).toContain('Finalizar atención');expect(JSON.stringify(started.tree.toJSON())).toContain('Atención en curso');await started.close();
});

import {useSyncExternalStore} from 'react';
import {clearStaffToken,writeStaffToken,observeStaffAccess,denyStaffAccess,isStaffAccessDenied,subscribeStaffSession,readStaffSessionGeneration} from './staff-session';
test('observed denial unmounts private cache once and same-identity reactivation starts empty',async()=>{
 clearStaffToken();writeStaffToken('fictional-session');observeStaffAccess(identity);
 const clients:QueryClient[]=[];
 function Probe(){clients.push(useQueryClient());return <span>private</span>;}
 function Boundary(){const generation=useSyncExternalStore(subscribeStaffSession,readStaffSessionGeneration,()=>0);return isStaffAccessDenied()?<p>denied</p>:<ScopedPanel key={generation} identity={identity} onClose={()=>{}}><Probe/></ScopedPanel>;}
 let tree!:ReactTestRenderer;await act(async()=>{tree=create(<Boundary/>);});
 const old=clients.at(-1)!;old.setQueryData(['private'],'data');
 await act(async()=>denyStaffAccess());expect(old.getQueryData(['private'])).toBeUndefined();expect(JSON.stringify(tree.toJSON())).not.toContain('private');
 const generation=readStaffSessionGeneration();await act(async()=>denyStaffAccess());expect(readStaffSessionGeneration()).toBe(generation);
 await act(async()=>{observeStaffAccess(identity);tree.update(<Boundary/>);});expect(clients.at(-1)).not.toBe(old);expect(clients.at(-1)!.getQueryData(['private'])).toBeUndefined();
 await act(async()=>tree.unmount());clearStaffToken();
});
import {UncertainOutcomeNotice} from '../components/booking/admin/PanelAccess';
import {reportUncertainStaffOutcome,dismissUncertainStaffOutcome} from './staff-session';
test('uncertain mutation notice survives private subtree retirement until explicitly dismissed',async()=>{
 dismissUncertainStaffOutcome();let tree!:ReactTestRenderer;
 await act(async()=>{tree=create(<><UncertainOutcomeNotice/><span>private</span></>);reportUncertainStaffOutcome();});
 await act(async()=>tree.update(<UncertainOutcomeNotice/>));
 expect(JSON.stringify(tree.toJSON())).toContain('Revisá el turno antes de repetirla');
 await act(async()=>tree.root.findByType('button').props.onClick());expect(tree.toJSON()).toBe(null);
 await act(async()=>tree.unmount());
});
