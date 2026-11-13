import {describe,expect,it} from 'bun:test';
import type {ServerEnv} from '../../config/env';
import type {SupabaseAdminClient} from '../supabase';
import {bindSupabaseTransport} from '../supabase/transport';
import {createBookingsRoute} from '../../http/routes/bookings';
import {getBookingByToken} from './repository';
const token='a'.repeat(32);
const row={public_token:token,status:'confirmed',customer_note:'PRIVATE_STAFF_COMMENT',areas:{slug:'peluqueria'},customers:{first_name:'Prueba',last_name:'Ficticia',phone_e164:'PRIVATE_PHONE',email:'PRIVATE_EMAIL'},booking_items:[{role:'main',snapshot_name:'Corte',sort_order:0,personalization:{alergias:'PRIVATE_ALLERGY'}}]};
function assertProjection(data:unknown){
 const text=JSON.stringify(data);expect(text).not.toContain('PRIVATE_');
 expect((data as {customerNote:unknown}).customerNote).toBeNull();
}
function assertColumns(columns:string){for(const key of ['customer_note','phone','email','personalization'])expect(columns).not.toContain(key);}
describe('public booking token never exposes discussion with staff',()=>{
 it('repository neither requests private fields nor trusts overfull transport rows',async()=>{
  const query={select:(columns:string)=>{assertColumns(columns);return query;},eq:()=>query,maybeSingle:async()=>({data:row,error:null})};
  assertProjection(await getBookingByToken({from:()=>query} as unknown as SupabaseAdminClient,token));
 });
 it('real public router redacts normal and empty-query variants without depending on raw path matching',async()=>{
  const env={SUPABASE_URL:'https://fixture.invalid',SUPABASE_PUBLISHABLE_KEY:'fake-public',SUPABASE_SECRET_KEY:'fake-secret'} as ServerEnv;
  let calls=0;
  bindSupabaseTransport(env,(async(input:Request|URL|string)=>{
   const url=new URL(input instanceof Request?input.url:String(input));
   expect(url.origin).toBe(env.SUPABASE_URL);expect(url.pathname).toBe('/rest/v1/bookings');
   assertColumns(url.searchParams.get('select')??'');calls++;return Response.json(row);
  }) as typeof fetch);
  const app=createBookingsRoute(env);
  for(const suffix of ['', '?', '?&', '?&&']) {
   const res=await app.request('/'+token+suffix);expect(res.status).toBe(200);expect(res.headers.get('cache-control')).toBe('no-store');
   assertProjection((await res.json() as {data:unknown}).data);
  }
  expect(calls).toBe(4);
 });
});
