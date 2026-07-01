# Sol Mai Peluquería — plan de arquitectura productiva

## Decisión de arquitectura recomendada

La arquitectura productiva recomendada es conservar el frontend público actual como base UX validada y mover toda regla crítica a un backend/API propio con Supabase/PostgreSQL como fuente de verdad. El proyecto deja de crecer como mock: la UI pública se mantiene, pero disponibilidad, reservas, pagos, webhooks, notificaciones, roles y auditoría se resuelven server-side.

Principios obligatorios:

- Lovable no es backend, no es base productiva y no gobierna reglas críticas; queda para UI, preview y validación visual.
- El mock frontend queda congelado salvo bugs críticos que bloqueen la experiencia pública ya aprobada.
- GitHub/Codex gobiernan la arquitectura real, documentación ejecutable, contratos, implementación y revisión por PR.
- Mercado Pago se implementa después de reservas persistidas y nunca como link fijo/manual de producción.
- CRM, clientas recurrentes y administración avanzada llegan después del núcleo de reservas y pagos reales.

## Capas del sistema

### Frontend público actual

Responsabilidades productivas:

- presentar landing, catálogo, servicios, extras, personalización y wizard como capa de experiencia;
- consultar catálogo y disponibilidad reales al backend;
- enviar intención de reserva con datos de clienta;
- redirigir en la misma ventana a Checkout Pro cuando el backend devuelva una preference válida;
- mostrar estados consultados al backend: `pending_payment`, `confirmed`, `expired`, `payment_in_review`, `payment_exception` o `cancelled`;
- no calcular disponibilidad definitiva, no confirmar pagos, no exponer secretos y no alojar tokens privados.

Restricción: no seguir ampliando lógica mock de negocio en React. Cualquier evolución funcional debe nacer de contratos backend.

### Backend/API propio

El backend/API propio es la frontera de confianza. Debe implementar endpoints versionados para:

- catálogo público y operativo;
- disponibilidad real;
- creación, expiración, cancelación y consulta de reservas;
- creación de preference de Mercado Pago por reserva;
- recepción y conciliación de webhooks;
- notificaciones email/WhatsApp;
- panel interno y acciones protegidas por roles;
- auditoría, logs operativos y jobs programados.

Validaciones críticas server-side:

- servicio activo, precio vigente, duración, seña y extras;
- disponibilidad real y no solapamiento;
- hold de slot por 10 minutos para `pending_payment`;
- `payment_required_until = created_at + 10 minutos`;
- expiración `pending_payment -> expired` y liberación de slot;
- confirmación solo por webhook `approved` antes del vencimiento;
- pago tardío después de `expired` como `payment_exception` o revisión manual.

### Supabase/PostgreSQL

Supabase/PostgreSQL será la fuente de verdad productiva para:

- clientas, catálogo, profesionales y disponibilidad;
- reservas, estados y snapshots;
- pagos, preferences, eventos/webhooks y conciliación;
- notificaciones y logs;
- usuarios internos, roles y auditoría;
- CRM futuro.

PostgreSQL debe usar constraints, índices, transacciones e idempotencia para evitar doble reserva, doble procesamiento de webhook y mutaciones inconsistentes. Las reservas y pagos deben preservar snapshots para que cambios futuros de catálogo no alteren historial.

## Auth, roles y RLS/policies

### Auth

- El público puede reservar sin cuenta en el MVP, con nombre, WhatsApp y email obligatorios.
- El panel interno requiere autenticación.
- Supabase Auth puede usarse para usuarios internos, pero las acciones sensibles deben pasar por backend/API.
- Cada acción interna o automática debe dejar actor (`user`, `system`, `webhook`, `job`) en `audit_logs`.

### Roles iniciales

- `owner`: acceso total, configuración, auditoría y gestión sensible.
- `manager`: gestión operativa de agenda, pagos, clientas y bloqueos.
- `staff`: vista/acciones limitadas sobre agenda propia o asignada.
- `readonly`: lectura operativa sin cambios.
- `system`: actor técnico para jobs, webhooks y automatizaciones.

### RLS/policies

RLS debe ser parte del diseño aunque no reemplace al backend:

- tablas públicas solo exponen datos explícitamente publicables mediante views o endpoints controlados;
- datos sensibles (`clients`, `reservations`, `payments`, `crm_notes`, `audit_logs`) requieren políticas restrictivas;
- service role solo en backend/jobs, nunca en frontend;
- panel interno con políticas por rol y claims;
- auditoría append-only para acciones críticas;
- payloads crudos de webhooks y notificaciones con acceso mínimo.

## Reservas reales y disponibilidad real

La disponibilidad real se calcula desde catálogo, duración, profesionales, horarios, reglas, bloqueos y reservas existentes. Estados que bloquean slot:

- `pending_payment` hasta `payment_required_until`;
- `confirmed` hasta cancelación, finalización o no-show;
- `payment_in_review` según regla operativa definida para revisión.

Estados que no bloquean slot:

- `draft` no persistido o no bloqueante;
- `expired`;
- `cancelled`;
- `completed`;
- `no_show` una vez marcado;
- `payment_exception` salvo decisión manual explícita.

La expiración debe ejecutarse con job programado y/o lógica transaccional al consultar disponibilidad, para que un hold vencido no bloquee agenda.

## Mercado Pago Checkout Pro

Decisiones productivas:

- usar Checkout Pro para producción MVP;
- crear una preference por cada reserva desde backend;
- no usar link fijo/manual para producción;
- no guardar access token en React, Lovable ni variables `VITE_`;
- incluir `reservationId` en `external_reference` y `metadata`;
- configurar `expiration_date_from` y `expiration_date_to = now + 10 min` alineado al hold;
- usar `back_urls` para UX y `notification_url` para webhook;
- excluir medios offline incompatibles con una seña que vence en 10 minutos;
- no activar `binary_mode` sin análisis posterior;
- en mobile, redirigir en la misma ventana; no usar `window.open` como patrón productivo;
- Bricks/Payment Brick queda como evolución futura, no MVP.

La confirmación real del turno ocurre solo con webhook aprobado y validado por backend antes del vencimiento. El redirect/back_url nunca confirma: solo muestra estado o “verificando pago”.

## Webhooks y jobs

Webhooks:

- persistir evento crudo en `payment_events` antes de procesar;
- validar autenticidad según mecanismo disponible de Mercado Pago;
- reconsultar server-to-server el pago antes de cambiar estados;
- aplicar idempotencia por evento, payment id y reservation id;
- registrar auditoría y errores.

Jobs mínimos:

- expirar `pending_payment` vencidas;
- enviar recordatorios 30 minutos antes;
- reintentar notificaciones fallidas;
- conciliación defensiva de pagos en revisión o eventos incompletos;
- backups/verificación operativa según proveedor.

## Email/WhatsApp transaccional

Email y WhatsApp son canales salientes transaccionales, no fuente de verdad. Eventos iniciales:

- reserva creada pendiente de seña;
- pago aprobado y reserva confirmada;
- pago en revisión;
- reserva expirada;
- cancelación;
- recordatorio 30 minutos antes;
- alerta interna de pago tardío, duplicado o excepción.

Cada intento debe registrar destinatario snapshot, canal, template, proveedor, estado, timestamps, response/error y cantidad de reintentos.

## Deployment y environments

### Deployment

Separar despliegues:

- frontend público en hosting web/CDN;
- backend/API en runtime server-side con webhooks, jobs y secretos;
- Supabase/PostgreSQL administrado;
- workers/jobs para expiración, recordatorios y conciliación.

El pipeline debe pasar por PR, revisión y checks antes de producción.

### Environments

- `local`: desarrollo sin credenciales productivas.
- `preview/staging`: validación con datos de prueba y Mercado Pago sandbox.
- `production`: datos reales, credenciales reales, logs y backups activos.

No compartir bases ni secretos entre ambientes. No copiar datos productivos a local sin anonimización.

## Manejo de secretos

Nunca deben estar en frontend, repositorio, Lovable ni variables públicas `VITE_`:

- Supabase service role;
- Mercado Pago access token;
- secretos/verificación de webhooks;
- tokens de WhatsApp;
- SMTP/API keys de email;
- claves de firma internas.

El frontend solo puede recibir claves públicas estrictamente necesarias y con permisos limitados.

## Logs, auditoría y backups

Logs mínimos:

- requests críticos de backend sin exponer datos sensibles innecesarios;
- creación/expiración/cancelación/confirmación de reservas;
- creación de preferences;
- recepción/procesamiento de webhooks;
- notificaciones y errores de proveedor;
- acciones del panel interno.

Auditoría:

- registrar actor, entidad, acción, before/after snapshot y metadata;
- no sobrescribir eventos críticos;
- mantener trazabilidad de cambios manuales y excepciones de pago.

Backups:

- backups automáticos de base productiva;
- pruebas periódicas de restore;
- retención definida según criticidad y costo;
- cuidado especial sobre datos personales y payloads crudos.

## Fuera de alcance de esta etapa

- implementar código;
- modificar componentes o wizard;
- crear backend o migraciones;
- integrar Mercado Pago real;
- crear panel interno completo;
- implementar CRM;
- integrar proveedores reales de email/WhatsApp;
- definir BI, campañas o marketing automation;
- convertir Lovable en backend o fuente productiva.
