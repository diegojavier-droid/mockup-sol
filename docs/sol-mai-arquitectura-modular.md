# Arquitectura modular de Sol Mai

**Estado:** definición de arquitectura. Reemplaza el encuadre de
`docs/sol-mai-crm.md`, que trataba al CRM como si fuera todo el panel. El
CRM deja de ser el centro: pasa a ser parte del módulo Clientas (§11.1).
**Fecha:** 2026-09-08
**Origen:** dirección de producto (Diego): «quiero hacerlo más modular con
módulos como calendario, clientas, finanzas, CRM, productos, empleados,
proveedores, usuarios y roles», con el objetivo declarado de **mayor
trazabilidad**.

---

## 1. La decisión y lo que la hace difícil

El sistema se organiza en ocho módulos con límites explícitos. Cada uno
es dueño de sus datos y nadie escribe en las tablas de otro.

La tensión que hay que resolver, y que este documento resuelve de una
manera concreta: **más módulos en la pantalla es más trabajo para Sol**, y
el norte del producto desde el primer día es que Sol toque menos cosas,
no más. Ocho pestañas en un panel que hoy tiene dos serían un retroceso
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

| Módulo                                         | Datos         | API                 | Pantalla                 |
| ---------------------------------------------- | ------------- | ------------------- | ------------------------ |
| **Calendario**                                 | Completo      | Completa            | **Sí** (`/agenda`)       |
| **Clientas**                                   | Completo      | Completa            | **No**                   |
| **Finanzas**                                   | Parcial       | Parcial             | Parcial (`/operaciones`) |
| **Productos y stock**                          | Parcial       | Parcial             | Parcial (`/agenda`)      |
| **El salón** (servicios, estaciones, horarios) | Completo      | Lectura y escritura | **Sí** (`/agenda`)       |
| **Empleados**                                  | Parcial       | No                  | No                       |
| **Proveedores**                                | **No existe** | No                  | No                       |
| **Usuarios y roles**                           | Parcial       | Parcial             | No                       |
| **Trazabilidad**                               | Parcial       | **No existe**       | No                       |

La tabla se actualizó el 2026-09-09, cuando el bloque 2 abrió la escritura
del catálogo: «El salón» ya no es de sólo lectura y tiene pantalla, y
Productos existe con alta, precio y archivado —falta el stock, que es la
otra mitad del módulo—.

Dos lecturas importantes de esta tabla:

1. **Clientas está entero en el backend y no lo muestra nadie.** La ficha
   devuelve los últimos 50 turnos con precio de cierre real y fórmula, más
   las notas. Falta la pantalla, no el sistema.
2. **La trazabilidad se está escribiendo para nadie.** `audit_log` tiene
   actor, acción, entidad, detalle en JSON, fecha y tres índices. No hay
   un solo endpoint que la lea.

---

## 3. La pieza que sostiene la modularidad: el registro de hechos

Sin esto, ocho módulos son ocho islas que se contradicen.

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

## 5. Los módulos, agrupados por con qué frecuencia se tocan

Dirección sumó tres módulos que faltaban: **servicios**, **estaciones** y
**productos**, con un motivo explícito —«los servicios pueden cambiar, las
estaciones también y los productos también»— y con el modelo de precio
real del salón, que está en §5.10.

Eso llevaría la cuenta a once, y once pestañas al mismo nivel es
exactamente el retroceso que §1 quiere evitar. La salida no es recortar
módulos: es **ordenarlos por cada cuánto se tocan**, que es como los
ordena en la cabeza quien los usa.

| Se toca                              | Módulos                                                              |
| ------------------------------------ | -------------------------------------------------------------------- |
| **Todos los días**                   | Calendario · Clientas · Caja · Productos                             |
| **Cada tanto**                       | El salón (servicios, estaciones, horarios) · Empleados · Proveedores |
| **Casi nunca, pero tiene que estar** | Usuarios y roles · Trazabilidad                                      |

Dos consecuencias de esta agrupación:

- **Servicios y estaciones son un mismo módulo, «El salón».** Los dos son
  «cómo está armado esto», los dos se tocan cada varios meses, y separarlos
  produce dos pantallas casi vacías. Los horarios, que ya se editan por
  migración, se suman ahí.
- **Productos es módulo propio y de uso diario**, porque entra mercadería,
  se vende y se usa en cada turno. No es configuración: es operación.

---

### 5.0. Módulo por módulo

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

**Absorbe lo que iba a ser el módulo CRM** (§11.1): un filtro de quiénes se
pasaron de su propio ritmo, y un botón que abre WhatsApp con el mensaje ya
redactado. Tres reglas que no se negocian: la IA no inventa un dato, no le
escribe a nadie sola —redacta, manda Sol— y no clasifica personas.

---

### 5.3. Finanzas

**Es dueño de:** `payments`, y la parte de dinero de
`service_execution_records` (`final_price_amount`, `payment_method`).

**Estado:** entra plata y se registra. **No hay caja.**

**La caja del día está construida (2026-09-09)** y confirmó el hallazgo:
salió entera de `payments`, que ya guarda medio, concepto y momento de
cada cobro. Cero tablas nuevas, cero carga manual.

Una decisión que quedó tomada al construirla: **la caja se agrupa por
cuándo entró la plata, no por el día del turno.** El dashboard responde
«cuánto generó la jornada del martes»; la caja responde «qué hay hoy», y
una seña pagada hoy por un turno de la semana que viene entró hoy.
También muestra las devoluciones aparte en vez de netearlas en silencio:
entró, salió, queda.

**Falta como tabla nueva:** gastos. Es lo único de Finanzas que no se
deriva de un turno, porque no nace de un turno.

Se mantiene la regla ya fijada: **no se muestran márgenes ni costos que no
estén cargados.** Si no hay dato, dice «no disponible», no lo estima.

---

### 5.4. Productos y stock

**No existe nada.** Tablas nuevas: productos y movimientos de stock.

Dirección pidió explícitamente el stock. Va, y el trabajo de diseño está
en que **sobreviva**, porque el inventario es el módulo que más se
abandona en un negocio chico.

**Tres usos, y los tres importan:**

- **Reventa:** Sol le vende productos a la clienta. Entra por Caja.
- **Consumo en el servicio:** el producto usado **cambia el precio del
  turno** (§5.10). Es el motivo por el que este módulo existe.
- **Reposición:** avisar antes de que se acabe.

#### El stock no se carga: se deriva

Nadie escribe «quedan 4». El número sale de los movimientos, y los tres
movimientos ya ocurren por otro motivo:

| Movimiento       | De dónde sale                                   |
| ---------------- | ----------------------------------------------- |
| Entra            | Una compra a un proveedor                       |
| Sale por venta   | El cobro que ya se registra en Caja             |
| Sale por consumo | El cierre del turno, donde Sol ya elige qué usó |

**Ninguno agrega una carga nueva.** Ése es el criterio de §4 regla 6
aplicado al módulo que más lo necesita.

#### El problema real, dicho antes de construirlo

Elegir «usé tal tintura» no dice **cuánta** se usó. Sin cantidad, el stock
se desvía. Y un stock que se desvía en silencio es peor que no tener
stock: dice un número que nadie puede creer, y por eso se abandona.

**Cómo se resuelve sin obligar a contar:**

1. **Consumo estándar por servicio.** Sol carga una vez cuánto lleva un
   color de raíz. Después el consumo se descuenta solo. Es un dato que da
   ella, no un valor inventado por nosotros.
2. **El recuento es un ajuste, no una obligación semanal.** Cuando Sol
   cuenta, corrige. Nadie le pide que cuente.
3. **El desvío se muestra.** Al corregir, el sistema dice cuánto se había
   desviado. Sirve para dos cosas: ajustar el consumo estándar, y ver si
   algo se está yendo por otro lado.
4. **El número nunca se muestra solo.** Se muestra con la fecha del último
   recuento: «quedan 4, contados hace tres semanas». Un stock derivado
   siempre tiene error; **lo único inaceptable es esconderlo.**

#### Qué hace que valga la pena

No es el informe de inventario: es **«te queda poco de esto»** antes de
que se acabe, y saber cuánto cuesta de verdad un servicio. Si el módulo no
da esas dos cosas, no justifica existir.

**Stock y Productos son un solo módulo.** El producto y cuánto queda son
la misma pantalla; separarlos son dos listas iguales en dos lugares.

---

### 5.5. El salón (servicios, estaciones y horarios)

**Es dueño de:** `services`, `categories`, `service_price_tiers`, `extras`,
`service_parameters`, las tablas de personalización, `resources` y
`business_hours`.

**Hallazgo (verificado en el código, 2026-09-08):** **no existe un solo
endpoint que escriba en el catálogo.** Cambiar un precio, un servicio, una
duración, un extra, una estación o un horario requiere hoy una migración
SQL y un deploy.

Dicho sin vueltas: **Sol no puede subir un precio sin que yo intervenga.**
En un país con la inflación que tiene Argentina eso no es una incomodidad,
es un bloqueo operativo, y explica por qué dirección pidió «libertad para
cambiar esto». La pedía porque hoy no la tiene.

Lo mismo con las estaciones: existen `GET /stations`, asignar un turno a
una estación y bloquearla, pero el alta, la baja y el renombre salen de
`20260823180000_resources.sql`. Si Sol suma un lavatorio, hace falta un
deploy.

**Lo que hay que cuidar al abrirlo:** el catálogo tiene reglas de
integridad reales —209 reglas de personalización, tramos de precio por
largo, modificadores— y una pantalla de edición ingenua las rompe en
silencio. Editar precio y duración es simple y va primero. Editar la
estructura de preguntas de un servicio es otro problema y va después.

**Regla que se mantiene:** un precio que cambia no reescribe el pasado. Lo
que se cobró en un turno cerrado ya está guardado en el cierre y no se
toca.

**Estado (2026-09-09):** resuelto. `set_service_price`, `upsert_station`,
`set_station_active`, `upsert_product` y `set_product_active` existen en la
base, la pantalla «El salón» las usa, y cada cambio queda auditado con
actor, valor anterior y valor nuevo. Sol cambia un precio sin que nadie
despliegue nada.

---

### 5.5.1. El asistente: por qué el modelo no calcula precios

Cambiar un precio es fácil —es un campo, está ahí—. Cambiar treinta es una
tarde, y por eso no se hace: cuando sube un producto o el alquiler, la
lista queda vieja. Ese es el problema que resuelve el asistente, no
«ponerle IA».

La decisión que ordena la implementación: **el modelo entiende la frase, el
servidor hace las cuentas.** Sol escribe «subí un 15% todo peluquería» y el
modelo devuelve sólo una intención —qué alcance, qué operación, qué
redondeo—. Ningún precio sale del modelo.

No es prolijidad. Un modelo que multiplica precios se equivoca en silencio
y el error llega a la clienta. Uno que sólo interpreta se equivoca de forma
visible: la propuesta se muestra entera —cada servicio, antes y ahora—
antes de escribir nada, y la aritmética está en una función pura con tests.

Tres consecuencias:

- **Es la única pantalla del panel con confirmación.** Se la gana: en un
  cambio de a uno el error se ve solo; en uno de treinta, no.
- **Se verifica el «antes» al escribir.** Si alguien tocó ese precio a mano
  entre la propuesta y el botón, ese renglón no se aplica y se informa.
- **Sin clave configurada el campo no aparece.** No hay un botón que falle:
  el panel entero sigue funcionando y Sol edita como siempre.

Modelo por defecto: `claude-haiku-4-5`. La tarea es entender una frase
corta, no razonar, y dirección pidió explícitamente un modelo básico.

**Nota de plataforma:** el SDK oficial no se puede usar en este Worker.
Arrastra `internal/node.mjs` —que importa `node:child_process`— y workerd
se cae al arrancar (`ReferenceError: cp is not defined`) antes de atender
un pedido. La API de mensajes se llama con `fetch`, que en un Worker es
nativo. Está anotado en `price-assist.ts` para que nadie lo «arregle» de
vuelta.

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

Deja de ser el módulo sin motivo: **es de donde entra el stock** (§5.4).
Una compra es lo que hace subir la existencia y lo que da el costo real
del producto. Sigue siendo el último en el orden, pero ya no por falta de
razón, sino porque las compras se pueden registrar desde Productos hasta
que haya suficientes proveedores como para necesitar su propia pantalla.

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

### 5.10. El modelo de precio: estimado en la web, real en el mostrador

Dirección lo definió así: «el precio que se muestre a la clienta es un
estimativo al pagar la seña, y luego, en la operación del servicio, según
las recomendaciones de Sol y el gusto de la clienta, se incrementa de
acuerdo al producto utilizado. Sería una locura dejar que las clientas
elijan los productos en la web.»

**La mitad de esto ya está construida.** El sistema distingue el precio
estimado (`bookings.price_estimated_min`, con `price_display_mode` en
`fixed`, `from` o `subject_to_confirmation`) del precio real
(`service_execution_records.final_price_amount`), y el diálogo de cierre
ya deja ajustar precio final, duración real y costo de insumos.

**Lo que falta es el porqué.** Hoy el precio final es **un número que Sol
tipea**. Nada dice qué producto se usó ni por qué subió. Tres
consecuencias:

1. la clienta no tiene explicación —«¿por qué me salió más?»—;
2. Sol no puede repetir el mismo criterio dos meses después;
3. el costo de insumos es otro número a mano, que se va a dejar vacío casi
   siempre: el propio campo dice «dejalo vacío si no lo sabés».

**La corrección:** el incremento no se tipea, **sale de elegir el producto
usado**. Sol elige lo que aplicó y el sistema suma lo que ese producto
suma. Con eso el precio final queda justificado y auditable, la fórmula
queda escrita sin trabajo extra, y el consumo se registra solo.

**Por qué la clienta no elige el producto —y coincido—:** el precio que ve
al pagar la seña es una promesa. Si ella elige el producto, elige el
precio, y el ajuste en el mostrador se vuelve una discusión. Mientras el
producto sea recomendación de Sol, el ajuste es criterio profesional. Es
la diferencia entre «te cobro más porque elegiste caro» y «te recomendé
esto y cuesta esto».

**Lo que sí hay que decirle a la clienta, y hoy no está dicho con
suficiente claridad:** que el precio es estimativo y puede subir según lo
que se use. Si eso no está escrito **antes** de que pague la seña, el
ajuste en el mostrador es una sorpresa, y una sorpresa con la plata es lo
único que no se puede defender. Es un texto que ve la clienta: pasa por la
skill de copy, no por acá.

---

## 6. Cómo se integran los módulos

Dirección lo pidió así: «que los módulos tengan relación entre ellos, para
hacer una integración de gestión de datos e información horizontal y
vertical».

Traducido a algo que se pueda construir y verificar:

- **Horizontal** es que un hecho actualice a todos los módulos que lo
  tocan, sin que nadie cargue lo mismo dos veces.
- **Vertical** es que cualquier número se pueda abrir hacia abajo hasta el
  hecho concreto que lo produjo, sin cortes en el camino.

Las dos salen de la misma pieza: el registro de hechos de §3. Esto es lo
que significa en la práctica.

### 6.1. Horizontal: una acción de Sol, seis módulos

Sol cierra un turno. Es **una** acción, la que ya hace hoy:

| Módulo            | Qué se actualiza solo                                   |
| ----------------- | ------------------------------------------------------- |
| Calendario        | El turno queda cerrado y libera la estación             |
| Clientas          | La ficha suma el servicio, la fórmula y el precio real  |
| Productos y stock | Sale lo que se usó                                      |
| Caja              | Entra lo cobrado, con su medio de pago                  |
| Empleados         | Suma a la producción de quien atendió                   |
| Trazabilidad      | Queda quién cerró, cuándo, a qué precio y por qué subió |

**Seis módulos actualizados, cero cargas.** Si algún módulo necesitara que
alguien vuelva a escribir un dato que ya se escribió, ese módulo está mal
diseñado. Es el mismo criterio de §4, mirado desde la integración.

Lo mismo con los otros tres hechos que mueven todo:

| Hecho                | Qué se actualiza                                                               |
| -------------------- | ------------------------------------------------------------------------------ |
| Entra una compra     | Stock sube · Caja registra la salida de plata · Proveedores suma el movimiento |
| Se vende un producto | Stock baja · Caja registra el cobro · la ficha de la clienta lo guarda         |
| Se paga una seña     | El turno queda confirmado · Caja la registra · queda a cuenta del precio final |

### 6.2. Vertical: todo número se abre hasta el hecho

«Entraron $X hoy» → qué turnos lo formaron → un turno → qué se hizo y qué
productos se usaron → de qué compra vino ese producto → a qué proveedor se
le compró.

Sin cortes y sin callejones sin salida. Ésa es la trazabilidad que se
pidió el 08/09, dicha en términos de módulos.

### 6.3. Las dos reglas que hacen que esto sea verdad

Son las que separan esta arquitectura de un ERP que se desincroniza.

**1. Ningún módulo guarda el total de otro.** Nada de un campo «facturado
del mes» que se actualiza por trigger. Ése es exactamente el mecanismo por
el que un ERP termina diciendo dos cosas distintas sobre la misma plata, y
por el que alguien tiene que «recalcular». Los totales se calculan al
leerlos.

**2. Si un número no se puede abrir, no se muestra.** Un número que no
lleva a los hechos que lo formaron no es información: es una afirmación
que nadie puede verificar. Y con el volumen de este salón, no hay ninguna
excusa de rendimiento para guardarlo.

**El costo de esto, dicho de frente:** calcular al leer es más lento que
guardar el total. A la escala de Sol Mai —150 clientas, cuatro días de
atención por semana— es irrelevante. Si algún día dejara de serlo, la
solución es una caché que se reconstruye desde los hechos, **nunca** un
total que alguien escribe a mano.

---

## 7. Bucle cerrado: qué se puede borrar y qué no

Dirección lo pidió así: «todos los módulos y sus bases de datos necesitan
poder ser borrados, actualizados, cargados, eliminados y controlados a
bucle cerrado».

**Bucle cerrado, en términos operables**, es que cada cambio cumpla cuatro
cosas: queda registrado con autor, fecha y motivo; se puede revertir; su
efecto se mide; y el desvío vuelve a quien lo hizo. Sin la cuarta no hay
bucle, hay formulario.

Ejemplo de bucle que sí cierra, y que ya está diseñado: Sol carga cuánto
consume un color, el sistema descuenta solo, ella cuenta cuando quiere, el
sistema le muestra cuánto se desvió, ella ajusta el consumo. Cada vuelta
achica el error.

### 7.1. El choque que hay que resolver antes de construir

**«Poder ser borrados» contradice «todo número se abre hasta el hecho»**
(§6.2). Las dos cosas las pidió dirección, con dos días de diferencia, y
no pueden ser verdad a la vez:

- Si se borra un servicio, ¿qué pasa con los turnos cerrados que lo
  nombran?
- Si se borra una clienta, ¿qué pasa con la plata que pagó y que está en
  la caja de ese día?
- Si se borra un producto, ¿qué justifica el precio que se cobró?

**Resolución: nada se borra físicamente; se archiva.** Un servicio
archivado deja de ofrecerse y sigue explicando el pasado. Es la única
forma de tener las dos cosas, y el repo ya lo viene haciendo a medias:
`is_active` aparece 456 veces en las migraciones y `deleted_at` 111.

Lo que la persona ve es «eliminar». Lo que el sistema hace es archivar. No
es un engaño: es que «eliminar» significa «sacalo de mi vista», no «hacé
desaparecer la historia de la plata».

### 7.2. Las dos excepciones

**1. Datos personales de una clienta: eso sí se borra de verdad.** Si
alguien pide que borren sus datos, se borran nombre, teléfono y mail, y
quedan los hechos anonimizados: hubo un turno, entró esa plata, se usó ese
producto. Las dos cosas se cumplen. En Argentina esto lo regula la Ley
25.326 de Protección de Datos Personales; **el alcance exacto hay que
confirmarlo con el contador o un abogado, no conmigo.**

**2. Trazabilidad no tiene CRUD, y no es negociable.** Un registro de
auditoría que se puede editar o borrar no es auditoría: es un cuaderno.
Ese módulo es de sólo agregar. Si alguien pudiera borrar de ahí, todo el
resto del control deja de valer, empezando por el control sobre quien
tenga la contraseña.

---

## 8. Módulos que la investigación sumó, y los que descarto

Investigación de septiembre 2026 sobre plataformas del rubro (Vagaro,
Meevo, Boulevard, MyTime y las argentinas ya relevadas). Resúmenes de
prensa y de los blogs de los proveedores, no citas de producto.

### 8.1. Lo que aparece en el rubro y no teníamos

| Módulo                                     | Qué es                                             | Veredicto                                                                                                           |
| ------------------------------------------ | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Bonos, paquetes y gift cards**           | Sesiones pagadas por adelantado; tarjeta de regalo | **Va.** Es plata que entra antes del servicio y genera saldo a favor. Muy usado en Argentina                        |
| **Facturación electrónica ARCA (ex AFIP)** | Emitir comprobantes                                | **Sol factura, y NO integramos.** Ver §8.3                                                                          |
| **Propinas**                               | Quién se la lleva, en efectivo o por Mercado Pago  | **Va.** No lo habíamos considerado y toca Caja y Empleados                                                          |
| **Lista de espera**                        | Llenar los huecos que dejan las cancelaciones      | **Va.** Barato y encaja con lo automático                                                                           |
| **Cuenta corriente de la clienta**         | Saldo a favor por seña no usada o bono pendiente   | **Va**, y sale casi solo de bonos y señas                                                                           |
| Marketing masivo y campañas                | Envíos a toda la base                              | **No.** Ya vetado: es la forma más rápida de que bloqueen el WhatsApp del salón                                     |
| Fidelidad con puntos                       | Puntos canjeables                                  | **No.** Con 150 clientas que Sol conoce por nombre, es burocracia. La fidelidad acá es que se acuerde de su fórmula |
| Reseñas y reputación                       | Reseñas dentro del sistema                         | **No.** Eso vive en Google y en Instagram                                                                           |
| Multi-sucursal                             | Varios locales                                     | **No**                                                                                                              |

**Un aporte de vocabulario:** la industria llama **backbar** al consumo
interno de producto, y las plataformas descuentan stock tanto por venta
como por backbar. El diseño de §5.4 coincide con la práctica del rubro.

### 8.2. Reportes y KPI: acá no le doy la razón a dirección

Dirección propuso un módulo de reportes y KPI. **Recomiendo no
construirlo**, por tres motivos.

**Primero, ya existe y probablemente no se vio.** La pantalla
`/operaciones` muestra cobrado, facturado, ticket promedio, ocupación,
clientas nuevas y señas retenidas, con cortes por canal —web, mostrador,
teléfono, WhatsApp, sin turno— y por estado, con esta semana, este mes y
mes anterior. Es un tablero de KPIs funcionando.

**Segundo, la investigación es una advertencia, no un modelo.** Las
plataformas del rubro traen alrededor de **treinta informes** en seis
categorías. Treinta informes no es potencia: es que nadie supo cuál
servía y los pusieron todos. Sol no va a abrir un menú de treinta
informes, y si lo abre, no va a saber cuál mirar.

**Tercero, y es el que más pesa: con este volumen, un KPI mal leído es
peor que ninguno.** Un mes con tres ausencias y otro con cinco no es una
tendencia, es ruido. Un tablero que invita a decidir sobre ruido hace
tomar peores decisiones que no tener tablero.

**La contrapropuesta:**

1. **Cada módulo muestra su propio número donde está el trabajo.** La
   ocupación se mira en el calendario, no en un informe de ocupación.
2. **Un tablero chico** —el que ya está—, con todo número abrible hasta el
   hecho (§6.2).
3. **Exportar a Excel desde cada módulo.** Es lo que en un negocio chico
   se usa realmente como «reportes», porque el destino real es el
   contador.
4. **Pocos indicadores y accionables.** Uno que no cambia una decisión es
   decoración. Los que la cambian acá: ocupación —¿abro más horas o
   menos?—, ausencias —¿la seña está funcionando?—, reposición —¿me quedo
   sin producto?— y quiénes no volvieron.

### 8.3. Facturación: por qué NO integramos ARCA

**El dato (dirección, 2026-09-09):** la titular está inscripta en ARCA
como **monotributista categoría E**, prestadora de servicios. Emite
**factura C** por la web de ARCA o por la app del celular.

**La decisión: no integramos.** Y no es por dificultad técnica.

#### Lo que costaría integrar

Emitir desde nuestro sistema exige un **certificado digital (.pem) atado
al CUIT de Sol**, un punto de venta habilitado para web services, y el
circuito WSAA —autenticación, con tokens que vencen— más WSFEv1 para
pedir el CAE de cada comprobante.

Tres cosas pesan más que el trabajo:

1. **El certificado es una llave que emite documentos fiscales a nombre
   de Sol.** Viviría en nuestra infraestructura. Si se filtra, alguien
   puede facturar como ella. Es el secreto más peligroso que manejaría
   este sistema, y hoy no manejamos ninguno de esa naturaleza.
2. **ARCA se cae.** Si el sistema no consigue el CAE, la clienta está
   parada en el mostrador esperando. Habría que construir toda una
   política de reintentos y de qué hacer mientras tanto.
3. **La numeración es correlativa por punto de venta.** Si Sol sigue
   facturando desde la app, hacen falta dos puntos de venta y su
   contabilidad pasa a tener dos corrientes que alguien tiene que
   conciliar.

#### Lo que ganaría

Ahorrarle a Sol los treinta segundos que tarda en emitir una factura C
desde el celular, unas cuantas veces por día.

**Ese canje no cierra.** No hoy.

#### Lo que sí hace falta, y hoy no existe

El problema real no es emitir: es **no saber qué falta emitir**. Al
cerrar el día, nada le dice a Sol qué atenciones todavía no tienen
comprobante.

- **Marcar el turno como facturado**, con el importe y la fecha que ella
  usó. Un campo y un botón.
- **La caja del día muestra lo que falta facturar**, no sólo lo que
  entró.
- El panel le da el importe final y el nombre listos para tipear en la
  app de ARCA.

**Esto no es trabajo desechable si algún día integramos.** Es el mismo
campo que la integración escribiría sola en vez de a mano: cambia quién
lo llena, no el modelo.

#### Dos cosas que conviene mirar, sin inventar números

**Mercado Pago informa a ARCA.** Lo que entra por ahí es visible para el
organismo. Una diferencia entre lo cobrado por Mercado Pago y lo
facturado es justamente lo que se nota, y por eso llevar el registro vale
más que prolijidad contable.

**El tope de la categoría.** Superar el límite de facturación anual
obliga a recategorizarse. La caja ya sabe lo que entró, así que el
sistema puede mostrar el acumulado contra el tope —**cargado por el
contador de Sol, nunca escrito por nosotros**: cambia con la inflación y
un número viejo es peor que ninguno—. Si no está cargado, dice NO
DISPONIBLE.

#### Lo que NO decide este documento

Cuándo corresponde emitir el comprobante cuando hubo una seña por
adelantado y un saldo en el local. Eso lo responde el contador de Sol. El
diseño no fuerza ninguna respuesta: ella marca el comprobante cuando lo
emitió, con el importe que usó.

---

---

## 9. Orden de construcción

**La recomendación central: un bloque por vez, y se mira funcionando antes
de elegir el siguiente.** Una lista de once bloques no es un plan que una
persona pueda sostener; es una lista que genera culpa. Lo que sigue es el
orden que recomiendo, pero el compromiso es sólo con el primero.

**Los agujeros de auditoría no son un bloque aparte.** Cada acción se
audita en el bloque que la construye: el precio de cierre cuando se toque
el cierre, la reprogramación cuando se construya, la excepción cuando se
toque la agenda. Separarlo era ordenado en un documento y molesto en la
práctica.

| #   | Bloque                                                           | Por qué                                                                                                                             |
| --- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 1   | ~~Caja del día, visible sólo para Sol~~ · **HECHO** (2026-09-09) | Salió entera de `payments`, sin tablas nuevas ni carga manual, como estaba previsto                                                 |
| 2   | **Marcar qué falta facturar**                                    | Sale de la caja que ya está y cierra el hueco real de §8.3: hoy nada le dice a Sol qué atenciones no tienen comprobante             |
| 3   | **Editar precios y servicios sin un deploy**                     | Hoy Sol no puede subir un precio sin que yo intervenga (§5.5). Con la inflación argentina es un bloqueo operativo, no una comodidad |
| 4   | El panel pregunta lo mismo que la web al tomar un turno          | Reutiliza un motor que ya existe; hoy la secretaria al teléfono recibe menos ayuda que la clienta (§4.1)                            |
| 5   | La ficha de la clienta                                           | El backend está entero; falta sólo la pantalla                                                                                      |
| 6   | El aviso de cancelación con sus dos momentos (§11.4)             | Cierra un defecto de plata que hoy puede perjudicar a una clienta que avisó a tiempo                                                |
| 7   | **Productos, y el precio que sale del producto usado**           | Es el modelo de negocio real (§5.10); hoy el ajuste es un número sin explicación                                                    |
| 8   | Finanzas: gastos                                                 | Primera tabla nueva                                                                                                                 |
| 9   | Clientas: quiénes se pasaron de su ritmo + WhatsApp redactado    | Necesita historial suficiente para no equivocarse                                                                                   |
| 10  | Empleados: producción y liquidación                              | Necesita el porcentaje, que es dato de Sol (§12)                                                                                    |
| 11  | Proveedores                                                      | Ninguna urgencia hoy                                                                                                                |

Reordenar esto es una decisión de dirección, no técnica.

### 9.1. Por qué la caja va primera sin construir un módulo de roles

La objeción evidente es que mostrar facturación exige roles, y roles es un
módulo entero. No lo exige, y **menos de lo que yo mismo escribí acá el
2026-09-08**: dije que faltaba «un guard de una línea» y ni eso faltaba.
`staff_members.role` ya existe con `owner` y `staff`, el middleware
`requireOwner()` ya está escrito y el dashboard ya está detrás de él. La
caja del día se colgó de ese mismo router y quedó protegida sin agregar
nada.

Construir el ABM de usuarios para proteger una pantalla sería hacer el
trabajo al revés. El módulo de Usuarios y roles —altas, bajas, cambiar
permisos desde la interfaz— se gana cuando haya varias pantallas que
proteger y alguien que necesite administrarlas. Hoy hay dos personas y una
pantalla.

## 10. Riesgos abiertos

- **Ocho pestañas.** El fracaso posible de esta arquitectura no es
  técnico: es que el panel se vuelva un ERP y Sol vuelva al cuaderno. El
  antídoto está en §1 y hay que sostenerlo bloque por bloque: si un módulo
  pide carga manual que no nace de un turno, hay que discutirlo antes de
  construirlo.
- **El stock derivado se desvía siempre.** El diseño de §5.4 lo asume y
  lo muestra en vez de esconderlo, pero el riesgo no desaparece: si el
  consumo estándar que carga Sol está muy lejos de la realidad, el
  número deja de servir. La señal de alarma es que el desvío de cada
  recuento no baje con el tiempo.
- **Productos e inventario** sigue siendo el candidato número uno a
  abandonarse, aun con este diseño.
- **Comisiones** depende de un dato que Sol todavía no dio.
- **Facturación electrónica** dejó de ser un riesgo de alcance: se
  decidió no integrar (§8.3). El riesgo que queda es el opuesto y es
  chico: que el registro de «facturado» se llene a medias y termine
  mintiendo. Se mitiga mostrándolo en la caja del día, donde se ve solo.
- **`docs/sol-mai-crm.md`** queda vigente en su contenido (qué muestra y
  qué no la ficha), pero su encuadre —«el CRM es el panel»— lo reemplaza
  este documento.

---

## 11. Decisiones tomadas

Dirección pidió recomendaciones en vez de preguntas: «no sé cómo encarar
esto». Tenía razón en el reclamo. Tres de las cuatro preguntas abiertas
eran técnicas y me correspondía resolverlas. Quedan resueltas acá, con el
motivo, para que se puedan revocar con conocimiento.

### 11.1. Clientas y CRM son un solo módulo

**Revierte lo que propuse el 2026-09-07.** La división entre «registro» y
«seguimiento» es una distinción de manual, no una necesidad de este
salón. Con 150 clientas, un módulo de CRM separado de la ficha sería una
pantalla vacía la mayor parte del tiempo.

La lista de quiénes se pasaron de su ritmo **es un filtro dentro de
Clientas**, no un módulo. Quedan ocho módulos, no nueve.

### 11.2. La secretaria ve el turno completo, no la plata del salón

La línea no pasa por «finanzas sí o no», pasa por otro lado:

- **La plata del turno la ve**: si pagó la seña, cuánto falta, si hay que
  devolverle. Sin eso no puede atender.
- **La plata del salón no la ve**: cuánto se facturó, gastos, sueldos,
  comisiones, proveedores.

### 11.3. Productos arranca sólo por reventa

Lo que se vende a la clienta. El consumo interno queda afuera hasta que
alguien lo pida con un problema concreto: es lo que obliga a contar
stock todas las semanas y lo que hace que el módulo se abandone.

### 11.4. El aviso de la clienta no se pregunta: se hace irrelevante

La duda era si «marcar el aviso es obligatorio» significaba la llegada o
el aviso de cancelación. **La forma correcta de resolverlo no es
preguntar, es que la respuesta no cambie nada.**

Se guardan dos momentos distintos, no uno:

- **cuándo avisó la clienta** (lo dice ella: «te escribí ayer a la
  noche»);
- **cuándo lo registró Sol** (lo pone el sistema solo).

La ventana de 24 h se calcula **sobre el primero**. Con eso, que Sol
cargue el aviso tarde deja de perjudicar a una clienta que avisó a
tiempo, y el defecto desaparece bajo las dos lecturas de la instrucción.

El segundo dato queda para auditoría: si la diferencia entre los dos es
grande y seguida, es una señal operativa, no una acusación.

---

## 12. Lo único que Sol tiene que responder

No son decisiones de arquitectura. Son datos que sólo ella tiene, y
ninguno frena el trabajo: se construye la capacidad y el valor se carga
cuando llegue.

1. **Fotos de las clientas en la ficha: ¿sí o no?** Es la funcionalidad
   más usada en salones de color y la que más compromete: hay que
   guardar imágenes de personas, decidir quién las ve y cuándo se borran.
2. **¿Cómo le paga a quien la ayuda?** Sin ese porcentaje no hay
   liquidación posible. No lo vamos a inventar.
3. ~~**¿Facturás, y bajo qué condición?**~~ **RESPONDIDA (2026-09-09):**
   monotributista categoría E, factura C por la web o la app de ARCA.
   Decisión tomada en §8.3: no integramos; llevamos el registro de qué
   falta facturar. Queda un dato para su contador: **el tope de
   facturación de la categoría**, que el sistema no va a inventar.
4. **¿A las cuántas semanas una clienta «hace mucho que no viene»?** Si
   no lo sabe, se puede medir sobre su propio historial en unos meses.
