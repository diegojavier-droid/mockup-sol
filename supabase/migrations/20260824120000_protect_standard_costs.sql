-- =====================================================================
-- Sol Mai · El costo del salón no es información pública
--
-- `service_parameters` tiene lectura pública desde el principio: el
-- catálogo necesita saber si un servicio se cotiza "desde", si el largo
-- cambia el precio y cuánto setup lleva. Todo eso es información que la
-- clienta ve igual en la pantalla.
--
-- V4.1 agregó `standard_cost_amount` a esa misma tabla sin revisar la
-- política. El costo por servicio es la base del margen: cualquiera con
-- la clave pública —que por diseño se publica— podía leer la estructura
-- de costos del salón y deducir cuánto gana con cada servicio.
--
-- El resto de la tabla sigue siendo público. Sólo se saca la columna que
-- no tiene por qué salir.
-- =====================================================================

-- Un `revoke` de columna NO recorta un grant de tabla: el permiso de
-- tabla cubre todas las columnas y gana. Hay que sacar el de tabla y
-- reponer, columna por columna, lo que el catálogo sí necesita.
revoke select on public.service_parameters from anon, authenticated;

grant select (
  service_id,
  price_display_mode,
  length_affects_price,
  length_affects_duration,
  setup_minutes_override,
  requires_consultation,
  updated_by,
  updated_at
) on public.service_parameters to anon, authenticated;

comment on column public.service_parameters.standard_cost_amount is
  'Costo estándar del servicio. NULL significa "no sabemos", no cero. NO es público: es el insumo del margen.';
