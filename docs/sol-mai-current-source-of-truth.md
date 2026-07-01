# Sol Mai Peluquería — fuente de verdad vigente

> Estado operativo vigente del proyecto a partir de la auditoría del repo `diegojavier-droid/mockup-sol` en la rama real seleccionada para este trabajo `lovable/navigation-ux-playground`.

Este documento es la fuente de verdad vigente para alinear producto, diseño y desarrollo de Sol Mai Peluquería. Los documentos maestros anteriores se conservan como material histórico o contextual, pero no reemplazan esta lectura operativa del estado actual del repositorio y de las decisiones recientes.

## Nota sobre Codex y la rama work

En la ejecución local de Codex puede aparecer una rama llamada `work` al consultar comandos como `git branch --show-current`. Esa rama es una sandbox temporal de Codex y no debe interpretarse como la rama real del producto.

La rama real seleccionada para este trabajo en la interfaz de Codex es `lovable/navigation-ux-playground` dentro del repo `diegojavier-droid/mockup-sol`.

Para validar la rama real del producto se debe mirar la UI de Codex, GitHub, el PR asociado o el commit base de trabajo. No alcanza con mirar únicamente `git branch --show-current` dentro de la sandbox local.

## Estado vigente del producto

### Experiencia pública

- La landing pública está implementada como entrada principal para que la clienta explore el salón y pueda iniciar una reserva.
- La experiencia está planteada como mobile-first, con hero, navegación y tarjetas adaptadas a pantallas chicas antes que a escritorio.
- El catálogo público por categorías está implementado.
- Las categorías públicas actuales son:
  - Peluquería;
  - Maquillaje;
  - Uñas;
  - Depilación.
- La categoría pública de maquillaje debe mostrarse como “Maquillaje”. “Maquillaje profesional” puede usarse solo como texto descriptivo o comercial, no como nombre de categoría principal.
- Uñas está vigente como categoría pública final. “Manicura” debe quedar como servicio o subfamilia dentro de Uñas, no como nombre de categoría principal.
- Depilación está vigente como cuarta categoría pública y reservable, con alcance MVP acotado a servicios faciales simples.

### Exploración de servicios

- La clienta puede seleccionar una categoría y ver servicios asociados.
- El precio público se comunica como precio orientativo de entrada usando el criterio “Desde”.
- Existe drawer/ficha de servicio implementado para ampliar información antes de iniciar la reserva.
- La UI pública evita exponer complejidad técnica interna y prioriza intención, claridad y confianza.

### Reserva

- El wizard de reserva está implementado.
- El flujo contempla selección de servicio, personalización, extras, fecha, horario, datos de clienta y revisión final.
- El wizard solo debe mostrar pasos que pidan una decisión real o aporten claridad a la clienta: si la categoría/servicio actual no tiene campos de personalización relevantes, se omite Detalles; si no tiene extras disponibles, se omite Extras.
- La personalización por categoría/servicio está implementada.
- La selección de extras está implementada.
- El resumen final está implementado.
- Email y teléfono/WhatsApp son obligatorios para reservar.
- La UI debe explicar que esos datos se usan para enviar confirmación, enlace de seña y recordatorio del turno.
- El cálculo vigente mantiene seña del 20% sobre el total estimado.
- El estado final actual del flujo es pendiente de seña/pago: la solicitud queda en estado `pending_payment` y el turno solo debe considerarse confirmado cuando se acredita la seña.
- La confirmación queda preparada para enviarse por email y WhatsApp cuando exista backend real.
- El recordatorio queda preparado para enviarse 30 minutos antes del turno por email y WhatsApp cuando exista backend real.

## Qué es mock/local hoy

Los siguientes elementos existen para simular o validar la experiencia, pero no deben interpretarse como integración productiva real:

- Clientas recurrentes por WhatsApp/email: hay reconocimiento local/mock para probar el comportamiento, no un CRM real.
- Payload de reserva: se construye y valida localmente como contrato funcional, pero no se envía a un backend real.
- Estado `pending_payment`: representa el estado esperado del flujo, pero hoy no confirma pagos reales ni persistencia productiva.
- Datos de catálogo: servicios, categorías, extras, reglas y precios son datos locales/mock hasta validación definitiva con Sol.
- Los precios base de Depilación se cargan como seed/mock desde el archivo operativo `precios.xlsx` y no deben tratarse como precios hardcodeados definitivos.
- Disponibilidad: agenda, horarios, bloqueos y turnos existentes son mock/locales.
- No hay CRM real integrado.
- No hay backend real integrado.
- No hay pago real integrado para cobrar o acreditar la seña.
- Mercado Pago se muestra con un link ficticio temporal centralizado en configuración; el link real se reemplazará cuando Sol Mai lo tenga.
- No hay API real de email, WhatsApp ni Mercado Pago: esas integraciones quedan como evolución backend futura.

## Decisiones vigentes

- El catálogo público debe mantenerse simplificado y orientado a la clienta.
- El catálogo técnico interno debe existir separado del catálogo público.
- La clienta no debe ver toda la complejidad técnica de productos, fórmulas, líneas, reglas profesionales o combinaciones internas.
- Uñas es la categoría pública final para los servicios de uñas.
- Manicura debe usarse solo como servicio o subfamilia dentro de Uñas, no como categoría principal.
- Depilación usa los mismos horarios generales del salón, no requiere buffer entre turnos y no requiere preguntas previas obligatorias en el MVP.
- Depilación atiende con capacidad MVP de 1 clienta por turno. La excepción operativa de dos servicios de cejas simultáneos cuando atienden Ani y la dueña queda documentada, pero fuera del MVP.
- El catálogo Admin/Catálogo futuro debe permitir que la dueña o encargada edite precios, duraciones y visibilidad de servicios, especialmente por inflación y ajustes frecuentes.
- WhatsApp funciona como canal transaccional saliente para confirmaciones y recordatorios; no debe presentarse como canal principal de consulta ni competir con el flujo de reserva.
- El link de seña de Mercado Pago debe permanecer centralizado y ser reemplazable por el link real cuando esté disponible.
- Los documentos maestros anteriores quedan como históricos/contextuales, no como fuente operativa vigente.
- La fuente operativa vigente es la combinación de:
  - GitHub/repo actual;
  - rama real seleccionada para este trabajo `lovable/navigation-ux-playground`;
  - decisiones recientes documentadas en este archivo;
  - futuras decisiones explícitas que actualicen esta fuente de verdad.

## Transición a producto real

- El mock frontend queda congelado salvo bugs críticos que bloqueen la validación o dañen la experiencia pública ya aprobada.
- Lovable queda como herramienta de UI/preview, no como fuente de arquitectura productiva ni de reglas críticas de negocio.
- Codex/GitHub gobiernan la arquitectura real, la documentación ejecutable, los contratos técnicos y la evolución hacia backend productivo.
- La próxima etapa es backend + base de datos + auth + reservas reales, con persistencia y disponibilidad calculada del lado servidor.
- Mercado Pago real va después de tener reservas persistidas y estados confiables sobre los cuales crear una preferencia por reserva.
- CRM y clientas recurrentes van después de reservas/pagos reales, para evitar construir memoria operativa sobre datos mock.

## Pendientes

- Validar catálogo real con Sol antes de convertirlo en dataset definitivo.
- Implementar en una fase Admin/Catálogo la edición de precios, duraciones y visibilidad de servicios.
- Definir flujo real para clientas recurrentes, incluyendo criterios de identificación, privacidad, recuperación de datos y eventual CRM.
- Definir integración real de seña/pago, proveedor, confirmación, estados y conciliación operativa.
- Implementar API/backend real para enviar confirmaciones y recordatorios por email y WhatsApp.
- Crear estrategia para futuras categorías sin sobrecargar el catálogo público.
- Separar formalmente catálogo público, catálogo técnico y catálogo operativo.

## Depilación — seed/mock vigente

Servicios iniciales de Depilación cargados con precios actuales tomados de `precios.xlsx`:

- Rostro completo / Depi rostro completo: 30 min, desde $30.000.
- Cejas: 15 min, desde $12.000.
- Bigote: 10 min, desde $5.000.
- Bozo / bigote y mentón: 15 min, desde $11.500.

Notas operativas:

- El tiempo puede variar según si se trabaja con pinza o cera.
- La capacidad MVP es 1 clienta por turno.
- No se implementa selección de profesional.
- No se implementa doble capacidad para cejas en MVP.
- No hay extras inventados para Depilación.
- No hay preguntas previas obligatorias de piel, alergias o tratamientos en MVP.

## Alcance de este documento

Este documento no modifica componentes, hooks, schemas, estilos ni lógica. Su objetivo es ordenar el estado vigente del producto y evitar que documentación histórica, mocks o particularidades de la sandbox de Codex sean confundidas con la fuente operativa actual.

## Regla de mantenimiento

Este documento debe actualizarse cuando un PR cambie decisiones de producto, alcance funcional, estado de mocks, flujo de reserva, catálogo, pagos, CRM o categorías.
