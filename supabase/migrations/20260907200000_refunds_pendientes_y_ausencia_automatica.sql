-- =====================================================================
-- Sol Mai · devoluciones pendientes y ausencia automática
--
-- Dos huecos que hoy le cuestan trabajo a Sol, o plata a una clienta.
--
-- 1. EL SISTEMA PROMETE UNA DEVOLUCIÓN QUE NADIE EJECUTA
--
-- Al cancelar dentro de la ventana, la reserva queda con
-- `deposit_status = 'refunded'` y a la clienta se le dice «te devolvemos
-- la seña». Pero ese estado significa «se decidió devolver», no «la plata
-- volvió»: no hay ninguna columna que distinga una cosa de la otra, ni
-- lista donde mirar qué falta. La promesa puede quedar colgada para
-- siempre sin que nadie se entere.
--
-- Se agrega `refund_completed_at`: nulo mientras la devolución esté
-- pendiente, con fecha cuando la plata efectivamente volvió. Es lo que
-- permite que exista una lista de pendientes, y mañana que la API de
-- Mercado Pago la complete sola.
--
-- 2. LA AUSENCIA HAY QUE MARCARLA A MANO
--
-- Si Sol se olvida, el turno queda «confirmado» para siempre: la seña ni
-- se retiene ni se devuelve, y la plata no figura en ningún lado. La
-- dirección de producto pidió que Sol sólo tenga que marcar que la
-- clienta LLEGÓ, y que el resto ocurra solo.
--
-- Marcar la llegada ya existe (`set_booking_status` → 'attended'). Falta
-- lo otro: que un turno confirmado que nadie marcó, pasado un margen, se
-- convierta en ausencia sin intervención.
--
-- EL RIESGO, Y CÓMO SE CUBRE
--
-- Si Sol se olvida de marcar una llegada, esto le retendría la seña a una
-- clienta QUE SÍ VINO. Es el error más caro posible: le cobra a alguien
-- que cumplió. Por eso:
--
--   · el margen es un parámetro generoso y provisional, no un número
--     escrito en el código, y lo decide Sol;
--   · queda registrado que la marcó el sistema y no una persona, así una
--     reversión no discute con nadie;
--   · sigue siendo reversible por los caminos que ya existen.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Distinguir «se decidió devolver» de «la plata volvió»
-- ---------------------------------------------------------------------

alter table public.bookings
  add column if not exists refund_completed_at timestamptz;

comment on column public.bookings.refund_completed_at is
  'Cuándo volvió efectivamente la plata a la clienta. NULL con deposit_status = ''refunded'' significa DEVOLUCIÓN PENDIENTE: se decidió devolver y todavía no se hizo. No confundir con deposit_status, que expresa la decisión y no el movimiento.';

-- Una fecha de devolución sobre una seña que no corresponde devolver
-- sería un movimiento de plata sin decisión que lo respalde.
alter table public.bookings drop constraint if exists bookings_refund_completed_coherent;
alter table public.bookings
  add constraint bookings_refund_completed_coherent
  check (refund_completed_at is null or deposit_status = 'refunded');

-- Las pendientes se consultan seguido y son pocas: el índice parcial las
-- encuentra sin recorrer la tabla entera.
create index if not exists bookings_refund_pendiente_idx
  on public.bookings (starts_at)
  where deposit_status = 'refunded' and refund_completed_at is null;

-- ---------------------------------------------------------------------
-- 2. Margen antes de dar por ausente
-- ---------------------------------------------------------------------

-- PROVISIONAL: nadie lo validó todavía. Seis horas después de que
-- terminaba el turno es, en la práctica, el cierre del día: un turno que
-- termina a las 14:45 se marca a las 20:45. Da tiempo de sobra a que Sol
-- registre una llegada tardía.
insert into public.business_settings (key, value, description, source, confidence)
values (
  'no_show_grace_hours',
  '6',
  'Horas después del fin del turno antes de darlo por ausente automáticamente',
  'industry_baseline',
  'low'
)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------
-- 3. Marcar como efectivamente devuelta
-- ---------------------------------------------------------------------

create or replace function public.mark_refund_completed(
  p_booking_id   uuid,
  p_actor_id     uuid default null,
  p_actor_label  text default null,
  p_amount       integer default null,
  p_provider_ref text default null
) returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_booking public.bookings%rowtype;
  v_amount  integer;
begin
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then
    raise exception 'booking_not_found';
  end if;

  -- Sólo se puede completar lo que se decidió. Marcar como devuelta una
  -- seña retenida sería inventar un movimiento de plata.
  if v_booking.deposit_status <> 'refunded' then
    raise exception 'refund_not_due';
  end if;

  -- Idempotente: dos clics no son dos devoluciones.
  if v_booking.refund_completed_at is not null then
    return jsonb_build_object(
      'status', 'already_completed',
      'refund_completed_at', v_booking.refund_completed_at
    );
  end if;

  -- La devolución es SIEMPRE la seña completa. `p_amount` existe para que
  -- quien llame pueda dejar constancia de lo que devolvió, no para elegir
  -- cuánto: si no coincide con la seña, se rechaza.
  --
  -- Sin esta comprobación, mandar un peso marcaba la devolución como
  -- terminada, la sacaba de la lista de pendientes y dejaba un registro
  -- de plata que dice algo distinto de lo que pasó. Una devolución
  -- parcial es otro caso y necesita modelarse aparte, no colarse por acá.
  if p_amount is not null and p_amount <> v_booking.deposit_amount then
    raise exception 'refund_amount_mismatch';
  end if;

  v_amount := coalesce(p_amount, v_booking.deposit_amount);

  update public.bookings
     set refund_completed_at = now(),
         updated_at          = now()
   where id = p_booking_id;

  -- El movimiento queda en `payments`, que es donde vive la plata. Sin
  -- esto, dentro de seis meses nadie sabría cuánto se devolvió ni cuándo.
  insert into public.payments (booking_id, provider, provider_ref, amount, status, raw_payload)
  values (
    p_booking_id,
    'mercado_pago',
    coalesce(p_provider_ref, 'devolucion:' || p_booking_id::text || ':' || extract(epoch from now())::bigint::text),
    v_amount,
    'refund_completed',
    jsonb_build_object('actor', p_actor_label, 'manual', p_provider_ref is null)
  )
  on conflict (provider, provider_ref) do nothing;

  perform public.record_audit(
    p_actor_id, p_actor_label, 'refund_completed', 'booking', p_booking_id,
    jsonb_build_object('amount', v_amount, 'provider_ref', p_provider_ref)
  );

  return jsonb_build_object('status', 'completed', 'amount', v_amount);
end;
$$;

revoke all on function public.mark_refund_completed(uuid, uuid, text, integer, text) from public, anon, authenticated;
grant execute on function public.mark_refund_completed(uuid, uuid, text, integer, text) to service_role;

-- ---------------------------------------------------------------------
-- 4. Qué falta devolver
-- ---------------------------------------------------------------------

create or replace function public.pending_refunds()
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_rows jsonb;
  v_total integer;
begin
  select coalesce(jsonb_agg(x order by x->>'cancelled_at'), '[]'::jsonb), coalesce(sum((x->>'amount')::integer), 0)
    into v_rows, v_total
  from (
    select jsonb_build_object(
      'booking_id',   b.id,
      'amount',       b.deposit_amount,
      'starts_at',    b.starts_at,
      'cancelled_at', b.cancelled_at,
      'status',       b.status,
      'customer',     trim(c.first_name || ' ' || coalesce(c.last_name, '')),
      'phone',        c.phone_e164,
      'email',        c.email
    ) as x
    from public.bookings b
    join public.customers c on c.id = b.customer_id
    where b.deposit_status = 'refunded'
      and b.refund_completed_at is null
      and b.deposit_amount > 0
  ) q;

  return jsonb_build_object('total_amount', v_total, 'items', v_rows);
end;
$$;

revoke all on function public.pending_refunds() from public, anon, authenticated;
grant execute on function public.pending_refunds() to service_role;

-- ---------------------------------------------------------------------
-- 5. Ausencia automática
-- ---------------------------------------------------------------------

create or replace function public.auto_mark_no_shows()
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_grace numeric;
  v_row   record;
  v_count integer := 0;
begin
  v_grace := public.setting_numeric('no_show_grace_hours', 6);

  -- SÓLO turnos confirmados. Uno atendido ya lo marcó Sol; uno cancelado
  -- lo resolvió la clienta; uno pendiente de seña lo vence otra tarea.
  -- Tocar cualquiera de esos sería pisar una decisión que ya se tomó.
  for v_row in
    select id from public.bookings
     where status = 'confirmed'
       and ends_at < now() - make_interval(hours => v_grace::integer)
     order by ends_at
     limit 200
  loop
    -- Se delega en la función que ya existe para no tener dos lugares
    -- decidiendo qué pasa con la seña de una ausencia. `sistema` como
    -- etiqueta deja claro en la auditoría que no lo marcó una persona:
    -- si hay que revertirlo, no se le está discutiendo a nadie.
    perform public.mark_no_show(v_row.id, null, 'sistema');
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.auto_mark_no_shows() from public, anon, authenticated;
grant execute on function public.auto_mark_no_shows() to service_role;
