-- =====================================================================
-- Sol Mai · V4.1 Fase 4 (cierre) — la estación fuera de servicio manda
--
-- `effective_area_capacity()` existía desde la migración de recursos y
-- NO la llamaba nadie: el motor seguía razonando sobre `areas.capacity`,
-- que sólo cuenta estaciones activas y no sabe nada de un sillón roto
-- esta semana.
--
-- Efecto real del bug: sacar una estación de servicio no reducía la
-- disponibilidad. El salón podía seguir tomando cinco turnos
-- simultáneos en Peluquería con cuatro puestos usables, y el conflicto
-- aparecía recién con la clienta sentada esperando.
--
-- Se redefine el cálculo de capacidad en los DOS lugares que deciden —
-- `create_booking` (que además toma el lock) y `check_capacity` (que
-- responde la advertencia previa) — para que resten las estaciones
-- bloqueadas en la ventana consultada. Sin bloqueos vigentes el
-- resultado es idéntico al anterior.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.create_booking(p_area_slug text, p_starts_at timestamp with time zone, p_ends_at timestamp with time zone, p_shown_duration_min integer, p_price_display_mode text, p_price_estimated_min integer, p_price_estimated_max integer, p_deposit_rate numeric, p_deposit_amount integer, p_customer jsonb, p_items jsonb, p_customer_note text DEFAULT NULL::text, p_source text DEFAULT 'online'::text, p_created_by uuid DEFAULT NULL::uuid, p_actor_label text DEFAULT NULL::text, p_override boolean DEFAULT false, p_override_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
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
begin
  if p_ends_at <= p_starts_at then
    raise exception 'invalid_window';
  end if;

  -- El canal público es uno solo. Todo lo demás lo opera el salón.
  v_is_public := (p_source = 'online');

  if v_is_public and p_override then
    raise exception 'override_not_allowed_online';
  end if;

  select * into v_area from public.areas where slug = p_area_slug and is_active;
  if not found then
    raise exception 'area_not_found';
  end if;
  if v_is_public and not v_area.is_bookable_online then
    raise exception 'area_not_bookable_online';
  end if;

  perform pg_advisory_xact_lock(
    hashtext('sol-mai-booking:' || v_area.slug),
    hashtext(to_char(p_starts_at at time zone 'UTC', 'YYYY-MM-DD'))
  );

  select
    bool_or(capacity_delta is null),
    coalesce(sum(capacity_delta) filter (where capacity_delta is not null), 0)
  into v_closed, v_delta
  from public.schedule_exceptions e
  where e.is_active
    and (e.area_id is null or e.area_id = v_area.id)
    and tstzrange(e.starts_at, e.ends_at) && tstzrange(p_starts_at, p_ends_at);

  -- Una estación fuera de servicio no es una preferencia: es un puesto
  -- que no existe en ese horario. Restarla acá es lo que impide seguir
  -- dando cinco turnos simultáneos con cuatro sillones usables.
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

  -- El motor calcula y advierte; la persona autorizada decide. El
  -- override no es un atajo: exige canal interno y queda registrado.
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
    coalesce((p_customer->>'accepts_marketing')::boolean, false)
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
    accepts_marketing = case
      when not v_is_public then excluded.accepts_marketing
      else public.customers.accepts_marketing
    end
  returning id into v_customer_id;

  -- REGLA DE SEÑA: la exige el canal público. Cualquier reserva creada
  -- por el salón queda confirmada sin pago online.
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
        v_booking.id,
        v_service_id,
        v_extra_id,
        v_item->>'role',
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
        'rule',            'area_capacity',
        'area',            v_area.slug,
        'configured',      v_capacity,
        'peak_before',     v_peak,
        'area_closed',     coalesce(v_closed, false),
        'reason',          p_override_reason,
        'starts_at',       p_starts_at
      )
    );
  end if;

  if p_created_by is not null then
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
$function$;

CREATE OR REPLACE FUNCTION public.check_capacity(p_area_slug text, p_starts_at timestamp with time zone, p_ends_at timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_area     public.areas%rowtype;
  v_capacity integer;
  v_delta    integer;
  v_closed   boolean;
  v_peak     integer;
begin
  select * into v_area from public.areas where slug = p_area_slug and is_active;
  if not found then
    return jsonb_build_object('found', false);
  end if;

  select
    bool_or(capacity_delta is null),
    coalesce(sum(capacity_delta) filter (where capacity_delta is not null), 0)
  into v_closed, v_delta
  from public.schedule_exceptions e
  where e.is_active
    and (e.area_id is null or e.area_id = v_area.id)
    and tstzrange(e.starts_at, e.ends_at) && tstzrange(p_starts_at, p_ends_at);

  -- Una estación fuera de servicio no es una preferencia: es un puesto
  -- que no existe en ese horario. Restarla acá es lo que impide seguir
  -- dando cinco turnos simultáneos con cuatro sillones usables.
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

  return jsonb_build_object(
    'found',       true,
    'area',        v_area.slug,
    'area_name',   v_area.name,
    'capacity',    v_capacity,
    'peak',        v_peak,
    'area_closed', coalesce(v_closed, false),
    'fits',        (not coalesce(v_closed, false)) and v_capacity > 0 and v_peak + 1 <= v_capacity
  );
end;
$function$;
