-- =====================================================================
-- Sol Mai · V4.1 Fase 1 — Agenda operable
--
-- Convierte el sistema de reservas en algo que el salón puede operar:
--
--   * cinco canales reales (online, manual, phone, whatsapp, walk_in);
--   * trazabilidad: quién creó cada reserva interna;
--   * estado no_show, distinto de cancelled, con retención de seña;
--   * excepciones operativas: el motor advierte, la persona decide,
--     el sistema registra;
--   * bitácora de acciones operativas, separada del historial de
--     configuración (parameter_history sigue siendo sólo para parámetros).
--
-- Regla de seña corregida: la exige el canal PÚBLICO, no la ausencia de
-- la palabra 'manual'. Al abrir tres canales internos nuevos, la
-- condición anterior (`p_source = 'manual'`) los habría mandado a
-- pending_payment y les habría pedido pago — lo contrario de lo decidido.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Canales de reserva
-- ---------------------------------------------------------------------

alter table public.bookings drop constraint if exists bookings_source_check;
alter table public.bookings
  add constraint bookings_source_check
  check (source in ('online','manual','phone','whatsapp','walk_in'));

comment on column public.bookings.source is
  'Canal por el que entró la reserva. Sólo `online` es autogestionado por la clienta; el resto los crea el salón.';

-- ---------------------------------------------------------------------
-- 2. Trazabilidad de quién creó la reserva
-- ---------------------------------------------------------------------
-- Nulo cuando la creó la propia clienta desde el canal público.

alter table public.bookings
  add column if not exists created_by uuid references public.staff_members(id) on delete set null;

create index if not exists bookings_created_by_idx on public.bookings (created_by)
  where created_by is not null;

comment on column public.bookings.created_by is
  'Persona del salón que creó la reserva. Null en el canal online: la creó la clienta.';

-- ---------------------------------------------------------------------
-- 3. Estado no_show y ciclo de vida de la seña
-- ---------------------------------------------------------------------

alter table public.bookings drop constraint if exists bookings_status_check;
alter table public.bookings
  add constraint bookings_status_check
  check (status in ('pending_payment','confirmed','attended','cancelled','expired','no_show'));

-- `refund_due` respondía una sola pregunta (¿corresponde devolver?) y no
-- alcanza para distinguir "nunca pagó" de "pagó y se le retuvo". El
-- reporting necesita esa diferencia: son plata que entró vs plata que
-- nunca existió.
alter table public.bookings
  add column if not exists deposit_status text not null default 'none'
    check (deposit_status in ('none','pending','paid','refunded','retained'));

comment on column public.bookings.deposit_status is
  'none: no corresponde seña · pending: se pidió y no llegó · paid: acreditada · refunded: devuelta · retained: retenida (cancelación tardía o ausencia).';

-- Backfill coherente con el estado actual de cada reserva.
update public.bookings set deposit_status = case
  when deposit_amount = 0                      then 'none'
  when status = 'pending_payment'              then 'pending'
  when status in ('confirmed','attended')      then 'paid'
  when status = 'expired'                      then 'pending'
  when status = 'cancelled' and refund_due     then 'refunded'
  when status = 'cancelled' and not refund_due then 'retained'
  else 'none'
end;

alter table public.bookings
  add column if not exists no_show_at        timestamptz,
  add column if not exists no_show_marked_by uuid references public.staff_members(id) on delete set null;

-- ---------------------------------------------------------------------
-- 4. Excepciones operativas sobre la reserva
-- ---------------------------------------------------------------------
-- La excepción vive en la reserva que la necesitó. NO toca la capacidad
-- configurada del área ni los horarios: afecta a ese turno y a nada más.

alter table public.bookings
  add column if not exists created_via_override boolean not null default false,
  add column if not exists override_reason      text;

comment on column public.bookings.created_via_override is
  'La reserva se creó superando una regla de disponibilidad, con confirmación humana.';

-- ---------------------------------------------------------------------
-- 5. Bitácora de acciones operativas
-- ---------------------------------------------------------------------
-- Distinta de parameter_history: aquélla registra cambios de
-- configuración (precios, tiempos); ésta registra lo que las personas
-- hacen sobre la operación.

create table if not exists public.audit_log (
  id           bigint generated always as identity primary key,
  actor_id     uuid references public.staff_members(id) on delete set null,
  actor_label  text,                    -- email o nombre, para que el registro sobreviva a una baja
  action       text not null,           -- capacity_override, no_show_marked, booking_created…
  entity_type  text not null,           -- booking, customer, resource…
  entity_id    uuid,
  detail       jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists audit_log_entity_idx  on public.audit_log (entity_type, entity_id);
create index if not exists audit_log_created_idx on public.audit_log (created_at desc);
create index if not exists audit_log_action_idx  on public.audit_log (action);

revoke all on public.audit_log from anon, authenticated;
grant all on public.audit_log to service_role;
alter table public.audit_log enable row level security;

create or replace function public.record_audit(
  p_actor_id    uuid,
  p_actor_label text,
  p_action      text,
  p_entity_type text,
  p_entity_id   uuid,
  p_detail      jsonb default '{}'::jsonb
) returns void
language sql
security definer
set search_path = public
as $$
  insert into public.audit_log (actor_id, actor_label, action, entity_type, entity_id, detail)
  values (p_actor_id, p_actor_label, p_action, p_entity_type, p_entity_id, coalesce(p_detail, '{}'::jsonb));
$$;

revoke all on function public.record_audit(uuid, text, text, text, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.record_audit(uuid, text, text, text, uuid, jsonb) to service_role;

-- ---------------------------------------------------------------------
-- 6. Excepciones de agenda que SUMAN capacidad
-- ---------------------------------------------------------------------
-- El CHECK original sólo admitía deltas negativos, así que un refuerzo
-- —una profesional invitada, una estación extra por un día— era
-- inexpresable. Cero sigue prohibido: no significa nada.

alter table public.schedule_exceptions drop constraint if exists schedule_exceptions_delta;
alter table public.schedule_exceptions
  add constraint schedule_exceptions_delta
  check (capacity_delta is null or capacity_delta <> 0);

-- ---------------------------------------------------------------------
-- 7. Maquillaje y Uñas pasan a reservables online (decisión D-13)
-- ---------------------------------------------------------------------

update public.areas set is_bookable_online = true, updated_at = now()
 where slug in ('maquillaje','unas');

-- ---------------------------------------------------------------------
-- 8. create_booking — canales, trazabilidad y override
-- ---------------------------------------------------------------------

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

  v_capacity := greatest(v_area.capacity + coalesce(v_delta, 0), 0);

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
$$;

revoke all on function public.create_booking(
  text, timestamptz, timestamptz, integer, text, integer, integer, numeric,
  integer, jsonb, jsonb, text, text, uuid, text, boolean, text
) from public, anon, authenticated;
grant execute on function public.create_booking(
  text, timestamptz, timestamptz, integer, text, integer, integer, numeric,
  integer, jsonb, jsonb, text, text, uuid, text, boolean, text
) to service_role;

-- La firma vieja queda obsoleta: se elimina para que ninguna ruta la
-- llame por accidente y se salte la trazabilidad.
drop function if exists public.create_booking(
  text, timestamptz, timestamptz, integer, text, integer, integer, numeric,
  integer, jsonb, jsonb, text, text
);

-- ---------------------------------------------------------------------
-- 9. Consultar disponibilidad antes de decidir un override
-- ---------------------------------------------------------------------
-- Para poder decirle a la persona QUÉ regla va a superar y con qué
-- números, en vez de un "no disponible" que la obliga a adivinar.

create or replace function public.check_capacity(
  p_area_slug text,
  p_starts_at timestamptz,
  p_ends_at   timestamptz
) returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
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

  v_capacity := greatest(v_area.capacity + coalesce(v_delta, 0), 0);

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
$$;

revoke all on function public.check_capacity(text, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.check_capacity(text, timestamptz, timestamptz) to service_role;

-- ---------------------------------------------------------------------
-- 10. Marcar ausencia sin aviso
-- ---------------------------------------------------------------------
-- Distinta de cancelar: nadie avisó y la hora se perdió. Si había seña
-- acreditada, se retiene (decisión D-02). Si no la había, no se inventa
-- ninguna consecuencia económica.

create or replace function public.mark_no_show(
  p_booking_id  uuid,
  p_actor_id    uuid default null,
  p_actor_label text default null
) returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_booking public.bookings%rowtype;
  v_new_deposit text;
begin
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then
    raise exception 'booking_not_found';
  end if;

  if v_booking.status = 'no_show' then
    return jsonb_build_object('status', 'already_no_show', 'deposit_status', v_booking.deposit_status);
  end if;

  -- Sólo un turno que llegó a estar tomado puede constituir una ausencia.
  if v_booking.status not in ('confirmed','pending_payment') then
    raise exception 'not_markable';
  end if;

  v_new_deposit := case
    when v_booking.deposit_status = 'paid' then 'retained'
    else v_booking.deposit_status
  end;

  update public.bookings
     set status            = 'no_show',
         deposit_status    = v_new_deposit,
         refund_due        = false,
         no_show_at        = now(),
         no_show_marked_by = p_actor_id,
         updated_at        = now()
   where id = p_booking_id;

  perform public.record_audit(
    p_actor_id, p_actor_label, 'no_show_marked', 'booking', p_booking_id,
    jsonb_build_object(
      'previous_status', v_booking.status,
      'source',          v_booking.source,
      'deposit_status',  v_new_deposit,
      'deposit_amount',  v_booking.deposit_amount
    )
  );

  return jsonb_build_object(
    'status',         'no_show',
    'deposit_status', v_new_deposit,
    'deposit_amount', case when v_new_deposit = 'retained' then v_booking.deposit_amount else 0 end
  );
end;
$$;

revoke all on function public.mark_no_show(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.mark_no_show(uuid, uuid, text) to service_role;

-- ---------------------------------------------------------------------
-- 11. Coherencia de deposit_status en pago y cancelación
-- ---------------------------------------------------------------------

create or replace function public.confirm_booking_payment(
  p_booking_id   uuid,
  p_provider     text,
  p_provider_ref text,
  p_amount       integer,
  p_status       text,
  p_raw          jsonb default '{}'::jsonb
) returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_booking public.bookings%rowtype;
  v_updated integer;
begin
  select * into v_booking from public.bookings where id = p_booking_id;
  if not found then
    return 'booking_not_found';
  end if;

  insert into public.payments (booking_id, provider, provider_ref, amount, status, raw_payload)
  values (p_booking_id, p_provider, p_provider_ref, p_amount, p_status, coalesce(p_raw, '{}'::jsonb))
  on conflict (provider, provider_ref) do update
    set status = excluded.status, amount = excluded.amount,
        raw_payload = excluded.raw_payload, updated_at = now();

  if p_status <> 'approved' then
    return 'recorded';
  end if;

  if v_booking.status = 'confirmed' then
    return 'already_confirmed';
  end if;

  -- Una sola sentencia condicional resuelve la carrera entre el
  -- vencimiento del hold y la llegada del pago.
  update public.bookings
     set status = 'confirmed', deposit_status = 'paid',
         payment_required_until = null, updated_at = now()
   where id = p_booking_id
     and status = 'pending_payment'
     and (payment_required_until is null or payment_required_until > now());
  get diagnostics v_updated = row_count;

  if v_updated = 1 then
    return 'confirmed';
  end if;

  return 'late_payment';
end;
$$;

revoke all on function public.confirm_booking_payment(uuid, text, text, integer, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.confirm_booking_payment(uuid, text, text, integer, text, jsonb)
  to service_role;

create or replace function public.cancel_booking(
  p_public_token text,
  p_reason       text default null
) returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_booking public.bookings%rowtype;
  v_refund  boolean;
  v_window  numeric;
  v_deposit text;
begin
  select * into v_booking from public.bookings where public_token = p_public_token for update;
  if not found then
    raise exception 'booking_not_found';
  end if;
  if v_booking.status not in ('pending_payment','confirmed') then
    raise exception 'not_cancellable';
  end if;

  v_window := public.setting_numeric('refund_window_hours', 24);
  v_refund := v_booking.deposit_status = 'paid'
              and v_booking.starts_at > now() + make_interval(hours => v_window::integer);

  v_deposit := case
    when v_booking.deposit_status <> 'paid' then v_booking.deposit_status
    when v_refund then 'refunded'
    else 'retained'
  end;

  update public.bookings
     set status              = 'cancelled',
         cancellation_reason = nullif(p_reason, ''),
         refund_due          = v_refund,
         deposit_status      = v_deposit,
         cancelled_at        = now(),
         updated_at          = now()
   where id = v_booking.id;

  return jsonb_build_object(
    'status',          'cancelled',
    'refund_due',      v_refund,
    'previous_status', v_booking.status,
    'deposit_status',  v_deposit,
    'deposit_amount',  v_booking.deposit_amount
  );
end;
$$;

revoke all on function public.cancel_booking(text, text) from public, anon, authenticated;
grant execute on function public.cancel_booking(text, text) to service_role;

-- Al vencer el hold, la seña que se pidió y no llegó deja de estar
-- pendiente: nunca existió.
create or replace function public.expire_stale_bookings()
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_count integer;
begin
  update public.bookings
     set status = 'expired', deposit_status = 'none', updated_at = now()
   where status = 'pending_payment'
     and payment_required_until is not null
     and payment_required_until <= now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.expire_stale_bookings() from public, anon, authenticated;
grant execute on function public.expire_stale_bookings() to service_role;
