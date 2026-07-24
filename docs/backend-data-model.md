# Sol Mai — modelo de datos backend (Fase 1 · Bloque 3)

Este documento describe la primera capa productiva del catálogo de Sol Mai:
schema PostgreSQL reproducible, seed determinista del catálogo actual y
API backend read-only.

Nada de esto reemplaza todavía a los mocks del frontend — coexisten a
propósito para poder auditar la base antes de conectar el wizard.

## 1. Arquitectura

```
src/lib/booking-mock/*     ── (sigue vivo, frontend actual sin cambios)
        │
        └── scripts/generate-catalog-seed.ts
                │
                ▼
        db/migrations/20260724120100_catalog_seed.sql
                │
db/migrations/20260724120000_catalog_schema.sql
                │
                ▼
        Postgres / Supabase (RLS anon read-only + service_role bypass)
                │
                ▼
        server/src/lib/catalog/repository.ts   (anon client, RLS aplica)
                │
                ▼
        server/src/http/routes/catalog.ts      → /api/v1/catalog/*
```

## 2. Tablas

| Tabla | Función |
| --- | --- |
| `categories` | 4 categorías públicas (Peluquería, Maquillaje, Uñas, Depilación). |
| `services` | Servicios reservables con `duration_minutes`, `price_amount`, `tag`. |
| `extras` | Adicionales opcionales; hoy scoped por categoría. |
| `service_extras` | Join m:m para overrides por servicio. Vacía en Bloque 3. |
| `personalization_fields` | Preguntas de personalización por categoría. |
| `personalization_options` | Opciones de cada campo (single/multi/text). |
| `staff_members` | Profesionales. Vacía; usada desde Bloque 4. |
| `staff_specialties` | Mapeo staff ↔ categoría/servicio. Vacía. |
| `business_hours` | Horario comercial (weekday, opens_at, closes_at). Semilla desde el mock. |

Todas las tablas usan:
- PK `uuid` con `gen_random_uuid()`.
- `slug` `text UNIQUE` como identificador estable expuesto por la API.
- `is_public` (visibilidad en API pública) y `is_active` (soft-disable).
- `deleted_at timestamptz` para soft delete.
- `created_at` / `updated_at` con trigger `tg_set_updated_at()`.

### Constraints principales

- `slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'` en todas las tablas con slug.
- `services.duration_minutes > 0`, `price_amount >= 0`, `currency ~ '^[A-Z]{3}$'`.
- `services.tag ∈ {popular, combinado, tratamiento, color, evento}` o `NULL`.
- `personalization_fields.field_type ∈ {single_choice, multi_choice, text}`.
- `staff_specialties`: al menos uno de `category_id` / `service_id`.
- `business_hours`: `closes_at > opens_at`, `weekday ∈ [0..6]`, unique por weekday.

### Índices

- `services (category_id)` para joins.
- Índice parcial `services (category_id, sort_order) WHERE is_public AND is_active AND deleted_at IS NULL` — es la consulta pública dominante.
- `extras (category_id)`.
- `personalization_fields (category_id, sort_order)`, `personalization_options (field_id, sort_order)`.
- `service_extras (extra_id)` para lookups inversos.
- `staff_specialties (staff_id | category_id | service_id)`.

## 3. RLS

Principio: solo `SELECT` público, y solo de filas realmente publicadas.

| Tabla | anon SELECT | authenticated | service_role |
| --- | --- | --- | --- |
| `categories` | `is_public AND is_active AND deleted_at IS NULL` | idem | ALL |
| `services` | idem | idem | ALL |
| `extras` | idem | idem | ALL |
| `service_extras` | `is_active` | idem | ALL |
| `personalization_fields` | idem que servicios | idem | ALL |
| `personalization_options` | `is_active` | idem | ALL |
| `business_hours` | `is_active` | idem | ALL |
| `staff_members` | ❌ sin grant anon | select/insert/update | ALL |
| `staff_specialties` | ❌ sin grant anon | select/insert/update | ALL |

Nada tiene policies de INSERT/UPDATE/DELETE para anon. Escrituras solo
vía `service_role` desde backend (o vía `authenticated` con policies
específicas cuando llegue Bloque 4).

## 4. Estrategia de IDs y slugs

- Categorías y servicios preservan el `id` textual del mock actual como
  `slug` (`peluqueria`, `corte-fem`, `balayage`, …), de modo que el
  frontend puede migrar sin renombrar identificadores.
- Extras usan slug compuesto `{categoria}-{id-original}` (p.ej.
  `peluqueria-ampolla`) porque el mock permite el mismo id en distintas
  categorías (`nailart` vs `nailart-extra`). La API devuelve además
  `categorySlug` para reconstruir el mapping.
- Personalization fields conservan su id original (`largo`, `estilo`,
  …) porque son únicos por categoría — el UNIQUE es
  `(category_id, slug)`.
- Personalization options generan slug desde el label sin acentos
  (`Media melena` → `media-melena`). Se persisten `label` y `value`
  originales.

Mapping documentado en el propio seed (`db/migrations/...seed.sql`) — es
el archivo canónico.

## 5. Seed

Determinista e idempotente:

- Se genera desde el mock con `bun run db:generate-seed`.
- Cada `INSERT` es `ON CONFLICT (slug) DO UPDATE` (o
  `(category_id, slug)` para fields, `(field_id, slug)` para options,
  `(weekday)` para business_hours).
- `deleted_at` se limpia si vuelve a aparecer una fila en el mock — es
  intencional: seed = fuente de verdad reflejada.
- Reaplicar el seed 2 veces produce el mismo estado (verificado por
  construcción).

Datos migrados desde `src/lib/booking-mock/*`:

- 4 categorías (`categories.ts`).
- 44 servicios (`services.ts`): 28 peluquería + 5 maquillaje + 6 uñas + 4 depilación.
- 13 extras (`extras.ts`): 7 peluquería + 3 maquillaje + 3 uñas + 0 depilación.
- 12 personalization_fields con sus options (`personalization.ts`).
- 6 business_hours (`availability.ts`, lun–sáb).

Nada inventado: precios, duraciones y tags son exactamente los del mock.

## 6. Endpoints

Todos bajo `/api/v1/catalog`. Respuesta: `{ "data": ... }`; errores usan
el envelope compartido `{ "error": { message, status } }`.

| Método | Path | Query | Descripción |
| --- | --- | --- | --- |
| GET | `/categories` | — | Categorías públicas ordenadas por `sort_order`. |
| GET | `/services` | `?category=<slug>` opcional | Servicios públicos, filtrables por categoría. |
| GET | `/services/:slug` | — | Detalle: servicio + extras aplicables + personalization. |
| GET | `/extras` | `?category=<slug>` opcional | Extras publicados. |
| GET | `/personalization` | `?category=<slug>` opcional | Campos + opciones. |

Ejemplos de respuestas:

```json
GET /api/v1/catalog/categories
{
  "data": [
    { "slug": "peluqueria", "name": "Peluquería", "tagline": "Corte, color y tratamientos", "emoji": "✂" },
    ...
  ]
}
```

```json
GET /api/v1/catalog/services/balayage
{
  "data": {
    "slug": "balayage",
    "categorySlug": "peluqueria",
    "name": "Balayage",
    "description": "Degradé natural pintado a mano.",
    "durationMinutes": 180,
    "priceAmount": 58000,
    "currency": "ARS",
    "tag": "popular",
    "extras": [ ... ],
    "personalization": [ ... ]
  }
}
```

Validación con Zod: `category` y `:slug` deben matchear
`^[a-z0-9]+(-[a-z0-9]+)*$`. Errores devuelven 400. Servicio inexistente
devuelve 404. Errores DB → 500 vía `errorHandler` compartido.

El route usa **anon client** — RLS es la barrera de seguridad; no se
usa service_role para lecturas públicas.

## 7. Cómo recrear la DB local

Este bloque **no** asume Supabase local instalado. Las migraciones son
SQL puro y aplicables con `psql` o con Supabase CLI.

### Opción A · Supabase CLI

```bash
# Requiere `supabase` CLI + Docker.
mkdir -p supabase/migrations
cp db/migrations/*.sql supabase/migrations/
supabase start           # levanta stack local
supabase db reset        # aplica migraciones + seed en orden por timestamp
```

> Los archivos viven en `db/migrations/` en el repo porque
> `supabase/migrations/` está gestionado por tooling propio del entorno
> de edición. La copia es 1:1.

### Opción B · psql directo

```bash
export DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres
bun run db:apply
```

Aplica schema y seed en orden. Reaplica sin duplicar (idempotente).

### Regenerar seed desde los mocks

```bash
bun run db:generate-seed
```

Reescribe `db/migrations/20260724120100_catalog_seed.sql` con lo que
haya hoy en `src/lib/booking-mock/*`.

## 8. Qué queda fuera de este bloque

- Reservations, holds, payments, Mercado Pago, webhooks.
- Notifications reales, WhatsApp, email.
- Login interno / roles productivos (Bloque 4).
- Disponibilidad productiva, algoritmo de slots, jobs de expiración.
- Migración del wizard público para consumir esta API (Bloque siguiente).
- Panel operativo, CRM, client_history.
- Datos de staff reales.
