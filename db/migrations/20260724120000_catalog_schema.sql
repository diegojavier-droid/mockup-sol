-- =====================================================================
-- Sol Mai Peluquería · Phase 1 · Block 3
-- Catalog schema (public catalog only — no reservations / payments yet).
--
-- Design notes:
--   * PKs are uuid; a UNIQUE `slug` column is the stable public identifier
--     used by the API and referenced by the seed. That keeps historical
--     compatibility with mock IDs (e.g. "corte-fem") without exposing
--     database uuids to the browser.
--   * `is_public` gates whether a row is returned by the public read-only
--     Data API (RLS anon policies). `is_active` gates operational
--     visibility. A row must be BOTH to be shown publicly.
--   * `deleted_at` implements soft delete. Anon policies exclude deleted
--     rows; service_role bypasses RLS and can restore them.
--   * Every public table receives explicit GRANT SELECT to anon and
--     authenticated plus narrow SELECT policies. Writes are never granted
--     to anon. service_role has ALL (defensive; RLS is bypassed anyway).
--   * Extras are category-scoped (matches current mock). `service_extras`
--     supports future per-service overrides; currently unused by seed.
--   * staff_members / staff_specialties / business_hours have no mock
--     data yet (business hours live in the frontend availability mock).
--     The tables ship empty so Block 4+ can seed / RLS them without
--     another migration.
-- =====================================================================

set search_path = public;

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------
create table public.categories (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null,
  name          text not null,
  tagline       text,
  emoji         text,
  sort_order    integer not null default 0,
  is_public     boolean not null default true,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  constraint categories_slug_key unique (slug),
  constraint categories_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint categories_name_not_blank check (length(btrim(name)) > 0)
);

grant select on public.categories to anon;
grant select on public.categories to authenticated;
grant all    on public.categories to service_role;

alter table public.categories enable row level security;

create policy "categories_public_read"
  on public.categories for select
  to anon, authenticated
  using (is_public and is_active and deleted_at is null);

-- ---------------------------------------------------------------------
-- services
-- ---------------------------------------------------------------------
create table public.services (
  id                 uuid primary key default gen_random_uuid(),
  category_id        uuid not null references public.categories(id) on delete restrict,
  slug               text not null,
  name               text not null,
  description        text,
  duration_minutes   integer not null,
  price_amount       integer not null,  -- whole ARS (no decimals)
  currency           text not null default 'ARS',
  tag                text,
  sort_order         integer not null default 0,
  is_public          boolean not null default true,
  is_active          boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  deleted_at         timestamptz,
  constraint services_slug_key unique (slug),
  constraint services_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint services_duration_positive check (duration_minutes > 0),
  constraint services_price_non_negative check (price_amount >= 0),
  constraint services_currency_format check (currency ~ '^[A-Z]{3}$'),
  constraint services_tag_allowed check (
    tag is null or tag in ('popular','combinado','tratamiento','color','evento')
  )
);

create index services_category_id_idx on public.services (category_id);
create index services_public_active_idx
  on public.services (category_id, sort_order)
  where is_public and is_active and deleted_at is null;

grant select on public.services to anon;
grant select on public.services to authenticated;
grant all    on public.services to service_role;

alter table public.services enable row level security;

create policy "services_public_read"
  on public.services for select
  to anon, authenticated
  using (is_public and is_active and deleted_at is null);

-- ---------------------------------------------------------------------
-- extras
-- ---------------------------------------------------------------------
create table public.extras (
  id                     uuid primary key default gen_random_uuid(),
  category_id            uuid not null references public.categories(id) on delete restrict,
  slug                   text not null,
  name                   text not null,
  duration_delta_minutes integer not null default 0,
  price_amount           integer not null default 0,
  currency               text not null default 'ARS',
  sort_order             integer not null default 0,
  is_public              boolean not null default true,
  is_active              boolean not null default true,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  deleted_at             timestamptz,
  constraint extras_slug_key unique (slug),
  constraint extras_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint extras_duration_non_negative check (duration_delta_minutes >= 0),
  constraint extras_price_non_negative check (price_amount >= 0),
  constraint extras_currency_format check (currency ~ '^[A-Z]{3}$')
);

create index extras_category_id_idx on public.extras (category_id);

grant select on public.extras to anon;
grant select on public.extras to authenticated;
grant all    on public.extras to service_role;

alter table public.extras enable row level security;

create policy "extras_public_read"
  on public.extras for select
  to anon, authenticated
  using (is_public and is_active and deleted_at is null);

-- ---------------------------------------------------------------------
-- service_extras (per-service overrides; empty in Block 3)
-- ---------------------------------------------------------------------
create table public.service_extras (
  service_id  uuid not null references public.services(id) on delete cascade,
  extra_id    uuid not null references public.extras(id)   on delete cascade,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  primary key (service_id, extra_id)
);

create index service_extras_extra_id_idx on public.service_extras (extra_id);

grant select on public.service_extras to anon;
grant select on public.service_extras to authenticated;
grant all    on public.service_extras to service_role;

alter table public.service_extras enable row level security;

create policy "service_extras_public_read"
  on public.service_extras for select
  to anon, authenticated
  using (is_active);

-- ---------------------------------------------------------------------
-- personalization_fields
-- ---------------------------------------------------------------------
create table public.personalization_fields (
  id           uuid primary key default gen_random_uuid(),
  category_id  uuid not null references public.categories(id) on delete restrict,
  slug         text not null,
  label        text not null,
  field_type   text not null default 'single_choice',
  is_required  boolean not null default false,
  sort_order   integer not null default 0,
  is_public    boolean not null default true,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  constraint personalization_fields_slug_key unique (category_id, slug),
  constraint personalization_fields_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint personalization_fields_type_allowed
    check (field_type in ('single_choice','multi_choice','text'))
);

create index personalization_fields_category_id_idx
  on public.personalization_fields (category_id, sort_order);

grant select on public.personalization_fields to anon;
grant select on public.personalization_fields to authenticated;
grant all    on public.personalization_fields to service_role;

alter table public.personalization_fields enable row level security;

create policy "personalization_fields_public_read"
  on public.personalization_fields for select
  to anon, authenticated
  using (is_public and is_active and deleted_at is null);

-- ---------------------------------------------------------------------
-- personalization_options
-- ---------------------------------------------------------------------
create table public.personalization_options (
  id           uuid primary key default gen_random_uuid(),
  field_id     uuid not null references public.personalization_fields(id) on delete cascade,
  slug         text not null,
  label        text not null,
  value        text not null,
  sort_order   integer not null default 0,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint personalization_options_slug_key unique (field_id, slug),
  constraint personalization_options_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create index personalization_options_field_id_idx
  on public.personalization_options (field_id, sort_order);

grant select on public.personalization_options to anon;
grant select on public.personalization_options to authenticated;
grant all    on public.personalization_options to service_role;

alter table public.personalization_options enable row level security;

create policy "personalization_options_public_read"
  on public.personalization_options for select
  to anon, authenticated
  using (is_active);

-- ---------------------------------------------------------------------
-- staff_members  (empty in Block 3; kept for Block 4+)
-- ---------------------------------------------------------------------
create table public.staff_members (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null,
  display_name  text not null,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  constraint staff_members_slug_key unique (slug),
  constraint staff_members_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

-- Staff data is internal-only for now: no anon grants, no anon policies.
grant select, insert, update on public.staff_members to authenticated;
grant all on public.staff_members to service_role;
alter table public.staff_members enable row level security;

-- ---------------------------------------------------------------------
-- staff_specialties
-- ---------------------------------------------------------------------
create table public.staff_specialties (
  id           uuid primary key default gen_random_uuid(),
  staff_id     uuid not null references public.staff_members(id) on delete cascade,
  category_id  uuid references public.categories(id) on delete cascade,
  service_id   uuid references public.services(id)   on delete cascade,
  priority     integer not null default 0,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  constraint staff_specialties_scope_check
    check (category_id is not null or service_id is not null)
);

create index staff_specialties_staff_id_idx    on public.staff_specialties (staff_id);
create index staff_specialties_category_id_idx on public.staff_specialties (category_id);
create index staff_specialties_service_id_idx  on public.staff_specialties (service_id);

grant select, insert, update on public.staff_specialties to authenticated;
grant all on public.staff_specialties to service_role;
alter table public.staff_specialties enable row level security;

-- ---------------------------------------------------------------------
-- business_hours
-- ---------------------------------------------------------------------
create table public.business_hours (
  id         uuid primary key default gen_random_uuid(),
  weekday    smallint not null,
  opens_at   time not null,
  closes_at  time not null,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_hours_weekday_range check (weekday between 0 and 6),
  constraint business_hours_time_order check (closes_at > opens_at),
  constraint business_hours_weekday_key unique (weekday)
);

grant select on public.business_hours to anon;
grant select on public.business_hours to authenticated;
grant all    on public.business_hours to service_role;

alter table public.business_hours enable row level security;

create policy "business_hours_public_read"
  on public.business_hours for select
  to anon, authenticated
  using (is_active);

-- ---------------------------------------------------------------------
-- updated_at trigger helper
-- ---------------------------------------------------------------------
create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'categories','services','extras',
      'personalization_fields','personalization_options',
      'staff_members','business_hours'
    ])
  loop
    execute format(
      'create trigger %I_set_updated_at before update on public.%I
         for each row execute function public.tg_set_updated_at()',
      t, t
    );
  end loop;
end$$;
