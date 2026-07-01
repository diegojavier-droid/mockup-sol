# Sol Mai Peluquería — flujo real de reserva y pago

## Objetivo

Este documento define el flujo productivo para convertir una intención de reserva en un turno confirmado mediante persistencia real, bloqueo temporal de slot, preferencia de Mercado Pago y conciliación por webhook.

## Flujo real de reserva

1. La clienta explora catálogo y selecciona categoría, servicio, extras y personalización.
2. El frontend consulta disponibilidad real al backend.
3. La clienta selecciona fecha y horario disponible.
4. El frontend envía datos de reserva al backend.
5. El backend valida servicio, extras, duración, precio, datos obligatorios y disponibilidad.
6. El backend crea una reserva `draft` o directamente `pending_payment` según el punto exacto de persistencia elegido.
7. El backend bloquea temporalmente el slot con `payment_required_until = created_at + 10 minutos`.
8. El backend crea una preferencia de Mercado Pago para esa reserva.
9. La clienta es redirigida a Mercado Pago.
10. El backend confirma, revisa o cancela estados mediante webhook y reconsulta server-to-server.
11. El frontend solo muestra el resultado conocido y consulta el estado real de la reserva.

## Estados de reserva

- `draft`: reserva iniciada pero todavía no enviada a pago o incompleta.
- `pending_payment`: reserva persistida con slot retenido y seña pendiente.
- `payment_in_review`: Mercado Pago recibió un pago que requiere revisión o no está acreditado definitivamente.
- `confirmed`: seña acreditada o aprobada según regla; el turno queda confirmado.
- `cancelled`: reserva cancelada por clienta, staff o administración.
- `expired`: la reserva no fue pagada dentro del plazo del hold.
- `completed`: el turno fue realizado.
- `no_show`: la clienta no asistió y el salón marca la ausencia.

## Transiciones entre estados

| Desde | Hacia | Disparador | Responsable |
| --- | --- | --- | --- |
| `draft` | `pending_payment` | Datos completos, slot válido y preference creada | Backend |
| `draft` | `cancelled` | Abandono explícito o limpieza operativa | Backend/job |
| `pending_payment` | `payment_in_review` | Webhook indica pago pendiente o en revisión | Backend webhook |
| `pending_payment` | `confirmed` | Webhook confirma pago aprobado/acreditado antes de `payment_required_until` | Backend webhook |
| `pending_payment` | `expired` | Vence `payment_required_until` sin pago aprobado válido | Job programado |
| `pending_payment` | `cancelled` | Cancelación manual antes del pago | Panel interno/API |
| `payment_in_review` | `confirmed` | Proveedor confirma aprobación | Backend webhook/conciliación |
| `payment_in_review` | `cancelled` | Proveedor rechaza definitivamente o cancelación manual | Backend/panel |
| `payment_in_review` | `expired` | Regla operativa decide liberar slot tras plazo máximo | Job/panel |
| `confirmed` | `cancelled` | Cancelación manual según política | Panel interno/API |
| `confirmed` | `completed` | Turno atendido | Panel interno/job asistido |
| `confirmed` | `no_show` | Clienta no asiste | Panel interno |
| `expired` | `pending_payment` | Solo si se reactiva manualmente y el slot sigue disponible | Panel interno/API |

## Bloqueo temporal de slot

Al crear una reserva pendiente de pago, el backend debe retener el slot durante 10 minutos exactos. El vencimiento operativo debe persistirse/calcularse como `payment_required_until = created_at + 10 minutos`. Durante ese período:

- el slot no debe ofrecerse a otra clienta si la capacidad quedó completa;
- la retención debe estar asociada a `reservation_id` y `payment_required_until`;
- el cálculo debe considerar duración del servicio, extras, staff, capacidad y bloqueos;
- solo un pago aprobado antes de `payment_required_until` puede confirmar la reserva;
- si el pago no llega aprobado antes del vencimiento, la reserva pasa a `expired` y el slot se libera mediante expiración.

Criterio de negocio: si una clienta no paga la seña en 10 minutos, se considera que no está suficientemente decidida sobre el servicio y no debe seguir bloqueando agenda.

## Expiración de reservas impagas

Un job programado debe buscar reservas `pending_payment` con `payment_required_until` vencido. Para cada reserva:

- reconsulta pagos asociados por seguridad;
- si no hay pago aprobado antes de `payment_required_until`, marca `expired`;
- registra auditoría;
- libera disponibilidad;
- opcionalmente envía notificación de expiración.

Las reservas `payment_in_review` pueden tener una ventana mayor o requerir revisión manual para evitar liberar un slot con pago potencialmente válido.

## Mercado Pago preference

La preference debe crearse desde backend y por reserva. Debe incluir:

- `external_reference` con `reservation_id`;
- monto exacto de seña desde snapshot;
- descripción legible del servicio;
- URLs de retorno;
- fecha de expiración compatible con el hold estricto de 10 minutos;
- metadata mínima para soporte;
- ambiente sandbox o producción según environment.

El frontend nunca debe construir montos confiables ni usar credenciales privadas.

## Webhook

El webhook debe ser el canal confiable para cambiar estados críticos. Al recibir un evento:

1. Persistir evento crudo en `payment_events`.
2. Validar autenticidad según mecanismo disponible del proveedor.
3. Aplicar idempotencia por evento y pago.
4. Consultar a Mercado Pago desde backend para obtener estado definitivo.
5. Ubicar reserva por `external_reference` o payment/preference persistidos.
6. Actualizar `payments`.
7. Actualizar `reservations` si corresponde.
8. Registrar auditoría.
9. Disparar notificaciones transaccionales.

## Idempotencia

El sistema debe tolerar webhooks duplicados, retrasados o fuera de orden. Reglas mínimas:

- `payment_events.provider_event_id` no se procesa dos veces;
- `payments.provider_payment_id` es único por proveedor;
- una reserva `confirmed` no vuelve a `pending_payment` por un evento viejo;
- cambios destructivos requieren comparación de timestamps y estado actual;
- cada transición debe ser atómica a nivel base de datos.

## Pago tardío

Un pago tardío ocurre cuando el proveedor acredita después de `payment_required_until` o después de que la reserva ya pasó a `expired`. Regla vigente:

- un pago aprobado después de `payment_required_until` no confirma automáticamente la reserva;
- si la reserva está `expired`, el pago debe marcarse como excepción manual aunque el slot siga libre;
- el sistema no debe volver a bloquear el slot ni pasar la reserva a `confirmed` sin revisión operativa;
- notificar internamente para resolver reprogramación, confirmación manual excepcional o devolución;
- registrar todo en auditoría.

## Doble pago

Un doble pago puede ocurrir por reintentos, duplicados o preferencias recreadas. Regla recomendada:

- una reserva solo puede tener un pago principal aplicado a la seña;
- pagos adicionales se registran pero quedan `requires_review` o equivalente operativo;
- no duplicar confirmaciones ni notificaciones;
- alertar al panel interno para devolución o conciliación manual.

## Retorno desde Mercado Pago

El retorno del navegador no confirma el turno. Debe usarse solo para UX:

- mostrar “estamos verificando tu pago” si el webhook aún no llegó;
- consultar el estado real al backend;
- informar `confirmed`, `payment_in_review`, `pending_payment`, `expired` o `cancelled` según base de datos;
- evitar prometer confirmación solo por volver desde una pantalla exitosa.
