#!/usr/bin/env bash
#
# ¿El cortafuegos de permisos frena de verdad?
#
# La tabla de rutas y su prueba de enumeración viven en TypeScript y no
# tocan un servidor. Esto arranca el Worker de verdad contra la base de
# verdad y pide las rutas con el token de alguien de mostrador. Si alguna
# contesta 200, el sistema de permisos no existe por más prolija que sea
# la tabla.
#
#   bash scripts/local-stack.sh up
#   bash scripts/e2e-permisos.sh
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

DB=${SOLMAI_LOCAL_DB:-solmai_local}
PORT=${SOLMAI_API_PORT:-8788}
API="http://127.0.0.1:$PORT/api/v1/admin"

fallas=0
ok() { printf '  \033[32mPASS\033[0m  %s\n' "$1"; }
falla() { printf '  \033[31mFALLA\033[0m %s\n' "$1"; fallas=$((fallas + 1)); }

# --- gente para la prueba -------------------------------------------------
su postgres -c "psql -v ON_ERROR_STOP=1 -q -d $DB" <<'SQL'
insert into public.staff_members (slug, display_name, email, role, is_active)
values ('sol-prueba','Sol','sol@solmai.ar','owner',true),
       ('ana-prueba','Ana','ana@solmai.ar','mostrador',true)
on conflict (slug) do update
  set role = excluded.role, is_active = true, deleted_at = null;

-- La corrida cambia permisos sobre la marcha, así que primero se vuelve
-- a dejar `mostrador` como lo dejó la migración. Sin esto, la segunda
-- corrida arranca desde donde terminó la primera y miente.
update public.role_permissions
   set level = case when module in ('calendario','clientas') then 'full' else 'none' end
 where role_slug = 'mostrador';
SQL

TOKEN_SOL=$(bash scripts/local-stack.sh token sol@solmai.ar)
TOKEN_ANA=$(bash scripts/local-stack.sh token ana@solmai.ar)

# --- el Worker ------------------------------------------------------------
# Tiene que estar levantado ANTES de correr esto:
#
#   eval "$(bash scripts/local-stack.sh env)"
#   bun run build
#   bunx wrangler dev --config dist/server/wrangler.json --port 8788 --local
#
# Arrancarlo desde acá adentro hacía que la corrida muriera sin imprimir
# una sola línea, que es la peor manera de fallar: parece que pasó.
if ! curl -fsS --max-time 5 "http://127.0.0.1:$PORT/api/v1/health" >/dev/null 2>&1; then
  echo "No hay un Worker escuchando en :$PORT. Levantalo primero (ver arriba)." >&2
  exit 1
fi

codigo() { # codigo <token> <método> <ruta> [cuerpo]
  local token=$1 metodo=$2 ruta=$3 cuerpo=${4:-}
  if [ -n "$cuerpo" ]; then
    curl -s -o /dev/null -w '%{http_code}' -X "$metodo" "$API$ruta" \
      -H "authorization: Bearer $token" -H 'content-type: application/json' -d "$cuerpo"
  else
    curl -s -o /dev/null -w '%{http_code}' -X "$metodo" "$API$ruta" \
      -H "authorization: Bearer $token"
  fi
}

espera() { # espera <descripción> <esperado> <token> <método> <ruta> [cuerpo]
  local desc=$1 esperado=$2; shift 2
  local got; got=$(codigo "$@")
  if [ "$got" = "$esperado" ]; then ok "$desc"; else falla "$desc (esperaba $esperado, dio $got)"; fi
}

echo ""
echo "Quien atiende el mostrador"
espera "entra a la agenda"                  200 "$TOKEN_ANA" GET  "/agenda?date=2026-09-15"
espera "ve las fichas de las clientas"      200 "$TOKEN_ANA" GET  "/customers"
espera "ve las señas por devolver"          200 "$TOKEN_ANA" GET  "/refunds-pending"
espera "NO ve la caja del día"              403 "$TOKEN_ANA" GET  "/cash-register?date=2026-09-15"
espera "NO ve el resumen de plata"          403 "$TOKEN_ANA" GET  "/dashboard?from=2026-09-01&to=2026-09-30"
espera "NO ve la conciliación"              403 "$TOKEN_ANA" GET  "/reconciliation?from=2026-09-01&to=2026-09-30"
espera "NO ve el catálogo de servicios"     403 "$TOKEN_ANA" GET  "/salon/services"
espera "NO ve los productos"                403 "$TOKEN_ANA" GET  "/salon/products"
espera "NO ve quién tiene acceso"           403 "$TOKEN_ANA" GET  "/staff"
espera "NO ve el registro de cambios"       403 "$TOKEN_ANA" GET  "/audit"
espera "NO ve los roles"                    403 "$TOKEN_ANA" GET  "/roles"
espera "NO toca los horarios"               403 "$TOKEN_ANA" PATCH "/business-hours/1" '{"opens_at":"08:00"}'
espera "NO toca la configuración"           403 "$TOKEN_ANA" PATCH "/settings/deposit_percent" '{"value":"50"}'
espera "NO reparte permisos"                403 "$TOKEN_ANA" POST "/roles/mostrador/permission" '{"module":"finanzas","level":"full"}'

echo ""
echo "La administradora"
espera "ve la caja del día"                 200 "$TOKEN_SOL" GET "/cash-register?date=2026-09-15"
espera "ve el resumen de plata"             200 "$TOKEN_SOL" GET "/dashboard?from=2026-09-01&to=2026-09-30"
espera "ve quién tiene acceso"              200 "$TOKEN_SOL" GET "/staff"
espera "ve el registro de cambios"          200 "$TOKEN_SOL" GET "/audit"
espera "ve los roles"                       200 "$TOKEN_SOL" GET "/roles"
espera "entra a la agenda"                  200 "$TOKEN_SOL" GET "/agenda?date=2026-09-15"

echo ""
echo "Sin token, o con uno que no es de nadie"
espera "sin token no se entra"              401 ""           GET "/agenda?date=2026-09-15"
espera "un email desconocido no entra"      403 "$(bash scripts/local-stack.sh token nadie@ejemplo.com)" GET "/agenda?date=2026-09-15"

# LOS DOS FINALES MALOS NO SON EL MISMO, Y LA PANTALLA LOS TRATA DISTINTO.
#
# 401 es «no sé quién sos»: el token venció o es falso, y lo que
# corresponde es volver a entrar. 403 es «sé quién sos y no te alcanza»,
# donde volver a entrar no cambia nada. Mientras los dos salían por 403,
# a quien se le vencía la sesión la pantalla le decía que pidiera
# permisos, que es el consejo opuesto al que necesitaba.
espera "un token inválido pide entrar, no permisos" 401 "no-es-un-token" GET "/agenda?date=2026-09-15"
espera "y uno bien formado pero falso, igual"       401 "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmYWxzbyJ9.firma-que-no-es" GET "/agenda?date=2026-09-15"

# --- el permiso se le saca en caliente ------------------------------------
echo ""
echo "Sol le da Finanzas a Ana y se lo saca"
su postgres -c "psql -v ON_ERROR_STOP=1 -q -d $DB -c \"update public.role_permissions set level='view' where role_slug='mostrador' and module='finanzas'\""
espera "con Finanzas para mirar, ve la caja"     200 "$TOKEN_ANA" GET "/cash-register?date=2026-09-15"
su postgres -c "psql -v ON_ERROR_STOP=1 -q -d $DB -c \"update public.role_permissions set level='none' where role_slug='mostrador' and module='finanzas'\""
espera "se lo sacan y deja de verla en el acto"  403 "$TOKEN_ANA" GET "/cash-register?date=2026-09-15"

echo ""
if [ "$fallas" -gt 0 ]; then
  echo "$fallas en rojo"
  exit 1
fi
echo "todo en verde"
