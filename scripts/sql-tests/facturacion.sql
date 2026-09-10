-- =====================================================================
-- Sol Mai · Finanzas › Facturación
--
-- Este bloque no emite comprobantes: registra los que Sol emitió y le
-- dice qué le falta. Por eso lo que más importa probar es que NO afirme
-- cosas falsas —un turno facturado que no se cerró, un importe en cero,
-- una fecha futura, un tope inventado—, porque cada una de esas se
-- convierte en una decisión fiscal equivocada.
--
--   su postgres -c "psql -v ON_ERROR_STOP=1 -d solmai_local \
--     -f scripts/sql-tests/facturacion.sql"
-- =====================================================================
\set ON_ERROR_STOP on
\pset pager off

begin;

create temp table resultado (
  n integer generated always as identity, nombre text, ok boolean, detalle text
);

create function pg_temp.chequear(p_nombre text, p_ok boolean, p_detalle text default null)
returns void language plpgsql as $$
begin insert into resultado (nombre, ok, detalle) values (p_nombre, coalesce(p_ok,false), p_detalle); end; $$;

create function pg_temp.debe_fallar(p_nombre text, p_sql text, p_error text) returns void
language plpgsql as $$
begin
  begin
    execute p_sql;
    insert into resultado (nombre, ok, detalle) values (p_nombre, false, 'no falló: se esperaba ' || p_error);
  exception when others then
    insert into resultado (nombre, ok, detalle)
    values (p_nombre, sqlerrm = p_error, 'esperado=' || p_error || ' obtenido=' || sqlerrm);
  end;
end; $$;

-- Foto del año ANTES de sembrar. Las cuentas de más abajo se miden como
-- diferencia contra esto y no como totales absolutos: `invoicing_summary`
-- mira todo el año —así tiene que ser—, y una prueba que afirma un total
-- absoluto se rompe en cuanto la base trae algo de otra corrida. Ya pasó.
create temp table antes as select public.invoicing_summary() as r;

-- ---------------------------------------------------------------------
-- Gente y turnos
-- ---------------------------------------------------------------------
insert into public.staff_members (id, slug, display_name, email, role, is_active) values
  ('11111111-1111-1111-1111-111111111111','sol','Sol','sol@f.test','owner',true),
  ('22222222-2222-2222-2222-222222222222','ana','Ana','ana@f.test','mostrador',true);

insert into public.customers (id, first_name, last_name, phone_e164)
values ('aaaaaaaa-0000-4000-8000-000000000001','Marta','Gómez','+543425550001');

insert into public.bookings (id, customer_id, area_id, starts_at, ends_at, shown_duration_min,
                             status, source, price_display_mode,
                             price_estimated_min, price_estimated_max, deposit_rate_applied, deposit_amount)
select ('bbbbbbbb-0000-4000-8000-00000000000' || n)::uuid,
       'aaaaaaaa-0000-4000-8000-000000000001',
       (select id from public.areas where slug = 'peluqueria'),
       now() - (n || ' days')::interval,
       now() - (n || ' days')::interval + interval '1 hour',
       60, 'attended', 'phone', 'fixed',
       20000 * n, 20000 * n, 0, 0
  from generate_series(1,3) n;

insert into public.service_execution_records (booking_id, final_price_amount, actual_duration_min,
                                              services_done, payment_method)
select ('bbbbbbbb-0000-4000-8000-00000000000' || n)::uuid, 20000 * n, 60,
       'Corte y color', 'efectivo'
  from generate_series(1,3) n;

-- =====================================================================
-- A · Lo que falta facturar
-- =====================================================================
select pg_temp.chequear('A1 · las tres atenciones aparecen sin facturar',
  (select count(*) = 3 from public.pending_invoices()
    where booking_id::text like 'bbbbbbbb-0000-4000-8000-00000000000%'));

select pg_temp.chequear('A2 · trae el nombre de la clienta, no un id',
  (select clienta = 'Marta Gómez' from public.pending_invoices()
    where booking_id::text like 'bbbbbbbb-0000-4000-8000-00000000000%' limit 1));

select pg_temp.chequear('A3 · trae qué se hizo, para tipearlo en ARCA',
  (select servicios = 'Corte y color' from public.pending_invoices()
    where booking_id::text like 'bbbbbbbb-0000-4000-8000-00000000000%' limit 1));

select pg_temp.chequear('A4 · trae el precio de la atención',
  (select precio > 0 from public.pending_invoices()
    where booking_id::text like 'bbbbbbbb-0000-4000-8000-00000000000%' limit 1));

-- LO QUE SE ACORDÓ Y LO QUE ENTRÓ NO SON EL MISMO NÚMERO
--
-- `close_service` permite cerrar con saldo —una seña y el resto
-- pendiente—, así que el precio final puede ser mayor que lo cobrado.
-- Antes acá viajaba el precio con el nombre `cobrado`: eso metía en la
-- lista de pendientes y en el acumulado del año plata que nunca entró, y
-- Sol podía terminar facturando sobre un número que no existió.
insert into public.payments (booking_id, provider, provider_ref, amount, status, method, kind)
values ('bbbbbbbb-0000-4000-8000-000000000003', 'cash', 'ci-sena-parcial', 5000, 'approved', 'efectivo', 'deposit');

select pg_temp.chequear('A5 · lo cobrado sale de los pagos aprobados',
  (select cobrado = 5000 from public.pending_invoices()
    where booking_id = 'bbbbbbbb-0000-4000-8000-000000000003'));

select pg_temp.chequear('A6 · y el precio sigue siendo el que se cerró',
  (select precio = 60000 from public.pending_invoices()
    where booking_id = 'bbbbbbbb-0000-4000-8000-000000000003'));

select pg_temp.chequear('A7 · una atención sin ningún pago cobrado da cero, no el precio',
  (select cobrado = 0 and precio = 20000 from public.pending_invoices()
    where booking_id = 'bbbbbbbb-0000-4000-8000-000000000001'));

-- =====================================================================
-- B · Marcar
-- =====================================================================
select pg_temp.chequear('B1 · Sol marca una atención como facturada',
  (public.mark_invoiced('bbbbbbbb-0000-4000-8000-000000000001', 20000,
                        (now() at time zone 'America/Argentina/Cordoba')::date,
                        '00001-00000123','11111111-1111-1111-1111-111111111111')
   ->>'facturado')::boolean);

select pg_temp.chequear('B2 · y deja de estar en lo que falta',
  (select count(*) = 2 from public.pending_invoices()
    where booking_id::text like 'bbbbbbbb-0000-4000-8000-00000000000%'));

select pg_temp.chequear('B3 · guarda el número que ella tipeó',
  (select invoice_number = '00001-00000123' from public.service_execution_records
    where booking_id = 'bbbbbbbb-0000-4000-8000-000000000001'));

select pg_temp.chequear('B4 · guarda quién lo marcó',
  (select invoiced_by_id = '11111111-1111-1111-1111-111111111111'
     from public.service_execution_records
    where booking_id = 'bbbbbbbb-0000-4000-8000-000000000001'));

select pg_temp.chequear('B5 · queda en el registro con el precio cerrado al lado',
  (select (detail->>'importe')::int = 20000 and (detail->>'precio_cerrado')::int = 20000
     from public.audit_log where action = 'booking_invoiced' order by id desc limit 1));

-- El importe facturado puede diferir de lo cobrado: eso lo decide el
-- contador de Sol, no el sistema. Lo que el sistema hace es guardar los
-- dos y no opinar.
select pg_temp.chequear('B6 · se puede facturar por un importe distinto al cobrado',
  (public.mark_invoiced('bbbbbbbb-0000-4000-8000-000000000002', 35000,
                        (now() at time zone 'America/Argentina/Cordoba')::date,
                        null,'11111111-1111-1111-1111-111111111111')
   ->>'facturado')::boolean);

select pg_temp.chequear('B7 · el número es opcional',
  (select invoice_number is null and invoiced_amount = 35000
     from public.service_execution_records
    where booking_id = 'bbbbbbbb-0000-4000-8000-000000000002'));

-- =====================================================================
-- C · Los guards
-- =====================================================================
select pg_temp.debe_fallar('C1 · quien atiende el mostrador no factura',
  $$select public.mark_invoiced('bbbbbbbb-0000-4000-8000-000000000003', 10000,
      current_date, null, '22222222-2222-2222-2222-222222222222')$$,
  'sin_permiso_finanzas');

select pg_temp.debe_fallar('C2 · sin actor no se factura',
  $$select public.mark_invoiced('bbbbbbbb-0000-4000-8000-000000000003', 10000,
      current_date, null, null)$$,
  'sin_permiso_finanzas');

select pg_temp.debe_fallar('C3 · un importe en cero se rechaza',
  $$select public.mark_invoiced('bbbbbbbb-0000-4000-8000-000000000003', 0,
      current_date, null, '11111111-1111-1111-1111-111111111111')$$,
  'importe_invalido');

select pg_temp.debe_fallar('C4 · un importe negativo se rechaza',
  $$select public.mark_invoiced('bbbbbbbb-0000-4000-8000-000000000003', -5000,
      current_date, null, '11111111-1111-1111-1111-111111111111')$$,
  'importe_invalido');

select pg_temp.debe_fallar('C5 · una fecha futura se rechaza',
  $$select public.mark_invoiced('bbbbbbbb-0000-4000-8000-000000000003', 10000,
      current_date + 1, null, '11111111-1111-1111-1111-111111111111')$$,
  'fecha_futura');

select pg_temp.debe_fallar('C6 · sin fecha no se marca',
  $$select public.mark_invoiced('bbbbbbbb-0000-4000-8000-000000000003', 10000,
      null, null, '11111111-1111-1111-1111-111111111111')$$,
  'fecha_requerida');

select pg_temp.debe_fallar('C7 · un turno sin cerrar no se factura',
  $$select public.mark_invoiced('bbbbbbbb-0000-4000-8000-000000000009', 10000,
      current_date, null, '11111111-1111-1111-1111-111111111111')$$,
  'turno_sin_cerrar');

select pg_temp.debe_fallar('C8 · no se factura dos veces la misma atención',
  $$select public.mark_invoiced('bbbbbbbb-0000-4000-8000-000000000001', 20000,
      current_date, null, '11111111-1111-1111-1111-111111111111')$$,
  'ya_facturado');

-- =====================================================================
-- D · Desmarcar
-- =====================================================================
select pg_temp.debe_fallar('D1 · quien atiende el mostrador no desmarca',
  $$select public.unmark_invoiced('bbbbbbbb-0000-4000-8000-000000000001',
      '22222222-2222-2222-2222-222222222222')$$,
  'sin_permiso_finanzas');

select pg_temp.chequear('D2 · Sol puede deshacer un importe mal tipeado',
  not (public.unmark_invoiced('bbbbbbbb-0000-4000-8000-000000000002',
                              '11111111-1111-1111-1111-111111111111')
       ->>'facturado')::boolean);

select pg_temp.chequear('D3 · y vuelve a estar en lo que falta',
  (select count(*) = 2 from public.pending_invoices()
    where booking_id::text like 'bbbbbbbb-0000-4000-8000-00000000000%'));

select pg_temp.chequear('D4 · deshacer queda registrado con lo que decía antes',
  (select (detail->>'importe_anterior')::int = 35000
     from public.audit_log where action = 'booking_invoice_undone' order by id desc limit 1));

select pg_temp.debe_fallar('D5 · no se deshace lo que no estaba facturado',
  $$select public.unmark_invoiced('bbbbbbbb-0000-4000-8000-000000000003',
      '11111111-1111-1111-1111-111111111111')$$,
  'no_estaba_facturado');

-- =====================================================================
-- E · Ni media marca ni datos sueltos
-- =====================================================================
select pg_temp.debe_fallar('E1 · no se puede decir «facturado» sin importe',
  $$update public.service_execution_records set invoiced_on = current_date
     where booking_id = 'bbbbbbbb-0000-4000-8000-000000000003'$$,
  'new row for relation "service_execution_records" violates check constraint "service_execution_records_invoice_coherent"');

select pg_temp.debe_fallar('E2 · ni un importe facturado en cero a mano',
  $$update public.service_execution_records
       set invoiced_on = current_date, invoiced_amount = 0, invoiced_at = now()
     where booking_id = 'bbbbbbbb-0000-4000-8000-000000000003'$$,
  'new row for relation "service_execution_records" violates check constraint "service_execution_records_invoiced_amount_check"');

-- =====================================================================
-- F · El acumulado contra el tope
-- =====================================================================
select pg_temp.chequear('F1 · suma lo facturado del año',
  (public.invoicing_summary()->>'facturado')::bigint
  - (select (r->>'facturado')::bigint from antes) = 20000);

select pg_temp.chequear('F2 · dice cuánto falta facturar, a precio de la atención',
  (public.invoicing_summary()->>'pendiente')::bigint
  - (select (r->>'pendiente')::bigint from antes) = 40000 + 60000);

select pg_temp.chequear('F2b · y por separado cuánto de eso ya entró',
  (public.invoicing_summary()->>'pendiente_cobrado')::bigint
  - (select (r->>'pendiente_cobrado')::bigint from antes) = 5000);

select pg_temp.chequear('F3 · y cuántas atenciones son',
  (public.invoicing_summary()->>'cuantos_pendientes')::int
  - (select (r->>'cuantos_pendientes')::int from antes) = 2);

-- LA REGLA DEL BLOQUE: el tope lo carga el contador de Sol. Un tope viejo
-- da una tranquilidad falsa sobre una obligación fiscal, así que mientras
-- no esté cargado el sistema dice que no lo sabe.
select pg_temp.chequear('F4 · sin tope cargado, dice que no está',
  (public.invoicing_summary()->>'tope') is null
  and (public.invoicing_summary()->>'tope_cargado')::boolean = false);

select pg_temp.chequear('F5 · la fila del tope existe, para tener dónde cargarlo',
  (select count(*) = 1 from public.business_settings where key = 'monotributo_annual_cap'));

select pg_temp.chequear('F6 · no le pusimos ningún número nosotros',
  (select jsonb_typeof(value) = 'null' from public.business_settings
    where key = 'monotributo_annual_cap'));

update public.business_settings set value = '82370281'::jsonb
 where key = 'monotributo_annual_cap';

select pg_temp.chequear('F7 · cargado por el contador, lo muestra',
  (public.invoicing_summary()->>'tope')::bigint = 82370281
  and (public.invoicing_summary()->>'tope_cargado')::boolean);

update public.business_settings set value = '"ochenta millones"'::jsonb
 where key = 'monotributo_annual_cap';

select pg_temp.chequear('F8 · si alguien carga cualquier cosa, no inventa un número',
  (public.invoicing_summary()->>'tope') is null
  and (public.invoicing_summary()->>'tope_cargado')::boolean = false);

-- =====================================================================
-- G · Lo que no se factura
-- =====================================================================
update public.bookings set status = 'cancelled', cancelled_at = now()
 where id = 'bbbbbbbb-0000-4000-8000-000000000003';

select pg_temp.chequear('G1 · un turno cancelado no aparece para facturar',
  (select count(*) = 1 from public.pending_invoices()
    where booking_id::text like 'bbbbbbbb-0000-4000-8000-00000000000%'));

\echo ''
select lpad(n::text,2,' ') || '  ' || case when ok then 'PASS' else 'FALLA' end || '  ' || nombre
       || coalesce('  →  ' || nullif(case when ok then '' else detalle end,''), '') as "facturación"
  from resultado order by n;

\echo ''
select count(*) filter (where ok) || ' de ' || count(*) || ' pruebas en verde' as total from resultado;

do $$
declare v_fallan integer;
begin
  select count(*) into v_fallan from resultado where not ok;
  if v_fallan > 0 then raise exception '% pruebas en rojo', v_fallan; end if;
end $$;

rollback;
