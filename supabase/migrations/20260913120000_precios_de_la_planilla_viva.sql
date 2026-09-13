-- =====================================================================
-- Sol Mai · Los precios salen de la planilla viva de Sol
--
-- DE DÓNDE SALE CADA NÚMERO
--
-- De la planilla `precios` que mantiene Sol (solmaipeluqueria@gmail.com),
-- hoja «servicios», última edición del 2026-09-12. NO de la copia
-- `precios.xlsx` descargada en junio, que tenía precios viejos: Sol los
-- subió y esa copia quedó congelada.
--
-- Los cuatro números de cada fila son corto · medio · largo · XL en
-- efectivo. La columna que sigue a cada una en la planilla es la misma con
-- el 10% de recargo por transferencia, que el sistema ya conoce como
-- `business_settings.payment_surcharge_pct` y no se carga acá.
--
-- Este archivo se generó leyendo la planilla celda por celda. Ningún
-- precio se transcribió a mano.
--
-- QUÉ ARREGLA
--
-- La web venía mostrando precios de promedio de industria por debajo de
-- los de Sol: el recogido a $22.000 cuando ella cobra $55.000, el
-- semirecogido a $18.000 contra $60.000, la tonalización a $16.000 contra
-- $38.000. Una clienta que reservaba online reservaba barato.
--
-- POR QUÉ LOS SERVICIOS NUEVOS NO SALEN PUBLICADOS
--
-- Porque la planilla tiene precios y no tiene duraciones, y las duraciones
-- no se inventan. `duration_minutes` no acepta nulo, así que llevan una
-- estimación uniforme de 60 minutos; publicar con ese número sería ofrecer
-- turnos de una duración que nadie validó, y un turno mal medido descoloca
-- la agenda del día entero. Entran `is_active = true` y `is_public =
-- false`, igual que los 16 tratamientos de la migración de ayer.
--
-- DOS CELDAS QUE SOL DEJÓ VACÍAS
--
-- «ONDAS CON PLANCHA» no tiene precio de corto y «todo(matizado) color
-- comun» no tiene el de XL. Se completaron con el largo contiguo, que es
-- la lectura más conservadora, y quedan marcadas `confidence = 'low'`
-- para que aparezcan en /admin/pending-values.
--
-- QUÉ NO ENTRA
--
-- El tercer contexto de precio. La planilla tiene un bloque «CUANDO SE
-- REALIZAN COLOR MAS REFLEJOS O BALAYAGE» donde la raíz baja de $30.000 a
-- $8.000. El motor de cotización sólo conoce dos contextos —solo y con
-- color—, así que ese bloque necesita ampliar el modelo y va en su propio
-- bloque de trabajo.
--
-- Tampoco entra el precio de agregado del corte: la planilla lo cobra
-- $15.000 con color contra $17.000 solo, pero `price_addon` hoy está
-- reservado a los tratamientos y hay una invariante del clean-room que lo
-- exige. Cambiar eso es parte del mismo bloque siguiente.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Servicios que ya existían: se corrige el precio
-- ---------------------------------------------------------------------

-- corte-fem ← SERVICIOS · CORTE
update public.service_price_tiers t
   set price_main = 17000, source = 'sol_pricelist', confidence = 'medium',
       source_ref = 'SERVICIOS · CORTE', updated_by = 'planilla viva 2026-09-12'
  from public.services s
 where s.id = t.service_id and s.slug = 'corte-fem' and t.length_tier = 'corto';
update public.service_price_tiers t
   set price_main = 17000, source = 'sol_pricelist', confidence = 'medium',
       source_ref = 'SERVICIOS · CORTE', updated_by = 'planilla viva 2026-09-12'
  from public.services s
 where s.id = t.service_id and s.slug = 'corte-fem' and t.length_tier = 'medio';
update public.service_price_tiers t
   set price_main = 17000, source = 'sol_pricelist', confidence = 'medium',
       source_ref = 'SERVICIOS · CORTE', updated_by = 'planilla viva 2026-09-12'
  from public.services s
 where s.id = t.service_id and s.slug = 'corte-fem' and t.length_tier = 'largo';
update public.service_price_tiers t
   set price_main = 17000, source = 'sol_pricelist', confidence = 'medium',
       source_ref = 'SERVICIOS · CORTE', updated_by = 'planilla viva 2026-09-12'
  from public.services s
 where s.id = t.service_id and s.slug = 'corte-fem' and t.length_tier = 'xl';
update public.services set price_amount = 17000 where slug = 'corte-fem';

-- brushing ← SERVICIOS · BRUSHING
update public.service_price_tiers t
   set price_main = 12000, source = 'sol_pricelist', confidence = 'medium',
       source_ref = 'SERVICIOS · BRUSHING', updated_by = 'planilla viva 2026-09-12'
  from public.services s
 where s.id = t.service_id and s.slug = 'brushing' and t.length_tier = 'corto';
update public.service_price_tiers t
   set price_main = 14000, source = 'sol_pricelist', confidence = 'medium',
       source_ref = 'SERVICIOS · BRUSHING', updated_by = 'planilla viva 2026-09-12'
  from public.services s
 where s.id = t.service_id and s.slug = 'brushing' and t.length_tier = 'medio';
update public.service_price_tiers t
   set price_main = 16000, source = 'sol_pricelist', confidence = 'medium',
       source_ref = 'SERVICIOS · BRUSHING', updated_by = 'planilla viva 2026-09-12'
  from public.services s
 where s.id = t.service_id and s.slug = 'brushing' and t.length_tier = 'largo';
update public.service_price_tiers t
   set price_main = 18000, source = 'sol_pricelist', confidence = 'medium',
       source_ref = 'SERVICIOS · BRUSHING', updated_by = 'planilla viva 2026-09-12'
  from public.services s
 where s.id = t.service_id and s.slug = 'brushing' and t.length_tier = 'xl';
update public.services set price_amount = 12000 where slug = 'brushing';
update public.service_parameters p
   set length_affects_price = true, updated_by = 'planilla viva 2026-09-12'
  from public.services s
 where s.id = p.service_id and s.slug = 'brushing';

-- recogido ← PEINADOS FIESTA · RECOGIDO
update public.service_price_tiers t
   set price_main = 55000, source = 'sol_pricelist', confidence = 'medium',
       source_ref = 'PEINADOS FIESTA · RECOGIDO', updated_by = 'planilla viva 2026-09-12'
  from public.services s
 where s.id = t.service_id and s.slug = 'recogido' and t.length_tier = 'corto';
update public.service_price_tiers t
   set price_main = 65000, source = 'sol_pricelist', confidence = 'medium',
       source_ref = 'PEINADOS FIESTA · RECOGIDO', updated_by = 'planilla viva 2026-09-12'
  from public.services s
 where s.id = t.service_id and s.slug = 'recogido' and t.length_tier = 'medio';
update public.service_price_tiers t
   set price_main = 75000, source = 'sol_pricelist', confidence = 'medium',
       source_ref = 'PEINADOS FIESTA · RECOGIDO', updated_by = 'planilla viva 2026-09-12'
  from public.services s
 where s.id = t.service_id and s.slug = 'recogido' and t.length_tier = 'largo';
update public.service_price_tiers t
   set price_main = 90000, source = 'sol_pricelist', confidence = 'medium',
       source_ref = 'PEINADOS FIESTA · RECOGIDO', updated_by = 'planilla viva 2026-09-12'
  from public.services s
 where s.id = t.service_id and s.slug = 'recogido' and t.length_tier = 'xl';
update public.services set price_amount = 55000 where slug = 'recogido';
update public.service_parameters p
   set length_affects_price = true, updated_by = 'planilla viva 2026-09-12'
  from public.services s
 where s.id = p.service_id and s.slug = 'recogido';

-- tonalizacion ← COLORACIONES · MATIZADO
update public.service_price_tiers t
   set price_main = 38000, source = 'sol_pricelist', confidence = 'medium',
       source_ref = 'COLORACIONES · MATIZADO', updated_by = 'planilla viva 2026-09-12'
  from public.services s
 where s.id = t.service_id and s.slug = 'tonalizacion' and t.length_tier = 'corto';
update public.service_price_tiers t
   set price_main = 44000, source = 'sol_pricelist', confidence = 'medium',
       source_ref = 'COLORACIONES · MATIZADO', updated_by = 'planilla viva 2026-09-12'
  from public.services s
 where s.id = t.service_id and s.slug = 'tonalizacion' and t.length_tier = 'medio';
update public.service_price_tiers t
   set price_main = 50000, source = 'sol_pricelist', confidence = 'medium',
       source_ref = 'COLORACIONES · MATIZADO', updated_by = 'planilla viva 2026-09-12'
  from public.services s
 where s.id = t.service_id and s.slug = 'tonalizacion' and t.length_tier = 'largo';
update public.service_price_tiers t
   set price_main = 55000, source = 'sol_pricelist', confidence = 'medium',
       source_ref = 'COLORACIONES · MATIZADO', updated_by = 'planilla viva 2026-09-12'
  from public.services s
 where s.id = t.service_id and s.slug = 'tonalizacion' and t.length_tier = 'xl';
update public.services set price_amount = 38000 where slug = 'tonalizacion';
update public.service_parameters p
   set length_affects_price = true, updated_by = 'planilla viva 2026-09-12'
  from public.services s
 where s.id = p.service_id and s.slug = 'tonalizacion';

-- balayage ← MECHAS/REFLEJOS · BALAYAGE
update public.service_price_tiers t
   set price_main = 90000, source = 'sol_pricelist', confidence = 'medium',
       source_ref = 'MECHAS/REFLEJOS · BALAYAGE', updated_by = 'planilla viva 2026-09-12'
  from public.services s
 where s.id = t.service_id and s.slug = 'balayage' and t.length_tier = 'corto';
update public.service_price_tiers t
   set price_main = 100000, source = 'sol_pricelist', confidence = 'medium',
       source_ref = 'MECHAS/REFLEJOS · BALAYAGE', updated_by = 'planilla viva 2026-09-12'
  from public.services s
 where s.id = t.service_id and s.slug = 'balayage' and t.length_tier = 'medio';
update public.service_price_tiers t
   set price_main = 120000, source = 'sol_pricelist', confidence = 'medium',
       source_ref = 'MECHAS/REFLEJOS · BALAYAGE', updated_by = 'planilla viva 2026-09-12'
  from public.services s
 where s.id = t.service_id and s.slug = 'balayage' and t.length_tier = 'largo';
update public.service_price_tiers t
   set price_main = 140000, source = 'sol_pricelist', confidence = 'medium',
       source_ref = 'MECHAS/REFLEJOS · BALAYAGE', updated_by = 'planilla viva 2026-09-12'
  from public.services s
 where s.id = t.service_id and s.slug = 'balayage' and t.length_tier = 'xl';
update public.services set price_amount = 90000 where slug = 'balayage';
update public.service_parameters p
   set length_affects_price = true, updated_by = 'planilla viva 2026-09-12'
  from public.services s
 where s.id = p.service_id and s.slug = 'balayage';

-- semi ← UÑAS · SEMIPERMANENTE 1 color
update public.service_price_tiers t
   set price_main = 17000, source = 'sol_pricelist', confidence = 'medium',
       source_ref = 'UÑAS · SEMIPERMANENTE 1 color', updated_by = 'planilla viva 2026-09-12'
  from public.services s
 where s.id = t.service_id and s.slug = 'semi' and t.length_tier = 'unico';
update public.services set price_amount = 17000 where slug = 'semi';

-- kapping ← UÑAS · KAPPING liso
update public.service_price_tiers t
   set price_main = 19000, source = 'sol_pricelist', confidence = 'medium',
       source_ref = 'UÑAS · KAPPING liso', updated_by = 'planilla viva 2026-09-12'
  from public.services s
 where s.id = t.service_id and s.slug = 'kapping' and t.length_tier = 'unico';
update public.services set price_amount = 19000 where slug = 'kapping';

-- softgel ← UÑAS · SOFT GEL liso
update public.service_price_tiers t
   set price_main = 22000, source = 'sol_pricelist', confidence = 'medium',
       source_ref = 'UÑAS · SOFT GEL liso', updated_by = 'planilla viva 2026-09-12'
  from public.services s
 where s.id = t.service_id and s.slug = 'softgel' and t.length_tier = 'unico';
update public.services set price_amount = 22000 where slug = 'softgel';

-- ---------------------------------------------------------------------
-- 2. Servicios que la planilla tiene y el sistema no
--
--    Las cuatro líneas de coloración entran como servicios propios y no
--    como una variante: Sol cobra la raíz a cuatro precios distintos
--    según el producto, y en los cobros Itely aparece 557 veces contra 71
--    de Exiline. Un «retoque de raíz» genérico no es ninguno de los
--    cuatro.
--
--    Los de mechones entran como `servicio` y no como `color`: marcarlos
--    color decidiría de paso que la promoción de tratamientos corre sobre
--    ellos, y eso lo tilda Sol desde el panel.
-- ---------------------------------------------------------------------

-- lavado ← SERVICIOS · LAVADO
insert into public.services (category_id, slug, name, duration_minutes, price_amount,
                             currency, sort_order, is_public, is_active, kind)
  select id, 'lavado', 'Lavado', 60, 3000,
         'ARS', 200, false, true, 'servicio'
    from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set
    name = excluded.name, price_amount = excluded.price_amount,
    kind = excluded.kind, is_active = true, deleted_at = null;

insert into public.service_parameters (service_id, price_display_mode, length_affects_price,
                                       updated_by)
  select id, 'from', true, 'planilla viva 2026-09-12' from public.services where slug = 'lavado'
  on conflict (service_id) do nothing;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'corto', 3000, 60, 0, 'sol_pricelist', 'SERVICIOS · LAVADO', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'lavado'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'medio', 3000, 60, 0, 'sol_pricelist', 'SERVICIOS · LAVADO', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'lavado'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'largo', 3000, 60, 0, 'sol_pricelist', 'SERVICIOS · LAVADO', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'lavado'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'xl', 3000, 60, 0, 'sol_pricelist', 'SERVICIOS · LAVADO', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'lavado'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;

-- corte-flequillo ← SERVICIOS · CORTE FLEQUILLO
insert into public.services (category_id, slug, name, duration_minutes, price_amount,
                             currency, sort_order, is_public, is_active, kind)
  select id, 'corte-flequillo', 'Corte de flequillo', 60, 7000,
         'ARS', 200, false, true, 'servicio'
    from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set
    name = excluded.name, price_amount = excluded.price_amount,
    kind = excluded.kind, is_active = true, deleted_at = null;

insert into public.service_parameters (service_id, price_display_mode, length_affects_price,
                                       updated_by)
  select id, 'from', true, 'planilla viva 2026-09-12' from public.services where slug = 'corte-flequillo'
  on conflict (service_id) do nothing;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'corto', 7000, 60, 0, 'sol_pricelist', 'SERVICIOS · CORTE FLEQUILLO', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'corte-flequillo'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'medio', 7000, 60, 0, 'sol_pricelist', 'SERVICIOS · CORTE FLEQUILLO', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'corte-flequillo'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'largo', 7000, 60, 0, 'sol_pricelist', 'SERVICIOS · CORTE FLEQUILLO', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'corte-flequillo'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'xl', 7000, 60, 0, 'sol_pricelist', 'SERVICIOS · CORTE FLEQUILLO', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'corte-flequillo'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;

-- secado-modelado ← SERVICIOS · SECADO/MODELADO
insert into public.services (category_id, slug, name, duration_minutes, price_amount,
                             currency, sort_order, is_public, is_active, kind)
  select id, 'secado-modelado', 'Secado y modelado', 60, 3000,
         'ARS', 200, false, true, 'servicio'
    from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set
    name = excluded.name, price_amount = excluded.price_amount,
    kind = excluded.kind, is_active = true, deleted_at = null;

insert into public.service_parameters (service_id, price_display_mode, length_affects_price,
                                       updated_by)
  select id, 'from', true, 'planilla viva 2026-09-12' from public.services where slug = 'secado-modelado'
  on conflict (service_id) do nothing;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'corto', 3000, 60, 0, 'sol_pricelist', 'SERVICIOS · SECADO/MODELADO', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'secado-modelado'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'medio', 3000, 60, 0, 'sol_pricelist', 'SERVICIOS · SECADO/MODELADO', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'secado-modelado'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'largo', 3000, 60, 0, 'sol_pricelist', 'SERVICIOS · SECADO/MODELADO', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'secado-modelado'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'xl', 3000, 60, 0, 'sol_pricelist', 'SERVICIOS · SECADO/MODELADO', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'secado-modelado'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;

-- brushing-plancha ← SERVICIOS · BRUSHING Y PLANCHA
insert into public.services (category_id, slug, name, duration_minutes, price_amount,
                             currency, sort_order, is_public, is_active, kind)
  select id, 'brushing-plancha', 'Brushing y plancha', 60, 14000,
         'ARS', 200, false, true, 'servicio'
    from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set
    name = excluded.name, price_amount = excluded.price_amount,
    kind = excluded.kind, is_active = true, deleted_at = null;

insert into public.service_parameters (service_id, price_display_mode, length_affects_price,
                                       updated_by)
  select id, 'from', true, 'planilla viva 2026-09-12' from public.services where slug = 'brushing-plancha'
  on conflict (service_id) do nothing;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'corto', 14000, 60, 0, 'sol_pricelist', 'SERVICIOS · BRUSHING Y PLANCHA', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'brushing-plancha'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'medio', 16000, 60, 0, 'sol_pricelist', 'SERVICIOS · BRUSHING Y PLANCHA', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'brushing-plancha'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'largo', 18000, 60, 0, 'sol_pricelist', 'SERVICIOS · BRUSHING Y PLANCHA', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'brushing-plancha'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'xl', 20000, 60, 0, 'sol_pricelist', 'SERVICIOS · BRUSHING Y PLANCHA', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'brushing-plancha'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;

-- brushing-movimiento ← SERVICIOS · BRUSHING CON MOVIMIENTO
insert into public.services (category_id, slug, name, duration_minutes, price_amount,
                             currency, sort_order, is_public, is_active, kind)
  select id, 'brushing-movimiento', 'Brushing con movimiento', 60, 13000,
         'ARS', 200, false, true, 'servicio'
    from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set
    name = excluded.name, price_amount = excluded.price_amount,
    kind = excluded.kind, is_active = true, deleted_at = null;

insert into public.service_parameters (service_id, price_display_mode, length_affects_price,
                                       updated_by)
  select id, 'from', true, 'planilla viva 2026-09-12' from public.services where slug = 'brushing-movimiento'
  on conflict (service_id) do nothing;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'corto', 13000, 60, 0, 'sol_pricelist', 'SERVICIOS · BRUSHING CON MOVIMIENTO', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'brushing-movimiento'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'medio', 15000, 60, 0, 'sol_pricelist', 'SERVICIOS · BRUSHING CON MOVIMIENTO', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'brushing-movimiento'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'largo', 18000, 60, 0, 'sol_pricelist', 'SERVICIOS · BRUSHING CON MOVIMIENTO', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'brushing-movimiento'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'xl', 22000, 60, 0, 'sol_pricelist', 'SERVICIOS · BRUSHING CON MOVIMIENTO', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'brushing-movimiento'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;

-- ondas-plancha ← SERVICIOS · ONDAS CON PLANCHA  -- una celda vacía en la planilla, completada con el largo contiguo
insert into public.services (category_id, slug, name, duration_minutes, price_amount,
                             currency, sort_order, is_public, is_active, kind)
  select id, 'ondas-plancha', 'Ondas con plancha', 60, 18000,
         'ARS', 200, false, true, 'servicio'
    from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set
    name = excluded.name, price_amount = excluded.price_amount,
    kind = excluded.kind, is_active = true, deleted_at = null;

insert into public.service_parameters (service_id, price_display_mode, length_affects_price,
                                       updated_by)
  select id, 'from', true, 'planilla viva 2026-09-12' from public.services where slug = 'ondas-plancha'
  on conflict (service_id) do nothing;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'corto', 18000, 60, 0, 'sol_pricelist', 'SERVICIOS · ONDAS CON PLANCHA', 'low',
         'planilla viva 2026-09-12'
    from public.services where slug = 'ondas-plancha'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'medio', 18000, 60, 0, 'sol_pricelist', 'SERVICIOS · ONDAS CON PLANCHA', 'low',
         'planilla viva 2026-09-12'
    from public.services where slug = 'ondas-plancha'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'largo', 19000, 60, 0, 'sol_pricelist', 'SERVICIOS · ONDAS CON PLANCHA', 'low',
         'planilla viva 2026-09-12'
    from public.services where slug = 'ondas-plancha'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'xl', 20000, 60, 0, 'sol_pricelist', 'SERVICIOS · ONDAS CON PLANCHA', 'low',
         'planilla viva 2026-09-12'
    from public.services where slug = 'ondas-plancha'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;

-- trenzas ← SERVICIOS · TRENZAS
insert into public.services (category_id, slug, name, duration_minutes, price_amount,
                             currency, sort_order, is_public, is_active, kind)
  select id, 'trenzas', 'Trenzas (hasta 2)', 60, 15000,
         'ARS', 200, false, true, 'servicio'
    from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set
    name = excluded.name, price_amount = excluded.price_amount,
    kind = excluded.kind, is_active = true, deleted_at = null;

insert into public.service_parameters (service_id, price_display_mode, length_affects_price,
                                       updated_by)
  select id, 'from', true, 'planilla viva 2026-09-12' from public.services where slug = 'trenzas'
  on conflict (service_id) do nothing;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'corto', 15000, 60, 0, 'sol_pricelist', 'SERVICIOS · TRENZAS', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'trenzas'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'medio', 15000, 60, 0, 'sol_pricelist', 'SERVICIOS · TRENZAS', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'trenzas'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'largo', 15000, 60, 0, 'sol_pricelist', 'SERVICIOS · TRENZAS', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'trenzas'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'xl', 15000, 60, 0, 'sol_pricelist', 'SERVICIOS · TRENZAS', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'trenzas'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;

-- pasar-color ← SERVICIOS · PASAR COLOR
insert into public.services (category_id, slug, name, duration_minutes, price_amount,
                             currency, sort_order, is_public, is_active, kind)
  select id, 'pasar-color', 'Pasar color', 60, 14000,
         'ARS', 200, false, true, 'servicio'
    from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set
    name = excluded.name, price_amount = excluded.price_amount,
    kind = excluded.kind, is_active = true, deleted_at = null;

insert into public.service_parameters (service_id, price_display_mode, length_affects_price,
                                       updated_by)
  select id, 'from', true, 'planilla viva 2026-09-12' from public.services where slug = 'pasar-color'
  on conflict (service_id) do nothing;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'corto', 14000, 60, 0, 'sol_pricelist', 'SERVICIOS · PASAR COLOR', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'pasar-color'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'medio', 14000, 60, 0, 'sol_pricelist', 'SERVICIOS · PASAR COLOR', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'pasar-color'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'largo', 14000, 60, 0, 'sol_pricelist', 'SERVICIOS · PASAR COLOR', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'pasar-color'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'xl', 14000, 60, 0, 'sol_pricelist', 'SERVICIOS · PASAR COLOR', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'pasar-color'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;

-- ondas-al-agua ← PEINADOS FIESTA · ONDAS AL AGUA O GLAM
insert into public.services (category_id, slug, name, duration_minutes, price_amount,
                             currency, sort_order, is_public, is_active, kind)
  select id, 'ondas-al-agua', 'Ondas al agua o glam', 60, 45000,
         'ARS', 200, false, true, 'servicio'
    from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set
    name = excluded.name, price_amount = excluded.price_amount,
    kind = excluded.kind, is_active = true, deleted_at = null;

insert into public.service_parameters (service_id, price_display_mode, length_affects_price,
                                       updated_by)
  select id, 'from', true, 'planilla viva 2026-09-12' from public.services where slug = 'ondas-al-agua'
  on conflict (service_id) do nothing;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'corto', 45000, 60, 0, 'sol_pricelist', 'PEINADOS FIESTA · ONDAS AL AGUA O GLAM', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'ondas-al-agua'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'medio', 50000, 60, 0, 'sol_pricelist', 'PEINADOS FIESTA · ONDAS AL AGUA O GLAM', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'ondas-al-agua'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'largo', 60000, 60, 0, 'sol_pricelist', 'PEINADOS FIESTA · ONDAS AL AGUA O GLAM', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'ondas-al-agua'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'xl', 70000, 60, 0, 'sol_pricelist', 'PEINADOS FIESTA · ONDAS AL AGUA O GLAM', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'ondas-al-agua'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;

-- semirecogido ← PEINADOS FIESTA · SEMIRECOGIDO
insert into public.services (category_id, slug, name, duration_minutes, price_amount,
                             currency, sort_order, is_public, is_active, kind)
  select id, 'semirecogido', 'Semirecogido', 60, 60000,
         'ARS', 200, false, true, 'servicio'
    from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set
    name = excluded.name, price_amount = excluded.price_amount,
    kind = excluded.kind, is_active = true, deleted_at = null;

insert into public.service_parameters (service_id, price_display_mode, length_affects_price,
                                       updated_by)
  select id, 'from', true, 'planilla viva 2026-09-12' from public.services where slug = 'semirecogido'
  on conflict (service_id) do nothing;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'corto', 60000, 60, 0, 'sol_pricelist', 'PEINADOS FIESTA · SEMIRECOGIDO', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'semirecogido'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'medio', 60000, 60, 0, 'sol_pricelist', 'PEINADOS FIESTA · SEMIRECOGIDO', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'semirecogido'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'largo', 65000, 60, 0, 'sol_pricelist', 'PEINADOS FIESTA · SEMIRECOGIDO', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'semirecogido'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'xl', 70000, 60, 0, 'sol_pricelist', 'PEINADOS FIESTA · SEMIRECOGIDO', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'semirecogido'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;

-- raiz-exiline ← COLORACIONES · EXILINE raiz
insert into public.services (category_id, slug, name, duration_minutes, price_amount,
                             currency, sort_order, is_public, is_active, kind)
  select id, 'raiz-exiline', 'Raíz · Exiline', 60, 30000,
         'ARS', 200, false, true, 'color'
    from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set
    name = excluded.name, price_amount = excluded.price_amount,
    kind = excluded.kind, is_active = true, deleted_at = null;

insert into public.service_parameters (service_id, price_display_mode, length_affects_price,
                                       updated_by)
  select id, 'from', true, 'planilla viva 2026-09-12' from public.services where slug = 'raiz-exiline'
  on conflict (service_id) do nothing;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'corto', 30000, 60, 0, 'sol_pricelist', 'COLORACIONES · EXILINE raiz', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'raiz-exiline'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'medio', 33000, 60, 0, 'sol_pricelist', 'COLORACIONES · EXILINE raiz', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'raiz-exiline'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'largo', 38000, 60, 0, 'sol_pricelist', 'COLORACIONES · EXILINE raiz', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'raiz-exiline'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'xl', 45000, 60, 0, 'sol_pricelist', 'COLORACIONES · EXILINE raiz', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'raiz-exiline'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;

-- total-exiline ← COLORACIONES · EXILINE total
insert into public.services (category_id, slug, name, duration_minutes, price_amount,
                             currency, sort_order, is_public, is_active, kind)
  select id, 'total-exiline', 'Color total · Exiline', 60, 38000,
         'ARS', 200, false, true, 'color'
    from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set
    name = excluded.name, price_amount = excluded.price_amount,
    kind = excluded.kind, is_active = true, deleted_at = null;

insert into public.service_parameters (service_id, price_display_mode, length_affects_price,
                                       updated_by)
  select id, 'from', true, 'planilla viva 2026-09-12' from public.services where slug = 'total-exiline'
  on conflict (service_id) do nothing;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'corto', 38000, 60, 0, 'sol_pricelist', 'COLORACIONES · EXILINE total', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'total-exiline'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'medio', 44000, 60, 0, 'sol_pricelist', 'COLORACIONES · EXILINE total', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'total-exiline'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'largo', 50000, 60, 0, 'sol_pricelist', 'COLORACIONES · EXILINE total', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'total-exiline'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'xl', 60000, 60, 0, 'sol_pricelist', 'COLORACIONES · EXILINE total', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'total-exiline'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;

-- raiz-sin-tacc ← COLORACIONES · SIN TACC raiz
insert into public.services (category_id, slug, name, duration_minutes, price_amount,
                             currency, sort_order, is_public, is_active, kind)
  select id, 'raiz-sin-tacc', 'Raíz · Sin TACC', 60, 34000,
         'ARS', 200, false, true, 'color'
    from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set
    name = excluded.name, price_amount = excluded.price_amount,
    kind = excluded.kind, is_active = true, deleted_at = null;

insert into public.service_parameters (service_id, price_display_mode, length_affects_price,
                                       updated_by)
  select id, 'from', true, 'planilla viva 2026-09-12' from public.services where slug = 'raiz-sin-tacc'
  on conflict (service_id) do nothing;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'corto', 34000, 60, 0, 'sol_pricelist', 'COLORACIONES · SIN TACC raiz', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'raiz-sin-tacc'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'medio', 38000, 60, 0, 'sol_pricelist', 'COLORACIONES · SIN TACC raiz', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'raiz-sin-tacc'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'largo', 41000, 60, 0, 'sol_pricelist', 'COLORACIONES · SIN TACC raiz', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'raiz-sin-tacc'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'xl', 48000, 60, 0, 'sol_pricelist', 'COLORACIONES · SIN TACC raiz', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'raiz-sin-tacc'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;

-- total-sin-tacc ← COLORACIONES · SIN TACC total
insert into public.services (category_id, slug, name, duration_minutes, price_amount,
                             currency, sort_order, is_public, is_active, kind)
  select id, 'total-sin-tacc', 'Color total · Sin TACC', 60, 44000,
         'ARS', 200, false, true, 'color'
    from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set
    name = excluded.name, price_amount = excluded.price_amount,
    kind = excluded.kind, is_active = true, deleted_at = null;

insert into public.service_parameters (service_id, price_display_mode, length_affects_price,
                                       updated_by)
  select id, 'from', true, 'planilla viva 2026-09-12' from public.services where slug = 'total-sin-tacc'
  on conflict (service_id) do nothing;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'corto', 44000, 60, 0, 'sol_pricelist', 'COLORACIONES · SIN TACC total', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'total-sin-tacc'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'medio', 47000, 60, 0, 'sol_pricelist', 'COLORACIONES · SIN TACC total', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'total-sin-tacc'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'largo', 53000, 60, 0, 'sol_pricelist', 'COLORACIONES · SIN TACC total', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'total-sin-tacc'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'xl', 64000, 60, 0, 'sol_pricelist', 'COLORACIONES · SIN TACC total', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'total-sin-tacc'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;

-- raiz-tono-well ← COLORACIONES · TONO Well raiz
insert into public.services (category_id, slug, name, duration_minutes, price_amount,
                             currency, sort_order, is_public, is_active, kind)
  select id, 'raiz-tono-well', 'Raíz · Tono Well', 60, 40000,
         'ARS', 200, false, true, 'color'
    from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set
    name = excluded.name, price_amount = excluded.price_amount,
    kind = excluded.kind, is_active = true, deleted_at = null;

insert into public.service_parameters (service_id, price_display_mode, length_affects_price,
                                       updated_by)
  select id, 'from', true, 'planilla viva 2026-09-12' from public.services where slug = 'raiz-tono-well'
  on conflict (service_id) do nothing;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'corto', 40000, 60, 0, 'sol_pricelist', 'COLORACIONES · TONO Well raiz', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'raiz-tono-well'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'medio', 45000, 60, 0, 'sol_pricelist', 'COLORACIONES · TONO Well raiz', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'raiz-tono-well'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'largo', 55000, 60, 0, 'sol_pricelist', 'COLORACIONES · TONO Well raiz', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'raiz-tono-well'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'xl', 60000, 60, 0, 'sol_pricelist', 'COLORACIONES · TONO Well raiz', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'raiz-tono-well'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;

-- total-tono-well ← COLORACIONES · TONO Well total
insert into public.services (category_id, slug, name, duration_minutes, price_amount,
                             currency, sort_order, is_public, is_active, kind)
  select id, 'total-tono-well', 'Color total · Tono Well', 60, 70000,
         'ARS', 200, false, true, 'color'
    from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set
    name = excluded.name, price_amount = excluded.price_amount,
    kind = excluded.kind, is_active = true, deleted_at = null;

insert into public.service_parameters (service_id, price_display_mode, length_affects_price,
                                       updated_by)
  select id, 'from', true, 'planilla viva 2026-09-12' from public.services where slug = 'total-tono-well'
  on conflict (service_id) do nothing;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'corto', 70000, 60, 0, 'sol_pricelist', 'COLORACIONES · TONO Well total', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'total-tono-well'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'medio', 80000, 60, 0, 'sol_pricelist', 'COLORACIONES · TONO Well total', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'total-tono-well'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'largo', 95000, 60, 0, 'sol_pricelist', 'COLORACIONES · TONO Well total', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'total-tono-well'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'xl', 105000, 60, 0, 'sol_pricelist', 'COLORACIONES · TONO Well total', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'total-tono-well'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;

-- raiz-itely ← COLORACIONES · COLOR ITELY raiz
insert into public.services (category_id, slug, name, duration_minutes, price_amount,
                             currency, sort_order, is_public, is_active, kind)
  select id, 'raiz-itely', 'Raíz · Itely', 60, 36000,
         'ARS', 200, false, true, 'color'
    from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set
    name = excluded.name, price_amount = excluded.price_amount,
    kind = excluded.kind, is_active = true, deleted_at = null;

insert into public.service_parameters (service_id, price_display_mode, length_affects_price,
                                       updated_by)
  select id, 'from', true, 'planilla viva 2026-09-12' from public.services where slug = 'raiz-itely'
  on conflict (service_id) do nothing;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'corto', 36000, 60, 0, 'sol_pricelist', 'COLORACIONES · COLOR ITELY raiz', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'raiz-itely'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'medio', 39000, 60, 0, 'sol_pricelist', 'COLORACIONES · COLOR ITELY raiz', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'raiz-itely'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'largo', 45000, 60, 0, 'sol_pricelist', 'COLORACIONES · COLOR ITELY raiz', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'raiz-itely'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'xl', 60000, 60, 0, 'sol_pricelist', 'COLORACIONES · COLOR ITELY raiz', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'raiz-itely'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;

-- total-itely ← COLORACIONES · COLOR ITELY total
insert into public.services (category_id, slug, name, duration_minutes, price_amount,
                             currency, sort_order, is_public, is_active, kind)
  select id, 'total-itely', 'Color total · Itely', 60, 45000,
         'ARS', 200, false, true, 'color'
    from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set
    name = excluded.name, price_amount = excluded.price_amount,
    kind = excluded.kind, is_active = true, deleted_at = null;

insert into public.service_parameters (service_id, price_display_mode, length_affects_price,
                                       updated_by)
  select id, 'from', true, 'planilla viva 2026-09-12' from public.services where slug = 'total-itely'
  on conflict (service_id) do nothing;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'corto', 45000, 60, 0, 'sol_pricelist', 'COLORACIONES · COLOR ITELY total', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'total-itely'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'medio', 52000, 60, 0, 'sol_pricelist', 'COLORACIONES · COLOR ITELY total', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'total-itely'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'largo', 60000, 60, 0, 'sol_pricelist', 'COLORACIONES · COLOR ITELY total', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'total-itely'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'xl', 70000, 60, 0, 'sol_pricelist', 'COLORACIONES · COLOR ITELY total', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'total-itely'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;

-- vincha-tono ← COLORACIONES · solo vincha
insert into public.services (category_id, slug, name, duration_minutes, price_amount,
                             currency, sort_order, is_public, is_active, kind)
  select id, 'vincha-tono', 'Vincha de tono', 60, 30000,
         'ARS', 200, false, true, 'color'
    from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set
    name = excluded.name, price_amount = excluded.price_amount,
    kind = excluded.kind, is_active = true, deleted_at = null;

insert into public.service_parameters (service_id, price_display_mode, length_affects_price,
                                       updated_by)
  select id, 'from', true, 'planilla viva 2026-09-12' from public.services where slug = 'vincha-tono'
  on conflict (service_id) do nothing;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'corto', 30000, 60, 0, 'sol_pricelist', 'COLORACIONES · solo vincha', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'vincha-tono'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'medio', 35000, 60, 0, 'sol_pricelist', 'COLORACIONES · solo vincha', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'vincha-tono'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'largo', 40000, 60, 0, 'sol_pricelist', 'COLORACIONES · solo vincha', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'vincha-tono'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'xl', 50000, 60, 0, 'sol_pricelist', 'COLORACIONES · solo vincha', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'vincha-tono'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;

-- vincha-color-comun ← COLORACIONES · todo(matizado) color comun  -- una celda vacía en la planilla, completada con el largo contiguo
insert into public.services (category_id, slug, name, duration_minutes, price_amount,
                             currency, sort_order, is_public, is_active, kind)
  select id, 'vincha-color-comun', 'Vincha con color común', 60, 50000,
         'ARS', 200, false, true, 'color'
    from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set
    name = excluded.name, price_amount = excluded.price_amount,
    kind = excluded.kind, is_active = true, deleted_at = null;

insert into public.service_parameters (service_id, price_display_mode, length_affects_price,
                                       updated_by)
  select id, 'from', true, 'planilla viva 2026-09-12' from public.services where slug = 'vincha-color-comun'
  on conflict (service_id) do nothing;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'corto', 50000, 60, 0, 'sol_pricelist', 'COLORACIONES · todo(matizado) color comun', 'low',
         'planilla viva 2026-09-12'
    from public.services where slug = 'vincha-color-comun'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'medio', 60000, 60, 0, 'sol_pricelist', 'COLORACIONES · todo(matizado) color comun', 'low',
         'planilla viva 2026-09-12'
    from public.services where slug = 'vincha-color-comun'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'largo', 75000, 60, 0, 'sol_pricelist', 'COLORACIONES · todo(matizado) color comun', 'low',
         'planilla viva 2026-09-12'
    from public.services where slug = 'vincha-color-comun'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'xl', 75000, 60, 0, 'sol_pricelist', 'COLORACIONES · todo(matizado) color comun', 'low',
         'planilla viva 2026-09-12'
    from public.services where slug = 'vincha-color-comun'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;

-- reflejos-gorra-raices ← MECHAS/REFLEJOS CON GORRA · RAICES
insert into public.services (category_id, slug, name, duration_minutes, price_amount,
                             currency, sort_order, is_public, is_active, kind)
  select id, 'reflejos-gorra-raices', 'Reflejos con gorra · raíces', 60, 68000,
         'ARS', 200, false, true, 'servicio'
    from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set
    name = excluded.name, price_amount = excluded.price_amount,
    kind = excluded.kind, is_active = true, deleted_at = null;

insert into public.service_parameters (service_id, price_display_mode, length_affects_price,
                                       updated_by)
  select id, 'from', true, 'planilla viva 2026-09-12' from public.services where slug = 'reflejos-gorra-raices'
  on conflict (service_id) do nothing;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'corto', 68000, 60, 0, 'sol_pricelist', 'MECHAS/REFLEJOS CON GORRA · RAICES', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'reflejos-gorra-raices'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'medio', 75000, 60, 0, 'sol_pricelist', 'MECHAS/REFLEJOS CON GORRA · RAICES', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'reflejos-gorra-raices'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'largo', 80000, 60, 0, 'sol_pricelist', 'MECHAS/REFLEJOS CON GORRA · RAICES', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'reflejos-gorra-raices'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'xl', 90000, 60, 0, 'sol_pricelist', 'MECHAS/REFLEJOS CON GORRA · RAICES', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'reflejos-gorra-raices'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;

-- reflejos-gorra-total ← MECHAS/REFLEJOS CON GORRA · TOTAL
insert into public.services (category_id, slug, name, duration_minutes, price_amount,
                             currency, sort_order, is_public, is_active, kind)
  select id, 'reflejos-gorra-total', 'Reflejos con gorra · total', 60, 80000,
         'ARS', 200, false, true, 'servicio'
    from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set
    name = excluded.name, price_amount = excluded.price_amount,
    kind = excluded.kind, is_active = true, deleted_at = null;

insert into public.service_parameters (service_id, price_display_mode, length_affects_price,
                                       updated_by)
  select id, 'from', true, 'planilla viva 2026-09-12' from public.services where slug = 'reflejos-gorra-total'
  on conflict (service_id) do nothing;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'corto', 80000, 60, 0, 'sol_pricelist', 'MECHAS/REFLEJOS CON GORRA · TOTAL', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'reflejos-gorra-total'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'medio', 90000, 60, 0, 'sol_pricelist', 'MECHAS/REFLEJOS CON GORRA · TOTAL', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'reflejos-gorra-total'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'largo', 100000, 60, 0, 'sol_pricelist', 'MECHAS/REFLEJOS CON GORRA · TOTAL', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'reflejos-gorra-total'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'xl', 110000, 60, 0, 'sol_pricelist', 'MECHAS/REFLEJOS CON GORRA · TOTAL', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'reflejos-gorra-total'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;

-- iluminacion-gorra ← MECHAS/REFLEJOS CON GORRA · ILUMINACION
insert into public.services (category_id, slug, name, duration_minutes, price_amount,
                             currency, sort_order, is_public, is_active, kind)
  select id, 'iluminacion-gorra', 'Iluminación con gorra', 60, 60000,
         'ARS', 200, false, true, 'servicio'
    from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set
    name = excluded.name, price_amount = excluded.price_amount,
    kind = excluded.kind, is_active = true, deleted_at = null;

insert into public.service_parameters (service_id, price_display_mode, length_affects_price,
                                       updated_by)
  select id, 'from', true, 'planilla viva 2026-09-12' from public.services where slug = 'iluminacion-gorra'
  on conflict (service_id) do nothing;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'corto', 60000, 60, 0, 'sol_pricelist', 'MECHAS/REFLEJOS CON GORRA · ILUMINACION', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'iluminacion-gorra'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'medio', 75000, 60, 0, 'sol_pricelist', 'MECHAS/REFLEJOS CON GORRA · ILUMINACION', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'iluminacion-gorra'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'largo', 90000, 60, 0, 'sol_pricelist', 'MECHAS/REFLEJOS CON GORRA · ILUMINACION', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'iluminacion-gorra'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'xl', 100000, 60, 0, 'sol_pricelist', 'MECHAS/REFLEJOS CON GORRA · ILUMINACION', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'iluminacion-gorra'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;

-- reflejos-papel-total ← MECHAS/REFLEJOS CON PAPEL · TOTAL
insert into public.services (category_id, slug, name, duration_minutes, price_amount,
                             currency, sort_order, is_public, is_active, kind)
  select id, 'reflejos-papel-total', 'Reflejos con papel · total', 60, 85000,
         'ARS', 200, false, true, 'servicio'
    from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set
    name = excluded.name, price_amount = excluded.price_amount,
    kind = excluded.kind, is_active = true, deleted_at = null;

insert into public.service_parameters (service_id, price_display_mode, length_affects_price,
                                       updated_by)
  select id, 'from', true, 'planilla viva 2026-09-12' from public.services where slug = 'reflejos-papel-total'
  on conflict (service_id) do nothing;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'corto', 85000, 60, 0, 'sol_pricelist', 'MECHAS/REFLEJOS CON PAPEL · TOTAL', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'reflejos-papel-total'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'medio', 100000, 60, 0, 'sol_pricelist', 'MECHAS/REFLEJOS CON PAPEL · TOTAL', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'reflejos-papel-total'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'largo', 120000, 60, 0, 'sol_pricelist', 'MECHAS/REFLEJOS CON PAPEL · TOTAL', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'reflejos-papel-total'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'xl', 140000, 60, 0, 'sol_pricelist', 'MECHAS/REFLEJOS CON PAPEL · TOTAL', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'reflejos-papel-total'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;

-- iluminacion-papel ← MECHAS/REFLEJOS CON PAPEL · ILUMINACION
insert into public.services (category_id, slug, name, duration_minutes, price_amount,
                             currency, sort_order, is_public, is_active, kind)
  select id, 'iluminacion-papel', 'Iluminación con papel', 60, 70000,
         'ARS', 200, false, true, 'servicio'
    from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set
    name = excluded.name, price_amount = excluded.price_amount,
    kind = excluded.kind, is_active = true, deleted_at = null;

insert into public.service_parameters (service_id, price_display_mode, length_affects_price,
                                       updated_by)
  select id, 'from', true, 'planilla viva 2026-09-12' from public.services where slug = 'iluminacion-papel'
  on conflict (service_id) do nothing;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'corto', 70000, 60, 0, 'sol_pricelist', 'MECHAS/REFLEJOS CON PAPEL · ILUMINACION', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'iluminacion-papel'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'medio', 90000, 60, 0, 'sol_pricelist', 'MECHAS/REFLEJOS CON PAPEL · ILUMINACION', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'iluminacion-papel'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'largo', 95000, 60, 0, 'sol_pricelist', 'MECHAS/REFLEJOS CON PAPEL · ILUMINACION', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'iluminacion-papel'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'xl', 105000, 60, 0, 'sol_pricelist', 'MECHAS/REFLEJOS CON PAPEL · ILUMINACION', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'iluminacion-papel'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;

-- californianas ← CALIFORNIANAS
insert into public.services (category_id, slug, name, duration_minutes, price_amount,
                             currency, sort_order, is_public, is_active, kind)
  select id, 'californianas', 'Californianas', 60, 90000,
         'ARS', 200, false, true, 'servicio'
    from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set
    name = excluded.name, price_amount = excluded.price_amount,
    kind = excluded.kind, is_active = true, deleted_at = null;

insert into public.service_parameters (service_id, price_display_mode, length_affects_price,
                                       updated_by)
  select id, 'from', true, 'planilla viva 2026-09-12' from public.services where slug = 'californianas'
  on conflict (service_id) do nothing;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'corto', 90000, 60, 0, 'sol_pricelist', 'CALIFORNIANAS', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'californianas'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'medio', 100000, 60, 0, 'sol_pricelist', 'CALIFORNIANAS', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'californianas'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'largo', 120000, 60, 0, 'sol_pricelist', 'CALIFORNIANAS', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'californianas'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'xl', 150000, 60, 0, 'sol_pricelist', 'CALIFORNIANAS', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'californianas'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;

-- contorno ← CONTORNO
insert into public.services (category_id, slug, name, duration_minutes, price_amount,
                             currency, sort_order, is_public, is_active, kind)
  select id, 'contorno', 'Contorno', 60, 50000,
         'ARS', 200, false, true, 'servicio'
    from public.categories where slug = 'peluqueria'
  on conflict (slug) do update set
    name = excluded.name, price_amount = excluded.price_amount,
    kind = excluded.kind, is_active = true, deleted_at = null;

insert into public.service_parameters (service_id, price_display_mode, length_affects_price,
                                       updated_by)
  select id, 'from', true, 'planilla viva 2026-09-12' from public.services where slug = 'contorno'
  on conflict (service_id) do nothing;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'corto', 50000, 60, 0, 'sol_pricelist', 'CONTORNO', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'contorno'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'medio', 60000, 60, 0, 'sol_pricelist', 'CONTORNO', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'contorno'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'largo', 75000, 60, 0, 'sol_pricelist', 'CONTORNO', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'contorno'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
insert into public.service_price_tiers (service_id, length_tier, price_main,
       duration_main_min, process_min, source, source_ref, confidence, updated_by)
  select id, 'xl', 80000, 60, 0, 'sol_pricelist', 'CONTORNO', 'medium',
         'planilla viva 2026-09-12'
    from public.services where slug = 'contorno'
  on conflict (service_id, length_tier) do update set
    price_main = excluded.price_main, source = excluded.source,
    source_ref = excluded.source_ref, confidence = excluded.confidence;
