-- ISOLATED SITE ONLY: ijzpmwwjuvsgcsbcbzav / Sol Mai - Pruebas Site.
-- Preserve canonical consent, idempotency, roles and payment rules.
-- This only restores an optional web comment for the fictional test customer.
-- Apply only after explicit approval through the native migration operation.
do $$
begin
  if to_regclass('public.site_operating_creates') is null or
     to_regclass('public.site_operating_nonces') is null then
    raise exception 'isolated_site_setup_required';
  end if;
  if exists(select 1 from public.customers where first_name is distinct from 'Clienta de prueba' or
    last_name is distinct from 'Site' or phone_e164 is distinct from '+5493425550101' or
    email is distinct from 'clienta@example.invalid') then
    raise exception 'nonfixture_data_present';
  end if;
end;
$$;

create or replace function public.site_operating_create(p_operation_id uuid,p_request_hash text,p_kind text,p_args jsonb)
returns jsonb language plpgsql security invoker set search_path = public, pg_temp as $$
declare prior public.site_operating_creates; b jsonb; api jsonb; owner_id uuid; customer jsonb;
begin
  if p_operation_id is null or p_request_hash is null or p_request_hash !~ '^[a-f0-9]{64}$' or p_kind is null or p_kind not in ('create_booking','create_online_booking') or jsonb_typeof(p_args) is distinct from 'object' then
    raise exception 'invalid_test_operation' using errcode='PT400';
  end if;
  perform pg_advisory_xact_lock(842613,1206);
  select * into prior from public.site_operating_creates where operation_id=p_operation_id;
  if found then
    if prior.request_hash<>p_request_hash then raise exception 'idempotency_mismatch' using errcode='PT409'; end if;
    return prior.result;
  end if;
  if (select count(*) from public.site_operating_creates)>=1000 then raise exception 'test_limit_reached' using errcode='PT429'; end if;
  customer:=p_args->'p_customer';
  if jsonb_typeof(customer) is distinct from 'object' or
     customer->>'first_name' is distinct from 'Clienta de prueba' or
     customer->>'last_name' is distinct from 'Site' or
     customer->>'phone_e164' is distinct from '+5493425550101' or
     customer->>'email' is distinct from 'clienta@example.invalid' or
     coalesce(customer->>'accepts_marketing','false')<>'false' or
     customer - array['first_name','last_name','phone_e164','email','accepts_marketing'] <> '{}'::jsonb then
    raise exception 'test_fixture_required' using errcode='PT400';
  end if;
  -- Comments are a separate, bounded potentially sensitive channel. Only the
  -- consented web path may write them; no notes are smuggled through metadata.
  if (p_args ? 'p_customer_note' and jsonb_typeof(p_args->'p_customer_note') not in ('string','null')) or
     char_length(coalesce(p_args->>'p_customer_note',''))>500 or
     (p_kind<>'create_online_booking' and coalesce(p_args->>'p_customer_note','')<>'') then
    raise exception 'invalid_test_comment' using errcode='PT400';
  end if;
  if p_kind='create_online_booking' then
    b:=public.create_online_booking(
      p_area_slug=>p_args->>'p_area_slug',p_starts_at=>(p_args->>'p_starts_at')::timestamptz,p_ends_at=>(p_args->>'p_ends_at')::timestamptz,
      p_shown_duration_min=>(p_args->>'p_shown_duration_min')::integer,p_price_display_mode=>p_args->>'p_price_display_mode',
      p_price_estimated_min=>(p_args->>'p_price_estimated_min')::integer,p_price_estimated_max=>(p_args->>'p_price_estimated_max')::integer,
      p_deposit_rate=>(p_args->>'p_deposit_rate')::numeric,p_deposit_amount=>(p_args->>'p_deposit_amount')::integer,
      p_customer=>customer,p_items=>p_args->'p_items',p_terms_version=>p_args->>'p_terms_version',p_customer_note=>nullif(p_args->>'p_customer_note',''));
    api:=jsonb_build_object('data',jsonb_build_object(
      'publicToken',b->'public_token','status',b->'status','startsAt',b->'starts_at','paymentRequiredUntil',b->'payment_required_until',
      'depositAmount',b->'deposit_amount','depositRatePct',p_args->'p_deposit_rate','estimatedAmount',p_args->'p_price_estimated_min',
      'remainingAmount',(p_args->>'p_price_estimated_min')::integer-(p_args->>'p_deposit_amount')::integer,
      'priceDisplayMode',p_args->'p_price_display_mode','isEstimate',p_args->>'p_price_display_mode'<>'fixed','durationShownMin',p_args->'p_shown_duration_min'));
  else
    select staff_id into owner_id from public.resolve_staff_session('site-owner@example.invalid') where role='owner';
    if owner_id is null or p_args->>'p_created_by' is distinct from owner_id::text or
       p_args->>'p_actor_label' is distinct from 'site-owner@example.invalid' or
       p_args->>'p_source' is null or p_args->>'p_source' not in ('manual','phone','whatsapp','walk_in') or
       coalesce(p_args->>'p_override_reason','') not in ('','Prueba de sobreturno') then
      raise exception 'test_owner_required' using errcode='PT403';
    end if;
    b:=public.create_booking(
      p_area_slug=>p_args->>'p_area_slug',p_starts_at=>(p_args->>'p_starts_at')::timestamptz,p_ends_at=>(p_args->>'p_ends_at')::timestamptz,
      p_shown_duration_min=>(p_args->>'p_shown_duration_min')::integer,p_price_display_mode=>p_args->>'p_price_display_mode',
      p_price_estimated_min=>(p_args->>'p_price_estimated_min')::integer,p_price_estimated_max=>(p_args->>'p_price_estimated_max')::integer,
      p_deposit_rate=>0,p_deposit_amount=>0,p_customer=>customer,p_items=>p_args->'p_items',p_customer_note=>null,
      p_source=>p_args->>'p_source',p_created_by=>owner_id,p_actor_label=>'site-owner@example.invalid',
      p_override=>coalesce((p_args->>'p_override')::boolean,false),p_override_reason=>p_args->>'p_override_reason');
    api:=jsonb_build_object('data',b);
  end if;
  insert into public.site_operating_creates(operation_id,request_hash,booking_id,result,api_response)
    values(p_operation_id,p_request_hash,(b->>'id')::uuid,b,api);
  return b;
end;
$$;
revoke all on function public.site_operating_create(uuid,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.site_operating_create(uuid,text,text,jsonb) to service_role;
