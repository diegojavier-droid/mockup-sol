# Sol Mai Peluquería — plan de arquitectura productiva

## Decisión de arquitectura

La transición a producto real debe conservar el frontend público actual como base UX validada y detener la ampliación del mock. La arquitectura objetivo separa claramente:

- frontend público y panel interno;
- backend/API propio;
- Supabase/PostgreSQL como persistencia principal;
- servicios externos integrados desde backend para pagos y notificaciones.

La decisión principal es no convertir el mock frontend en fuente de datos productiva. El frontend debe pasar a consumir contratos API estables y datos persistidos, manteniendo la experiencia visual existente mientras se reemplazan las simulaciones por comportamiento real.

## Frontend

El frontend público queda como capa de presentación y captura de intención de reserva. Sus responsabilidades productivas deben ser:

- mostrar catálogo público, precios orientativos, duración estimada y disponibilidad consultada al backend;
- guiar el wizard de reserva sin asumir disponibilidad definitiva local;
- enviar solicitudes de reserva al backend;
- redirigir a Mercado Pago cuando exista una preferencia real;
- mostrar estados claros de reserva, pago pendiente, revisión, confirmación, cancelación o expiración;
- no almacenar secretos ni reglas críticas de negocio.

El frontend interno futuro debe ser un panel protegido por roles para operación diaria, seguimiento de reservas, pagos, clientas, notas CRM y configuración gradual del catálogo.

## Backend/API

El backend/API propio es la capa obligatoria para reglas de negocio, integraciones y seguridad. Debe exponer endpoints versionados para:

- catálogo público;
- disponibilidad;
- creación y consulta de reservas;
- creación de preferencia de pago;
- recepción de webhooks de Mercado Pago;
- envío y registro de notificaciones;
- panel interno protegido;
- auditoría operativa.

El backend debe concentrar validaciones críticas: existencia del servicio, duración, precio vigente, seña requerida, disponibilidad real, bloqueo temporal de slot, expiración de reservas impagas, conciliación de pagos e idempotencia de eventos externos.

## Supabase/PostgreSQL

Supabase/PostgreSQL será la fuente de verdad de datos productivos. Debe contener:

- catálogo operativo y público;
- clientas;
- profesionales;
- disponibilidad, bloqueos y reservas;
- pagos y eventos de pago;
- notificaciones y logs;
- usuarios, roles y auditoría;
- notas CRM cuando la base transaccional esté estable.

PostgreSQL debe preservar snapshots en reservas y pagos para evitar que cambios futuros de catálogo, precios o duración alteren el historial.

## Auth

La autenticación debe implementarse primero para el panel interno y luego, si aplica, para funcionalidades de clientas recurrentes. Para MVP productivo:

- el público puede reservar sin cuenta, usando datos de contacto obligatorios;
- el panel interno requiere login;
- el backend valida sesión y permisos en cada endpoint interno;
- las acciones sensibles quedan asociadas a usuario autenticado en audit logs.

Supabase Auth puede usarse para usuarios internos, siempre detrás de reglas y validaciones del backend.

## Roles

Roles iniciales recomendados:

- `owner`: acceso total, configuración, reportes y auditoría;
- `manager`: gestión operativa de reservas, pagos, clientas y agenda;
- `staff`: vista limitada de agenda propia o asignada;
- `readonly`: lectura operativa sin cambios destructivos;
- `system`: actor técnico para webhooks, expiraciones y jobs.

Los roles no deben ser solo cosméticos en UI: deben aplicarse en API y registrarse en auditoría.

## Pagos

Mercado Pago debe integrarse después de tener reservas persistidas. La unidad de pago debe ser una preferencia por reserva, no un link genérico reutilizado. El backend debe:

- calcular el monto de seña desde el snapshot de la reserva;
- crear la preference con referencia externa a la reserva;
- persistir `preference_id`, estado inicial y vencimiento;
- recibir y validar eventos por webhook;
- confirmar la reserva solo cuando el pago esté acreditado o aceptado según regla definida;
- manejar pago tardío, doble pago y estados en revisión.

## Webhooks

Los webhooks son la fuente técnica para conciliar pagos, no el retorno del navegador. Deben implementarse con:

- endpoint dedicado y autenticable/verificable según Mercado Pago;
- persistencia cruda del evento en `payment_events`;
- idempotencia por identificador de evento y pago;
- reconsulta server-to-server a Mercado Pago antes de cambiar estados críticos;
- logs suficientes para soporte operativo.

## Notificaciones

Email y WhatsApp deben ser notificaciones transaccionales salientes. No reemplazan la fuente de verdad: la reserva y el pago viven en la base de datos.

Eventos iniciales:

- reserva creada y pendiente de pago;
- pago acreditado y reserva confirmada;
- pago en revisión;
- reserva expirada;
- cancelación;
- recordatorio 30 minutos antes del turno;
- aviso interno ante casos de conciliación manual.

Cada notificación debe tener registro de intento, proveedor, estado, destinatario, payload mínimo y error si falla.

## Deployment

La arquitectura de deployment debe separar frontend, backend y base de datos:

- frontend en hosting web/CDN;
- backend en plataforma server-side con soporte para webhooks, jobs y variables secretas;
- Supabase como base administrada;
- jobs programados para expiración de reservas impagas, recordatorios y conciliaciones.

El pipeline debe exigir revisión, variables por ambiente y pruebas mínimas antes de promover a producción.

## Environments

Ambientes mínimos:

- `local`: desarrollo sin credenciales productivas;
- `preview/staging`: validación con datos de prueba y Mercado Pago sandbox;
- `production`: datos reales, credenciales reales y auditoría activa.

Los ambientes no deben compartir base de datos ni secretos. Los datos productivos no deben copiarse a local sin anonimización.

## Manejo de secretos

Los secretos nunca deben quedar en frontend, repositorio ni documentación operativa. Deben administrarse como variables secretas del proveedor de backend/deployment.

Secretos esperados:

- claves Supabase service role;
- credenciales Mercado Pago;
- tokens de proveedor WhatsApp;
- credenciales SMTP/email;
- secretos de verificación de webhooks;
- claves de firma internas si se usan.

El frontend solo puede recibir claves públicas estrictamente necesarias, como URLs públicas o anon keys con permisos limitados.

## Fuera de alcance

Queda fuera del alcance de esta etapa documental:

- implementar código;
- modificar componentes, estilos o lógica del wizard;
- crear migraciones;
- abrir o implementar backend real;
- integrar Mercado Pago real;
- integrar email o WhatsApp real;
- construir panel interno completo;
- automatizar CRM avanzado;
- resolver analítica, BI o campañas de marketing;
- reemplazar decisiones comerciales pendientes del catálogo real.
