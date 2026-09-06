-- =====================================================================
-- Sol Mai · Medir la carga administrativa evitada (G-05)
--
-- Dirección fijó que el éxito no se mide por cantidad de reservas online
-- ni por funcionalidades, sino por cuánto trabajo humano dejó de hacer
-- el salón. Ese número hoy no es calculable: el dashboard mide ocupación
-- y plata, y nada de lo que se registra permite derivarlo.
--
-- Esto tiene urgencia de SECUENCIA, no de tamaño: cada consulta que la
-- web contesta sin dejar rastro es una medición que se pierde para
-- siempre. Instrumentar después de automatizar es quedarse sin el antes.
--
-- QUÉ SE CUENTA, Y QUÉ NO
--
-- Se cuenta lo que efectivamente pasó: la web respondió cuánto sale y
-- cuánto dura un servicio; la web respondió qué horarios hay. Son las
-- dos preguntas que, según el contexto de producto, hoy consumen a Sol y
-- a la secretaría antes de cada venta.
--
-- NO se cuenta "consultas evitadas". Que una clienta consulte el precio
-- en la web no prueba que no hubiera escrito igual por WhatsApp: eso es
-- una inferencia, y el nombre de la métrica no debe afirmarla. Se llama
-- por lo que es: consultas resueltas por la web.
--
-- Y NO se convierte a minutos. Cuánto tarda una persona en contestar una
-- consulta es un dato que sólo tiene Sol. Hasta que lo dé, el tiempo
-- ahorrado es NO DISPONIBLE — la misma regla que ya rige para el margen:
-- available=false, nunca un número estimado.
--
-- Contadores diarios, no filas por evento: el volumen es acotado, no
-- guarda identificadores de nadie, y el reporting sólo necesita el
-- agregado.
-- =====================================================================

create table if not exists public.assisted_activity_daily (
  day    date not null,
  metric text not null check (metric in (
    -- La web contestó cuánto sale y cuánto dura.
    'quote_self_service',
    -- La web contestó qué horarios hay.
    'availability_self_service'
  )),
  count  integer not null default 0 check (count >= 0),
  primary key (day, metric)
);

comment on table public.assisted_activity_daily is
  'Cuántas veces la web resolvió sola una consulta que de otro modo contestaba una persona. Agregado diario en hora del salón, sin datos personales. No afirma que la consulta se haya evitado: afirma que la web la contestó.';

revoke all on public.assisted_activity_daily from anon, authenticated;
grant all on public.assisted_activity_daily to service_role;
alter table public.assisted_activity_daily enable row level security;

-- ---------------------------------------------------------------------
-- Registro
-- ---------------------------------------------------------------------
-- El día es el del SALÓN, no el del servidor: a las 22:00 de Santa Fe ya
-- es el día siguiente en UTC, y una consulta de la noche del martes
-- contaría como del miércoles.

create or replace function public.record_assisted_activity(p_metric text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_day date := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
begin
  insert into public.assisted_activity_daily (day, metric, count)
  values (v_day, p_metric, 1)
  on conflict (day, metric) do update
    set count = public.assisted_activity_daily.count + 1;
end;
$$;

revoke all on function public.record_assisted_activity(text) from public, anon, authenticated;
grant execute on function public.record_assisted_activity(text) to service_role;

-- ---------------------------------------------------------------------
-- Lectura para el dashboard
-- ---------------------------------------------------------------------
-- Dos columnas honestas: lo que resolvió el sistema y lo que resolvió
-- una persona. La segunda sale de datos que ya existen —el canal de la
-- reserva y la bitácora de acciones operativas—, no de contadores
-- nuevos: si una persona intervino, ya quedó registrado.

create or replace function public.assisted_activity_summary(
  p_from timestamptz,
  p_to   timestamptz
) returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  v_tz constant text := 'America/Argentina/Buenos_Aires';
  v_from_day date := (p_from at time zone v_tz)::date;
  v_to_day   date := (p_to   at time zone v_tz)::date;
  v_quotes       bigint := 0;
  v_availability bigint := 0;
  v_online       bigint := 0;
  v_internal     bigint := 0;
  v_actions      bigint := 0;
begin
  select
    coalesce(sum(count) filter (where metric = 'quote_self_service'), 0),
    coalesce(sum(count) filter (where metric = 'availability_self_service'), 0)
  into v_quotes, v_availability
  from public.assisted_activity_daily
  where day >= v_from_day and day < v_to_day;

  -- Una reserva online la hizo la clienta sola. Las otras cuatro las
  -- tipeó alguien del salón.
  select
    count(*) filter (where source = 'online'),
    count(*) filter (where source <> 'online')
  into v_online, v_internal
  from public.bookings
  where starts_at >= p_from and starts_at < p_to;

  select count(*) into v_actions
    from public.audit_log
   where created_at >= p_from and created_at < p_to;

  return jsonb_build_object(
    'resolved_by_system', jsonb_build_object(
      'quotes',        v_quotes,
      'availability',  v_availability,
      'bookings',      v_online,
      'total',         v_quotes + v_availability + v_online
    ),
    'required_a_person', jsonb_build_object(
      'bookings',        v_internal,
      'operative_actions', v_actions,
      'total',           v_internal + v_actions
    ),
    -- Cuánto tarda una persona en contestar una consulta lo sabe Sol.
    -- Hasta que lo diga, esto no se estima: se declara no disponible.
    'time_saved', jsonb_build_object(
      'available', false,
      'minutes',   null,
      'reason',    'Falta el dato de cuánto tarda una persona en resolver cada tipo de consulta. No se estima.'
    )
  );
end;
$$;

revoke all on function public.assisted_activity_summary(timestamptz, timestamptz)
  from public, anon, authenticated;
grant execute on function public.assisted_activity_summary(timestamptz, timestamptz)
  to service_role;
