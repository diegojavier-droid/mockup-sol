import {readUncertainStaffOutcome,subscribeUncertainStaffOutcome,dismissUncertainStaffOutcome} from "@/lib/staff-session";
import {ScopedPanel} from "./ScopedPanel";
/** Session-specific private cache. The sign-in form must survive auth transitions. */
import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import { SignIn } from './SignIn';
import { ApiError } from '@/lib/api/client';
import { useStaffIdentity } from '@/lib/api/admin-hooks';
import { readStaffToken, clearStaffToken, readStaffSessionGeneration, subscribeStaffSession } from '@/lib/staff-session';
import { SesionPanelCtx } from '@/lib/panel-sesion';
import { recuperarSesion, salir } from '@/lib/staff-auth';
import { clearPanelQueryClient, createPanelQueryClient } from '@/lib/panel-query-client';
export function UncertainOutcomeNotice() {
 const uncertain=useSyncExternalStore(subscribeUncertainStaffOutcome,readUncertainStaffOutcome,()=>false);
 return uncertain ? <aside role="alert" className="border-b border-amber-400 bg-amber-50 p-4 text-sm text-amber-950">
  <p>No pudimos confirmar el resultado de la operación. Revisá el turno antes de repetirla.</p>
  <button type="button" onClick={dismissUncertainStaffOutcome}>Cerrar</button>
 </aside> : null;
}
export function PanelAccess({children}:{children:ReactNode}) {
 return <><UncertainOutcomeNotice/><SessionPanelAccess>{children}</SessionPanelAccess></>;
}
function SessionPanelAccess({children}:{children:ReactNode}) {
  const generation=useSyncExternalStore(subscribeStaffSession,readStaffSessionGeneration,()=>0);
  const [ready,setReady]=useState(false);
  const [notice,setNotice]=useState<string|null>(null);
  const client=useMemo(()=>createPanelQueryClient(),[generation]);
  useEffect(()=>()=>clearPanelQueryClient(client),[client]);
  useEffect(()=>{
    let alive=true;
    // Always initialize SDK/refresh/cross-tab events, never trust the old mirror.
    void recuperarSesion().then(({problema})=>{if(alive){setNotice(problema);setReady(true);}})
      .catch(()=>{if(alive){clearStaffToken();setNotice('Volvé a iniciar sesión.');setReady(true);}});
    return ()=>{alive=false;};
  },[]);
  const onToken=()=>{setNotice(null);setReady(true);};
  const onClose=()=>{
    setReady(false);clearPanelQueryClient(client);
    void salir().then(result=>{setNotice(result.mensaje??null);setReady(true);})
      .catch(()=>{clearStaffToken();setNotice('Volvé a iniciar sesión.');setReady(true);});
  };
  if(!ready)return <main className="p-6"><p>Un segundo…</p></main>;
  // This form is OUTSIDE the keyed private subtree. Beginning an invalid
  // password attempt must not erase its busy state, email or eventual error.
  if(!readStaffToken())return <SignIn onToken={onToken} onSignOut={onClose} error={null} aviso={notice}/>;
  return <QueryClientProvider key={generation} client={client}>
    <PanelSession notice={notice} onToken={onToken} onClose={onClose}>{children}</PanelSession>
  </QueryClientProvider>;
}
function PanelSession({children,notice,onToken,onClose}:{children:ReactNode;notice:string|null;onToken:()=>void;onClose:()=>void}) {
  const identity=useStaffIdentity();
  if(identity.isError) {
    if(identity.error instanceof ApiError && identity.error.status===403)
      return <SignIn onToken={onToken} onSignOut={onClose} error={identity.error} aviso={notice}/>;
    // A transport/server failure does not mean bad credentials. Do not mount a
    // password form inside this keyed private subtree: logout returns to the
    // stable anonymous form and retry only reloads the authorized identity.
    return <main className="p-6"><h1>No pudimos abrir el panel.</h1>
      <p>Volvé a intentar o cerrá la sesión para entrar con otra cuenta.</p>
      <button type="button" disabled={identity.isFetching} onClick={()=>void identity.refetch()}>Volver a intentar</button>
      <button type="button" onClick={onClose}>Cerrar sesión</button>
    </main>;
  }
  if(!identity.data)return <main className="p-6"><p>Un segundo…</p></main>;
  return <ScopedPanel identity={identity.data} onClose={onClose}>{children}</ScopedPanel>;
}
