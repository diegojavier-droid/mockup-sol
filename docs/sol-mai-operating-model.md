# Sol Mai — modelo operativo, de datos y automatización

Análisis previo a implementar. No define alcance de un bloque ni autoriza
código: define **qué información necesita el sistema, cómo se captura, quién
responde por ella, qué procesos debe resolver y dónde aplicar IA** para reducir
carga administrativa humana.

Base de contraste: `main` en `85e7e03`. Norte de producto:
`docs/sol-mai-product-context.md`. Estado técnico:
`docs/sol-mai-current-source-of-truth.md`.

## Cómo leer las clasificaciones

| Etiqueta | Significado |
| --- | --- |
| **CONFIRMADO (código)** | Verificado leyendo el repo. Se cita archivo o migración. |
| **CONFIRMADO (dirección)** | Fijado por dirección de producto o decisión ya documentada. |
| **INFERIDO** | Deducción razonable. No verificada con Sol ni con el código. |
| **PENDIENTE DE VALIDAR CON SOL** | Requiere que Sol lo confirme. No se implementa sobre supuesto. |
| **GAP TÉCNICO** | El modelo lo requiere y no existe implementación. |
| **DECISIÓN DE PRODUCTO** | Hay que elegir. No se deriva de los datos. |

Advertencia de honestidad: **no hubo entrevista con Sol, la secretaría ni las
profesionales.** Todo lo que describe cómo trabajan hoy es INFERIDO o PENDIENTE.
Lo único CONFIRMADO sobre la operación real es lo que dirección ya fijó y lo que
el código demuestra. Marcar esto no es cautela decorativa: es la diferencia
entre un modelo y una ficción ordenada.

---

# 1. Human-Centric Operating Model

## 1.1 Roles

| Rol | En el sistema | Estado |
| --- | --- | --- |
| Sol (dueña) | `staff_members.role = 'owner'`; único rol con dashboard, settings, precios, horarios | CONFIRMADO (código) — `20260822190000_staff_access.sql` |
| Empleada / secretaría | `staff_members.role = 'staff'`; agenda, alta, cierre, ausencia, estaciones | CONFIRMADO (código) |
| Profesional que atiende | `resources.kind='human'` + `staff_id`; `service_execution_records.staff_id` opcional | CONFIRMADO (código) — `20260823180000_resources.sql` |
| Clienta | `customers`; identidad opcional vía `customer_identities` | CONFIRMADO (código) |

Sólo hay **dos** roles de permiso (`owner`, `staff`). Si secretaría y
profesional necesitan permisos distintos —por ejemplo, que una profesional vea
su agenda pero no la caja— hoy no se puede expresar.
→ **PENDIENTE DE VALIDAR CON SOL** + **DECISIÓN DE PRODUCTO**.

## 1.2 Áreas y capacidad

| Área | Capacidad configurada | Reservable online |
| --- | --- | --- |
| Peluquería | 5 | sí |
| Maquillaje | 1 | sí |
| Uñas | 1 | sí |
| Depilación | 1 | sí |

CONFIRMADO (código) — seed `20260822181000`. Los valores siguen siendo
provisionales: **PENDIENTE DE VALIDAR CON SOL**.

## 1.3 Procesos, información y fricción

Cada fila: qué pasa, qué información nace ahí, y dónde duele. La columna
"estado" clasifica la **descripción del proceso**, no su implementación.

| # | Proceso | Quién | Información que genera | Fricción presunta | Estado |
| --- | --- | --- | --- | --- | --- |
| P1 | Consulta previa: explicar servicios, estimar precio y tiempo | Sol / secretaría | Ninguna que quede registrada | Alta y repetitiva; es el objetivo prioritario declarado | CONFIRMADO (dirección) |
| P2 | Acordar día y hora | Sol / secretaría | La reserva | Ida y vuelta largo antes de cerrar | CONFIRMADO (dirección) |
| P3 | Registrar la reserva | Sol / secretaría | `bookings` + `booking_items` + `customers` | Transcripción desde WhatsApp/teléfono | CONFIRMADO (dirección) |
| P4 | Recordar/confirmar el turno | Sol / secretaría | Nada estructurado | Manual; sin envío real implementado | CONFIRMADO (código): no hay proveedor de mensajería |
| P5 | Atender | Profesional | Fórmula, duración real, insumos | Conocimiento que hoy vive en la persona o en papel | INFERIDO |
| P6 | Cerrar y cobrar | Profesional / secretaría | `service_execution_records` + `payments` | Precio final ≠ estimado; medios mixtos | CONFIRMADO (código) |
| P7 | Manejar excepciones (sobreturno, ausencia, cambio) | Sol | `created_via_override`, `no_show`, `audit_log` | Decisión humana, hoy ya registrada | CONFIRMADO (código) |
| P8 | Configurar precios, tiempos, horarios | Sol | `service_price_tiers`, `business_settings`, `business_hours` | Cambios frecuentes; hoy requieren panel | CONFIRMADO (código) |
| P9 | Mirar cómo viene el mes | Sol | `dashboard_summary` (derivado) | Sin costos cargados el margen es NO DISPONIBLE | CONFIRMADO (código) |
| P10 | Recordar quién es la clienta y qué se le hizo | Sol / profesional | `customer_notes`, `recent_services` | Memoria personal, no del sistema | CONFIRMADO (código) |

**Lo que no sé y condiciona el diseño** (todo PENDIENTE DE VALIDAR CON SOL):

1. ¿Cuántas consultas por día y por qué canal? Sin esto, la métrica de carga
   evitada no tiene línea de base.
2. ¿Quién atiende WhatsApp hoy, y en qué horario?
3. ¿La secretaría existe como puesto fijo, o Sol y las profesionales se turnan?
4. ¿Las profesionales tocan algún sistema, o sólo Sol y secretaría?
5. ¿El cierre de caja es diario, y quién lo hace?
6. ¿Qué se anota hoy en papel o planilla que el sistema todavía no modela?
7. ¿Cuál es la excepción más frecuente: sobreturno, reprogramación o ausencia?

Sin (1) y (7) no se puede priorizar honestamente qué automatizar primero.

---

# 2. Multichannel Capture Model

## 2.1 Modelo canónico

Todos los canales terminan en **una** entidad y **un** camino de escritura:

```
online   ─┐
whatsapp ─┤
phone    ─┼─→  create_booking(... p_source, p_created_by ...)  ─→  bookings (1 agenda)
walk_in  ─┤         [capacidad + lock por área + auditoría]
manual   ─┘
```

CONFIRMADO (código):

- `bookings.source in ('online','manual','phone','whatsapp','walk_in')` es un
  `check` de base, no una convención — `20260823120000`.
- Los cinco canales pasan por el mismo `create_booking`; no hay un camino
  paralelo para reservas internas.
- `bookings.created_by` → `staff_members`; **null significa "la creó la
  clienta online"**, no "no sabemos".
- Sólo el canal público exige seña; los cuatro internos nacen `confirmed`. La
  regla la decide `v_is_public`, no la ausencia de la palabra `manual`.
- El sobreturno exige motivo a nivel base de datos y queda en `audit_log`.

## 2.2 Interfaz interna de captura — estado real

`src/components/booking/admin/NewBookingDialog.tsx` (309 líneas) ya pide, en
este orden: **canal → clienta (búsqueda por nombre o teléfono, o alta rápida
con nombre + teléfono) → servicio → largo → cuándo → nota → motivo (sólo si
hay excepción)**. CONFIRMADO (código).

Eso ya cumple buena parte del principio "reutilizar antes que cargar": la
búsqueda de clienta existente precede al alta.

**Lo que impide que sea rápida de verdad:**

| Hallazgo | Evidencia | Clasificación |
| --- | --- | --- |
| ~~Un solo servicio principal por reserva~~ — **RESUELTO**. `composeQuote` compone lo que `computeQuote` calcula por prestación; las tres rutas aceptan `services: [...]` y la forma singular sigue viva. | `server/src/domain/quote.ts`, `server/src/lib/quote/parts.ts` | CERRADO |
| Límite deliberado que queda: las prestaciones deben ser de la **misma área**. Un turno que mezclara peluquería con uñas ocuparía capacidad en dos áreas a la vez, y eso es un cambio del modelo de capacidad, no de cotización. Se rechaza con un mensaje que lo dice. | `parts.ts` (`mixed_areas`) | **DECISIÓN DE PRODUCTO** |
| El alta interna no pide email; la clienta queda sin canal de confirmación digital. | `NewBookingDialog.tsx` | **DECISIÓN DE PRODUCTO** (pedirlo agrega fricción; no pedirlo impide recordatorios) |
| No hay captura desde WhatsApp: el canal se **registra**, la reserva se **transcribe**. | no existe integración | **GAP TÉCNICO** + **DECISIÓN DE PRODUCTO** |

## 2.3 Trazabilidad de modificación — brecha confirmada

**RESUELTO** (`20260824140000_booking_status_traceability.sql`).

El cambio de estado pasa por `set_booking_status`, que en una sola
transacción bloquea la fila, valida la transición, escribe el estado y
registra en `audit_log` quién lo hizo. La tabla de transiciones dejó de vivir
en TypeScript: ahora hay una sola definición, en la base.

El actor es **obligatorio**: sin persona responsable la función rechaza el
cambio en vez de auditarlo a medias. Verificado contra PostgreSQL real —
incluido que el guard es lo único que sostiene la propiedad, porque
`audit_log` por sí solo acepta filas sin actor.

Y la asimetría que esto destapó —cancelar desde el panel dejaba la seña
en `paid`— quedó cerrada en `20260824150000`: cancelar con plata
acreditada exige decir si se devuelve o se retiene. No se copió la regla
de la clienta, que responde «¿avisó a tiempo?» y no corresponde cuando
cancela el salón. Se aplicó el precedente del override: el motor calcula,
la persona decide, el sistema registra — y la auditoría guarda tanto la
decisión como lo que habría dicho la regla automática, así apartarse de
la política queda visible.

## 2.4 Identidad de la clienta

- `customers.phone_e164` es **unique**: es la clave real de deduplicación.
  CONFIRMADO (código).
- El teléfono **no es autenticación**. La identidad verificada vive en
  `customer_identities` (`google`/`password`/`manual`, con `link_status`
  `linked`/`pending`). CONFIRMADO (código + dirección).
- Una clienta que da un teléfono distinto se duplica. No hay merge.
  → **GAP TÉCNICO** (bajo impacto hoy, alto cuando haya volumen).

## 2.5 Requisitos de diseño para captura interna

Derivados del principio "la complejidad vive en el sistema", no de supuestos:

1. Prellenar todo lo prellenable: fecha/hora = ahora, área = la del servicio,
   canal = el último usado en esa sesión.
2. Ningún campo obligatorio que el sistema pueda deducir o dejar en NULL con
   significado. `NULL` = "no se dijo", nunca cero ni falso por defecto —
   criterio ya aplicado en `standard_cost_amount` y `accepts_marketing`.
3. La excepción nunca se bloquea: se permite con motivo. Ya implementado.
4. Alta con **dos** datos mínimos de clienta (nombre + teléfono). Ya implementado.
5. Un servicio no debe ser el límite. → depende del GAP de §2.2.

---

# 3. Data & Information Governance

## 3.1 Inventario por clase

**Master — catálogo** (`categories`, `services`, `extras`,
`personalization_fields`, `personalization_options`, reglas y modificadores)

| Atributo | Respuesta |
| --- | --- |
| Genera / valida | Sol. **PENDIENTE DE VALIDAR CON SOL**: el catálogo vigente es seed/mock |
| Modifica | `owner` vía panel | 
| Fuente de verdad | `supabase/migrations` para el schema; la fila para el valor |
| Captura | Manual, por diseño: es la decisión comercial |
| Lifecycle | `is_active` + `deleted_at` (soft delete). CONFIRMADO |
| Automatizable | **No.** Es criterio de negocio |

**Master — clienta** (`customers`, `customer_identities`, `customer_notes`)

| Atributo | Respuesta |
| --- | --- |
| Genera | La clienta (online) o quien la da de alta (interno) |
| Valida | El teléfono, por formato E.164 y unicidad. El email, sólo si hay identidad verificada |
| Fuente de verdad | `customers.phone_e164` como clave natural |
| Captura | **Reutilización primero**: la búsqueda precede al alta. CONFIRMADO |
| Lifecycle | Sin baja ni merge definidos → **GAP TÉCNICO** |
| Automatizable | Parcial: identidad Google trae email verificado sin tipeo |

**Configuración** (`business_settings`, `business_hours`, `areas`,
`service_parameters`, `service_price_tiers`, `resources`, `staff_schedules`,
`schedule_exceptions`)

| Atributo | Respuesta |
| --- | --- |
| Genera / modifica | Sol (`owner`) |
| Fuente de verdad | La tabla, con `source` + `confidence` **por fila** |
| Trazabilidad | `parameter_history` por trigger. CONFIRMADO (código) |
| Estado del dato | Sólo **2 de 8** `business_settings` son `sol_validated`/`high`: `deposit_rate_pct` (20%) y `refund_window_hours` (24). Las otras seis son `industry_baseline` o `sol_pricelist_derived`, con confianza `low`/`medium` |
| Automatizable | **No.** Inventarlo sería inventar reglas de negocio |

Que el sistema distinga "lo dijo Sol" de "lo puso el sistema para arrancar" ya
está implementado y expuesto en `GET /admin/pending-values`. Es el mecanismo
que sostiene la restricción "la IA nunca inventa datos": **si un valor no está
validado, es consultable como no validado.**

`staff_schedules` existe en schema y **no tiene UI ni endpoint**: vacío
significa "sigue el horario del salón". → **GAP TÉCNICO** conocido y documentado.

**Transaccional** (`bookings`, `booking_items`, `payments`,
`service_execution_records`)

| Atributo | Respuesta |
| --- | --- |
| Genera | El acto de reservar, cobrar o atender |
| Inmutabilidad | `booking_items` **snapshotea** nombre, precio, duración, proceso y setup: un cambio de precio no reescribe el pasado. CONFIRMADO (código) |
| Fuente de verdad del dinero | `payments`, una fila por cobro, con `method` y `kind` (`deposit`/`balance`/`adjustment`) |
| Lifecycle | `status` con transiciones validadas; `no_show` terminal; `expired` por `expire_stale_bookings` |
| Automatizable | El importe y la duración sí (motor de cotización); el costo real no |

**Derivado** (`dashboard_summary`, `recent_services`, `effective_area_capacity`,
`check_capacity`)

Nunca se persisten: se calculan. Correcto — un derivado persistido es una
segunda fuente de verdad esperando divergir. CONFIRMADO (código).

**Auditoría** (`audit_log`, `parameter_history`)

Separadas a propósito: `parameter_history` registra cambios de configuración;
`audit_log` registra lo que las personas hacen sobre la operación. CONFIRMADO.

## 3.2 Duplicación y doble carga — hallazgos verificados

Esto es lo que el inventario buscaba. Todos CONFIRMADO (código).

**D-01 · Dos caminos de escritura para el mismo hecho, con modelos de dinero
distintos.**

| | `POST /admin/bookings/:id/close` | `POST /admin/bookings/:id/execution` |
| --- | --- | --- |
| Escribe | `service_execution_records` + N filas en `payments` | `service_execution_records` por upsert directo |
| Medio de pago | `payments.method`, incluye `mercado_pago`, admite pagos mixtos | `payment_method`, enum viejo **sin** `mercado_pago`, un solo valor |
| Idempotencia | Sí (`unique nulls not distinct (provider, provider_ref)`) | No |
| Auditoría | `record_audit` | Ninguna |

`close_service` ya **no** recibe `p_payment_method`
(`20260824100000_idempotent_service_closure.sql:48-58`), pero
`recordExecution` sigue escribiendo la columna
(`server/src/lib/admin/repository.ts:374`), y el upsert por `booking_id` envía
`final_price_amount` explícito: una llamada a `/execution` posterior a un
cierre pisaría el precio conciliado y dejaría un medio de pago fuera del ledger.

**RESUELTO** (`20260824160000`). `/execution` y `recordExecution` se
eliminaron: `close_service` es el único camino de escritura del cierre y cubre
todo lo que hacía el otro, además de exigir un precio final y un turno en
estado cerrable —que aquella ruta no pedía—, así que el modelo queda más
estricto, no sólo más limpio.

La columna `payment_method` **no se borra**: puede haber filas históricas y
descartarlas perdería el único registro de cómo se cobró esa atención. Queda
comentada en el schema como histórica de sólo lectura, y un guard de
repositorio falla si algún día vuelve a escribirse.

**D-02 · `bookings.refund_due` junto a `deposit_status`** — **RESUELTO**
(`20260824180000`). Las dos columnas siguen existiendo, porque el mensaje a la
clienta lee una y el reporting la otra, pero ya no pueden contradecirse: una
restricción de base lo impide. Se eligió la restricción antes que derivar
`refund_due` de `deposit_status`, porque eso obligaba a sacar la escritura de
tres funciones que manejan dinero para un problema que no estaba ocurriendo.
`null` sigue permitido: «no se decidió» es distinto de «no corresponde
devolver», y ésa es justo la distinción que justificó `deposit_status`.

**D-03 · Actor representado de tres formas.** `audit_log` usa `actor_id` uuid +
`actor_label` texto (correcto: sobrevive a una baja); `customer_notes.created_by`
y `service_execution_records.recorded_by` son texto libre con el email; y
`recorded_by_id` uuid coexiste con `recorded_by` texto. → **DECISIÓN DE
PRODUCTO**: unificar el patrón o declarar explícitamente que el texto es un
snapshot deliberado.

## 3.3 Regla de gobierno propuesta

Un hecho de negocio se escribe **en un solo lugar y por un solo camino**. Si
dos endpoints pueden escribir la misma fila, uno de los dos está de más o debe
delegar en el otro. D-01 es el caso a resolver primero.

---

# 4. Administrative Friction Map

Seis verbos, del enunciado de dirección. Para cada uno: qué hace hoy el
sistema y qué falta.

| Verbo | Dónde ocurre | El sistema hoy | Falta |
| --- | --- | --- | --- |
| **Explicar** | P1 — consulta previa | Catálogo público con descripciones y precios "desde" | Respuesta a preguntas en lenguaje natural. **GAP** |
| **Buscar** | P3, P10 — quién es, qué se le hizo | `GET /admin/customers`, `customer_notes`, `recent_services` | Búsqueda desde el alta ya existe; falta desde el mensaje entrante |
| **Calcular** | P1, P6 — precio, duración, seña | `POST /api/v1/quote` calcula precio, duración, proceso, setup y seña de forma determinista | **Nada.** Este es el activo más subestimado del sistema |
| **Transcribir** | P3 — de WhatsApp a la agenda | El alta interna reduce el tipeo, no lo elimina | Interpretación del mensaje. **GAP** |
| **Coordinar** | P2 — ida y vuelta de horarios | `GET /api/v1/availability` devuelve slots reales | Proponer horarios en la conversación. **GAP** |
| **Registrar repetido** | P6 — cierre | Ledger idempotente en `payments` | Resolver D-01 |

**El hallazgo central de esta sección:** el trabajo de *calcular* ya está
resuelto y es determinista. `quote` y `availability` son motores que aceptan
parámetros y devuelven respuestas exactas, con snapshot y sin ambigüedad.

Lo que falta no es capacidad de cálculo: es **traducción de lenguaje humano a
parámetros**. Eso cambia por completo qué tiene que hacer la IA.

---

# 5. AI Opportunity Map

## 5.1 Principio arquitectónico

> La IA **no calcula, no decide y no inventa**. Traduce lenguaje a parámetros,
> llama a los motores que ya existen y propone el resultado a una persona.

Precio, duración, disponibilidad y seña salen de `quote`, `availability` y
`check_capacity` — deterministas, auditables y ya probados. Si la IA no produce
ningún número por su cuenta, la restricción "nunca inventar datos" deja de
depender del modelo y pasa a ser una **propiedad de la arquitectura**.

Y cuando un dato no está validado, el sistema ya sabe decirlo: `source` +
`confidence` por fila, expuestos en `GET /admin/pending-values`.

## 5.2 Clasificación

**A · Automatización inmediata** — determinista, sin modelo, sin ambigüedad.
Se podría construir sin IA.

| Oportunidad | Insumo | Estado |
| --- | --- | --- |
| Confirmación y recordatorio de turno | `bookings` + proveedor de mensajería | Falta credencial, no código. **PENDIENTE** |
| Expirar reservas sin seña | `expire_stale_bookings` | **Ya existe** |
| Liberar capacidad al cancelar | `booking_blocks` | **Ya existe** |
| Sugerir la clienta por teléfono al abrir el alta | `customers.phone_e164` unique | **GAP TÉCNICO** menor |

**B · Asistencia IA** — el modelo interpreta, la persona confirma. Es el
núcleo del norte de producto.

| Oportunidad | Qué hace el modelo | Qué NO hace |
| --- | --- | --- |
| Alta desde mensaje: «Agendá a María para color y corte el jueves a las 15, tiene muchísimo pelo» | Extrae clienta, servicios, fecha/hora y largo → llama `quote` + `availability` → **propone** | No calcula precio ni duración; no crea la reserva sola |
| Normalizar lenguaje informal: «botox», «mechas» | Mapea a la taxonomía interna, con confianza explícita | No crea servicios nuevos ni adivina si no hay match |
| Responder consultas de catálogo | Recupera de `services`/`extras` y responde | No promete precios de servicios `subject_to_confirmation` |
| Resumir historial antes de atender | Lee `customer_notes` + `recent_services` | No infiere fórmulas ni alergias |

Bloqueo real: el ejemplo canónico pide **dos servicios principales** y el
sistema soporta uno (§2.2). **La capa de IA no puede construirse antes de
resolver ese GAP** sin quedar limitada a un caso que no es el que se pidió.

**C · Automatización futura** — requiere volumen o validación previa.

- Proponer el horario con más probabilidad de aceptación (necesita histórico).
- Estimar duración real por clienta y servicio (`actual_duration_min` ya se
  registra; hoy no hay volumen).
- Detectar riesgo de ausencia (`no_show` ya es un estado propio; sin datos aún).
- Sugerir costo estándar — **prohibido**: dirección fijó que el costo no se
  estima. Sin dato cargado, margen = NO DISPONIBLE.

**D · Intervención humana obligatoria** — no se automatiza, con o sin IA.

- Sobreturno / excepción de capacidad: ya exige motivo humano. CONFIRMADO.
- Marcar ausencia: consecuencia económica sobre la seña.
- Cambiar precios, tiempos o horarios.
- Confirmar un pago tardío después de `expired` (decisión ya documentada).
- Cualquier acción cuando el match de taxonomía es de baja confianza.

## 5.3 Precondiciones antes de escribir una línea de IA

1. Resolver el límite de un servicio por reserva (§2.2).
2. Cerrar la trazabilidad de modificación (§2.3) — si una IA va a proponer
   cambios de estado, tiene que quedar registrado quién los aprobó.
3. Definir el contrato de propuesta: una propuesta **no** es una reserva.
   Necesita entidad propia o estado propio. → **DECISIÓN DE PRODUCTO**.
4. Elegir proveedor de modelo y dónde corre (Worker, con secreto server-only).
   → **DECISIÓN DE PRODUCTO** + credencial.

---

# 6. Web → autonomía progresiva

Qué debe resolver la web sola, en orden de dificultad creciente. No se asume
que todas las clientas la usen: cada etapa **reduce** consultas, no las
elimina.

| Etapa | Qué resuelve | Estado |
| --- | --- | --- |
| 1 · Informar | Qué servicios hay, qué incluyen, precio orientativo | **Existe** — catálogo público |
| 2 · Orientar | Cuál me corresponde según pelo, largo y objetivo | Parcial: hay personalización; no hay orientación guiada. **GAP** |
| 3 · Estimar | Cuánto sale y cuánto dura *mi* caso | **Existe** — `POST /api/v1/quote`, con `fixed`/`from`/`subject_to_confirmation` |
| 4 · Recopilar | Datos de la clienta sin retipear si ya vino | Parcial: identidad Google + `recent_services`; falta credencial OAuth |
| 5 · Reservar | Elegir horario real y tomarlo | **Existe** — `availability` + `POST /bookings` |
| 6 · Señar | Pagar la seña y confirmar sola | Código listo; **falta credencial Mercado Pago** |

Las etapas 3 y 5 —las que más consultas evitan— **ya están construidas**. Las
que faltan para autonomía completa (4 y 6) están bloqueadas por credenciales,
no por código. Eso es una conclusión de priorización, no un detalle.

`subject_to_confirmation` es la pieza que hace honesta toda la escalera: la web
puede decir "esto hay que verlo" en vez de inventar un precio.

---

# 7. Gap Analysis

Contra `main` en `85e7e03`. Ordenado por lo que desbloquea.

| ID | Hallazgo | Evidencia | Clase | Bloquea |
| --- | --- | --- | --- | --- |
| ~~**G-01**~~ | ~~Un solo servicio principal por reserva~~ — **RESUELTO**: cotización, disponibilidad y alta aceptan varias prestaciones; «color y corte» ya es un turno. Sin migración: `booking_items` ya lo modelaba | `server/src/domain/quote.ts` (`composeQuote`), `server/src/lib/quote/parts.ts` | CERRADO | — |
| ~~**G-02**~~ | ~~Cambio de estado sin actor ni auditoría~~ — **RESUELTO**: `set_booking_status` valida la transición, exige actor y audita en una sola transacción | `20260824140000_booking_status_traceability.sql` | CERRADO | — |
| ~~**G-03**~~ | ~~Dos caminos de escritura del cierre~~ — **RESUELTO**: `/execution` eliminado; `close_service` es el único camino, y un guard de repositorio falla si vuelve a escribirse `payment_method` | `20260824160000_single_closure_write_path.sql` | CERRADO | — |
| **G-04** | No existe ninguna capa de IA en el repo | sin integración en `server/` ni `src/` | GAP TÉCNICO | Etapa 4 de la evolución |
| ~~**G-05**~~ | ~~No se registraba nada que permitiera medir la carga evitada~~ — **INSTRUMENTADO**: el sistema ya cuenta lo que resolvió solo y lo que necesitó a una persona. El tiempo ahorrado sigue NO DISPONIBLE: falta el dato de Sol | `20260824170000_assisted_activity.sql` | PENDIENTE DE VALIDAR CON SOL | Convertir el conteo a tiempo |
| **G-06** | WhatsApp se registra como canal pero no captura: la reserva se transcribe | sin integración | GAP TÉCNICO + DECISIÓN | Etapa 3 de la evolución |
| **G-07** | `staff_schedules` sin endpoint ni UI | `20260823180000` | GAP TÉCNICO | Agenda por profesional |
| **G-08** | Sin merge ni baja de clientas duplicadas | `customers` | GAP TÉCNICO | CRM con volumen |
| ~~**G-09**~~ | ~~`refund_due` y `deposit_status` conviven sin garantía de coherencia~~ — **RESUELTO**: una restricción de base impide que se contradigan; `null` sigue significando «no se decidió» | `20260824180000_refund_due_coherence.sql` | CERRADO | — |
| **G-10** | Dos roles de permiso; secretaría y profesional no se distinguen | `20260822190000:14` | DECISIÓN DE PRODUCTO | Permisos por puesto |
| **G-11** | Sin envío real de confirmaciones/recordatorios | documentado | PENDIENTE (credencial) | §5-A |
| **G-12** | Sin cobro real de seña | documentado | PENDIENTE (credencial) | Etapa 6 de §6 |
| **G-13** | Catálogo, precios, duraciones y capacidades son seed/mock | `source`/`confidence` por fila | PENDIENTE DE VALIDAR CON SOL | Todo lo que dependa de un número correcto |
| **G-14** | Sin línea de base de la operación real: nadie entrevistó a Sol | — | PENDIENTE DE VALIDAR CON SOL | La priorización honesta de §1 |
| ~~**G-15**~~ | ~~Cancelar desde el panel dejaba la seña en `paid`~~ — **RESUELTO**: cancelar con seña acreditada exige decidir `refund` o `retain`; el sistema no elige por Sol qué pasa con la plata | `20260824150000_cancellation_deposit_outcome.sql` | CERRADO | — |

**Lo que ya está bien y no hay que rehacer** (para que el gap analysis no se
lea como si nada funcionara): una sola agenda con cinco canales verificados por
constraint; snapshot comercial en `booking_items`; ledger de cobros idempotente;
excepción con motivo obligatorio a nivel base; auditoría separada de
configuración y de operación; `source`/`confidence` por fila; capacidad por
pico con lock por área; derivados nunca persistidos.

---

# 8. Criterio de éxito — cadena por proceso

Formato pedido: *qué ocurre hoy → qué información se genera → quién la
introduce → qué hace el sistema → qué puede hacer la IA → cuándo interviene una
persona → qué queda registrado → cuánto trabajo se evita.*

## P1 · Consulta previa (el proceso más caro)

Hoy Sol o secretaría explican por WhatsApp; **no queda registro de nada**.
→ La información que se genera hoy es cero: ése es el problema.
→ El sistema ya puede responder con catálogo y `quote` determinista.
→ La IA interpretaría la pregunta y llamaría a `quote`; nunca inventaría precio.
→ La persona interviene si el servicio es `subject_to_confirmation` o si el
match de taxonomía es de baja confianza.
→ Quedaría registrada la consulta y si terminó en reserva.
→ **Trabajo evitado: ya se cuenta, todavía no se traduce a tiempo.** El
sistema registra que la web contestó la consulta; cuántos minutos de una
persona vale eso lo sabe Sol (G-14). Decir un número sin ese dato sería
inventarlo.

## P3 · Registrar una reserva de WhatsApp

Hoy se transcribe a mano. → Genera `bookings` + `booking_items` + `customers`.
→ La introduce secretaría. → El sistema valida capacidad, aplica lock por área,
snapshotea precios y audita el override. → La IA extraería los campos del
mensaje y propondría el alta. → La persona confirma **siempre** antes de
escribir. → Queda `source='whatsapp'`, `created_by`, y el `audit_log` si hubo
excepción. → Trabajo evitado: el tipeo, no la decisión.

## P6 · Cerrar y cobrar

Hoy se registra precio final, cobros y medio de pago. → Genera
`service_execution_records` + filas en `payments`. → La introduce quien cierra.
→ El sistema concilia de forma idempotente. → La IA **no interviene**: es
dinero. → La persona hace todo. → Queda el ledger y `audit_log`. → Trabajo
evitado: la conciliación manual, ya resuelta — **una vez cerrado G-03**.

## P7 · Excepción

Hoy Sol decide de palabra. → Genera `created_via_override` + `override_reason`.
→ La introduce quien la toma. → El sistema **permite** la excepción y la
registra; nunca la bloquea en silencio. → La IA puede advertir el impacto, no
autorizarla. → La persona decide, siempre. → Queda en `audit_log`. → Trabajo
evitado: reconstruir después por qué se sobrevendió un horario.

---

# 9. Qué se necesita de Sol antes de construir

Sin estas respuestas, cualquier implementación se apoya en supuestos. Ninguna
requiere que Sol entienda el sistema.

**Sobre la operación** (desbloquea §1, §4 y la métrica de §11 del contexto):

1. ¿Cuántas consultas se responden por día, y por qué canal?
2. ¿Quién atiende WhatsApp y en qué horario?
3. ¿La secretaría es un puesto fijo?
4. ¿Qué se anota hoy en papel o planilla que el sistema no modela?
5. ¿Cuál es la excepción más frecuente?

**Sobre el negocio** (desbloquea G-13):

6. Precios, duraciones, setup y largos reales por servicio.
7. Capacidad real por área (hoy: peluquería 5, resto 1).
8. Costos estándar por servicio — sin esto el margen sigue NO DISPONIBLE.
9. Horarios por profesional, si aplica.

**Decisiones de producto** (no las decide Sol sola, pero las necesita saber):

10. ¿La IA propone y una persona confirma siempre, o hay casos de escritura
    directa? Recomendación: **siempre propone**, hasta tener volumen medido.
11. ¿Se piden permisos distintos para secretaría y profesionales? (G-10)
12. ¿Se pide email en el alta interna, aceptando fricción a cambio de poder
    mandar recordatorios?

---

# 10. Orden recomendado

No es un plan de implementación aprobado: es la dependencia técnica real.

1. ~~**G-02**~~ — hecho.
2. ~~**G-15**~~ — hecho.
3. ~~**G-03**~~ — hecho.
4. ~~**G-01**~~ — hecho en el backend. Falta que el panel y la web ofrezcan
   elegir más de una prestación: el contrato ya lo acepta.
5. ~~**G-05**~~ — instrumentado antes de automatizar, que era el punto.
   Convertir el conteo a tiempo espera la pregunta 1 de la sección 9.
6. **G-04 / G-06** — capa de asistencia y captura desde WhatsApp, recién con
   1-3 resueltos.

Credenciales (G-11, G-12) corren en paralelo: no dependen de este orden y hoy
bloquean autonomía real de la web.

---

## Alcance

Este documento no implementa nada y no aprueba alcance. Es la base para decidir
qué construir y en qué orden. Se actualiza cuando cambie el modelo, no cuando
cambie el código.
