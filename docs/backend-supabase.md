# Backend Supabase clients (Fase 1 · Bloque 2)

Este documento describe cómo se usan los clientes de Supabase **exclusivamente
en backend** (`server/`) en Sol Mai Peluquería.

> Regla dura: el frontend (`src/`) **no** importa Supabase server-only bajo
> ninguna circunstancia. Toda interacción del navegador con datos reales
> pasa por endpoints HTTP del backend (`/api/v1/...`).

## 1. Archivos

| Archivo | Uso |
| --- | --- |
| `server/src/lib/supabase/adminClient.ts` | Cliente privilegiado con **SECRET_KEY**. Sólo se construye cuando una operación admin realmente lo necesita. |
| `server/src/lib/supabase/serverClient.ts` | Cliente con **PUBLISHABLE_KEY** desde backend para consultas que respetan RLS y futura validación de JWT. |
| `server/src/lib/supabase/index.ts` | Barrel controlado de exports. Sólo backend. |

Ninguno instancia clientes al importarse — cada helper es una factory
(`createSupabaseAdminClient(env)`, `createSupabaseAnonClient(env, opts)`)
que recibe `ServerEnv` ya validado por `server/src/config/env.ts`.

## 2. Diferencia entre `publishable` y `secret`

- **`SUPABASE_PUBLISHABLE_KEY`** — clave pública de Supabase. Respeta RLS.
  Es suficiente para el catálogo público read-only actual y permanece del lado
  backend por decisión arquitectónica.
- **`SUPABASE_SECRET_KEY`** — clave administrativa server-side de Supabase.
  Debe tratarse como secreto de máximo privilegio. Nunca sale del backend,
  nunca se loguea y nunca se devuelve en una respuesta HTTP. **No es necesaria
  para arrancar el backend actual** porque todavía no existen rutas de escritura
  privilegiada.
- Para el stack local de Supabase, `SUPABASE_SERVICE_ROLE_KEY` se acepta sólo
  como alias de compatibilidad cuando no existe `SUPABASE_SECRET_KEY`.

## 3. Principio de mínimo privilegio

El backend actual sólo monta `/health` y catálogo público read-only. Por eso:

- `SUPABASE_URL` + `SUPABASE_PUBLISHABLE_KEY` son obligatorias;
- `SUPABASE_SECRET_KEY` es opcional;
- `createSupabaseAdminClient()` falla de forma explícita si una futura ruta
  privilegiada intenta usarla sin que el secreto haya sido configurado.

Este diseño evita cargar un secreto administrativo en entornos que todavía no
lo necesitan.

## 4. Quién puede importar `createSupabaseAdminClient`

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

## 5. Prohibición de `VITE_`

- `SUPABASE_SECRET_KEY` **jamás** se define con prefijo `VITE_`.
- Ninguna variable pública de Vite con nombres de tipo service, secret,
  token, password o key puede existir en el repo salvo claves explícitamente
  públicas/publishable permitidas por el guard de CI.
- `server/src/config/publicEnv.ts` mantiene la lista blanca de lo que
  puede llegar al navegador. `SUPABASE_SECRET_KEY` **nunca** entra ahí.

## 6. Sin side effects al importar

Los módulos no instancian clientes en tiempo de import: si alguien
importara por error `adminClient.ts` desde código frontend, no se
construiría un cliente ni se leerían secretos — pero el guard de CI
igualmente romperá el build para no depender de esa suerte.

## 7. Relación con fases futuras

Este bloque habilita infraestructura para:

- **Catálogo read-only**: endpoints backend contra PostgreSQL/Supabase real.
- **Auth interna staff/owner**: validación de JWT usando
  `createSupabaseAnonClient(env, { accessToken })` cuando se implemente el
  flujo real de autenticación.
- **Reservas reales**: escrituras transaccionales vía `adminClient`, momento en
  el que `SUPABASE_SECRET_KEY` sí pasará a ser obligatoria en el entorno
  backend correspondiente.
- **Webhooks (Mercado Pago, notificaciones)**: verificación de firma +
  `adminClient` para persistir estado.

Auth, reservas, pagos y notificaciones siguen fuera de este bloque.

## 8. Portabilidad

La infraestructura de Supabase debe funcionar con un proyecto Supabase creado
y administrado directamente por Sol Mai, sin depender de Lovable Cloud.
`supabase/migrations/` es la fuente canónica del schema y el workflow
`Database clean-room CI` prueba que una base vacía puede reconstruirse desde
GitHub y re-ejecutar el bootstrap sin modificar los conteos esperados.

El workflow manual `Verify owned Supabase` permite comprobar un proyecto remoto
propiedad del usuario usando sólo `SUPABASE_URL` y
`SUPABASE_PUBLISHABLE_KEY`: levanta Hono, prueba el catálogo real y verifica que
`staff_members` siga sin exposición pública.

## 9. Checklist de seguridad

- [x] `SUPABASE_SECRET_KEY` sólo referenciado en backend/configuración server-only.
- [x] Secret admin opcional mientras no existen escrituras privilegiadas.
- [x] Alias legacy `SUPABASE_SERVICE_ROLE_KEY` limitado a compatibilidad local.
- [x] Sin variables `VITE_` sensibles.
- [x] Sin instanciación en top-level.
- [x] `publicEnv.ts` sin secretos.
- [x] Guard CI: `src/` no importa `server/`.
- [x] Guard CI: sin variables Vite públicas sensibles.
- [x] Schema reproducible desde cero mediante clean-room CI.
