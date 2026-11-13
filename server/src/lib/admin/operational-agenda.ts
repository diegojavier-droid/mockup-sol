/** Least-privilege agenda projection. Never SELECT financial fields or public bearer tokens. */
import type {SupabaseAdminClient} from '../supabase';
import type {StaffIdentity} from '../../http/middleware/staffAuth';
import {agruparPorDia,projectTestAllergyScenarios,type AgendaContextPolicy} from './repository';

export function hasGlobalAgenda(staff:StaffIdentity):boolean { return staff.role==='owner'||staff.agendaScope==='all'; }
export function hasFinanceView(staff:StaffIdentity):boolean { return staff.permisos.finanzas==='view'||staff.permisos.finanzas==='full'; }
export function operationalOnly(staff:StaffIdentity):boolean { return !hasGlobalAgenda(staff)||!hasFinanceView(staff); }
const SELECT='id,staff_id,starts_at,ends_at,shown_duration_min,status,source,customer_note,resources(id,code,name),areas!inner(slug),customers!inner(first_name,last_name),booking_items(snapshot_name,role,sort_order,personalization)';
const ATTENTION=',booking_attention(started_at,finished_at)';
type Row={id:string;staff_id:string|null;starts_at:string;ends_at:string;shown_duration_min:number;status:string;source:string;customer_note:string|null;resources:{id:string;code:string;name:string}|null;areas:{slug:string};customers:{first_name:string;last_name:string|null};booking_items:{snapshot_name:string;role:string;sort_order:number;personalization?:unknown}[];booking_attention?:{started_at:string|null;finished_at:string|null}[]|{started_at:string|null;finished_at:string|null}|null};
export interface AttentionState {startedAt:string|null;finishedAt:string|null}
export function attentionState(row:Row['booking_attention']):AttentionState { const r=Array.isArray(row)?row[0]:row;return {startedAt:r?.started_at??null,finishedAt:r?.finished_at??null}; }
export interface OperationalAgendaEntry {view:'operational';id:string;startsAt:string;endsAt:string;shownDurationMin:number;status:string;source:string;area:string;station:Row['resources'];customer:{firstName:string;lastName:string|null};services:string[];customerNote:string|null;allergyScenarios:ReturnType<typeof projectTestAllergyScenarios>;attention:AttentionState;closedBeforeTracking:boolean;canStartAttention:boolean;canFinishAttention:boolean}
function project(row:Row,staff:StaffIdentity,trusted:boolean,legacyClosed:boolean):OperationalAgendaEntry {
 const attention=attentionState(row.booking_attention);
 const closedBeforeTracking=legacyClosed&&!attention.startedAt;
 const actionable=staff.attentionEnabled===true&&staff.permisos.calendario==='full'&&['confirmed','attended'].includes(row.status);
 return {view:'operational',id:row.id,startsAt:row.starts_at,endsAt:row.ends_at,shownDurationMin:row.shown_duration_min,
 status:({pending_payment:'scheduled',confirmed:'scheduled',attended:'arrived',expired:'cancelled',cancelled:'cancelled',no_show:'no_show'} as Record<string,string>)[row.status]??'unavailable',
 source:row.source,area:row.areas.slug,station:row.resources,customer:{firstName:row.customers.first_name,lastName:row.customers.last_name},
 services:(row.booking_items??[]).slice().sort((a,b)=>a.sort_order-b.sort_order).map(i=>i.snapshot_name),customerNote:trusted?row.customer_note:null,
 allergyScenarios:trusted?projectTestAllergyScenarios(row.booking_items??[]):[],attention,closedBeforeTracking,
 canStartAttention:actionable&&!closedBeforeTracking&&!attention.startedAt&&!attention.finishedAt,canFinishAttention:actionable&&!!attention.startedAt&&!attention.finishedAt};
}
export async function readOperationalAgenda(admin:SupabaseAdminClient,staff:StaffIdentity,params:{id?:string;from?:Date;to?:Date;area?:string},context:AgendaContextPolicy={mode:'staff'}):Promise<OperationalAgendaEntry[]> {
 if(!hasGlobalAgenda(staff)&&!staff.staffId) return [];
 let query=admin.from('bookings').select(SELECT+(staff.attentionEnabled===true?ATTENTION:''));
 if(!hasGlobalAgenda(staff)) query=query.eq('staff_id',staff.staffId);
 if(params.id) query=query.eq('id',params.id);
 if(params.from) query=query.gte('starts_at',params.from.toISOString());
 if(params.to) query=query.lt('starts_at',params.to.toISOString());
 if(params.area) query=query.eq('areas.slug',params.area);
 const {data,error}=await query.order('starts_at',{ascending:true});
 if(error) throw error;
 const rows=((data??[]) as unknown as Row[]).filter(r=>hasGlobalAgenda(staff)||r.staff_id===staff.staffId);
 if(context.mode==='site'&&typeof context.resolveTrusted!=='function') throw Error('SITE_PROVENANCE_REQUIRED');
 const trusted=context.mode==='site'?await context.resolveTrusted(rows.map(r=>r.id)):new Set(rows.map(r=>r.id));
 const closed=staff.attentionEnabled===true?await legacyClosures(admin,rows.map(r=>r.id)):new Set<string>();
 return rows.map(r=>project(r,staff,trusted.has(r.id),closed.has(r.id)));
}
export async function countAssignedAgenda(admin:SupabaseAdminClient,staff:StaffIdentity,params:{from:Date;to:Date;area?:string}) {
 if(!staff.staffId) return [];
 let query=admin.from('bookings').select('starts_at,staff_id,areas!inner(slug)').eq('staff_id',staff.staffId).gte('starts_at',params.from.toISOString()).lt('starts_at',params.to.toISOString());
 if(params.area) query=query.eq('areas.slug',params.area);
 const {data,error}=await query;
 if(error) throw error;
 return agruparPorDia((data??[]).filter(r=>r.staff_id===staff.staffId).map(r=>r.starts_at));
}

/** IDs originate in an already authorized result, never in caller-supplied scope. */
export async function attachAttention<T extends {id:string;status:string}>(admin:SupabaseAdminClient,staff:StaffIdentity,entries:T[]):Promise<(T&{attention?:AttentionState;canStartAttention?:boolean;canFinishAttention?:boolean;closedBeforeTracking?:boolean})[]> {
 if(staff.attentionEnabled!==true||entries.length===0) return entries;
 const {data,error}=await admin.from('booking_attention').select('booking_id,started_at,finished_at').in('booking_id',entries.map(e=>e.id));
 if(error) throw error;
 const closed=await legacyClosures(admin,entries.map(e=>e.id));
 const states=new Map((data??[]).map(r=>[r.booking_id,attentionState(r)]));
 return entries.map(entry=>{const attention=states.get(entry.id)??{startedAt:null,finishedAt:null};const closedBeforeTracking=closed.has(entry.id)&&!attention.startedAt;const allowed=staff.permisos.calendario==='full'&&['confirmed','attended'].includes(entry.status);return {...entry,attention,closedBeforeTracking,canStartAttention:allowed&&!closedBeforeTracking&&!attention.startedAt&&!attention.finishedAt,canFinishAttention:allowed&&!!attention.startedAt&&!attention.finishedAt};});
}

/** Legacy operational completion existence only, never its financial columns.
 * Input IDs are exclusively from the authorized booking result above. */
async function legacyClosures(admin:SupabaseAdminClient,ids:string[]):Promise<Set<string>> {
 if(ids.length===0)return new Set();
 const {data,error}=await admin.from('service_execution_records').select('booking_id').in('booking_id',ids);
 if(error)throw error;
 return new Set((data??[]).map(row=>row.booking_id as string).filter(id=>ids.includes(id)));
}
