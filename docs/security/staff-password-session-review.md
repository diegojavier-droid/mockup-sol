# Password staff access: offline review and release prerequisites

Scope: original application, not the private Site. No remote provider settings, accounts, credentials, database schema, RLS or bootstrap
policy were changed. Admin responses now carry no-store, including errors. Email
settings checks cover staging and production, with a 30-second maximum cache and
fail-closed refresh; only explicit APP_ENV=local skips that deployment check.

## Existing contract

Password and magic-link sign-in both yield Supabase provider `email`; there is no
new `password` provider to add. The environment schema already accepts `email`.
Declaring it locally does not enable sign-in remotely. `getUser(token)` remains
mandatory, followed by verified email/provider checks and `resolve_staff_session`.
Production also checks provider settings: auto-confirm plus open signups fails
closed. An authenticated customer is not staff. Browser role fields and mutable
user metadata are not permission sources.

Every request resolves staff membership and permissions anew. SQL requires active,
non-deleted staff and reads the role-permission mapping in that query. Revocation
therefore takes effect on the next request (not retroactively on in-flight work).
The existing bootstrap RPC remains the authority for first-owner provisioning;
no fallback owner is added. Provider settings are cached at most 30 seconds per worker, unlike staff
permissions; a policy change can take that long to be observed. Membership currently
binds by verified email, not Auth user UUID. A new verified subject with the same
email can inherit that membership; explicit auth_user_id binding needs a separately
reviewed migration and onboarding policy.

## Logout limitation and proposed minimal follow-up (not implemented)

Clearing browser state and provider logout alone do not guarantee an already-issued
access JWT becomes unusable immediately. Do not claim immediate server revocation
until this is independently tested with the deployed provider.

Proposed migration: a narrowly scoped service-role-only RPC accepting authenticated
user ID and session UUID, returning whether an unexpired matching `auth.sessions`
row exists. Use a locked search_path, qualify objects, revoke PUBLIC/anon/authenticated
execution and never expose session rows. Confirm hosted Supabase session retention,
logout deletion and not_after semantics before finalizing SQL.

Backend order: first `getUser(token)` verifies identity with the provider; only then
extract and validate the token's `session_id` and subject binding, call the RPC,
require an exact true result, and proceed to the existing staff resolver. Missing
session IDs fail closed; legacy sessions must sign in again. Never use an unverified
JWT's role or email. A failed check is not permission to fall back to the old path.
A session checker prevents new requests after revocation, not already-running ones.
If provider logout does not reliably delete the session row, use an application
revocation ledger and authenticated logout endpoint instead; that is a separate
migration/design decision, not an assertion about current behavior.

Required validation before release: local database clean-room grants/RLS checks;
real login/logout and replay of the old access token; refresh-token invalidation;
local/global logout scope; cross-user/session mismatch; malformed/missing session;
provider/RPC outage fail-closed; staff deactivation and permission changes. No DDL
or deployment is authorized by this proposal alone.

## Evidence boundaries

`staffAuth.integration.test.ts` exercises the real admin Hono router, real Supabase
client protocol, identity verification, staff middleware and permission middleware
with an in-memory fetch stub. No environment files or network are used. It covers
401/403 separation, password-provider acceptance, current permissions, client role
injection, and bootstrap re-resolution. It does **not** prove actual SQL filtering,
RLS, hosted provider behavior, credential delivery or immediate logout revocation.

The proposed SQL is stored in `staff-session-rpc.proposed.sql`, outside the migration
runner. It is not installed or called by this branch. Review and clean-room tests
are required before promoting it to a migration and wiring the middleware.

## Local real-Auth acceptance CI

`database-clean-room.yml` now runs `scripts/acceptance-staff-password-local.ts`
after starting and resetting its disposable Supabase stack. The script accepts only
explicit HTTP localhost/127.0.0.1 origins with ports, rejects redirects/off-origin
transport, and requires `LOCAL_AUTH_ACCEPTANCE=ephemeral-clean-room`. It reads only
SUPABASE_LOCAL_* keys supplied by that job; no dotenv or remote fallbacks.

Two fictional accounts have random in-memory passwords. Real password login and
failure, real admin Hono middleware/role RPCs, anonymous/invalid-token rejection,
non-staff rejection, permission downgrade and membership deactivation are exercised.
The same access JWT is reused after both permission changes. Only IDs created by
the test are removed in checked cleanup, including Auth accounts. No tokens,
passwords or raw SDK errors are printed. The job's always-run Supabase stop remains.

Logout reports whether the old JWT receives 200 or 401 under the running local Auth
version. Neither outcome claims session revocation is implemented in the app.
The proposed session RPC is deliberately NOT installed in this first acceptance
step, and no remote credentials, users or security settings are changed. The CI
result, not this source change, supplies real Auth/DB evidence.
