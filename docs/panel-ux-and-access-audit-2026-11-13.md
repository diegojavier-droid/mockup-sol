# Sol Mai: auditoría del panel y plan de corrección

Fecha: 13 de noviembre de 2026. Objetivo: que Sol y el equipo puedan trabajar sin conocimientos informáticos, sin confundir funciones previstas con funciones utilizables.

## Conclusión

El núcleo de reservas y agenda compartida existe. El panel todavía no es el sistema integral solicitado: la navegación ofrece más de lo que está implementado, mezcla atención con dinero y no limita las fichas por profesional. No conviene resolverlo agregando más pantallas al mismo menú: primero deben quedar claras las tareas, quién puede hacerlas y qué resultado se guardó.

La instrucción más reciente de Diego es **mantener la política de 24 horas**. La propuesta de 8 horas se retiró antes de aplicarse o publicarse. La prioridad de diseño continúa siendo separar el trabajo de la profesional de la gestión de secretaría/Sol y completar los circuitos de stock, compras y caja.

## Qué se verificó y qué no

- Fuente publicada del Site privado v13 recuperada y contrastada: commit `3cf9f753`, árbol `bbd3e753`; fuente canónica equivalente `0ab6f8a`.
- Lectura de componentes, rutas, permisos, consultas y migraciones de los dos perfiles: original y Site. La revisión de código no se presenta como una nueva prueba visual.
- Consulta real de la base **Sol Mai - Pruebas Site**: ventana de devolución 24 h, seña 20%, retención de reserva 10 minutos y preparación por defecto 12 minutos. Los RPC vigentes comparan estrictamente `>` contra la ventana configurada. La instrucción posterior de Diego mantiene esta política y la lógica vigente; no se modifica ahora el comportamiento del límite exacto.
- Aislamiento comprobado con consultas agregadas: cero usuarios Auth, un propietario ficticio, cero reservas o clientas fuera del registro de procedencia del Site y cero movimientos de pago.
- El Site continúa privado y sólo para el propietario. No se habilitaron cuentas del equipo, acceso público, pagos, devoluciones ni envíos. No se tocó producción ni se publicó en GitHub.
- No hubo una nueva prueba de uso con Sol o empleadas, ni una nueva sesión visual de navegador en esta auditoría. La evidencia de navegación de v13 es anterior a este bloque.

## Hallazgos por tarea

### 1. Encontrar qué hacer hoy

**Observado:** el árbol tiene 10 módulos y 37 secciones; 17 no tienen pantalla operativa. Incluye secciones deshabilitadas en escritorio y una posición móvil de Clientas que todavía no opera. Un acceso directo a una sección pendiente explica que está en el “árbol del sistema”, lenguaje técnico que no ayuda a trabajar.

**Impacto:** la persona puede interpretar una función pendiente como un problema suyo o como algo que debería poder usar. Es una hipótesis de usabilidad sustentada en la interfaz, no una medición con usuarias.

**Cambio propuesto:** navegación diaria corta por rol; funciones pendientes fuera de la navegación operativa. Una entrada para agenda y tareas del día, otra para clientas autorizadas y otra para gestión, según permisos. La pantalla inicial definitiva sigue pendiente de la preferencia de Diego: no se da por elegida una agenda, un resumen ni una combinación.

Evidencia: `src/lib/panel-nav.ts`; `PanelShell.tsx`; `src/routes/panel/$modulo/$seccion.tsx`.

### 2. Llegar, atender y cobrar

**Observado:** “Llegó” marca `attended`; no registra el inicio real del servicio. El cierre admite una reserva confirmada y reúne servicio, duración, precio, costo y pagos en un único diálogo. El permiso de cierre depende de calendario, no de finanzas. La asignación de puesto deja de ofrecerse después de marcar llegada.

**Cambio propuesto:** ciclo operativo **llegada → inicio real → fin real → limpieza terminada**, separado del cobro. La profesional registra la atención de su turno; Sol/secretaría cobran y ajustan valores. Finalizar la atención no debe marcar un pago; cobrar no debe liberar un puesto.

La duración y limpieza reales deben influir en la disponibilidad de la web. Hoy se usa principalmente el horario planificado. La forma de confirmar limpieza, y la intervención ante olvidos o atrasos, debe validarse antes de activar nuevas reglas.

Evidencia: `AgendaScreen.tsx`; `agenda-actions.ts`; `CloseServiceDialog.tsx`; `server/src/http/middleware/permisos.ts`; `server/src/lib/availability/repository.ts`.

### 3. Ver sólo las clientas que corresponden

**Observado:** existe `bookings.staff_id`, pero la agenda consultada filtra fecha y área, no profesional asignada. El resultado incluye contacto, contexto y valores económicos. No se encontró un circuito operativo de asignación que implemente el nuevo requisito.

**Riesgo de salida:** no habilitar acceso del equipo con este contrato. No se afirma una fuga vigente entre empleadas, porque el Site actual sólo admite al propietario.

**Cambio propuesto:** alcance servidor por asignación; turnos sin responsable visibles sólo para Sol/secretaría. La profesional recibe contexto necesario de su turno, no el historial completo de una clienta ni fichas ajenas. Ocultar botones o enlaces no reemplaza estos controles.

Evidencia: migración `20260823180000_resources.sql`; `server/src/lib/admin/repository.ts`; rutas administrativas.

### 4. Cambiar servicio o precio

**Observado:** el servicio realizado es texto libre en el cierre original; en Site se limita al valor sintético. Precios y tiempos del catálogo se guardan al abandonar cada campo; un valor inválido puede volver atrás sin una explicación suficientemente explícita.

**Cambio propuesto:** distinguir “cambiar este turno” de “cambiar el catálogo”. Selección estructurada del servicio realizado y ajustes autorizados del precio final; guardar/cancelar con estados pendientes, error recuperable y confirmación. No alterar snapshots ni valores históricos cuando se actualiza el catálogo.

Evidencia: `CloseServiceDialog.tsx`; `SalonScreen.tsx`.

### 5. Stock y compras

**Observado:** Productos administra nombre, marca, precio de venta y estado, pero no representa el circuito de insumos/cantidades/mínimos/consumo. Stock, Movimientos, Proveedores y Pedidos están en el menú sin circuito funcional completo. Esta carencia está también en el original, no es sólo una restricción del Site.

**Cambio propuesto:** distinguir venta e insumo; unidad y saldo; recepción, uso, ajuste y alerta. Circuito de compras: proveedor → pedido → recepción parcial/completa → movimiento de stock → obligación de pago. Crear un pedido no debe aumentar existencias antes de recibirlo.

**Aceptación mínima:** el saldo se explica con movimientos; una recepción repetida no duplica stock; unidades incompatibles se rechazan; errores de carga se distinguen de una lista vacía.

Evidencia: `SalonScreen.tsx`; navegación; migración de catálogo operativo `20260909160000`.

### 6. Caja y cierre

**Observado:** Caja es una consulta de cobros netos por día y medio, no una apertura/cierre con efectivo contado, diferencias y responsable. “Lo que queda” no equivale al dinero físico en caja. No se encontró el flujo completo de gastos, comisiones o sueldos solicitado.

**Cambio propuesto:** separar informe de cobros del cierre de efectivo. Modelar apertura, entradas/salidas, efectivo esperado, contado, diferencia y cierre auditado; contemplar correcciones sin borrar el historial. Gastos y liquidaciones requieren sus propios hechos, no inferencias a partir de un costo de atención.

Evidencia: `CashRegisterScreen.tsx`; `GET /admin/cash-register`; migración `20260909140000`.

## Diferencias del Site que deben seguir siendo explícitas

El perfil privado reutiliza el panel original, pero restringe varias escrituras mediante `SoloLectura` y una lista de operaciones permitidas. Productos, servicios, tratamientos, promociones, puestos, devoluciones y facturación tienen límites; usuarios/roles no están habilitados como cuentas de equipo. Precios y horarios tienen operaciones de prueba específicas.

Estas restricciones no se eliminan para que parezca más completo. Deben acompañarse de una explicación breve junto a la acción afectada, sin llenar la navegación de carteles. La pantalla original, el perfil Site y el sistema integral deseado no son tres implementaciones equivalentes.

## Diseño de permisos propuesto, aún no activado

| Operación | Profesional | Secretaria | Sol |
|---|---|---|---|
| Agenda y detalle | Turnos asignados | Gestión global | Gestión global |
| Contexto de clienta | Necesario para ese turno | Gestión operativa | Gestión completa |
| Llegada/inicio/fin/limpieza | Sus turnos | Gestión general | Gestión general |
| Asignar o reasignar | No | Sí | Sí |
| Cobros, saldos, costos, devoluciones | No | Sí | Sí |
| Servicios, precios, horarios | Información operativa | Editar | Editar |
| Cuentas y permisos | No | Sin ampliación de autoridad | Control existente |

Los precios publicados en la web seguirían siendo públicos. La protección aquí se refiere a información interna de cobros, saldos, costos y resultados, no a prometer que una profesional no pueda consultar el catálogo público.

### Controles necesarios antes de abrir al equipo

1. Identidad y membresía vigentes en cada petición. El navegador nunca elige actor ni amplía alcance.
2. Todas las lecturas/escrituras por ID verifican asignación, incluidas búsquedas, notas, historial, exportaciones y errores. Una reserva sin asignación no equivale a acceso general.
3. Respuestas profesionales específicas, sin seleccionar ni devolver campos financieros. El historial completo no se concede por tener un turno de esa clienta.
4. Reasignación auditada y transaccional: la profesional anterior pierde acceso en la siguiente petición. Las escrituras vuelven a comprobar asignación dentro de la transacción.
5. No convertir automáticamente el rol actual `mostrador` en secretaria ni concederle finanzas por su nombre. El mapeo de personas y capacidades requiere decisión expresa.
6. Caché de sesión aislado, respuestas `no-store`, descarte de respuestas de cuentas anteriores. La baja de membresía corta el próximo pedido, no revierte uno ya ejecutado.
7. Mantener explícitos los límites actuales: vínculo por email, no UUID Auth; logout no garantiza revocar inmediatamente un access token ya emitido. No presentar la revisión offline como prueba de Auth real.

### Pruebas de salida

- Dos profesionales A/B: A no ve ni modifica turno/contexto de B, tampoco por ID conocido, búsqueda, historial o ruta vieja.
- Turno sin asignación: no aparece a A ni B; sí al rol operativo autorizado.
- Reasignación A→B concurrente: A pierde acceso; no acepta una escritura obsoleta.
- Downgrade/baja: se aplica al siguiente pedido; sin datos residuales tras cambio de cuenta.
- Payload con precio/cobro/costo en operación profesional: rechazado antes de la escritura.
- Datos sensibles ausentes de logs, respuestas públicas, precios/disponibilidad y cachés no autorizadas.
- Auth/DB efímeros reales y navegación de profesional/secretaria, no sólo mocks ni la identidad única del Site.

## Orden de trabajo

1. **Cancelación:** conservar 24 h por instrucción más reciente. El cambio a 8 h quedó revertido localmente; no hubo migración ni publicación. No activar devoluciones automáticas ni modificar movimientos históricos.
2. **Seguridad y atención:** asignación, alcance por profesional y separación de dinero; luego tiempos reales y limpieza.
3. **UX diaria:** navegación útil por rol, acciones próximas, guardar/cancelar explícitos y errores recuperables. Validar con tareas reales de Sol/empleadas, no con cantidad de pantallas.
4. **Gestión integral:** completar stock/compras, caja/gastos y liquidaciones en circuitos verificables.

No se amplía sin validación el modelo de reserva entre áreas: hoy admite hasta cuatro prestaciones de una misma área. Pelo y uñas siguen siendo dos turnos que deben coordinarse sin conflictos.

## Decisiones para cerrar antes de la implementación correspondiente

- Pantalla inicial preferida.
- Si hay una responsable por turno o distintas profesionales por prestación.
- Qué contexto/historial necesita cada profesional y durante cuánto tiempo.
- Cómo se confirma la limpieza y quién resuelve una demora/olvido.
- Qué cuentas corresponden a secretaría, sin inferirlo de roles anteriores.

Estas decisiones no impiden preparar el diseño, pero sí evitan activar reglas de seguridad y operación basadas en supuestos.

## Observaciones de base previas a la corrección

Los asesores de base no informaron avisos de salud. Señalaron siete funciones antiguas sin `search_path` fijado y una extensión en `public`; son pendientes de endurecimiento a evaluar, no prueba de una explotación. Las tablas privadas sin políticas de cliente permanecen cerradas y usan la API propia; no se agregan políticas abiertas para silenciar un aviso.

Referencias del proveedor: [funciones sin search_path fijo](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable), [extensiones en public](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public), [RLS sin políticas](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

Retiro verificado: el commit local de reversión `27e12fe` restaura exactamente el árbol publicado `bbd3e753`. La consulta posterior confirmó ventana 24 h, ausencia de la función propuesta de 8 h y cero pagos. El Site continúa en v13, privado, sin invitados. Los artefactos locales descartados se apartaron de las rutas de publicación; no se aplicó SQL ni se desplegó el cambio de política.
