import {describe,expect,it} from 'bun:test';
import {readFileSync} from 'node:fs';
const sql=readFileSync('supabase/site-migrations/drafts/team-scope-attention.sql','utf8');
describe('prepared attention SQL source guards (not PostgreSQL execution)',()=>{
 it('is isolated, explicit and preserves the 24-hour rule',()=>{
  expect(sql).toContain("is distinct from 'ijzpmwwjuvsgcsbcbzav'");
  expect(sql).toContain("current_setting('sol_mai.apply_team_scope', true) is distinct from 'yes'");
  expect(sql).toContain('exists(select 1 from auth.users)');
  expect(sql).toContain('exists(select 1 from public.payments)');
  expect(sql).toContain("is distinct from '24'::jsonb");
  expect(sql).not.toMatch(/(?:update|insert into|delete from) public\.(?:payments|business_settings|bookings|service_execution_records)\b/);
 });
 it('keeps legacy session RPC and new operations private',()=>{
  expect(sql).not.toMatch(/(?:drop|create(?: or replace)?) function public\.resolve_staff_session\(/);
  expect(sql).toContain('create function public.resolve_staff_session_scoped(p_email text)');
  expect(sql).toContain('alter table public.booking_attention enable row level security');
  expect(sql).toContain('revoke all on public.booking_attention from public, anon, authenticated');
  expect(sql).toContain('revoke all on function public.record_booking_attention(uuid,text,uuid) from public,anon,authenticated');
  expect(sql).not.toContain('security definer');
  expect(sql).not.toMatch(/grant .* to (?:public|anon|authenticated)/);
 });
 it('locks actor, scope, capability and booking before transition',()=>{
  expect(sql.match(/for share;/g)).toHaveLength(3);
  expect(sql).toContain('where id=p_booking_id for update');
  expect(sql).toContain('booking.staff_id is distinct from actor.id');
  expect(sql).toContain("permission_level is distinct from 'full'");
  expect(sql).toContain('not actor.is_active or actor.deleted_at is not null');
  expect(sql.indexOf('for update')).toBeLessThan(sql.indexOf("if p_action='start'"));
  expect(sql).toContain("raise exception 'attention_not_started'");
  expect(sql).toContain('if attention.finished_at is null then');
  expect(sql).toContain('at_time:=clock_timestamp()');
  expect(sql).not.toMatch(/p_(?:started_at|finished_at|actor_label|scope|price|cost|payment)/);
 });
});
