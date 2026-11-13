-- ISOLATED SITE ONLY. No customers, payments, consent, staff or original bookings.
-- Requires the catalog migrations and btree_gist already installed in this project.
create table public.site_test_bookings (
  id uuid primary key default gen_random_uuid(),
  actor_hash text not null check (actor_hash ~ '^[a-f0-9]{64}$'),
  service_id uuid not null references public.services(id),
  category_id uuid not null references public.categories(id),
  service_slug text not null, service_name text not null,
  category_slug text not null, category_name text not null,
  starts_at timestamptz not null, ends_at timestamptz not null,
  blocking_min integer not null check (blocking_min between 1 and 720),
  duration_shown_min integer not null check (duration_shown_min between 1 and 720 and duration_shown_min <= blocking_min),
  total_amount integer not null check (total_amount between 0 and 10000000),
  deposit_amount integer not null check (deposit_amount between 0 and total_amount),
  deposit_rate_pct numeric not null check (deposit_rate_pct between 0 and 100),
  price_display_mode text not null check (price_display_mode in ('fixed','from','subject_to_confirmation')),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object' and octet_length(snapshot::text) <= 8192),
  status text not null default 'test_reserved' check (status in ('test_reserved','test_cancelled')),
  created_at timestamptz not null default now(), cancelled_at timestamptz,
  check (ends_at = starts_at + blocking_min * interval '1 minute'),
  check ((status = 'test_reserved' and cancelled_at is null) or (status = 'test_cancelled' and cancelled_at is not null)),
  exclude using gist (category_id with =, tstzrange(starts_at, ends_at, '[)') with &&) where (status = 'test_reserved')
);
create index site_test_bookings_actor_created on public.site_test_bookings(actor_hash, created_at desc);
alter table public.site_test_bookings enable row level security;
revoke all on public.site_test_bookings from public, anon, authenticated, service_role;
grant select, insert, update on public.site_test_bookings to service_role;

-- Replay results are committed in the same transaction as the reservation.
-- No deletion/expiry: an old idempotency key can never create a second booking.
create table public.site_test_operations (
  actor_hash text not null check (actor_hash ~ '^[a-f0-9]{64}$'),
  idempotency_key uuid not null,
  payload_hash text not null check (payload_hash ~ '^[a-f0-9]{64}$'),
  result jsonb not null,
  created_at timestamptz not null default now(),
  primary key (actor_hash, idempotency_key)
);
alter table public.site_test_operations enable row level security;
revoke all on public.site_test_operations from public, anon, authenticated, service_role;
grant select, insert on public.site_test_operations to service_role;

create function public.site_test_booking_dto(b public.site_test_bookings)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object('id', b.id, 'serviceSlug', b.service_slug, 'serviceName', b.service_name,
    'categorySlug', b.category_slug, 'categoryName', b.category_name, 'startsAt', b.starts_at,
    'endsAt', b.ends_at, 'status', b.status, 'blockingMin', b.blocking_min,
    'durationShownMin', b.duration_shown_min, 'totalAmount', b.total_amount,
    'depositAmount', b.deposit_amount, 'depositRatePct', b.deposit_rate_pct,
    'priceDisplayMode', b.price_display_mode, 'snapshot', b.snapshot,
    'createdAt', b.created_at, 'cancelledAt', b.cancelled_at);
$$;
revoke all on function public.site_test_booking_dto(public.site_test_bookings) from public, anon, authenticated;
grant execute on function public.site_test_booking_dto(public.site_test_bookings) to service_role;

create function public.site_test_command(p_actor_hash text, p_payload_hash text, p_command jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_action text := p_command->>'action'; v_key uuid; v_previous public.site_test_operations;
  v_booking public.site_test_bookings; v_service public.services; v_category public.categories;
  v_start timestamptz; v_block integer; v_result jsonb; v_snapshot jsonb;
  v_pair record; v_code text; v_now timestamptz := clock_timestamp();
begin
  if p_actor_hash is null or p_actor_hash !~ '^[a-f0-9]{64}$'
    or p_payload_hash is null or p_payload_hash !~ '^[a-f0-9]{64}$'
    or p_command is null or jsonb_typeof(p_command) <> 'object' or octet_length(p_command::text) > 8192
    or v_action is null or v_action not in ('create','list','cancel') then
    raise sqlstate 'PT400' using message = 'Invalid test command';
  end if;
  if v_action = 'list' then
    if p_command <> '{"action":"list"}'::jsonb then raise sqlstate 'PT400' using message = 'Invalid list'; end if;
    return jsonb_build_object(
      'bookings', coalesce((select jsonb_agg(public.site_test_booking_dto(b) order by b.created_at desc) from public.site_test_bookings b where b.actor_hash = p_actor_hash), '[]'::jsonb),
      'occupancy', coalesce((select jsonb_agg(jsonb_build_object('categorySlug', b.category_slug, 'startsAt', b.starts_at, 'endsAt', b.ends_at) order by b.starts_at)
        from public.site_test_bookings b where b.status = 'test_reserved' and b.ends_at > v_now and b.starts_at <= v_now + interval '31 days'), '[]'::jsonb));
  end if;
  begin v_key := (p_command->>'idempotencyKey')::uuid;
  exception when invalid_text_representation then raise sqlstate 'PT400' using message = 'Invalid idempotency key'; end;
  if v_key is null or jsonb_typeof(p_command->'idempotencyKey') <> 'string' then raise sqlstate 'PT400' using message = 'Missing idempotency key'; end if;
  -- Serialize one actor, protecting its quota and idempotency across isolates.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('site-test:' || p_actor_hash, 0));
  select * into v_previous from public.site_test_operations where actor_hash = p_actor_hash and idempotency_key = v_key;
  if found then
    if v_previous.payload_hash <> p_payload_hash then raise sqlstate 'PT409' using message = 'Idempotency conflict'; end if;
    return v_previous.result || '{"replayed":true}'::jsonb;
  end if;
  -- Includes cancelled records; no destructive reset or unlimited operation log.
  if (select count(*) from public.site_test_operations where actor_hash = p_actor_hash) >= 3000 then
    raise sqlstate 'PT429' using message = 'Test operation limit';
  end if;
  if v_action = 'cancel' then
    if not (p_command ?& array['action','idempotencyKey','bookingId']) or jsonb_typeof(p_command->'bookingId') <> 'string' or exists(select 1 from jsonb_object_keys(p_command) k where k not in ('action','idempotencyKey','bookingId')) then raise sqlstate 'PT400' using message = 'Invalid cancel'; end if;
    select * into v_booking from public.site_test_bookings where id = (p_command->>'bookingId')::uuid and actor_hash = p_actor_hash for update;
    if not found then raise sqlstate 'PT404' using message = 'Test booking not found'; end if;
    update public.site_test_bookings set status = 'test_cancelled', cancelled_at = coalesce(cancelled_at, v_now) where id = v_booking.id returning * into v_booking;
  else
    if exists(select 1 from jsonb_object_keys(p_command) k where k not in ('action','idempotencyKey','serviceSlug','startsAt','blockingMin','durationShownMin','totalAmount','depositAmount','depositRatePct','priceDisplayMode','snapshot')) then
      raise sqlstate 'PT400' using message = 'Invalid create';
    end if;
    if not (p_command ?& array['action','idempotencyKey','serviceSlug','startsAt','blockingMin','durationShownMin','totalAmount','depositAmount','depositRatePct','priceDisplayMode','snapshot'])
      or jsonb_typeof(p_command->'serviceSlug') <> 'string' or jsonb_typeof(p_command->'startsAt') <> 'string'
      or jsonb_typeof(p_command->'priceDisplayMode') <> 'string'
      or exists(select 1 from unnest(array['blockingMin','durationShownMin','totalAmount','depositAmount','depositRatePct']) k where jsonb_typeof(p_command->k) <> 'number') then
      raise sqlstate 'PT400' using message = 'Missing or invalid typed fields';
    end if;
    if (select count(*) from public.site_test_bookings where actor_hash = p_actor_hash) >= 1000 then raise sqlstate 'PT429' using message = 'Test booking limit'; end if;
    v_start := (p_command->>'startsAt')::timestamptz; v_block := (p_command->>'blockingMin')::integer;
    if v_start is null or v_start < v_now + interval '120 minutes' or v_start > v_now + interval '31 days' or v_block is null or v_block not between 1 and 720 then
      raise sqlstate 'PT400' using message = 'Invalid test interval';
    end if;
    select * into v_service from public.services where slug = p_command->>'serviceSlug' and is_public and is_active and deleted_at is null;
    if not found then raise sqlstate 'PT400' using message = 'Unknown service'; end if;
    select * into v_category from public.categories where id = v_service.category_id and is_public and is_active and deleted_at is null;
    if not found then raise sqlstate 'PT400' using message = 'Unknown category'; end if;
    v_snapshot := p_command->'snapshot';
    if v_snapshot is null or jsonb_typeof(v_snapshot) <> 'object' then raise sqlstate 'PT400' using message = 'Invalid snapshot object'; end if;
    if exists(select 1 from jsonb_object_keys(v_snapshot) k where k not in ('lengthTier','extraCodes','personalization'))
      or not (v_snapshot ?& array['lengthTier','extraCodes','personalization'])
      or (v_snapshot->'lengthTier' <> 'null'::jsonb and (jsonb_typeof(v_snapshot->'lengthTier') <> 'string' or v_snapshot->>'lengthTier' not in ('corto','medio','largo','xl','unico')))
      or jsonb_typeof(v_snapshot->'extraCodes') <> 'array' or jsonb_typeof(v_snapshot->'personalization') <> 'object' then
      raise sqlstate 'PT400' using message = 'Invalid snapshot';
    end if;
    if exists(select 1 from jsonb_array_elements(v_snapshot->'extraCodes') v where jsonb_typeof(v) <> 'string')
      or exists(select 1 from jsonb_each(v_snapshot->'personalization') v where jsonb_typeof(v.value) <> 'string') then
      raise sqlstate 'PT400' using message = 'Non-string snapshot option';
    end if;
    if jsonb_array_length(v_snapshot->'extraCodes') > 10 or (select count(*) from jsonb_object_keys(v_snapshot->'personalization')) > 12 then
      raise sqlstate 'PT400' using message = 'Snapshot too large';
    end if;
    if (select count(*) from jsonb_array_elements_text(v_snapshot->'extraCodes')) <> (select count(distinct value) from jsonb_array_elements_text(v_snapshot->'extraCodes')) then
      raise sqlstate 'PT400' using message = 'Repeated extra';
    end if;
    for v_code in select value from jsonb_array_elements_text(v_snapshot->'extraCodes') loop
      if not exists(select 1 from public.extras e where e.category_id = v_category.id and e.code = v_code and e.is_public and e.is_active and e.deleted_at is null) then
        raise sqlstate 'PT400' using message = 'Unknown extra';
      end if;
    end loop;
    for v_pair in select * from jsonb_each_text(v_snapshot->'personalization') loop
      if v_pair.key ilike '%alerg%' or not exists(
        select 1 from public.personalization_fields f join public.personalization_options o on o.field_id = f.id
          join public.service_personalization_rules r on r.field_id = f.id and r.service_id = v_service.id
        where f.category_id = v_category.id and f.slug = v_pair.key and f.field_role = 'modifier'
          and f.field_type <> 'text' and f.is_active and f.is_public and f.deleted_at is null
          and r.decision = 'operational' and o.slug = v_pair.value and o.is_active
      ) then raise sqlstate 'PT400' using message = 'Non-operational option'; end if;
    end loop;
    insert into public.site_test_bookings(actor_hash, service_id, category_id, service_slug, service_name, category_slug, category_name,
      starts_at, ends_at, blocking_min, duration_shown_min, total_amount, deposit_amount, deposit_rate_pct, price_display_mode, snapshot)
    values (p_actor_hash, v_service.id, v_category.id, v_service.slug, v_service.name, v_category.slug, v_category.name,
      v_start, v_start + v_block * interval '1 minute', v_block, (p_command->>'durationShownMin')::integer,
      (p_command->>'totalAmount')::integer, (p_command->>'depositAmount')::integer, (p_command->>'depositRatePct')::numeric,
      p_command->>'priceDisplayMode', v_snapshot) returning * into v_booking;
  end if;
  v_result := jsonb_build_object('booking', public.site_test_booking_dto(v_booking), 'replayed', false);
  insert into public.site_test_operations(actor_hash, idempotency_key, payload_hash, result) values(p_actor_hash, v_key, p_payload_hash, v_result);
  return v_result;
exception
  when exclusion_violation then raise sqlstate 'PT409' using message = 'Test slot already occupied';
  when check_violation or not_null_violation or invalid_text_representation or invalid_datetime_format or datetime_field_overflow or numeric_value_out_of_range or invalid_parameter_value then
    raise sqlstate 'PT400' using message = 'Invalid test data';
end;
$$;
revoke all on function public.site_test_command(text,text,jsonb) from public, anon, authenticated;
grant execute on function public.site_test_command(text,text,jsonb) to service_role;
