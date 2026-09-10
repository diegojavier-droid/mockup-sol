#!/usr/bin/env bash
#
# Sol Mai · Dos pedidos simultáneos no pueden alterar un comprobante
#
# Va aparte del resto de las pruebas de facturación porque necesita DOS
# sesiones de verdad: una carrera no se puede escribir dentro de una sola
# transacción de psql.
#
# QUÉ PASABA SIN EL LOCK
#
# Con READ COMMITTED —el default de PostgreSQL— las dos sesiones leen la
# fila sin facturar, las dos pasan el guard `ya_facturado`, y la segunda
# pisa el importe de la primera. Las dos devuelven éxito y quedan DOS
# renglones en el registro para un solo comprobante. Sobre un dato fiscal
# eso no es una molestia: es un comprobante mal registrado, y el número
# que queda no es el que nadie vio confirmado.
#
#   bash scripts/local-stack.sh up
#   bash scripts/sql-tests/facturacion-concurrencia.sh
#
set -uo pipefail

DB=${SOLMAI_LOCAL_DB:-solmai_local}
ID=bbbbbbbb-0000-4000-8000-00000000cc01
SOL=cccccccc-0000-4000-8000-00000000cc99
fallas=0

ok() { printf '  \033[32mPASS\033[0m  %s\n' "$1"; }
falla() { printf '  \033[31mFALLA\033[0m %s\n' "$1"; fallas=$((fallas + 1)); }

su postgres -c "psql -v ON_ERROR_STOP=1 -q -d $DB" <<SQL
insert into public.staff_members (id, slug, display_name, email, role, is_active)
values ('$SOL','sol-concurrencia','Sol','sol-concurrencia@solmai.test','owner',true)
on conflict (id) do nothing;
insert into public.customers (id, first_name, last_name, phone_e164)
values ('aaaaaaaa-0000-4000-8000-00000000cc01','Carrera','Simultánea','+543425551111')
on conflict (id) do nothing;
insert into public.bookings (id, customer_id, area_id, starts_at, ends_at, shown_duration_min,
  status, source, price_display_mode, price_estimated_min, price_estimated_max,
  deposit_rate_applied, deposit_amount)
values ('$ID','aaaaaaaa-0000-4000-8000-00000000cc01',
  (select id from public.areas where slug='peluqueria'), now()-interval '1 day',
  now()-interval '1 day'+interval '1 hour',60,'attended','phone','fixed',30000,30000,0,0)
on conflict (id) do nothing;
insert into public.service_execution_records
  (booking_id, final_price_amount, actual_duration_min, services_done, payment_method)
values ('$ID',30000,60,'Color','efectivo')
on conflict (booking_id) do update
  set invoiced_on=null, invoiced_amount=null, invoice_number=null,
      invoiced_by_id=null, invoiced_at=null;
delete from public.audit_log where entity_id = '$ID' and action = 'booking_invoiced';
SQL

# Sesión A factura y se queda con la transacción abierta unos segundos.
su postgres -c "psql -q -d $DB" <<SQL >/dev/null 2>&1 &
begin;
select public.mark_invoiced('$ID', 30000, current_date, 'A-0001', '$SOL');
select pg_sleep(4);
commit;
SQL
A=$!

# Sesión B llega en el medio, con otro importe.
sleep 1
B_SALIDA=$(su postgres -c "psql -q -d $DB -Atc \"select public.mark_invoiced('$ID', 99999, current_date, 'B-9999', '$SOL')\"" 2>&1)
wait $A

echo ""
echo "Dos pedidos simultáneos sobre el mismo comprobante"

if grep -q "ya_facturado" <<<"$B_SALIDA"; then
  ok "el segundo espera y rebota con «ya_facturado»"
else
  falla "el segundo no rebotó — devolvió: $(head -c 120 <<<"$B_SALIDA")"
fi

FILA=$(su postgres -c "psql -d $DB -Atc \"select invoiced_amount || '|' || coalesce(invoice_number,'') from public.service_execution_records where booking_id='$ID'\"")
if [ "$FILA" = "30000|A-0001" ]; then
  ok "queda el importe del primero, no el del segundo"
else
  falla "el segundo pisó el comprobante: $FILA"
fi

N=$(su postgres -c "psql -d $DB -Atc \"select count(*) from public.audit_log where action='booking_invoiced' and entity_id='$ID'\"")
if [ "$N" = "1" ]; then
  ok "queda UN solo renglón en el registro"
else
  falla "quedaron $N renglones en el registro para un solo comprobante"
fi

echo ""
if [ "$fallas" -gt 0 ]; then
  echo "$fallas en rojo"
  exit 1
fi
echo "todo en verde"
