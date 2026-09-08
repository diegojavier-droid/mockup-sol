# Arquitectura modular de Sol Mai

**Estado:** definición de arquitectura. Reemplaza el encuadre de
`docs/sol-mai-crm.md`, que trataba al CRM como si fuera todo el panel. El
CRM pasa a ser **uno de nueve módulos**, no el centro.
**Fecha:** 2026-09-08
**Origen:** dirección de producto (Diego): «quiero hacerlo más modular con
módulos como calendario, clientas, finanzas, CRM, productos, empleados,
proveedores, usuarios y roles», con el objetivo declarado de **mayor
trazabilidad**.

---

## 1. La decisión y lo que la hace difícil

El sistema se organiza en nueve módulos con límites explícitos. Cada uno
es dueño de sus datos y nadie escribe en las tablas de otro.

La tensión que hay que resolver, y que este documento resuelve de una
manera concreta: **más módulos en la pantalla es más trabajo para Sol**, y
el norte del producto desde el primer día es que Sol toque menos cosas,
no más. Nueve pestañas en un panel que hoy tiene dos serían un retroceso
si cada una pidiera carga manual.

La salida no es construir menos módulos. Es que **los módulos sean vistas
de hechos que ya ocurrieron, no formularios que alguien tiene que
llenar**. Un turno que se cierra alimenta a la vez a Calendario, Clientas,
Finanzas, CRM y Empleados sin que nadie escriba nada dos veces. Ése es el
criterio con el que está armado todo lo que sigue.

---

## 2. Lo que ya existe (medido sobre el repo, no estimado)

28 tablas, 9 módulos de rutas HTTP, 10 de librería, 4 rutas de frontend
(`/`, `/agenda`, `/operaciones`, `/reserva/$token`).

| Módulo | Datos | API | Pantalla |
|---|---|---|---|
| **Calendario** | Completo | Completa | **Sí** (`/agenda`) |
| **Clientas** | Completo | Completa | **No** |
| **Finanzas** | Parcial | Parcial | Parcial (`/operaciones`) |
| **CRM** | Se deriva de Clientas | No | No |
| **Productos** | **No existe** | No | No |
| **Empleados** | Parcial | No | No |
| **Proveedores** | **No existe** | No | No |
| **Usuarios y roles** | Parcial | Parcial | No |
| **Trazabilidad** | Parcial | **No existe** | No |

Dos lecturas importantes de esta tabla:

1. **Clientas está entero en el backend y no lo muestra nadie.** La ficha
   devuelve los últimos 50 turnos con precio de cierre real y fórmula, más
   las notas. Falta la pantalla, no el sistema.
2. **La trazabilidad se está escribiendo para nadie.** `audit_log` tiene
   actor, acción, entidad, detalle en JSON, fecha y tres índices. No hay
   un solo endpoint que la lea.

---

## 3. La pieza que sostiene la modularidad: el registro de hechos

Sin esto, nueve módulos son nueve islas que se contradicen.

Todo lo que pasa en la peluquería es un hecho con fecha, autor y motivo:
se reservó un turno, se pagó una seña, la clienta llegó, se cerró a tal
precio con tal fórmula, se devolvió la seña, se compró mercadería, se
liquidó una quincena. `audit_log` ya es ese registro, a medias.

**Hoy audita seis acciones:** `booking_created`, `booking_status_changed`,
`no_show_marked`, `service_closed`, `capacity_override`,
`refund_completed`.

**Faltan tres que tocan plata o agenda**, y son las que hacen falta para
que «mayor trazabilidad» sea verdad y no una intención:

- el **precio** que se puso al cerrar, cuando difiere del estimado;
- la **reprogramación** de un turno (de cuándo a cuándo, y quién);
- la **excepción de agenda** (quién cerró un día y por qué).

Con eso, cada módulo deja de tener su propia historia paralela: **hay una
sola historia y cada módulo la mira por su ventana.** La ficha de la
clienta, la caja del día y el informe de ausencias son tres consultas
sobre los mismos hechos, no tres bases que hay que sincronizar.

Esto además es lo que habilita a la IA. La IA lee hechos, no pantallas.

---

## 4. Cómo se ven los módulos

Dirección lo planteó así: «un formato estilo Odoo pero simple, para que le
den uso personas que no tienen educación formal en esto. Estoy viendo
muchos sistemas que seguramente son difíciles de vender, porque parece que
tenés que ser ingeniero aeroespacial para entenderlos.»

Vale la pena precisar por qué esos sistemas son difíciles, porque el
diagnóstico decide el remedio. **No son difíciles por tener muchos
módulos. Son difíciles porque exigen modelar el negocio antes de poder
usarlo** —plan de cuentas, diarios, impuestos, unidades de medida— y
porque hablan en vocabulario contable, no en el del oficio. Por eso
necesitan un consultor que los implemente, y por eso cuestan lo que
cuestan. La versión simple no es «lo mismo con menos botones»: es que esa
exigencia no exista.

De ahí seis reglas. Cada módulo se aprueba o se rechaza contra ellas.

1. **El vocabulario es el del salón.** Sol dice turno, seña, compré
   shampoo, le devolví la plata. Nunca asiento, tercero, orden de compra,
   partida, ejercicio.
2. **Cero configuración antes de usar.** Cada módulo funciona el primer
   día con lo que ya hay en la base. La configuración aparece cuando la
   persona choca con la necesidad, no antes.
3. **Cada pantalla contesta una pregunta que alguien dice en voz alta.**
   «¿Cuánto entró hoy?», «¿quién viene mañana?», «¿qué le hice la última
   vez?». Si una pantalla no contesta una pregunta hablada, no va.
4. **No hay una secuencia que haya que aprender.** En un ERP hay que saber
   que primero va el presupuesto, después el pedido, después el remito,
   después la factura. Acá todo cuelga del turno, que es algo que pasa
   solo.
5. **Se puede deshacer.** Quien no estudió esto aprende probando. Un
   sistema que castiga probar no se aprende: se evita. Deshacer, no
   carteles de confirmación.
6. **Los números salen de hechos, no de cargas.** Nadie «cierra el mes».
   Si un número necesita que alguien lo cargue para existir, ese número
   está mal diseñado.

**La prueba que resuelve las discusiones:** la secretaria que entró ayer se
sienta sola frente a la pantalla. Si necesita que alguien le explique,
la pantalla está mal. No la persona.

### 4.1. Las dos mitades del producto no son lo mismo

Dirección también separó dos cosas que veníamos tratando juntas:

- **La web de las clientas** existe para que Sol y la secretaria se
  descarguen de las charlas largas explicando servicios.
- **Los módulos de gestión** existen para operar el salón.

La separación es correcta y tiene una consecuencia que conviene aprovechar:
**las dos mitades necesitan el mismo conocimiento.** Lo que la web le
pregunta a la clienta —largo, estado del pelo, alergias— es exactamente lo
que la secretaria tiene que preguntar cuando atiende el teléfono.

**Hallazgo (verificado en el código, 2026-09-08):** hoy no se aprovecha, y
está al revés. La web pregunta 14 campos de personalización con 49
opciones y 209 reglas por servicio. El diálogo de turno nuevo del panel
—el que usa la secretaria al teléfono— pregunta cinco cosas: servicio,
largo del pelo, nombre, teléfono y cuándo. **La persona que atiende
recibe menos ayuda que la clienta que reserva sola**, y tiene que acordarse
de memoria de lo que el sistema ya sabe preguntar.

Corregirlo es reutilizar el motor que ya existe, no escribir uno nuevo. Y
es la forma más directa de que el panel se sienta asistido en vez de
burocrático: la primera pantalla de gestión que mejora es la que ya está.

### 4.2. Lo que ya se está midiendo de esto

`assisted_activity_daily` cuenta lo que la web resolvió sin que
interviniera una persona: `quote_self_service` y
`availability_self_service`. Es la métrica de carga administrativa
evitada, y ya está corriendo.

Le faltan dos cosas para servir a la separación de arriba: no cuenta las
reservas completadas sin intervención, y no cuenta nada de lo que pasa por
el panel. Sin ese segundo número no se puede saber si la web está
descargando trabajo o sólo moviéndolo de lugar.

---

## 5. Los nueve módulos

### 5.1. Calendario

**Es dueño de:** `bookings`, `booking_items`, `business_hours`,
`schedule_exceptions`, `resources`, `resource_blocks`.

**Estado:** el único módulo terminado. Agenda del día, puestos, bloqueos,
capacidad, marcar llegada, ausencia automática, señas por devolver.

**Falta:** reprogramar un turno desde el panel, y que esa reprogramación
quede auditada.

---

### 5.2. Clientas

**Es dueño de:** `customers`, `customer_identities`, `customer_notes`.

**Estado:** backend completo (buscar, ficha con historial y notas,
escribir notas). **Cero pantalla.**

**Qué muestra:** quién es, cada cuánto viene —calculado de los turnos, no
cargado a mano—, qué se hizo la última vez con su fórmula y su precio de
cierre real, el historial, y un campo libre para notas.

**Qué no muestra:** puntajes, clasificación, valor de vida proyectado,
etiquetas, campos personalizados. El detalle y los motivos están en
`docs/sol-mai-crm.md` §4 y siguen valiendo.

---

### 5.3. Finanzas

**Es dueño de:** `payments`, y la parte de dinero de
`service_execution_records` (`final_price_amount`, `payment_method`).

**Estado:** entra plata y se registra. **No hay caja.**

**Hallazgo:** `service_execution_records` ya guarda `payment_method` en
cada cierre. **La caja del día se puede calcular hoy mismo, sin una tabla
nueva y sin que Sol cargue nada:** cuánto entró, por qué medio, cuánto
fue seña y cuánto se cobró en el local.

**Falta como tabla nueva:** gastos. Es lo único de Finanzas que no se
deriva de un turno, porque no nace de un turno.

Se mantiene la regla ya fijada: **no se muestran márgenes ni costos que no
estén cargados.** Si no hay dato, dice «no disponible», no lo estima.

---

### 5.4. CRM

**No es dueño de ninguna tabla.** Es lo que se *hace* con Clientas.

La distinción con la que trabajo, y que corregí si no es la tuya:
**Clientas es el registro** —quién es, qué se le hizo, cuánto pagó—;
**CRM es el seguimiento** —a quién conviene escribirle y con qué texto—.
Mismos datos, dos trabajos distintos, y por eso dos módulos.

**Qué hace:** la lista de quienes se pasaron de su propio ritmo, y el
botón que abre WhatsApp con el mensaje ya redactado.

**Las tres reglas que no se negocian:** la IA no inventa un dato, no le
escribe a nadie sola —redacta, manda Sol—, y no clasifica personas.

---

### 5.5. Productos

**No existe nada.** Tablas nuevas: productos, movimientos de stock.

**Dónde se conecta:** al cierre de un turno. Si un servicio consumió
producto, sale del stock ahí, sin una carga aparte. Y la venta de un
producto a una clienta entra por Finanzas como cualquier otro cobro.

**El riesgo, dicho de frente:** el inventario es el módulo que más se
abandona en un salón chico. Si exige contar todo cada semana, a los dos
meses el número miente y es peor que no tenerlo. Recomiendo arrancar sólo
con **lo que se vende**, no con lo que se consume: son pocos artículos,
el movimiento es inequívoco y el número se sostiene solo.

---

### 5.6. Empleados

**Es dueño de:** `staff_members`, `staff_schedules`, `staff_specialties`.

**Estado:** las tablas existen y se usan para saber quién atiende qué. No
hay pantalla ni liquidación.

**Falta:** comisiones. Y ahí hay un dato que **no vamos a inventar**: no
sabemos cómo le paga Sol a quien la ayuda. Se construye la capacidad
técnica; el porcentaje lo carga ella.

**Lo que sí se puede hacer hoy sin dato nuevo:** cuánto facturó cada
persona en un período, porque `service_execution_records` ya guarda
`recorded_by` en cada cierre.

---

### 5.7. Proveedores

**No existe nada.** Tabla nueva: proveedores, y compras asociadas a
proveedor y a producto.

Es el módulo con menos urgencia de los nueve: hoy no hay ningún dato de
proveedor en el sistema ni ningún flujo que lo pida.

---

### 5.8. Usuarios y roles

**Es dueño de:** `staff_members.role` (`owner` | `staff`) y la lista de
emails habilitados.

**Estado:** hay dos roles y una puerta. Para entrar al panel el email
tiene que estar **a la vez** en `INTERNAL_AUTH_ALLOWED_EMAILS` y en
`staff_members`. Los dos roles hoy ven exactamente lo mismo.

**Por qué esto deja de ser un detalle apenas haya módulos:** hoy el panel
muestra agenda y operaciones, y no es grave que la secretaria vea lo
mismo que Sol. Con Finanzas, Empleados y Proveedores adentro, sí lo es.
**La secretaria tiene que poder trabajar el día sin ver la facturación ni
los sueldos.**

Por eso este módulo no es el noveno de la lista: **es condición para
construir Finanzas y Empleados.** Va antes que ellos, no después.

Regla que se mantiene: **el teléfono no es autenticación.**

---

### 5.9. Trazabilidad

**Es dueño de:** `audit_log`.

No es un módulo que Sol abra todos los días. Es la respuesta a «¿quién
cambió esto?» cuando algo no cuadra, y es lo que pediste explícitamente.

**Qué falta:** las tres acciones sin auditar de §3, un endpoint que lea el
historial de una entidad, y mostrarlo dentro de cada módulo —la historia
del turno en el turno, la de la clienta en su ficha— en vez de una
pantalla de log que nadie mira.

---

## 6. Orden de construcción

El criterio no es la dificultad: es **cuánto trabajo administrativo le
saca a Sol cada bloque**, con las dependencias respetadas.

| # | Bloque | Por qué acá |
|---|---|---|
| 1 | Cerrar los agujeros de auditoría (precio, reprogramación, excepciones) | Es barato, es lo que se pidió, y todo lo demás se apoya en esto |
| 2 | Ver el historial de un turno y de una clienta | Convierte el registro invisible en algo que se usa |
| 3 | **El panel pregunta lo mismo que la web al tomar un turno** | Reutiliza un motor que ya existe; es la mitad del producto que dirección quiere descargar, y hoy está al revés (§4.1) |
| 4 | **Usuarios y roles de verdad** | Sin esto no se puede mostrar plata en un panel compartido |
| 5 | **Finanzas: caja del día** | Es lo que Sol mira todos los días, y ya se puede calcular sin datos nuevos |
| 6 | **Clientas: la pantalla de la ficha** | El backend está entero; es la mayor devolución por el menor trabajo |
| 7 | Finanzas: gastos | Primera tabla nueva |
| 8 | CRM: quiénes se pasaron de su ritmo + WhatsApp redactado | Necesita historial suficiente para no equivocarse |
| 9 | Empleados: producción y liquidación | Necesita el porcentaje, que es dato de Sol |
| 10 | Productos, arrancando por lo que se vende | El de mayor riesgo de abandono |
| 11 | Proveedores | Ninguna urgencia hoy |

Reordenar esto es una decisión de dirección, no técnica. Lo único que no
recomiendo mover es el 4 antes del 5: mostrar facturación en un panel sin
roles es exponerla a quien no corresponde.

---

## 7. Riesgos abiertos

- **Nueve pestañas.** El fracaso posible de esta arquitectura no es
  técnico: es que el panel se vuelva un ERP y Sol vuelva al cuaderno. El
  antídoto está en §1 y hay que sostenerlo bloque por bloque: si un módulo
  pide carga manual que no nace de un turno, hay que discutirlo antes de
  construirlo.
- **Productos e inventario** es el candidato número uno a abandonarse.
- **Comisiones** depende de un dato que Sol todavía no dio.
- **`docs/sol-mai-crm.md`** queda vigente en su contenido (qué muestra y
  qué no la ficha), pero su encuadre —«el CRM es el panel»— lo reemplaza
  este documento.

---

## 8. Decisiones que necesito de dirección

1. **¿Clientas y CRM son dos módulos o uno?** Trabajo con la separación de
   §5.4: registro vs. seguimiento. Decime si tu división es otra.
2. **¿Qué ve la secretaria y qué no?** Mi propuesta: Calendario y Clientas
   sí; Finanzas, Empleados, Proveedores y Trazabilidad no.
3. **¿Productos arranca por reventa o también por consumo interno?**
   Recomiendo sólo reventa.
4. **Sigue abierta de antes:** ¿«marcar el aviso es obligatorio» significa
   la llegada, o registrar cuando una clienta avisa por WhatsApp que no
   viene? La segunda esconde un defecto real: hoy la ventana de 24 h se
   cuenta desde que Sol carga el aviso, no desde que la clienta avisó.
