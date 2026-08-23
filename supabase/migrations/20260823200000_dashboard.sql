-- =====================================================================
-- Sol Mai · V4.1 Fase 5 — Dashboard
--
-- Seis indicadores, no cincuenta. El criterio no es cuál suena mejor
-- sino cuál cambia una decisión de Sol y cuál tiene su insumo
-- garantizado.
--
-- El margen NO aparece: sin costos estándar cargados no existe, y un
-- margen calculado sobre tres atenciones es peor que ninguno porque
-- parece un dato y no lo es. La función informa explícitamente su
-- cobertura para que la pantalla pueda decir NO DISPONIBLE.
-- =====================================================================

create or replace function public.dashboard_summary(
  p_from timestamptz,
  p_to   timestamptz
) returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  v_collected      bigint;
  v_final          bigint;
  v_attended       int;
  v_ticket         int;
  v_by_channel     jsonb;
  v_by_status      jsonb;
  v_new_customers  int;
  v_known          int;
  v_retained       bigint;
  v_sold_minutes   bigint;
  v_capacity_min   bigint;
  v_by_area        jsonb;
  -- El día del salón, no el del servidor. Sin esto, un período de un día
  -- (00:00 a 00:00 hora del salón = 03:00 a 03:00 UTC) cae sobre DOS
  -- fechas UTC y la capacidad se duplica.
  v_tz  constant text := 'America/Argentina/Buenos_Aires';
  v_margin_rows    int;
  v_margin_total   bigint;
  v_top_services   jsonb;
begin
  -- Ingresos realmente cobrados, de cualquier canal (efectivo incluido).
  select coalesce(sum(p.amount), 0) into v_collected
    from public.payments p
    join public.bookings b on b.id = p.booking_id
   where p.status = 'approved'
     and b.starts_at >= p_from and b.starts_at < p_to;

  -- Facturado: lo acordado en las atenciones cerradas.
  select coalesce(sum(ser.final_price_amount), 0), count(*)
    into v_final, v_attended
    from public.service_execution_records ser
    join public.bookings b on b.id = ser.booking_id
   where b.starts_at >= p_from and b.starts_at < p_to
     and b.status = 'attended';

  v_ticket := case when v_attended > 0 then (v_final / v_attended)::int else 0 end;

  -- Reservas por canal: responde cuánto empuja lo online de verdad.
  select coalesce(jsonb_object_agg(source, n), '{}'::jsonb) into v_by_channel
    from (select source, count(*) as n from public.bookings
           where starts_at >= p_from and starts_at < p_to
           group by source) q;

  select coalesce(jsonb_object_agg(status, n), '{}'::jsonb) into v_by_status
    from (select status, count(*) as n from public.bookings
           where starts_at >= p_from and starts_at < p_to
           group by status) q;

  -- Señas retenidas por ausencia: cuánto compensa la política.
  select coalesce(sum(deposit_amount), 0) into v_retained
    from public.bookings
   where status = 'no_show' and deposit_status = 'retained'
     and starts_at >= p_from and starts_at < p_to;

  -- Clientas nuevas: primera reserva dentro del período.
  select count(*) into v_new_customers
    from public.customers c
   where c.created_at >= p_from and c.created_at < p_to;

  select count(distinct b.customer_id) into v_known
    from public.bookings b
   where b.starts_at >= p_from and b.starts_at < p_to;

  -- Ocupación sobre ESTACIONES (decisión D-11): minutos vendidos sobre
  -- minutos-estación realmente disponibles.
  --
  -- El denominador NO es "estaciones x horario del salón": un feriado o
  -- un cierre por reforma se descuenta. Si no se descontara, una semana
  -- con un día cerrado bajaría la ocupación sin que Sol hubiera hecho
  -- nada peor, y el número diría lo contrario de lo que pasó.
  with days as (
    select d::date as day
      from generate_series(
             (p_from at time zone v_tz)::date,
             ((p_to at time zone v_tz) - interval '1 microsecond')::date,
             interval '1 day') d
  ),
  windows as (
    select d.day, a.id as area_id,
           tstzrange((d.day + bh.opens_at)  at time zone v_tz,
                     (d.day + bh.closes_at) at time zone v_tz) as win
      from days d
      join public.business_hours bh
        on bh.weekday = extract(dow from d.day)::smallint and bh.is_active
     cross join public.areas a
     where a.is_active
  ),
  stations as (
    select r.area_id, count(*)::int as n
      from public.resources r
     where r.kind = 'physical' and r.is_active
     group by r.area_id
  ),
  net as (
    -- capacity_delta IS NULL es cierre total (misma lectura que el motor
    -- de reservas); un delta numérico ajusta cupos, no cierra.
    select w.day, w.area_id,
           extract(epoch from (upper(w.win) - lower(w.win))) / 60 as open_min,
           -- El filter no es decorativo: sin fila de excepción el LEFT
           -- JOIN deja e.* en NULL y tstzrange(null, null) NO es NULL,
           -- es el rango ILIMITADO — intersecta todo y cerraría el
           -- salón entero todos los días.
           coalesce(sum(
             extract(epoch from (
               upper(w.win * tstzrange(e.starts_at, e.ends_at))
               - lower(w.win * tstzrange(e.starts_at, e.ends_at))
             )) / 60
           ) filter (where e.id is not null), 0) as closed_min
      from windows w
      left join public.schedule_exceptions e
        on e.is_active and e.capacity_delta is null
       and (e.area_id is null or e.area_id = w.area_id)
       and tstzrange(e.starts_at, e.ends_at) && w.win
     group by w.day, w.area_id, w.win
  ),
  capacity as (
    select n.area_id,
           sum(greatest(n.open_min - n.closed_min, 0) * s.n)::bigint as capacity_min
      from net n
      join stations s on s.area_id = n.area_id
     group by n.area_id
  ),
  sold as (
    select b.area_id,
           sum(extract(epoch from (b.ends_at - b.starts_at)) / 60)::bigint as sold_min
      from public.bookings b
     where b.starts_at >= p_from and b.starts_at < p_to
       and b.status in ('confirmed','attended')
     group by b.area_id
  ),
  merged as (
    select a.slug, a.name,
           coalesce(c.capacity_min, 0) as capacity_min,
           coalesce(s.sold_min, 0)     as sold_min
      from public.areas a
      left join capacity c on c.area_id = a.id
      left join sold     s on s.area_id = a.id
     where a.is_active
  )
  select coalesce(sum(sold_min), 0), coalesce(sum(capacity_min), 0),
         coalesce(jsonb_agg(jsonb_build_object(
           'area',             slug,
           'name',             name,
           'sold_minutes',     sold_min,
           'capacity_minutes', capacity_min,
           -- NULL, no 0: un área cerrada no tiene 0% de ocupación,
           -- no tiene ocupación.
           'rate_pct', case when capacity_min > 0
                            then round((sold_min::numeric / capacity_min) * 100, 1)
                            else null end
         ) order by slug), '[]'::jsonb)
    into v_sold_minutes, v_capacity_min, v_by_area
    from merged;

  -- Margen: sólo donde hay costo. Se informa la cobertura para que la
  -- pantalla nunca muestre un número sin decir sobre cuánto se calculó.
  select count(*), coalesce(sum(ser.final_price_amount - ser.cost_amount), 0)
    into v_margin_rows, v_margin_total
    from public.service_execution_records ser
    join public.bookings b on b.id = ser.booking_id
   where b.starts_at >= p_from and b.starts_at < p_to
     and ser.cost_amount is not null;

  select coalesce(jsonb_agg(jsonb_build_object('name', name, 'count', n) order by n desc), '[]'::jsonb)
    into v_top_services
    from (select bi.snapshot_name as name, count(*) as n
            from public.booking_items bi
            join public.bookings b on b.id = bi.booking_id
           where bi.role = 'main' and b.status = 'attended'
             and b.starts_at >= p_from and b.starts_at < p_to
           group by bi.snapshot_name
           order by count(*) desc
           limit 5) q;

  return jsonb_build_object(
    'from', p_from,
    'to',   p_to,
    'collected_amount',  v_collected,
    'invoiced_amount',   v_final,
    'attended_count',    v_attended,
    'average_ticket',    v_ticket,
    'bookings_by_channel', v_by_channel,
    'bookings_by_status',  v_by_status,
    'retained_deposits', v_retained,
    'new_customers',     v_new_customers,
    'active_customers',  v_known,
    'occupancy', jsonb_build_object(
      'basis',            'stations',
      'sold_minutes',     v_sold_minutes,
      'capacity_minutes', v_capacity_min,
      'rate_pct', case when v_capacity_min > 0
                       then round((v_sold_minutes::numeric / v_capacity_min) * 100, 1)
                       else null end,
      -- El número global mezcla sillones con camilla: sin apertura por
      -- área, "12% de ocupación" puede esconder Peluquería llena.
      'by_area', v_by_area
    ),
    -- available=false significa NO DISPONIBLE, no cero.
    'margin', jsonb_build_object(
      'available', v_margin_rows > 0,
      'coverage',  v_margin_rows,
      'amount',    case when v_margin_rows > 0 then v_margin_total else null end
    ),
    'top_services', v_top_services
  );
end;
$$;

revoke all on function public.dashboard_summary(timestamptz, timestamptz)
  from public, anon, authenticated;
grant execute on function public.dashboard_summary(timestamptz, timestamptz) to service_role;
