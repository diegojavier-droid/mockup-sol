-- =====================================================================
-- Sol Mai · Leer el registro de cambios
--
-- `audit_log` se viene escribiendo desde el principio: quién, qué, sobre
-- qué, con el valor anterior y la fecha. Y no hay UN SOLO endpoint que
-- lo lea. Un registro que nadie puede consultar no cumple su función:
-- no sirve para entender por qué un número no cierra, ni para saber
-- quién cambió qué.
--
-- Es lo más barato de todo el plan porque el dato ya está. Falta la
-- puerta.
--
-- DOS DECISIONES
--
-- 1. La función devuelve HECHOS, no frases. Resuelve el nombre de quien
--    hizo el cambio y el de la cosa cambiada —sin eso la pantalla
--    mostraría UUIDs— pero no arma el texto. La redacción en castellano
--    vive en el frontend, que es donde se puede cambiar sin migrar la
--    base.
--
-- 2. Sólo lectura, y no existe la contracara. No hay función para
--    editar ni borrar del registro, ni la va a haber: un registro que
--    se puede retocar no sirve para lo único que sirve un registro.
-- =====================================================================

create or replace function public.read_audit_log(
  p_desde       timestamptz default null,
  p_hasta       timestamptz default null,
  p_actor_id    uuid        default null,
  p_entity_type text        default null,
  p_cursor      bigint      default null,
  p_limit       integer     default 50
)
returns table (
  id          bigint,
  cuando      timestamptz,
  actor_id    uuid,
  quien       text,
  es_sistema  boolean,
  accion      text,
  entity_type text,
  entity_id   uuid,
  sobre       text,
  detalle     jsonb
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with pagina as (
    -- Se filtra y se corta ANTES de resolver nombres: las seis uniones
    -- de abajo sólo tienen que mirar las filas que se van a devolver.
    select a.*
      from public.audit_log a
     where (p_desde       is null or a.created_at >= p_desde)
       and (p_hasta       is null or a.created_at <  p_hasta)
       and (p_actor_id    is null or a.actor_id = p_actor_id)
       and (p_entity_type is null or a.entity_type = p_entity_type)
       -- El cursor es el id de la última fila vista. `id` es bigint y
       -- creciente, así que ordenar por él es lo mismo que por fecha,
       -- pero estable cuando dos cambios caen en el mismo instante.
       and (p_cursor      is null or a.id < p_cursor)
     order by a.id desc
     limit least(greatest(coalesce(p_limit, 50), 1), 200)
  )
  select
    p.id,
    p.created_at,
    p.actor_id,
    coalesce(s.display_name, nullif(btrim(coalesce(p.actor_label, '')), ''), 'Sistema'),
    p.actor_id is null,
    p.action,
    p.entity_type,
    p.entity_id,
    case p.entity_type
      when 'booking' then
        nullif(btrim(coalesce(c.first_name, '') || ' · ' ||
          coalesce(to_char(b.starts_at at time zone 'America/Argentina/Cordoba',
                           'DD/MM HH24:MI'), '')), '·')
      when 'customer'     then nullif(btrim(coalesce(cu.first_name, '') || ' ' ||
                                            coalesce(cu.last_name, '')), '')
      when 'staff_member' then sm.display_name
      when 'service'      then sv.name
      when 'product'      then pr.name
      when 'resource'     then rs.name
      else null
    end,
    p.detail
  from pagina p
  left join public.staff_members s  on s.id  = p.actor_id
  left join public.bookings      b  on p.entity_type = 'booking'      and b.id  = p.entity_id
  left join public.customers     c  on c.id  = b.customer_id
  left join public.customers     cu on p.entity_type = 'customer'     and cu.id = p.entity_id
  left join public.staff_members sm on p.entity_type = 'staff_member' and sm.id = p.entity_id
  left join public.services      sv on p.entity_type = 'service'      and sv.id = p.entity_id
  left join public.products      pr on p.entity_type = 'product'      and pr.id = p.entity_id
  left join public.resources     rs on p.entity_type = 'resource'     and rs.id = p.entity_id
  order by p.id desc;
$$;

comment on function public.read_audit_log(timestamptz, timestamptz, uuid, text, bigint, integer) is
  'Lee el registro de cambios, resolviendo el nombre de quien lo hizo y el de la cosa cambiada. Devuelve hechos: la redacción en castellano la arma el frontend. Sólo lectura.';

-- Quiénes aparecen como autores, para poder filtrar por persona sin
-- traerse el registro entero.
create or replace function public.audit_actors()
returns table (actor_id uuid, quien text, cuantos bigint)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select a.actor_id,
         coalesce(s.display_name, nullif(btrim(coalesce(a.actor_label, '')), ''), 'Sistema'),
         count(*)
    from public.audit_log a
    left join public.staff_members s on s.id = a.actor_id
   group by 1, 2
   order by 3 desc;
$$;

revoke all on function public.read_audit_log(timestamptz, timestamptz, uuid, text, bigint, integer)
  from public, anon, authenticated;
revoke all on function public.audit_actors() from public, anon, authenticated;

grant execute on function public.read_audit_log(timestamptz, timestamptz, uuid, text, bigint, integer)
  to service_role;
grant execute on function public.audit_actors() to service_role;
