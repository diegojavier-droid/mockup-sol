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
- `Platform independence CI` debe fallar si vuelve a aparecer una dependencia
  activa `@lovable.dev` o si el paquete Cloudflare no puede construirse.
- `Database clean-room CI` reconstruye PostgreSQL/Supabase desde las migraciones
  del repo y prueba bootstrap, RLS, constraints y endpoints.
- El frontend no contiene la integración Supabase/Auth autogenerada por
  Lovable; el backend bajo `server/` sigue siendo el trust boundary.

## Cuentas que debe poseer el propietario

### Supabase

Crear un proyecto nuevo, vacío, destinado inicialmente a desarrollo de Sol Mai.
No crear tablas manualmente desde el Dashboard: el schema canónico está en
`supabase/migrations/`.

Datos no secretos que necesitaremos después:

- Project ref/ID.
- Project API URL.

Credenciales que NO deben copiarse en chats, documentos ni commits:

- `SUPABASE_SECRET_KEY` (`sb_secret_*`).
- contraseña de base de datos.

La `SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_*`) es pública por diseño, pero
en la arquitectura actual igualmente se configura como variable server-side.

Flujo técnico previsto una vez creado el proyecto:

```bash
supabase login
supabase link --project-ref <PROJECT_REF>
supabase db push --dry-run
supabase db push
```

No ejecutar `supabase db pull` sobre el proyecto nuevo si está vacío; no debe
crear una migración remota innecesaria. Nunca ejecutar `supabase db reset
--linked` sobre producción.

### Cloudflare

Crear/usar una cuenta Cloudflare controlada por el propietario y habilitar
Workers. El repo ya contiene la configuración de Workers; todavía no se hace
ningún deploy automático.

Para CI/CD hacen falta dos secretos de GitHub:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

El token debe tener únicamente los permisos necesarios para desplegar Workers.
No guardar ese token en archivos `.env`, `.dev.vars`, documentación o chats.

El workflow `.github/workflows/cloudflare-deploy.yml` es manual
(`workflow_dispatch`) hasta completar la configuración y comprobar el primer
despliegue.

## Variables del backend en hosting

El contrato esperado para un proyecto Supabase propio es:

```text
NODE_ENV=production
APP_ENV=production
API_BASE_URL=<URL pública final>
PUBLIC_WEB_BASE_URL=<URL pública final>
SUPABASE_URL=<Project API URL>
SUPABASE_PUBLISHABLE_KEY=<sb_publishable_*>
SUPABASE_SECRET_KEY=<sb_secret_*>
INTERNAL_AUTH_JWT_AUDIENCE=sol-mai-internal
INTERNAL_AUTH_ALLOWED_EMAILS=<email owner autorizado>
```

Las credenciales Mercado Pago, email y WhatsApp siguen sin configurarse porque
esas funcionalidades aún no están implementadas.

## Orden de migración

1. Merge de la rama de independencia cuando todos los CI estén verdes.
2. Crear proyecto Supabase propio y vacío.
3. Vincular el repo y aplicar migraciones canónicas.
4. Verificar conteos/RLS/endpoints contra el proyecto propio.
5. Crear cuenta/token Cloudflare y guardar secretos en GitHub.
6. Ejecutar manualmente `Deploy Cloudflare Worker`.
7. Verificar landing, catálogo y wizard desde la URL Cloudflare.
8. Sólo después, dejar Lovable como histórico y cancelar/reducir el plan.

## Criterio de salida definitiva

Lovable se considera removido cuando se cumplan simultáneamente:

- CI compila sin paquetes `@lovable.dev`.
- `wrangler deploy --dry-run` funciona.
- Supabase propio contiene el schema/bootstrap esperado.
- Backend consulta el Supabase propio.
- aplicación desplegada en Cloudflare funciona desde una URL independiente.
- ningún secreto productivo depende de Lovable.

Hasta entonces no borrar el proyecto histórico de Lovable; simplemente no
consumir más créditos.
