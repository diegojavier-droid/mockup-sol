/** Pure local acceptance guards/plans. No I/O or environment reads on import. */
import {localAuthOrigin} from './acceptance-staff-password-local';
export {localAuthOrigin};
export function localDatabase(raw:string|undefined):URL {
 if(!raw)throw Error('LOCAL_DATABASE_REQUIRED');
 let url:URL;try{url=new URL(raw);}catch{throw Error('LOCAL_DATABASE_REQUIRED');}
 const authority=raw.split('://')[1]?.split('/')[0]?.split('@').at(-1)??'';
 if(!['postgres:','postgresql:'].includes(url.protocol)||! /^(?:localhost|127\.0\.0\.1):[0-9]+$/.test(authority)||url.pathname!=='/postgres'||raw.includes('?')||raw.includes('#')||!url.username)throw Error('LOCAL_DATABASE_REQUIRED');
 return url;
}
export function acceptanceConfig(env:Record<string,string|undefined>){
 if(env.LOCAL_TEAM_SCOPE_ACCEPTANCE!=='ephemeral-clean-room')throw Error('EXPLICIT_LOCAL_TEAM_OPT_IN_REQUIRED');
 const origin=localAuthOrigin(env.SUPABASE_LOCAL_API_URL);
 if(!['localhost','127.0.0.1'].includes(env.PGHOST??'')||!/^\d+$/.test(env.PGPORT??'')||env.PGDATABASE!=='postgres'||env.PGUSER!=='postgres'||!env.PGPASSWORD)throw Error('LOCAL_DATABASE_REQUIRED');
 const database=localDatabase(`postgresql://postgres:${encodeURIComponent(env.PGPASSWORD)}@${env.PGHOST}:${env.PGPORT}/postgres`);
 if(!env.SUPABASE_LOCAL_ANON_KEY||!env.SUPABASE_LOCAL_SERVICE_ROLE_KEY)throw Error('LOCAL_KEYS_REQUIRED');
 return {origin,database,anon:env.SUPABASE_LOCAL_ANON_KEY,secret:env.SUPABASE_LOCAL_SERVICE_ROLE_KEY};
}
export const check:(condition:unknown,label:string)=>asserts condition=(condition,label)=>{if(!condition)throw Error(label);};
export function success<T extends {error:unknown}>(result:T,label:string):T {check(!result.error,label);return result;}
export function assertOperational(entry:Record<string,any>){
 check(entry.view==='operational','OPERATIONAL_VIEW_REQUIRED');
 const forbidden=['publicToken','depositStatus','priceEstimatedMin','priceDisplayMode','depositAmount','hasServiceClosure','payments','costAmount','finalPrice','refundDue'];
 for(const key of forbidden)check(!(key in entry),'FINANCIAL_FIELD_EXPOSED');
 check(entry.status!=='pending_payment','FINANCIAL_STATUS_EXPOSED');
 check(entry.customer&&Object.keys(entry.customer).sort().join(',')==='firstName,lastName','CONTACT_OR_CUSTOMER_ID_EXPOSED');
}
export function cleanupSql(input:{suffix:string;customerId:string;staffIds:string[];bookingIds:string[];roles:string[]}):string {
 check(/^[a-f0-9]{16}$/.test(input.suffix),'INVALID_CLEANUP_SUFFIX');
 for(const id of [input.customerId,...input.staffIds,...input.bookingIds])check(/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(id),'INVALID_CLEANUP_ID');
 for(const role of input.roles)check(new RegExp('^ci-team-[a-z]+-'+input.suffix+'$').test(role),'INVALID_CLEANUP_ROLE');
 const ids=input.bookingIds.map(id=>`'${id}'::uuid`).join(',');
 const staffs=input.staffIds.map(id=>`'${id}'::uuid`).join(',');const roles=input.roles.map(r=>`'${r}'`).join(',');
 // No grants, broad deletes, production targets or caller-controlled SQL.
 return `BEGIN;
 CREATE TEMP TABLE owned_ci_bookings ON COMMIT DROP AS SELECT b.id FROM public.bookings b JOIN public.customers c ON c.id=b.customer_id WHERE b.id IN (${ids}) AND c.id='${input.customerId}'::uuid AND c.email='ci-team-${input.suffix}@example.invalid';
 DELETE FROM public.booking_attention WHERE booking_id IN (SELECT id FROM owned_ci_bookings);
 DELETE FROM public.audit_log WHERE entity_type='booking' AND entity_id IN (SELECT id FROM owned_ci_bookings);
 DELETE FROM public.booking_items WHERE booking_id IN (SELECT id FROM owned_ci_bookings);
 DELETE FROM public.bookings WHERE id IN (SELECT id FROM owned_ci_bookings);
 DELETE FROM public.customers WHERE id='${input.customerId}'::uuid AND email='ci-team-${input.suffix}@example.invalid';
 DELETE FROM public.staff_members WHERE id IN (${staffs}) AND slug LIKE 'ci-team-%-${input.suffix}';
 DELETE FROM public.role_permissions WHERE role_slug IN (${roles});
 DELETE FROM public.roles WHERE slug IN (${roles}) AND NOT is_system;
 DO $$ BEGIN IF EXISTS(SELECT 1 FROM public.bookings WHERE id IN (${ids})) OR EXISTS(SELECT 1 FROM public.staff_members WHERE id IN (${staffs})) OR EXISTS(SELECT 1 FROM public.customers WHERE id='${input.customerId}'::uuid) OR EXISTS(SELECT 1 FROM public.roles WHERE slug IN (${roles})) THEN RAISE EXCEPTION 'LOCAL_FIXTURE_CLEANUP_FAILED'; END IF; END $$;
 COMMIT;`;
}
