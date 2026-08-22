-- =====================================================================
-- Sol Mai · Booking + configuración operativa
--
-- Blueprint V3 + Pre-Implementation Gate (C1–C9):
--   * business_settings / areas / schedule_exceptions: parámetros vivos.
--   * service_parameters + service_price_tiers: precio y tiempo por
--     (servicio, largo). El largo es dimensión estructural (tier),
--     nunca modificador (gate A1/C1).
--   * M y B se almacenan; A = M − B se deriva; C = M + setup (gate A4).
--   * customers / bookings / booking_items / payments: dominio de
--     reservas con snapshot completo (gate C4).
--   * service_execution_records: estimado vs real (§11 del mandato).
--   * parameter_history: trazabilidad append-only de parámetros.
--   * RPCs SECURITY DEFINER: create_booking (concurrencia, gate A7/C5),
--     confirm_booking_payment (idempotente, gate A9),
--     expire_stale_bookings, cancel_booking (regla 24 h).
--
-- Seguridad: RLS habilitado en todas las tablas nuevas SIN políticas
-- públicas — solo el backend (service_role) opera sobre ellas.
-- =====================================================================

set local search_path = public, extensions;

-- ---------------------------------------------------------------------
-- 1. Configuración del negocio (clave → valor tipado en jsonb)
-- ---------------------------------------------------------------------

create table public.business_settings (
  key         text primary key,
  value       jsonb not null,
  description text,
  source      text not null default 'industry_baseline'
    check (source in ('industry_baseline','sol_pricelist_derived','sol_validated','sol_adjusted')),
  confidence  text not null default 'low'
    check (confidence in ('high','medium','low')),
  updated_by  text,
  updated_at  timestamptz not null default now()
);

revoke all on public.business_settings from anon, authenticated;
grant select on public.business_settings to anon, authenticated;
grant all on public.business_settings to service_role;
alter table public.business_settings enable row level security;

-- Solo las claves que la experiencia pública necesita mostrar u operar
-- (la seña, la ventana de reembolso, la granularidad de turnos) son
-- legibles sin privilegios. El resto queda para el backend.
create policy business_settings_public_read on public.business_settings
  for select using (
    key in (
      'deposit_rate_pct','refund_window_hours','hold_window_minutes',
      'default_setup_minutes','slot_granularity_minutes',
      'min_advance_hours','max_advance_days'
    )
  );

insert into public.business_settings (key, value, description, source, confidence) values
  ('deposit_rate_pct',        '20', 'Seña para reservar (% del mínimo estimado)',            'sol_validated',     'high'),
  ('refund_window_hours',     '24', 'Cancelando con esta anticipación se devuelve la seña',  'sol_validated',     'high'),
  ('hold_window_minutes',     '10', 'Minutos que una reserva sin seña retiene el turno',     'industry_baseline', 'low'),
  ('default_setup_minutes',   '12', 'Preparación entre clientas cuando el servicio no define otra', 'industry_baseline', 'medium'),
  ('payment_surcharge_pct',   '10', 'Recargo sobre lista cuando el pago no es en efectivo (informativo, no aplicado online)', 'sol_pricelist_derived', 'medium'),
  ('slot_granularity_minutes','30', 'Cada cuántos minutos se ofrecen horarios',              'industry_baseline', 'medium'),
  ('min_advance_hours',       '2',  'Anticipación mínima para reservar online',              'industry_baseline', 'low'),
  ('max_advance_days',        '30', 'Anticipación máxima para reservar online',              'industry_baseline', 'low')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------
-- 2. Áreas operativas (capacidad concurrente; sin estaciones individuales)
-- ---------------------------------------------------------------------

create table public.areas (
  id                 uuid primary key default gen_random_uuid(),
  slug               text not null unique,
  name               text not null,
  capacity           integer not null check (capacity > 0),
  is_bookable_online boolean not null default true,
  is_active          boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint areas_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

revoke all on public.areas from anon, authenticated;
grant all on public.areas to service_role;
alter table public.areas enable row level security;

-- area.slug == categories.slug: la reserva resuelve el área por la
-- categoría del servicio principal.
insert into public.areas (slug, name, capacity, is_bookable_online) values
  ('peluqueria', 'Peluquería', 5, true),   -- 5 estaciones (doc maestro §13.16)
  ('maquillaje', 'Maquillaje', 1, false),  -- capacidad sin validar → no reservable online
  ('unas',       'Uñas',       1, false),  -- capacidad sin validar → no reservable online
  ('depilacion', 'Depilación', 1, true)    -- 1 clienta por turno (validado por Sol)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------
-- 3. Excepciones de agenda (cierres y cambios temporales de capacidad)
-- ---------------------------------------------------------------------

create table public.schedule_exceptions (
  id             uuid primary key default gen_random_uuid(),
  area_id        uuid references public.areas(id) on delete cascade, -- null = todo el salón
  starts_at      timestamptz not null,
  ends_at        timestamptz not null,
  reason         text not null,
  capacity_delta integer, -- null = cierre total; -2 = dos puestos menos
  is_active      boolean not null default true,
  created_by     text,
  created_at     timestamptz not null default now(),
  constraint schedule_exceptions_window check (ends_at > starts_at),
  constraint schedule_exceptions_delta  check (capacity_delta is null or capacity_delta < 0)
);

create index schedule_exceptions_window_idx
  on public.schedule_exceptions using gist (tstzrange(starts_at, ends_at))
  where is_active;

revoke all on public.schedule_exceptions from anon, authenticated;
grant all on public.schedule_exceptions to service_role;
alter table public.schedule_exceptions enable row level security;

-- ---------------------------------------------------------------------
-- 4. Parámetros por servicio (gate C2: el setup vive acá, no en tiers)
-- ---------------------------------------------------------------------

create table public.service_parameters (
  service_id              uuid primary key references public.services(id) on delete cascade,
  price_display_mode      text not null default 'from'
    check (price_display_mode in ('fixed','from','subject_to_confirmation')),
  length_affects_price    boolean not null default false,
  length_affects_duration boolean not null default false,
  setup_minutes_override  integer check (setup_minutes_override >= 0), -- null → default_setup_minutes
  requires_consultation   boolean not null default false,
  updated_by              text,
  updated_at              timestamptz not null default now()
);

revoke all on public.service_parameters from anon, authenticated;
grant select on public.service_parameters to anon, authenticated; -- catálogo público necesita display_mode
alter table public.service_parameters enable row level security;

create policy service_parameters_public_read on public.service_parameters
  for select using (
    exists (
      select 1 from public.services s
      where s.id = service_id and s.is_public and s.is_active and s.deleted_at is null
    )
  );

-- ---------------------------------------------------------------------
-- 5. Precio y tiempo por (servicio, largo) — importes absolutos
--    M = duration_main_min (mostrado) · B = process_min · A = M − B
-- ---------------------------------------------------------------------

create table public.service_price_tiers (
  service_id        uuid not null references public.services(id) on delete cascade,
  length_tier       text not null
    check (length_tier in ('corto','medio','largo','xl','unico')),
  price_main        integer not null check (price_main >= 0),
  price_addon       integer check (price_addon >= 0),
  duration_main_min integer not null check (duration_main_min > 0),
  duration_addon_min integer check (duration_addon_min > 0),
  process_min       integer not null default 0,
  source            text not null default 'industry_baseline'
    check (source in ('industry_baseline','sol_pricelist','sol_validated','sol_adjusted')),
  source_ref        text,
  evidence_class    text check (evidence_class in ('A','B','C','D')),
  confidence        text not null default 'low'
    check (confidence in ('high','medium','low')),
  effective_from    date not null default current_date,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  primary key (service_id, length_tier),
  constraint spt_process_within_duration check (process_min >= 0 and process_min <= duration_main_min)
);

revoke all on public.service_price_tiers from anon, authenticated;
grant select on public.service_price_tiers to anon, authenticated;
alter table public.service_price_tiers enable row level security;

create policy service_price_tiers_public_read on public.service_price_tiers
  for select using (
    exists (
      select 1 from public.services s
      where s.id = service_id and s.is_public and s.is_active and s.deleted_at is null
    )
  );

-- ---------------------------------------------------------------------
-- 6. El largo es tier_selector, nunca modificador (gate A1/C1)
-- ---------------------------------------------------------------------

alter table public.personalization_fields
  add column field_role text not null default 'modifier'
    check (field_role in ('tier_selector','modifier','context'));

update public.personalization_fields set field_role = 'tier_selector' where slug = 'largo';
update public.personalization_fields set field_role = 'context'
  where slug in ('quimicos','alergias','objetivo','evento','horario','estilo','prueba','estado','terminacion');

-- Bases ya desplegadas pueden conservar modificadores de largo del
-- bootstrap anterior: se retiran (el bootstrap regenerado ya no los emite).
delete from public.service_personalization_option_modifiers m
using public.personalization_fields f
where f.id = m.field_id and f.field_role = 'tier_selector';

create or replace function public.reject_tier_selector_modifier()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1 from public.personalization_fields f
    where f.id = new.field_id and f.field_role = 'tier_selector'
  ) then
    raise exception 'tier_selector fields must not carry personalization modifiers (field_id=%)', new.field_id;
  end if;
  return new;
end;
$$;

create trigger spom_reject_tier_selector
  before insert or update on public.service_personalization_option_modifiers
  for each row execute function public.reject_tier_selector_modifier();

-- ---------------------------------------------------------------------
-- 7. Clientas + notas
-- ---------------------------------------------------------------------

create table public.customers (
  id                uuid primary key default gen_random_uuid(),
  first_name        text not null check (length(btrim(first_name)) > 0),
  last_name         text,
  phone_e164        text not null unique check (phone_e164 ~ '^\+[1-9][0-9]{6,14}$'),
  email             text check (email is null or email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  accepts_marketing boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

revoke all on public.customers from anon, authenticated;
grant all on public.customers to service_role;
alter table public.customers enable row level security;

create table public.customer_notes (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  body        text not null check (length(btrim(body)) > 0),
  created_by  text,
  created_at  timestamptz not null default now()
);

create index customer_notes_customer_idx on public.customer_notes (customer_id, created_at desc);

revoke all on public.customer_notes from anon, authenticated;
grant all on public.customer_notes to service_role;
alter table public.customer_notes enable row level security;

-- ---------------------------------------------------------------------
-- 8. Reservas
-- ---------------------------------------------------------------------

create table public.bookings (
  id                     uuid primary key default gen_random_uuid(),
  public_token           text not null unique
    default encode(extensions.gen_random_bytes(16), 'hex'),
  customer_id            uuid not null references public.customers(id) on delete restrict,
  area_id                uuid not null references public.areas(id) on delete restrict,
  starts_at              timestamptz not null,
  ends_at                timestamptz not null, -- fin de la ventana BLOQUEANTE (M + setup)
  shown_duration_min     integer not null check (shown_duration_min > 0),
  status                 text not null default 'pending_payment'
    check (status in ('pending_payment','confirmed','attended','cancelled','expired')),
  source                 text not null default 'online' check (source in ('online','manual')),
  price_display_mode     text not null
    check (price_display_mode in ('fixed','from','subject_to_confirmation')),
  price_estimated_min    integer not null check (price_estimated_min >= 0),
  price_estimated_max    integer check (price_estimated_max >= price_estimated_min),
  deposit_rate_applied   numeric(5,2) not null check (deposit_rate_applied >= 0),
  deposit_amount         integer not null check (deposit_amount >= 0),
  payment_required_until timestamptz,
  customer_note          text,
  cancellation_reason    text,
  refund_due             boolean,
  cancelled_at           timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint bookings_window check (ends_at > starts_at)
);

create index bookings_area_window_idx on public.bookings (area_id, starts_at);
create index bookings_status_idx on public.bookings (status);
create index bookings_pending_expiry_idx on public.bookings (payment_required_until)
  where status = 'pending_payment';

revoke all on public.bookings from anon, authenticated;
grant all on public.bookings to service_role;
alter table public.bookings enable row level security;

-- ÚNICA definición de "esta reserva ocupa capacidad" (gate C5).
-- Disponibilidad, creación y doble-booking usan exclusivamente esto.
create or replace function public.booking_blocks(p_status text, p_payment_required_until timestamptz)
returns boolean
language sql
stable
as $$
  select p_status in ('confirmed','attended')
      or (p_status = 'pending_payment'
          and (p_payment_required_until is null or p_payment_required_until > now()));
$$;

create table public.booking_items (
  id                    uuid primary key default gen_random_uuid(),
  booking_id            uuid not null references public.bookings(id) on delete cascade,
  service_id            uuid references public.services(id) on delete set null,
  extra_id              uuid references public.extras(id) on delete set null,
  role                  text not null check (role in ('main','addon','extra')),
  snapshot_name         text not null,
  snapshot_price_amount integer not null check (snapshot_price_amount >= 0),
  snapshot_length_tier  text,
  snapshot_duration_min integer not null check (snapshot_duration_min >= 0),
  snapshot_process_min  integer not null default 0 check (snapshot_process_min >= 0),
  snapshot_setup_min    integer not null default 0 check (snapshot_setup_min >= 0),
  personalization       jsonb,
  sort_order            integer not null default 0
);

create index booking_items_booking_idx on public.booking_items (booking_id, sort_order);

revoke all on public.booking_items from anon, authenticated;
grant all on public.booking_items to service_role;
alter table public.booking_items enable row level security;

-- ---------------------------------------------------------------------
-- 9. Pagos (idempotencia por provider_ref — gate A9)
-- ---------------------------------------------------------------------

create table public.payments (
  id           uuid primary key default gen_random_uuid(),
  booking_id   uuid not null references public.bookings(id) on delete restrict,
  provider     text not null default 'mercado_pago',
  provider_ref text not null,
  amount       integer,
  status       text not null,
  raw_payload  jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint payments_provider_ref_unique unique (provider, provider_ref)
);

create index payments_booking_idx on public.payments (booking_id);

revoke all on public.payments from anon, authenticated;
grant all on public.payments to service_role;
alter table public.payments enable row level security;

-- ---------------------------------------------------------------------
-- 10. Registro de ejecución (estimado vs real, §11)
-- ---------------------------------------------------------------------

create table public.service_execution_records (
  booking_id          uuid primary key references public.bookings(id) on delete cascade,
  final_price_amount  integer check (final_price_amount >= 0),
  actual_duration_min integer check (actual_duration_min > 0),
  services_done       text,
  formula             text, -- fórmula técnica en texto libre (nunca pública)
  payment_method      text check (payment_method in ('efectivo','transferencia','otro')),
  observation         text,
  recorded_by         text,
  recorded_at         timestamptz not null default now()
);

revoke all on public.service_execution_records from anon, authenticated;
grant all on public.service_execution_records to service_role;
alter table public.service_execution_records enable row level security;

-- ---------------------------------------------------------------------
-- 11. Historial de parámetros (append-only)
-- ---------------------------------------------------------------------

create table public.parameter_history (
  id         bigint generated always as identity primary key,
  table_name text not null,
  record_key text not null,
  field      text not null,
  old_value  text,
  new_value  text,
  source     text,
  confidence text,
  changed_by text,
  changed_at timestamptz not null default now()
);

revoke all on public.parameter_history from anon, authenticated;
grant all on public.parameter_history to service_role;
alter table public.parameter_history enable row level security;

create or replace function public.log_parameter_change()
returns trigger
language plpgsql
as $$
declare
  old_j jsonb := to_jsonb(old);
  new_j jsonb := to_jsonb(new);
  k text;
  rec_key text;
begin
  rec_key := coalesce(
    new_j->>'key',
    case when new_j ? 'length_tier'
         then (new_j->>'service_id') || ':' || (new_j->>'length_tier') end,
    new_j->>'service_id',
    new_j->>'slug',
    new_j->>'id'
  );

  for k in select jsonb_object_keys(new_j) loop
    if k in ('updated_at','created_at') then continue; end if;
    if new_j->k is distinct from old_j->k then
      insert into public.parameter_history
        (table_name, record_key, field, old_value, new_value, source, confidence, changed_by)
      values
        (tg_table_name, rec_key, k, old_j->>k, new_j->>k,
         new_j->>'source', new_j->>'confidence', new_j->>'updated_by');
    end if;
  end loop;
  return new;
end;
$$;

create trigger business_settings_history
  after update on public.business_settings
  for each row execute function public.log_parameter_change();
create trigger service_price_tiers_history
  after update on public.service_price_tiers
  for each row execute function public.log_parameter_change();
create trigger service_parameters_history
  after update on public.service_parameters
  for each row execute function public.log_parameter_change();
create trigger areas_history
  after update on public.areas
  for each row execute function public.log_parameter_change();
create trigger business_hours_history
  after update on public.business_hours
  for each row execute function public.log_parameter_change();

-- ---------------------------------------------------------------------
-- 12. updated_at automático en tablas nuevas
-- ---------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger business_settings_touch before update on public.business_settings
  for each row execute function public.touch_updated_at();
create trigger areas_touch before update on public.areas
  for each row execute function public.touch_updated_at();
create trigger service_parameters_touch before update on public.service_parameters
  for each row execute function public.touch_updated_at();
create trigger service_price_tiers_touch before update on public.service_price_tiers
  for each row execute function public.touch_updated_at();
create trigger customers_touch before update on public.customers
  for each row execute function public.touch_updated_at();
create trigger bookings_touch before update on public.bookings
  for each row execute function public.touch_updated_at();
create trigger payments_touch before update on public.payments
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- 13. Lectura de settings numéricos (helper interno)
-- ---------------------------------------------------------------------

create or replace function public.setting_numeric(p_key text, p_default numeric)
returns numeric
language sql
stable
as $$
  select coalesce((select (value #>> '{}')::numeric from public.business_settings where key = p_key), p_default);
$$;

-- ---------------------------------------------------------------------
-- 14. create_booking — transaccional, serializado por (área, día)
-- ---------------------------------------------------------------------
-- El chequeo de capacidad es de CONCURRENCIA PICO, no de conteo de
-- solapes: dos reservas que solapan la ventana pedida pero no entre sí
-- consumen un solo lugar en cada instante.

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
  p_source              text default 'online'
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
  v_required_until timestamptz;
  v_item          jsonb;
  v_idx           integer := 0;
begin
  if p_ends_at <= p_starts_at then
    raise exception 'invalid_window';
  end if;

  select * into v_area from public.areas where slug = p_area_slug and is_active;
  if not found then
    raise exception 'area_not_found';
  end if;
  if p_source = 'online' and not v_area.is_bookable_online then
    raise exception 'area_not_bookable_online';
  end if;

  -- Serializa a los escritores del mismo (área, día).
  perform pg_advisory_xact_lock(
    hashtext('sol-mai-booking:' || v_area.slug),
    hashtext(to_char(p_starts_at at time zone 'UTC', 'YYYY-MM-DD'))
  );

  -- Capacidad efectiva: base + deltas de excepciones; cierre = rechazo.
  select
    bool_or(capacity_delta is null),
    coalesce(sum(capacity_delta) filter (where capacity_delta is not null), 0)
  into v_closed, v_delta
  from public.schedule_exceptions e
  where e.is_active
    and (e.area_id is null or e.area_id = v_area.id)
    and tstzrange(e.starts_at, e.ends_at) && tstzrange(p_starts_at, p_ends_at);

  if coalesce(v_closed, false) then
    raise exception 'area_closed';
  end if;
  v_capacity := greatest(v_area.capacity + coalesce(v_delta, 0), 0);
  if v_capacity <= 0 then
    raise exception 'capacity_full';
  end if;

  -- Pico de concurrencia dentro de la ventana pedida.
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

  if v_peak + 1 > v_capacity then
    raise exception 'capacity_full';
  end if;

  -- Alta / actualización de clienta por teléfono normalizado.
  insert into public.customers (first_name, last_name, phone_e164, email, accepts_marketing)
  values (
    p_customer->>'first_name',
    p_customer->>'last_name',
    p_customer->>'phone_e164',
    nullif(p_customer->>'email', ''),
    coalesce((p_customer->>'accepts_marketing')::boolean, false)
  )
  on conflict (phone_e164) do update set
    first_name        = excluded.first_name,
    last_name         = coalesce(excluded.last_name, public.customers.last_name),
    email             = coalesce(excluded.email, public.customers.email),
    accepts_marketing = excluded.accepts_marketing or public.customers.accepts_marketing
  returning id into v_customer_id;

  if p_source = 'manual' or p_deposit_amount = 0 then
    v_status := 'confirmed';
    v_required_until := null;
  else
    v_status := 'pending_payment';
    v_hold_minutes := public.setting_numeric('hold_window_minutes', 10);
    v_required_until := now() + make_interval(mins => v_hold_minutes::integer);
  end if;

  insert into public.bookings (
    customer_id, area_id, starts_at, ends_at, shown_duration_min,
    status, source, price_display_mode,
    price_estimated_min, price_estimated_max,
    deposit_rate_applied, deposit_amount,
    payment_required_until, customer_note
  ) values (
    v_customer_id, v_area.id, p_starts_at, p_ends_at, p_shown_duration_min,
    v_status, p_source, p_price_display_mode,
    p_price_estimated_min, p_price_estimated_max,
    p_deposit_rate, p_deposit_amount,
    v_required_until, nullif(p_customer_note, '')
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
      coalesce((v_item->>'process_min')::integer, 0),
      coalesce((v_item->>'setup_min')::integer, 0),
      v_item->'personalization',
      v_idx
    );
    v_idx := v_idx + 1;
    end;
  end loop;

  return jsonb_build_object(
    'id', v_booking.id,
    'public_token', v_booking.public_token,
    'status', v_booking.status,
    'starts_at', v_booking.starts_at,
    'ends_at', v_booking.ends_at,
    'payment_required_until', v_booking.payment_required_until,
    'deposit_amount', v_booking.deposit_amount,
    'customer_id', v_customer_id
  );
end;
$$;

revoke all on function public.create_booking(text,timestamptz,timestamptz,integer,text,integer,integer,numeric,integer,jsonb,jsonb,text,text)
  from public, anon, authenticated;
grant execute on function public.create_booking(text,timestamptz,timestamptz,integer,text,integer,integer,numeric,integer,jsonb,jsonb,text,text)
  to service_role;

-- ---------------------------------------------------------------------
-- 15. confirm_booking_payment — el webhook es la autoridad (gate A9)
-- ---------------------------------------------------------------------

create or replace function public.confirm_booking_payment(
  p_booking_id   uuid,
  p_provider     text,
  p_provider_ref text,
  p_amount       integer,
  p_status       text,
  p_raw          jsonb
)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_current text;
begin
  insert into public.payments (booking_id, provider, provider_ref, amount, status, raw_payload)
  values (p_booking_id, p_provider, p_provider_ref, p_amount, p_status, p_raw)
  on conflict (provider, provider_ref) do update
    set status = excluded.status,
        amount = coalesce(excluded.amount, public.payments.amount),
        raw_payload = excluded.raw_payload;

  if p_status <> 'approved' then
    return 'recorded';
  end if;

  -- Autoridad única: una sola sentencia condicional decide la carrera
  -- expiración/webhook. 0 filas afectadas = excepción manual, nunca
  -- se re-bloquea el turno automáticamente.
  update public.bookings
     set status = 'confirmed'
   where id = p_booking_id
     and status = 'pending_payment'
     and (payment_required_until is null or now() < payment_required_until);

  if found then
    return 'confirmed';
  end if;

  select status into v_current from public.bookings where id = p_booking_id;
  if v_current is null then
    return 'booking_not_found';
  end if;
  if v_current = 'confirmed' then
    return 'already_confirmed';
  end if;

  update public.payments
     set status = 'approved_late'
   where provider = p_provider and provider_ref = p_provider_ref;
  return 'late_payment';
end;
$$;

revoke all on function public.confirm_booking_payment(uuid,text,text,integer,text,jsonb)
  from public, anon, authenticated;
grant execute on function public.confirm_booking_payment(uuid,text,text,integer,text,jsonb)
  to service_role;

-- ---------------------------------------------------------------------
-- 16. expire_stale_bookings — libera holds vencidos
-- ---------------------------------------------------------------------

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
     set status = 'expired'
   where status = 'pending_payment'
     and payment_required_until is not null
     and payment_required_until < now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.expire_stale_bookings() from public, anon, authenticated;
grant execute on function public.expire_stale_bookings() to service_role;

-- ---------------------------------------------------------------------
-- 17. cancel_booking — regla de reembolso 24 h (validada por Sol)
-- ---------------------------------------------------------------------

create or replace function public.cancel_booking(
  p_public_token text,
  p_reason       text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_booking public.bookings%rowtype;
  v_window  numeric;
  v_refund  boolean;
begin
  select * into v_booking
  from public.bookings
  where public_token = p_public_token
  for update;

  if not found then
    raise exception 'booking_not_found';
  end if;
  if v_booking.status not in ('pending_payment','confirmed') then
    raise exception 'not_cancellable';
  end if;

  v_window := public.setting_numeric('refund_window_hours', 24);
  v_refund := v_booking.status = 'confirmed'
    and v_booking.deposit_amount > 0
    and v_booking.starts_at - now() >= make_interval(hours => v_window::integer);

  update public.bookings
     set status = 'cancelled',
         cancelled_at = now(),
         cancellation_reason = nullif(p_reason, ''),
         refund_due = v_refund
   where id = v_booking.id;

  return jsonb_build_object('status', 'cancelled', 'refund_due', v_refund);
end;
$$;

revoke all on function public.cancel_booking(text,text) from public, anon, authenticated;
grant execute on function public.cancel_booking(text,text) to service_role;
