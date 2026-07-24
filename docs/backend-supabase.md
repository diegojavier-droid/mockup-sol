# Backend Supabase clients (Fase 1 · Bloque 2)

Este documento describe cómo se usan los clientes de Supabase **exclusivamente
en backend** (`server/`) en Sol Mai Peluquería.

> Regla dura: el frontend (`src/`) **no** importa Supabase server-only bajo
> ninguna circunstancia. Toda interacción del navegador con datos reales
> pasa por endpoints HTTP del backend (`/api/v1/...`).

## 1. Archivos

| Archivo | Uso |
| --- | --- |
| `server/src/lib/supabase/adminClient.ts` | Cliente con **SERVICE_ROLE**. Bypass total de RLS. |
| `server/src/lib/supabase/serverClient.ts` | Cliente con **PUBLISHABLE_KEY** desde backend para consultas que respetan RLS y futura validación de JWT. |
| `server/src/lib/supabase/index.ts` | Barrel controlado de exports. Sólo backend. |

Ninguno instancia clientes al importarse — cada helper es una factory
(`createSupabaseAdminClient(env)`, `createSupabaseAnonClient(env, opts)`)
que recibe `ServerEnv` ya validado por `server/src/config/env.ts`.

## 2. Diferencia entre `publishable` y `service_role`

- **`SUPABASE_PUBLISHABLE_KEY`** — clave pública de Supabase. Respeta RLS.
  Vive únicamente en backend en el estado actual del producto para lecturas del
  catálogo "como anon" y para preparar validación de JWT interna (staff/owner)
  en fases futuras.
- **`SUPABASE_SERVICE_ROLE_KEY`** — clave de administración. **Bypass total
  de RLS.** Es un secreto duro: nunca sale del backend, nunca se loguea,
  nunca se devuelve en una respuesta HTTP.

## 3. Quién puede importar `createSupabaseAdminClient`

✅ **Permitido**
- `server/src/http/routes/**`
- `server/src/services/**` (cuando existan)
- `server/src/jobs/**` (cuando existan)

❌ **Prohibido**
- Cualquier archivo bajo `src/**`
- `src/integrations/**`
- Cualquier módulo compartido que termine en un bundle de navegador
- Cualquier barrel/`index.ts` accesible desde `src/`

El workflow `.github/workflows/backend-scaffold.yml` incluye un guard que
falla si aparece un `from '.../server/...'` en `src/`.

## 4. Prohibición de `VITE_`

- `SUPABASE_SERVICE_ROLE_KEY` **jamás** se define con prefijo `VITE_`.
- Ninguna variable pública de Vite con nombres de tipo service, secret,
  token, password o key puede existir en el repo salvo claves explícitamente
  públicas/publishable permitidas por el guard de CI.
- `server/src/config/publicEnv.ts` mantiene la lista blanca de lo que
  puede llegar al navegador. `SUPABASE_SERVICE_ROLE_KEY` **nunca** entra
  ahí.

## 5. Sin side effects al importar

Los módulos no instancian clientes en tiempo de import: si alguien
importara por error `adminClient.ts` desde código frontend, no se
construiría un cliente ni se leerían secretos — pero el guard de CI
igualmente romperá el build para no depender de esa suerte.

## 6. Relación con fases futuras

Este bloque habilita infraestructura para:

- **Catálogo read-only**: endpoints backend contra PostgreSQL/Supabase real.
- **Auth interna staff/owner**: validación de JWT usando
  `createSupabaseAnonClient(env, { accessToken })` cuando se implemente el
  flujo real de autenticación.
- **Reservas reales**: escrituras transaccionales vía `adminClient`
  detrás de endpoints con validación Zod y reglas de negocio.
- **Webhooks (Mercado Pago, notificaciones)**: verificación de firma +
  `adminClient` para persistir estado.

Auth, reservas, pagos y notificaciones siguen fuera de este bloque.

## 7. Portabilidad

La infraestructura de Supabase debe funcionar con un proyecto Supabase creado
y administrado directamente por Sol Mai, sin depender de Lovable Cloud.
`supabase/migrations/` es la fuente canónica del schema y el workflow
`Database clean-room CI` prueba que una base vacía puede reconstruirse desde
GitHub y re-ejecutar el bootstrap sin modificar los conteos esperados.

## 8. Checklist de seguridad

- [x] `SUPABASE_SERVICE_ROLE_KEY` sólo referenciado en `server/`.
- [x] Sin variables `VITE_` sensibles.
- [x] Sin instanciación en top-level.
- [x] `publicEnv.ts` sin secretos.
- [x] Guard CI: `src/` no importa `server/`.
- [x] Guard CI: sin variables Vite públicas sensibles.
- [x] Schema reproducible desde cero mediante clean-room CI.
