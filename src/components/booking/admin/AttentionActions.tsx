import {useRef} from 'react';
import {useSesionPanel} from '@/lib/panel-sesion';
import {puede} from '@/lib/staff-session';
import {useAttentionTransition,type AgendaRowEntry} from '@/lib/api/admin-hooks';
export function AttentionActions({entry}:{entry:AgendaRowEntry}) {
 const {identidad}=useSesionPanel();
 const mutation=useAttentionTransition();
 const inFlight=useRef(false);
 if(!identidad?.attentionEnabled || !entry.attention) return null;
 const startedAt=entry.attention.startedAt ?? mutation.data?.startedAt ?? null;
 const finishedAt=entry.attention.finishedAt ?? mutation.data?.finishedAt ?? null;
 const closedBeforeTracking=entry.closedBeforeTracking === true && !startedAt;
 const action=finishedAt || closedBeforeTracking ? null : startedAt ? 'finish' : entry.closedBeforeTracking === false ? 'start' : null;
 const eligible=action==='start' ? entry.canStartAttention === true : entry.canFinishAttention === true;
 const label=finishedAt || closedBeforeTracking ? 'Atención finalizada' : startedAt ? 'Atención en curso' : entry.closedBeforeTracking === false ? 'Atención sin iniciar' : 'Atención';
 return <section className="mt-3 space-y-2" aria-label="Atención">
  <p>{label}</p>
  <p className="text-xs text-muted-foreground">No registra un cobro.</p>
  {startedAt && <p>Inicio: {new Date(startedAt).toLocaleString('es-AR',{timeZone:'America/Argentina/Buenos_Aires'})}</p>}
  {finishedAt && <p>Fin: {new Date(finishedAt).toLocaleString('es-AR',{timeZone:'America/Argentina/Buenos_Aires'})}</p>}
  {action && eligible && puede(identidad,'calendario','full') && <button type="button" disabled={mutation.isPending} aria-busy={mutation.isPending} onClick={()=>{
   if(inFlight.current)return;
   inFlight.current=true;
   mutation.mutate({bookingId:entry.id,action},{onSettled:()=>{inFlight.current=false;}});
  }} className="rounded-full border px-3 py-2 disabled:opacity-50">{mutation.isPending?'Guardando…':action==='start'?'Empezar atención':'Finalizar atención'}</button>}
  {mutation.isError && <p role="alert">{mutation.error.message}</p>}
  {mutation.isSuccess && <p role="status">Guardado.</p>}
 </section>;
}
