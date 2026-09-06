#!/usr/bin/env bash
#
# E2E · varias prestaciones en un mismo turno («color y corte»).
#
# Es el ejemplo canónico que fija el norte de producto, y hasta este
# bloque no era escribible: el contrato aceptaba un servicio y nada más.
#
# Requiere el stack local levantado y el Worker en :4173, o las mismas
# variables que usan las otras suites en CI.
#
set -uo pipefail

BASE=${SOLMAI_E2E_BASE:-http://127.0.0.1:4173}
API=$BASE/api/v1
if [ -n "${SOLMAI_E2E_STAFF_TOKEN:-}" ]; then
  TOKEN="$SOLMAI_E2E_STAFF_TOKEN"
else
  TOKEN=$("$(dirname "$0")/local-stack.sh" token "${SOLMAI_E2E_STAFF_EMAIL:-dev@sol-mai.test}" 2>/dev/null)
fi
H="authorization: Bearer $TOKEN"
FAIL=0
ok(){ if [ "$2" = "1" ]; then echo "OK  · $1"; else echo "FALLA · $1 — $3"; FAIL=$((FAIL+1)); fi; }

psql_run() {
  if [ -n "${SOLMAI_E2E_DB_URL:-}" ]; then
    psql "$SOLMAI_E2E_DB_URL" -Atc "$1"
  else
    su postgres -c "psql -Atc \"${1//\"/\\\"}\" -d ${SOLMAI_LOCAL_DB:-solmai_local}"
  fi
}

cleanup() {
  psql_run "delete from public.booking_items where booking_id in (select id from public.bookings where customer_id in (select id from public.customers where first_name = 'Combo'));
            delete from public.payments where booking_id in (select id from public.bookings where customer_id in (select id from public.customers where first_name = 'Combo'));
            delete from public.bookings where customer_id in (select id from public.customers where first_name = 'Combo');
            delete from public.customers where first_name = 'Combo';" >/dev/null 2>&1
}
cleanup

# Dos servicios reales de la MISMA área, y uno de otra para el rechazo.
A=$(psql_run "select s.slug from public.services s join public.categories c on c.id=s.category_id join public.service_price_tiers t on t.service_id=s.id where c.slug='peluqueria' and s.is_active group by s.slug order by s.slug limit 1")
B=$(psql_run "select s.slug from public.services s join public.categories c on c.id=s.category_id join public.service_price_tiers t on t.service_id=s.id where c.slug='peluqueria' and s.is_active and s.slug <> '$A' group by s.slug order by s.slug limit 1")
OTRA=$(psql_run "select s.slug from public.services s join public.categories c on c.id=s.category_id join public.service_price_tiers t on t.service_id=s.id where c.slug <> 'peluqueria' and s.is_active group by s.slug order by s.slug limit 1")

if [ -z "$A" ] || [ -z "$B" ]; then
  echo "FALLA · el catálogo no tiene dos servicios cotizables de peluquería"
  exit 1
fi
echo "── prestaciones de prueba: $A + $B (y $OTRA de otra área)"

jqf() { python3 -c "import sys,json;d=json.load(sys.stdin);print(d$1)" 2>/dev/null; }

q() {
  curl -s -m 15 -X POST -H "content-type: application/json" -d "$1" "$API/quote"
}

echo ""
echo "── 1. Cada prestación por separado"
QA=$(q "{\"serviceSlug\":\"$A\",\"lengthTier\":\"medio\"}")
QB=$(q "{\"serviceSlug\":\"$B\",\"lengthTier\":\"medio\"}")
PA=$(echo "$QA" | jqf "['data']['estimatedMinAmount']"); DA=$(echo "$QA" | jqf "['data']['durationShownMin']")
PB=$(echo "$QB" | jqf "['data']['estimatedMinAmount']"); DB=$(echo "$QB" | jqf "['data']['durationShownMin']")
ok "la forma singular sigue cotizando ($A: \$$PA / ${DA}min)" \
   "$([ -n "$PA" ] && [ -n "$PB" ] && echo 1 || echo 0)" "$QA"

echo ""
echo "── 2. Las dos juntas: precio y duración son la suma"
QC=$(q "{\"services\":[{\"serviceSlug\":\"$A\",\"lengthTier\":\"medio\"},{\"serviceSlug\":\"$B\",\"lengthTier\":\"medio\"}]}")
PC=$(echo "$QC" | jqf "['data']['estimatedMinAmount']"); DC=$(echo "$QC" | jqf "['data']['durationShownMin']")
MAINS=$(echo "$QC" | python3 -c "import sys,json;print(len([i for i in json.load(sys.stdin)['data']['items'] if i['role']=='main']))" 2>/dev/null)
ok "el precio suma ($PA + $PB = $PC)" "$([ "$PC" = "$((PA+PB))" ] && echo 1 || echo 0)" "$PC"
ok "la duración suma ($DA + $DB = $DC)" "$([ "$DC" = "$((DA+DB))" ] && echo 1 || echo 0)" "$DC"
ok "quedan dos prestaciones principales" "$([ "$MAINS" = "2" ] && echo 1 || echo 0)" "$MAINS"

# El setup es el MÁXIMO, no la suma: es preparación entre clientas.
BC=$(echo "$QC" | jqf "['data']['blockingMin']")
SETUP=$((BC-DC))
SA=$(echo "$QA" | python3 -c "import sys,json;d=json.load(sys.stdin)['data'];print(d['blockingMin']-d['durationShownMin'])" 2>/dev/null)
SB=$(echo "$QB" | python3 -c "import sys,json;d=json.load(sys.stdin)['data'];print(d['blockingMin']-d['durationShownMin'])" 2>/dev/null)
MAXS=$([ "$SA" -ge "$SB" ] && echo "$SA" || echo "$SB")
ok "el setup es el máximo y no la suma ($SETUP, no $((SA+SB)))" \
   "$([ "$SETUP" = "$MAXS" ] && echo 1 || echo 0)" "$SETUP vs $MAXS"

echo ""
echo "── 3. Mezclar áreas se rechaza por su nombre"
if [ -n "$OTRA" ]; then
  MIX=$(curl -s -m 15 -o /tmp/mix.json -w '%{http_code}' -X POST -H "content-type: application/json" \
    -d "{\"services\":[{\"serviceSlug\":\"$A\",\"lengthTier\":\"medio\"},{\"serviceSlug\":\"$OTRA\"}]}" "$API/quote")
  MSG=$(cat /tmp/mix.json | jqf "['error']['message']")
  ok "no cotiza un turno que ocuparía dos áreas (HTTP $MIX)" \
     "$([ "$MIX" = "422" ] && echo 1 || echo 0)" "$MIX $MSG"
else
  echo "  (sin servicio cotizable de otra área: se omite)"
fi

echo ""
echo "── 4. La disponibilidad pide el bloque COMPLETO"
DAY=$(date -u -d "+6 days" +%Y-%m-%d)
LAST1=$(curl -s -m 20 "$API/availability?service=$A&length=medio&from=${DAY}T00:00:00Z&days=1" \
  | python3 -c "import sys,json;d=json.load(sys.stdin)['data']['days'];t=d[0]['times'] if d else [];print(t[-1] if t else '')" 2>/dev/null)
LAST2=$(curl -s -m 20 "$API/availability?service=$A,$B&length=medio&from=${DAY}T00:00:00Z&days=1" \
  | python3 -c "import sys,json;d=json.load(sys.stdin)['data']['days'];t=d[0]['times'] if d else [];print(t[-1] if t else '')" 2>/dev/null)
ok "el último horario del combo es más temprano que el del servicio solo ($LAST2 < $LAST1)" \
   "$([ -n "$LAST1" ] && [ -n "$LAST2" ] && [ "$LAST2" \< "$LAST1" ] && echo 1 || echo 0)" "$LAST1 / $LAST2"

echo ""
echo "── 5. El turno se crea y guarda las dos prestaciones"
SLOT=${LAST2:-11:00}
RES=$(curl -s -m 20 -X POST -H "$H" -H "content-type: application/json" \
  -d "{\"services\":[{\"serviceSlug\":\"$A\",\"lengthTier\":\"medio\"},{\"serviceSlug\":\"$B\",\"lengthTier\":\"medio\"}],\"startsAt\":\"${DAY}T13:00:00.000Z\",\"customer\":{\"firstName\":\"Combo\",\"phone\":\"3425559777\"},\"source\":\"whatsapp\"}" \
  "$API/admin/bookings")
BID=$(echo "$RES" | jqf "['data']['id']")
ok "se crea el turno con dos prestaciones" "$([ -n "$BID" ] && echo 1 || echo 0)" "$(echo "$RES" | head -c 200)"

if [ -n "$BID" ]; then
  N=$(psql_run "select count(*) from public.booking_items where booking_id='$BID' and role='main'")
  TOT=$(psql_run "select price_estimated_min from public.bookings where id='$BID'")
  DUR=$(psql_run "select shown_duration_min from public.bookings where id='$BID'")
  ok "quedaron dos ítems principales guardados" "$([ "$N" = "2" ] && echo 1 || echo 0)" "$N"
  ok "el precio guardado es la suma ($TOT)" "$([ "$TOT" = "$PC" ] && echo 1 || echo 0)" "$TOT vs $PC"
  ok "la duración guardada es la suma ($DUR)" "$([ "$DUR" = "$DC" ] && echo 1 || echo 0)" "$DUR vs $DC"
fi

cleanup
echo ""
if [ "$FAIL" = "0" ]; then
  echo "=== COMBO OK ==="
else
  echo "=== COMBO CON $FAIL FALLA(S) ==="
  exit 1
fi
