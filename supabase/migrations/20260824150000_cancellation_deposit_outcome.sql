-- =====================================================================
-- Sol Mai · Qué pasa con la seña cuando cancela el salón (G-15)
--
-- `cancel_booking` —la cancelación que hace la clienta con su link—
-- calcula el destino de la seña con la ventana de reembolso: si avisó
-- con más de `refund_window_hours` de anticipación se devuelve, si no se
-- retiene. Cancelar desde el panel no hacía nada de eso: dejaba
-- `deposit_status` en 'paid' y `refund_due` en null.
--
-- Una reserva cancelada con una seña 'paid' es plata que el dashboard
-- sigue contando como cobrada por un servicio que no se prestó.
--
-- NO se resuelve copiando la regla de la clienta. Esa regla responde
-- "¿avisó a tiempo?", y cuando cancela el salón esa pregunta no
-- corresponde: la clienta no hizo nada mal. Aplicarla igual retendría
-- señas que probablemente haya que devolver — sería inventar una regla
-- de negocio que Sol no definió.
--
-- Se resuelve como el override de capacidad, que es el precedente que ya
-- tiene este sistema para lo que no se puede deducir: el motor calcula,
-- la persona decide, el sistema registra. Cancelar un turno con seña
-- paga exige decir qué pasa con la plata. Sin esa decisión, la
-- cancelación se rechaza.
--
-- La auditoría guarda las dos cosas: qué decidió la persona y qué habría
-- dicho la regla automática. Si el salón devuelve señas que la regla
-- habría retenido —o al revés— eso queda visible, y el día que Sol
-- quiera fijar una política habrá evidencia real en vez de suposiciones.
-- =====================================================================

-- Agregar un parámetro NO reemplaza la función: crea una sobrecarga, y
-- entonces la llamada de cuatro argumentos queda ambigua. Hay que
-- borrar la anterior.
drop function if exists public.set_booking_status(uuid, text, uuid, text);

create or replace function public.set_booking_status(
  p_booking_id      uuid,
  p_status          text,
  p_actor_id        uuid,
  p_actor_label     text default null,
  p_deposit_outcome text default null
) returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_booking      public.bookings%rowtype;
  v_allowed      text[];
  v_deposit      text;
  v_refund       boolean;
  v_window       numeric;
  v_rule_refund  boolean := null;
  v_decides      boolean;
begin
  -- Sin persona responsable no se cambia el estado.
  if p_actor_id is null then
    raise exception 'actor_required';
  end if;

  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then
    raise exception 'booking_not_found';
  end if;

  v_allowed := case v_booking.status
    when 'pending_payment' then array['confirmed','cancelled','expired']
    when 'confirmed'       then array['attended','cancelled']
    when 'expired'         then array['confirmed','cancelled']
    else array[]::text[]
  end;

  if not (p_status = any(v_allowed)) then
    raise exception 'invalid_transition:%->%', v_booking.status, p_status;
  end if;

  -- Sólo hay algo que decidir cuando se cancela plata que efectivamente
  -- entró. Una seña 'pending' nunca existió y una 'refunded' ya se
  -- resolvió: ahí no se pregunta nada.
  v_decides := (p_status = 'cancelled' and v_booking.deposit_status = 'paid');

  if v_decides then
    if coalesce(p_deposit_outcome, '') not in ('refund', 'retain') then
      raise exception 'deposit_outcome_required';
    end if;

    -- Qué habría dicho la regla de la clienta, sólo para registrarlo.
    v_window := public.setting_numeric('refund_window_hours', 24);
    v_rule_refund := v_booking.starts_at > now() + make_interval(hours => v_window::integer);

    v_deposit := case p_deposit_outcome when 'refund' then 'refunded' else 'retained' end;
    v_refund  := (p_deposit_outcome = 'refund');
  else
    v_deposit := v_booking.deposit_status;
    v_refund  := v_booking.refund_due;
  end if;

  update public.bookings
     set status         = p_status,
         deposit_status = v_deposit,
         refund_due     = v_refund,
         cancelled_at   = case when p_status = 'cancelled' then now() else cancelled_at end,
         updated_at     = now()
   where id = p_booking_id;

  perform public.record_audit(
    p_actor_id, p_actor_label, 'booking_status_changed', 'booking', p_booking_id,
    jsonb_build_object(
      'previous_status',        v_booking.status,
      'new_status',             p_status,
      'source',                 v_booking.source,
      'deposit_status_before',  v_booking.deposit_status,
      'deposit_status',         v_deposit,
      'deposit_amount',         v_booking.deposit_amount,
      'deposit_decision',       case when v_decides then p_deposit_outcome else null end,
      -- Qué habría hecho la regla automática. Null cuando no había nada
      -- que decidir; distinto de la decisión cuando la persona se apartó.
      'rule_would_refund',      v_rule_refund
    )
  );

  return jsonb_build_object(
    'status',          p_status,
    'previous_status', v_booking.status,
    'deposit_status',  v_deposit,
    'refund_due',      v_refund,
    'deposit_amount',  v_booking.deposit_amount
  );
end;
$$;

comment on function public.set_booking_status(uuid, text, uuid, text, text) is
  'Cambia el estado de un turno validando la transición y registrando quién lo hizo. El actor es obligatorio. Cancelar con seña paga exige decidir refund o retain: el sistema no inventa el destino de la plata.';

revoke all on function public.set_booking_status(uuid, text, uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.set_booking_status(uuid, text, uuid, text, text)
  to service_role;

-- ---------------------------------------------------------------------
-- Reparación de lo ya cancelado sin resolver
-- ---------------------------------------------------------------------
-- Una reserva cancelada con la seña colgada en 'paid' es un dato que hoy
-- está mal. No se puede adivinar si esa plata se devolvió o se retuvo,
-- así que NO se elige por Sol: se marca como pendiente de resolver y
-- queda listada. `deposit_status` no tiene un valor para "hay que
-- averiguarlo", y agregar uno le mentiría al reporting igual que dejarlo
-- en 'paid'. Se registra en la auditoría, que es donde vive lo que
-- todavía no se decidió.
do $$
declare
  v_n integer;
begin
  select count(*) into v_n
    from public.bookings
   where status = 'cancelled' and deposit_status = 'paid';

  if v_n > 0 then
    insert into public.audit_log (actor_id, actor_label, action, entity_type, entity_id, detail)
    select null, 'migración 20260824150000', 'deposit_outcome_unresolved', 'booking', b.id,
           jsonb_build_object(
             'deposit_amount', b.deposit_amount,
             'cancelled_at',   b.cancelled_at,
             'nota', 'Cancelada antes de que el sistema exigiera decidir el destino de la seña. Hay que resolver a mano si se devolvió o se retuvo.')
      from public.bookings b
     where b.status = 'cancelled' and b.deposit_status = 'paid';

    raise notice '% reserva(s) cancelada(s) con seña sin resolver: quedan listadas en audit_log como deposit_outcome_unresolved', v_n;
  end if;
end $$;
