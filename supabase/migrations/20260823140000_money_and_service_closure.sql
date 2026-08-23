-- =====================================================================
-- Sol Mai · V4.1 Fase 2 — Dinero y cierre de atención
--
-- Hoy el dinero vive en dos lugares que no se hablan: `payments` sólo
-- registra cobros del proveedor online, y el efectivo o la transferencia
-- quedan en `service_execution_records.payment_method`, un enum de un
-- solo valor por atención.
--
-- Consecuencias reales:
--   * no existe una consulta que responda "cuánto entró en agosto";
--   * el caso mixto —seña online más resto en efectivo— obliga a elegir
--     un medio y perder el otro, y es el flujo NORMAL del producto.
--
-- Acá se unifica: `payments` registra TODO cobro, de cualquier canal, y
-- admite varias filas por reserva.
--
-- Costos: Sol todavía no tiene costos estándar validados. La estructura
-- queda lista para recibirlos; hasta entonces el margen no se calcula ni
-- se muestra. No se infiere ningún valor.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Un solo registro de cobros
-- ---------------------------------------------------------------------

alter table public.payments
  add column if not exists method text not null default 'mercado_pago'
    check (method in ('efectivo','transferencia','mercado_pago','otro')),
  add column if not exists kind text not null default 'deposit'
    check (kind in ('deposit','balance','adjustment')),
  add column if not exists recorded_by uuid references public.staff_members(id) on delete set null,
  add column if not exists note text;

comment on column public.payments.method is
  'Medio real del cobro. El pago online deja de ser un caso especial: es una fila más.';
comment on column public.payments.kind is
  'deposit: la seña · balance: el saldo al cerrar · adjustment: corrección.';

create index if not exists payments_booking_idx on public.payments (booking_id);

-- Un cobro presencial no tiene referencia de proveedor. Se genera una
-- para conservar la unicidad sin inventar un identificador externo.
alter table public.payments alter column provider drop not null;

-- ---------------------------------------------------------------------
-- 2. Costo estándar por servicio (preparado, vacío)
-- ---------------------------------------------------------------------

alter table public.service_parameters
  add column if not exists standard_cost_amount integer
    check (standard_cost_amount is null or standard_cost_amount >= 0);

comment on column public.service_parameters.standard_cost_amount is
  'Costo estándar de insumos. NULL significa "no sabemos", no cero. Sin este dato el margen es NO DISPONIBLE: nunca se estima.';

-- ---------------------------------------------------------------------
-- 3. Cierre de atención
-- ---------------------------------------------------------------------

alter table public.service_execution_records
  add column if not exists staff_id    uuid references public.staff_members(id) on delete set null,
  add column if not exists cost_amount integer check (cost_amount is null or cost_amount >= 0),
  add column if not exists recorded_by_id uuid references public.staff_members(id) on delete set null;

comment on column public.service_execution_records.staff_id is
  'Profesional que atendió. Opcional: obligarlo trabaría el cierre cuando atendieron dos personas o cierra alguien que no estuvo.';
comment on column public.service_execution_records.cost_amount is
  'Costo real de ESTA atención, si se conoce. Prevalece sobre el estándar del servicio.';

-- ---------------------------------------------------------------------
-- 4. Cerrar la atención en una sola operación
-- ---------------------------------------------------------------------
-- El cierre pasa con la clienta todavía en el salón. Registra qué se
-- hizo, cuánto se acordó y cuánto entró, y deja el turno en `attended`.

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
begin
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
  for v_pay in select * from jsonb_array_elements(coalesce(p_payments, '[]'::jsonb)) loop
    insert into public.payments (
      booking_id, provider, provider_ref, amount, status, method, kind, recorded_by, note
    ) values (
      p_booking_id,
      null,
      -- Un cobro presencial no tiene referencia externa: se construye una
      -- estable para conservar la unicidad sin inventar un id de proveedor.
      format('local:%s:%s:%s', p_booking_id, extract(epoch from now())::bigint, v_i),
      (v_pay->>'amount')::integer,
      'approved',
      coalesce(v_pay->>'method', 'efectivo'),
      coalesce(v_pay->>'kind', 'balance'),
      p_actor_id,
      nullif(v_pay->>'note', '')
    );
    v_i := v_i + 1;
  end loop;

  update public.bookings
     set status = 'attended', updated_at = now()
   where id = p_booking_id and status <> 'attended';

  select coalesce(sum(amount), 0) into v_paid
    from public.payments
   where booking_id = p_booking_id and status = 'approved';

  perform public.record_audit(
    p_actor_id, p_actor_label, 'service_closed', 'booking', p_booking_id,
    jsonb_build_object(
      'final_price', p_final_price,
      'estimated',   v_booking.price_estimated_min,
      'collected',   v_paid,
      'staff_id',    p_staff_id
    )
  );

  return jsonb_build_object(
    'booking_id',   p_booking_id,
    'status',       'attended',
    'final_price',  p_final_price,
    'estimated',    v_booking.price_estimated_min,
    'collected',    v_paid,
    'outstanding',  greatest(p_final_price - v_paid, 0)
  );
end;
$$;

revoke all on function public.close_service(uuid, integer, text, uuid, integer, text, integer, text, jsonb, uuid, text)
  from public, anon, authenticated;
grant execute on function public.close_service(uuid, integer, text, uuid, integer, text, integer, text, jsonb, uuid, text)
  to service_role;

-- ---------------------------------------------------------------------
-- 5. Conciliación con el Excel
-- ---------------------------------------------------------------------
-- Dos meses de convivencia comparando totales, no recargando datos a
-- mano. Una fila por atención cerrada, con lo estimado, lo acordado y lo
-- efectivamente cobrado.

create or replace view public.reconciliation_report as
select
  b.id                                   as booking_id,
  b.starts_at,
  a.slug                                 as area,
  b.source                               as channel,
  c.first_name || coalesce(' ' || c.last_name, '') as customer,
  c.phone_e164                           as customer_phone,
  b.status,
  b.price_estimated_min                  as estimated_amount,
  ser.final_price_amount                 as final_amount,
  coalesce(paid.total, 0)                as collected_amount,
  greatest(coalesce(ser.final_price_amount, b.price_estimated_min) - coalesce(paid.total, 0), 0) as outstanding_amount,
  paid.methods                           as payment_methods,
  ser.cost_amount,
  -- Sin costo no hay margen. NULL significa NO DISPONIBLE, no cero.
  case when ser.cost_amount is not null
       then ser.final_price_amount - ser.cost_amount
       else null end                     as margin_amount,
  b.deposit_status,
  st.display_name                        as attended_by,
  ser.recorded_at                        as closed_at
from public.bookings b
join public.areas a      on a.id = b.area_id
join public.customers c  on c.id = b.customer_id
left join public.service_execution_records ser on ser.booking_id = b.id
left join public.staff_members st on st.id = ser.staff_id
left join lateral (
  select sum(p.amount) as total,
         string_agg(distinct p.method, '+' order by p.method) as methods
  from public.payments p
  where p.booking_id = b.id and p.status = 'approved'
) paid on true;

revoke all on public.reconciliation_report from anon, authenticated;
grant select on public.reconciliation_report to service_role;

comment on view public.reconciliation_report is
  'Base de la conciliación con el Excel durante la convivencia. margin_amount es NULL cuando no hay costo cargado: no se estima.';
