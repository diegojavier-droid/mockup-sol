-- =====================================================================
-- Sol Mai · Trazabilidad del cambio de estado (G-02)
--
-- Confirmar, cancelar, marcar atendida o vencer un turno desde el panel
-- no quedaba atribuido a nadie: `PATCH /admin/bookings/:id/status`
-- escribía `bookings.status` directamente, sin actor y sin `audit_log`.
-- Todas las demás acciones operativas —alta, ausencia, cierre, override,
-- vínculo de identidad— sí registran quién las hizo. Ésta era la
-- excepción, y era justo la que decide si un turno se cobra o se pierde.
--
-- Dos cosas cambian de lugar:
--
--   1. La tabla de transiciones vivía en TypeScript. Ahora vive acá.
--      Un estado válido no es una convención del backend: es una regla
--      de integridad, y el bloqueo `for update` la vuelve inmune a dos
--      pestañas del panel tocando el mismo turno a la vez.
--
--   2. El actor deja de ser opcional. Un cambio de estado sin persona
--      responsable falla; no se registra a medias. Ésa es la diferencia
--      entre auditar y aparentar que se audita.
--
-- Fuera de alcance deliberado: esta función NO toca `deposit_status` ni
-- `refund_due` al cancelar. Hoy tampoco lo hacía el código que
-- reemplaza, y `cancel_booking` (la cancelación de la clienta) sí lo
-- resuelve. Arreglar esa asimetría cambia plata y merece su propia
-- decisión; acá queda registrada en el detalle de la auditoría para que
-- sea visible en vez de silenciosa.
-- =====================================================================

create or replace function public.set_booking_status(
  p_booking_id  uuid,
  p_status      text,
  p_actor_id    uuid,
  p_actor_label text default null
) returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_booking public.bookings%rowtype;
  v_allowed text[];
begin
  -- Guard que falla de manera segura: sin persona responsable no se
  -- cambia el estado. Preferimos rechazar la acción antes que escribir
  -- una fila de auditoría que no responde "¿quién?".
  if p_actor_id is null then
    raise exception 'actor_required';
  end if;

  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then
    raise exception 'booking_not_found';
  end if;

  -- Única definición de qué transición es legal.
  -- `attended`, `cancelled` y `no_show` son terminales: revertirlos sería
  -- reescribir lo que pasó, no corregir un estado.
  v_allowed := case v_booking.status
    when 'pending_payment' then array['confirmed','cancelled','expired']
    when 'confirmed'       then array['attended','cancelled']
    when 'expired'         then array['confirmed','cancelled']
    else array[]::text[]
  end;

  if not (p_status = any(v_allowed)) then
    raise exception 'invalid_transition:%->%', v_booking.status, p_status;
  end if;

  update public.bookings
     set status       = p_status,
         cancelled_at = case when p_status = 'cancelled' then now() else cancelled_at end,
         updated_at   = now()
   where id = p_booking_id;

  -- El detalle lleva el estado de la seña tal como quedó: si una
  -- cancelación deja una seña en `paid`, el registro lo muestra en vez
  -- de esconderlo.
  perform public.record_audit(
    p_actor_id, p_actor_label, 'booking_status_changed', 'booking', p_booking_id,
    jsonb_build_object(
      'previous_status', v_booking.status,
      'new_status',      p_status,
      'source',          v_booking.source,
      'deposit_status',  v_booking.deposit_status,
      'deposit_amount',  v_booking.deposit_amount
    )
  );

  return jsonb_build_object(
    'status',          p_status,
    'previous_status', v_booking.status,
    'deposit_status',  v_booking.deposit_status
  );
end;
$$;

comment on function public.set_booking_status(uuid, text, uuid, text) is
  'Cambia el estado de un turno validando la transición y registrando quién lo hizo. El actor es obligatorio.';

revoke all on function public.set_booking_status(uuid, text, uuid, text)
  from public, anon, authenticated;
grant execute on function public.set_booking_status(uuid, text, uuid, text)
  to service_role;
