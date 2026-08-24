-- =====================================================================
-- Sol Mai · Cierre de atención idempotente
--
-- Cerrar dos veces la misma atención duplicaba las líneas de cobro:
-- $24.000 cobrados quedaban registrados como $48.000, y el dashboard y
-- la conciliación los daban por buenos.
--
-- Dos causas, las dos necesarias:
--
--   1. El `provider_ref` de un cobro presencial incluía
--      `extract(epoch from now())`, así que cada llamada generaba una
--      referencia nueva y el UNIQUE nunca se activaba.
--
--   2. `provider` quedaba en NULL, y en PostgreSQL un UNIQUE con NULL
--      NO deduplica: (null,'x') y (null,'x') conviven. Aunque la
--      referencia hubiera sido estable, el UNIQUE seguía sin morder.
--
-- Se corrigen las dos. La referencia pasa a derivarse de la reserva y
-- la posición de la línea, y el cobro presencial deja de tener
-- proveedor nulo: lo cobró el salón, que es un proveedor tan real como
-- Mercado Pago.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. El cobro presencial tiene proveedor
-- ---------------------------------------------------------------------

update public.payments
   set provider = 'salon'
 where provider is null;

-- ---------------------------------------------------------------------
-- 2. Que el UNIQUE sea de verdad único
-- ---------------------------------------------------------------------
-- `nulls not distinct` cierra la puerta para siempre: si mañana alguien
-- vuelve a insertar un pago sin proveedor, dos iguales chocan en vez de
-- convivir.

alter table public.payments drop constraint if exists payments_provider_ref_unique;
alter table public.payments
  add constraint payments_provider_ref_unique
  unique nulls not distinct (provider, provider_ref);

-- ---------------------------------------------------------------------
-- 3. Cierre idempotente
-- ---------------------------------------------------------------------

create or replace function public.close_service(
  p_booking_id    uuid,
  p_final_price   integer,
  p_services_done text default null,
  p_staff_id      uuid default null,
  p_duration_min  integer default null,
  p_formula       text default null,
  p_cost_amount   integer default null,
  p_observation   text default null,
  p_payments      jsonb default '[]'::jsonb,
  p_actor_id      uuid default null,
  p_actor_label   text default null
) returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_booking public.bookings%rowtype;
  v_pay     jsonb;
  v_paid    integer;
  v_i       integer := 0;
  v_lines   integer;
begin
  -- `for update` serializa dos cierres simultáneos de la MISMA atención:
  -- el segundo espera y ve las líneas que dejó el primero.
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then
    raise exception 'booking_not_found';
  end if;
  if v_booking.status not in ('confirmed','attended','pending_payment') then
    raise exception 'not_closable';
  end if;
  if p_final_price is null or p_final_price < 0 then
    raise exception 'invalid_final_price';
  end if;

  insert into public.service_execution_records (
    booking_id, final_price_amount, actual_duration_min, services_done,
    formula, observation, staff_id, cost_amount, recorded_by, recorded_by_id
  ) values (
    p_booking_id, p_final_price, p_duration_min, nullif(p_services_done, ''),
    nullif(p_formula, ''), nullif(p_observation, ''), p_staff_id, p_cost_amount,
    p_actor_label, p_actor_id
  )
  on conflict (booking_id) do update set
    final_price_amount  = excluded.final_price_amount,
    actual_duration_min = coalesce(excluded.actual_duration_min, public.service_execution_records.actual_duration_min),
    services_done       = coalesce(excluded.services_done, public.service_execution_records.services_done),
    formula             = coalesce(excluded.formula, public.service_execution_records.formula),
    observation         = coalesce(excluded.observation, public.service_execution_records.observation),
    staff_id            = coalesce(excluded.staff_id, public.service_execution_records.staff_id),
    cost_amount         = coalesce(excluded.cost_amount, public.service_execution_records.cost_amount),
    recorded_by         = excluded.recorded_by,
    recorded_by_id      = excluded.recorded_by_id,
    recorded_at         = now();

  -- Varias líneas de cobro: una clienta puede dejar la seña online y
  -- pagar el resto en efectivo. Ese es el flujo normal, no una excepción.
  --
  -- La referencia sale de la reserva y la POSICIÓN de la línea, no del
  -- reloj: volver a cerrar corrige la línea que ya existe en vez de
  -- agregar otra. Cerrar dos veces cobra una sola vez.
  for v_pay in select * from jsonb_array_elements(coalesce(p_payments, '[]'::jsonb)) loop
    insert into public.payments (
      booking_id, provider, provider_ref, amount, status, method, kind, recorded_by, note
    ) values (
      p_booking_id,
      'salon',
      format('close:%s:%s', p_booking_id, v_i),
      (v_pay->>'amount')::integer,
      'approved',
      coalesce(v_pay->>'method', 'efectivo'),
      coalesce(v_pay->>'kind', 'balance'),
      p_actor_id,
      nullif(v_pay->>'note', '')
    )
    on conflict (provider, provider_ref) do update set
      amount      = excluded.amount,
      status      = excluded.status,
      method      = excluded.method,
      kind        = excluded.kind,
      recorded_by = excluded.recorded_by,
      note        = excluded.note,
      updated_at  = now();
    v_i := v_i + 1;
  end loop;

  -- Un cierre con MENOS líneas que el anterior es una corrección: hay
  -- que borrar las que sobran. Si no, quitar un cobro mal cargado sería
  -- imposible y el total quedaría inflado para siempre.
  --
  -- El alcance incluye las referencias VIEJAS (`local:<reserva>:<epoch>`).
  -- Una base que ya cerró atenciones con el código anterior tiene esas
  -- líneas, y sin esto el primer re-cierre las dejaba vivas junto a las
  -- nuevas: 24.000 pasaban a 48.000 en la primera corrección posterior
  -- a la migración.
  --
  -- Un pago de Mercado Pago no se toca nunca desde acá: la condición
  -- exige `provider = 'salon'`.
  delete from public.payments
   where booking_id = p_booking_id
     and provider = 'salon'
     and (provider_ref like 'close:' || p_booking_id || ':%'
          or provider_ref like 'local:' || p_booking_id || ':%')
     and provider_ref <> all (
       select format('close:%s:%s', p_booking_id, g)
         from generate_series(0, greatest(v_i - 1, 0)) g
     );

  -- Con cero líneas nuevas, `generate_series(0,0)` deja viva la línea 0.
  -- Se limpia aparte para no complicar la condición de arriba.
  if v_i = 0 then
    delete from public.payments
     where booking_id = p_booking_id
       and provider = 'salon'
       and (provider_ref like 'close:' || p_booking_id || ':%'
            or provider_ref like 'local:' || p_booking_id || ':%');
  end if;

  update public.bookings
     set status = 'attended', updated_at = now()
   where id = p_booking_id and status <> 'attended';

  select coalesce(sum(amount), 0), count(*) into v_paid, v_lines
    from public.payments
   where booking_id = p_booking_id and status = 'approved';

  perform public.record_audit(
    p_actor_id, p_actor_label, 'service_closed', 'booking', p_booking_id,
    jsonb_build_object(
      'final_price', p_final_price,
      'estimated',   v_booking.price_estimated_min,
      'collected',   v_paid,
      'lines',       v_lines,
      'reclosed',    v_booking.status = 'attended',
      'staff_id',    p_staff_id
    )
  );

  return jsonb_build_object(
    'booking_id',   p_booking_id,
    'status',       'attended',
    'final_price',  p_final_price,
    'estimated',    v_booking.price_estimated_min,
    'collected',    v_paid,
    'outstanding',  greatest(p_final_price - v_paid, 0),
    -- Que quien mira sepa que corrigió un cierre, no que hizo uno nuevo.
    'reclosed',     v_booking.status = 'attended'
  );
end;
$$;

revoke all on function public.close_service(
  uuid, integer, text, uuid, integer, text, integer, text, jsonb, uuid, text
) from public, anon, authenticated;
grant execute on function public.close_service(
  uuid, integer, text, uuid, integer, text, integer, text, jsonb, uuid, text
) to service_role;
