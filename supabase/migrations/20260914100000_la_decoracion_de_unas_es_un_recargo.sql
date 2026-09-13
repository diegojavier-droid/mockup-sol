-- La decoracion de uñas es un recargo, no tres servicios
--
-- La planilla tiene nueve lineas de uñas y el sistema tenia tres. Se
-- cargo el primer precio de cada una y se ignoraron seis:
--
--   SEMIPERMANENTE   1 COLOR 17.000   2 UÑAS DECO 18.000   FULL DECO 20.000
--   KAPPING          LISO    19.000   DECO 2      20.000   FULL DECO 22.000
--   SOFT GEL         LISO    22.000   2 DECO      23.000   FULL DECO 25.000
--
-- Leidas como servicios sueltos son nueve. Leidas como lo que son —una
-- base y un recargo por decoracion— son tres servicios y una pregunta,
-- y el recargo es el MISMO en las tres lineas: +1.000 por dos uñas
-- decoradas, +3.000 por todas. Eso no se ve mirando una linea sola; se
-- ve al ponerlas juntas, y es lo que dice como modelarlo.
--
-- La diferencia practica: el dia que Sol cambie el recargo lo cambia en
-- un lugar y no en nueve, y la clienta elige una vez en vez de buscar
-- cual de tres semipermanentes es el suyo.
--
-- LOS MINUTOS QUEDAN EN CERO, Y ES A PROPOSITO
--
-- Decorar todas las uñas lleva mas tiempo que no decorarlas. Cuanto,
-- no lo se: la planilla no trae duraciones, y esta tabla —a diferencia
-- de los tramos de precio— no tiene donde anotar que un numero es
-- estimado. Poner un numero inventado en un lugar que no puede decir
-- que es inventado es exactamente lo que venimos sacando del sistema.
-- Queda en cero y anotado como pregunta para Sol.

-- 1. La pregunta -----------------------------------------------------

insert into public.personalization_fields (category_id, slug, label, field_type, is_required, sort_order)
select c.id, 'decoracion', 'Decoración', 'single_choice', false, 30
  from public.categories c where c.slug = 'unas'
on conflict (category_id, slug) do update
  set label = excluded.label, sort_order = excluded.sort_order, is_active = true;

insert into public.personalization_options (field_id, slug, label, value, sort_order)
select f.id, v.slug, v.label, v.slug, v.orden
  from public.personalization_fields f
  join public.categories c on c.id = f.category_id
  cross join (values
    ('sin-deco',  'Sin decoración',      10),
    ('dos-unas',  'Dos uñas decoradas',  20),
    ('todas',     'Todas decoradas',     30)
  ) as v(slug, label, orden)
 where c.slug = 'unas' and f.slug = 'decoracion'
on conflict (field_id, slug) do update
  set label = excluded.label, sort_order = excluded.sort_order, is_active = true;

-- 2. A que servicios se les pregunta ---------------------------------

insert into public.service_personalization_rules (service_id, field_id, decision)
select s.id, f.id, 'operational'
  from public.services s
  join public.personalization_fields f on f.slug = 'decoracion'
  join public.categories c on c.id = f.category_id and c.slug = 'unas'
 where s.slug in ('semi', 'kapping', 'softgel')
on conflict (service_id, field_id) do update set decision = excluded.decision;

-- 3. Cuanto suma cada respuesta --------------------------------------
--
-- Los importes salen de restar las celdas de la planilla, no de una
-- estimacion: 18.000 - 17.000 = 1.000 y 20.000 - 17.000 = 3.000, y lo
-- mismo da en las otras dos lineas.

insert into public.service_personalization_option_modifiers
  (service_id, field_id, option_id, duration_delta_minutes, price_fixed_amount, price_percentage)
select s.id, f.id, o.id, 0, v.recargo, 0
  from public.services s
  join public.personalization_fields f on f.slug = 'decoracion'
  join public.categories c on c.id = f.category_id and c.slug = 'unas'
  join public.personalization_options o on o.field_id = f.id
  join (values ('sin-deco', 0), ('dos-unas', 1000), ('todas', 3000)) as v(slug, recargo)
    on v.slug = o.slug
 where s.slug in ('semi', 'kapping', 'softgel')
on conflict (service_id, field_id, option_id) do update
  set price_fixed_amount = excluded.price_fixed_amount,
      duration_delta_minutes = excluded.duration_delta_minutes,
      price_percentage = excluded.price_percentage;

-- 4. La reconstruccion de uña ----------------------------------------
--
-- Esta en la planilla a 2.000 y se cobra POR UÑA, asi que en un turno
-- puede ir mas de una vez. No hace falta una columna de cantidad: cada
-- prestacion del turno es una fila con su precio, y tres uñas son tres
-- filas.
--
-- El tiempo —15 minutos— es una referencia del oficio: una uña rota se
-- repara en 10 a 15 minutos. Va marcado como estimado, que es lo que lo
-- deja listado como pendiente hasta que Sol lo corrija.

insert into public.services
  (category_id, slug, name, description, duration_minutes, price_amount, currency, kind, sort_order, is_public, is_active)
select c.id, 'reconstruccion-una', 'Reconstrucción de uña',
       'Se cobra por uña.', 15, 2000, 'ARS', 'servicio', 40, true, true
  from public.categories c where c.slug = 'unas'
on conflict (slug) do update
  set name = excluded.name, description = excluded.description,
      duration_minutes = excluded.duration_minutes, price_amount = excluded.price_amount,
      is_public = excluded.is_public, is_active = excluded.is_active;

insert into public.service_parameters (service_id, price_display_mode, length_affects_price, length_affects_duration)
select s.id, 'fixed', false, false from public.services s where s.slug = 'reconstruccion-una'
on conflict (service_id) do update set price_display_mode = excluded.price_display_mode;

insert into public.service_price_tiers
  (service_id, length_tier, price_main, duration_main_min, process_min,
   source, source_ref, confidence, duration_source, duration_confidence)
select s.id, 'unico', 2000, 15, 0,
       'sol_pricelist', 'Planilla de Sol, bloque UÑAS · tiempo estimado de referencia, a confirmar con Sol',
       'medium', 'industry_baseline', 'low'
  from public.services s where s.slug = 'reconstruccion-una'
on conflict (service_id, length_tier) do update
  set price_main = excluded.price_main, duration_main_min = excluded.duration_main_min,
      source = excluded.source, duration_source = excluded.duration_source;

-- 5. Que el archivo se pruebe a si mismo -----------------------------

do $$
declare
  n integer;
begin
  -- Los nueve precios de la planilla tienen que poder reconstruirse:
  -- base + recargo. Esto es lo que detecta que un recargo quedo mal.
  select count(*) into n
    from (values
      ('semi',    'dos-unas', 18000), ('semi',    'todas', 20000),
      ('kapping', 'dos-unas', 20000), ('kapping', 'todas', 22000),
      ('softgel', 'dos-unas', 23000), ('softgel', 'todas', 25000)
    ) as esperado(slug, opcion, total)
    join public.services s on s.slug = esperado.slug
    join public.service_price_tiers t on t.service_id = s.id and t.length_tier = 'unico'
    join public.personalization_options o on o.slug = esperado.opcion
    join public.service_personalization_option_modifiers m
      on m.service_id = s.id and m.option_id = o.id
   where t.price_main + m.price_fixed_amount is distinct from esperado.total;
  if n <> 0 then
    raise exception '% combinaciones de uñas no dan el precio de la planilla', n;
  end if;

  -- Y la opcion sin decoracion no puede sumar nada.
  select count(*) into n
    from public.service_personalization_option_modifiers m
    join public.personalization_options o on o.id = m.option_id
   where o.slug = 'sin-deco' and m.price_fixed_amount <> 0;
  if n <> 0 then raise exception 'sin decoracion suma plata en % filas', n; end if;

  -- La reconstruccion entra con el precio de la planilla.
  select t.price_main into n
    from public.services s join public.service_price_tiers t on t.service_id = s.id
   where s.slug = 'reconstruccion-una';
  if n is distinct from 2000 then
    raise exception 'la reconstruccion de uña deberia costar 2000, cuesta %', n;
  end if;

  raise notice 'LA DECORACION DE UÑAS ES UN RECARGO: pasa';
end $$;
