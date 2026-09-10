-- =====================================================================
-- Sol Mai · Administrar personas lo gobierna el permiso, no el rol
--
-- EL PROBLEMA QUE CIERRA
--
-- Las rutas de «Usuarios y roles» quedaron declaradas bajo el módulo
-- `usuarios`, pero las funciones que las atienden seguían preguntando
-- `es_duena()`. Mientras sólo la dueña tenga ese módulo no se nota; el
-- día que Sol le dé «Usuarios y roles» a alguien, esa persona ve la
-- pantalla, ve los botones, y cada botón falla con `solo_la_duena`.
--
-- Un permiso que la pantalla ofrece y la base rechaza es peor que no
-- tenerlo: enseña a desconfiar del sistema.
--
-- DÓNDE SE PONE EL LÍMITE
--
-- Quien tiene `usuarios` completo administra a la gente del salón. Lo que
-- NO puede es tocar administradoras: ni nombrar una nueva, ni sacarle el
-- acceso a la que hay, ni quitarle el rol. Eso sigue siendo de Sol.
--
-- Sin ese corte, alguien con `usuarios` podía nombrar administradora a un
-- cómplice y después desactivar a Sol —el trigger de «siempre una dueña»
-- lo habría permitido, porque ya había otra—. Con el corte, las llaves
-- del salón no se pueden duplicar desde adentro.
-- =====================================================================

/**
 * ¿Puede esta persona administrar a la gente del salón?
 * La dueña siempre; los demás, si tienen el módulo completo.
 */
create or replace function public.administra_usuarios(p_staff_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.can(p_staff_id, 'usuarios', 'full');
$$;

/** ¿El rol que se quiere asignar o tocar es el de administradora? */
create or replace function public.es_rol_de_sistema(p_slug text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce((select is_system from public.roles where slug = p_slug), false);
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
  if p_actor_id is null or not public.administra_usuarios(p_actor_id) then
    raise exception 'sin_permiso_usuarios';
  end if;
  if v_email = '' or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'email_invalido';
  end if;
  if p_role is null or not public.rol_asignable(p_role) then
    raise exception 'rol_invalido';
  end if;
  -- Nombrar una administradora nueva es de la dueña.
  if public.es_rol_de_sistema(p_role) and not public.es_duena(p_actor_id) then
    raise exception 'solo_la_duena';
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
  -- Devolverle el acceso a una ex administradora también es de la dueña.
  if v_ya_estuvo and public.es_rol_de_sistema(v_previa.role)
     and not public.es_duena(p_actor_id) then
    raise exception 'solo_la_duena';
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
  if p_actor_id is null or not public.administra_usuarios(p_actor_id) then
    raise exception 'sin_permiso_usuarios';
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

  -- Ni nombrar administradora ni dejar de serlo: las dos puntas del
  -- cambio son de la dueña.
  if (public.es_rol_de_sistema(p_role) or public.es_rol_de_sistema(v.role))
     and not public.es_duena(p_actor_id) then
    raise exception 'solo_la_duena';
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

revoke all on function public.administra_usuarios(uuid) from public, anon, authenticated;
revoke all on function public.es_rol_de_sistema(text) from public, anon, authenticated;
grant execute on function public.administra_usuarios(uuid) to service_role;
grant execute on function public.es_rol_de_sistema(text) to service_role;

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
  if p_actor_id is null or not public.administra_usuarios(p_actor_id) then
    raise exception 'sin_permiso_usuarios';
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

  -- Sacarle o devolverle el acceso a una administradora es de la dueña.
  -- Si no, alguien con «Usuarios y roles» podría dejar el salón sin Sol.
  if public.es_rol_de_sistema(v.role) and not public.es_duena(p_actor_id) then
    raise exception 'solo_la_duena';
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
