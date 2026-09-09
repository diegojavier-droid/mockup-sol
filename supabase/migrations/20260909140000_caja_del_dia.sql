-- =====================================================================
-- Sol Mai · La caja del día
--
-- Es lo que Sol mira todos los días y lo único que hoy no puede ver: el
-- panel muestra facturación y ocupación de un período, pero no responde
-- «¿cuánto entró hoy y por dónde?».
--
-- NO HACE FALTA NINGUNA TABLA NUEVA. Cada cobro ya queda en `payments`
-- con su medio (`method`), su concepto (`kind`) y el momento en que
-- entró. La caja es una vista de hechos que ya ocurren, no una carga
-- nueva para nadie: ése era el criterio de toda la arquitectura y acá se
-- cumple sin excepciones.
--
-- POR QUÉ SE AGRUPA POR CUÁNDO ENTRÓ LA PLATA, Y NO POR EL DÍA DEL TURNO
--
-- El dashboard suma por `bookings.starts_at`, que responde «cuánto
-- generó la jornada del martes». La caja responde otra pregunta: «qué
-- hay hoy». Una seña que se paga hoy por un turno de la semana que viene
-- entró hoy, y si no apareciera, el número no coincidiría con la
-- realidad el día que Sol lo revise. Por eso acá el eje es
-- `payments.created_at`.
--
-- LAS DEVOLUCIONES SE MUESTRAN APARTE, NO NETEADAS EN SILENCIO
--
-- Mezclarlas en el total daría un número más chico sin explicación. Se
-- informan las tres cosas —entró, salió, queda— para que la resta sea
-- visible y no haya que reconstruirla.
-- =====================================================================

create or replace function public.cash_register(p_day date)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_desde     timestamptz;
  v_hasta     timestamptz;
  v_entro     bigint;
  v_devuelto  bigint;
  v_medios    jsonb;
  v_items     jsonb;
begin
  -- El día del salón es hora de Santa Fe, no UTC: si se cortara en UTC,
  -- los cobros de la tarde caerían en la caja del día siguiente.
  v_desde := (p_day::text || ' 00:00:00')::timestamp at time zone 'America/Argentina/Cordoba';
  v_hasta := v_desde + interval '1 day';

  select coalesce(sum(p.amount), 0) into v_entro
    from public.payments p
   where p.status = 'approved'
     and p.created_at >= v_desde and p.created_at < v_hasta;

  select coalesce(sum(p.amount), 0) into v_devuelto
    from public.payments p
   where p.status = 'refund_completed'
     and p.created_at >= v_desde and p.created_at < v_hasta;

  -- Por medio de pago. `provider = 'mercado_pago'` es lo que entró por la
  -- web; el resto lleva el medio que eligió quien cerró la atención.
  select coalesce(jsonb_agg(
           jsonb_build_object('medio', t.medio, 'monto', t.monto, 'cuantos', t.cuantos)
           order by t.medio
         ), '[]'::jsonb) into v_medios
    from (
      select case when p.provider = 'mercado_pago'
                  then 'mercado_pago'
                  else coalesce(p.method, 'efectivo') end as medio,
             sum(p.amount)::bigint                        as monto,
             count(*)                                     as cuantos
        from public.payments p
       where p.status = 'approved'
         and p.created_at >= v_desde and p.created_at < v_hasta
       group by 1
    ) t;

  -- Cada movimiento, para que el total se pueda abrir. Un número que no
  -- lleva a los hechos que lo formaron no se puede verificar.
  select coalesce(jsonb_agg(
           jsonb_build_object(
             'hora',     to_char(p.created_at at time zone 'America/Argentina/Cordoba', 'HH24:MI'),
             'clienta',  c.first_name,
             'medio',    case when p.provider = 'mercado_pago'
                              then 'mercado_pago' else coalesce(p.method, 'efectivo') end,
             'concepto', case when p.provider = 'mercado_pago' then 'sena' else coalesce(p.kind, 'balance') end,
             'monto',    p.amount,
             'salida',   p.status = 'refund_completed'
           ) order by p.created_at
         ), '[]'::jsonb) into v_items
    from public.payments p
    join public.bookings  b on b.id = p.booking_id
    join public.customers c on c.id = b.customer_id
   where p.status in ('approved', 'refund_completed')
     and p.created_at >= v_desde and p.created_at < v_hasta;

  return jsonb_build_object(
    'dia',       p_day,
    'entro',     v_entro,
    'devuelto',  v_devuelto,
    'queda',     v_entro - v_devuelto,
    'por_medio', v_medios,
    'movimientos', v_items
  );
end;
$$;

comment on function public.cash_register(date) is
  'La caja de un día: cuánto entró, cuánto se devolvió, por qué medio y con cada movimiento. Se agrupa por cuándo entró la plata (payments.created_at en hora de Santa Fe), no por el día del turno.';

revoke all on function public.cash_register(date) from public, anon, authenticated;
grant execute on function public.cash_register(date) to service_role;
