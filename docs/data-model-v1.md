# Sol Mai Peluquería — modelo de datos v1

## Principios

El modelo v1 soporta reservas persistidas, disponibilidad real, seña, webhooks, notificaciones, roles y CRM futuro. Regla base: toda reserva, pago y notificación debe guardar snapshots suficientes para que cambios posteriores de catálogo, precios, duración, contacto o reglas no reescriban historial.

## Entidades

### `clients`
- Objetivo: identificar clientas y contactos que reservan.
- Campos principales: `id`, `first_name`, `last_name`, `email`, `phone`, `whatsapp_phone`, `marketing_opt_in`, `created_at`, `updated_at`, `deleted_at`.
- Relaciones: muchas `reservations`, `notifications`, `crm_notes`, `client_history`; opcional vínculo futuro con `users`.
- Datos sensibles: nombre, email, teléfono, WhatsApp, preferencias.
- Snapshots necesarios: contacto copiado en reserva, pago y notificación.
- No recalcular retroactivamente: reservas históricas no cambian si la clienta actualiza contacto.

### `categories`
- Objetivo: agrupar servicios públicos/operativos.
- Campos principales: `id`, `name`, `slug`, `description`, `public_order`, `is_public`, `is_active`, `created_at`, `updated_at`.
- Relaciones: muchas `services`; puede tener `personalization_fields`.
- Datos sensibles: ninguno por defecto.
- Snapshots necesarios: nombre/slug de categoría en reserva.
- No recalcular retroactivamente: renombres no cambian reservas pasadas.

### `services`
- Objetivo: definir servicios reservables, precio, duración y seña.
- Campos principales: `id`, `category_id`, `name`, `slug`, `description`, `base_price`, `duration_minutes`, `deposit_percentage`, `deposit_amount`, `is_public`, `is_active`, `version`, `created_at`, `updated_at`.
- Relaciones: pertenece a `categories`; muchas `extras`, `personalization_fields`, `specialties`, `reservations`.
- Datos sensibles: ninguno por defecto.
- Snapshots necesarios: nombre, descripción corta, precio, duración, seña, versión.
- No recalcular retroactivamente: reservas existentes mantienen precio/duración/seña originales.

### `extras`
- Objetivo: adicionales opcionales con impacto en precio/duración.
- Campos principales: `id`, `service_id`, `name`, `description`, `price_delta`, `duration_delta_minutes`, `is_active`, `public_order`, `version`.
- Relaciones: pertenece a `services`; snapshot dentro de `reservations`.
- Datos sensibles: ninguno por defecto.
- Snapshots necesarios: extras seleccionados, precio y duración al reservar.
- No recalcular retroactivamente: cambios de extra no modifican totales históricos.

### `personalization_fields`
- Objetivo: preguntas/campos de personalización por categoría o servicio.
- Campos principales: `id`, `category_id`, `service_id`, `label`, `field_type`, `is_required`, `public_order`, `is_active`, `version`.
- Relaciones: muchas `personalization_options` y `personalization_responses`.
- Datos sensibles: depende de la pregunta; puede capturar preferencias o información personal.
- Snapshots necesarios: etiqueta, tipo, obligatoriedad y versión al responder.
- No recalcular retroactivamente: respuestas pasadas no se reinterpretan por cambios de pregunta.

### `personalization_options`
- Objetivo: opciones posibles para campos de selección.
- Campos principales: `id`, `field_id`, `label`, `value`, `public_order`, `is_active`, `price_delta`, `duration_delta_minutes`.
- Relaciones: pertenece a `personalization_fields`; referenciable por `personalization_responses`.
- Datos sensibles: ninguno por defecto, salvo que revele preferencia sensible.
- Snapshots necesarios: opción elegida con label/value e impacto de precio/duración.
- No recalcular retroactivamente: una respuesta mantiene la opción original aunque se renombre.

### `personalization_responses`
- Objetivo: guardar respuestas de clienta asociadas a una reserva.
- Campos principales: `id`, `reservation_id`, `personalization_field_id`, `personalization_option_id`, `field_label_snapshot`, `option_label_snapshot`, `response_value`, `created_at`.
- Relaciones: pertenece a `reservations`; referencia campos/opciones.
- Datos sensibles: respuestas de clienta, potencialmente información personal.
- Snapshots necesarios: pregunta, opción, texto y valores aplicados al momento de reservar.
- No recalcular retroactivamente: respuestas históricas conservan significado original.

### `staff` / `professionals`
- Objetivo: representar profesionales que atienden turnos.
- Campos principales: `id`, `display_name`, `email`, `phone`, `is_active`, `created_at`, `updated_at`.
- Relaciones: muchas `specialties`, `availability_rules`, `blocked_times`, `reservations`.
- Datos sensibles: contacto y disponibilidad laboral.
- Snapshots necesarios: profesional asignado en reserva.
- No recalcular retroactivamente: reservas mantienen profesional histórico.

### `specialties` / `areas`
- Objetivo: mapear qué profesional puede atender qué área, categoría o servicio.
- Campos principales: `id`, `staff_id`, `category_id`, `service_id`, `area_key`, `priority`, `is_active`.
- Relaciones: pertenece a `staff`; opcionalmente a `categories`/`services`.
- Datos sensibles: ninguno por defecto.
- Snapshots necesarios: regla usada para asignar si afecta la reserva.
- No recalcular retroactivamente: cambios futuros no reasignan reservas pasadas.

### `business_hours`
- Objetivo: horario general del salón.
- Campos principales: `id`, `weekday`, `opens_at`, `closes_at`, `is_closed`, `valid_from`, `valid_to`, `timezone`.
- Relaciones: alimenta disponibilidad junto con reglas, bloqueos y reservas.
- Datos sensibles: ninguno por defecto.
- Snapshots necesarios: ventana horaria aplicada al slot.
- No recalcular retroactivamente: cambios de horario no invalidan turnos históricos.

### `availability_rules`
- Objetivo: reglas específicas de capacidad por profesional, servicio o período.
- Campos principales: `id`, `staff_id`, `service_id`, `weekday`, `starts_at`, `ends_at`, `capacity`, `valid_from`, `valid_to`, `is_active`.
- Relaciones: opcional a `staff`/`services`; afecta creación de `reservations`.
- Datos sensibles: disponibilidad laboral.
- Snapshots necesarios: regla/capacidad aplicada a la reserva.
- No recalcular retroactivamente: disponibilidad histórica no cambia por reglas futuras.

### `blocked_times`
- Objetivo: bloquear agenda por feriados, ausencias, descanso o tareas internas.
- Campos principales: `id`, `staff_id`, `starts_at`, `ends_at`, `reason`, `created_by_user_id`, `created_at`, `updated_at`.
- Relaciones: opcional a `staff`; creado por `users`.
- Datos sensibles: motivo del bloqueo si revela información personal.
- Snapshots necesarios: bloqueo considerado para rechazar/mover reservas.
- No recalcular retroactivamente: no reescribir disponibilidad consultada históricamente.

### `reservations`
- Objetivo: fuente de verdad de intención, hold, turno confirmado y estado operativo.
- Campos principales: `id`, `client_id`, `service_id`, `staff_id`, `status`, `starts_at`, `ends_at`, `payment_required_until`, `expires_at`, `expired_at`, `confirmed_at`, `cancelled_at`, `completed_at`, `no_show_at`, `source`, `version`, `created_at`, `updated_at`.
- Snapshots principales: `category_snapshot`, `service_snapshot`, `extras_snapshot`, `personalization_snapshot`, `price_snapshot`, `duration_minutes_snapshot`, `deposit_amount_snapshot`, `deposit_percentage_snapshot`, `client_name_snapshot`, `client_email_snapshot`, `client_phone_snapshot`, `client_whatsapp_snapshot`, `staff_snapshot`, `timezone_snapshot`.
- Relaciones: pertenece a `clients`, `services`, opcional `staff`; tiene muchos `payments`, `payment_events`, `notifications`, `personalization_responses`, `audit_logs`.
- Datos sensibles: contacto, servicio, preferencias, horarios y notas operativas.
- Reglas: `pending_payment` retiene slot 10 minutos; `payment_required_until = created_at + 10 minutos`; al vencer pasa a `expired` y libera slot; solo webhook `approved` antes del vencimiento pasa a `confirmed`; pago tardío va a `payment_exception`/revisión manual.
- No recalcular retroactivamente: servicio, precio, duración, seña, contacto, source y versión usados para decidir la reserva.

### `payments`
- Objetivo: registrar intentos y resultados de pago de seña por reserva.
- Campos principales: `id`, `reservation_id`, `provider`, `provider_payment_id`, `provider_preference_id`, `external_reference`, `status`, `provider_status`, `amount`, `currency`, `paid_at`, `expires_at`, `idempotency_key`, `raw_payload_ref`, `created_at`, `updated_at`.
- Relaciones: pertenece a `reservations`; muchos `payment_events`.
- Datos sensibles: ids de proveedor, payloads asociados y datos parciales de pagador si se guardan.
- Snapshots necesarios: monto, moneda, provider=`mercado_pago`, preference id, external reference, estado interno/proveedor.
- No recalcular retroactivamente: monto cobrado y conciliación no cambian salvo ajuste explícito auditado.

### `payment_events` / webhooks
- Objetivo: registrar eventos crudos y procesamiento de webhooks.
- Campos principales: `id`, `payment_id`, `reservation_id`, `provider`, `provider_event_id`, `event_type`, `provider_payment_id`, `payload_ref`, `payload`, `headers_snapshot`, `received_at`, `processed_at`, `processing_status`, `idempotency_key`, `error_message`.
- Relaciones: opcional a `payments` y `reservations`.
- Datos sensibles: payload del proveedor puede contener datos personales/de pago.
- Snapshots necesarios: payload crudo o referencia segura, headers, interpretación y resultado.
- No recalcular retroactivamente: eventos son append-only; reprocesos agregan auditoría.

### `notifications`
- Objetivo: cola lógica de notificaciones transaccionales.
- Campos principales: `id`, `reservation_id`, `client_id`, `channel`, `template_key`, `recipient_snapshot`, `payload_snapshot`, `status`, `scheduled_at`, `sent_at`, `created_at`.
- Relaciones: pertenece a `reservations`/`clients`; muchos `notification_logs`.
- Datos sensibles: destinatario y contenido.
- Snapshots necesarios: destinatario, template, variables y canal.
- No recalcular retroactivamente: mensajes enviados conservan contenido original.

### `notification_logs`
- Objetivo: auditar intentos, respuestas y errores de proveedores.
- Campos principales: `id`, `notification_id`, `provider`, `provider_message_id`, `status`, `request_payload_ref`, `response_payload_ref`, `error_message`, `attempted_at`.
- Relaciones: pertenece a `notifications`.
- Datos sensibles: payloads con contacto/contenido.
- Snapshots necesarios: request/response, proveedor y error.
- No recalcular retroactivamente: se agregan intentos; no se sobrescriben logs.

### `crm_notes`
- Objetivo: notas internas sobre clientas recurrentes y preferencias.
- Campos principales: `id`, `client_id`, `reservation_id`, `author_user_id`, `note`, `visibility`, `created_at`, `updated_at`, `deleted_at`.
- Relaciones: pertenece a `clients`, opcional `reservations`, autor `users`.
- Datos sensibles: alto; preferencias, historial y observaciones personales.
- Snapshots necesarios: autor, fecha y contexto de reserva.
- No recalcular retroactivamente: edición debe auditarse; no usar para modificar reservas pasadas.

### `client_history`
- Objetivo: vista/registro operativo de hitos de clienta.
- Campos principales: `id`, `client_id`, `reservation_id`, `event_type`, `summary`, `metadata`, `occurred_at`, `created_at`.
- Relaciones: pertenece a `clients`; opcional a `reservations`/`payments`.
- Datos sensibles: historial de atención y comportamiento.
- Snapshots necesarios: resumen del evento y metadata mínima.
- No recalcular retroactivamente: historial no cambia por nuevas reservas salvo evento correctivo auditado.

### `users`
- Objetivo: usuarios internos autenticados.
- Campos principales: `id`, `auth_provider_id`, `email`, `display_name`, `is_active`, `last_login_at`, `created_at`, `updated_at`.
- Relaciones: muchos `user_roles`; crea `audit_logs`, `crm_notes`, `blocked_times`.
- Datos sensibles: identidad y actividad interna.
- Snapshots necesarios: actor en auditoría.
- No recalcular retroactivamente: acciones pasadas mantienen usuario actor original.

### `roles`
- Objetivo: permisos para panel/API interna.
- Campos principales: `id`, `key`, `name`, `description`, `permissions`, `is_active`, `created_at`.
- Relaciones: muchos `user_roles`.
- Datos sensibles: estructura de permisos.
- Snapshots necesarios: permisos efectivos en acciones críticas.
- No recalcular retroactivamente: auditoría conserva permiso usado al actuar.

### `user_roles`
- Objetivo: asignar roles a usuarios internos.
- Campos principales: `id`, `user_id`, `role_id`, `assigned_by_user_id`, `created_at`, `revoked_at`.
- Relaciones: puente `users`/`roles`.
- Datos sensibles: permisos internos.
- Snapshots necesarios: asignación vigente al ejecutar acción.
- No recalcular retroactivamente: cambios de rol no reescriben acciones previas.

### `audit_logs`
- Objetivo: trazabilidad append-only de acciones críticas.
- Campos principales: `id`, `actor_user_id`, `actor_type`, `action`, `entity_type`, `entity_id`, `before_snapshot`, `after_snapshot`, `metadata`, `created_at`.
- Relaciones: referencia `users` cuando aplica y entidad auditada.
- Datos sensibles: puede contener datos personales y cambios operativos.
- Snapshots necesarios: before/after, actor, IP/user agent si corresponde, origen (`api`, `webhook`, `job`, `panel`).
- No recalcular retroactivamente: auditoría no se edita salvo política legal excepcional y trazada.
