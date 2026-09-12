-- =====================================================================
-- Sol Mai · Cuáles servicios son «color»
--
-- PARA QUÉ
--
-- La migración anterior marcó los tratamientos, pero la promoción del salón
-- —color y tratamiento juntos salen menos— necesita las dos mitades. Sin
-- saber cuáles son color, `aplicarPromocion` no se dispara nunca y
-- `price_addon` queda cargada y sin usar.
--
-- DE DÓNDE SALE LA LISTA
--
-- Del bloque `COLORACIONES` de la hoja `servicios` de Sol, que es donde
-- ella misma agrupa lo que considera coloración: raíz y total de Exiline,
-- Sin TACC, Tono Well / tono sobre tono e Itely, más matizado y vincha.
--
-- QUÉ QUEDA AFUERA, Y POR QUÉ NO ES UN OLVIDO
--
-- Mechas, balayage y reflejos NO se marcan. No es que se hayan pasado por
-- alto: **no figuran en ningún bloque con precio de la lista de Sol**, ni
-- en COLORACIONES ni en SERVICIOS, aunque en los cobros de marzo a mayo
-- aparecen 27, 21 y 46 veces. Su lista de precios no cubre ese trabajo.
--
-- Marcarlos como color sería decidir por ella dos cosas a la vez: que son
-- coloración, y que la promoción de tratamientos también corre sobre ellos.
-- Ninguna de las dos se puede sacar del archivo. Quedan como `servicio`
-- —el valor que no cambia ningún precio— hasta que Sol lo diga.
--
-- Ver §8.10 de docs/sol-mai-reingenieria.md.
-- =====================================================================

alter table public.services
  drop constraint if exists services_kind_valido;

alter table public.services
  add constraint services_kind_valido
  check (kind in ('servicio', 'color', 'tratamiento'));

comment on column public.services.kind is
  'servicio: el precio no depende de qué más haya en el turno. '
  'color: servicio de coloración; es lo que dispara la promoción sobre los '
  'tratamientos del mismo turno. '
  'tratamiento: junto con un color cotiza a service_price_tiers.price_addon. '
  'Ver §8.2 y §8.10 de docs/sol-mai-reingenieria.md.';

-- ---------------------------------------------------------------------
-- Los cuatro que Sol agrupa bajo COLORACIONES
-- ---------------------------------------------------------------------
update public.services
   set kind = 'color'
 where slug in (
   'retoque-raiz',   -- «raiz» en su lista, en las cuatro líneas de color
   'color-global',   -- «total»
   'tonalizacion',   -- «MATIZADO» y «solo vincha»
   'bano-luz'        -- «TONO Well/tono sobre tono»
 );
