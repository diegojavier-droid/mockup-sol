-- =====================================================================
-- Sol Mai · los horarios reales del salón
--
-- Hasta ahora la base decía lunes a viernes de 09:30 a 18:30 y sábados
-- de 10:00 a 14:00. Ese horario nunca lo dijo nadie: venía del bootstrap
-- del catálogo, cuando todavía no había datos del negocio. Sobre esa
-- grilla se calcula TODA la disponibilidad que ve la clienta, así que el
-- sistema venía ofreciendo turnos los lunes —cuando el salón está
-- cerrado— y a las 17:30 de un martes, cuando ya cerró.
--
-- Horarios confirmados por Sol (vía Diego, 2026-09-07):
--
--   lunes                cerrado
--   martes y miércoles   08:00 a 15:00
--   jueves y viernes     13:00 a 20:00
--   sábados              fuera del canal online
--   domingos             cerrado
--
-- POR QUÉ EL SÁBADO NO ES UNA FRANJA VACÍA NI UNA FRANJA NORMAL
--
-- Sol sí trabaja algunos sábados, pero para peinados de novia y eventos
-- de fin de semana: trabajos que se conversan antes, no que se eligen de
-- una lista de horarios. Ponerlos en `business_hours` haría que el sitio
-- ofreciera sábados como cualquier otro día y que una clienta reservara
-- un brushing a las 11 encima de una novia. Dejar el sábado fuera de la
-- grilla es la decisión correcta y no cierra ninguna puerta: la reserva
-- por WhatsApp y la carga manual desde el panel siguen funcionando, y el
-- turno queda en la misma agenda con su canal de origen.
--
-- Si Sol define más adelante un horario fijo de sábado, se agrega una
-- franja acá y el sitio la toma sin tocar código.
--
-- QUÉ PASA CON LOS TURNOS YA CARGADOS FUERA DE ESTE HORARIO
--
-- Nada, y es a propósito. `business_hours` gobierna qué se OFRECE, no qué
-- es válido. Una reserva existente un lunes o un sábado sigue viva: puede
-- ser una excepción que Sol aceptó a mano, y el producto tiene que poder
-- sostener excepciones. Esta migración no toca `bookings`.
-- =====================================================================

-- Se reemplaza la grilla completa en vez de corregir fila por fila: las
-- filas viejas no representan ninguna decisión que valga la pena
-- conservar, y borrar-e-insertar evita pelear con la restricción de
-- solapamiento durante los pasos intermedios.
delete from public.business_hours;

insert into public.business_hours (weekday, opens_at, closes_at, is_active) values
  (2, '08:00', '15:00', true),   -- martes
  (3, '08:00', '15:00', true),   -- miércoles
  (4, '13:00', '20:00', true),   -- jueves
  (5, '13:00', '20:00', true);   -- viernes

-- Guard: si alguien vuelve a correr el bootstrap del catálogo encima de
-- esta migración, o agrega una franja por error, el día cerrado deja de
-- estar cerrado sin que nadie se entere hasta que una clienta reserve.
-- Que falle acá es barato; que falle en el salón, no.
do $$
declare
  v_lunes   integer;
  v_sabado  integer;
  v_domingo integer;
  v_total   integer;
begin
  select count(*) into v_lunes   from public.business_hours where weekday = 1 and is_active;
  select count(*) into v_sabado  from public.business_hours where weekday = 6 and is_active;
  select count(*) into v_domingo from public.business_hours where weekday = 0 and is_active;
  select count(*) into v_total   from public.business_hours where is_active;

  if v_lunes > 0 then
    raise exception 'el lunes quedó abierto (% franja(s)): el salón cierra los lunes', v_lunes;
  end if;
  if v_sabado > 0 then
    raise exception 'el sábado quedó en la grilla (% franja(s)): los sábados se gestionan por WhatsApp', v_sabado;
  end if;
  if v_domingo > 0 then
    raise exception 'el domingo quedó abierto (% franja(s))', v_domingo;
  end if;
  if v_total <> 4 then
    raise exception 'se esperaban 4 franjas activas (martes a viernes) y hay %', v_total;
  end if;
end $$;

comment on table public.business_hours is
  'Horario de atención del salón, por día de semana (0=domingo … 6=sábado). Gobierna qué turnos se OFRECEN online; no limita lo que se puede cargar a mano ni invalida reservas existentes. Lunes y domingo cerrado. El sábado queda deliberadamente fuera: Sol atiende novias y eventos esos días y se coordinan por WhatsApp, no eligiendo de una lista.';
