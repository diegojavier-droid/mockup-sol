-- =====================================================================
-- Sol Mai · El catálogo real del salón
--
-- QUÉ CORRIGE
--
-- El sistema publicaba 43 servicios con nombres genéricos de peluquería
-- —«hidratación profunda», «reconstrucción», «claritos»— y el salón cobra
-- por nombre de marca de producto: karseell, riflessi, magic water, shock
-- de keratina. No era un problema de estética: una clienta que entraba a
-- la web no encontraba lo que iba a ir a hacerse.
--
-- Los emparejamientos los confirmó Sol el 2026-09-12 (§8.7 de
-- docs/sol-mai-reingenieria.md):
--
--   baño de luz      = tono sobre tono
--   reparación       = máscara repair
--   hidratación      = magic water
--   reconstrucción   = shock de keratina
--   recogido         = peinados
--   babylights y claritos se agrupan bajo mechas
--
-- Y una corrección suya: Karseell NO es reconstrucción —es colágeno, y
-- funciona como nutrición profunda—, así que va como servicio propio. Es
-- el tratamiento con más volumen del salón: 39 tickets en tres meses.
--
-- DE DÓNDE SALEN LOS PRECIOS
--
-- De la hoja `servicios` de precios.xlsx, columnas de efectivo. Quedan
-- marcados `source = 'sol_pricelist'` y `confidence = 'medium'`, que es
-- el vocabulario que el esquema ya tenía para decir «salió de la lista de
-- Sol pero ella todavía no lo confirmó». Transcribir su lista no es
-- inventar negocio: es copiarla. Recién cuando ella los mire pasan a
-- `sol_validated`, y `GET /admin/pending-values` se los va a listar todos
-- porque filtra por eso mismo.
--
-- POR QUÉ LOS TRATAMIENTOS NUEVOS NO SALEN PUBLICADOS
--
-- Porque no tengo las duraciones y no se inventan. `duration_minutes` no
-- acepta nulo, así que lleva una estimación uniforme; publicarlos online
-- con ese número sería ofrecer turnos de una duración que nadie validó, y
-- un turno mal medido descoloca la agenda del día entero.
--
-- Entran `is_active = true` y `is_public = false`: existen para el
-- mostrador y para la lista de precios, y se publican cuando Sol diga
-- cuánto tarda cada uno.
--
-- PRECIO SOLO Y PRECIO CON COLOR
--
-- `price_addon` es la promoción del salón a quien se lleva color y
-- tratamiento juntos. Donde la lista de Sol no tiene ese precio, la
-- columna queda NULL: significa «no hay promoción para esto», no cero.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Los que se agrupan: babylights y claritos pasan a ser Mechas
--
--    Decisión de Sol: «ambas técnicas son variantes de mechas, así que
--    podés agruparlas bajo ese nombre general». No se borran —una
--    reserva vieja puede apuntarlos— se sacan de circulación.
-- ---------------------------------------------------------------------
update public.services
   set is_public = false, is_active = false
 where slug in ('babylights', 'claritos');

-- ---------------------------------------------------------------------
-- 2. Los que cambian de nombre para llevar los dos
--
--    El genérico orienta a quien no conoce; el de marca es el que pide
--    la clienta habitual, y el 63% de la facturación viene de clientas
--    que vuelven. Sacarles la palabra con la que piden sería un error.
-- ---------------------------------------------------------------------
update public.services set name = 'Baño de luz (Tono sobre tono)', description = 'Coloración semipermanente sin amoníaco: da brillo y reaviva el tono sin tocar la base.'
 where slug = 'bano-luz';
update public.services set name = 'Hidratación profunda (Magic Water)', description = 'Devuelve el agua y la humedad natural al pelo seco.'
 where slug = 'hidratacion';
update public.services set name = 'Reconstrucción (Shock de keratina)', description = 'Proteína pura para reponer masa capilar en pelo dañado.'
 where slug = 'reconstruccion';
update public.services set name = 'Reparación (Máscara repair)', description = 'Sella la cutícula y restaura el daño externo.'
 where slug = 'reparacion';

-- ---------------------------------------------------------------------
-- 3. Los tratamientos que el salón cobra y el sistema no tenía
-- ---------------------------------------------------------------------
insert into public.services (category_id, slug, name, description, duration_minutes,
                             price_amount, currency, tag, sort_order, is_public, is_active, kind)
  select id, 'ampolla', 'Ampolla', null, 45,
         20000, 'ARS', 'tratamiento', 100, false, true, 'tratamiento'
    from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set
    name = excluded.name, price_amount = excluded.price_amount,
    kind = excluded.kind, is_active = excluded.is_active, deleted_at = null;
insert into public.services (category_id, slug, name, description, duration_minutes,
                             price_amount, currency, tag, sort_order, is_public, is_active, kind)
  select id, 'biotina', 'Biotina', null, 45,
         25000, 'ARS', 'tratamiento', 101, false, true, 'tratamiento'
    from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set
    name = excluded.name, price_amount = excluded.price_amount,
    kind = excluded.kind, is_active = excluded.is_active, deleted_at = null;
insert into public.services (category_id, slug, name, description, duration_minutes,
                             price_amount, currency, tag, sort_order, is_public, is_active, kind)
  select id, 'karseell', 'Karseell', null, 45,
         20000, 'ARS', 'tratamiento', 102, false, true, 'tratamiento'
    from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set
    name = excluded.name, price_amount = excluded.price_amount,
    kind = excluded.kind, is_active = excluded.is_active, deleted_at = null;
insert into public.services (category_id, slug, name, description, duration_minutes,
                             price_amount, currency, tag, sort_order, is_public, is_active, kind)
  select id, 'plasma', 'Plasma', null, 45,
         22000, 'ARS', 'tratamiento', 103, false, true, 'tratamiento'
    from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set
    name = excluded.name, price_amount = excluded.price_amount,
    kind = excluded.kind, is_active = excluded.is_active, deleted_at = null;
insert into public.services (category_id, slug, name, description, duration_minutes,
                             price_amount, currency, tag, sort_order, is_public, is_active, kind)
  select id, 'riflessi', 'Riflessi', null, 45,
         21000, 'ARS', 'tratamiento', 104, false, true, 'tratamiento'
    from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set
    name = excluded.name, price_amount = excluded.price_amount,
    kind = excluded.kind, is_active = excluded.is_active, deleted_at = null;
insert into public.services (category_id, slug, name, description, duration_minutes,
                             price_amount, currency, tag, sort_order, is_public, is_active, kind)
  select id, 'color-shine', 'Color Shine', null, 45,
         25000, 'ARS', 'tratamiento', 105, false, true, 'tratamiento'
    from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set
    name = excluded.name, price_amount = excluded.price_amount,
    kind = excluded.kind, is_active = excluded.is_active, deleted_at = null;
insert into public.services (category_id, slug, name, description, duration_minutes,
                             price_amount, currency, tag, sort_order, is_public, is_active, kind)
  select id, 'fusion', 'Fusión Wella', null, 45,
         22000, 'ARS', 'tratamiento', 106, false, true, 'tratamiento'
    from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set
    name = excluded.name, price_amount = excluded.price_amount,
    kind = excluded.kind, is_active = excluded.is_active, deleted_at = null;
insert into public.services (category_id, slug, name, description, duration_minutes,
                             price_amount, currency, tag, sort_order, is_public, is_active, kind)
  select id, 'sow-express', 'Sow Express', null, 45,
         21000, 'ARS', 'tratamiento', 107, false, true, 'tratamiento'
    from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set
    name = excluded.name, price_amount = excluded.price_amount,
    kind = excluded.kind, is_active = excluded.is_active, deleted_at = null;
insert into public.services (category_id, slug, name, description, duration_minutes,
                             price_amount, currency, tag, sort_order, is_public, is_active, kind)
  select id, 'mascara-magic', 'Máscara Magic', null, 45,
         18000, 'ARS', 'tratamiento', 108, false, true, 'tratamiento'
    from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set
    name = excluded.name, price_amount = excluded.price_amount,
    kind = excluded.kind, is_active = excluded.is_active, deleted_at = null;
insert into public.services (category_id, slug, name, description, duration_minutes,
                             price_amount, currency, tag, sort_order, is_public, is_active, kind)
  select id, 'filler-repair', 'Filler + Repair', null, 45,
         23000, 'ARS', 'tratamiento', 109, false, true, 'tratamiento'
    from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set
    name = excluded.name, price_amount = excluded.price_amount,
    kind = excluded.kind, is_active = excluded.is_active, deleted_at = null;
insert into public.services (category_id, slug, name, description, duration_minutes,
                             price_amount, currency, tag, sort_order, is_public, is_active, kind)
  select id, 'filler-magic', 'Filler + Magic Water', null, 45,
         25000, 'ARS', 'tratamiento', 110, false, true, 'tratamiento'
    from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set
    name = excluded.name, price_amount = excluded.price_amount,
    kind = excluded.kind, is_active = excluded.is_active, deleted_at = null;
insert into public.services (category_id, slug, name, description, duration_minutes,
                             price_amount, currency, tag, sort_order, is_public, is_active, kind)
  select id, 'vitamin-repair', 'Vitamin Repair / Elixir Sow', null, 45,
         27000, 'ARS', 'tratamiento', 111, false, true, 'tratamiento'
    from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set
    name = excluded.name, price_amount = excluded.price_amount,
    kind = excluded.kind, is_active = excluded.is_active, deleted_at = null;
insert into public.services (category_id, slug, name, description, duration_minutes,
                             price_amount, currency, tag, sort_order, is_public, is_active, kind)
  select id, 'liss-biocell', 'Liss Biocell', null, 45,
         40000, 'ARS', 'tratamiento', 112, false, true, 'tratamiento'
    from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set
    name = excluded.name, price_amount = excluded.price_amount,
    kind = excluded.kind, is_active = excluded.is_active, deleted_at = null;
insert into public.services (category_id, slug, name, description, duration_minutes,
                             price_amount, currency, tag, sort_order, is_public, is_active, kind)
  select id, 'control-frizz', 'Control Frizz', null, 45,
         32000, 'ARS', 'tratamiento', 113, false, true, 'tratamiento'
    from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set
    name = excluded.name, price_amount = excluded.price_amount,
    kind = excluded.kind, is_active = excluded.is_active, deleted_at = null;
insert into public.services (category_id, slug, name, description, duration_minutes,
                             price_amount, currency, tag, sort_order, is_public, is_active, kind)
  select id, 'aminofusion', 'Aminofusión', null, 45,
         25000, 'ARS', 'tratamiento', 114, false, true, 'tratamiento'
    from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set
    name = excluded.name, price_amount = excluded.price_amount,
    kind = excluded.kind, is_active = excluded.is_active, deleted_at = null;
insert into public.services (category_id, slug, name, description, duration_minutes,
                             price_amount, currency, tag, sort_order, is_public, is_active, kind)
  select id, 'aka-moa', 'Aka Moa', null, 45,
         22000, 'ARS', 'tratamiento', 115, false, true, 'tratamiento'
    from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set
    name = excluded.name, price_amount = excluded.price_amount,
    kind = excluded.kind, is_active = excluded.is_active, deleted_at = null;

-- ---------------------------------------------------------------------
-- 4. El largo cambia el precio de todos ellos
-- ---------------------------------------------------------------------
insert into public.service_parameters (service_id, price_display_mode, length_affects_price, length_affects_duration)
  select id, 'from', true, false from public.services where slug = 'ampolla'
  on conflict (service_id) do update set length_affects_price = true;
insert into public.service_parameters (service_id, price_display_mode, length_affects_price, length_affects_duration)
  select id, 'from', true, false from public.services where slug = 'biotina'
  on conflict (service_id) do update set length_affects_price = true;
insert into public.service_parameters (service_id, price_display_mode, length_affects_price, length_affects_duration)
  select id, 'from', true, false from public.services where slug = 'karseell'
  on conflict (service_id) do update set length_affects_price = true;
insert into public.service_parameters (service_id, price_display_mode, length_affects_price, length_affects_duration)
  select id, 'from', true, false from public.services where slug = 'plasma'
  on conflict (service_id) do update set length_affects_price = true;
insert into public.service_parameters (service_id, price_display_mode, length_affects_price, length_affects_duration)
  select id, 'from', true, false from public.services where slug = 'riflessi'
  on conflict (service_id) do update set length_affects_price = true;
insert into public.service_parameters (service_id, price_display_mode, length_affects_price, length_affects_duration)
  select id, 'from', true, false from public.services where slug = 'color-shine'
  on conflict (service_id) do update set length_affects_price = true;
insert into public.service_parameters (service_id, price_display_mode, length_affects_price, length_affects_duration)
  select id, 'from', true, false from public.services where slug = 'fusion'
  on conflict (service_id) do update set length_affects_price = true;
insert into public.service_parameters (service_id, price_display_mode, length_affects_price, length_affects_duration)
  select id, 'from', true, false from public.services where slug = 'sow-express'
  on conflict (service_id) do update set length_affects_price = true;
insert into public.service_parameters (service_id, price_display_mode, length_affects_price, length_affects_duration)
  select id, 'from', true, false from public.services where slug = 'mascara-magic'
  on conflict (service_id) do update set length_affects_price = true;
insert into public.service_parameters (service_id, price_display_mode, length_affects_price, length_affects_duration)
  select id, 'from', true, false from public.services where slug = 'filler-repair'
  on conflict (service_id) do update set length_affects_price = true;
insert into public.service_parameters (service_id, price_display_mode, length_affects_price, length_affects_duration)
  select id, 'from', true, false from public.services where slug = 'filler-magic'
  on conflict (service_id) do update set length_affects_price = true;
insert into public.service_parameters (service_id, price_display_mode, length_affects_price, length_affects_duration)
  select id, 'from', true, false from public.services where slug = 'vitamin-repair'
  on conflict (service_id) do update set length_affects_price = true;
insert into public.service_parameters (service_id, price_display_mode, length_affects_price, length_affects_duration)
  select id, 'from', true, false from public.services where slug = 'liss-biocell'
  on conflict (service_id) do update set length_affects_price = true;
insert into public.service_parameters (service_id, price_display_mode, length_affects_price, length_affects_duration)
  select id, 'from', true, false from public.services where slug = 'control-frizz'
  on conflict (service_id) do update set length_affects_price = true;
insert into public.service_parameters (service_id, price_display_mode, length_affects_price, length_affects_duration)
  select id, 'from', true, false from public.services where slug = 'aminofusion'
  on conflict (service_id) do update set length_affects_price = true;
insert into public.service_parameters (service_id, price_display_mode, length_affects_price, length_affects_duration)
  select id, 'from', true, false from public.services where slug = 'aka-moa'
  on conflict (service_id) do update set length_affects_price = true;

-- ---------------------------------------------------------------------
-- 5. Precio solo y precio con color, por largo
--
--    `duration_main_min` es una estimación uniforme: Sol no dio
--    duraciones. `duration_addon_min` es menor porque el tratamiento se
--    aplica durante el color, con la clienta ya sentada.
-- ---------------------------------------------------------------------
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'corto', 22000, null, 45, null, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'aka-moa'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'medio', 25000, null, 45, null, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'aka-moa'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'largo', 28000, null, 45, null, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'aka-moa'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'xl', 32000, null, 45, null, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'aka-moa'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'corto', 25000, null, 45, null, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'aminofusion'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'medio', 28000, null, 45, null, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'aminofusion'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'largo', 32000, null, 45, null, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'aminofusion'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'xl', 35000, null, 45, null, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'aminofusion'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'corto', 20000, 7000, 45, 15, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'ampolla'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'medio', 22000, 8000, 45, 15, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'ampolla'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'largo', 25000, 9000, 45, 15, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'ampolla'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'xl', 28000, 10000, 45, 15, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'ampolla'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'corto', 25000, 9000, 45, 15, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'biotina'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'medio', 32000, 10000, 45, 15, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'biotina'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'largo', 36000, 12000, 45, 15, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'biotina'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'xl', 40000, 14000, 45, 15, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'biotina'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'corto', 18000, 6000, 45, 15, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'botox'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'medio', 20000, 7000, 45, 15, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'botox'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'largo', 23000, 9000, 45, 15, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'botox'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'xl', 26000, 10000, 45, 15, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'botox'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'corto', 25000, 12000, 45, 15, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'color-shine'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'medio', 30000, 14000, 45, 15, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'color-shine'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'largo', 34000, 15000, 45, 15, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'color-shine'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'xl', 37000, 16000, 45, 15, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'color-shine'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'corto', 32000, null, 45, null, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'control-frizz'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'medio', 36000, null, 45, null, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'control-frizz'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'largo', 41000, null, 45, null, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'control-frizz'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'xl', 44000, null, 45, null, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'control-frizz'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'corto', 25000, 10000, 45, 15, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'filler-magic'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'medio', 30000, 11000, 45, 15, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'filler-magic'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'largo', 34000, 12000, 45, 15, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'filler-magic'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'xl', 37000, 13000, 45, 15, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'filler-magic'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'corto', 23000, 10000, 45, 15, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'filler-repair'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'medio', 25000, 11000, 45, 15, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'filler-repair'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'largo', 28000, 12000, 45, 15, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'filler-repair'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'xl', 30000, 13000, 45, 15, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'filler-repair'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'corto', 22000, 9000, 45, 15, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'fusion'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'medio', 25000, 12000, 45, 15, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'fusion'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'largo', 30000, 14000, 45, 15, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'fusion'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'xl', 34000, 15000, 45, 15, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'fusion'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'corto', 22000, 8000, 45, 15, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'hidratacion'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'medio', 26000, 9000, 45, 15, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'hidratacion'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'largo', 28000, 10000, 45, 15, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'hidratacion'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'xl', 31000, 11000, 45, 15, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'hidratacion'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'corto', 20000, 7000, 45, 15, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'karseell'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'medio', 24000, 8000, 45, 15, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'karseell'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'largo', 26000, 9000, 45, 15, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'karseell'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'xl', 30000, 10000, 45, 15, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'karseell'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'corto', 40000, null, 45, null, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'liss-biocell'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'medio', 45000, null, 45, null, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'liss-biocell'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'largo', 50000, null, 45, null, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'liss-biocell'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'xl', 55000, null, 45, null, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'liss-biocell'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'corto', 18000, 7000, 45, 15, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'mascara-magic'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'medio', 20000, 8000, 45, 15, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'mascara-magic'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'largo', 23000, 9000, 45, 15, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'mascara-magic'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'xl', 26000, 10000, 45, 15, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'mascara-magic'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'corto', 17000, null, 45, null, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'nutricion'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'medio', 19000, null, 45, null, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'nutricion'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'largo', 21000, null, 45, null, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'nutricion'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'xl', 24000, null, 45, null, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'nutricion'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'corto', 22000, 9000, 45, 15, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'plasma'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'medio', 25000, 10000, 45, 15, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'plasma'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'largo', 30000, 11000, 45, 15, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'plasma'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'xl', 36000, 13000, 45, 15, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'plasma'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'corto', 25000, 9000, 45, 15, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'reconstruccion'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'medio', 32000, 10000, 45, 15, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'reconstruccion'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'largo', 36000, 12000, 45, 15, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'reconstruccion'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'xl', 40000, 14000, 45, 15, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'reconstruccion'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'corto', 20000, 7000, 45, 15, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'reparacion'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'medio', 22000, 8000, 45, 15, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'reparacion'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'largo', 25000, 9000, 45, 15, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'reparacion'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'xl', 28000, 10000, 45, 15, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'reparacion'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'corto', 21000, 8000, 45, 15, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'riflessi'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'medio', 24000, 9000, 45, 15, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'riflessi'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'largo', 28000, 10000, 45, 15, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'riflessi'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'xl', 34000, 11000, 45, 15, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'riflessi'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'corto', 21000, 8000, 45, 15, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'sow-express'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'medio', 23000, 9000, 45, 15, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'sow-express'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'largo', 27000, 10000, 45, 15, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'sow-express'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'xl', 30000, 11000, 45, 15, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'sow-express'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'corto', 27000, 10000, 45, 15, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'vitamin-repair'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'medio', 30000, 11000, 45, 15, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'vitamin-repair'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'largo', 36000, 12000, 45, 15, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'vitamin-repair'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main, price_addon,
                                        duration_main_min, duration_addon_min, process_min,
                                        source, source_ref, confidence)
  select id, 'xl', 40000, 13000, 45, 15, 20,
         'sol_pricelist', 'precios.xlsx · hoja servicios · precio de Sol; duracion estimada, sin validar', 'medium'
    from public.services where slug = 'vitamin-repair'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, price_addon = excluded.price_addon,
    source = excluded.source, source_ref = excluded.source_ref,
    confidence = excluded.confidence;

-- ---------------------------------------------------------------------
-- 6. Los cinco que ya estaban quedan marcados como tratamiento
--    (por si esta migración corre sobre una base donde la anterior ya
--     pasó pero el catálogo cambió de manos)
-- ---------------------------------------------------------------------
update public.services set kind = 'tratamiento'
 where slug in ('hidratacion', 'reconstruccion', 'reparacion', 'nutricion', 'botox');
