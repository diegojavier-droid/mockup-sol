-- =====================================================================
-- Sol Mai · Acceso del equipo al panel interno
--
-- Dos roles, como fija el documento maestro (§14.7):
--   owner — administra catálogo, precios, tiempos y horarios.
--   staff — opera agenda, turnos y notas de clienta.
--
-- La autorización real vive en el backend + esta tabla; ocultar botones
-- en el frontend no es una frontera de seguridad (§28).
-- =====================================================================

alter table public.staff_members
  add column email text,
  add column role text not null default 'staff' check (role in ('owner', 'staff'));

create unique index staff_members_email_key
  on public.staff_members (lower(email))
  where email is not null and deleted_at is null;

comment on column public.staff_members.email is
  'Email con el que la persona inicia sesión. Debe además figurar en INTERNAL_AUTH_ALLOWED_EMAILS.';

revoke all on public.staff_members from anon, authenticated;
grant all on public.staff_members to service_role;

-- Resuelve el acceso de un email: sólo personas activas y con rol.
create or replace function public.resolve_staff_access(p_email text)
returns table (staff_id uuid, display_name text, role text)
language sql
stable
security definer
set search_path = public
as $$
  select id, display_name, role
  from public.staff_members
  where email is not null
    and lower(email) = lower(btrim(p_email))
    and is_active
    and deleted_at is null
  limit 1;
$$;

revoke all on function public.resolve_staff_access(text) from public, anon, authenticated;
grant execute on function public.resolve_staff_access(text) to service_role;

-- ---------------------------------------------------------------------
-- Arranque en frío: la primera dueña tiene que poder entrar
-- ---------------------------------------------------------------------
-- Una instalación limpia no tiene ninguna fila de staff con email, y
-- `resolve_staff_access` exige una. Sin esto el panel queda inaccesible
-- para todo el mundo y no hay forma de configurar el sistema salvo
-- editando la base a mano.
--
-- El permiso lo da INTERNAL_AUTH_ALLOWED_EMAILS, que sólo controla quien
-- despliega: el backend llama a esta función únicamente con un email que
-- ya pasó ese filtro y que además probó su identidad contra Supabase
-- Auth. La función se cierra sola en cuanto existe alguien: es un
-- arranque en frío, no un alta de usuarios. Al equipo lo da de alta la
-- dueña desde el panel.

create or replace function public.provision_initial_owner(
  p_email        text,
  p_display_name text default null
)
returns table (staff_id uuid, display_name text, role text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id   uuid;
  v_slug text;
  v_try  text;
  v_n    integer := 1;
begin
  if p_email is null or btrim(p_email) = '' then
    raise exception 'email_required';
  end if;

  -- Sólo cuando el sistema todavía no tiene a nadie que pueda entrar.
  if exists (
    select 1 from public.staff_members s
    where s.email is not null and s.is_active and s.deleted_at is null
  ) then
    return;
  end if;

  -- `slug` es obligatorio y con formato; se deriva del email y se
  -- desambigua si ya existe una persona dada de baja con ese slug.
  v_slug := btrim(
    regexp_replace(lower(split_part(btrim(p_email), '@', 1)), '[^a-z0-9]+', '-', 'g'),
    '-'
  );
  if v_slug = '' then
    v_slug := 'owner';
  end if;

  v_try := v_slug;
  while exists (select 1 from public.staff_members s where s.slug = v_try) loop
    v_n := v_n + 1;
    v_try := v_slug || '-' || v_n;
  end loop;

  insert into public.staff_members (slug, display_name, email, role, is_active)
  values (
    v_try,
    coalesce(nullif(btrim(p_display_name), ''), split_part(btrim(p_email), '@', 1)),
    btrim(p_email),
    'owner',
    true
  )
  returning id into v_id;

  return query
    select s.id, s.display_name, s.role
    from public.staff_members s
    where s.id = v_id;
end;
$$;

revoke all on function public.provision_initial_owner(text, text) from public, anon, authenticated;
grant execute on function public.provision_initial_owner(text, text) to service_role;
