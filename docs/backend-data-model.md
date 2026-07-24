# Sol Mai — modelo de datos backend (Fase 1 · Bloque 3.1)

Segunda iteración del catálogo. Corrige los hallazgos de la auditoría
del Bloque 3 original:

1. **RLS relacional real.** Las policies públicas verifican la cadena
   completa de padres vía funciones `SECURITY DEFINER`
   (`catalog_*_visible`), no solo la fila propia. Ocultar una categoría
   ya oculta todos sus servicios, extras, fields, opciones,
   personalization rules y modifiers.
2. **Identidad triple de `extras`.** `id` (uuid interno), `code` (id de
   negocio compatible con el wizard: `ampolla`, `pestanas`, `refuerzo`)
   y `slug` (`{category}-{code}`, único global). La API expone `code`
   como `id` en `ExtraDTO.id`, para que el frontend pueda migrar del
   mock sin renombrar keys.
3. **Personalization normalizada.** `bookingServiceRuleMatrix` se
   materializa en tablas: `service_personalization_rules` (aplicabilidad
   por servicio+field) y `service_personalization_option_modifiers`
   (impactos de duración/precio por opción, con soporte para monto fijo
   y porcentaje).
4. **`business_hours` flexible.** Admite múltiples franjas por weekday,
   con constraint `EXCLUDE USING gist` que impide solapamientos.
5. **`services.tag` abierto.** Se retiró el `CHECK` cerrado — agregar
   un tag editorial nuevo no requiere migración.
6. **`staff_*` restrictivas.** Sin grants ni policies para `anon` ni
   `authenticated` (staff es interno; en Bloque 4 se abrirá con auth).
7. **Migraciones canónicas en `supabase/migrations/`.** Única ruta
   versionada; no hay copia paralela en `db/`. Al conectar Lovable Cloud
   se aplican con `supabase db reset` sin pasos manuales de copia.
8. **Bootstrap idempotente y transaccional.** El archivo `..._bootstrap.sql`
   corre dentro de `BEGIN/COMMIT`; un error deja la DB intacta.

## 1. Arquitectura

```
src/lib/booking-mock/*   +   src/lib/booking-rules.ts
                     │
                     └── bun run db:generate-seed
                              │
                              ▼
       supabase/migrations/20260724120100_catalog_bootstrap.sql
                              │
supabase/migrations/20260724120000_catalog_schema.sql
                              │
                              ▼
                    Postgres / Supabase
              (RLS relacional, anon SELECT solo)
                              │
                              ▼
    server/src/lib/catalog/repository.ts   (anon client)
                              │
                              ▼
    server/src/http/routes/catalog.ts      → /api/v1/catalog/*
```

## 2. Tablas

| Tabla | Función |
| --- | --- |
| `categories` | 4 categorías raíz. |
| `services` | Servicios reservables. |
| `extras` | Adicionales por categoría. Identidad triple (`id`, `code`, `slug`). |
| `personalization_fields` | Preguntas por categoría. |
| `personalization_options` | Opciones por field. |
| `service_personalization_rules` | Aplicabilidad por (service, field): `operational` / `contextual` / `not_applicable`. |
| `service_personalization_option_modifiers` | Modificadores concretos por (service, field, option): `duration_delta_minutes`, `price_fixed_amount`, `price_percentage`. |
| `staff_members` | Interno; sin grants `anon`/`authenticated`. |
| `staff_specialties` | Interno; sin grants `anon`/`authenticated`. |
| `business_hours` | Franjas horarias por weekday; múltiples franjas admitidas; no-solapamiento por `EXCLUDE gist`. |

`service_extras` fue **eliminada** respecto del Bloque 3: no aportaba
semántica y no hay caso de uso vigente. Se reintroducirá cuando exista
una política clara (override vs allow-list).

## 3. RLS efectiva

| Tabla | Regla efectiva (anon SELECT) |
| --- | --- |
| `categories` | Fila publicada. |
| `services` | Fila publicada Y `catalog_category_visible(category_id)`. |
| `extras` | Idem. |
| `personalization_fields` | Idem. |
| `personalization_options` | `is_active` Y `catalog_field_visible(field_id)` (cadena completa hasta categoría). |
| `service_personalization_rules` | `catalog_service_visible` Y `catalog_field_visible`. |
| `service_personalization_option_modifiers` | Idem. |
| `business_hours` | `is_active`. |
| `staff_*` | Sin policies públicas ni `authenticated`. |

Las funciones `catalog_*_visible` son `SECURITY DEFINER` con
`search_path = public` fijo, para evitar recursión de policies y
resolución maliciosa de schema.

## 4. Reglas de personalización

La matriz TypeScript `bookingServiceRuleMatrix` (una fila por servicio ×
N fields) se materializa en dos tablas:

* **`service_personalization_rules`**: una fila por (service, field)
  con `decision ∈ {operational, contextual, not_applicable}`.
* **`service_personalization_option_modifiers`**: solo para decisiones
  `operational`; una fila por (service, field, option) con:
  - `duration_delta_minutes` (>= 0)
  - `price_fixed_amount` (>= 0)  · monto ARS extra fijo
  - `price_percentage` (`numeric(5,2)`, 0..100) · % sobre precio base

El generador emite explícitamente una fila por cada (service, field)
declarado en el mock — cuando un servicio no está en la matriz cae al
default de la categoría (`bookingRules[cat].personalizationModifiers`).
Esto hace el estado auditable directamente en DB sin conocer defaults
del código.

Bootstrap actual: **200 rules · 304 option modifiers · 13 extras · 44
services · 6 business_hours**.

## 5. Bootstrap (idempotente + transaccional)

- Generado por `bun run db:generate-seed` desde el mock + reglas.
- Envuelto en `BEGIN`/`COMMIT`: fallo intermedio → DB sin cambios.
- Cada `INSERT` usa `ON CONFLICT DO UPDATE` sobre la clave estable
  correspondiente (`slug`, `(category_id, slug)`, `(field_id, slug)`,
  `(service_id, field_id)`, `(service_id, field_id, option_id)`).
- `business_hours` usa `DELETE + INSERT` por triple exacta antes de
  insertar, delegando en el `EXCLUDE gist` la validación anti-solape.
- **Renombres**: `slug`/`code` son la clave estable. Cambiar `name` en
  el mock reescribe la fila. Cambiar `slug`/`code` inserta una nueva y
  NO borra la anterior. Reconciliación con delete queda para el panel
  interno (Bloque 4). El bootstrap **nunca** hace `DELETE` implícito de
  filas.
- **Bootstrap ≠ fuente de verdad permanente.** Es solo el semillado
  inicial reproducible desde el mock. La fuente de verdad definitiva
  del catálogo es Postgres administrado por el backend/panel interno.

## 6. Endpoints

Bajo `/api/v1/catalog`. Envelope: `{ data: ... }` / `{ error: { message, status } }`.

| Método | Path | Query | Descripción |
| --- | --- | --- | --- |
| GET | `/categories` | — | Categorías públicas. |
| GET | `/services` | `?category=<slug>` | Servicios públicos. |
| GET | `/services/:slug` | — | Detalle + extras + personalization. |
| GET | `/extras` | `?category=<slug>` | Extras publicados. |
| GET | `/personalization` | `?category=<slug>` | Fields + opciones. |

Contrato `ExtraDTO`:

```ts
{
  id: string;          // = code (compat wizard: "ampolla")
  slug: string;        // = "peluqueria-ampolla" (único global)
  categorySlug: string;
  name: string;
  durationDeltaMinutes: number;
  priceAmount: number;
  currency: string;
}
```

El repository consume el **anon client** — RLS es la barrera de
seguridad; no se usa `service_role` para lecturas públicas.

## 7. Cómo recrear la DB local

Requisitos:
- PostgreSQL >= 14.
- Extensiones `pgcrypto` y `btree_gist` (Supabase las trae listas).
- Roles `anon`, `authenticated`, `service_role` (Supabase los provee;
  en Postgres vanilla créalos manualmente antes de aplicar el schema).

### Opción A · Supabase CLI (al conectar Lovable Cloud)

```bash
cp db/migrations/*.sql supabase/migrations/
supabase db reset
```

### Opción B · psql directo

```bash
export DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres
bun run db:apply
```

### Regenerar el bootstrap

```bash
bun run db:generate-seed
```

## 8. Fuera de scope (Bloque 4+)

- Auth productiva (staff, roles, RLS para authenticated).
- Reservations, holds, payments, Mercado Pago, webhooks.
- Migración del wizard para consumir la API.
- Panel operativo / CRM / client_history.
- Datos reales de staff.
- Reconciliación de bajas / renombres desde el mock.
