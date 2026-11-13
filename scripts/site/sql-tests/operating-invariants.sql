-- Run only on the explicitly authorized isolated Site database after migration.
-- Pure transactional fixtures. All rows are rolled back; no schema changes.
begin;
set local role anon;
do $$
begin
  begin perform count(*) from public.site_operating_nonces; raise exception 'anon read nonce ledger'; exception when insufficient_privilege then null; end;
  begin perform count(*) from public.site_operating_creates; raise exception 'anon read create ledger'; exception when insufficient_privilege then null; end;
  begin perform public.site_operating_consume_nonce(gen_random_uuid(),now()+interval '60 seconds'); raise exception 'anon consumed nonce'; exception when insufficient_privilege then null; end;
  begin perform public.site_operating_create(gen_random_uuid(),repeat('a',64),'create_online_booking','{}'); raise exception 'anon created booking'; exception when insufficient_privilege then null; end;
end;
$$;
set local role authenticated;
do $$
begin
  begin perform count(*) from public.site_operating_nonces; raise exception 'authenticated read nonce ledger'; exception when insufficient_privilege then null; end;
  begin perform count(*) from public.site_operating_creates; raise exception 'authenticated read create ledger'; exception when insufficient_privilege then null; end;
  begin perform public.site_operating_consume_nonce(gen_random_uuid(),now()+interval '60 seconds'); raise exception 'authenticated consumed nonce'; exception when insufficient_privilege then null; end;
  begin perform public.site_operating_create(gen_random_uuid(),repeat('a',64),'create_online_booking','{}'); raise exception 'authenticated created booking'; exception when insufficient_privilege then null; end;
end;
$$;
set local role service_role;
do $$
declare
  nonce uuid:=gen_random_uuid(); op uuid:=gen_random_uuid(); failop uuid:=gen_random_uuid();
  args jsonb; result jsonb; again jsonb; initial bigint[]; later bigint[]; owner_id uuid;
begin
  if public.site_operating_consume_nonce(nonce,now()+interval '60 seconds') is distinct from true then raise exception 'fresh nonce rejected'; end if;
  if public.site_operating_consume_nonce(nonce,now()+interval '60 seconds') is distinct from false then raise exception 'replayed nonce accepted'; end if;
  if public.site_operating_consume_nonce(gen_random_uuid(),now()-interval '1 second') is distinct from false then raise exception 'expired nonce accepted'; end if;
  if public.site_operating_consume_nonce(gen_random_uuid(),now()+interval '66 seconds') is distinct from false then raise exception 'long-lived nonce accepted'; end if;
  select array[(select count(*) from public.bookings),(select count(*) from public.customers),(select count(*) from public.booking_items),(select count(*) from public.customer_consents),(select count(*) from public.site_operating_creates)] into initial;
  args:=jsonb_build_object('p_area_slug','peluqueria','p_starts_at','2099-11-11T12:00:00Z','p_ends_at','2099-11-11T12:30:00Z','p_shown_duration_min',30,
    'p_price_display_mode','fixed','p_price_estimated_min',1000,'p_price_estimated_max',null,'p_deposit_rate',20,'p_deposit_amount',200,
    'p_customer',jsonb_build_object('first_name','Clienta de prueba','last_name','Site','phone_e164','+5493425550101','email','clienta@example.invalid','accepts_marketing',false),
    'p_items',jsonb_build_array(jsonb_build_object('service_slug','corte-fem','role','main','name','Servicio de prueba','price_amount',1000,'length_tier','medio','duration_min',30,'process_min',0,'setup_min',0)),
    'p_terms_version','site-test-invariants','p_customer_note',null);
  begin perform public.site_operating_create(failop,repeat('b',64),null,args); raise exception 'null kind accepted'; exception when sqlstate 'PT400' then null; end;
  begin perform public.site_operating_create(failop,repeat('b',64),'create_online_booking','[]'); raise exception 'nonobject args accepted'; exception when sqlstate 'PT400' then null; end;
  begin perform public.site_operating_create(failop,repeat('b',64),'create_online_booking',jsonb_set(args,'{p_customer,email}','"not-an-email"')); raise exception 'invalid contact accepted'; exception when sqlstate 'PT400' then null; end;
  begin
    perform public.site_operating_create(failop,repeat('b',64),'create_online_booking',jsonb_set(args,'{p_items,0,service_slug}','"nonexistent-fixture-service"'));
    raise exception 'invalid service accepted';
  exception when raise_exception then if sqlerrm <> 'unknown_service' then raise; end if; end;
  select array[(select count(*) from public.bookings),(select count(*) from public.customers),(select count(*) from public.booking_items),(select count(*) from public.customer_consents),(select count(*) from public.site_operating_creates)] into later;
  if later<>initial then raise exception 'failed request left orphan rows'; end if;
  result:=public.site_operating_create(op,repeat('a',64),'create_online_booking',args);
  again:=public.site_operating_create(op,repeat('a',64),'create_online_booking',args);
  if result<>again or result->>'status'<>'pending_payment' or result->>'source'<>'online' then raise exception 'create or replay changed canonical rules'; end if;
  if (select count(*) from public.site_operating_creates where operation_id=op)<>1 then raise exception 'duplicate create ledger'; end if;
  if not exists(select 1 from public.bookings where id=(result->>'id')::uuid and payment_required_until=created_at+interval '10 minutes') then raise exception 'hold is not ten minutes'; end if;
  if (select count(*) from public.customer_consents where booking_id=(result->>'id')::uuid and version='site-test-invariants')<>1 then raise exception 'consent not atomic'; end if;
  begin perform public.site_operating_create(op,repeat('b',64),'create_online_booking',args); raise exception 'different body replay accepted'; exception when sqlstate 'PT409' then null; end;
  -- Internal channel uses the same agenda but must not invent online consent.
  select staff_id into owner_id from public.resolve_staff_session('site-owner@example.invalid') where role='owner';
  args:=args||jsonb_build_object('p_starts_at','2099-11-11T13:00:00Z','p_ends_at','2099-11-11T13:30:00Z','p_source','manual','p_created_by',owner_id,'p_actor_label','site-owner@example.invalid','p_override',false);
  result:=public.site_operating_create(gen_random_uuid(),repeat('c',64),'create_booking',args);
  if result->>'status'<>'confirmed' or result->>'source'<>'manual' or (result->>'deposit_amount')::integer<>0 then raise exception 'internal channel changed'; end if;
  if exists(select 1 from public.customer_consents where booking_id=(result->>'id')::uuid) then raise exception 'internal channel fabricated web consent'; end if;
end;
$$;
reset role;
rollback;
select 'PASS: actual role denial, nonce replay/TTL, canonical shared creates, atomic consent, idempotency and rollback; all fixtures rolled back' as result;
