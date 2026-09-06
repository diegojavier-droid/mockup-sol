-- =====================================================================
-- Sol Mai · Un solo camino de escritura para el cierre (G-03)
--
-- El cierre de una atención se escribía por dos lados:
--
--   * `close_service`, que registra la atención y N líneas en `payments`
--     de forma idempotente y auditada;
--   * `POST /admin/bookings/:id/execution`, un upsert directo sobre
--     `service_execution_records` que además escribía `payment_method`,
--     un enum sin `mercado_pago`, de un solo valor, sin idempotencia y
--     sin auditoría. Podía pisar el precio de un cierre ya conciliado.
--
-- Ninguna pantalla usaba el segundo. Se eliminó del backend; acá queda
-- marcada la columna que sostenía ese modelo viejo.
--
-- La columna NO se borra. Puede haber filas históricas con un medio de
-- pago anotado ahí, y borrarlas sería descartar el único registro de
-- cómo se cobró esa atención. Queda como dato histórico de sólo lectura:
-- la verdad sobre la plata vive en `payments.method`, una fila por cobro,
-- que admite pagos mixtos y distingue seña de saldo.
-- =====================================================================

comment on column public.service_execution_records.payment_method is
  'HISTÓRICO, no escribir. Modelo anterior de un solo medio de pago por atención, sin mercado_pago y sin pagos mixtos. La fuente de verdad es payments.method (una fila por cobro, con kind deposit/balance/adjustment). Se conserva por las filas ya registradas.';

comment on table public.service_execution_records is
  'Qué pasó en la atención: precio final, duración real, fórmula, costo. Se escribe únicamente desde close_service. El dinero cobrado NO vive acá sino en payments.';
