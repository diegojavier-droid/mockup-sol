-- =====================================================================
-- Sol Mai · Corregir una ausencia que marcó el sistema
--
-- `auto_mark_no_shows` da por ausente todo turno confirmado que nadie
-- marcó pasadas las horas de gracia. Eso descarga a Sol de una tarea,
-- pero introduce un caso nuevo: **la clienta vino y Sol se olvidó de
-- tocar «Llegó»**. El sistema la marca ausente, le retiene la seña, y
-- hasta acá no había forma de deshacerlo: `set_booking_status` trata
-- `no_show` como terminal y no hay ninguna ruta que lo revierta.
--
-- Una clienta que fue al salón puede quedar registrada como ausente y
-- perder la plata por una distracción. Eso no se puede dejar así.
--
-- POR QUÉ ESTO NO CONTRADICE QUE `no_show` SEA TERMINAL
--
-- La regla dice que revertir un estado terminal sería «reescribir lo que
-- pasó, no corregir un estado». Vale para una ausencia que marcó una
-- persona: ahí alguien miró y decidió.
--
-- Una ausencia automática no es el registro de lo que pasó: es una
-- deducción hecha a partir de un silencio. Corregir una deducción
-- equivocada no es reescribir la historia, es completarla. Por eso esta
-- función acepta **sólo** las que marcó el sistema, y a las que marcó
-- una persona no las toca.
-- =====================================================================

create or replace function public.revert_auto_no_show(
  p_booking_id  uuid,
  p_actor_id    uuid,
  p_actor_label text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_booking      public.bookings%rowtype;
  v_marcada_por  text;
  v_new_deposit  text;
begin
  -- Sin actor no hay corrección: una fila de auditoría que no puede
  -- responder «¿quién lo deshizo?» no sirve para nada.
  if p_actor_id is null then
    raise exception 'actor_required';
  end if;

  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then
    raise exception 'booking_not_found';
  end if;

  -- Idempotente: dos clics no son dos correcciones.
  if v_booking.status = 'attended' then
    return jsonb_build_object('status', 'already_attended');
  end if;

  if v_booking.status <> 'no_show' then
    raise exception 'not_a_no_show';
  end if;

  -- Quién la marcó. Se mira la última marca registrada, que es la que
  -- dejó al turno en el estado actual.
  select actor_label into v_marcada_por
    from public.audit_log
   where entity_type = 'booking'
     and entity_id   = p_booking_id
     and action      = 'no_show_marked'
   order by created_at desc
   limit 1;

  if v_marcada_por is distinct from 'sistema' then
    raise exception 'no_show_manual';
  end if;

  -- La seña vuelve a estar pagada: la clienta vino, así que ese dinero
  -- es parte de lo que abonó por el servicio, no una retención.
  v_new_deposit := case
    when v_booking.deposit_status = 'retained' then 'paid'
    else v_booking.deposit_status
  end;

  update public.bookings
     set status         = 'attended',
         deposit_status = v_new_deposit,
         refund_due     = false,
         updated_at     = now()
   where id = p_booking_id;

  perform public.record_audit(
    p_actor_id, p_actor_label, 'auto_no_show_reverted', 'booking', p_booking_id,
    jsonb_build_object(
      'previous_status',        'no_show',
      'new_status',             'attended',
      'previous_deposit_status', v_booking.deposit_status,
      'deposit_status',          v_new_deposit
    )
  );

  return jsonb_build_object(
    'status',         'reverted',
    'deposit_status', v_new_deposit
  );
end;
$$;

revoke all on function public.revert_auto_no_show(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.revert_auto_no_show(uuid, uuid, text)
  to service_role;
