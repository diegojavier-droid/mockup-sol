# Sol Mai Peluquería — roadmap backend y transición a sistema real

## Dependencias de secuencia

- Mercado Pago real va después de reserva real persistida: primero debe existir `reservation_id`, estado `pending_payment`, snapshot de seña, vencimiento y disponibilidad confiable.
- CRM y clientas recurrentes van después de reservas/pagos reales: no debe construirse memoria operativa sobre datos mock o pagos no conciliados.
- El catálogo dinámico es un requisito estructural desde Fase 1: precio, duración, visibilidad, setup/buffer, variantes y reglas no deben quedar hardcodeados como verdad permanente.
- El panel Admin avanzado puede llegar después del núcleo operativo, pero el modelo de datos y los contratos deben quedar preparados desde ahora para edición sin código y para snapshots históricos.
- El mock queda congelado desde Fase 0 salvo bugs críticos; nuevas reglas deben documentarse, validarse con Sol y luego implementarse en backend/API.
- Los precios, duraciones, buffers y modificadores actuales son provisionales hasta cerrar la validación comercial con Sol.

## Fase 0: congelar mock y documentar estado

- Objetivo: detener la expansión del mock y fijar la base UX validada.
- Entregables: fuente de verdad actualizada, documentos de arquitectura, modelo de datos y flujo reserva/pago.
- Módulos afectados: documentación, planificación, definición de contratos futuros.
- Riesgos: seguir agregando lógica local que luego deba descartarse; confundir demo con producción.
- Validaciones: revisión de stakeholders, lectura cruzada con auditoría y aprobación de alcance.
- Definición de terminado: documentación aprobada y backlog técnico priorizado sin cambios de UI ni backend.

## Fase 1: backend/base de datos/auth mínimos + catálogo preparado para administración

- Objetivo: crear la base técnica real para persistencia, seguridad y configuración comercial futura sin hardcodeo.
- Entregables: proyecto Supabase/PostgreSQL de desarrollo, esquema inicial, backend/API base, auth interna, roles mínimos, health checks y modelo capaz de representar catálogo dinámico.
- Capacidades de catálogo que el modelo debe soportar desde esta fase: alta/edición/activación/visibilidad de servicios; precio base y variantes; duración; setup/buffer; extras; personalización; profesionales elegibles; vigencia temporal; reglas/modificadores sin migración por cada cambio comercial.
- Módulos afectados: backend, base de datos, auth, configuración de environments, catálogo y contratos API.
- Riesgos: sobre-diseñar un motor de reglas genérico; fijar el Excel como verdad sin validación; exponer secretos; omitir auditoría temprana.
- Validaciones: conexión segura, migraciones ejecutadas sobre DB real, bootstrap idempotente, RLS probado realmente, endpoints de catálogo contra DB real, login interno y permisos básicos.
- Definición de terminado: backend validado en runtime sobre Supabase de desarrollo, DB accesible solo por canales seguros, auth mínima funcional y catálogo técnicamente administrable aunque los valores comerciales finales sigan pendientes de Sol.

## Gate comercial paralelo: Catálogo Maestro Sol Mai v1

- Objetivo: transformar Excel + operación histórica + validación de Sol en una fuente comercial/operativa confiable.
- Debe cerrar: significado de tarifas, vigencia, definición de largos, duraciones, setup/buffers, reglas de combinación, clienta habitual/semanal/no habitual, servicios públicos, Maquillaje, Uñas y clasificación de productos.
- Resultado: Catálogo Maestro v1 + matriz de precios/tiempos + reglas de negocio v1.
- Regla: ningún valor no validado debe promoverse a verdad productiva solo porque hoy exista en mock, seed o Excel.

## Fase 2: reservas reales + disponibilidad real

- Objetivo: reemplazar disponibilidad mock por reservas persistidas y slots reales.
- Entregables: endpoints de catálogo, disponibilidad, creación de reserva, snapshot comercial/operativo de servicio, bloqueo temporal de 10 minutos con `payment_required_until = created_at + 10 minutos`, expiración de impagas y consulta de estado.
- Módulos afectados: wizard como consumidor API, backend reservas, PostgreSQL, jobs programados.
- Riesgos: dobles reservas, holds demasiado largos, cálculos inconsistentes de duración/precio, cambios de tarifa que alteren reservas ya creadas, mala UX ante expiración.
- Validaciones: pruebas de concurrencia básica, creación de reservas `pending_payment`, retención del slot por 10 minutos, expiración automática a `expired`, liberación de slot, no solapamiento y persistencia correcta del snapshot.
- Definición de terminado: una clienta puede crear una reserva persistida con slot retenido, snapshot inmutable y estado consultable.

## Fase 3: Mercado Pago real + webhooks

- Objetivo: cobrar seña real por reserva y confirmar turnos por conciliación confiable.
- Entregables: creación de preference por reserva, webhook, tabla de pagos/eventos, idempotencia, estados de pago y auditoría.
- Módulos afectados: backend pagos, reservations, jobs de conciliación, frontend de retorno/estado.
- Riesgos: confirmar por retorno del navegador, duplicar pagos, confirmar pagos aprobados después del vencimiento de 10 minutos, no manejar pagos tardíos como excepción manual, credenciales mal separadas.
- Validaciones: sandbox end-to-end, webhooks duplicados, pagos rechazados, pagos en revisión, pagos aprobados antes de `payment_required_until`, pagos tardíos tratados como excepción manual y doble pago.
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
- Entregables: login, vista de agenda, detalle de reserva, cambio de estado, bloqueo de horarios, revisión de pagos problemáticos y acceso mínimo al catálogo administrable para cambios seguros de precio/duración/visibilidad cuando corresponda.
- Módulos afectados: frontend interno, backend interno, auth, audit_logs, catálogo.
- Riesgos: permisos insuficientes, acciones sin auditoría, panel demasiado amplio para MVP, cambios accidentales de tarifa.
- Validaciones: owner/manager/staff con permisos diferenciados, auditoría de cambios y flujos manuales críticos.
- Definición de terminado: el salón puede operar agenda diaria, resolver casos de pago/reserva y hacer ajustes comerciales básicos autorizados sin tocar código.

## Fase 6: CRM y clientas recurrentes

- Objetivo: agregar memoria operativa sobre clientas cuando reservas y pagos ya son confiables.
- Entregables: identificación de recurrentes, historial de reservas, notas CRM, preferencias y controles de privacidad.
- Módulos afectados: clients, crm_notes, panel interno, búsqueda, auditoría.
- Riesgos: almacenar datos sensibles sin criterio, deduplicación incorrecta, invadir privacidad o prometer personalización excesiva.
- Validaciones: reglas de acceso, edición auditada, merge manual seguro y minimización de datos.
- Definición de terminado: staff autorizado puede consultar historial y notas útiles sin afectar la reserva pública.

## Fase 7: admin catálogo/tarifas avanzado

- Objetivo: completar la gestión autónoma avanzada del catálogo sobre el modelo dinámico preparado desde Fase 1.
- Entregables: CRUD completo de categorías, servicios, extras, personalización, reglas de disponibilidad, vigencias de precio, profesionales elegibles, vista previa y herramientas de auditoría.
- Módulos afectados: panel admin, catálogo, disponibilidad, reservas, audit_logs.
- Riesgos: cambios que rompan reservas futuras, falta de vigencia temporal, edición accidental de servicios públicos, reglas demasiado complejas o imposibles de explicar.
- Validaciones: snapshots en reservas, vista previa de catálogo, auditoría, permisos owner/manager y pruebas de cambios de precio/duración/reglas.
- Definición de terminado: Sol puede ajustar tarifas, catálogo y configuración operativa avanzada sin despliegue, sin alterar historial ni reservas existentes.
