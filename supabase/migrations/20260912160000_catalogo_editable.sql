-- =====================================================================
-- Sol Mai · El catálogo se edita, no se migra
--
-- QUÉ PROBLEMA RESUELVE
--
-- Hoy Sol puede cambiarle el precio a un servicio que ya existe, y nada
-- más. No puede darlo de alta, ni renombrarlo, ni moverlo de categoría,
-- ni decir si es un color o un tratamiento, ni cargar cuánto le cuesta.
-- Los 16 tratamientos de su lista entraron por migración: un archivo SQL
-- que escribió un desarrollador.
--
-- Eso convierte cada cambio comercial en un pedido. Las tres preguntas
-- que quedaron abiertas en la reingeniería —si mechas recibe la
-- promoción, cuánto se le paga a la maquilladora, y los cuatro precios de
-- raíz por línea de producto— no son preguntas: son campos que faltan.
--
-- QUÉ AGREGA
--
-- Tres funciones con SECURITY DEFINER, una por operación, que validan y
-- dejan rastro en `audit_log`. No se abre la tabla a escritura directa:
-- el panel entra por acá, con las mismas reglas para todos.
--
-- POR QUÉ FUNCIONES Y NO `grant insert`
--
-- Porque un servicio sin fila en `service_parameters` ni en
-- `service_price_tiers` existe pero no se puede cotizar, y el motor
-- explota recién cuando una clienta intenta reservarlo. Crear las tres
-- filas en una transacción es la única forma de que no exista un servicio
-- a medio nacer.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Costo estándar: lo que le queda al salón
--
--    La columna ya existía y estaba vacía. Lo que faltaba era poder
--    escribirla. El caso que la estrena es la maquilladora tercerizada:
--    la clienta le paga al salón y el salón le paga a ella un fijo por
--    maquillaje, así que es el primer servicio con costo conocido con
--    exactitud en vez de estimado.
-- ---------------------------------------------------------------------
create or replace function public.set_service_cost(
  p_slug    text,
  p_amount  integer,
  p_actor   text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_antes integer;
begin
  if p_amount is not null and p_amount < 0 then
    raise exception 'El costo no puede ser negativo.';
  end if;

  select id into v_id from public.services where slug = p_slug and deleted_at is null;
  if v_id is null then raise exception 'No existe el servicio %', p_slug; end if;

  select standard_cost_amount into v_antes
    from public.service_parameters where service_id = v_id;

  insert into public.service_parameters (service_id, standard_cost_amount, updated_by)
  values (v_id, p_amount, p_actor)
  on conflict (service_id) do update
    set standard_cost_amount = excluded.standard_cost_amount,
        updated_by = excluded.updated_by,
        updated_at = now();

  insert into public.audit_log (action, entity_type, entity_id, actor_label, detail)
  values ('service.cost_set', 'service', v_id, p_actor,
          jsonb_build_object('slug', p_slug, 'antes', v_antes, 'ahora', p_amount));
end $$;

comment on function public.set_service_cost(text, integer, text) is
  'Cuánto le cuesta al salón prestar este servicio. NULL significa "no '
  'sabemos", nunca cero: sin el dato el margen queda NO DISPONIBLE y no se '
  'estima.';

-- ---------------------------------------------------------------------
-- 2. Alta de servicio
--
--    Nace con sus parámetros y con un tier por largo, todos al mismo
--    precio: un servicio sin precio no se puede cotizar, y uno que nace
--    roto es peor que uno que no existe. Sol después ajusta cada largo
--    desde la pantalla de precios, que ya funciona.
-- ---------------------------------------------------------------------
create or replace function public.create_service(
  p_slug        text,
  p_name        text,
  p_category    text,
  p_kind        text,
  p_duration    integer,
  p_price       integer,
  p_description text default null,
  p_is_public   boolean default false,
  p_actor       text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cat uuid;
  v_id  uuid;
  v_tier text;
begin
  if p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'El identificador va en minúsculas y con guiones: "%"', p_slug;
  end if;
  if coalesce(btrim(p_name), '') = '' then
    raise exception 'El servicio necesita un nombre.';
  end if;
  if p_kind not in ('servicio', 'color', 'tratamiento') then
    raise exception 'La clase es servicio, color o tratamiento; llegó "%"', p_kind;
  end if;
  if p_duration is null or p_duration <= 0 then
    raise exception 'La duración tiene que ser mayor a cero.';
  end if;
  if p_price is null or p_price < 0 then
    raise exception 'El precio no puede ser negativo.';
  end if;

  select id into v_cat from public.categories where slug = p_category;
  if v_cat is null then raise exception 'No existe la categoría %', p_category; end if;

  -- Un slug que ya existe pero está borrado se revive en vez de chocar:
  -- Sol no tiene por qué saber que alguna vez existió.
  insert into public.services (category_id, slug, name, description, duration_minutes,
                               price_amount, currency, kind, is_public, is_active)
  values (v_cat, p_slug, btrim(p_name), nullif(btrim(p_description), ''), p_duration,
          p_price, 'ARS', p_kind, p_is_public, true)
  on conflict (slug) do update set
    category_id = excluded.category_id, name = excluded.name,
    description = excluded.description, duration_minutes = excluded.duration_minutes,
    price_amount = excluded.price_amount, kind = excluded.kind,
    is_public = excluded.is_public, is_active = true, deleted_at = null
  returning id into v_id;

  insert into public.service_parameters (service_id, price_display_mode,
                                         length_affects_price, updated_by)
  values (v_id, 'from', true, p_actor)
  on conflict (service_id) do nothing;

  -- Los cuatro largos al mismo precio, marcados como lo que son: un
  -- valor que puso quien dio de alta el servicio, no Sol validándolo.
  foreach v_tier in array array['corto','medio','largo','xl'] loop
    insert into public.service_price_tiers (service_id, length_tier, price_main,
                                            duration_main_min, process_min,
                                            source, source_ref, confidence, updated_by)
    values (v_id, v_tier, p_price, p_duration, 0,
            'sol_adjusted', 'alta desde el panel', 'medium', p_actor)
    on conflict (service_id, length_tier) do nothing;
  end loop;

  insert into public.audit_log (action, entity_type, entity_id, actor_label, detail)
  values ('service.created', 'service', v_id, p_actor,
          jsonb_build_object('slug', p_slug, 'name', p_name, 'kind', p_kind,
                             'category', p_category, 'price', p_price));
  return v_id;
end $$;

-- ---------------------------------------------------------------------
-- 3. Edición y baja
--
--    Baja lógica: `deleted_at`. Un servicio borrado de verdad se llevaría
--    puestos los turnos viejos que lo nombran, y el historial de Sol es
--    justamente lo que el sistema viene a cuidar.
-- ---------------------------------------------------------------------
create or replace function public.update_service(
  p_slug        text,
  p_name        text default null,
  p_description text default null,
  p_category    text default null,
  p_kind        text default null,
  p_is_public   boolean default null,
  p_is_active   boolean default null,
  p_actor       text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_cat uuid;
begin
  select id into v_id from public.services where slug = p_slug and deleted_at is null;
  if v_id is null then raise exception 'No existe el servicio %', p_slug; end if;

  if p_kind is not null and p_kind not in ('servicio', 'color', 'tratamiento') then
    raise exception 'La clase es servicio, color o tratamiento; llegó "%"', p_kind;
  end if;
  if p_category is not null then
    select id into v_cat from public.categories where slug = p_category;
    if v_cat is null then raise exception 'No existe la categoría %', p_category; end if;
  end if;

  update public.services set
    name        = coalesce(nullif(btrim(p_name), ''), name),
    description = case when p_description is null then description
                       else nullif(btrim(p_description), '') end,
    category_id = coalesce(v_cat, category_id),
    kind        = coalesce(p_kind, kind),
    is_public   = coalesce(p_is_public, is_public),
    is_active   = coalesce(p_is_active, is_active)
  where id = v_id;

  insert into public.audit_log (action, entity_type, entity_id, actor_label, detail)
  values ('service.updated', 'service', v_id, p_actor,
          jsonb_strip_nulls(jsonb_build_object(
            'slug', p_slug, 'name', p_name, 'kind', p_kind,
            'category', p_category, 'is_public', p_is_public, 'is_active', p_is_active)));
end $$;

create or replace function public.delete_service(
  p_slug  text,
  p_actor text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  select id into v_id from public.services where slug = p_slug and deleted_at is null;
  if v_id is null then raise exception 'No existe el servicio %', p_slug; end if;

  update public.services
     set deleted_at = now(), is_active = false, is_public = false
   where id = v_id;

  insert into public.audit_log (action, entity_type, entity_id, actor_label, detail)
  values ('service.deleted', 'service', v_id, p_actor,
          jsonb_build_object('slug', p_slug));
end $$;

-- ---------------------------------------------------------------------
-- 4. Sólo el backend las llama
-- ---------------------------------------------------------------------
revoke all on function public.set_service_cost(text, integer, text) from public, anon, authenticated;
revoke all on function public.create_service(text, text, text, text, integer, integer, text, boolean, text) from public, anon, authenticated;
revoke all on function public.update_service(text, text, text, text, text, boolean, boolean, text) from public, anon, authenticated;
revoke all on function public.delete_service(text, text) from public, anon, authenticated;

grant execute on function public.set_service_cost(text, integer, text) to service_role;
grant execute on function public.create_service(text, text, text, text, integer, integer, text, boolean, text) to service_role;
grant execute on function public.update_service(text, text, text, text, text, boolean, boolean, text) to service_role;
grant execute on function public.delete_service(text, text) to service_role;
