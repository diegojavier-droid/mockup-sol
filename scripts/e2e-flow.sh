#!/usr/bin/env bash
#
# E2E · el flujo completo del salón, contra el Worker real.
#
# Es la prueba que responde "¿se puede operar con esto?": la clienta
# reserva sola por la web, un webhook sin firma NO confirma nada, el
# salón ve el turno, toma uno de mostrador, le asigna un sillón, cierra
# la atención con el precio real y la plata aparece en los números.
#
# Requiere el stack local levantado y el Worker en :4173:
#   scripts/local-stack.sh up
#   bun run build && bunx wrangler dev -c dist/server/wrangler.json --port 4173
#
#   scripts/e2e-flow.sh
#
set -uo pipefail
BASE=http://127.0.0.1:4173
API=$BASE/api/v1
TOKEN=$(/home/user/mockup-sol/scripts/local-stack.sh token dev@sol-mai.test 2>/dev/null)
H="authorization: Bearer $TOKEN"
FAIL=0
ok(){ if [ "$2" = "1" ]; then echo "OK  · $1"; else echo "FALLA · $1 — $3"; FAIL=$((FAIL+1)); fi; }

# Partir de cero: una corrida previa deja turnos y pagos que suman en el
# dashboard y hacen que el total no sea comprobable.
su postgres -c "psql -q -d solmai_local" >/dev/null 2>&1 <<'CLEANSQL'
delete from public.payments where booking_id in (
  select id from public.bookings where customer_id in (
    select id from public.customers where first_name in ('Valentina','Marta','Testina')));
delete from public.bookings where customer_id in (
  select id from public.customers where first_name in ('Valentina','Marta','Testina'));
delete from public.customers where first_name in ('Valentina','Marta','Testina');
delete from public.resource_blocks;
CLEANSQL

echo "── 1. La clienta ve el catálogo sin autenticarse"
CATS=$(curl -s -m 10 "$API/catalog/categories" | python3 -c "import sys,json;print(len(json.load(sys.stdin)['data']))")
ok "el catálogo público responde ($CATS categorías)" "$([ "$CATS" -ge 4 ] && echo 1 || echo 0)" "$CATS"

echo ""
echo "── 2. La clienta pide disponibilidad real"
DAY=$(date -u -d "+5 days" +%Y-%m-%d)
AV=$(curl -s -m 10 "$API/availability?service=corte-fem&length=medio&from=${DAY}T00:00:00Z&days=1")
SLOTS=$(echo "$AV" | python3 -c "
import sys,json
d=json.load(sys.stdin).get('data',{})
print(sum(len(x['times']) for x in d.get('days',[])))
" 2>/dev/null || echo 0)
ok "hay horarios disponibles ($SLOTS)" "$([ "$SLOTS" -gt 0 ] && echo 1 || echo 0)" "$(echo "$AV" | head -c 200)"
FIRST=$(echo "$AV" | python3 -c "
import sys,json
d=json.load(sys.stdin)['data']['days'][0]
print('%sT%s:00-03:00' % (d['date'], d['times'][0]))" 2>/dev/null)
echo "    primer horario: $FIRST"

echo ""
echo "── 3. La clienta reserva sola por la web"
BODY=$(python3 -c "
import json
print(json.dumps({'serviceSlug':'corte-fem','lengthTier':'medio','startsAt':'$FIRST',
 'customer':{'firstName':'Valentina','lastName':'Rios','phone':'3424556677','email':'vale@example.com','acceptsMarketing':False}}))")
RES=$(curl -s -m 15 -X POST -H "content-type: application/json" -d "$BODY" "$API/bookings")
TOKEN_PUB=$(echo "$RES" | python3 -c "import sys,json;print(json.load(sys.stdin).get('data',{}).get('publicToken',''))" 2>/dev/null)
STATUS=$(echo "$RES" | python3 -c "import sys,json;print(json.load(sys.stdin).get('data',{}).get('status',''))" 2>/dev/null)
ok "la reserva pública se crea" "$([ -n "$TOKEN_PUB" ] && echo 1 || echo 0)" "$(echo "$RES"|head -c 250)"
ok "nace pendiente de seña (online exige seña)" "$([ "$STATUS" = "pending_payment" ] && echo 1 || echo 0)" "$STATUS"

echo ""
echo "── 4. La clienta consulta su reserva con su link"
MINE=$(curl -s -m 10 "$API/bookings/$TOKEN_PUB")
NAME=$(echo "$MINE" | python3 -c "import sys,json;print(json.load(sys.stdin).get('data',{}).get('customerFirstName') or json.load(sys.stdin).get('data',{}).get('customer',{}).get('firstName',''))" 2>/dev/null)
ok "puede ver su propia reserva con el link" "$(echo "$MINE" | grep -q 'pending_payment\|depositAmount' && echo 1 || echo 0)" "$(echo "$MINE"|head -c 200)"

echo ""
echo "── 5. Un webhook SIN firma no confirma nada"
BDAY=${FIRST%%T*}
BID=$(curl -s -H "$H" "$API/admin/agenda?date=$BDAY&days=1" | python3 -c "
import sys,json
for e in json.load(sys.stdin)['data']['entries']:
    if e['publicToken']=='$TOKEN_PUB': print(e['id']); break")
WH=$(curl -s -o /dev/null -w "%{http_code}" -m 10 -X POST -H "content-type: application/json" \
  -d "{\"data\":{\"id\":\"999\"},\"type\":\"payment\"}" "$API/payments/webhook")
ok "el webhook sin firma se rechaza con 401" "$([ "$WH" = "401" ] && echo 1 || echo 0)" "http $WH"
STILL=$(curl -s -H "$H" "$API/admin/bookings/$BID" | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['status'])")
ok "y la reserva sigue SIN confirmar" "$([ "$STILL" = "pending_payment" ] && echo 1 || echo 0)" "$STILL"

echo ""
echo "── 6. El salón la ve en la agenda"
SEEN=$(curl -s -H "$H" "$API/admin/agenda?date=$BDAY&days=1" | python3 -c "
import sys,json
print(len([e for e in json.load(sys.stdin)['data']['entries'] if e['publicToken']=='$TOKEN_PUB']))")
ok "aparece en la agenda del salón" "$([ "$SEEN" = "1" ] && echo 1 || echo 0)" "$SEEN"

echo ""
echo "── 7. El salón toma un turno de mostrador"
W=$(curl -s -m 15 -X POST -H "$H" -H "content-type: application/json" \
  -d "{\"serviceSlug\":\"corte-fem\",\"lengthTier\":\"medio\",\"startsAt\":\"${BDAY}T19:00:00.000Z\",\"source\":\"walk_in\",\"customer\":{\"firstName\":\"Marta\",\"phone\":\"3424998877\"}}" \
  "$API/admin/bookings")
WID=$(echo "$W" | python3 -c "import sys,json;print(json.load(sys.stdin).get('data',{}).get('id',''))" 2>/dev/null)
WST=$(echo "$W" | python3 -c "import sys,json;print(json.load(sys.stdin).get('data',{}).get('status',''))" 2>/dev/null)
ok "el turno de mostrador se crea" "$([ -n "$WID" ] && echo 1 || echo 0)" "$(echo "$W"|head -c 200)"
ok "nace CONFIRMADO y sin seña (el compromiso es la conversación)" "$([ "$WST" = "confirmed" ] && echo 1 || echo 0)" "$WST"

echo ""
echo "── 8. Se le asigna un sillón"
P1=$(curl -s -H "$H" "$API/admin/stations?area=peluqueria" | python3 -c "import sys,json;print(json.load(sys.stdin)['data'][0]['id'])")
A=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "$H" -H "content-type: application/json" -d "{\"stationId\":\"$P1\"}" "$API/admin/bookings/$WID/station")
ok "se le asigna una estación" "$([ "$A" = "200" ] && echo 1 || echo 0)" "http $A"

echo ""
echo "── 9. Se cierra la atención con el precio real"
CL=$(curl -s -m 15 -X POST -H "$H" -H "content-type: application/json" \
  -d '{"finalPrice":24000,"servicesDone":"Corte y brushing","durationMin":70,"payments":[{"amount":24000,"method":"efectivo","kind":"balance"}]}' \
  "$API/admin/bookings/$WID/close")
ok "se cierra la atención" "$(echo "$CL" | grep -q '"ok"\|attended\|outstanding' && echo 1 || echo 0)" "$(echo "$CL"|head -c 250)"
FIN=$(curl -s -H "$H" "$API/admin/bookings/$WID" | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['status'])")
ok "queda como atendida" "$([ "$FIN" = "attended" ] && echo 1 || echo 0)" "$FIN"

echo ""
echo "── 10. El dinero aparece en los números"
D=$(curl -s -H "$H" "$API/admin/dashboard?from=$BDAY&to=$BDAY")
COB=$(echo "$D" | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['collected_amount'])")
MAR=$(echo "$D" | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['margin']['available'])")
ok "lo cobrado en efectivo llega al dashboard ($COB)" "$([ "$COB" = "24000" ] && echo 1 || echo 0)" "$COB"
ok "el margen sigue NO DISPONIBLE (no se cargó costo)" "$([ "$MAR" = "False" ] && echo 1 || echo 0)" "$MAR"

echo ""
[ "$FAIL" = "0" ] && echo "═══ FLUJO COMPLETO OK ═══" || echo "═══ $FAIL FALLAS ═══"
exit $FAIL
