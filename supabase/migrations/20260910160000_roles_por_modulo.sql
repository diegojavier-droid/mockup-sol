-- =====================================================================
-- Sol Mai · Roles por módulo
--
-- Hasta acá había dos roles fijos en el código: `owner` y `staff`.
-- Alcanzaban cuando el panel tenía una pantalla. Con nueve módulos,
-- «quien atiende» pasó a significar demasiadas cosas, y no había manera
-- de decir «esta persona sí ve Inventario y no ve Compras» sin tocar
-- código y desplegar.
--
-- LA REGLA QUE ORDENA LA MIGRACIÓN
--
-- Nadie gana ni pierde acceso al aplicar esto. Los dos roles nuevos
-- reproducen EXACTAMENTE lo que hoy puede hacer cada uno; a partir de
-- ahí Sol cambia lo que quiera. Un cambio de permisos que ocurre solo,
-- sin que nadie lo decida, es la peor forma de romper la confianza en un
-- sistema de permisos.
--
-- TRES NIVELES Y NO MÁS
--
-- `none`, `view`, `full`. La tentación es hacer permisos por acción
-- —«puede cancelar pero no reprogramar»—; eso produce una pantalla que
-- nadie entiende y que Sol no va a mantener. Tres niveles por módulo se
-- explican en una frase y cubren lo que un salón necesita.
-- =====================================================================

create table public.roles (
  slug       text primary key check (slug ~ '^[a-z][a-z0-9-]{1,30}$'),
  name       text not null check (btrim(name) <> ''),
  -- Los roles del sistema no se editan ni se borran: `owner` es el que
  -- sostiene la invariante de que el salón siempre tenga administradora.
  is_system  boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.role_permissions (
  role_slug text not null references public.roles(slug) on delete cascade,
  module    text not null check (module in (
              'calendario','clientas','finanzas','inventario','servicios',
              'personal','compras','usuarios','configuracion')),
  level     text not null check (level in ('none','view','full')),
  primary key (role_slug, module)
);

alter table public.roles            enable row level security;
alter table public.role_permissions enable row level security;
revoke all on public.roles            from anon, authenticated;
revoke all on public.role_permissions from anon, authenticated;
grant all on public.roles            to service_role;
grant all on public.role_permissions to service_role;

-- ---------------------------------------------------------------------
-- Los dos roles que ya existían, ahora explícitos
-- ---------------------------------------------------------------------
insert into public.roles (slug, name, is_system) values
  ('owner',     'Administradora', true),
  ('mostrador', 'Mostrador',      false);

-- La administradora ve y hace todo. Es un rol del sistema justamente
-- para que esto no se pueda recortar por accidente.
insert into public.role_permissions (role_slug, module, level)
select 'owner', m, 'full'
  from unnest(array['calendario','clientas','finanzas','inventario','servicios',
                    'personal','compras','usuarios','configuracion']) m;

-- Mostrador: exactamente lo que HOY puede hacer el rol `staff`, medido
-- sobre las rutas que no estaban detrás de `requireOwner()`. Calendario
-- y Clientas completos; nada más. Ni un permiso de regalo.
insert into public.role_permissions (role_slug, module, level) values
  ('mostrador','calendario','full'),
  ('mostrador','clientas','full'),
  ('mostrador','finanzas','none'),
  ('mostrador','inventario','none'),
  ('mostrador','servicios','none'),
  ('mostrador','personal','none'),
  ('mostrador','compras','none'),
  ('mostrador','usuarios','none'),
  ('mostrador','configuracion','none');

-- ---------------------------------------------------------------------
-- `staff_members.role` deja de ser un enum y pasa a apuntar a `roles`
-- ---------------------------------------------------------------------
update public.staff_members set role = 'mostrador' where role = 'staff';

alter table public.staff_members drop constraint if exists staff_members_role_check;
alter table public.staff_members
  add constraint staff_members_role_fkey
  foreign key (role) references public.roles(slug);

-- ---------------------------------------------------------------------
-- La pregunta que hace el servidor en cada pedido
-- ---------------------------------------------------------------------
create or replace function public.can(p_staff_id uuid, p_module text, p_level text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
      from public.staff_members s
      join public.role_permissions rp on rp.role_slug = s.role
     where s.id = p_staff_id
       and s.is_active
       and s.deleted_at is null
       and rp.module = p_module
       -- `full` alcanza para todo; `view` sólo para mirar. Escrito así y
       -- no con un orden numérico para que agregar un nivel obligue a
       -- pensar acá y no herede un comportamiento por accidente.
       and (rp.level = 'full' or (p_level = 'view' and rp.level = 'view'))
  );
$$;

/** La sesión entera en una sola consulta: quién es y qué puede. */
create or replace function public.resolve_staff_session(p_email text)
returns table (staff_id uuid, display_name text, role text, role_name text, permisos jsonb)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select s.id, s.display_name, s.role, r.name,
         coalesce((select jsonb_object_agg(rp.module, rp.level)
                     from public.role_permissions rp
                    where rp.role_slug = s.role), '{}'::jsonb)
    from public.staff_members s
    join public.roles r on r.slug = s.role
   where s.email is not null
     and lower(s.email) = lower(btrim(p_email))
     and s.is_active
     and s.deleted_at is null
   limit 1;
$$;

-- ---------------------------------------------------------------------
-- Administrar los roles
-- ---------------------------------------------------------------------
create or replace function public.list_roles()
returns table (slug text, name text, is_system boolean, personas bigint, permisos jsonb)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select r.slug, r.name, r.is_system,
         (select count(*) from public.staff_members s
           where s.role = r.slug and s.is_active and s.deleted_at is null),
         coalesce((select jsonb_object_agg(rp.module, rp.level)
                     from public.role_permissions rp where rp.role_slug = r.slug),
                  '{}'::jsonb)
    from public.roles r
   order by r.is_system desc, r.name;
$$;

create or replace function public.set_role_permission(
  p_role_slug   text,
  p_module      text,
  p_level       text,
  p_actor_id    uuid,
  p_actor_label text default null
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_antes text;
  v_sys   boolean;
begin
  if p_actor_id is null or not public.can(p_actor_id, 'usuarios', 'full') then
    raise exception 'sin_permiso_usuarios';
  end if;
  if p_level not in ('none','view','full') then
    raise exception 'nivel_invalido';
  end if;

  select is_system into v_sys from public.roles where slug = p_role_slug;
  if not found then raise exception 'rol_no_encontrado'; end if;
  if v_sys then
    -- Si se le pudiera sacar un módulo a la administradora, el sistema
    -- quedaría sin nadie que pueda arreglarlo.
    raise exception 'rol_del_sistema';
  end if;

  select level into v_antes from public.role_permissions
   where role_slug = p_role_slug and module = p_module;
  if not found then raise exception 'modulo_no_encontrado'; end if;
  if v_antes = p_level then
    return jsonb_build_object('rol', p_role_slug, 'modulo', p_module,
                              'nivel', p_level, 'sin_cambios', true);
  end if;

  update public.role_permissions set level = p_level
   where role_slug = p_role_slug and module = p_module;

  insert into public.audit_log (actor_id, actor_label, action, entity_type, entity_id, detail)
  values (p_actor_id, p_actor_label, 'role_permission_changed', 'role', null,
          jsonb_build_object('rol', p_role_slug, 'modulo', p_module,
                             'nivel_anterior', v_antes, 'nivel_nuevo', p_level));

  return jsonb_build_object('rol', p_role_slug, 'modulo', p_module,
                            'nivel', p_level, 'sin_cambios', false);
end;
$$;

create or replace function public.create_role(
  p_name        text,
  p_actor_id    uuid,
  p_actor_label text default null
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_slug text;
  v_try  text;
  v_n    integer := 1;
begin
  if p_actor_id is null or not public.can(p_actor_id, 'usuarios', 'full') then
    raise exception 'sin_permiso_usuarios';
  end if;
  if p_name is null or btrim(p_name) = '' then raise exception 'nombre_requerido'; end if;

  v_slug := btrim(regexp_replace(lower(btrim(p_name)), '[^a-z0-9]+', '-', 'g'), '-');
  if v_slug = '' or v_slug !~ '^[a-z]' then v_slug := 'rol-' || v_slug; end if;
  v_slug := left(v_slug, 28);
  v_try := v_slug;
  while exists (select 1 from public.roles where slug = v_try) loop
    v_n := v_n + 1;
    v_try := left(v_slug, 26) || '-' || v_n;
  end loop;

  insert into public.roles (slug, name) values (v_try, btrim(p_name));
  -- Nace sin ver nada. Un rol nuevo que arranca abierto es un permiso
  -- que nadie decidió dar.
  insert into public.role_permissions (role_slug, module, level)
  select v_try, m, 'none'
    from unnest(array['calendario','clientas','finanzas','inventario','servicios',
                      'personal','compras','usuarios','configuracion']) m;

  insert into public.audit_log (actor_id, actor_label, action, entity_type, entity_id, detail)
  values (p_actor_id, p_actor_label, 'role_created', 'role', null,
          jsonb_build_object('rol', v_try, 'nombre', btrim(p_name)));

  return jsonb_build_object('slug', v_try, 'name', btrim(p_name));
end;
$$;

create or replace function public.delete_role(
  p_slug        text,
  p_actor_id    uuid,
  p_actor_label text default null
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_sys boolean; v_n integer;
begin
  if p_actor_id is null or not public.can(p_actor_id, 'usuarios', 'full') then
    raise exception 'sin_permiso_usuarios';
  end if;
  select is_system into v_sys from public.roles where slug = p_slug;
  if not found then raise exception 'rol_no_encontrado'; end if;
  if v_sys then raise exception 'rol_del_sistema'; end if;

  select count(*) into v_n from public.staff_members
   where role = p_slug and deleted_at is null;
  if v_n > 0 then raise exception 'rol_en_uso'; end if;

  delete from public.roles where slug = p_slug;

  insert into public.audit_log (actor_id, actor_label, action, entity_type, entity_id, detail)
  values (p_actor_id, p_actor_label, 'role_deleted', 'role', null,
          jsonb_build_object('rol', p_slug));

  return jsonb_build_object('slug', p_slug, 'borrado', true);
end;
$$;

revoke all on function public.can(uuid, text, text) from public, anon, authenticated;
revoke all on function public.resolve_staff_session(text) from public, anon, authenticated;
revoke all on function public.list_roles() from public, anon, authenticated;
revoke all on function public.set_role_permission(text, text, text, uuid, text) from public, anon, authenticated;
revoke all on function public.create_role(text, uuid, text) from public, anon, authenticated;
revoke all on function public.delete_role(text, uuid, text) from public, anon, authenticated;

grant execute on function public.can(uuid, text, text) to service_role;
grant execute on function public.resolve_staff_session(text) to service_role;
grant execute on function public.list_roles() to service_role;
grant execute on function public.set_role_permission(text, text, text, uuid, text) to service_role;
grant execute on function public.create_role(text, uuid, text) to service_role;
grant execute on function public.delete_role(text, uuid, text) to service_role;

-- =====================================================================
-- Lo que esta misma migración rompió, arreglado acá
--
-- `staff_members.role` no era un campo suelto: tenía default 'staff' y
-- dos funciones lo validaban contra la lista fija ('owner','staff'). Al
-- convertirlo en clave foránea contra `roles`, ese slug dejó de existir
-- y quedaron tres agujeros que sólo se ven ejecutando:
--
--   · un alta sin rol explícito falla por la FK;
--   · invitar a alguien como `mostrador` da `rol_invalido`, o sea que
--     no se puede invitar a NADIE que no sea administradora;
--   · cambiarle el rol a alguien, lo mismo.
--
-- Las tres las encontró scripts/sql-tests/roles-por-modulo.sql (bloque
-- G) contra PostgreSQL de verdad. Leyendo el diff no se veían: el
-- `create or replace` de la migración anterior compila igual.
-- =====================================================================

alter table public.staff_members alter column role set default 'mostrador';

/**
 * ¿Se puede asignar este rol? Un solo lugar donde preguntarlo, para que
 * agregar un rol no obligue a acordarse de dos listas escritas a mano.
 */
create or replace function public.rol_asignable(p_slug text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.roles where slug = p_slug);
$$;

create or replace function public.invite_staff_member(
  p_email        text,
  p_display_name text,
  p_role         text,
  p_actor_id     uuid,
  p_actor_label  text default null
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_email  text := lower(btrim(coalesce(p_email, '')));
  v_nombre text := nullif(btrim(coalesce(p_display_name, '')), '');
  v_id     uuid;
  v_previa public.staff_members%rowtype;
  -- `FOUND` lo pisa CUALQUIER sentencia posterior —el INSERT de más
  -- abajo, sin ir más lejos—, así que se guarda apenas se consulta. Sin
  -- esto, a una persona nueva se le informaba «reingreso» y la pantalla
  -- le decía «le devolvimos el acceso» a alguien que nunca estuvo.
  v_ya_estuvo boolean;
begin
  if p_actor_id is null or not public.es_duena(p_actor_id) then
    raise exception 'solo_la_duena';
  end if;
  if v_email = '' or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'email_invalido';
  end if;
  -- Antes acá había una lista fija. Ahora la verdad está en `roles`.
  if p_role is null or not public.rol_asignable(p_role) then
    raise exception 'rol_invalido';
  end if;

  -- Alguien que ya estuvo y se fue vuelve sobre su misma fila: así
  -- conserva su historial y el índice único de email no estorba.
  select * into v_previa
    from public.staff_members
   where lower(email) = v_email
   limit 1;
  v_ya_estuvo := found;

  if v_ya_estuvo and v_previa.is_active and v_previa.deleted_at is null then
    raise exception 'ya_esta';
  end if;

  if v_ya_estuvo then
    update public.staff_members
       set is_active    = true,
           deleted_at   = null,
           role         = p_role,
           display_name = coalesce(v_nombre, display_name),
           updated_at   = now()
     where id = v_previa.id;
    v_id := v_previa.id;
  else
    insert into public.staff_members (slug, display_name, email, role, is_active)
    values (public.slug_de_email(v_email),
            coalesce(v_nombre, split_part(v_email, '@', 1)),
            v_email, p_role, true)
    returning id into v_id;
  end if;

  insert into public.audit_log (actor_id, actor_label, action, entity_type, entity_id, detail)
  values (p_actor_id, p_actor_label, 'staff_invited', 'staff_member', v_id,
          jsonb_build_object('email', v_email, 'rol', p_role,
                             'reingreso', v_ya_estuvo));

  return jsonb_build_object('id', v_id, 'reingreso', v_ya_estuvo);
end;
$$;

create or replace function public.set_staff_role(
  p_staff_id    uuid,
  p_role        text,
  p_actor_id    uuid,
  p_actor_label text default null
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v public.staff_members%rowtype;
begin
  if p_actor_id is null or not public.es_duena(p_actor_id) then
    raise exception 'solo_la_duena';
  end if;
  -- Sacarse a una misma la administración es la forma más rápida de
  -- dejar el salón sin nadie que pueda arreglarlo.
  if p_staff_id = p_actor_id then
    raise exception 'no_a_vos_misma';
  end if;
  if p_role is null or not public.rol_asignable(p_role) then
    raise exception 'rol_invalido';
  end if;

  select * into v from public.staff_members where id = p_staff_id;
  if not found then
    raise exception 'persona_no_encontrada';
  end if;
  if v.role = p_role then
    return jsonb_build_object('id', v.id, 'rol', p_role, 'sin_cambios', true);
  end if;

  update public.staff_members
     set role = p_role, updated_at = now()
   where id = p_staff_id;

  insert into public.audit_log (actor_id, actor_label, action, entity_type, entity_id, detail)
  values (p_actor_id, p_actor_label, 'staff_role_changed', 'staff_member', p_staff_id,
          jsonb_build_object('email', v.email, 'rol_anterior', v.role, 'rol_nuevo', p_role));

  return jsonb_build_object('id', p_staff_id, 'rol', p_role, 'sin_cambios', false);
end;
$$;

-- `delete_role` contaba sólo a la gente activa, pero la clave foránea
-- cuenta a todas las filas. Un rol que hoy sólo usa alguien que ya no
-- trabaja acá pasaba el guard y después reventaba con el error crudo de
-- PostgreSQL. Una persona que se fue conserva el rol que tenía —es parte
-- de su historial—, así que ese rol tampoco se borra: se dice
-- `rol_en_uso`, que es lo que la pantalla sabe mostrar.
create or replace function public.delete_role(
  p_slug        text,
  p_actor_id    uuid,
  p_actor_label text default null
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_sys boolean; v_n integer;
begin
  if p_actor_id is null or not public.can(p_actor_id, 'usuarios', 'full') then
    raise exception 'sin_permiso_usuarios';
  end if;
  select is_system into v_sys from public.roles where slug = p_slug;
  if not found then raise exception 'rol_no_encontrado'; end if;
  if v_sys then raise exception 'rol_del_sistema'; end if;

  select count(*) into v_n from public.staff_members where role = p_slug;
  if v_n > 0 then raise exception 'rol_en_uso'; end if;

  delete from public.roles where slug = p_slug;

  insert into public.audit_log (actor_id, actor_label, action, entity_type, entity_id, detail)
  values (p_actor_id, p_actor_label, 'role_deleted', 'role', null,
          jsonb_build_object('rol', p_slug));

  return jsonb_build_object('slug', p_slug, 'borrado', true);
end;
$$;

revoke all on function public.rol_asignable(text) from public, anon, authenticated;
grant execute on function public.rol_asignable(text) to service_role;
