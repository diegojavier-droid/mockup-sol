# Sol Mai Peluquería — modelo de datos v1

## Principios del modelo

El modelo v1 debe soportar reservas y pagos reales sin perder trazabilidad. La regla central es conservar snapshots en reservas, pagos y notificaciones para que cambios posteriores de catálogo, precios, duración o datos de clienta no modifiquen el historial.

## `clients`

- Objetivo: representar clientas y contactos que realizan reservas.
- Campos principales: `id`, `first_name`, `last_name`, `email`, `phone`, `whatsapp_phone`, `created_at`, `updated_at`, `marketing_opt_in`, `notes_summary`.
- Relaciones: tiene muchas `reservations`, `notifications`, `crm_notes` y puede estar vinculado a `users` si en el futuro existe cuenta de clienta.
- Datos sensibles: nombre, email, teléfono, WhatsApp y notas.
- Snapshots necesarios: datos de contacto copiados en cada reserva y notificación.
- No debe recalcularse retroactivamente: reservas históricas no deben cambiar si la clienta actualiza teléfono, email o nombre.

## `categories`

- Objetivo: agrupar servicios públicos y operativos.
- Campos principales: `id`, `name`, `slug`, `description`, `public_order`, `is_public`, `is_active`, `created_at`, `updated_at`.
- Relaciones: tiene muchos `services` y puede condicionar `personalization_fields`.
- Datos sensibles: ninguno por defecto.
- Snapshots necesarios: nombre y slug de categoría en la reserva.
- No debe recalcularse retroactivamente: categoría histórica visible en una reserva no cambia por renombres futuros.

## `services`

- Objetivo: definir servicios reservables, duración estimada y precio base operativo.
- Campos principales: `id`, `category_id`, `name`, `slug`, `description`, `base_price`, `duration_minutes`, `deposit_percentage`, `is_public`, `is_active`, `created_at`, `updated_at`.
- Relaciones: pertenece a `categories`; tiene muchos `extras`, `personalization_fields`, `specialties` y `reservations`.
- Datos sensibles: ninguno por defecto.
- Snapshots necesarios: nombre, precio base, duración, porcentaje de seña y descripción corta en reserva.
- No debe recalcularse retroactivamente: precio, duración y seña de reservas existentes no cambian cuando se actualiza el catálogo.

## `extras`

- Objetivo: representar adicionales opcionales seleccionables en una reserva.
- Campos principales: `id`, `service_id`, `name`, `description`, `price_delta`, `duration_delta_minutes`, `is_active`, `public_order`.
- Relaciones: pertenece a `services`; se snapshottea en `reservations`.
- Datos sensibles: ninguno por defecto.
- Snapshots necesarios: extras seleccionados con precio y duración al momento de reservar.
- No debe recalcularse retroactivamente: total histórico no cambia si un extra sube de precio o se desactiva.

## `personalization_fields`

- Objetivo: definir preguntas o campos de personalización por categoría o servicio.
- Campos principales: `id`, `category_id`, `service_id`, `label`, `field_type`, `options`, `is_required`, `public_order`, `is_active`.
- Relaciones: pertenece opcionalmente a `categories` y/o `services`; tiene muchas `personalization_responses`.
- Datos sensibles: depende del contenido de la pregunta; puede incluir datos de salud o preferencias personales.
- Snapshots necesarios: etiqueta, tipo y opciones vigentes al responder.
- No debe recalcularse retroactivamente: respuestas históricas no se reinterpretan si cambia la pregunta.

## `personalization_responses`

- Objetivo: guardar respuestas de clienta para una reserva concreta.
- Campos principales: `id`, `reservation_id`, `personalization_field_id`, `field_label_snapshot`, `response_value`, `created_at`.
- Relaciones: pertenece a `reservations` y referencia `personalization_fields`.
- Datos sensibles: respuestas de clienta, potencialmente datos personales o de salud.
- Snapshots necesarios: pregunta y respuesta exactas al momento de reservar.
- No debe recalcularse retroactivamente: una respuesta mantiene su significado original aunque el campo cambie.

## `staff`

- Objetivo: representar profesionales o personas que atienden turnos.
- Campos principales: `id`, `display_name`, `email`, `phone`, `is_active`, `created_at`, `updated_at`.
- Relaciones: tiene muchas `specialties`, `availability_rules`, `blocked_times` y `reservations` asignadas.
- Datos sensibles: email y teléfono del staff.
- Snapshots necesarios: nombre del staff asignado en la reserva.
- No debe recalcularse retroactivamente: una reserva mantiene quién fue asignado aunque el staff cambie de nombre o se desactive.

## `specialties`

- Objetivo: mapear qué staff puede prestar qué servicios o categorías.
- Campos principales: `id`, `staff_id`, `service_id`, `category_id`, `priority`, `is_active`.
- Relaciones: pertenece a `staff` y opcionalmente a `services` o `categories`.
- Datos sensibles: ninguno por defecto.
- Snapshots necesarios: regla usada para asignación si afecta una reserva.
- No debe recalcularse retroactivamente: asignaciones pasadas no cambian si cambian especialidades futuras.

## `business_hours`

- Objetivo: definir horarios generales de atención del salón.
- Campos principales: `id`, `weekday`, `opens_at`, `closes_at`, `is_closed`, `valid_from`, `valid_to`.
- Relaciones: alimenta cálculo de disponibilidad y se combina con `availability_rules` y `blocked_times`.
- Datos sensibles: ninguno por defecto.
- Snapshots necesarios: ventana horaria usada para calcular el slot reservado.
- No debe recalcularse retroactivamente: una reserva pasada no se invalida si cambian horarios comerciales.

## `availability_rules`

- Objetivo: definir reglas específicas de disponibilidad por staff, servicio o período.
- Campos principales: `id`, `staff_id`, `service_id`, `weekday`, `starts_at`, `ends_at`, `capacity`, `valid_from`, `valid_to`, `is_active`.
- Relaciones: opcionalmente pertenece a `staff` y `services`; afecta `reservations`.
- Datos sensibles: disponibilidad laboral del staff.
- Snapshots necesarios: capacidad/regla aplicada al confirmar o mantener un slot.
- No debe recalcularse retroactivamente: disponibilidad histórica no cambia por reglas futuras.

## `blocked_times`

- Objetivo: bloquear agenda por feriados, descansos, ausencias o tareas internas.
- Campos principales: `id`, `staff_id`, `starts_at`, `ends_at`, `reason`, `created_by_user_id`, `created_at`.
- Relaciones: pertenece opcionalmente a `staff` y a `users` creador.
- Datos sensibles: motivo del bloqueo si revela información personal.
- Snapshots necesarios: bloqueo considerado al rechazar o mover una reserva.
- No debe recalcularse retroactivamente: una disponibilidad consultada históricamente no debe reescribirse.

## `reservations`

- Objetivo: fuente de verdad de solicitudes, holds, turnos confirmados y estados operativos.
- Campos principales: `id`, `client_id`, `service_id`, `staff_id`, `status`, `starts_at`, `ends_at`, `expires_at`, `client_name_snapshot`, `client_email_snapshot`, `client_phone_snapshot`, `category_snapshot`, `service_snapshot`, `extras_snapshot`, `price_snapshot`, `deposit_amount_snapshot`, `duration_minutes_snapshot`, `created_at`, `updated_at`, `cancelled_at`, `completed_at`.
- Relaciones: pertenece a `clients`, `services` y opcionalmente `staff`; tiene `payments`, `notifications`, `personalization_responses` y `audit_logs`.
- Datos sensibles: datos de clienta, servicio solicitado, notas y respuestas.
- Snapshots necesarios: contacto, servicio, categoría, extras, precio, seña, duración, hora, staff y condiciones de pago.
- No debe recalcularse retroactivamente: total, seña, duración, servicio y contacto usados en la reserva.

## `payments`

- Objetivo: representar intentos y resultados de pago asociados a una reserva.
- Campos principales: `id`, `reservation_id`, `provider`, `provider_payment_id`, `provider_preference_id`, `status`, `amount`, `currency`, `external_reference`, `paid_at`, `expires_at`, `created_at`, `updated_at`.
- Relaciones: pertenece a `reservations`; tiene muchos `payment_events`.
- Datos sensibles: identificadores de pago y datos parciales del pagador si se almacenan.
- Snapshots necesarios: monto, moneda, reserva, preference y estado acreditado.
- No debe recalcularse retroactivamente: monto cobrado y estado conciliado no cambian por modificaciones futuras de reserva salvo ajuste explícito auditado.

## `payment_events`

- Objetivo: registrar eventos crudos y procesados de Mercado Pago u otro proveedor.
- Campos principales: `id`, `payment_id`, `provider`, `provider_event_id`, `event_type`, `payload`, `received_at`, `processed_at`, `processing_status`, `idempotency_key`.
- Relaciones: pertenece opcionalmente a `payments`.
- Datos sensibles: payload del proveedor puede contener datos personales o de pago.
- Snapshots necesarios: payload crudo, headers relevantes e interpretación aplicada.
- No debe recalcularse retroactivamente: el evento recibido debe conservarse aunque luego se reprocesse o corrija.

## `notifications`

- Objetivo: representar una notificación transaccional a enviar.
- Campos principales: `id`, `reservation_id`, `client_id`, `channel`, `template_key`, `recipient`, `status`, `scheduled_at`, `sent_at`, `created_at`.
- Relaciones: pertenece a `reservations` y `clients`; tiene muchos `notification_logs`.
- Datos sensibles: destinatario, contenido transaccional y datos de reserva.
- Snapshots necesarios: destinatario, template, variables y canal al momento de programar.
- No debe recalcularse retroactivamente: una notificación enviada mantiene contenido y destinatario original.

## `notification_logs`

- Objetivo: auditar intentos de envío, respuestas de proveedor y errores.
- Campos principales: `id`, `notification_id`, `provider`, `provider_message_id`, `status`, `request_payload`, `response_payload`, `error_message`, `attempted_at`.
- Relaciones: pertenece a `notifications`.
- Datos sensibles: payloads con destinatario y contenido.
- Snapshots necesarios: request, response, proveedor y error exacto.
- No debe recalcularse retroactivamente: logs no se sobrescriben; se agregan intentos nuevos.

## `crm_notes`

- Objetivo: registrar notas internas sobre clientas recurrentes y preferencias.
- Campos principales: `id`, `client_id`, `reservation_id`, `author_user_id`, `note`, `visibility`, `created_at`, `updated_at`.
- Relaciones: pertenece a `clients`, opcionalmente a `reservations` y a `users` autor.
- Datos sensibles: alto; puede contener preferencias, historial y observaciones personales.
- Snapshots necesarios: autor, fecha y contexto de reserva si aplica.
- No debe recalcularse retroactivamente: una nota histórica no cambia por nuevas reservas salvo edición auditada.

## `users`

- Objetivo: representar usuarios internos autenticados.
- Campos principales: `id`, `auth_provider_id`, `email`, `display_name`, `is_active`, `last_login_at`, `created_at`, `updated_at`.
- Relaciones: tiene roles mediante `roles` o tabla puente futura; crea `audit_logs`, `crm_notes` y bloqueos.
- Datos sensibles: email, identidad y actividad interna.
- Snapshots necesarios: usuario actor en auditoría.
- No debe recalcularse retroactivamente: acciones pasadas mantienen el usuario que las ejecutó.

## `roles`

- Objetivo: definir permisos de acceso para panel y API interna.
- Campos principales: `id`, `key`, `name`, `description`, `permissions`, `is_active`.
- Relaciones: asignable a `users`; afecta autorización en endpoints internos.
- Datos sensibles: ninguno por defecto, aunque permisos exponen estructura operativa.
- Snapshots necesarios: rol/permisos efectivos en acciones críticas de auditoría.
- No debe recalcularse retroactivamente: una acción auditada mantiene el permiso con que fue realizada.

## `audit_logs`

- Objetivo: registrar acciones relevantes del sistema, usuarios internos y procesos automáticos.
- Campos principales: `id`, `actor_user_id`, `actor_type`, `action`, `entity_type`, `entity_id`, `before_snapshot`, `after_snapshot`, `metadata`, `created_at`.
- Relaciones: referencia `users` cuando aplica y cualquier entidad auditada.
- Datos sensibles: puede contener datos personales y cambios operativos.
- Snapshots necesarios: antes/después de cambios críticos y metadata de origen.
- No debe recalcularse retroactivamente: auditoría es append-only; no debe editarse salvo políticas legales estrictas.
