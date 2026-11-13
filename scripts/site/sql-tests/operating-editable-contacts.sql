-- Isolated Site only. All synthetic rows are rolled back.
begin;
set local role anon;
do $$ begin
  begin perform count(*) from public.customers; raise exception 'anon read contacts'; exception when insufficient_privilege then null; end;
  begin perform public.site_operating_create(gen_random_uuid(),repeat('a',64),'create_online_booking','{}'); raise exception 'anon create'; exception when insufficient_privilege then null; end;
end $$;
set local role authenticated;
do $$ begin
  begin perform count(*) from public.customers; raise exception 'authenticated read contacts'; exception when insufficient_privilege then null; end;
  begin perform public.site_operating_create(gen_random_uuid(),repeat('a',64),'create_online_booking','{}'); raise exception 'authenticated create'; exception when insufficient_privilege then null; end;
end $$;
set local role service_role;
do $$
declare args jsonb; result_a jsonb; result_b jsonb; result_c jsonb; replay jsonb;
  op uuid:=gen_random_uuid(); bad jsonb; initial bigint[]; later bigint[]; owner_id uuid;
begin
  select array[(select count(*) from public.bookings),(select count(*) from public.customers),(select count(*) from public.customer_consents),(select count(*) from public.site_operating_creates)] into initial;
  args:=jsonb_build_object('p_area_slug','peluqueria','p_starts_at','2099-11-12T16:00:00Z','p_ends_at','2099-11-12T16:30:00Z','p_shown_duration_min',30,
    'p_price_display_mode','fixed','p_price_estimated_min',1000,'p_price_estimated_max',null,'p_deposit_rate',20,'p_deposit_amount',200,
    'p_customer',jsonb_build_object('first_name','Ana Ficticia','last_name','Ejemplo Álvarez','phone_e164','+5493425550201','email','ana.ficticia@example.invalid','accepts_marketing',false),
    'p_items',jsonb_build_array(jsonb_build_object('service_slug','corte-fem','role','main','name','Servicio de prueba','price_amount',1000,'length_tier','medio','duration_min',30,'process_min',0,'setup_min',0,'personalization',jsonb_build_object('alergias','si-leves'))),
    'p_terms_version','2026-11-12-site','p_customer_note','Ejemplo ficticio A: conversar antes de empezar.');
  foreach bad in array array[
    'null'::jsonb,'[]'::jsonb,'{}'::jsonb,
    (args->'p_customer')||'{"first_name":"   "}',
    (args->'p_customer')||jsonb_build_object('first_name',repeat('x',81)),
    (args->'p_customer')||'{"first_name":true}',
    (args->'p_customer')||'{"last_name":{}}',
    (args->'p_customer')||'{"phone_e164":"letters"}',
    (args->'p_customer')||'{"phone_e164":null}',
    (args->'p_customer')||'{"email":"invalid"}',
    (args->'p_customer')||'{"email":null}',
    (args->'p_customer')||'{"accepts_marketing":true}',
    (args->'p_customer')||'{"accepts_marketing":"false"}',
    (args->'p_customer')||'{"extra":"not allowed"}'
  ] loop
    begin perform public.site_operating_create(gen_random_uuid(),repeat('b',64),'create_online_booking',jsonb_set(args,'{p_customer}',bad)); raise exception 'invalid customer accepted'; exception when sqlstate 'PT400' then null; end;
  end loop;
  select array[(select count(*) from public.bookings),(select count(*) from public.customers),(select count(*) from public.customer_consents),(select count(*) from public.site_operating_creates)] into later;
  if later<>initial then raise exception 'invalid customer left rows'; end if;
  result_a:=public.site_operating_create(op,repeat('a',64),'create_online_booking',args);
  replay:=public.site_operating_create(op,repeat('a',64),'create_online_booking',args);
  if replay<>result_a then raise exception 'replay duplicated'; end if;
  if not exists(select 1 from public.bookings b join public.customers c on c.id=b.customer_id where b.id=(result_a->>'id')::uuid and c.first_name='Ana Ficticia' and c.last_name='Ejemplo Álvarez' and c.email='ana.ficticia@example.invalid' and c.phone_e164='+5493425550201' and b.customer_note='Ejemplo ficticio A: conversar antes de empezar.') then raise exception 'first contact changed'; end if;
  if not exists(select 1 from public.booking_items where booking_id=(result_a->>'id')::uuid and personalization->>'alergias'='si-leves') then raise exception 'allergy changed'; end if;
  args:=args||jsonb_build_object('p_starts_at','2099-11-12T17:00:00Z','p_ends_at','2099-11-12T17:30:00Z','p_customer',jsonb_build_object('first_name','Bruno Ficticio','last_name',null,'phone_e164','+5493425550202','email','bruno.ficticio@example.invalid'),'p_customer_note',null);
  args:=jsonb_set(args,'{p_items,0,personalization}','{}');
  result_b:=public.site_operating_create(gen_random_uuid(),repeat('c',64),'create_online_booking',args);
  if not exists(select 1 from public.bookings b join public.customers c on c.id=b.customer_id where b.id=(result_b->>'id')::uuid and c.first_name='Bruno Ficticio' and c.email='bruno.ficticio@example.invalid' and c.phone_e164='+5493425550202') then raise exception 'second contact changed'; end if;
  if exists(select 1 from public.booking_items where booking_id=(result_b->>'id')::uuid and personalization ? 'alergias') then raise exception 'missing allergy invented'; end if;
  if (select count(*) from public.customer_consents where booking_id in ((result_a->>'id')::uuid,(result_b->>'id')::uuid) and version='2026-11-12-site')<>2 then raise exception 'consent missing'; end if;
  if (select count(*) from public.site_operating_creates where booking_id in ((result_a->>'id')::uuid,(result_b->>'id')::uuid))<>2 then raise exception 'provenance missing'; end if;
  select staff_id into owner_id from public.resolve_staff_session('site-owner@example.invalid') where role='owner';
  args:=args||jsonb_build_object('p_starts_at','2099-11-12T18:00:00Z','p_ends_at','2099-11-12T18:30:00Z','p_source','manual','p_created_by',owner_id,'p_actor_label','site-owner@example.invalid','p_override',false);
  result_c:=public.site_operating_create(gen_random_uuid(),repeat('d',64),'create_booking',args);
  if result_c->>'status'<>'confirmed' or (result_c->>'deposit_amount')::integer<>0 then raise exception 'internal behavior changed'; end if;
  if exists(select 1 from public.customer_consents where booking_id=(result_c->>'id')::uuid) then raise exception 'invented internal consent'; end if;
end $$;
reset role;
rollback;
select 'PASS editable contacts: two identities preserved, optional allergy not invented, consent+ledger atomic, replay/roles/bounds fail closed; all fixtures rolled back' as result;
