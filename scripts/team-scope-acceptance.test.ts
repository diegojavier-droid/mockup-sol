/** Offline guard/contract tests only. Never invokes runTeamScopeAcceptance or a DB. */
import {expect,it} from 'bun:test';
import {readFileSync} from 'node:fs';
import {Hono} from 'hono';
import {HTTPException} from 'hono/http-exception';
import {localAcceptanceErrorHandler} from './acceptance-team-scope-local';
import {acceptanceConfig,assertOperational,cleanupSql,localAuthOrigin,localDatabase} from './team-scope-acceptance-helpers';
const valid={LOCAL_TEAM_SCOPE_ACCEPTANCE:'ephemeral-clean-room',SUPABASE_LOCAL_API_URL:'http://127.0.0.1:54321',PGHOST:'127.0.0.1',PGPORT:'54322',PGDATABASE:'postgres',PGUSER:'postgres',PGPASSWORD:'local',SUPABASE_LOCAL_ANON_KEY:'fixture',SUPABASE_LOCAL_SERVICE_ROLE_KEY:'fixture'};
it('explicit opt-in, loopback API and DB with no remote fallback',()=>{
 expect(acceptanceConfig(valid).origin).toBe(valid.SUPABASE_LOCAL_API_URL);
 for(const patch of [{LOCAL_TEAM_SCOPE_ACCEPTANCE:undefined},{SUPABASE_LOCAL_API_URL:undefined},{PGHOST:undefined},{PGPASSWORD:undefined},{PGPORT:undefined},{PGDATABASE:undefined},{PGUSER:undefined},{SUPABASE_LOCAL_ANON_KEY:''},{SUPABASE_LOCAL_SERVICE_ROLE_KEY:''}])expect(()=>acceptanceConfig({...valid,...patch})).toThrow();
 for(const url of ['https://example.supabase.co','http://127.1:54321','http://2130706433:54321','http://localhost:54321?','http://localhost:54321#','http://localhost:54321/x/..','http://user@localhost:54321','http://localhost.evil:54321'])expect(()=>localAuthOrigin(url)).toThrow();
 for(const url of ['postgresql://postgres:x@db.example.supabase.co:5432/postgres','postgresql://postgres:x@127.1:54322/postgres','postgresql://postgres:x@localhost:54322/postgres?host=remote','postgresql://postgres:x@localhost:54322/postgres#','postgresql://postgres:x@localhost:54322/other','postgresql://postgres:x@localhost/postgres'])expect(()=>localDatabase(url)).toThrow();
});
it('operational acceptance rejects money, bearer token, contact and financial status',()=>{
 const base={view:'operational',status:'scheduled',customer:{firstName:'Ficticia',lastName:null}};
 expect(()=>assertOperational(base)).not.toThrow();
 for(const field of ['depositAmount','priceEstimatedMin','publicToken','payments'])expect(()=>assertOperational({...base,[field]:0})).toThrow();
 expect(()=>assertOperational({...base,customer:{...base.customer,id:'id'}})).toThrow();expect(()=>assertOperational({...base,status:'pending_payment'})).toThrow();
});
it('cleanup is transactionally limited to owned UUIDs/markers and never changes grants',()=>{
 const suffix='1234567890abcdef',id='11111111-1111-4111-8111-111111111111';
 const input={suffix,customerId:id,staffIds:[id],bookingIds:[id],roles:['ci-team-a-'+suffix]};
 const sql=cleanupSql(input);expect(sql).toContain('BEGIN;');expect(sql).toContain('COMMIT;');expect(sql).toContain('LOCAL_FIXTURE_CLEANUP_FAILED');
 expect(sql).not.toMatch(/grant|truncate|auth\.users|payments|business_settings/i);
 for(const line of sql.split('\n').filter(l=>l.trim().startsWith('DELETE')))expect(line).toContain('WHERE');
 expect(()=>cleanupSql({...input,roles:['owner']})).toThrow();expect(()=>cleanupSql({...input,bookingIds:["x');drop table bookings;--"]})).toThrow();
});
it('prepared acceptance retains real SDK/HTTP checks without executing them in this test',()=>{
 const code=readFileSync('scripts/acceptance-team-scope-local.ts','utf8');
 for(const label of ['FOREIGN_DETAIL_EXPOSED','SUMMARY_SCOPE_LEAK','DIRECT_RPC_EXPOSED','DIRECT_TABLE_EXPOSED','DOWNGRADED_WRITE_ACCEPTED','DEACTIVATION_NOT_APPLIED','SCOPE_FINGERPRINT_UNCHANGED','IDEMPOTENT_AUDIT_COUNT_WRONG','PAYMENTS_CHANGED','POLICY_CHANGED','LOCAL_TEAM_FIXTURE_CLEANUP_FAILED','SCOPED_SCHEMA_RELOAD_TIMEOUT'])expect(code).toContain(label);
 expect(code).toContain("redirect:'error'");expect(code).toContain("PGSSLMODE:'disable'");expect(code).not.toMatch(/import.*dotenv|from.*dotenv/);
 const legacy=readFileSync('scripts/acceptance-staff-password-local.ts','utf8');expect(legacy).toContain("status === 403, 'ASSIGNED_GLOBAL_WRITE_NOT_DENIED'");expect(legacy).toContain('DOWNGRADE_NOT_VISIBLE');
});

it('local Hono acceptance preserves expected status without exposing error details',async()=>{
 const app=new Hono().onError(localAcceptanceErrorHandler);
 for(const status of [401,403,404,409] as const) app.get('/'+status,()=>{throw new HTTPException(status,{message:'PRIVATE_SDK_OR_CONTEXT'});});
 app.get('/500',()=>{throw Error('PRIVATE_TOKEN_OR_PROVIDER_BODY');});
 for(const status of [401,403,404,409,500]){
  const response=await app.request('/'+status);
  expect(response.status).toBe(status);expect(response.headers.get('cache-control')).toBe('no-store');
  expect(await response.json()).toEqual({error:{message:'LOCAL_API_REQUEST_FAILED'}});
 }
});
