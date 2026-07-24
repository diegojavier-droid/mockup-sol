# Backend environment contract (Phase 1)

The Sol Mai backend under `server/` is the trust boundary. All secrets live
here — the frontend under `src/` must never read them.

## Golden rules

- **No `VITE_` prefix for anything sensitive.** Any variable prefixed with
  `VITE_` is inlined into the browser bundle. Never use `VITE_` for secret
  keys, tokens, passwords, webhook secrets or administration credentials.
- **Frontend must not import from `server/`.** Enforced by convention and CI.
- **Strict validation only runs at backend startup** (`server/src/index.ts`
  → `loadServerEnv()`), not during the Vite frontend build.
- Real values belong in the hosting platform/GitHub secret store, never in the
  repository.

## Required to boot the backend

| Variable                       | Purpose |
| ------------------------------ | ------- |
| `NODE_ENV`                     | `development` \| `test` \| `production` |
| `APP_ENV`                      | `local` \| `staging` \| `production` |
| `API_BASE_URL`                 | Public URL of this API |
| `PUBLIC_WEB_BASE_URL`          | Public URL of the web frontend |
| `SUPABASE_URL`                 | Supabase project API URL |
| `SUPABASE_PUBLISHABLE_KEY`     | Current Supabase publishable key (`sb_publishable_*`). Respects RLS. |
| `SUPABASE_SECRET_KEY`          | Current Supabase secret/admin key (`sb_secret_*`). Hard secret; server-only. |
| `INTERNAL_AUTH_JWT_AUDIENCE`   | Expected `aud` claim for internal JWTs |
| `INTERNAL_AUTH_ALLOWED_EMAILS` | CSV allow-list of staff/owner emails |

### Local Supabase compatibility

The Supabase local CLI currently exposes a legacy `SERVICE_ROLE_KEY`. The
backend accepts `SUPABASE_SERVICE_ROLE_KEY` only as a compatibility alias when
`SUPABASE_SECRET_KEY` is absent, so clean-room/local testing stays
reproducible. New owned cloud projects must configure `SUPABASE_SECRET_KEY`.

## Public-safe subset

Only these fields may be surfaced to the browser (via a future
`/api/v1/public-config` endpoint):

- `APP_ENV`
- `API_BASE_URL`
- `PUBLIC_WEB_BASE_URL`

See `server/src/config/publicEnv.ts`.

`SUPABASE_PUBLISHABLE_KEY` is technically public by design, but the current Sol
Mai architecture intentionally keeps all real catalog access behind our own
backend API. Do not add it to the public config unless a future architecture
change explicitly requires browser-to-Supabase access.

## Reserved for future phases (optional today)

These are validated as optional. The backend still boots without them:

- `MERCADO_PAGO_ACCESS_TOKEN` — Phase: payments
- `MERCADO_PAGO_WEBHOOK_SECRET` — Phase: payments
- `EMAIL_PROVIDER_API_KEY` — Phase: notifications
- `WHATSAPP_PROVIDER_TOKEN` — Phase: notifications
- `INTERNAL_SIGNING_SECRET` — Phase: internal signed URLs

Do **not** set these to placeholder strings in production — leave them unset
until the feature ships.

## Environments

- **local** — copy `.env.example` to `.env`, fill placeholders, run
  `bun run dev:server`.
- **staging** — set the same variables in the hosting platform's secret
  manager. `APP_ENV=staging`.
- **production** — same, with `APP_ENV=production` and real credentials.

## `/api/v1/health` contract

```json
{
  "status": "ok",
  "service": "sol-mai-api",
  "environment": "local",
  "version": "0.1.0",
  "time": "2026-07-01T12:34:56.789Z"
}
```

- No auth.
- No database access.
- Never exposes secrets, DSNs, or the Supabase project ref.
