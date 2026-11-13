import {useEffect,useMemo,type ReactNode} from 'react';
import {QueryClientProvider} from '@tanstack/react-query';
import {SesionPanelCtx} from '@/lib/panel-sesion';
import type {StaffIdentity} from '@/lib/staff-session';
import {createPanelQueryClient,clearPanelQueryClient} from '@/lib/panel-query-client';
export {staffAccessKey} from "@/lib/staff-session";
import {staffAccessKey} from "@/lib/staff-session";
/** Identity is checked outside this cache. A changed scope destroys all private queries. */
export function ScopedPanel({identity,onClose,children}:{identity:StaffIdentity;onClose:()=>void;children:ReactNode}) {
 return <ScopeCache key={staffAccessKey(identity)} identity={identity} onClose={onClose}>{children}</ScopeCache>;
}
function ScopeCache({identity,onClose,children}:{identity:StaffIdentity;onClose:()=>void;children:ReactNode}) {
 const client=useMemo(()=>{const value=createPanelQueryClient();value.setQueryData(['admin','me'],identity);return value;},[]);
 useEffect(()=>()=>clearPanelQueryClient(client),[client]);
 return <QueryClientProvider client={client}><SesionPanelCtx.Provider value={{identidad:identity,cargando:false,cerrar:onClose}}>{children}</SesionPanelCtx.Provider></QueryClientProvider>;
}
