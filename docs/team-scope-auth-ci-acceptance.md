# Team scope: prepared ephemeral Auth acceptance

Source-only preparation. No real Auth/DB run was performed for this script in the
current restricted workspace. Offline guard/contract tests are not acceptance evidence.
The existing PostgreSQL single-process evidence does not substitute for PostgREST,
real password login or concurrent sessions.

## Order and commands

1. Start a fresh disposable local Supabase runner. Verify endpoints from its status,
   mask generated keys/passwords before exporting environment. No repository secrets,
   production environment, hosted API, dot-env files or remote connection fallback.
2. Complete the SQL bootstrap/guard/RLS/concurrency runner **before Auth creation**.
   Draft and SQL fixtures require `auth.users` empty. Preserve the unique synthetic
   `site-owner@example.invalid` baseline; SQL runner reloads PostgREST schema.
3. Run `bun run scripts/acceptance-team-scope-local.ts` with:
   - `LOCAL_TEAM_SCOPE_ACCEPTANCE=ephemeral-clean-room`
   - `SUPABASE_LOCAL_API_URL`, `SUPABASE_LOCAL_ANON_KEY`, `SUPABASE_LOCAL_SERVICE_ROLE_KEY`
   - `PGHOST`, `PGPORT`, `PGDATABASE=postgres`, `PGUSER=postgres`, `PGPASSWORD`
4. Stop and discard the local stack in an `always()` workflow step, including failure.

API must be explicit HTTP localhost/127.0.0.1 with a port. Database must use the
same allowed host class, explicit port and database/user postgres. Credentials are
passed only through environment, never command-line arguments. This lexical check
is not proof against an operator deliberately tunnelling a remote service. CI must
supply these endpoints exclusively from its own newly created stack.

The script waits for scoped RPC schema visibility with a bounded readiness probe.
No arbitrary delay is treated as successful readiness. SDK transport rejects all
other origins and redirects. Credentials/tokens remain in memory; only static failure
labels and the final success statement are printed.

## Prepared coverage

- Real Auth users A/B/global/external, password success/failure, invalid/absent JWT,
  external denial and untrusted user-metadata unable to grant membership.
- Actual Hono authorization + PostgREST repository filters: own/foreign/unassigned,
  summary, context, no contact/bearer token/money fields; explicit global/no-finance.
- Assigned users have deliberately broad modular permissions but cannot reach global
  or legacy financial routes. Global without Finance also cannot mutate money.
- Input tampering, real start/finish and repeat equality, exactly one audit event per
  transition, direct anon/authenticated table and RPC denial.
- Current-request downgrade, reassignment, scope reduction with next200 changing
  authorization fingerprint, and membership deactivation with the same JWT.
- Financial booking snapshots, empty payments and existing 24-hour rule unchanged.
  No real payments or providers are configured or invoked.

## Cleanup

The attention table intentionally grants no DELETE to service_role. Cleanup uses
local `psql` as the disposable database administrator, without changing grants.
It deletes only run UUIDs matched to the generated customer/email/role markers,
inside one transaction, and asserts fixture removal. Auth cleanup targets only
IDs returned by creation or exact generated emails (also covers a lost creation
response). Cleanup errors fail the run; success is printed only after cleanup.
Never persist logs containing raw SDK errors, HTTP bodies, tokens, passwords or DB dumps.

## Legacy clean-room acceptance

`acceptance-staff-password-local.ts` keeps its original `LOCAL_AUTH_ACCEPTANCE`
opt-in and API keys. A non-owner without an explicit scope now correctly receives403
for global role reads/writes even with usuarios:full. The script observes downgraded
permissions through /me rather than falsely claiming that assigned users can manage
roles. Effective full→view attention denial belongs to the new scoped acceptance.
Provider logout is still observed, not claimed to revoke an existing JWT instantly.
