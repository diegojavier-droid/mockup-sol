
-- Switch catalog visibility helper functions to SECURITY INVOKER so they
-- do not run with elevated privileges. Parent tables (categories, services,
-- extras) already enforce identical public-visibility conditions via RLS,
-- so INVOKER preserves correctness for anon/authenticated readers.
CREATE OR REPLACE FUNCTION public.catalog_category_visible(_category_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  select exists (
    select 1 from public.categories c
    where c.id = _category_id
      and c.is_public and c.is_active and c.deleted_at is null
  );
$$;

CREATE OR REPLACE FUNCTION public.catalog_service_visible(_service_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  select exists (
    select 1 from public.services s
    join public.categories c on c.id = s.category_id
    where s.id = _service_id
      and s.is_public and s.is_active and s.deleted_at is null
      and c.is_public and c.is_active and c.deleted_at is null
  );
$$;

CREATE OR REPLACE FUNCTION public.catalog_extra_visible(_extra_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  select exists (
    select 1 from public.extras e
    join public.categories c on c.id = e.category_id
    where e.id = _extra_id
      and e.is_public and e.is_active and e.deleted_at is null
      and c.is_public and c.is_active and c.deleted_at is null
  );
$$;

CREATE OR REPLACE FUNCTION public.catalog_field_visible(_field_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  select exists (
    select 1 from public.personalization_fields f
    join public.categories c on c.id = f.category_id
    where f.id = _field_id
      and f.is_public and f.is_active and f.deleted_at is null
      and c.is_public and c.is_active and c.deleted_at is null
  );
$$;

-- Pin search_path on the trigger helper to prevent mutable-search_path attacks.
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;
