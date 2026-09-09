-- =====================================================================
-- Sol Mai · Que Sol pueda cambiar su salón sin depender de nadie
--
-- Hasta hoy, cambiar un precio, una duración o dar de alta una estación
-- exigía una migración y un deploy. En un país con esta inflación, eso no
-- es una incomodidad: es que Sol no puede subir un precio sin que alguien
-- más intervenga.
--
-- Tres cosas se abren acá: precios y duraciones de servicios, estaciones
-- de trabajo, y el catálogo de productos que Sol vende.
--
-- LO QUE NO SE ABRE, Y POR QUÉ
--
-- La estructura de preguntas de un servicio —los 14 campos de
-- personalización, sus 49 opciones y las 209 reglas que las combinan— NO
-- se toca desde el panel. Una pantalla de edición ingenua ahí rompe la
-- cotización en silencio: la clienta vería un precio que el motor ya no
-- sabe calcular. Editar precio y duración es simple y no puede romper
-- nada más; editar la estructura es otro problema y necesita su propio
-- diseño.
--
-- NADA SE BORRA
--
-- Un servicio o una estación con historia detrás se archiva, no se
-- elimina: los turnos cerrados que la nombran tienen que seguir
-- explicándose. Lo que la persona ve es «sacar de la lista».
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Precio y duración de un servicio
--
-- Se actualiza el tramo de largo indicado —que es de donde la cotización
-- saca el precio real— y además se recalculan los campos de vitrina de
-- `services`, que son los que alimentan el listado público. Si se
-- actualizara sólo uno, el listado y la cotización dirían cosas
-- distintas: exactamente el problema que se acaba de corregir en el
-- front, reapareciendo por otra puerta.
-- ---------------------------------------------------------------------
create or replace function public.set_service_price(
  p_service_slug text,
  p_length_tier  text,
  p_price_main   integer,
  p_duration_min integer,
  p_actor_id     uuid,
  p_actor_label  text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_service   public.services%rowtype;
  v_antes     public.service_price_tiers%rowtype;
begin
  if p_actor_id is null then
    raise exception 'actor_required';
  end if;

  -- Un precio o una duración en cero no son un cambio: son un error de
  -- tipeo que dejaría el servicio incotizable.
  if p_price_main is null or p_price_main <= 0 then
    raise exception 'precio_invalido';
  end if;
  if p_duration_min is null or p_duration_min <= 0 then
    raise exception 'duracion_invalida';
  end if;

  select * into v_service from public.services
   where slug = p_service_slug and deleted_at is null;
  if not found then
    raise exception 'service_not_found';
  end if;

  select * into v_antes from public.service_price_tiers
   where service_id = v_service.id and length_tier = p_length_tier
   for update;
  if not found then
    raise exception 'tier_not_found';
  end if;

  update public.service_price_tiers
     set price_main        = p_price_main,
         duration_main_min = p_duration_min,
         updated_by        = p_actor_label,
         updated_at        = now()
   where service_id = v_service.id and length_tier = p_length_tier;

  -- Vitrina: el listado muestra «desde», así que el mínimo vigente.
  update public.services s
     set price_amount     = (select min(t.price_main)
                               from public.service_price_tiers t
                              where t.service_id = s.id),
         duration_minutes = (select min(t.duration_main_min)
                               from public.service_price_tiers t
                              where t.service_id = s.id),
         updated_at       = now()
   where s.id = v_service.id;

  perform public.record_audit(
    p_actor_id, p_actor_label, 'service_price_changed', 'service', v_service.id,
    jsonb_build_object(
      'slug',            p_service_slug,
      'length_tier',     p_length_tier,
      'precio_anterior', v_antes.price_main,
      'precio_nuevo',    p_price_main,
      'duracion_anterior', v_antes.duration_main_min,
      'duracion_nueva',  p_duration_min
    )
  );

  -- Se devuelve lo anterior para que la pantalla pueda mostrar
  -- «antes → ahora» y ofrecer volver atrás. Deshacer, no confirmar.
  return jsonb_build_object(
    'slug',              p_service_slug,
    'length_tier',       p_length_tier,
    'precio_anterior',   v_antes.price_main,
    'precio_nuevo',      p_price_main,
    'duracion_anterior', v_antes.duration_main_min,
    'duracion_nueva',    p_duration_min
  );
end;
$$;

revoke all on function public.set_service_price(text, text, integer, integer, uuid, text)
  from public, anon, authenticated;
grant execute on function public.set_service_price(text, text, integer, integer, uuid, text)
  to service_role;

-- ---------------------------------------------------------------------
-- 2. Estaciones de trabajo
--
-- Ya se podían asignar y bloquear; faltaba crearlas, renombrarlas y
-- sacarlas de la lista. Si Sol suma un lavatorio, hasta hoy hacía falta
-- un deploy.
-- ---------------------------------------------------------------------
create or replace function public.upsert_station(
  p_area_slug   text,
  p_name        text,
  p_actor_id    uuid,
  p_actor_label text,
  p_station_id  uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_area_id uuid;
  v_id      uuid;
  v_code    text;
  v_n       integer := 1;
  v_nombre  text := btrim(coalesce(p_name, ''));
begin
  if p_actor_id is null then
    raise exception 'actor_required';
  end if;
  if v_nombre = '' then
    raise exception 'nombre_requerido';
  end if;

  select id into v_area_id from public.areas where slug = p_area_slug;
  if v_area_id is null then
    raise exception 'area_not_found';
  end if;

  if p_station_id is not null then
    update public.resources
       set name = v_nombre, updated_at = now()
     where id = p_station_id
     returning id into v_id;
    if v_id is null then
      raise exception 'station_not_found';
    end if;

    perform public.record_audit(
      p_actor_id, p_actor_label, 'station_renamed', 'resource', v_id,
      jsonb_build_object('nombre', v_nombre)
    );
    return jsonb_build_object('id', v_id, 'accion', 'renombrada');
  end if;

  -- `code` es obligatorio y único por área; se deriva del nombre y se
  -- desambigua solo, para que Sol no tenga que inventar un código.
  v_code := nullif(btrim(regexp_replace(lower(v_nombre), '[^a-z0-9]+', '-', 'g'), '-'), '');
  if v_code is null then v_code := 'puesto'; end if;
  while exists (select 1 from public.resources r
                 where r.area_id = v_area_id and r.code = v_code) loop
    v_n := v_n + 1;
    v_code := regexp_replace(v_code, '-[0-9]+$', '') || '-' || v_n;
  end loop;

  insert into public.resources (area_id, kind, code, name, sort_order, is_active)
  values (
    v_area_id, 'physical', v_code, v_nombre,
    coalesce((select max(sort_order) + 1 from public.resources where area_id = v_area_id), 1),
    true
  )
  returning id into v_id;

  perform public.record_audit(
    p_actor_id, p_actor_label, 'station_created', 'resource', v_id,
    jsonb_build_object('nombre', v_nombre, 'area', p_area_slug, 'code', v_code)
  );

  return jsonb_build_object('id', v_id, 'accion', 'creada', 'code', v_code);
end;
$$;

revoke all on function public.upsert_station(text, text, uuid, text, uuid)
  from public, anon, authenticated;
grant execute on function public.upsert_station(text, text, uuid, text, uuid) to service_role;

create or replace function public.set_station_active(
  p_station_id  uuid,
  p_active      boolean,
  p_actor_id    uuid,
  p_actor_label text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_id uuid; v_turnos integer;
begin
  if p_actor_id is null then
    raise exception 'actor_required';
  end if;

  -- Sacar de la lista una estación con turnos futuros asignados los
  -- dejaría sin lugar sin avisarle a nadie. Se rechaza y la pantalla
  -- explica qué hacer.
  if p_active is false then
    select count(*) into v_turnos
      from public.bookings b
     where b.resource_id = p_station_id
       and b.starts_at >= now()
       and b.status in ('confirmed','pending_payment');
    if v_turnos > 0 then
      raise exception 'estacion_con_turnos';
    end if;
  end if;

  update public.resources
     set is_active = p_active, updated_at = now()
   where id = p_station_id
   returning id into v_id;
  if v_id is null then
    raise exception 'station_not_found';
  end if;

  perform public.record_audit(
    p_actor_id, p_actor_label,
    case when p_active then 'station_enabled' else 'station_disabled' end,
    'resource', v_id, jsonb_build_object('activa', p_active)
  );

  return jsonb_build_object('id', v_id, 'activa', p_active);
end;
$$;

revoke all on function public.set_station_active(uuid, boolean, uuid, text)
  from public, anon, authenticated;
grant execute on function public.set_station_active(uuid, boolean, uuid, text) to service_role;

-- ---------------------------------------------------------------------
-- 3. Productos
--
-- Arranca por lo que Sol vende, que es lo que puede sostenerse sin
-- obligar a contar nada. El consumo interno —el que cambia el precio del
-- servicio— se suma después, cuando se construya el cierre por producto.
-- ---------------------------------------------------------------------
create table if not exists public.products (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (length(btrim(name)) > 0),
  brand        text,
  sale_price   integer check (sale_price is null or sale_price > 0),
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.products is
  'Productos que el salón vende. El precio es null cuando todavía no se definió: se prefiere no mostrar precio antes que mostrar uno inventado.';

create unique index if not exists products_nombre_unico
  on public.products (lower(btrim(name)), coalesce(lower(btrim(brand)), ''));

revoke all on public.products from anon, authenticated;
grant all on public.products to service_role;
alter table public.products enable row level security;

create or replace function public.upsert_product(
  p_name        text,
  p_brand       text,
  p_sale_price  integer,
  p_actor_id    uuid,
  p_actor_label text,
  p_product_id  uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_id uuid; v_antes integer; v_nombre text := btrim(coalesce(p_name, ''));
begin
  if p_actor_id is null then
    raise exception 'actor_required';
  end if;
  if v_nombre = '' then
    raise exception 'nombre_requerido';
  end if;
  if p_sale_price is not null and p_sale_price <= 0 then
    raise exception 'precio_invalido';
  end if;

  if p_product_id is not null then
    select sale_price into v_antes from public.products where id = p_product_id;
    update public.products
       set name = v_nombre, brand = nullif(btrim(coalesce(p_brand,'')), ''),
           sale_price = p_sale_price, updated_at = now()
     where id = p_product_id
     returning id into v_id;
    if v_id is null then
      raise exception 'product_not_found';
    end if;
  else
    insert into public.products (name, brand, sale_price)
    values (v_nombre, nullif(btrim(coalesce(p_brand,'')), ''), p_sale_price)
    returning id into v_id;
  end if;

  perform public.record_audit(
    p_actor_id, p_actor_label,
    case when p_product_id is null then 'product_created' else 'product_updated' end,
    'product', v_id,
    jsonb_build_object('nombre', v_nombre, 'precio_anterior', v_antes, 'precio_nuevo', p_sale_price)
  );

  return jsonb_build_object('id', v_id, 'precio_anterior', v_antes, 'precio_nuevo', p_sale_price);
end;
$$;

revoke all on function public.upsert_product(text, text, integer, uuid, text, uuid)
  from public, anon, authenticated;
grant execute on function public.upsert_product(text, text, integer, uuid, text, uuid) to service_role;

create or replace function public.set_product_active(
  p_product_id  uuid,
  p_active      boolean,
  p_actor_id    uuid,
  p_actor_label text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_id uuid;
begin
  if p_actor_id is null then
    raise exception 'actor_required';
  end if;
  update public.products set is_active = p_active, updated_at = now()
   where id = p_product_id returning id into v_id;
  if v_id is null then
    raise exception 'product_not_found';
  end if;
  perform public.record_audit(
    p_actor_id, p_actor_label,
    case when p_active then 'product_enabled' else 'product_disabled' end,
    'product', v_id, jsonb_build_object('activo', p_active)
  );
  return jsonb_build_object('id', v_id, 'activo', p_active);
end;
$$;

revoke all on function public.set_product_active(uuid, boolean, uuid, text)
  from public, anon, authenticated;
grant execute on function public.set_product_active(uuid, boolean, uuid, text) to service_role;
