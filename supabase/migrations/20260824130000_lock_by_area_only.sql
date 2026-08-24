-- =====================================================================
-- Sol Mai · El lock deja de partirse por día
--
-- Pasar la clave del lock de fecha UTC a fecha del salón corrigió el
-- caso que la auditoría encontró (20:30 y 21:30 ART, que en UTC caían
-- en días distintos) pero no eliminó la clase de defecto: sólo movió la
-- costura de medianoche UTC a medianoche del salón.
--
-- Demostrado: 10 rondas de 6 transacciones simultáneas con reservas
-- 23:30→01:30 y 00:30→02:30 en un área de capacidad 1 produjeron
-- overbooking en 1 de cada 10. Se solapan, pero sus `starts_at` caen en
-- días del salón distintos, así que toman locks distintos y no se
-- serializan.
--
-- Cualquier clave que dependa de la fecha tiene una costura en algún
-- lado, porque una reserva puede empezar de un lado y terminar del
-- otro. La única clave sin costura es el ÁREA.
--
-- Costo de contención: todas las altas de un área se serializan en vez
-- de sólo las del mismo día. Con cuatro áreas, un lock que se sostiene
-- milisegundos y el volumen de un salón de barrio, es un precio que no
-- se nota. Un turno mal dado sí se nota.
-- =====================================================================

create or replace function public.create_booking(
  p_area_slug           text,
  p_starts_at           timestamptz,
  p_ends_at             timestamptz,
  p_shown_duration_min  integer,
  p_price_display_mode  text,
  p_price_estimated_min integer,
  p_price_estimated_max integer,
  p_deposit_rate        numeric,
  p_deposit_amount      integer,
  p_customer            jsonb,
  p_items               jsonb,
  p_customer_note       text default null,
  p_source              text default 'online',
  p_created_by          uuid default null,
  p_actor_label         text default null,
  p_override            boolean default false,
  p_override_reason     text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_area          public.areas%rowtype;
  v_customer_id   uuid;
  v_booking       public.bookings%rowtype;
  v_capacity      integer;
  v_delta         integer;
  v_closed        boolean;
  v_peak          integer;
  v_hold_minutes  numeric;
  v_status        text;
  v_deposit_state text;
  v_required_until timestamptz;
  v_item          jsonb;
  v_idx           integer := 0;
  v_is_public     boolean;
  v_marketing     boolean;
begin
  if p_ends_at <= p_starts_at then
    raise exception 'invalid_window';
  end if;

  v_is_public := (p_source = 'online');

  if v_is_public and p_override then
    raise exception 'override_not_allowed_online';
  end if;

  if coalesce(p_override, false) and coalesce(btrim(p_override_reason), '') = '' then
    raise exception 'override_reason_required';
  end if;

  v_marketing := (p_customer->>'accepts_marketing')::boolean;

  select * into v_area from public.areas where slug = p_area_slug and is_active;
  if not found then
    raise exception 'area_not_found';
  end if;
  if v_is_public and not v_area.is_bookable_online then
    raise exception 'area_not_bookable_online';
  end if;

  -- Lock por ÁREA, sin fecha. Dos reservas que pueden solaparse
  -- comparten el lock SIEMPRE, no sólo cuando caen el mismo día.
  perform pg_advisory_xact_lock(hashtext('sol-mai-booking:' || v_area.slug));

  select
    bool_or(capacity_delta is null),
    coalesce(sum(capacity_delta) filter (where capacity_delta is not null), 0)
  into v_closed, v_delta
  from public.schedule_exceptions e
  where e.is_active
    and (e.area_id is null or e.area_id = v_area.id)
    and tstzrange(e.starts_at, e.ends_at) && tstzrange(p_starts_at, p_ends_at);

  v_capacity := greatest(
    v_area.capacity
    - (select count(distinct rb.resource_id)
         from public.resource_blocks rb
         join public.resources r on r.id = rb.resource_id
        where r.area_id = v_area.id and r.kind = 'physical' and r.is_active
          and tstzrange(rb.starts_at, rb.ends_at) && tstzrange(p_starts_at, p_ends_at))
    + coalesce(v_delta, 0), 0);

  select coalesce(max(cnt), 0) into v_peak
  from (
    select count(*) as cnt
    from (
      select p_starts_at as t
      union
      select b.starts_at from public.bookings b
      where b.area_id = v_area.id
        and b.starts_at > p_starts_at and b.starts_at < p_ends_at
        and public.booking_blocks(b.status, b.payment_required_until)
    ) points
    join public.bookings b2
      on b2.area_id = v_area.id
     and b2.starts_at <= points.t and b2.ends_at > points.t
     and public.booking_blocks(b2.status, b2.payment_required_until)
    group by points.t
  ) peaks;

  if not p_override then
    if coalesce(v_closed, false) then
      raise exception 'area_closed';
    end if;
    if v_capacity <= 0 or v_peak + 1 > v_capacity then
      raise exception 'capacity_full';
    end if;
  end if;

  insert into public.customers (first_name, last_name, phone_e164, email, accepts_marketing)
  values (
    p_customer->>'first_name',
    p_customer->>'last_name',
    p_customer->>'phone_e164',
    nullif(p_customer->>'email', ''),
    coalesce(v_marketing, false)
  )
  on conflict (phone_e164) do update set
    first_name = case
      when not v_is_public then excluded.first_name
      else public.customers.first_name
    end,
    last_name = case
      when not v_is_public then coalesce(excluded.last_name, public.customers.last_name)
      else coalesce(public.customers.last_name, excluded.last_name)
    end,
    email = case
      when not v_is_public then coalesce(excluded.email, public.customers.email)
      else coalesce(public.customers.email, excluded.email)
    end,
    accepts_marketing = coalesce(v_marketing, public.customers.accepts_marketing)
  returning id into v_customer_id;

  if not v_is_public or p_deposit_amount = 0 then
    v_status := 'confirmed';
    v_required_until := null;
    v_deposit_state := 'none';
  else
    v_status := 'pending_payment';
    v_hold_minutes := public.setting_numeric('hold_window_minutes', 10);
    v_required_until := now() + make_interval(mins => v_hold_minutes::integer);
    v_deposit_state := 'pending';
  end if;

  insert into public.bookings (
    customer_id, area_id, starts_at, ends_at, shown_duration_min,
    status, source, price_display_mode,
    price_estimated_min, price_estimated_max,
    deposit_rate_applied, deposit_amount, deposit_status,
    payment_required_until, customer_note,
    created_by, created_via_override, override_reason
  ) values (
    v_customer_id, v_area.id, p_starts_at, p_ends_at, p_shown_duration_min,
    v_status, p_source, p_price_display_mode,
    p_price_estimated_min, p_price_estimated_max,
    p_deposit_rate, p_deposit_amount, v_deposit_state,
    v_required_until, nullif(p_customer_note, ''),
    p_created_by, coalesce(p_override, false), nullif(p_override_reason, '')
  )
  returning * into v_booking;

  for v_item in select * from jsonb_array_elements(p_items) loop
    declare
      v_service_id uuid := null;
      v_extra_id   uuid := null;
    begin
      if v_item ? 'service_slug' then
        select s.id into v_service_id from public.services s where s.slug = v_item->>'service_slug';
        if v_service_id is null then
          raise exception 'unknown_service';
        end if;
      end if;
      if v_item ? 'extra_slug' then
        select e.id into v_extra_id from public.extras e where e.slug = v_item->>'extra_slug';
        if v_extra_id is null then
          raise exception 'unknown_extra';
        end if;
      end if;

      insert into public.booking_items (
        booking_id, service_id, extra_id, role,
        snapshot_name, snapshot_price_amount, snapshot_length_tier,
        snapshot_duration_min, snapshot_process_min, snapshot_setup_min,
        personalization, sort_order
      ) values (
        v_booking.id, v_service_id, v_extra_id, v_item->>'role',
        v_item->>'name',
        (v_item->>'price_amount')::integer,
        v_item->>'length_tier',
        (v_item->>'duration_min')::integer,
        (v_item->>'process_min')::integer,
        (v_item->>'setup_min')::integer,
        coalesce(v_item->'personalization', '{}'::jsonb),
        v_idx
      );
      v_idx := v_idx + 1;
    end;
  end loop;

  if coalesce(p_override, false) then
    perform public.record_audit(
      p_created_by, p_actor_label, 'capacity_override', 'booking', v_booking.id,
      jsonb_build_object(
        'rule',        'area_capacity',
        'area',        v_area.slug,
        'configured',  v_capacity,
        'peak_before', v_peak,
        'area_closed', coalesce(v_closed, false),
        'reason',      p_override_reason,
        'starts_at',   p_starts_at
      )
    );
  end if;

  if p_created_by is not null or p_actor_label is not null then
    perform public.record_audit(
      p_created_by, p_actor_label, 'booking_created', 'booking', v_booking.id,
      jsonb_build_object('source', p_source, 'status', v_status)
    );
  end if;

  return jsonb_build_object(
    'id',                     v_booking.id,
    'public_token',           v_booking.public_token,
    'status',                 v_booking.status,
    'source',                 v_booking.source,
    'deposit_status',         v_booking.deposit_status,
    'starts_at',              v_booking.starts_at,
    'ends_at',                v_booking.ends_at,
    'deposit_amount',         v_booking.deposit_amount,
    'payment_required_until', v_booking.payment_required_until,
    'created_via_override',   v_booking.created_via_override
  );
end;
$$;

revoke all on function public.create_booking(
  text, timestamptz, timestamptz, integer, text, integer, integer, numeric,
  integer, jsonb, jsonb, text, text, uuid, text, boolean, text
) from public, anon, authenticated;
grant execute on function public.create_booking(
  text, timestamptz, timestamptz, integer, text, integer, integer, numeric,
  integer, jsonb, jsonb, text, text, uuid, text, boolean, text
) to service_role;
