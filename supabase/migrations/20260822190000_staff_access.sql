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
