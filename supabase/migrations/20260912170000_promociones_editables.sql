-- =====================================================================
-- Sol Mai · Las promociones se editan desde el panel
--
-- La migración anterior creó las tablas y sembró la regla que estaba en
-- código. Faltaba lo mismo que le faltaba al catálogo: una puerta de
-- escritura. Sin esto, cambiar una promoción sigue siendo un pedido.
--
-- MISMA FORMA QUE EL CATÁLOGO EDITABLE
--
-- Funciones con SECURITY DEFINER, validación adentro, rastro en
-- `audit_log`, y permiso sólo para `service_role`. No se abre la tabla a
-- escritura directa por la misma razón: una promoción sin disparador o
-- sin beneficio existe y no hace nada, y eso se descubre cuando una
-- clienta no recibe el descuento que la pantalla le prometió.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Alta y edición
-- ---------------------------------------------------------------------
create or replace function public.upsert_promotion(
  p_slug          text,
  p_name          text,
  p_description   text default null,
  p_benefit_kind  text default 'precio_de_agregado',
  p_benefit_value integer default null,
  p_starts_on     date default null,
  p_ends_on       date default null,
  p_is_active     boolean default true,
  p_actor         text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id    uuid;
  v_nueva boolean;
begin
  if p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'El identificador va en minúsculas y con guiones: "%"', p_slug;
  end if;
  if coalesce(btrim(p_name), '') = '' then
    raise exception 'La promoción necesita un nombre: es lo que lee la clienta.';
  end if;
  if p_benefit_kind not in ('precio_de_agregado', 'porcentaje', 'monto_fijo') then
    raise exception 'El beneficio es precio_de_agregado, porcentaje o monto_fijo; llegó "%"',
      p_benefit_kind;
  end if;
  -- El check de la tabla dice lo mismo, pero un error de constraint no se
  -- puede leer: éste sale en castellano y nombra el campo.
  if p_benefit_kind = 'porcentaje' and (p_benefit_value is null or p_benefit_value not between 1 and 100) then
    raise exception 'Un porcentaje va entre 1 y 100.';
  end if;
  if p_benefit_kind = 'monto_fijo' and (p_benefit_value is null or p_benefit_value <= 0) then
    raise exception 'El monto fijo tiene que ser mayor a cero.';
  end if;
  if p_benefit_kind = 'precio_de_agregado' and p_benefit_value is not null then
    raise exception 'El precio de agregado ya está cargado por servicio y largo: no lleva número acá.';
  end if;
  if p_starts_on is not null and p_ends_on is not null and p_ends_on < p_starts_on then
    raise exception 'La promoción no puede terminar antes de empezar.';
  end if;

  select id into v_id from public.promotions where slug = p_slug;
  v_nueva := v_id is null;

  insert into public.promotions (slug, name, description, benefit_kind, benefit_value,
                                 starts_on, ends_on, is_active)
  values (p_slug, btrim(p_name), nullif(btrim(p_description), ''), p_benefit_kind,
          p_benefit_value, p_starts_on, p_ends_on, p_is_active)
  on conflict (slug) do update set
    name = excluded.name, description = excluded.description,
    benefit_kind = excluded.benefit_kind, benefit_value = excluded.benefit_value,
    starts_on = excluded.starts_on, ends_on = excluded.ends_on,
    is_active = excluded.is_active
  returning id into v_id;

  insert into public.audit_log (action, entity_type, entity_id, actor_label, detail)
  values (case when v_nueva then 'promotion.created' else 'promotion.updated' end,
          'promotion', v_id, p_actor,
          jsonb_build_object('slug', p_slug, 'name', p_name,
                             'benefit_kind', p_benefit_kind, 'is_active', p_is_active));
  return v_id;
end $$;

comment on function public.upsert_promotion(text, text, text, text, integer, date, date, boolean, text) is
  'Alta y edición de una promoción. Los dos lados de la regla —qué la '
  'dispara y qué se abarata— se cargan con set_promotion_rule.';

-- ---------------------------------------------------------------------
-- 2. Los dos lados de la regla
--
--    Una sola función para las dos tablas porque son la misma forma con
--    distinto significado, y partirla en cuatro haría que el panel tenga
--    que acordarse de cuál llamar.
-- ---------------------------------------------------------------------
create or replace function public.set_promotion_rule(
  p_slug         text,
  p_lado         text,               -- 'disparador' | 'beneficio'
  p_service_kind text default null,
  p_service_slug text default null,
  p_agregar      boolean default true,
  p_actor        text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_promo   uuid;
  v_service uuid;
begin
  if p_lado not in ('disparador', 'beneficio') then
    raise exception 'El lado es disparador o beneficio; llegó "%"', p_lado;
  end if;
  if (p_service_kind is null) = (p_service_slug is null) then
    raise exception 'Una regla nombra una clase de servicio O un servicio puntual, no las dos ni ninguna.';
  end if;
  if p_service_kind is not null and p_service_kind not in ('servicio', 'color', 'tratamiento') then
    raise exception 'La clase es servicio, color o tratamiento; llegó "%"', p_service_kind;
  end if;

  select id into v_promo from public.promotions where slug = p_slug;
  if v_promo is null then raise exception 'No existe la promoción %', p_slug; end if;

  if p_service_slug is not null then
    select id into v_service from public.services
     where slug = p_service_slug and deleted_at is null;
    if v_service is null then raise exception 'No existe el servicio %', p_service_slug; end if;
  end if;

  if p_lado = 'disparador' then
    if p_agregar then
      insert into public.promotion_triggers (promotion_id, service_kind, service_id)
      select v_promo, p_service_kind, v_service
       where not exists (
         select 1 from public.promotion_triggers t
          where t.promotion_id = v_promo
            and t.service_kind is not distinct from p_service_kind
            and t.service_id is not distinct from v_service);
    else
      delete from public.promotion_triggers t
       where t.promotion_id = v_promo
         and t.service_kind is not distinct from p_service_kind
         and t.service_id is not distinct from v_service;
    end if;
  else
    if p_agregar then
      insert into public.promotion_benefits (promotion_id, service_kind, service_id)
      select v_promo, p_service_kind, v_service
       where not exists (
         select 1 from public.promotion_benefits b
          where b.promotion_id = v_promo
            and b.service_kind is not distinct from p_service_kind
            and b.service_id is not distinct from v_service);
    else
      delete from public.promotion_benefits b
       where b.promotion_id = v_promo
         and b.service_kind is not distinct from p_service_kind
         and b.service_id is not distinct from v_service;
    end if;
  end if;

  insert into public.audit_log (action, entity_type, entity_id, actor_label, detail)
  values (case when p_agregar then 'promotion.rule_added' else 'promotion.rule_removed' end,
          'promotion', v_promo, p_actor,
          jsonb_strip_nulls(jsonb_build_object(
            'slug', p_slug, 'lado', p_lado,
            'service_kind', p_service_kind, 'service_slug', p_service_slug)));
end $$;

-- ---------------------------------------------------------------------
-- 3. Prender, apagar y dar de baja
--
--    Apagar no es borrar. Una promoción que corrió tres meses y se apagó
--    explica turnos viejos; borrarla deja esos precios sin explicación.
-- ---------------------------------------------------------------------
create or replace function public.set_promotion_active(
  p_slug   text,
  p_active boolean,
  p_actor  text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  update public.promotions set is_active = p_active
   where slug = p_slug returning id into v_id;
  if v_id is null then raise exception 'No existe la promoción %', p_slug; end if;

  insert into public.audit_log (action, entity_type, entity_id, actor_label, detail)
  values ('promotion.active_set', 'promotion', v_id, p_actor,
          jsonb_build_object('slug', p_slug, 'is_active', p_active));
end $$;

create or replace function public.delete_promotion(
  p_slug  text,
  p_actor text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  select id into v_id from public.promotions where slug = p_slug;
  if v_id is null then raise exception 'No existe la promoción %', p_slug; end if;

  -- Las reglas caen con ella por `on delete cascade`; la fila de auditoría
  -- queda, que es lo que permite explicar un precio viejo.
  insert into public.audit_log (action, entity_type, entity_id, actor_label, detail)
  values ('promotion.deleted', 'promotion', v_id, p_actor,
          jsonb_build_object('slug', p_slug));

  delete from public.promotions where id = v_id;
end $$;

-- ---------------------------------------------------------------------
-- 4. Sólo el backend las llama
-- ---------------------------------------------------------------------
revoke all on function public.upsert_promotion(text, text, text, text, integer, date, date, boolean, text) from public, anon, authenticated;
revoke all on function public.set_promotion_rule(text, text, text, text, boolean, text) from public, anon, authenticated;
revoke all on function public.set_promotion_active(text, boolean, text) from public, anon, authenticated;
revoke all on function public.delete_promotion(text, text) from public, anon, authenticated;

grant execute on function public.upsert_promotion(text, text, text, text, integer, date, date, boolean, text) to service_role;
grant execute on function public.set_promotion_rule(text, text, text, text, boolean, text) to service_role;
grant execute on function public.set_promotion_active(text, boolean, text) to service_role;
grant execute on function public.delete_promotion(text, text) to service_role;
