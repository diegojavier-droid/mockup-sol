-- =====================================================================
-- Sol Mai · Quién puede entrar al panel, administrado desde el panel
--
-- EL AGUJERO QUE CIERRA
--
-- Hasta hoy no existía UNA SOLA escritura a `staff_members` en todo el
-- backend. Sumar a alguien era: editar un secreto en GitHub, desplegar,
-- y meter una fila a mano por SQL. Sacarlo, lo mismo al revés.
--
-- La migración que creó los roles (20260822190000) ya prometía «al
-- equipo lo da de alta la dueña desde el panel». Esa pantalla nunca se
-- construyó, y la consecuencia real es que el día que alguien deja el
-- salón, sacarle el acceso depende de que estemos nosotros disponibles.
-- Eso no puede ser: es la clave de la puerta de un negocio.
--
-- DÓNDE VIVEN LOS PERMISOS
--
-- Estas funciones verifican el rol de quien las llama, además del guard
-- de la ruta HTTP. Es a propósito y no es redundancia inútil: la ruta
-- protege el camino que conocemos, la función protege la tabla. Si
-- mañana alguien agrega otro camino de escritura y se olvida del
-- middleware, acá se frena igual.
--
-- LA INVARIANTE QUE NO SE NEGOCIA
--
-- El salón no puede quedar sin ninguna dueña activa. Eso no se resuelve
-- con un `if` en TypeScript ni sólo en estas funciones: va como trigger
-- sobre la tabla, para que aguante también un UPDATE escrito a mano —
-- que es exactamente la forma en que alguien se dejaría afuera.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. La invariante, en la tabla
-- ---------------------------------------------------------------------
create or replace function public.staff_members_siempre_una_duena()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Sólo importa cuando la fila que cambió ERA una dueña activa. Sin
  -- esta condición, una base recién construida —que todavía no tiene
  -- ninguna dueña porque nadie inició sesión— no podría borrar ni una
  -- fila de prueba, y el clean-room dejaría de pasar por un motivo que
  -- no tiene nada que ver con lo que se está protegiendo.
  if not (old.role = 'owner' and old.is_active and old.deleted_at is null) then
    return null;
  end if;

  if not exists (
    select 1 from public.staff_members
    where role = 'owner' and is_active and deleted_at is null
  ) then
    raise exception 'sin_duena';
  end if;

  return null;
end;
$$;

comment on function public.staff_members_siempre_una_duena() is
  'Impide que el salón quede sin ninguna dueña activa. Se dispara sólo cuando la fila afectada era una dueña activa, para no molestar en una base sin nadie.';

drop trigger if exists staff_members_siempre_una_duena on public.staff_members;

-- INMEDIATO, no diferido, y la diferencia importa.
--
-- Diferido, el error aparece recién al cerrar la transacción y sin decir
-- qué línea lo causó. Como este guard existe justamente para atajar un
-- UPDATE escrito a mano por una persona en una consola, tiene que fallar
-- donde está el error.
--
-- El costo es que hay que promover a la nueva dueña ANTES de degradar a
-- la anterior, y no al revés. Es el orden seguro de todos modos; y quien
-- necesite el otro puede pedir `SET CONSTRAINTS ... DEFERRED` a
-- propósito, que es exactamente la clase de decisión que conviene que
-- sea explícita.
create constraint trigger staff_members_siempre_una_duena
  after update or delete on public.staff_members
  deferrable initially immediate
  for each row execute function public.staff_members_siempre_una_duena();

-- ---------------------------------------------------------------------
-- 2. Ayudantes
-- ---------------------------------------------------------------------
create or replace function public.es_duena(p_staff_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.staff_members
    where id = p_staff_id and role = 'owner' and is_active and deleted_at is null
  );
$$;

/** Deriva un slug único a partir del email, como el arranque en frío. */
create or replace function public.slug_de_email(p_email text)
returns text
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_base text;
  v_try  text;
  v_n    integer := 1;
begin
  v_base := btrim(
    regexp_replace(lower(split_part(btrim(p_email), '@', 1)), '[^a-z0-9]+', '-', 'g'),
    '-'
  );
  if v_base = '' then
    v_base := 'persona';
  end if;

  v_try := v_base;
  while exists (select 1 from public.staff_members s where s.slug = v_try) loop
    v_n := v_n + 1;
    v_try := v_base || '-' || v_n;
  end loop;
  return v_try;
end;
$$;

-- ---------------------------------------------------------------------
-- 3. Sumar a alguien
-- ---------------------------------------------------------------------
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
  if p_role is null or p_role not in ('owner', 'staff') then
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

-- ---------------------------------------------------------------------
-- 4. Sacar y devolver el acceso
-- ---------------------------------------------------------------------
create or replace function public.set_staff_active(
  p_staff_id    uuid,
  p_active      boolean,
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
  if p_staff_id = p_actor_id then
    -- No es sólo cuidado: una dueña que se saca a sí misma pierde la
    -- pantalla donde arreglarlo, y el error queda sin salida.
    raise exception 'no_a_vos_misma';
  end if;

  select * into v from public.staff_members where id = p_staff_id;
  if not found then
    raise exception 'persona_no_encontrada';
  end if;
  if v.is_active = p_active and v.deleted_at is null then
    return jsonb_build_object('id', v.id, 'activa', p_active, 'sin_cambios', true);
  end if;

  update public.staff_members
     set is_active = p_active, deleted_at = null, updated_at = now()
   where id = p_staff_id;

  insert into public.audit_log (actor_id, actor_label, action, entity_type, entity_id, detail)
  values (p_actor_id, p_actor_label,
          case when p_active then 'staff_access_restored' else 'staff_access_revoked' end,
          'staff_member', p_staff_id,
          jsonb_build_object('email', v.email, 'rol', v.role));

  return jsonb_build_object('id', p_staff_id, 'activa', p_active, 'sin_cambios', false);
end;
$$;

-- ---------------------------------------------------------------------
-- 5. Cambiar el rol
-- ---------------------------------------------------------------------
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
  if p_staff_id = p_actor_id then
    raise exception 'no_a_vos_misma';
  end if;
  if p_role is null or p_role not in ('owner', 'staff') then
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

-- ---------------------------------------------------------------------
-- 6. La lista, para la pantalla
-- ---------------------------------------------------------------------
create or replace function public.list_staff_members()
returns table (
  id uuid, display_name text, email text, role text,
  is_active boolean, created_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select s.id, s.display_name, s.email, s.role,
         s.is_active and s.deleted_at is null, s.created_at
    from public.staff_members s
   where s.email is not null
   order by (s.is_active and s.deleted_at is null) desc, s.display_name;
$$;

revoke all on function public.staff_members_siempre_una_duena() from public, anon, authenticated;
revoke all on function public.es_duena(uuid) from public, anon, authenticated;
revoke all on function public.slug_de_email(text) from public, anon, authenticated;
revoke all on function public.invite_staff_member(text, text, text, uuid, text) from public, anon, authenticated;
revoke all on function public.set_staff_active(uuid, boolean, uuid, text) from public, anon, authenticated;
revoke all on function public.set_staff_role(uuid, text, uuid, text) from public, anon, authenticated;
revoke all on function public.list_staff_members() from public, anon, authenticated;

grant execute on function public.invite_staff_member(text, text, text, uuid, text) to service_role;
grant execute on function public.set_staff_active(uuid, boolean, uuid, text) to service_role;
grant execute on function public.set_staff_role(uuid, text, uuid, text) to service_role;
grant execute on function public.list_staff_members() to service_role;
