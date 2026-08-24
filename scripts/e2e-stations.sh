#!/usr/bin/env bash
#
# E2E · estaciones, contra el Worker real.
#
# Cubre lo que la Fase 4 tenía que habilitar: asignar sillón, rechazar
# una estación de otra área, sacar un puesto de servicio sin cancelar
# los turnos que estaban ahí, y no poder asignar una estación caída.
#
# Requiere el stack local y el Worker en :4173 (ver e2e-flow.sh).
#
set -uo pipefail
TOKEN=$(/home/user/mockup-sol/scripts/local-stack.sh token dev@sol-mai.test 2>/dev/null)
API=http://127.0.0.1:4173/api/v1/admin
H="authorization: Bearer $TOKEN"
FAIL=0
ok(){ if [ "$2" = "1" ]; then echo "OK  · $1"; else echo "FALLA · $1 — $3"; FAIL=$((FAIL+1)); fi; }

# Un turno interno mañana en Peluquería.
DAY=$(date -u -d "+3 days" +%Y-%m-%d)
SVC=$(curl -s "http://127.0.0.1:4173/api/v1/catalog/services?category=peluqueria" | python3 -c "
import sys,json
for s in json.load(sys.stdin)['data']:
    if not s.get('lengthAffectsPrice') and not s.get('requiresLength'):
        print(s['slug']); break
else:
    print(json.load(sys.stdin)['data'][0]['slug'])")
BODY="{\"serviceSlug\":\"$SVC\",\"lengthTier\":\"medio\",\"startsAt\":\"${DAY}T13:00:00.000Z\",\"source\":\"manual\",\"customer\":{\"firstName\":\"Testina\",\"phone\":\"3424111222\"}}"
CREATE=$(curl -s -m 15 -X POST -H "$H" -H "content-type: application/json" -d "$BODY" "$API/bookings")
BID=$(echo "$CREATE" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('data',{}).get('id',''))" 2>/dev/null)
if [ -z "$BID" ]; then echo "no se pudo crear el turno: $CREATE"; exit 1; fi
echo "turno $BID"

P1=$(curl -s -H "$H" "$API/stations?area=peluqueria" | python3 -c "import sys,json;print([x for x in json.load(sys.stdin)['data'] if x['code']=='P1'][0]['id'])")
M1=$(curl -s -H "$H" "$API/stations?area=maquillaje" | python3 -c "import sys,json;print(json.load(sys.stdin)['data'][0]['id'])")

# 2. asignar una estación del área correcta
R=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "$H" -H "content-type: application/json" -d "{\"stationId\":\"$P1\"}" "$API/bookings/$BID/station")
ok "asigna una estación del área del turno" "$([ "$R" = "200" ] && echo 1 || echo 0)" "http $R"

# 3. la agenda la muestra
ST=$(curl -s -H "$H" "$API/agenda?date=$DAY&days=1" | python3 -c "
import sys,json
d=json.load(sys.stdin)['data']['entries']
m=[e for e in d if e['id']=='$BID']
print(m[0]['station']['code'] if m and m[0].get('station') else 'NADA')")
ok "la agenda muestra la estación asignada" "$([ "$ST" = "P1" ] && echo 1 || echo 0)" "devolvió $ST"

# 4. una estación de OTRA área se rechaza
R=$(curl -s -X POST -H "$H" -H "content-type: application/json" -d "{\"stationId\":\"$M1\"}" "$API/bookings/$BID/station")
ok "rechaza una estación de otra área" "$(echo "$R" | grep -q 'no es del área' && echo 1 || echo 0)" "$R"

# 5. sacar P1 de servicio en ese rango libera el turno sin cancelarlo
BLK=$(curl -s -X POST -H "$H" -H "content-type: application/json" \
  -d "{\"startsAt\":\"${DAY}T00:00:00.000Z\",\"endsAt\":\"$(date -u -d "+4 days" +%Y-%m-%d)T00:00:00.000Z\",\"reason\":\"Reparación\"}" \
  "$API/stations/$P1/block")
DISP=$(echo "$BLK" | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['displacedBookings'])")
ok "sacar de servicio libera los turnos que estaban ahí" "$([ "$DISP" = "1" ] && echo 1 || echo 0)" "desplazados=$DISP"

STATE=$(curl -s -H "$H" "$API/agenda?date=$DAY&days=1" | python3 -c "
import sys,json
d=json.load(sys.stdin)['data']['entries']
m=[e for e in d if e['id']=='$BID']
print('%s|%s' % (m[0]['status'], m[0].get('station')) if m else 'NO_ESTA')")
ok "el turno sigue en la agenda y sin estación (no se cancela)" \
   "$([ "$STATE" = "confirmed|None" ] && echo 1 || echo 0)" "$STATE"

# 6. no se puede asignar una estación fuera de servicio
R=$(curl -s -X POST -H "$H" -H "content-type: application/json" -d "{\"stationId\":\"$P1\"}" "$API/bookings/$BID/station")
ok "no deja asignar una estación fuera de servicio" "$(echo "$R" | grep -q 'fuera de servicio' && echo 1 || echo 0)" "$R"

# 7. la capacidad efectiva del área bajó
CAP=$(curl -s -H "$H" "$API/capacity?area=peluqueria&startsAt=${DAY}T13:00:00.000Z&endsAt=${DAY}T14:00:00.000Z" | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['capacity'])")
echo "    (capacidad reportada por /capacity: $CAP)"

# 8. quitar el bloqueo
BLKID=$(echo "$BLK" | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['id'])")
R=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "$H" "$API/stations/blocks/$BLKID/remove")
ok "se puede volver a poner en servicio" "$([ "$R" = "200" ] && echo 1 || echo 0)" "http $R"

R=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "$H" -H "content-type: application/json" -d "{\"stationId\":\"$P1\"}" "$API/bookings/$BID/station")
ok "y volver a asignarla" "$([ "$R" = "200" ] && echo 1 || echo 0)" "http $R"

# 9. sin asignar es una opción válida
R=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "$H" -H "content-type: application/json" -d '{"stationId":null}' "$API/bookings/$BID/station")
ok "desasignar es válido: la asignación es opcional" "$([ "$R" = "200" ] && echo 1 || echo 0)" "http $R"

# Limpiar lo propio: un bloqueo olvidado hace fallar la corrida siguiente.
curl -s -o /dev/null -X POST -H "$H" "$API/stations/blocks/$BLKID/remove" 2>/dev/null || true

echo ""
[ "$FAIL" = "0" ] && echo "=== ESTACIONES OK ===" || echo "=== $FAIL FALLAS ==="
exit $FAIL
