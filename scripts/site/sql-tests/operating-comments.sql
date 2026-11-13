-- ISOLATED SITE ONLY. Run after approved consented-comments migration.
-- Transactional acceptance with entirely fictional data; rolls everything back.
begin;
set local role anon;
do $$ begin
  begin perform customer_note from public.bookings limit 1; raise exception 'anon read comments'; exception when insufficient_privilege then null; end;
  begin perform personalization from public.booking_items limit 1; raise exception 'anon read allergies'; exception when insufficient_privilege then null; end;
end $$;
set local role authenticated;
do $$ begin
  begin perform customer_note from public.bookings limit 1; raise exception 'authenticated read comments'; exception when insufficient_privilege then null; end;
  begin perform personalization from public.booking_items limit 1; raise exception 'authenticated read allergies'; exception when insufficient_privilege then null; end;
end $$;
set local role service_role;
do $$
declare
  args jsonb; result jsonb; replay jsonb; op uuid:=gen_random_uuid();
  initial bigint[]; later bigint[];
  note text := E'Ejemplo ficticio: conversar con Sol antes del servicio.\nSin información de personas reales.';
begin
  select array[(select count(*) from public.bookings),(select count(*) from public.booking_items),(select count(*) from public.customer_consents),(select count(*) from public.site_operating_creates)] into initial;
  args:=jsonb_build_object('p_area_slug','peluqueria','p_starts_at','2099-11-13T16:00:00Z','p_ends_at','2099-11-13T16:30:00Z','p_shown_duration_min',30,
    'p_price_display_mode','fixed','p_price_estimated_min',1000,'p_price_estimated_max',null,'p_deposit_rate',20,'p_deposit_amount',200,
    'p_customer',jsonb_build_object('first_name','Clienta de prueba','last_name','Site','phone_e164','+5493425550101','email','clienta@example.invalid','accepts_marketing',false),
    'p_items',jsonb_build_array(jsonb_build_object('service_slug','corte-fem','role','main','name','Servicio de prueba','price_amount',1000,'length_tier','medio','duration_min',30,'process_min',0,'setup_min',0,'personalization',jsonb_build_object('alergias','si-leves'))),
    'p_terms_version','site-test-comments','p_customer_note',note);
  begin perform public.site_operating_create(gen_random_uuid(),repeat('d',64),'create_online_booking',jsonb_set(args,'{p_customer_note}',to_jsonb(repeat('x',501)))); raise exception 'oversize note accepted'; exception when sqlstate 'PT400' then null; end;
  begin perform public.site_operating_create(gen_random_uuid(),repeat('d',64),'create_online_booking',jsonb_set(args,'{p_customer_note}','{}')); raise exception 'object note accepted'; exception when sqlstate 'PT400' then null; end;
  begin perform public.site_operating_create(gen_random_uuid(),repeat('d',64),'create_booking',args); raise exception 'internal note accepted'; exception when sqlstate 'PT400' then null; end;
  begin perform public.site_operating_create(gen_random_uuid(),repeat('d',64),'create_online_booking',jsonb_set(args,'{p_terms_version}','""')); raise exception 'missing consent accepted'; exception when sqlstate '22023' then if sqlerrm<>'booking_consent_required' then raise; end if; end;
  select array[(select count(*) from public.bookings),(select count(*) from public.booking_items),(select count(*) from public.customer_consents),(select count(*) from public.site_operating_creates)] into later;
  if later<>initial then raise exception 'rejected note left orphan rows'; end if;
  result:=public.site_operating_create(op,repeat('e',64),'create_online_booking',args);
  replay:=public.site_operating_create(op,repeat('e',64),'create_online_booking',args);
  if result<>replay then raise exception 'comment create replay differs'; end if;
  if (select customer_note from public.bookings where id=(result->>'id')::uuid) is distinct from note then raise exception 'comment was lost or changed'; end if;
  if not exists(select 1 from public.booking_items where booking_id=(result->>'id')::uuid and role='main' and personalization->>'alergias'='si-leves') then raise exception 'allergy lost'; end if;
  if (select count(*) from public.customer_consents where booking_id=(result->>'id')::uuid and version='site-test-comments')<>1 then raise exception 'consent not atomic'; end if;
  if (select count(*) from public.site_operating_creates where operation_id=op)<>1 then raise exception 'duplicate ledger'; end if;
end $$;
reset role;
rollback;
select 'PASS: comments+allergies+consent persisted atomically; roles denied; invalid/replayed creates safe; fixtures rolled back' as result;
