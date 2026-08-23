#!/usr/bin/env bash
#
# Local integration stack — PostgreSQL + PostgREST + Supabase URL shim.
#
# Lets the Hono API run against a real database without Docker or the
# Supabase CLI, so migrations, RLS and RPCs can be exercised for real.
# CI still uses the Supabase CLI (see database-clean-room.yml); this is
# the developer-machine equivalent.
#
#   scripts/local-stack.sh up      # rebuild DB from migrations + start
#   scripts/local-stack.sh down    # stop services
#   scripts/local-stack.sh env     # print env for the API process
#
set -euo pipefail

DB=${SOLMAI_LOCAL_DB:-solmai_local}
PGRST_PORT=${SOLMAI_PGRST_PORT:-3010}
SHIM_PORT=${SOLMAI_SHIM_PORT:-54321}
JWT_SECRET=${SOLMAI_JWT_SECRET:-solmai-local-secret-solmai-local-secret-0123456789}
RUN_DIR=${SOLMAI_RUN_DIR:-/tmp/sol-mai-local-stack}
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

mkdir -p "$RUN_DIR"

mint_keys() {
  bun -e '
    const { createHmac } = require("crypto");
    const secret = process.env.JWT_SECRET;
    const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
    const jwt = (role) => {
      const h = b64({ alg: "HS256", typ: "JWT" });
      const p = b64({ role, iss: "local", exp: Math.floor(Date.now() / 1000) + 2592000 });
      return `${h}.${p}.${createHmac("sha256", secret).update(`${h}.${p}`).digest("base64url")}`;
    };
    console.log(JSON.stringify({ anon: jwt("anon"), service: jwt("service_role") }));
  ' > "$RUN_DIR/keys.json"
}

# Matar por patrón no alcanza: un proceso que sobrevive deja el puerto
# tomado y el siguiente arranque falla con "Address in use", que es
# justo el síntoma que este stack debe evitar.
stop_services() {
  # Por nombre exacto: `ss` y `lsof` no están garantizados en todos los
  # entornos, y un proceso que sobrevive deja el puerto tomado — que es
  # el "Address in use" que rompe el arranque siguiente.
  pkill -x postgrest       >/dev/null 2>&1 || true
  pkill -f "[s]him\.ts"    >/dev/null 2>&1 || true
  for _ in 1 2 3 4 5; do
    pgrep -x postgrest >/dev/null 2>&1 || break
    sleep 1
  done
  pkill -9 -x postgrest    >/dev/null 2>&1 || true
  pkill -9 -f "[s]him\.ts" >/dev/null 2>&1 || true
}

reset_db() {
  su postgres -c "psql -Atc \"select pg_terminate_backend(pid) from pg_stat_activity where datname='$DB'\"" >/dev/null 2>&1 || true
  su postgres -c "dropdb --if-exists $DB" >/dev/null
  su postgres -c "createdb $DB"
  su postgres -c "psql -v ON_ERROR_STOP=1 -d $DB" >/dev/null <<'SQL'
do $$ begin
  if not exists (select from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists (select from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
end $$;
grant anon, authenticated, service_role to postgres;
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists btree_gist;
grant usage on schema public to anon, authenticated, service_role;
SQL
  for f in "$REPO_ROOT"/supabase/migrations/*.sql; do
    echo "  applying $(basename "$f")"
    su postgres -c "psql -v ON_ERROR_STOP=1 -q -d $DB -f '$f'"
  done
}

case "${1:-up}" in
  up)
    echo "== resetting $DB from migrations"
    reset_db
    JWT_SECRET="$JWT_SECRET" mint_keys

    cat > "$RUN_DIR/postgrest.conf" <<EOF
db-uri = "postgres://postgres@localhost:5432/$DB"
db-schemas = "public"
db-anon-role = "anon"
jwt-secret = "$JWT_SECRET"
server-port = $PGRST_PORT
EOF

    # Heredoc citado: el shim no se interpola desde bash. Escapar acentos
    # graves acá adentro genera TypeScript inválido, así que los puertos
    # entran por entorno.
    cat > "$RUN_DIR/shim.ts" <<'EOF'
// Maps supabase-js /rest/v1/* onto plain PostgREST, and stands in for
// Supabase Auth on /auth/v1/user so the internal panel can be exercised
// locally. SOLO DESARROLLO: el token de dev es literalmente el email.
const SHIM_PORT = Number(Bun.env.SOLMAI_SHIM_PORT ?? "54321");
const PGRST_PORT = Number(Bun.env.SOLMAI_PGRST_PORT ?? "3010");

Bun.serve({
  port: SHIM_PORT,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/auth/v1/user") {
      // supabase-js valida la forma del JWT antes de llamar, así que el
      // token de dev tiene que ser un JWT de verdad. El email sale del
      // payload; la firma no se verifica: esto es sólo desarrollo.
      const auth = req.headers.get("authorization") ?? "";
      const token = auth.replace(/^Bearer\s+/i, "").trim();
      let email = "";
      let sub = "00000000-0000-4000-8000-000000000001";
      try {
        const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
        email = payload.email ?? "";
        sub = payload.sub ?? sub;
      } catch {
        email = "";
      }
      if (!email.includes("@")) {
        return new Response(JSON.stringify({ error: "invalid token" }), {
          status: 401,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response(
        JSON.stringify({ id: sub, aud: "authenticated", role: "authenticated", email, user_metadata: {} }),
        { headers: { "content-type": "application/json" } },
      );
    }

    if (!url.pathname.startsWith("/rest/v1")) return new Response("not implemented", { status: 501 });
    const target =
      "http://127.0.0.1:" + PGRST_PORT + url.pathname.replace("/rest/v1", "") + url.search;
    const headers = new Headers(req.headers);
    const apikey = headers.get("apikey");
    if (apikey && !headers.get("authorization")) headers.set("authorization", "Bearer " + apikey);
    return fetch(target, { method: req.method, headers, body: req.body, redirect: "manual" });
  },
});
EOF

    if ! command -v postgrest >/dev/null 2>&1; then
      echo "postgrest no está instalado: sin él el stack arranca a medias y" >&2
      echo "los errores aparecen recién al primer request del API." >&2
      echo "Instalalo desde https://github.com/PostgREST/postgrest/releases" >&2
      exit 1
    fi

    stop_services
    (postgrest "$RUN_DIR/postgrest.conf" > "$RUN_DIR/postgrest.log" 2>&1 &)
    (SOLMAI_SHIM_PORT="$SHIM_PORT" SOLMAI_PGRST_PORT="$PGRST_PORT" \
       bun run "$RUN_DIR/shim.ts" > "$RUN_DIR/shim.log" 2>&1 &)
    for _ in $(seq 1 20); do
      if curl -fsS "http://127.0.0.1:$SHIM_PORT/rest/v1/categories?select=slug&limit=1" \
           -H "apikey: $(bun -e 'console.log(JSON.parse(await Bun.file(process.env.RUN_DIR + "/keys.json").text()).anon)' RUN_DIR="$RUN_DIR" 2>/dev/null)" \
           >/dev/null 2>&1; then
        break
      fi
      sleep 1
    done

    if ! curl -fsS "http://127.0.0.1:$SHIM_PORT/rest/v1/" >/dev/null 2>&1; then
      echo "el shim no responde en :$SHIM_PORT — revisá $RUN_DIR/shim.log y $RUN_DIR/postgrest.log" >&2
      tail -5 "$RUN_DIR/shim.log" "$RUN_DIR/postgrest.log" 2>/dev/null >&2 || true
      exit 1
    fi

    echo "== stack up · PostgREST :$PGRST_PORT · shim :$SHIM_PORT"
    echo "   eval \"\$(scripts/local-stack.sh env)\" to configure the API"
    ;;

  down)
    stop_services
    echo "== stack down"
    ;;

  token)
    # scripts/local-stack.sh token <email>  → JWT de desarrollo
    JWT_SECRET="$JWT_SECRET" bun -e '
      const { createHmac } = require("crypto");
      const secret = process.env.JWT_SECRET;
      const email = process.argv[1];
      const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
      const h = b64({ alg: "HS256", typ: "JWT" });
      const p = b64({ sub: "00000000-0000-4000-8000-000000000001", email, role: "authenticated", exp: Math.floor(Date.now()/1000)+86400 });
      console.log(`${h}.${p}.${createHmac("sha256", secret).update(`${h}.${p}`).digest("base64url")}`);
    ' "${2:-sol@solmai.ar}"
    ;;

  env)
    ANON=$(bun -e "console.log(require('$RUN_DIR/keys.json').anon)")
    SERVICE=$(bun -e "console.log(require('$RUN_DIR/keys.json').service)")
    cat <<EOF
export NODE_ENV=test
export APP_ENV=local
export API_BASE_URL=http://localhost:3001
export PUBLIC_WEB_BASE_URL=http://localhost:5173
export SUPABASE_URL=http://127.0.0.1:$SHIM_PORT
export SUPABASE_PUBLISHABLE_KEY=$ANON
export SUPABASE_SECRET_KEY=$SERVICE
export INTERNAL_AUTH_JWT_AUDIENCE=sol-mai-internal
export INTERNAL_AUTH_ALLOWED_EMAILS=dev@sol-mai.test
export PORT=3001
EOF
    ;;

  *)
    echo "usage: scripts/local-stack.sh [up|down|env]" >&2
    exit 1
    ;;
esac
