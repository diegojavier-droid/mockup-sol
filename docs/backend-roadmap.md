# Sol Mai Peluquería — roadmap backend y transición a sistema real

## Fase 0: congelar mock y documentar estado

- Objetivo: detener la expansión del mock y fijar la base UX validada.
- Entregables: fuente de verdad actualizada, documentos de arquitectura, modelo de datos y flujo reserva/pago.
- Módulos afectados: documentación, planificación, definición de contratos futuros.
- Riesgos: seguir agregando lógica local que luego deba descartarse; confundir demo con producción.
- Validaciones: revisión de stakeholders, lectura cruzada con auditoría y aprobación de alcance.
- Definición de terminado: documentación aprobada y backlog técnico priorizado sin cambios de UI ni backend.

## Fase 1: backend/base de datos/auth mínimos

- Objetivo: crear la base técnica real para persistencia y panel protegido.
- Entregables: proyecto Supabase/PostgreSQL, esquema inicial, backend/API base, auth interna, roles mínimos, health checks.
- Módulos afectados: backend, base de datos, auth, configuración de environments.
- Riesgos: sobre-diseñar el panel antes de reservas; exponer secretos; omitir auditoría temprana.
- Validaciones: conexión segura, migraciones revisadas, login interno, permisos básicos y separación staging/production.
- Definición de terminado: backend desplegado en staging, DB accesible solo por canales seguros y auth interna funcional.

## Fase 2: reservas reales + disponibilidad real

- Objetivo: reemplazar disponibilidad mock por reservas persistidas y slots reales.
- Entregables: endpoints de catálogo, disponibilidad, creación de reserva, bloqueo temporal, expiración de impagas y consulta de estado.
- Módulos afectados: wizard como consumidor API, backend reservas, PostgreSQL, jobs programados.
- Riesgos: dobles reservas, holds demasiado largos, cálculos inconsistentes de duración/precio, mala UX ante expiración.
- Validaciones: pruebas de concurrencia básica, creación de reservas pending_payment, expiración automática y no solapamiento.
- Definición de terminado: una clienta puede crear una reserva persistida con slot retenido y estado consultable.

## Fase 3: Mercado Pago real + webhooks

- Objetivo: cobrar seña real por reserva y confirmar turnos por conciliación confiable.
- Entregables: creación de preference por reserva, webhook, tabla de pagos/eventos, idempotencia, estados de pago y auditoría.
- Módulos afectados: backend pagos, reservations, jobs de conciliación, frontend de retorno/estado.
- Riesgos: confirmar por retorno del navegador, duplicar pagos, no manejar pagos tardíos, credenciales mal separadas.
- Validaciones: sandbox end-to-end, webhooks duplicados, pagos rechazados, pagos en revisión, pagos tardíos y doble pago.
- Definición de terminado: una reserva se confirma automáticamente solo cuando el backend verifica pago válido.

## Fase 4: notificaciones email/WhatsApp + recordatorio 30 min

- Objetivo: activar comunicación transaccional trazable.
- Entregables: templates, envío por email, envío por WhatsApp, logs, reintentos controlados y recordatorio 30 minutos antes.
- Módulos afectados: backend notificaciones, jobs, reservations, payments, proveedores externos.
- Riesgos: mensajes duplicados, contenido desactualizado, costos de proveedor, fallas silenciosas.
- Validaciones: logs por intento, prueba de confirmación, expiración, cancelación y recordatorio; fallback operativo ante error.
- Definición de terminado: eventos críticos generan notificaciones con estado auditable.

## Fase 5: panel interno mínimo

- Objetivo: dar operación básica al salón sin depender de base de datos manual.
- Entregables: login, vista de agenda, detalle de reserva, cambio de estado, bloqueo de horarios, revisión de pagos problemáticos.
- Módulos afectados: frontend interno, backend interno, auth, audit_logs.
- Riesgos: permisos insuficientes, acciones sin auditoría, panel demasiado amplio para MVP.
- Validaciones: owner/manager/staff con permisos diferenciados, auditoría de cambios y flujos manuales críticos.
- Definición de terminado: el salón puede operar agenda diaria y resolver casos de pago/reserva desde el panel.

## Fase 6: CRM y clientas recurrentes

- Objetivo: agregar memoria operativa sobre clientas cuando reservas y pagos ya son confiables.
- Entregables: identificación de recurrentes, historial de reservas, notas CRM, preferencias y controles de privacidad.
- Módulos afectados: clients, crm_notes, panel interno, búsqueda, auditoría.
- Riesgos: almacenar datos sensibles sin criterio, deduplicación incorrecta, invadir privacidad o prometer personalización excesiva.
- Validaciones: reglas de acceso, edición auditada, merge manual seguro y minimización de datos.
- Definición de terminado: staff autorizado puede consultar historial y notas útiles sin afectar la reserva pública.

## Fase 7: admin catálogo/tarifas avanzado

- Objetivo: permitir gestión autónoma de catálogo, precios, duración y visibilidad.
- Entregables: CRUD de categorías, servicios, extras, personalización, reglas de disponibilidad y vigencias de precio.
- Módulos afectados: panel admin, catálogo, disponibilidad, reservas, audit_logs.
- Riesgos: cambios que rompan reservas futuras, falta de vigencia temporal, edición accidental de servicios públicos.
- Validaciones: snapshots en reservas, vista previa de catálogo, auditoría, permisos owner/manager y pruebas de cambios de precio.
- Definición de terminado: Sol puede ajustar tarifas y catálogo sin despliegue, sin alterar historial ni reservas existentes.
