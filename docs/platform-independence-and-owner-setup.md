# Sol Mai — salida de Lovable y propiedad de infraestructura

## Objetivo

Sol Mai debe poder desarrollarse, probarse, desplegarse y operar aunque Lovable
no esté disponible. GitHub es la fuente de verdad. Supabase y Cloudflare deben
quedar bajo cuentas controladas por el propietario del proyecto.

## Estado preparado en el repositorio

- `@lovable.dev/vite-tanstack-config` eliminado de dependencias.
- Vite usa plugins estándar de TanStack Start, React, Tailwind y Cloudflare.
- `wrangler.jsonc` define el Worker `sol-mai-peluqueria`.
- `package.json` incluye `deploy` y `cf-typegen`.
- `.dev.vars*` y `.env*` reales están ignorados por Git.
- `Platform independence CI` falla si reaparece una dependencia activa
  `@lovable.dev` o si el paquete Cloudflare no puede construirse.
- `Database clean-room CI` reconstruye PostgreSQL/Supabase desde las migraciones
  del repo y prueba bootstrap, RLS, constraints y endpoints.
- `Deploy Supabase schema` permite aplicar manualmente las migraciones
  canónicas sobre un proyecto Supabase propio.
- `Verify owned Supabase` levanta Hono contra ese proyecto remoto y verifica el
  contrato público del catálogo + no exposición de `staff_members`.
- El frontend no contiene la integración Supabase/Auth autogenerada por
  Lovable; el backend bajo `server/` sigue siendo el trust boundary.

## Cuentas que debe poseer el propietario

### Supabase

Crear un proyecto nuevo, vacío, destinado inicialmente a desarrollo de Sol Mai.
No crear tablas manualmente desde el Dashboard: el schema canónico está en
`supabase/migrations/`.

Datos no secretos que necesitaremos en GitHub:

- Project ref/ID.
- Project API URL.
- `SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_*`).

Credenciales que NO deben copiarse en chats, documentos ni commits:

- contraseña de base de datos;
- personal access token de Supabase (`sbp_*`);
- `SUPABASE_SECRET_KEY` (`sb_secret_*`) cuando una futura fase realmente la
  necesite.

La `SUPABASE_PUBLISHABLE_KEY` es pública por diseño, pero en la arquitectura
actual sigue configurada como variable server-side porque el navegador consume
nuestra API en lugar de consultar Supabase directamente.

El backend read-only actual **no necesita `SUPABASE_SECRET_KEY`**. Se añadirá al
hosting únicamente cuando reservas/admin/webhooks introduzcan operaciones
privilegiadas.

El flujo automatizado de GitHub para el schema usa:

- variable `SUPABASE_PROJECT_ID`;
- secret `SUPABASE_ACCESS_TOKEN`;
- secret `SUPABASE_DB_PASSWORD`.

y ejecuta el equivalente a:

```bash
supabase link --project-ref <PROJECT_REF>
supabase db push --dry-run
supabase db push
supabase migration list
```

No ejecutar `supabase db pull` sobre el proyecto nuevo si está vacío; no debe
crear una migración remota innecesaria. Nunca ejecutar `supabase db reset
--linked` sobre producción.

### Cloudflare

Crear/usar una cuenta Cloudflare controlada por el propietario y habilitar
Workers. El repo ya contiene la configuración de Workers; todavía no se hace
ningún deploy automático.

Para el workflow manual de CI/CD hacen falta dos secretos de GitHub:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

El token debe tener únicamente los permisos necesarios para desplegar Workers.
No guardar ese token en archivos `.env`, `.dev.vars`, documentación o chats.

El workflow `.github/workflows/cloudflare-deploy.yml` es manual
(`workflow_dispatch`) hasta completar la configuración y comprobar el primer
despliegue.

También puede usarse la integración Git de Cloudflare Workers con este mismo
repositorio para tener builds de producción y previews de ramas sin gastar
créditos de un builder visual.

## Variables del backend en el estado actual

Para verificar el catálogo read-only contra un Supabase propio alcanza con:

```text
NODE_ENV=production
APP_ENV=production
API_BASE_URL=<URL pública final>
PUBLIC_WEB_BASE_URL=<URL pública final>
SUPABASE_URL=<Project API URL>
SUPABASE_PUBLISHABLE_KEY=<sb_publishable_*>
INTERNAL_AUTH_JWT_AUDIENCE=sol-mai-internal
INTERNAL_AUTH_ALLOWED_EMAILS=<email owner autorizado>
```

Más adelante, cuando exista una operación backend privilegiada:

```text
SUPABASE_SECRET_KEY=<sb_secret_*>
```

Las credenciales Mercado Pago, email y WhatsApp siguen sin configurarse porque
esas funcionalidades aún no están implementadas.

## Orden de migración

1. Crear proyecto Supabase propio y vacío.
2. Configurar en GitHub las variables/secrets requeridas por `Deploy Supabase schema`.
3. Ejecutar manualmente `Deploy Supabase schema`.
4. Configurar `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY` como variables de GitHub.
5. Ejecutar manualmente `Verify owned Supabase`.
6. Crear/conectar cuenta Cloudflare con GitHub o configurar los secretos del
   workflow manual de deploy.
7. Desplegar la app TanStack en Cloudflare.
8. Verificar landing, catálogo mock actual y wizard desde la URL Cloudflare.
9. Antes de integrar el frontend con datos reales, finalizar el hosting del
   backend Hono o adaptarlo explícitamente a Workers.
10. Sólo después de verificar la infraestructura propia, dejar Lovable como
   histórico y cancelar/reducir el plan.

## Criterio de salida definitiva

Lovable se considera removido cuando se cumplan simultáneamente:

- CI compila sin paquetes `@lovable.dev`.
- `wrangler deploy --dry-run` funciona.
- Supabase propio contiene el schema/bootstrap esperado.
- `Verify owned Supabase` pasa contra el proyecto propio.
- aplicación TanStack desplegada en Cloudflare funciona desde una URL independiente.
- ningún secreto productivo depende de Lovable.

Hasta entonces no borrar el proyecto histórico de Lovable; simplemente no
consumir más créditos.
