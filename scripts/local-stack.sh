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

    cat > "$RUN_DIR/shim.ts" <<EOF
// Maps supabase-js /rest/v1/* onto plain PostgREST.
Bun.serve({
  port: $SHIM_PORT,
  async fetch(req) {
    const url = new URL(req.url);
    if (!url.pathname.startsWith("/rest/v1")) return new Response("not implemented", { status: 501 });
    const target = "http://127.0.0.1:$PGRST_PORT" + url.pathname.replace("/rest/v1", "") + url.search;
    const headers = new Headers(req.headers);
    const apikey = headers.get("apikey");
    if (apikey && !headers.get("authorization")) headers.set("authorization", \\\`Bearer \\\${apikey}\\\`);
    return fetch(target, { method: req.method, headers, body: req.body, redirect: "manual" });
  },
});
EOF

    pkill -f "[p]ostgrest $RUN_DIR" >/dev/null 2>&1 || true
    pkill -f "[s]him.ts" >/dev/null 2>&1 || true
    (postgrest "$RUN_DIR/postgrest.conf" > "$RUN_DIR/postgrest.log" 2>&1 &)
    (bun run "$RUN_DIR/shim.ts" > "$RUN_DIR/shim.log" 2>&1 &)
    sleep 2
    echo "== stack up · PostgREST :$PGRST_PORT · shim :$SHIM_PORT"
    echo "   eval \"\$(scripts/local-stack.sh env)\" to configure the API"
    ;;

  down)
    pkill -f "[p]ostgrest $RUN_DIR" >/dev/null 2>&1 || true
    pkill -f "[s]him.ts" >/dev/null 2>&1 || true
    echo "== stack down"
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
