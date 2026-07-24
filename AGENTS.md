# Sol Mai Peluquería — instrucciones para agentes de código

## Fuente de verdad

Antes de modificar código, leer en este orden:

1. `docs/sol-mai-current-source-of-truth.md`
2. `docs/backend-roadmap.md`
3. `docs/production-architecture-plan.md`
4. `docs/data-model-v1.md`
5. `docs/reservation-payment-flow.md`

Los PDFs/documentos maestros anteriores son históricos/contextuales y no
reemplazan la fuente de verdad vigente del repo.

## Gobierno

- `main` = baseline estable.
- `mvp/sol-mai-v2` = línea de desarrollo, mantenida sincronizada con `main`
  después de consolidaciones.
- Trabajar en una rama específica por bloque/corrección; no desarrollar
  directamente sobre `main`.
- GitHub es la fuente de verdad. Ningún builder, preview ni agente externo
  puede convertirse en fuente canónica.
- Lovable está fuera del flujo activo. No introducir dependencias
  `@lovable.dev`, project refs, secretos ni runtime que dependan de Lovable.

## Stack vigente

- React 19
- TanStack Start / TanStack Router
- TypeScript
- Tailwind CSS
- Bun
- Hono (`server/`)
- Supabase/PostgreSQL
- Cloudflare Workers preparado para la app TanStack
- GitHub Actions

## Fronteras arquitectónicas

### Frontend / app TanStack: `src/`

- Mantener la UX pública validada salvo que el requisito exija cambiarla.
- El navegador no debe importar módulos server-only desde `server/`.
- No exponer secretos con `VITE_`.
- No introducir acceso directo a Supabase en navegador sin una decisión
  arquitectónica explícita. El contrato actual usa la API propia como frontera.

### Backend: `server/`

- Es el trust boundary para secretos y operaciones privilegiadas.
- Validar inputs en backend; no confiar en payloads calculados por frontend.
- `SUPABASE_SECRET_KEY` es server-only.
- El alias legacy `SUPABASE_SERVICE_ROLE_KEY` existe sólo para compatibilidad
  con Supabase local/clean-room.

### Base de datos: `supabase/migrations/`

- Las migraciones son la fuente canónica del schema.
- No crear tablas/constraints/policies sólo desde Dashboard y dejar el cambio
  fuera de Git.
- RLS debe probarse realmente; no declarar seguridad por inspección estática.
- Cambios de schema deben pasar `Database clean-room CI`.
- No editar migration history de forma ad-hoc.

## Producto y reglas de negocio

- Los 43 servicios actuales son bootstrap provisional, no un límite.
- El catálogo debe ser administrable/dinámico sin migraciones por cada cambio
  comercial.
- Precio, duración, buffers, reglas, largos y segmentos observados en mocks o
  Excel NO son verdad definitiva hasta validación explícita con Sol.
- No inventar reglas comerciales para completar huecos.
- Catálogo público y configuración técnica/comercial interna son capas
  distintas.
- Futuras reservas deben snapshotear precio, duración, servicio, extras y
  modificadores aplicados; no depender del catálogo vivo para reconstruir el
  pasado.

## Reservas y pagos — reglas ya decididas

- Seña: 20%.
- Nueva reserva: `pending_payment`.
- Hold del slot: 10 minutos.
- `payment_required_until = created_at + 10 minutos`.
- Vencida sin pago: `expired` y libera slot.
- Sólo webhook de pago aprobado confirma; el redirect del navegador nunca
  confirma por sí mismo.
- Pago aprobado después de expiración: excepción manual, no reconfirmación
  automática.
- Mercado Pago producción será Checkout Pro, después de reservas persistidas.

## Scope actual

No adelantar funcionalidades por iniciativa propia. En particular, no
implementar Auth, reservas, Mercado Pago, CRM, notificaciones ni Admin avanzado
si el bloque solicitado no los incluye.

## Comandos de validación

Como mínimo para cambios relevantes:

```bash
bun install --frozen-lockfile
bun run typecheck:server
bun run build
git diff --exit-code -- src/routeTree.gen.ts
```

Para cambios de plataforma/Cloudflare:

```bash
bunx wrangler deploy --dry-run
```

Para cambios de base de datos, confiar además en:

- `.github/workflows/database-clean-room.yml`

CI relevante:

- `Backend scaffold CI`
- `Database clean-room CI`
- `Platform independence CI`

No declarar un check exitoso si no fue ejecutado realmente.

## Calidad de implementación

- Preferir cambios pequeños, explícitos y reversibles.
- Evitar abstracciones genéricas sin un caso de negocio real.
- Evitar duplicar fuentes de verdad.
- Preservar IDs/slugs/contratos existentes salvo migración deliberada.
- Proteger idempotencia, concurrencia e integridad desde DB cuando corresponda.
- Documentar cualquier decisión que cambie arquitectura, producto, ramas o
  alcance en la fuente de verdad vigente.

## Entrega de cada bloque

Reportar:

1. qué cambió;
2. archivos principales;
3. qué se ejecutó realmente;
4. resultados de CI/tests;
5. riesgos o decisiones pendientes;
6. qué queda fuera de alcance.
