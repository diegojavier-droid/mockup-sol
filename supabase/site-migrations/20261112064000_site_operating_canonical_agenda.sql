-- ISOLATED SITE ONLY. Canonical bookings remain the only agenda.
-- No production project, Auth account, payment provider or outbound message.
create table public.site_operating_nonces (
  nonce uuid primary key,
  expires_at timestamptz not null
);
alter table public.site_operating_nonces enable row level security;
revoke all on public.site_operating_nonces from public, anon, authenticated;
grant select, insert, delete on public.site_operating_nonces to service_role;

create function public.site_operating_consume_nonce(p_nonce uuid, p_expires_at timestamptz)
returns boolean language plpgsql security invoker set search_path = public, pg_temp as $$
declare n integer;
begin
  if p_nonce is null or p_expires_at is null or p_expires_at <= now() or p_expires_at > now()+interval '65 seconds' then return false; end if;
  delete from public.site_operating_nonces where expires_at < now()-interval '5 minutes';
  insert into public.site_operating_nonces(nonce,expires_at) values(p_nonce,p_expires_at) on conflict do nothing;
  get diagnostics n = row_count;
  return n=1;
end;
$$;
revoke all on function public.site_operating_consume_nonce(uuid,timestamptz) from public, anon, authenticated;
grant execute on function public.site_operating_consume_nonce(uuid,timestamptz) to service_role;

create table public.site_operating_creates (
  operation_id uuid primary key,
  request_hash text not null check(request_hash ~ '^[a-f0-9]{64}$'),
  booking_id uuid not null references public.bookings(id),
  result jsonb not null,
  api_response jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.site_operating_creates enable row level security;
revoke all on public.site_operating_creates from public, anon, authenticated;
grant select, insert on public.site_operating_creates to service_role;

-- A successful create and its retry result commit in one transaction.
-- The global Site-only lock also serializes its small fixture record cap.
create function public.site_operating_create(p_operation_id uuid,p_request_hash text,p_kind text,p_args jsonb)
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
     customer - array['first_name','last_name','phone_e164','email','accepts_marketing'] <> '{}'::jsonb or
     coalesce(p_args->>'p_customer_note','')<>'' then
    raise exception 'test_fixture_required' using errcode='PT400';
  end if;
  if p_kind='create_online_booking' then
    b:=public.create_online_booking(
      p_area_slug=>p_args->>'p_area_slug',p_starts_at=>(p_args->>'p_starts_at')::timestamptz,p_ends_at=>(p_args->>'p_ends_at')::timestamptz,
      p_shown_duration_min=>(p_args->>'p_shown_duration_min')::integer,p_price_display_mode=>p_args->>'p_price_display_mode',
      p_price_estimated_min=>(p_args->>'p_price_estimated_min')::integer,p_price_estimated_max=>(p_args->>'p_price_estimated_max')::integer,
      p_deposit_rate=>(p_args->>'p_deposit_rate')::numeric,p_deposit_amount=>(p_args->>'p_deposit_amount')::integer,
      p_customer=>customer,p_items=>p_args->'p_items',p_terms_version=>p_args->>'p_terms_version',p_customer_note=>null);
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

-- Fixture database identity only. This does not create an Auth account or invite.
select public.provision_initial_owner('site-owner@example.invalid','Propietario de prueba');
