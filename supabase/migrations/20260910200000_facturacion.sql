-- =====================================================================
-- Sol Mai · Finanzas › Facturación
--
-- LO QUE ESTE BLOQUE **NO** HACE
--
-- No emite comprobantes. La decisión está tomada y escrita en §8.3 de la
-- arquitectura: integrar ARCA exige un certificado digital atado al CUIT
-- de Sol viviendo en nuestra infraestructura —el secreto más peligroso
-- que manejaría este sistema— para ahorrarle los treinta segundos que
-- tarda en emitir una factura C desde el celular. Ese canje no cierra.
--
-- EL PROBLEMA REAL NO ES EMITIR: ES NO SABER QUÉ FALTA EMITIR
--
-- Al cerrar el día, hoy nada le dice a Sol qué atenciones todavía no
-- tienen comprobante. Eso es lo que se construye acá: ella marca lo que
-- facturó, con el importe y la fecha que usó, y el sistema le muestra lo
-- que queda.
--
-- Esto no es trabajo desechable si algún día se integra: es el mismo
-- campo que la integración escribiría sola en vez de a mano. Cambia quién
-- lo llena, no el modelo.
--
-- POR QUÉ COLUMNAS Y NO UNA TABLA APARTE
--
-- Un comprobante corresponde a una atención cerrada, y hoy es uno solo.
-- El día que aparezcan notas de crédito —una atención con más de un
-- comprobante— esto tiene que pasar a ser una tabla; hasta entonces, una
-- tabla con una fila por atención es la misma información con una junta
-- más. La condición que obliga a cambiar está dicha para que se note
-- cuando llegue.
-- =====================================================================

alter table public.service_execution_records
  add column invoiced_on     date,
  add column invoiced_amount integer check (invoiced_amount is null or invoiced_amount > 0),
  -- El número lo tipea Sol desde la app de ARCA. Es opcional a propósito:
  -- exigirlo haría que, si no lo tiene a mano, no marque nada —y entonces
  -- la lista de pendientes deja de ser cierta, que es lo único que este
  -- bloque construye—.
  add column invoice_number  text check (invoice_number is null or btrim(invoice_number) <> ''),
  add column invoiced_by_id  uuid references public.staff_members(id) on delete set null,
  add column invoiced_at     timestamptz;

-- Las cinco columnas van juntas o no va ninguna. Media marca —«facturado
-- pero no sé cuánto»— es justamente lo que haría inútil el acumulado
-- contra el tope de la categoría.
alter table public.service_execution_records
  add constraint service_execution_records_invoice_coherent
  check (
    (invoiced_on is null and invoiced_amount is null and invoiced_at is null)
    or
    (invoiced_on is not null and invoiced_amount is not null and invoiced_at is not null)
  );

create index service_execution_records_invoiced_idx
  on public.service_execution_records (invoiced_on)
  where invoiced_on is not null;

-- Para encontrar rápido lo que falta, que es la consulta que se hace
-- todos los días al cerrar.
create index service_execution_records_sin_facturar_idx
  on public.service_execution_records (recorded_at)
  where invoiced_on is null;

-- ---------------------------------------------------------------------
-- El tope de la categoría: lo carga el contador, nunca nosotros
-- ---------------------------------------------------------------------
--
-- Superar el límite de facturación anual obliga a recategorizarse, así
-- que el acumulado contra el tope es información que a Sol le sirve. Pero
-- el número cambia con la inflación y lo fija ARCA: escribirlo acá sería
-- inventar un dato fiscal. Se crea la fila SIN valor. Mientras esté
-- vacía, el sistema dice que no lo sabe.
-- `value` es jsonb y no admite nulos, así que «no cargado» se escribe
-- como el null de JSON. La fila existe para que el tope tenga dónde
-- cargarse y se vea que falta; `source` y `confidence` recién significan
-- algo el día que haya un número adentro.
insert into public.business_settings (key, value, description)
values ('monotributo_annual_cap', 'null'::jsonb,
        'Tope anual de facturación de la categoría. Lo carga el contador de Sol: cambia con la inflación y un número viejo es peor que ninguno.')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------
-- Marcar y desmarcar
-- ---------------------------------------------------------------------
create or replace function public.mark_invoiced(
  p_booking_id  uuid,
  p_amount      integer,
  p_on          date,
  p_number      text,
  p_actor_id    uuid,
  p_actor_label text default null
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v public.service_execution_records%rowtype;
  v_hoy date;
begin
  if p_actor_id is null or not public.can(p_actor_id, 'finanzas', 'full') then
    raise exception 'sin_permiso_finanzas';
  end if;

  select * into v from public.service_execution_records where booking_id = p_booking_id;
  if not found then
    -- Sin cierre no hay importe cobrado, y facturar algo que todavía no
    -- se cobró es afirmar un hecho que no ocurrió.
    raise exception 'turno_sin_cerrar';
  end if;
  if v.invoiced_on is not null then
    raise exception 'ya_facturado';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'importe_invalido';
  end if;

  -- El día del salón, no UTC: a las 21:00 de Santa Fe todavía es hoy.
  v_hoy := (now() at time zone 'America/Argentina/Cordoba')::date;
  if p_on is null then
    raise exception 'fecha_requerida';
  end if;
  if p_on > v_hoy then
    -- Un comprobante con fecha futura no existe: o se emitió, o no.
    raise exception 'fecha_futura';
  end if;

  update public.service_execution_records
     set invoiced_on     = p_on,
         invoiced_amount = p_amount,
         invoice_number  = nullif(btrim(coalesce(p_number, '')), ''),
         invoiced_by_id  = p_actor_id,
         invoiced_at     = now()
   where booking_id = p_booking_id;

  insert into public.audit_log (actor_id, actor_label, action, entity_type, entity_id, detail)
  values (p_actor_id, p_actor_label, 'booking_invoiced', 'booking', p_booking_id,
          jsonb_build_object('importe', p_amount, 'fecha', p_on,
                             'numero', nullif(btrim(coalesce(p_number, '')), ''),
                             'cobrado', v.final_price_amount));

  return jsonb_build_object('bookingId', p_booking_id, 'importe', p_amount,
                            'fecha', p_on, 'facturado', true);
end;
$$;

/**
 * Desmarcar. Tipear mal un importe es lo más fácil que hay, y sin esto la
 * única salida sería un UPDATE a mano sobre datos fiscales.
 */
create or replace function public.unmark_invoiced(
  p_booking_id  uuid,
  p_actor_id    uuid,
  p_actor_label text default null
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v public.service_execution_records%rowtype;
begin
  if p_actor_id is null or not public.can(p_actor_id, 'finanzas', 'full') then
    raise exception 'sin_permiso_finanzas';
  end if;

  select * into v from public.service_execution_records where booking_id = p_booking_id;
  if not found then raise exception 'turno_sin_cerrar'; end if;
  if v.invoiced_on is null then raise exception 'no_estaba_facturado'; end if;

  update public.service_execution_records
     set invoiced_on = null, invoiced_amount = null, invoice_number = null,
         invoiced_by_id = null, invoiced_at = null
   where booking_id = p_booking_id;

  -- Queda el rastro de lo que se deshizo: un dato fiscal que aparece y
  -- desaparece sin registro es peor que uno equivocado.
  insert into public.audit_log (actor_id, actor_label, action, entity_type, entity_id, detail)
  values (p_actor_id, p_actor_label, 'booking_invoice_undone', 'booking', p_booking_id,
          jsonb_build_object('importe_anterior', v.invoiced_amount,
                             'fecha_anterior', v.invoiced_on,
                             'numero_anterior', v.invoice_number));

  return jsonb_build_object('bookingId', p_booking_id, 'facturado', false);
end;
$$;

-- ---------------------------------------------------------------------
-- Qué falta facturar
-- ---------------------------------------------------------------------
/**
 * Lo que se cobró y todavía no tiene comprobante, con el nombre y el
 * importe listos para tipear en la app de ARCA. Ese es el trabajo que
 * este bloque le ahorra: no emitir, sino no tener que acordarse.
 */
create or replace function public.pending_invoices(
  p_desde date default null,
  p_hasta date default null,
  p_limit integer default 200
) returns table (
  booking_id   uuid,
  cuando       timestamptz,
  clienta      text,
  servicios    text,
  cobrado      integer,
  medio        text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select r.booking_id,
         b.starts_at,
         btrim(coalesce(c.first_name, '') || ' ' || coalesce(c.last_name, '')),
         -- Lo que se hizo de verdad si quedó escrito al cerrar; si no,
         -- el nombre que el turno tenía guardado. Ese texto es el que Sol
         -- va a tipear en la app de ARCA.
         coalesce(nullif(btrim(r.services_done), ''),
                  (select bi.snapshot_name from public.booking_items bi
                    where bi.booking_id = b.id and bi.role = 'main'
                    order by bi.sort_order limit 1),
                  'Atención'),
         r.final_price_amount,
         r.payment_method
    from public.service_execution_records r
    join public.bookings b  on b.id = r.booking_id
    left join public.customers c on c.id = b.customer_id
   where r.invoiced_on is null
     -- Un turno cancelado que quedó con cierre no se factura.
     and b.status not in ('cancelled', 'expired', 'no_show')
     and r.final_price_amount > 0
     and (p_desde is null
          or b.starts_at >= (p_desde::text || ' 00:00:00')::timestamp
             at time zone 'America/Argentina/Cordoba')
     and (p_hasta is null
          or b.starts_at < ((p_hasta + 1)::text || ' 00:00:00')::timestamp
             at time zone 'America/Argentina/Cordoba')
   order by b.starts_at
   limit least(coalesce(p_limit, 200), 500);
$$;

/**
 * El acumulado del año contra el tope de la categoría.
 *
 * `tope` viene de `business_settings` y puede no estar cargado. En ese
 * caso se devuelve null y la pantalla dice NO DISPONIBLE: un tope viejo
 * daría una tranquilidad falsa sobre una obligación fiscal, que es peor
 * que no mostrar nada.
 */
create or replace function public.invoicing_summary(p_year integer default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_year      integer;
  v_facturado bigint;
  v_pendiente bigint;
  v_cuantos   integer;
  v_tope      bigint;
begin
  v_year := coalesce(p_year, extract(year from (now() at time zone 'America/Argentina/Cordoba'))::integer);

  select coalesce(sum(invoiced_amount), 0) into v_facturado
    from public.service_execution_records
   where invoiced_on >= make_date(v_year, 1, 1)
     and invoiced_on <  make_date(v_year + 1, 1, 1);

  select coalesce(sum(cobrado), 0), count(*) into v_pendiente, v_cuantos
    from public.pending_invoices(make_date(v_year, 1, 1), make_date(v_year, 12, 31), 500);

  -- Sin valor cargado, `v_tope` queda en null y el resto de la respuesta
  -- sigue sirviendo. No se calcula ningún porcentaje contra un tope que
  -- no existe. Cualquier cosa que no sea un número se trata como «no
  -- cargado»: antes que mostrar un tope inventado, se dice que no está.
  select case when jsonb_typeof(value) = 'number' then (value #>> '{}')::bigint end
    into v_tope
    from public.business_settings
   where key = 'monotributo_annual_cap';

  return jsonb_build_object(
    'anio', v_year,
    'facturado', v_facturado,
    'pendiente', v_pendiente,
    'cuantos_pendientes', v_cuantos,
    'tope', v_tope,
    'tope_cargado', v_tope is not null
  );
end;
$$;

revoke all on function public.mark_invoiced(uuid, integer, date, text, uuid, text) from public, anon, authenticated;
revoke all on function public.unmark_invoiced(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.pending_invoices(date, date, integer) from public, anon, authenticated;
revoke all on function public.invoicing_summary(integer) from public, anon, authenticated;

grant execute on function public.mark_invoiced(uuid, integer, date, text, uuid, text) to service_role;
grant execute on function public.unmark_invoiced(uuid, uuid, text) to service_role;
grant execute on function public.pending_invoices(date, date, integer) to service_role;
grant execute on function public.invoicing_summary(integer) to service_role;
