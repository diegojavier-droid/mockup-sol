-- =====================================================================
-- Sol Mai · V4.1 Fase 4 — Recursos
--
-- ÁREA ≠ ESTACIÓN ≠ PERSONA.
--
-- Hoy la capacidad es un entero suelto en `areas`. Alcanza para impedir
-- la sexta reserva simultánea en Peluquería, y no alcanza para nada más:
-- no se puede decir a qué sillón va un turno, ni qué estación está fuera
-- de servicio, ni quién atendió.
--
-- Un solo concepto de recurso con dos naturalezas:
--   physical → estación (sillón, camilla, mesa de uñas)
--   human    → profesional
--
-- La asignación es OPCIONAL (D-06). Obligar a elegir sillón en cada alta
-- rompería el alta rápida de mostrador, que es el requisito de adopción
-- más frágil del producto. Mientras no haya asignación, el motor sigue
-- razonando por capacidad de área, exactamente como hoy.
-- =====================================================================

create table if not exists public.resources (
  id         uuid primary key default gen_random_uuid(),
  area_id    uuid not null references public.areas(id) on delete cascade,
  kind       text not null default 'physical' check (kind in ('physical','human')),
  -- Para un recurso humano, a qué persona corresponde.
  staff_id   uuid references public.staff_members(id) on delete set null,
  code       text not null,
  name       text not null,
  sort_order integer not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint resources_code_unique unique (area_id, code),
  -- Un recurso humano sin persona no significa nada.
  constraint resources_human_needs_staff
    check (kind <> 'human' or staff_id is not null)
);

create index if not exists resources_area_idx on public.resources (area_id) where is_active;

revoke all on public.resources from anon, authenticated;
grant all on public.resources to service_role;
alter table public.resources enable row level security;

comment on table public.resources is
  'Recursos del salón. `physical` son estaciones; `human`, profesionales. La capacidad de un área se deriva de sus estaciones activas.';

-- ---------------------------------------------------------------------
-- Las 8 estaciones físicas actuales
-- ---------------------------------------------------------------------

insert into public.resources (area_id, kind, code, name, sort_order)
select a.id, 'physical', v.code, v.name, v.ord
from public.areas a
join (values
  ('peluqueria','P1','Estación 1',1),
  ('peluqueria','P2','Estación 2',2),
  ('peluqueria','P3','Estación 3',3),
  ('peluqueria','P4','Estación 4',4),
  ('peluqueria','P5','Estación 5',5),
  ('maquillaje','M1','Maquillaje',1),
  ('unas',      'U1','Uñas',1),
  ('depilacion','D1','Depilación',1)
) as v(area_slug, code, name, ord) on v.area_slug = a.slug
on conflict (area_id, code) do nothing;

-- ---------------------------------------------------------------------
-- La capacidad del área pasa a derivarse de sus estaciones
-- ---------------------------------------------------------------------
-- Un solo lugar define la capacidad, y crece agregando filas en vez de
-- editando un número. `areas.capacity` se mantiene sincronizada por
-- trigger para no reescribir el motor de disponibilidad, que ya la lee.

create or replace function public.sync_area_capacity()
returns trigger
language plpgsql
as $$
declare
  v_area uuid := coalesce(new.area_id, old.area_id);
begin
  update public.areas a
     set capacity = greatest((
           select count(*) from public.resources r
            where r.area_id = v_area and r.kind = 'physical' and r.is_active
         ), 1),
         updated_at = now()
   where a.id = v_area;
  return null;
end;
$$;

drop trigger if exists resources_sync_capacity on public.resources;
create trigger resources_sync_capacity
  after insert or update or delete on public.resources
  for each row execute function public.sync_area_capacity();

-- Alinear el estado actual con las estaciones recién creadas.
update public.areas a
   set capacity = greatest((
         select count(*) from public.resources r
          where r.area_id = a.id and r.kind = 'physical' and r.is_active
       ), 1);

comment on column public.areas.capacity is
  'Derivada de las estaciones activas del área (trigger resources_sync_capacity). No editar a mano: agregá o desactivá estaciones.';

-- ---------------------------------------------------------------------
-- Estación fuera de servicio
-- ---------------------------------------------------------------------
-- Distinto de desactivarla: es por un rango, con motivo, y la capacidad
-- efectiva del área lo refleja durante ese rango.

create table if not exists public.resource_blocks (
  id          uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources(id) on delete cascade,
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
  reason      text not null,
  created_by  uuid references public.staff_members(id) on delete set null,
  created_at  timestamptz not null default now(),
  constraint resource_blocks_window check (ends_at > starts_at)
);

create index if not exists resource_blocks_window_idx
  on public.resource_blocks using gist (tstzrange(starts_at, ends_at));

revoke all on public.resource_blocks from anon, authenticated;
grant all on public.resource_blocks to service_role;
alter table public.resource_blocks enable row level security;

-- ---------------------------------------------------------------------
-- Asignación opcional en la reserva
-- ---------------------------------------------------------------------

alter table public.bookings
  add column if not exists resource_id uuid references public.resources(id) on delete set null,
  add column if not exists staff_id    uuid references public.staff_members(id) on delete set null;

create index if not exists bookings_resource_idx on public.bookings (resource_id)
  where resource_id is not null;
create index if not exists bookings_staff_idx on public.bookings (staff_id)
  where staff_id is not null;

comment on column public.bookings.resource_id is
  'Estación asignada. NULL es válido: el motor razona por capacidad de área mientras no haya asignación.';

-- ---------------------------------------------------------------------
-- Horarios por profesional
-- ---------------------------------------------------------------------
-- `business_hours` es del SALÓN. En cuanto una reserva se asigna a una
-- persona, la disponibilidad depende del horario de ESA persona: sin
-- esto, asignar produciría disponibilidad falsa (decisión D-09).

create table if not exists public.staff_schedules (
  id         uuid primary key default gen_random_uuid(),
  staff_id   uuid not null references public.staff_members(id) on delete cascade,
  weekday    smallint not null check (weekday between 0 and 6),
  starts_at  time not null,
  ends_at    time not null,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  constraint staff_schedules_order check (ends_at > starts_at)
);

create index if not exists staff_schedules_staff_idx on public.staff_schedules (staff_id)
  where is_active;

revoke all on public.staff_schedules from anon, authenticated;
grant all on public.staff_schedules to service_role;
alter table public.staff_schedules enable row level security;

comment on table public.staff_schedules is
  'Horario de cada persona. Vacío significa "sigue el horario del salón": no se inventa una jornada que Sol no definió.';

-- ---------------------------------------------------------------------
-- Capacidad efectiva contemplando estaciones fuera de servicio
-- ---------------------------------------------------------------------

create or replace function public.effective_area_capacity(
  p_area_id   uuid,
  p_starts_at timestamptz,
  p_ends_at   timestamptz
) returns integer
language sql
stable
security definer
set search_path = public, extensions
as $$
  select greatest(
    (select count(*) from public.resources r
      where r.area_id = p_area_id and r.kind = 'physical' and r.is_active)
    -
    (select count(distinct rb.resource_id)
       from public.resource_blocks rb
       join public.resources r2 on r2.id = rb.resource_id
      where r2.area_id = p_area_id and r2.kind = 'physical' and r2.is_active
        and tstzrange(rb.starts_at, rb.ends_at) && tstzrange(p_starts_at, p_ends_at)),
    0)::integer;
$$;

revoke all on function public.effective_area_capacity(uuid, timestamptz, timestamptz)
  from public, anon, authenticated;
grant execute on function public.effective_area_capacity(uuid, timestamptz, timestamptz)
  to service_role;
