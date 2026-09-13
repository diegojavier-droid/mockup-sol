-- El tiempo tiene su propio origen
--
-- Hasta ahora cada fila de precio traia UNA sola marca de origen para
-- dos datos distintos, y los dos caminos que la escriben estaban mal,
-- cada uno a su manera:
--
--   * el endpoint PATCH de tramos marcaba las DOS dimensiones como
--     "validado por Sol" aunque ella hubiera tocado una sola, con lo que
--     corregir una duracion daba por confirmado un precio que nadie miro;
--   * `set_service_price` —la funcion detras de "Precios y tiempos", que
--     es la pantalla donde Sol corrige de verdad— no tocaba el origen en
--     absoluto: Sol podia repasar el salon entero y el sistema seguia
--     diciendo que todo eran supuestos de industria.
--
-- Eso ya era flojo. Pasa a ser un problema concreto ahora, porque los
-- precios salen de la planilla de Sol y los tiempos NO: la planilla no
-- tiene duraciones (se reviso hoja por hoja; las de cobros registran
-- nombre, efectivo, transferencia y quien atendio, ningun horario).
--
-- Asi que el origen se parte en dos: `source` pasa a hablar solo del
-- precio y `duration_source` habla del tiempo.
--
-- LAS TECNICAS DE MECHONES NO SON INTERCAMBIABLES
--
-- El catalogo tiene varias lineas de mechones y la diferencia de precio
-- responde a la tecnica, no a un capricho. Importa para estimar tiempos:
--
--   * GORRA: se sacan mechones finos por los agujeros de un gorro. El
--     gorro aisla fisicamente lo extraido del resto, asi que el producto
--     se puede dejar solo en el crecimiento nuevo (raices) o correrlo
--     hasta las puntas (total). Por eso hay DOS lineas de gorra.
--
--   * PAPEL: se apoya la seccion sobre aluminio y se envuelve de la base
--     a la punta. No hay linea de "papel raices" y no es un olvido de la
--     planilla: el papel se monta desde el cuero cabelludo y cubre todo
--     el largo; aislar solo unos milimetros no se sostiene y el producto
--     filtraria al pelo limpio. La tecnica no lo permite.
--
--   * ILUMINACION: aclara secciones puntuales de forma sutil, sin
--     cambiar el tono base. Menos mechones que unos reflejos, y por eso
--     Sol la cobra menos y lleva menos tiempo.
--
--   * CALIFORNIANAS: decolorante concentrado de medios a puntas, con
--     contraste marcado y division visible entre raiz y puntas. NO es
--     balayage: el balayage barre a mano alzada buscando un degradado
--     difuminado sin linea de transicion. Son dos servicios distintos,
--     con precios distintos, y el salon ofrece los dos.
--
--   * CONTORNO: enmarca el rostro. Solo los mechones del nacimiento del
--     pelo y los laterales; el resto de la melena no se toca.
--
-- DE DONDE SALEN LOS MINUTOS
--
-- De tiempos de referencia del oficio, no de la operacion de Sol:
--
--   * raiz: se pinta solo la raiz, ~20 min de aplicacion, y el largo
--     mueve el lavado y no la pintada;
--   * color total: ~30 min de aplicacion y ahi si pesa el largo;
--   * gorra: tecnica parcial, mas rapida que el papel;
--   * papel cabeza entera: la referencia da 2 a 4 horas;
--   * californianas: 1.5 a 3 horas, y MENOS que las mechas tradicionales
--     con papel;
--   * contorno: ~1h45 de techo con matizado, menos si son pocos mechones;
--   * brushing: ~45 min, sube a 60/90 en pelo largo o abundante;
--   * lavado: 10 a 15 min.
--
-- Todos entran marcados `industry_baseline` / `low`, que es lo que los
-- deja listados como pendientes hasta que Sol los corrija desde el panel.
-- Ninguno se publica: publicar sigue siendo decision de ella.

-- 1. El tiempo pasa a tener su propia procedencia ------------------------

alter table public.service_price_tiers
  add column if not exists duration_source text not null default 'industry_baseline'
    check (duration_source in ('industry_baseline','sol_pricelist','sol_validated','sol_adjusted')),
  add column if not exists duration_confidence text not null default 'low'
    check (duration_confidence in ('high','medium','low'));

comment on column public.service_price_tiers.source is
  'De donde sale el PRECIO. El tiempo tiene su propio duration_source.';
comment on column public.service_price_tiers.duration_source is
  'De donde salen los minutos. La planilla de Sol no trae duraciones: '
  'una fila con source=sol_pricelist casi siempre tiene el tiempo estimado.';

-- Reparto de lo que ya habia: hasta hoy `source` describia las dos cosas,
-- salvo en las filas que vinieron de la planilla, donde el tiempo nunca
-- fue de Sol porque la planilla no los tiene.
update public.service_price_tiers
   set duration_source = case when source = 'sol_pricelist' then 'industry_baseline' else source end,
       duration_confidence = case when source = 'sol_pricelist' then 'low' else confidence end;

-- 2. Los minutos de los 27 que la planilla trae sin duracion -------------


-- raiz-exiline
update public.service_price_tiers t
   set duration_main_min = 75,
       process_min = 35,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'raiz-exiline'
   and t.length_tier = 'corto';
update public.service_price_tiers t
   set duration_main_min = 75,
       process_min = 35,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'raiz-exiline'
   and t.length_tier = 'medio';
update public.service_price_tiers t
   set duration_main_min = 90,
       process_min = 35,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'raiz-exiline'
   and t.length_tier = 'largo';
update public.service_price_tiers t
   set duration_main_min = 90,
       process_min = 35,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'raiz-exiline'
   and t.length_tier = 'xl';

-- raiz-itely
update public.service_price_tiers t
   set duration_main_min = 75,
       process_min = 35,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'raiz-itely'
   and t.length_tier = 'corto';
update public.service_price_tiers t
   set duration_main_min = 75,
       process_min = 35,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'raiz-itely'
   and t.length_tier = 'medio';
update public.service_price_tiers t
   set duration_main_min = 90,
       process_min = 35,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'raiz-itely'
   and t.length_tier = 'largo';
update public.service_price_tiers t
   set duration_main_min = 90,
       process_min = 35,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'raiz-itely'
   and t.length_tier = 'xl';

-- raiz-sin-tacc
update public.service_price_tiers t
   set duration_main_min = 75,
       process_min = 35,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'raiz-sin-tacc'
   and t.length_tier = 'corto';
update public.service_price_tiers t
   set duration_main_min = 75,
       process_min = 35,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'raiz-sin-tacc'
   and t.length_tier = 'medio';
update public.service_price_tiers t
   set duration_main_min = 90,
       process_min = 35,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'raiz-sin-tacc'
   and t.length_tier = 'largo';
update public.service_price_tiers t
   set duration_main_min = 90,
       process_min = 35,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'raiz-sin-tacc'
   and t.length_tier = 'xl';

-- raiz-tono-well
update public.service_price_tiers t
   set duration_main_min = 75,
       process_min = 35,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'raiz-tono-well'
   and t.length_tier = 'corto';
update public.service_price_tiers t
   set duration_main_min = 75,
       process_min = 35,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'raiz-tono-well'
   and t.length_tier = 'medio';
update public.service_price_tiers t
   set duration_main_min = 90,
       process_min = 35,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'raiz-tono-well'
   and t.length_tier = 'largo';
update public.service_price_tiers t
   set duration_main_min = 90,
       process_min = 35,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'raiz-tono-well'
   and t.length_tier = 'xl';

-- total-exiline
update public.service_price_tiers t
   set duration_main_min = 90,
       process_min = 35,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'total-exiline'
   and t.length_tier = 'corto';
update public.service_price_tiers t
   set duration_main_min = 105,
       process_min = 35,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'total-exiline'
   and t.length_tier = 'medio';
update public.service_price_tiers t
   set duration_main_min = 120,
       process_min = 35,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'total-exiline'
   and t.length_tier = 'largo';
update public.service_price_tiers t
   set duration_main_min = 135,
       process_min = 35,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'total-exiline'
   and t.length_tier = 'xl';

-- total-itely
update public.service_price_tiers t
   set duration_main_min = 90,
       process_min = 35,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'total-itely'
   and t.length_tier = 'corto';
update public.service_price_tiers t
   set duration_main_min = 105,
       process_min = 35,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'total-itely'
   and t.length_tier = 'medio';
update public.service_price_tiers t
   set duration_main_min = 120,
       process_min = 35,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'total-itely'
   and t.length_tier = 'largo';
update public.service_price_tiers t
   set duration_main_min = 135,
       process_min = 35,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'total-itely'
   and t.length_tier = 'xl';

-- total-sin-tacc
update public.service_price_tiers t
   set duration_main_min = 90,
       process_min = 35,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'total-sin-tacc'
   and t.length_tier = 'corto';
update public.service_price_tiers t
   set duration_main_min = 105,
       process_min = 35,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'total-sin-tacc'
   and t.length_tier = 'medio';
update public.service_price_tiers t
   set duration_main_min = 120,
       process_min = 35,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'total-sin-tacc'
   and t.length_tier = 'largo';
update public.service_price_tiers t
   set duration_main_min = 135,
       process_min = 35,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'total-sin-tacc'
   and t.length_tier = 'xl';

-- total-tono-well
update public.service_price_tiers t
   set duration_main_min = 90,
       process_min = 35,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'total-tono-well'
   and t.length_tier = 'corto';
update public.service_price_tiers t
   set duration_main_min = 105,
       process_min = 35,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'total-tono-well'
   and t.length_tier = 'medio';
update public.service_price_tiers t
   set duration_main_min = 120,
       process_min = 35,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'total-tono-well'
   and t.length_tier = 'largo';
update public.service_price_tiers t
   set duration_main_min = 135,
       process_min = 35,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'total-tono-well'
   and t.length_tier = 'xl';

-- vincha-tono
update public.service_price_tiers t
   set duration_main_min = 60,
       process_min = 30,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'vincha-tono'
   and t.length_tier = 'corto';
update public.service_price_tiers t
   set duration_main_min = 60,
       process_min = 30,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'vincha-tono'
   and t.length_tier = 'medio';
update public.service_price_tiers t
   set duration_main_min = 75,
       process_min = 30,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'vincha-tono'
   and t.length_tier = 'largo';
update public.service_price_tiers t
   set duration_main_min = 75,
       process_min = 30,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'vincha-tono'
   and t.length_tier = 'xl';

-- vincha-color-comun
update public.service_price_tiers t
   set duration_main_min = 60,
       process_min = 30,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'vincha-color-comun'
   and t.length_tier = 'corto';
update public.service_price_tiers t
   set duration_main_min = 60,
       process_min = 30,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'vincha-color-comun'
   and t.length_tier = 'medio';
update public.service_price_tiers t
   set duration_main_min = 75,
       process_min = 30,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'vincha-color-comun'
   and t.length_tier = 'largo';
update public.service_price_tiers t
   set duration_main_min = 75,
       process_min = 30,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'vincha-color-comun'
   and t.length_tier = 'xl';

-- pasar-color
update public.service_price_tiers t
   set duration_main_min = 45,
       process_min = 25,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'pasar-color'
   and t.length_tier = 'corto';
update public.service_price_tiers t
   set duration_main_min = 45,
       process_min = 25,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'pasar-color'
   and t.length_tier = 'medio';
update public.service_price_tiers t
   set duration_main_min = 60,
       process_min = 25,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'pasar-color'
   and t.length_tier = 'largo';
update public.service_price_tiers t
   set duration_main_min = 60,
       process_min = 25,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'pasar-color'
   and t.length_tier = 'xl';

-- reflejos-gorra-raices
update public.service_price_tiers t
   set duration_main_min = 90,
       process_min = 30,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'reflejos-gorra-raices'
   and t.length_tier = 'corto';
update public.service_price_tiers t
   set duration_main_min = 90,
       process_min = 30,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'reflejos-gorra-raices'
   and t.length_tier = 'medio';
update public.service_price_tiers t
   set duration_main_min = 105,
       process_min = 30,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'reflejos-gorra-raices'
   and t.length_tier = 'largo';
update public.service_price_tiers t
   set duration_main_min = 105,
       process_min = 30,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'reflejos-gorra-raices'
   and t.length_tier = 'xl';

-- reflejos-gorra-total
update public.service_price_tiers t
   set duration_main_min = 105,
       process_min = 30,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'reflejos-gorra-total'
   and t.length_tier = 'corto';
update public.service_price_tiers t
   set duration_main_min = 120,
       process_min = 30,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'reflejos-gorra-total'
   and t.length_tier = 'medio';
update public.service_price_tiers t
   set duration_main_min = 135,
       process_min = 30,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'reflejos-gorra-total'
   and t.length_tier = 'largo';
update public.service_price_tiers t
   set duration_main_min = 150,
       process_min = 30,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'reflejos-gorra-total'
   and t.length_tier = 'xl';

-- iluminacion-gorra
update public.service_price_tiers t
   set duration_main_min = 90,
       process_min = 30,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'iluminacion-gorra'
   and t.length_tier = 'corto';
update public.service_price_tiers t
   set duration_main_min = 105,
       process_min = 30,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'iluminacion-gorra'
   and t.length_tier = 'medio';
update public.service_price_tiers t
   set duration_main_min = 120,
       process_min = 30,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'iluminacion-gorra'
   and t.length_tier = 'largo';
update public.service_price_tiers t
   set duration_main_min = 120,
       process_min = 30,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'iluminacion-gorra'
   and t.length_tier = 'xl';

-- reflejos-papel-total
update public.service_price_tiers t
   set duration_main_min = 135,
       process_min = 40,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'reflejos-papel-total'
   and t.length_tier = 'corto';
update public.service_price_tiers t
   set duration_main_min = 150,
       process_min = 40,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'reflejos-papel-total'
   and t.length_tier = 'medio';
update public.service_price_tiers t
   set duration_main_min = 165,
       process_min = 40,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'reflejos-papel-total'
   and t.length_tier = 'largo';
update public.service_price_tiers t
   set duration_main_min = 180,
       process_min = 40,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'reflejos-papel-total'
   and t.length_tier = 'xl';

-- iluminacion-papel
update public.service_price_tiers t
   set duration_main_min = 120,
       process_min = 40,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'iluminacion-papel'
   and t.length_tier = 'corto';
update public.service_price_tiers t
   set duration_main_min = 135,
       process_min = 40,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'iluminacion-papel'
   and t.length_tier = 'medio';
update public.service_price_tiers t
   set duration_main_min = 150,
       process_min = 40,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'iluminacion-papel'
   and t.length_tier = 'largo';
update public.service_price_tiers t
   set duration_main_min = 165,
       process_min = 40,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'iluminacion-papel'
   and t.length_tier = 'xl';

-- californianas
update public.service_price_tiers t
   set duration_main_min = 105,
       process_min = 35,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'californianas'
   and t.length_tier = 'corto';
update public.service_price_tiers t
   set duration_main_min = 120,
       process_min = 35,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'californianas'
   and t.length_tier = 'medio';
update public.service_price_tiers t
   set duration_main_min = 135,
       process_min = 35,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'californianas'
   and t.length_tier = 'largo';
update public.service_price_tiers t
   set duration_main_min = 150,
       process_min = 35,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'californianas'
   and t.length_tier = 'xl';

-- contorno
update public.service_price_tiers t
   set duration_main_min = 70,
       process_min = 30,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'contorno'
   and t.length_tier = 'corto';
update public.service_price_tiers t
   set duration_main_min = 80,
       process_min = 30,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'contorno'
   and t.length_tier = 'medio';
update public.service_price_tiers t
   set duration_main_min = 90,
       process_min = 30,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'contorno'
   and t.length_tier = 'largo';
update public.service_price_tiers t
   set duration_main_min = 95,
       process_min = 30,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'contorno'
   and t.length_tier = 'xl';

-- ondas-al-agua
update public.service_price_tiers t
   set duration_main_min = 60,
       process_min = 0,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'ondas-al-agua'
   and t.length_tier = 'corto';
update public.service_price_tiers t
   set duration_main_min = 70,
       process_min = 0,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'ondas-al-agua'
   and t.length_tier = 'medio';
update public.service_price_tiers t
   set duration_main_min = 80,
       process_min = 0,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'ondas-al-agua'
   and t.length_tier = 'largo';
update public.service_price_tiers t
   set duration_main_min = 90,
       process_min = 0,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'ondas-al-agua'
   and t.length_tier = 'xl';

-- semirecogido
update public.service_price_tiers t
   set duration_main_min = 60,
       process_min = 0,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'semirecogido'
   and t.length_tier = 'corto';
update public.service_price_tiers t
   set duration_main_min = 60,
       process_min = 0,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'semirecogido'
   and t.length_tier = 'medio';
update public.service_price_tiers t
   set duration_main_min = 75,
       process_min = 0,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'semirecogido'
   and t.length_tier = 'largo';
update public.service_price_tiers t
   set duration_main_min = 75,
       process_min = 0,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'semirecogido'
   and t.length_tier = 'xl';

-- trenzas
update public.service_price_tiers t
   set duration_main_min = 30,
       process_min = 0,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'trenzas'
   and t.length_tier = 'corto';
update public.service_price_tiers t
   set duration_main_min = 30,
       process_min = 0,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'trenzas'
   and t.length_tier = 'medio';
update public.service_price_tiers t
   set duration_main_min = 40,
       process_min = 0,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'trenzas'
   and t.length_tier = 'largo';
update public.service_price_tiers t
   set duration_main_min = 40,
       process_min = 0,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'trenzas'
   and t.length_tier = 'xl';

-- brushing-plancha
update public.service_price_tiers t
   set duration_main_min = 45,
       process_min = 0,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'brushing-plancha'
   and t.length_tier = 'corto';
update public.service_price_tiers t
   set duration_main_min = 50,
       process_min = 0,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'brushing-plancha'
   and t.length_tier = 'medio';
update public.service_price_tiers t
   set duration_main_min = 60,
       process_min = 0,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'brushing-plancha'
   and t.length_tier = 'largo';
update public.service_price_tiers t
   set duration_main_min = 70,
       process_min = 0,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'brushing-plancha'
   and t.length_tier = 'xl';

-- brushing-movimiento
update public.service_price_tiers t
   set duration_main_min = 45,
       process_min = 0,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'brushing-movimiento'
   and t.length_tier = 'corto';
update public.service_price_tiers t
   set duration_main_min = 50,
       process_min = 0,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'brushing-movimiento'
   and t.length_tier = 'medio';
update public.service_price_tiers t
   set duration_main_min = 60,
       process_min = 0,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'brushing-movimiento'
   and t.length_tier = 'largo';
update public.service_price_tiers t
   set duration_main_min = 70,
       process_min = 0,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'brushing-movimiento'
   and t.length_tier = 'xl';

-- ondas-plancha
update public.service_price_tiers t
   set duration_main_min = 45,
       process_min = 0,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'ondas-plancha'
   and t.length_tier = 'corto';
update public.service_price_tiers t
   set duration_main_min = 50,
       process_min = 0,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'ondas-plancha'
   and t.length_tier = 'medio';
update public.service_price_tiers t
   set duration_main_min = 60,
       process_min = 0,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'ondas-plancha'
   and t.length_tier = 'largo';
update public.service_price_tiers t
   set duration_main_min = 70,
       process_min = 0,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'ondas-plancha'
   and t.length_tier = 'xl';

-- secado-modelado
update public.service_price_tiers t
   set duration_main_min = 30,
       process_min = 0,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'secado-modelado'
   and t.length_tier = 'corto';
update public.service_price_tiers t
   set duration_main_min = 30,
       process_min = 0,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'secado-modelado'
   and t.length_tier = 'medio';
update public.service_price_tiers t
   set duration_main_min = 40,
       process_min = 0,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'secado-modelado'
   and t.length_tier = 'largo';
update public.service_price_tiers t
   set duration_main_min = 45,
       process_min = 0,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'secado-modelado'
   and t.length_tier = 'xl';

-- lavado
update public.service_price_tiers t
   set duration_main_min = 15,
       process_min = 0,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'lavado'
   and t.length_tier = 'corto';
update public.service_price_tiers t
   set duration_main_min = 15,
       process_min = 0,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'lavado'
   and t.length_tier = 'medio';
update public.service_price_tiers t
   set duration_main_min = 20,
       process_min = 0,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'lavado'
   and t.length_tier = 'largo';
update public.service_price_tiers t
   set duration_main_min = 20,
       process_min = 0,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'lavado'
   and t.length_tier = 'xl';

-- corte-flequillo
update public.service_price_tiers t
   set duration_main_min = 15,
       process_min = 0,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'corte-flequillo'
   and t.length_tier = 'corto';
update public.service_price_tiers t
   set duration_main_min = 15,
       process_min = 0,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'corte-flequillo'
   and t.length_tier = 'medio';
update public.service_price_tiers t
   set duration_main_min = 15,
       process_min = 0,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'corte-flequillo'
   and t.length_tier = 'largo';
update public.service_price_tiers t
   set duration_main_min = 15,
       process_min = 0,
       duration_source = 'industry_baseline',
       duration_confidence = 'low',
       source_ref = coalesce(nullif(source_ref, ''), '') ||
         ' · tiempo estimado de referencia, a confirmar con Sol'
  from public.services s
 where s.id = t.service_id and s.slug = 'corte-flequillo'
   and t.length_tier = 'xl';

-- 3. Si el tiempo cambia con el largo, el parametro tiene que decirlo ----
--
-- Misma trampa que con el precio: la bandera vive en otra tabla y nada
-- obliga a que coincidan. Se corrige donde haga falta, no solo en los 27.

update public.service_parameters p
   set length_affects_duration = true
 where not p.length_affects_duration
   and (select count(distinct t.duration_main_min)
          from public.service_price_tiers t
         where t.service_id = p.service_id) > 1;

-- 4. La columna vieja de la ficha deja de mentir -------------------------
--
-- `services.duration_minutes` es anterior a los tramos, no admite nulo y
-- es lo que la clienta ve en la tarjeta del catalogo. Los 27 quedaron
-- con 60 de relleno.
--
-- Se usa el MINIMO de los tramos, que es la convencion que ya aplica
-- set_service_price cuando Sol edita: la vitrina dice "desde".

update public.services s
   set duration_minutes = (select min(t.duration_main_min)
                             from public.service_price_tiers t
                            where t.service_id = s.id)
 where s.slug in ('raiz-exiline', 'raiz-itely', 'raiz-sin-tacc', 'raiz-tono-well', 'total-exiline', 'total-itely', 'total-sin-tacc', 'total-tono-well', 'vincha-tono', 'vincha-color-comun', 'pasar-color', 'reflejos-gorra-raices', 'reflejos-gorra-total', 'iluminacion-gorra', 'reflejos-papel-total', 'iluminacion-papel', 'californianas', 'contorno', 'ondas-al-agua', 'semirecogido', 'trenzas', 'brushing-plancha', 'brushing-movimiento', 'ondas-plancha', 'secado-modelado', 'lavado', 'corte-flequillo')
   and s.duration_minutes is distinct from (select min(t.duration_main_min)
                                              from public.service_price_tiers t
                                             where t.service_id = s.id);

-- 5. Editar desde el panel deja registrado QUE confirmo Sol -------------
--
-- `set_service_price` es la funcion que usa "Precios y tiempos", la
-- pantalla donde Sol corrige de verdad. Hasta hoy no tocaba el origen:
-- Sol podia corregir cada precio del salon y el sistema seguia diciendo
-- que eran supuestos de industria. La lista de pendientes no bajaba nunca.
--
-- Ahora marca cada dimension por separado, comparando contra lo que
-- habia. La pantalla manda siempre los dos valores, asi que mirar lo que
-- llega no alcanza: lo que decide es si el numero cambio.

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
as $BODY$
declare
  v_service public.services%rowtype;
  v_antes   public.service_price_tiers%rowtype;
begin
  if p_actor_id is null then
    raise exception 'actor_required';
  end if;

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
         source = case when p_price_main is distinct from v_antes.price_main
                       then 'sol_adjusted' else source end,
         confidence = case when p_price_main is distinct from v_antes.price_main
                       then 'high' else confidence end,
         duration_source = case when p_duration_min is distinct from v_antes.duration_main_min
                       then 'sol_adjusted' else duration_source end,
         duration_confidence = case when p_duration_min is distinct from v_antes.duration_main_min
                       then 'high' else duration_confidence end,
         updated_by        = p_actor_label,
         updated_at        = now()
   where service_id = v_service.id and length_tier = p_length_tier;

  -- Vitrina: el listado muestra <<desde>>, asi que el minimo vigente.
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

  return jsonb_build_object(
    'slug',              p_service_slug,
    'length_tier',       p_length_tier,
    'precio_anterior',   v_antes.price_main,
    'precio_nuevo',      p_price_main,
    'duracion_anterior', v_antes.duration_main_min,
    'duracion_nueva',    p_duration_min
  );
end;
$BODY$;

revoke all on function public.set_service_price(text, text, integer, integer, uuid, text)
  from public, anon, authenticated;
grant execute on function public.set_service_price(text, text, integer, integer, uuid, text)
  to service_role;

-- 6. Que el archivo se pruebe a si mismo ---------------------------------

do $$
declare
  n integer;
begin
  -- Los 108 tramos, uno por uno, contra la tabla que los genero. Esto
  -- es lo que detecta el UPDATE que no engancho ninguna fila: comparar
  -- contra "60/0 = sin tocar" no servia, porque seis de estos tiempos
  -- valen justo 60 con proceso 0 y son correctos.
  select count(*) into n
    from (values
           ('raiz-exiline','corto',75,35),
           ('raiz-exiline','medio',75,35),
           ('raiz-exiline','largo',90,35),
           ('raiz-exiline','xl',90,35),
           ('raiz-itely','corto',75,35),
           ('raiz-itely','medio',75,35),
           ('raiz-itely','largo',90,35),
           ('raiz-itely','xl',90,35),
           ('raiz-sin-tacc','corto',75,35),
           ('raiz-sin-tacc','medio',75,35),
           ('raiz-sin-tacc','largo',90,35),
           ('raiz-sin-tacc','xl',90,35),
           ('raiz-tono-well','corto',75,35),
           ('raiz-tono-well','medio',75,35),
           ('raiz-tono-well','largo',90,35),
           ('raiz-tono-well','xl',90,35),
           ('total-exiline','corto',90,35),
           ('total-exiline','medio',105,35),
           ('total-exiline','largo',120,35),
           ('total-exiline','xl',135,35),
           ('total-itely','corto',90,35),
           ('total-itely','medio',105,35),
           ('total-itely','largo',120,35),
           ('total-itely','xl',135,35),
           ('total-sin-tacc','corto',90,35),
           ('total-sin-tacc','medio',105,35),
           ('total-sin-tacc','largo',120,35),
           ('total-sin-tacc','xl',135,35),
           ('total-tono-well','corto',90,35),
           ('total-tono-well','medio',105,35),
           ('total-tono-well','largo',120,35),
           ('total-tono-well','xl',135,35),
           ('vincha-tono','corto',60,30),
           ('vincha-tono','medio',60,30),
           ('vincha-tono','largo',75,30),
           ('vincha-tono','xl',75,30),
           ('vincha-color-comun','corto',60,30),
           ('vincha-color-comun','medio',60,30),
           ('vincha-color-comun','largo',75,30),
           ('vincha-color-comun','xl',75,30),
           ('pasar-color','corto',45,25),
           ('pasar-color','medio',45,25),
           ('pasar-color','largo',60,25),
           ('pasar-color','xl',60,25),
           ('reflejos-gorra-raices','corto',90,30),
           ('reflejos-gorra-raices','medio',90,30),
           ('reflejos-gorra-raices','largo',105,30),
           ('reflejos-gorra-raices','xl',105,30),
           ('reflejos-gorra-total','corto',105,30),
           ('reflejos-gorra-total','medio',120,30),
           ('reflejos-gorra-total','largo',135,30),
           ('reflejos-gorra-total','xl',150,30),
           ('iluminacion-gorra','corto',90,30),
           ('iluminacion-gorra','medio',105,30),
           ('iluminacion-gorra','largo',120,30),
           ('iluminacion-gorra','xl',120,30),
           ('reflejos-papel-total','corto',135,40),
           ('reflejos-papel-total','medio',150,40),
           ('reflejos-papel-total','largo',165,40),
           ('reflejos-papel-total','xl',180,40),
           ('iluminacion-papel','corto',120,40),
           ('iluminacion-papel','medio',135,40),
           ('iluminacion-papel','largo',150,40),
           ('iluminacion-papel','xl',165,40),
           ('californianas','corto',105,35),
           ('californianas','medio',120,35),
           ('californianas','largo',135,35),
           ('californianas','xl',150,35),
           ('contorno','corto',70,30),
           ('contorno','medio',80,30),
           ('contorno','largo',90,30),
           ('contorno','xl',95,30),
           ('ondas-al-agua','corto',60,0),
           ('ondas-al-agua','medio',70,0),
           ('ondas-al-agua','largo',80,0),
           ('ondas-al-agua','xl',90,0),
           ('semirecogido','corto',60,0),
           ('semirecogido','medio',60,0),
           ('semirecogido','largo',75,0),
           ('semirecogido','xl',75,0),
           ('trenzas','corto',30,0),
           ('trenzas','medio',30,0),
           ('trenzas','largo',40,0),
           ('trenzas','xl',40,0),
           ('brushing-plancha','corto',45,0),
           ('brushing-plancha','medio',50,0),
           ('brushing-plancha','largo',60,0),
           ('brushing-plancha','xl',70,0),
           ('brushing-movimiento','corto',45,0),
           ('brushing-movimiento','medio',50,0),
           ('brushing-movimiento','largo',60,0),
           ('brushing-movimiento','xl',70,0),
           ('ondas-plancha','corto',45,0),
           ('ondas-plancha','medio',50,0),
           ('ondas-plancha','largo',60,0),
           ('ondas-plancha','xl',70,0),
           ('secado-modelado','corto',30,0),
           ('secado-modelado','medio',30,0),
           ('secado-modelado','largo',40,0),
           ('secado-modelado','xl',45,0),
           ('lavado','corto',15,0),
           ('lavado','medio',15,0),
           ('lavado','largo',20,0),
           ('lavado','xl',20,0),
           ('corte-flequillo','corto',15,0),
           ('corte-flequillo','medio',15,0),
           ('corte-flequillo','largo',15,0),
           ('corte-flequillo','xl',15,0)
         ) as esperado(slug, tramo, minutos, proceso)
    join public.services s on s.slug = esperado.slug
    join public.service_price_tiers t
      on t.service_id = s.id and t.length_tier = esperado.tramo
   where t.duration_main_min is distinct from esperado.minutos
      or t.process_min is distinct from esperado.proceso;
  if n <> 0 then
    raise exception '% tramos no quedaron con el tiempo que corresponde', n;
  end if;

  -- El proceso nunca puede comerse el total.
  select count(*) into n from public.service_price_tiers
   where process_min > duration_main_min;
  if n <> 0 then raise exception '% tramos con proceso mayor que el total', n; end if;

  -- Un color sin minutos de proceso seria un color que no revela.
  select count(*) into n
    from public.service_price_tiers t
    join public.services s on s.id = t.service_id
   where s.slug in ('raiz-itely','total-itely','californianas','reflejos-papel-total')
     and t.process_min = 0;
  if n <> 0 then raise exception '% tramos de color quedaron sin proceso', n; end if;

  -- La tarjeta del catalogo tiene que decir el minimo de los tramos:
  -- es lo que la clienta lee como "desde".
  select count(*) into n
    from public.services s
   where s.slug in ('raiz-exiline', 'raiz-itely', 'raiz-sin-tacc', 'raiz-tono-well', 'total-exiline', 'total-itely', 'total-sin-tacc', 'total-tono-well', 'vincha-tono', 'vincha-color-comun', 'pasar-color', 'reflejos-gorra-raices', 'reflejos-gorra-total', 'iluminacion-gorra', 'reflejos-papel-total', 'iluminacion-papel', 'californianas', 'contorno', 'ondas-al-agua', 'semirecogido', 'trenzas', 'brushing-plancha', 'brushing-movimiento', 'ondas-plancha', 'secado-modelado', 'lavado', 'corte-flequillo')
     and s.duration_minutes is distinct from (select min(t.duration_main_min)
                                                from public.service_price_tiers t
                                               where t.service_id = s.id);
  if n <> 0 then
    raise exception '% fichas no muestran el minimo de sus tramos', n;
  end if;

  -- Y la bandera del largo tiene que seguir a los datos.
  select count(*) into n
    from public.service_parameters p
   where not p.length_affects_duration
     and (select count(distinct t.duration_main_min)
            from public.service_price_tiers t
           where t.service_id = p.service_id) > 1;
  if n <> 0 then
    raise exception '% servicios varian el tiempo por largo sin declararlo', n;
  end if;

  raise notice 'EL TIEMPO TIENE SU PROPIO ORIGEN: pasa';
end $$;

