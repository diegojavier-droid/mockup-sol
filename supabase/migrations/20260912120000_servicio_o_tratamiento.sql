-- =====================================================================
-- Sol Mai · Un tratamiento no es un servicio
--
-- POR QUÉ HACE FALTA DISTINGUIRLOS
--
-- Hasta acá `services` mezclaba dos cosas que el salón cobra distinto.
-- Un corte vale lo mismo vaya solo o acompañado. Un tratamiento no:
-- Sol hace una oferta a quien se lleva color y tratamiento juntos, y lo
-- dijo con sus palabras el 2026-09-12:
--
--   «tratamiento solo, es una cosa. tratamiento más color son dos
--    servicios juntos, por eso la diferencia de precio es como una
--    oferta que se hace por optar por los dos»
--
-- Medido contra 56 tickets reales de marzo a mayo, comparando la mediana
-- de «raíces solas» contra «raíces + tratamiento»: karseell $8.000,
-- máscara repair $7.000, riflessi $9.000, fusión $11.000. Los mismos
-- tratamientos sueltos valen entre $20.000 y $36.000.
--
-- `service_price_tiers.price_addon` ya existía para eso y estaba vacía en
-- las 127 filas. Lo que faltaba era poder decir CUÁLES servicios usan esa
-- columna. Eso es esta migración.
--
-- POR QUÉ UNA COLUMNA Y NO UNA TABLA `treatments`
--
-- Un tratamiento se reserva, ocupa tiempo y estación, y aparece en la
-- agenda igual que un servicio cuando va solo. Partirlo en dos tablas
-- duplicaría el motor de disponibilidad para no ganar nada. Lo que un
-- tratamiento necesita es una marca y un precio, no una tabla.
--
-- QUÉ NO CAMBIA
--
-- Nada. La columna tiene default y las filas existentes quedan como
-- `servicio`, que es lo que ya eran. El motor de reservas, la
-- disponibilidad y el cálculo de precio no se tocan: cotizar a
-- `price_addon` es trabajo del backend y va en su propio bloque.
-- =====================================================================

alter table public.services
  add column if not exists kind text not null default 'servicio';

-- El check va aparte y con nombre para poder evolucionarlo sin adivinar
-- cómo lo llamó PostgreSQL.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'services_kind_valido'
  ) then
    alter table public.services
      add constraint services_kind_valido check (kind in ('servicio', 'tratamiento'));
  end if;
end $$;

comment on column public.services.kind is
  'servicio: el precio no depende de qué más haya en el turno. tratamiento: '
  'cuando va junto con un color cotiza a service_price_tiers.price_addon, '
  'que es la oferta del salón por llevarse los dos. Ver §8.2 de '
  'docs/sol-mai-reingenieria.md.';

-- ---------------------------------------------------------------------
-- Los que ya estaban en el catálogo y son tratamientos
--
-- Se marcan por slug y no por categoría: `nutricion` y `corte-fem` viven
-- las dos en Peluquería, y la diferencia es cómo se cobran, no dónde
-- están. `post-color` entra porque es exactamente eso: lo que se aplica
-- después de un color.
-- ---------------------------------------------------------------------
update public.services
   set kind = 'tratamiento'
 where slug in (
   'botox',
   'hidratacion',
   'nutricion',
   'post-color',
   'reconstruccion',
   'reparacion'
 );

-- ---------------------------------------------------------------------
-- El índice sirve al catálogo público, que va a listar los tratamientos
-- aparte para poder ofrecerlos arriba de un color.
-- ---------------------------------------------------------------------
create index if not exists services_kind_idx
  on public.services (kind)
  where is_public and is_active and deleted_at is null;
