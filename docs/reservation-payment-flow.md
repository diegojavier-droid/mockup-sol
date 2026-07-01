# Sol Mai Peluquería — flujo real de reserva y pago

## Objetivo

Definir el flujo productivo para convertir una intención de reserva en turno confirmado con backend, disponibilidad real, reserva persistida, hold de 10 minutos, Mercado Pago Checkout Pro, webhook, notificaciones y excepciones manuales.

## Flujo real de reserva + seña

1. Clienta elige servicio desde el frontend público.
2. Backend consulta disponibilidad real usando catálogo, duración, profesionales, horarios, bloqueos y reservas existentes.
3. Clienta elige fecha/hora disponible.
4. Clienta completa nombre, WhatsApp y email.
5. Frontend envía solicitud de reserva al backend.
6. Backend revalida servicio, precio, duración, seña, extras, datos obligatorios y disponibilidad.
7. Backend crea reserva `pending_payment` persistida.
8. Backend retiene el slot durante 10 minutos con `payment_required_until = created_at + 10 minutos`.
9. Backend crea una preference de Mercado Pago Checkout Pro para esa reserva.
10. Frontend redirige a Mercado Pago en la misma ventana.
11. Mercado Pago envía webhook al backend.
12. Si el pago llega `approved` dentro del plazo: `pending_payment -> confirmed`.
13. Si Mercado Pago informa un pago pendiente/en revisión válido iniciado antes de `payment_required_until`: `pending_payment -> payment_in_review`; no confirma el turno automáticamente.
14. Si no existe pago aprobado ni pago en revisión válido iniciado antes de `payment_required_until`: `pending_payment -> expired` y el slot se libera.
15. Si el pago aprobado llega tarde después de que la reserva ya expiró y el slot fue liberado: `payment_exception` / revisión manual; no confirmar automáticamente.
16. Confirmación por email/WhatsApp cuando la reserva pasa a `confirmed`.
17. Recordatorio por email/WhatsApp 30 minutos antes del turno.

## Regla de negocio de expiración

- Toda reserva `pending_payment` retiene slot solo por 10 minutos.
- `payment_required_until = created_at + 10 minutos`.
- Criterio: si la clienta no inicia un pago aprobado o un pago en revisión válido dentro de los 10 minutos, no debe seguir bloqueando agenda.
- Si no hay pago aprobado ni pago en revisión válido iniciado antes de `payment_required_until`, la reserva pasa a `expired` y el slot se libera.
- Si existe un pago en revisión válido iniciado antes de `payment_required_until`, la reserva pasa a `payment_in_review`, no a `expired`.
- `payment_in_review` no confirma el turno automáticamente.
- En `payment_in_review`, el slot puede mantenerse retenido por una ventana extendida definida operativamente o quedar sujeto a revisión manual; la política debe ser explícita para evitar bloqueos indefinidos.
- Solo un webhook con pago `approved` antes de `payment_required_until` puede confirmar automáticamente.
- Un pago aprobado tarde después de que la reserva ya expiró y el slot fue liberado no debe reabrir, confirmar ni volver a bloquear el slot automáticamente; debe tratarse como `payment_exception`.

## Estados de reserva

| Estado | Cuándo se usa | Transiciones permitidas | Quién dispara | ¿Bloquea slot? | Notificación |
|---|---|---|---|---|---|
| `draft` | Intención no persistida o prevalidación sin hold. | `draft -> pending_payment`; descarte sin estado final. | Frontend/backend durante creación. | No. | No. |
| `pending_payment` | Reserva persistida esperando seña. | `pending_payment -> confirmed`; `pending_payment -> expired`; `pending_payment -> cancelled`; `pending_payment -> payment_in_review`; `pending_payment -> payment_exception`. | Backend al crear; webhook; job de expiración; staff autorizado. | Sí, hasta `payment_required_until`. | Puede enviar aviso de pago pendiente. |
| `payment_in_review` | Mercado Pago informa pago pendiente/en revisión válido iniciado antes del vencimiento o requiere conciliación. No confirma el turno automáticamente. | `payment_in_review -> confirmed`; `payment_in_review -> expired`; `payment_in_review -> payment_exception`; `payment_in_review -> cancelled`. | Webhook/backend; revisión manual. | Puede mantenerse retenido por ventana extendida definida o quedar sujeto a revisión manual; debe ser explícito. | Aviso de revisión opcional. |
| `confirmed` | Pago aprobado y validado dentro del plazo, o confirmación manual auditada. | `confirmed -> cancelled`; `confirmed -> completed`; `confirmed -> no_show`. | Webhook aprobado válido; staff autorizado para casos manuales. | Sí. | Confirmación email/WhatsApp y recordatorio. |
| `cancelled` | Reserva cancelada por clienta o staff. | Estado final salvo reapertura manual auditada creando nueva reserva. | Staff autorizado o flujo de cancelación. | No. | Aviso de cancelación. |
| `expired` | No se pagó dentro de 10 minutos. | `expired -> payment_exception` si aparece pago tardío; no vuelve a `confirmed` automáticamente. | Job de expiración/backend. | No. | Aviso de expiración opcional. |
| `completed` | Servicio realizado. | Estado final. | Staff autorizado/job operativo. | No. | Opcional post-atención. |
| `no_show` | Clienta no se presenta. | Estado final salvo corrección manual auditada. | Staff autorizado. | No desde el momento en que se marca. | Opcional aviso interno. |
| `payment_exception` | Pago tardío, duplicado, inconsistente o conciliación manual. | Resolución manual: mantener, reprogramar, devolver, crear nueva reserva o confirmar excepcionalmente con auditoría. | Webhook/backend detecta; staff/owner resuelve. | No por defecto. | Alerta interna obligatoria; mensaje externo según resolución. |

## Mercado Pago Checkout Pro

### Preference por reserva

La preference debe crearse desde backend y una sola reserva debe ser la unidad de conciliación. Requisitos:

- `external_reference = reservation_id` o identificador estable equivalente.
- `metadata` con `reservationId`, ambiente, versión de contrato y datos mínimos de soporte.
- `expiration_date_from` al momento de crear preference.
- `expiration_date_to = now + 10 min`, alineado con `payment_required_until`.
- Monto exacto de seña desde snapshot de reserva.
- `back_urls.success`, `back_urls.failure`, `back_urls.pending` para UX post-pago.
- `notification_url` al endpoint backend de webhooks.
- Exclusión de medios offline que no sirven para seña con vencimiento de 10 minutos.
- `binary_mode` queda para análisis futuro; no activarlo sin evaluar efectos sobre pagos en revisión.
- Bricks/Payment Brick queda como evolución futura, no MVP.

### Seguridad

- El access token de Mercado Pago nunca debe estar en React, Lovable ni variables `VITE_`.
- El frontend no crea preferences, no calcula montos confiables y no confirma pagos.
- En mobile productivo se prefiere redirect en la misma ventana, no `window.open`.

## Webhook: única confirmación confiable

El redirect/back_url no confirma el turno; solo permite mostrar estado. El webhook sí puede confirmar si pasa validaciones.

Procesamiento mínimo:

1. Persistir evento crudo en `payment_events`.
2. Validar autenticidad/firma o mecanismo disponible del proveedor.
3. Aplicar idempotencia por `provider_event_id`, `provider_payment_id` e `idempotency_key`.
4. Reconsultar server-to-server a Mercado Pago.
5. Ubicar reserva por `external_reference`, metadata o preference persistida.
6. Actualizar `payments` con `provider_status`, estado interno, monto, moneda y `paid_at`.
7. Confirmar automáticamente solo si la reserva está `pending_payment` o estado equivalente permitido y `paid_at/approved_at <= payment_required_until`.
8. Si el pago está pendiente/en revisión y fue iniciado antes de `payment_required_until`, pasar la reserva a `payment_in_review`, no a `expired`; esto no confirma el turno automáticamente.
9. Si al vencer no hay pago aprobado ni pago en revisión válido iniciado antes de `payment_required_until`, pasar a `expired` y liberar el slot.
10. Si la reserva está `expired` o el pago aprobado llegó tarde después de que el slot fue liberado, pasar a `payment_exception` / revisión manual; no confirmar automáticamente.
11. Registrar `audit_logs` y disparar notificaciones.

## Idempotencia, duplicados y casos borde

### Pago duplicado

- No generar doble confirmación ni doble notificación.
- Una reserva tiene un pago principal aplicado a la seña.
- Pagos adicionales quedan como excepción manual para devolución, reprogramación o conciliación.

### Pago tardío

- Pago aprobado después de `payment_required_until` no confirma automáticamente.
- Si ya está `expired`, el slot queda libre y no debe rebloquearse.
- Si el pago aprobado llega tarde después de que la reserva ya expiró y el slot fue liberado, debe tratarse como `payment_exception`, no como confirmación automática.
- Debe alertarse internamente y resolverse manualmente.

### Pago pendiente/en revisión

- Si Mercado Pago informa un pago pendiente/en revisión válido iniciado antes de `payment_required_until`, la reserva debe pasar a `payment_in_review`, no a `expired`.
- `payment_in_review` no confirma el turno automáticamente.
- El slot puede mantenerse retenido por una ventana extendida definida operativamente o quedar sujeto a revisión manual.
- La política de bloqueo durante revisión debe definirse explícitamente para no bloquear agenda indefinidamente.
- Si finalmente aprueba tarde, tratar como excepción manual salvo confirmación operativa auditada.

### Webhooks fuera de orden

- Eventos viejos no deben revertir `confirmed`, `cancelled`, `expired` ni `payment_exception`.
- Transiciones críticas deben ser atómicas en base de datos.
- Cada procesamiento debe comparar estado actual, timestamps y vencimiento.
