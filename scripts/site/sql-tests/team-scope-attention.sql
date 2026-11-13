-- Executed on local native PostgreSQL 17.12; never against hosted Supabase.
-- Only an approved isolated/local fixture after draft DDL.
-- All fixture rows and transitions below roll back. No Auth users or payments.
begin;
do $$ begin
 if current_setting('sol_mai.test_attention',true) is distinct from 'yes' then raise exception 'explicit_test_opt_in_required'; end if;
 if exists(select 1 from auth.users) then raise exception 'no_real_auth_users_allowed'; end if;
 if to_regclass('public.booking_attention') is null then raise exception 'attention_schema_missing'; end if;
end $$;
set local role anon;
do $$ begin
 begin perform count(*) from public.booking_attention; raise exception 'anon table leak'; exception when insufficient_privilege then null; end;
 begin perform * from public.resolve_staff_session_scoped('any@example.invalid'); raise exception 'anon session leak'; exception when insufficient_privilege then null; end;
 begin perform public.record_booking_attention(gen_random_uuid(),'start',gen_random_uuid()); raise exception 'anon write'; exception when insufficient_privilege then null; end;
end $$;
set local role authenticated;
do $$ begin
 begin perform count(*) from public.booking_attention; raise exception 'authenticated table leak'; exception when insufficient_privilege then null; end;
 begin perform * from public.resolve_staff_session_scoped('any@example.invalid'); raise exception 'authenticated session leak'; exception when insufficient_privilege then null; end;
 begin perform public.record_booking_attention(gen_random_uuid(),'start',gen_random_uuid()); raise exception 'authenticated write'; exception when insufficient_privilege then null; end;
end $$;
set local role service_role;
do $$
declare
 suffix text:=substr(replace(gen_random_uuid()::text,'-',''),1,12);
 role_name text; actor_a uuid; actor_b uuid; owner_id uuid; customer_id uuid; area_id uuid;
 booking_a uuid; booking_b uuid; booking_null uuid; booking_bad uuid;
 a jsonb; b jsonb; snapshot jsonb; current_snapshot jsonb; audit_count bigint; old_started timestamptz;
begin
 role_name:='qa-'||suffix;
 insert into public.roles(slug,name) values(role_name,'Ficticio '||suffix);
 if (select agenda_scope from public.roles where slug=role_name) <> 'assigned' then raise exception 'new role broadened by default'; end if;
 insert into public.role_permissions(role_slug,module,level) values(role_name,'calendario','full');
 insert into public.staff_members(slug,display_name,email,role) values('qa-a-'||suffix,'Ficticia A','a-'||suffix||'@example.invalid',role_name) returning id into actor_a;
 insert into public.staff_members(slug,display_name,email,role) values('qa-b-'||suffix,'Ficticia B','b-'||suffix||'@example.invalid',role_name) returning id into actor_b;
 select id into owner_id from public.staff_members where role='owner' and is_active and deleted_at is null limit 1;
 if owner_id is null then raise exception 'owner fixture missing'; end if;
 select id into area_id from public.areas limit 1;
 insert into public.customers(first_name,phone_e164,email) values('Ficticia SQL','+1999'||lpad((floor(random()*1000000000))::text,9,'0'),'sql-'||suffix||'@example.invalid') returning id into customer_id;
 insert into public.bookings(customer_id,area_id,starts_at,ends_at,shown_duration_min,status,source,price_display_mode,price_estimated_min,deposit_rate_applied,deposit_amount,staff_id)
 values(customer_id,area_id,now()+interval '2 days',now()+interval '2 days 30 minutes',30,'confirmed','manual','fixed',1000,0,0,actor_a) returning id into booking_a;
 insert into public.bookings(customer_id,area_id,starts_at,ends_at,shown_duration_min,status,source,price_display_mode,price_estimated_min,deposit_rate_applied,deposit_amount,staff_id)
 values(customer_id,area_id,now()+interval '3 days',now()+interval '3 days 30 minutes',30,'confirmed','manual','fixed',1000,0,0,actor_b) returning id into booking_b;
 insert into public.bookings(customer_id,area_id,starts_at,ends_at,shown_duration_min,status,source,price_display_mode,price_estimated_min,deposit_rate_applied,deposit_amount,staff_id)
 values(customer_id,area_id,now()+interval '4 days',now()+interval '4 days 30 minutes',30,'confirmed','manual','fixed',1000,0,0,null) returning id into booking_null;
 insert into public.bookings(customer_id,area_id,starts_at,ends_at,shown_duration_min,status,source,price_display_mode,price_estimated_min,deposit_rate_applied,deposit_amount,staff_id)
 values(customer_id,area_id,now()+interval '5 days',now()+interval '5 days 30 minutes',30,'cancelled','manual','fixed',1000,0,0,actor_a) returning id into booking_bad;
 select jsonb_build_object('payments',(select coalesce(jsonb_agg(to_jsonb(p) order by p.id),'[]'::jsonb) from public.payments p),
   'closures',(select coalesce(jsonb_agg(to_jsonb(e) order by e.booking_id),'[]'::jsonb) from public.service_execution_records e),
   'bookings',(select jsonb_agg(to_jsonb(x) order by x.id) from public.bookings x where x.id in (booking_a,booking_b,booking_null,booking_bad)),
   'refund_policy',(select value from public.business_settings where key='refund_window_hours')) into snapshot;
 if (select agenda_scope from public.resolve_staff_session_scoped('a-'||suffix||'@example.invalid')) <> 'assigned' then raise exception 'wrong session scope'; end if;
 if (select attention_enabled from public.resolve_staff_session_scoped('a-'||suffix||'@example.invalid')) is distinct from true then raise exception 'attention unavailable after migration'; end if;
 begin perform public.record_booking_attention(booking_b,'start',actor_a); raise exception 'foreign booking accepted'; exception when sqlstate 'PT404' then null; end;
 begin perform public.record_booking_attention(booking_null,'start',actor_a); raise exception 'null assignment accepted'; exception when sqlstate 'PT404' then null; end;
 begin perform public.record_booking_attention(gen_random_uuid(),'start',actor_a); raise exception 'missing booking accepted'; exception when sqlstate 'PT404' then null; end;
 begin perform public.record_booking_attention(booking_bad,'start',actor_a); raise exception 'cancelled booking accepted'; exception when sqlstate 'PT409' then null; end;
 begin perform public.record_booking_attention(booking_a,'finish',actor_a); raise exception 'finish without start'; exception when sqlstate 'PT409' then null; end;
 begin perform public.record_booking_attention(booking_a,'charge',actor_a); raise exception 'unsupported action'; exception when sqlstate 'PT400' then null; end;
 begin perform public.record_booking_attention(booking_a,null,actor_a); raise exception 'null action'; exception when sqlstate 'PT400' then null; end;
 begin perform public.record_booking_attention(booking_a,'start',null); raise exception 'null actor'; exception when sqlstate 'PT400' then null; end;
 a:=public.record_booking_attention(booking_a,'start',actor_a);
 b:=public.record_booking_attention(booking_a,'start',actor_a);
 if a<>b or a->>'finished_at' is not null then raise exception 'start not idempotent'; end if;
 old_started:=(a->>'started_at')::timestamptz;
 if old_started < transaction_timestamp() or old_started > clock_timestamp() then raise exception 'start not server time'; end if;
 -- Persisted change of assignment, membership, capability is checked again.
 update public.bookings set staff_id=actor_b where id=booking_a;
 begin perform public.record_booking_attention(booking_a,'finish',actor_a); raise exception 'old assignment accepted'; exception when sqlstate 'PT404' then null; end;
 update public.bookings set staff_id=actor_a where id=booking_a;
 update public.staff_members set is_active=false where id=actor_a;
 begin perform public.record_booking_attention(booking_a,'finish',actor_a); raise exception 'inactive actor accepted'; exception when sqlstate 'PT403' then null; end;
 update public.staff_members set is_active=true,deleted_at=now() where id=actor_a;
 begin perform public.record_booking_attention(booking_a,'finish',actor_a); raise exception 'deleted actor accepted'; exception when sqlstate 'PT403' then null; end;
 update public.staff_members set deleted_at=null where id=actor_a;
 update public.role_permissions set level='view' where role_slug=role_name and module='calendario';
 begin perform public.record_booking_attention(booking_a,'finish',actor_a); raise exception 'read-only actor accepted'; exception when sqlstate 'PT403' then null; end;
 update public.role_permissions set level='full' where role_slug=role_name and module='calendario';
 a:=public.record_booking_attention(booking_a,'finish',actor_a);
 b:=public.record_booking_attention(booking_a,'finish',actor_a);
 if a<>b or (a->>'started_at')::timestamptz<>old_started or a->>'finished_at' is null then raise exception 'finish not idempotent'; end if;
 b:=public.record_booking_attention(booking_a,'start',actor_a);
 if a<>b then raise exception 'late start reopened attention'; end if;
 select count(*) into audit_count from public.audit_log where entity_id=booking_a and action in ('booking_attention_started','booking_attention_finished');
 if audit_count<>2 then raise exception 'duplicate or missing audit'; end if;
 perform public.record_booking_attention(booking_null,'start',owner_id);
 perform public.record_booking_attention(booking_null,'finish',owner_id);
 -- Restore the assignment before comparing immutable booking facts.
 select jsonb_build_object('payments',(select coalesce(jsonb_agg(to_jsonb(p) order by p.id),'[]'::jsonb) from public.payments p),
   'closures',(select coalesce(jsonb_agg(to_jsonb(e) order by e.booking_id),'[]'::jsonb) from public.service_execution_records e),
   'bookings',(select jsonb_agg(to_jsonb(x) - 'updated_at' order by x.id) from public.bookings x where x.id in (booking_a,booking_b,booking_null,booking_bad)),
   'refund_policy',(select value from public.business_settings where key='refund_window_hours')) into current_snapshot;
 -- Assignment setup may touch updated_at via an existing trigger; compare all other facts.
 snapshot:=jsonb_set(snapshot,'{bookings}',(select jsonb_agg(e - 'updated_at') from jsonb_array_elements(snapshot->'bookings') e));
 if snapshot<>current_snapshot then raise exception 'attention changed booking, money, closure or policy'; end if;
 -- A financial closure recorded after a real start must not block finish.
 perform public.record_booking_attention(booking_b,'start',actor_b);
 insert into public.service_execution_records(booking_id,final_price_amount,services_done,recorded_by)
   values(booking_b,1000,'Atención ficticia SQL','owner@example.invalid');
 select to_jsonb(e) into a from public.service_execution_records e where booking_id=booking_b;
 perform public.record_booking_attention(booking_b,'finish',actor_b);
 perform public.record_booking_attention(booking_b,'finish',actor_b);
 select to_jsonb(e) into b from public.service_execution_records e where booking_id=booking_b;
 if a<>b or (select count(*) from public.payments) <> jsonb_array_length(snapshot->'payments') then raise exception 'finish changed financial closure'; end if;
 -- Conversely, no timestamps are invented for a legacy closed attention.
 update public.bookings set status='confirmed' where id=booking_bad;
 insert into public.service_execution_records(booking_id,final_price_amount,services_done,recorded_by)
   values(booking_bad,1000,'Cierre histórico ficticio','owner@example.invalid');
 begin perform public.record_booking_attention(booking_bad,'start',actor_a); raise exception 'invented legacy start'; exception when sqlstate 'PT409' then null; end;
 -- Pass valid existing FK values to independent RLS checks, transaction-local only.
 perform set_config('sol_mai.rls_booking_id',booking_bad::text,true);
 perform set_config('sol_mai.rls_actor_id',actor_a::text,true);
end $$;
-- Grant table capabilities temporarily to distinguish RLS from the grant denials
-- above. RESET ROLE returns to the disposable fixture owner, not a browser role.
reset role;
do $$ begin
 if not exists(select 1 from public.booking_attention) then raise exception 'RLS fixture missing'; end if;
 if not (select relrowsecurity from pg_class where oid='public.booking_attention'::regclass) then raise exception 'RLS disabled'; end if;
end $$;
grant select, insert on public.booking_attention to anon, authenticated;
set local role anon;
do $$
declare failure_message text;
begin
 if not row_security_active('public.booking_attention') then raise exception 'RLS not active for test role'; end if;
 if (select count(*) from public.booking_attention)<>0 then raise exception 'anon RLS read leak'; end if;
 begin
  insert into public.booking_attention(booking_id,started_at,started_by)
   values(current_setting('sol_mai.rls_booking_id')::uuid,clock_timestamp(),current_setting('sol_mai.rls_actor_id')::uuid);
  raise exception 'anon RLS insert leak';
 exception when sqlstate '42501' then
  get stacked diagnostics failure_message = message_text;
  if position('row-level security' in failure_message)=0 then
   raise exception 'Expected RLS rejection, got: %',failure_message;
  end if;
 end;
end $$;
set local role authenticated;
do $$
declare failure_message text;
begin
 if not row_security_active('public.booking_attention') then raise exception 'RLS not active for test role'; end if;
 if (select count(*) from public.booking_attention)<>0 then raise exception 'authenticated RLS read leak'; end if;
 begin
  insert into public.booking_attention(booking_id,started_at,started_by)
   values(current_setting('sol_mai.rls_booking_id')::uuid,clock_timestamp(),current_setting('sol_mai.rls_actor_id')::uuid);
  raise exception 'authenticated RLS insert leak';
 exception when sqlstate '42501' then
  get stacked diagnostics failure_message = message_text;
  if position('row-level security' in failure_message)=0 then
   raise exception 'Expected RLS rejection, got: %',failure_message;
  end if;
 end;
end $$;
reset role;
select 'attention_acceptance_pass' as test_result;
rollback;
