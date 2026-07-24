-- =====================================================================
-- Sol Mai · Fase 1 · Bloque 3.1 · Catálogo público read-only (schema)
-- Aplicación en base real (Bloque 3.2). Contenido versionado en
-- supabase/migrations/20260724120000_catalog_schema.sql.
-- =====================================================================

set search_path = public;

create extension if not exists "pgcrypto";
create extension if not exists "btree_gist";

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

create table public.services (
  id                 uuid primary key default gen_random_uuid(),
  category_id        uuid not null references public.categories(id) on delete restrict,
  slug               text not null,
  name               text not null,
  description        text,
  duration_minutes   integer not null,
  price_amount       integer not null,
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
  constraint services_tag_shape
    check (tag is null or (length(btrim(tag)) between 1 and 32
                           and tag ~ '^[a-z0-9]+(-[a-z0-9]+)*$'))
);
create index services_category_id_idx on public.services (category_id);
create index services_public_active_idx
  on public.services (category_id, sort_order)
  where is_public and is_active and deleted_at is null;
grant select on public.services to anon;
grant select on public.services to authenticated;
grant all    on public.services to service_role;
alter table public.services enable row level security;

create table public.extras (
  id                     uuid primary key default gen_random_uuid(),
  category_id            uuid not null references public.categories(id) on delete restrict,
  code                   text not null,
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
  constraint extras_code_key unique (category_id, code),
  constraint extras_slug_key unique (slug),
  constraint extras_code_format check (code ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
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

create table public.service_personalization_rules (
  service_id  uuid not null references public.services(id) on delete cascade,
  field_id    uuid not null references public.personalization_fields(id) on delete cascade,
  decision    text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (service_id, field_id),
  constraint service_personalization_rules_decision_allowed
    check (decision in ('operational','contextual','not_applicable'))
);
create index service_personalization_rules_field_idx
  on public.service_personalization_rules (field_id);
grant select on public.service_personalization_rules to anon;
grant select on public.service_personalization_rules to authenticated;
grant all    on public.service_personalization_rules to service_role;
alter table public.service_personalization_rules enable row level security;

create table public.service_personalization_option_modifiers (
  service_id              uuid not null references public.services(id) on delete cascade,
  field_id                uuid not null references public.personalization_fields(id) on delete cascade,
  option_id               uuid not null references public.personalization_options(id) on delete cascade,
  duration_delta_minutes  integer      not null default 0,
  price_fixed_amount      integer      not null default 0,
  price_percentage        numeric(5,2) not null default 0,
  created_at              timestamptz  not null default now(),
  updated_at              timestamptz  not null default now(),
  primary key (service_id, field_id, option_id),
  constraint spom_duration_non_negative check (duration_delta_minutes >= 0),
  constraint spom_price_non_negative    check (price_fixed_amount >= 0),
  constraint spom_percentage_range      check (price_percentage >= 0 and price_percentage <= 100),
  constraint spom_rule_fk foreign key (service_id, field_id)
    references public.service_personalization_rules(service_id, field_id) on delete cascade
);
create index spom_field_idx  on public.service_personalization_option_modifiers (field_id);
create index spom_option_idx on public.service_personalization_option_modifiers (option_id);
grant select on public.service_personalization_option_modifiers to anon;
grant select on public.service_personalization_option_modifiers to authenticated;
grant all    on public.service_personalization_option_modifiers to service_role;
alter table public.service_personalization_option_modifiers enable row level security;

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
grant all on public.staff_members to service_role;
alter table public.staff_members enable row level security;

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
grant all on public.staff_specialties to service_role;
alter table public.staff_specialties enable row level security;

create table public.business_hours (
  id         uuid primary key default gen_random_uuid(),
  weekday    smallint not null,
  opens_at   time not null,
  closes_at  time not null,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_hours_weekday_range check (weekday between 0 and 6),
  constraint business_hours_time_order   check (closes_at > opens_at),
  constraint business_hours_no_overlap
    exclude using gist (
      weekday with =,
      tsrange(('2000-01-01'::date + opens_at), ('2000-01-01'::date + closes_at)) with &&
    ) where (is_active)
);
create index business_hours_weekday_idx on public.business_hours (weekday, opens_at);
grant select on public.business_hours to anon;
grant select on public.business_hours to authenticated;
grant all    on public.business_hours to service_role;
alter table public.business_hours enable row level security;

create or replace function public.catalog_category_visible(_category_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.categories c
    where c.id = _category_id
      and c.is_public and c.is_active and c.deleted_at is null
  );
$$;

create or replace function public.catalog_service_visible(_service_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.services s
    join public.categories c on c.id = s.category_id
    where s.id = _service_id
      and s.is_public and s.is_active and s.deleted_at is null
      and c.is_public and c.is_active and c.deleted_at is null
  );
$$;

create or replace function public.catalog_extra_visible(_extra_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.extras e
    join public.categories c on c.id = e.category_id
    where e.id = _extra_id
      and e.is_public and e.is_active and e.deleted_at is null
      and c.is_public and c.is_active and c.deleted_at is null
  );
$$;

create or replace function public.catalog_field_visible(_field_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.personalization_fields f
    join public.categories c on c.id = f.category_id
    where f.id = _field_id
      and f.is_public and f.is_active and f.deleted_at is null
      and c.is_public and c.is_active and c.deleted_at is null
  );
$$;

revoke all on function public.catalog_category_visible(uuid) from public;
revoke all on function public.catalog_service_visible(uuid)  from public;
revoke all on function public.catalog_extra_visible(uuid)    from public;
revoke all on function public.catalog_field_visible(uuid)    from public;
grant execute on function public.catalog_category_visible(uuid) to anon, authenticated, service_role;
grant execute on function public.catalog_service_visible(uuid)  to anon, authenticated, service_role;
grant execute on function public.catalog_extra_visible(uuid)    to anon, authenticated, service_role;
grant execute on function public.catalog_field_visible(uuid)    to anon, authenticated, service_role;

create policy "categories_public_read"
  on public.categories for select
  to anon, authenticated
  using (is_public and is_active and deleted_at is null);

create policy "services_public_read"
  on public.services for select
  to anon, authenticated
  using (
    is_public and is_active and deleted_at is null
    and public.catalog_category_visible(category_id)
  );

create policy "extras_public_read"
  on public.extras for select
  to anon, authenticated
  using (
    is_public and is_active and deleted_at is null
    and public.catalog_category_visible(category_id)
  );

create policy "personalization_fields_public_read"
  on public.personalization_fields for select
  to anon, authenticated
  using (
    is_public and is_active and deleted_at is null
    and public.catalog_category_visible(category_id)
  );

create policy "personalization_options_public_read"
  on public.personalization_options for select
  to anon, authenticated
  using (
    is_active
    and public.catalog_field_visible(field_id)
  );

create policy "service_personalization_rules_public_read"
  on public.service_personalization_rules for select
  to anon, authenticated
  using (
    public.catalog_service_visible(service_id)
    and public.catalog_field_visible(field_id)
  );

create policy "spom_public_read"
  on public.service_personalization_option_modifiers for select
  to anon, authenticated
  using (
    public.catalog_service_visible(service_id)
    and public.catalog_field_visible(field_id)
  );

create policy "business_hours_public_read"
  on public.business_hours for select
  to anon, authenticated
  using (is_active);

create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  for t in
    select unnest(array[
      'categories','services','extras',
      'personalization_fields','personalization_options',
      'service_personalization_rules',
      'service_personalization_option_modifiers',
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