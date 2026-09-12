# Reingeniería del sistema interior · septiembre 2026

> **Qué es esto.** Una auditoría de lo construido contra lo que el salón
> realmente hace, y el plan para cerrar la distancia. No es un rediseño: casi
> todo lo que hay sirve. Lo que falla es más específico y más caro de lo que
> parece desde afuera.
>
> **Con qué evidencia.** Tres fuentes, todas verificables:
> 1. El código y las migraciones del repositorio.
> 2. El Supabase de producción, consultado el 2026-09-12.
> 3. `precios.xlsx` de Sol: 1.026 movimientos escritos a mano entre el 3 de
>    marzo y el 29 de mayo de 2026, de los cuales 926 son cobros. Ver
>    `docs/sol-mai-catalogo-reconciliacion.md` para el detalle.

---

## 1. El diagnóstico en una frase

**El sistema está bien construido y mal poblado.** La arquitectura aguanta
todo lo que el salón necesita; los datos que tiene adentro describen otro
salón.

La medición que lo prueba, tomada de producción:

| | |
| --- | --- |
| Filas de precios cargadas (`service_price_tiers`) | 127 |
| Validadas por Sol (`source = 'sol_validated'`) | **4** |
| Tomadas de su lista de precios (`source = 'sol_pricelist'`) | **0** |
| Genéricas de industria con `confidence: low` | **123** |
| Con precio de agregado cargado (`price_addon`) | **0** |

Noventa y siete de cada cien precios con los que el sistema le cobraría a una
clienta los puso un promedio de industria.

---

## 2. Los tres desajustes de fondo

### Desajuste A — El catálogo del sistema no es el catálogo del salón

El sistema publica 43 servicios. Cruzándolos contra 926 cobros reales:

- **`mk-novia`, `mk-fiesta`, `mk-social`, `mk-evento`, `mk-prueba`**,
  **`babylights`, `claritos`, `bano-luz`, `hidratacion`, `reconstruccion`,
  `reparacion`, `recogido`**: no aparecen por ese nombre en ningún cobro de
  los tres meses. **CORREGIDO en §8.3**: el conteo original decía «cero
  facturación» y estaba mal hecho —sumaba sólo `efectivo` y `transferencia`,
  y el salón también anota en las columnas con nombre de peluquera—. Sol
  confirma que los hace. Lo que sigue en pie es que **el sistema los nombra
  distinto de como los nombra ella**.
- Al revés, lo que sí se cobra todo el tiempo —`BIOTINA`, `KARSEELL`,
  `RIFLESSI`, `PLASMA`, `MAGIC WATER`, `SHOCK KERATINA`, `COLOR SHINE`,
  `AMPOLLA`, `FUSION WELLA`, `LISS BIOCELL`, `EXILINE`, `ITELY`,
  `SIN TACC`, `VINCHA TONO`— **no existe en el sistema**.

El sistema habla en genérico de peluquería; Sol cobra por nombre de marca de
producto. No es un problema de nombres: es que una clienta que entra a la web
no encuentra lo que va a ir a hacerse.

Consecuencia inmediata y comprobable: **el sistema publica y permite reservar
online una categoría entera que el salón no facturó nunca.** Eso no es un
catálogo incompleto, es una promesa que el salón no tiene por qué poder
cumplir.

### Desajuste B — «Tratamiento» no existe como concepto

Este es el desajuste estructural, y viola directamente el principio de que
**Servicios ≠ Tratamientos ≠ Productos**.

Cómo está hoy:

| Eje | Dónde vive | Estado |
| --- | --- | --- |
| **Servicios** | `public.services` (43 filas) | Existe |
| **Productos** | `public.products` (tabla propia, panel Inventario) | Existe y está bien separado |
| **Tratamientos** | **en ninguna parte** — están metidos dentro de `services` | **No existe** |

`botox`, `nutricion`, `hidratacion`, `reparacion`, `reconstruccion` y
`post-color` están en la misma tabla y con el mismo tratamiento que
`corte-fem` o `mechas`. Para el sistema, un botox capilar es un servicio
igual que un corte.

**Por qué importa, con el número que lo prueba.** Un tratamiento cuesta
distinto según vaya solo o arriba de un color. Medido sobre 56 tickets reales
—comparando la mediana de «raíces solas» contra «raíces + tratamiento»:

| Tratamiento | Lo que se cobró arriba del color | Lista del mismo tratamiento solo |
| --- | ---: | ---: |
| KARSEELL | $8.000 | 20.000 – 30.000 |
| MASCARA REPAIR | $7.000 | 20.000 – 28.000 |
| RIFLESSI | $9.000 | 21.000 – 34.000 |
| FUSION | $11.000 | 25.000 – 35.000 |
| AMPOLLA | $5.500 | 20.000 – 28.000 |

Un corte no hace eso: vale prácticamente lo mismo vaya solo o acompañado.
**Un tratamiento tiene dos precios porque el salón hace una oferta a quien se
lleva las dos cosas** — así lo explicó Sol, ver §8.2. Sea cual sea el motivo
comercial, la consecuencia técnica es la misma: el precio del tratamiento
depende de qué más haya en el turno, y un servicio común no funciona así.

Y lo notable: **el modelo de datos ya lo sabía.**
`service_price_tiers` tiene una columna `price_addon` al lado de `price_main`,
exactamente para esto. Está vacía en las 127 filas. Alguien diseñó el lugar y
nadie puso los números.

### Desajuste C — La informalidad no está donde el sistema la vigila

El sistema protege el canal `online` con seña del 20%. Los otros cuatro
canales —`manual` (mostrador), `phone`, `whatsapp`, `walk_in`— nacen
`confirmed` y **sin seña**, por decisión explícita: ahí el compromiso es la
conversación.

Eso es razonable, pero hay que decir en voz alta lo que implica: **hoy la
totalidad de la operación real de Sol Mai pasa por esos cuatro canales.** La
planilla de tres meses no tiene una sola reserva online, porque el cobro de
seña todavía no está conectado. El sistema vigila la puerta por la que no
entra nadie.

La consecuencia práctica: la ausencia (`no_show`) es un estado que existe en
el modelo, pero **no hay ninguna medición de cuántas ausencias hay**, porque
la planilla de Sol sólo registra lo que se cobró. Nadie sabe hoy cuánto le
cuestan las ausencias al salón. Es el agujero de medición más grande del
proyecto.

---

## 3. Inventario: qué existe, qué sirve, qué no

Los diez módulos del árbol (`src/lib/panel-nav.ts`), auditados.

| Módulo | Secciones con pantalla | Veredicto |
| --- | --- | --- |
| **Agenda** | Hoy, Mañana, Semana, Mes, Año (5/5) | **Se mantiene.** Completo y probado. Único ajuste: cerrar lunes y sábados por defecto |
| **Clientas** | 0 de 3 | **Se construye.** Es el módulo con más valor sin construir. §6 |
| **Finanzas** | Caja, Devoluciones, Facturación, Resumen (4/6) | **Se mejora.** Faltan Cobros y Gastos. Gastos es urgente: §5 |
| **Inventario** | Productos (1/3) | Se mantiene. Stock y Movimientos no tienen demanda comprobada |
| **Servicios** | Precios y tiempos, Horarios (2/3) | **Se rehace por dentro.** §4 |
| **Puestos de trabajo** | Listado, Fuera de servicio (2/2) | **Se mantiene.** Recién unificado y correcto |
| **Personal** | 0 de 3 | **No se construye ahora.** `staff_schedules` vacío a propósito: Sol no definió horarios por persona. Y las seis columnas de peluqueras de la planilla tienen dato en 39 de 452 filas — no alcanza para producción por persona |
| **Compras** | 0 de 2 | No se construye. Sin demanda |
| **Usuarios y roles** | Personas, Roles, Registro de cambios (3/4) | **Se mantiene.** Completo para lo que hace falta |
| **Configuración** | 0 de 3 | Se construye después. Los valores se editan por SQL mientras tanto |

**Traducción:** de diez módulos, seis se mantienen como están, dos se
construyen (Clientas y Gastos), uno se rehace por dentro (Servicios) y dos se
posponen con motivo declarado.

Esto es reingeniería, no reescritura: **no se toca la agenda, ni la
capacidad, ni los permisos, ni el motor de reservas, ni la autenticación.**
Todo eso funciona y está probado contra PostgreSQL real.

---

## 4. La corrección estructural: los tres ejes del catálogo

### El modelo propuesto

```
SERVICIO                    TRATAMIENTO                 PRODUCTO
(se reserva, ocupa           (se aplica durante          (se vende, sale
 una estación y un rango      un servicio; tiene          del stock; no
 de tiempo)                   dos precios)                ocupa agenda)

corte                        biotina                     shampoo biocell
color de raíces              karseell                    máscara sow
mechas                       riflessi                    ampolla para casa
brushing                     plasma
                             magic water
public.services              public.services             public.products
                             + treatment_of               (ya existe y
                             + price_addon                 está bien)
```

### Cómo se implementa sin romper nada

La tentación es crear una tabla `treatments`. **No hay que hacerlo.** Un
tratamiento se reserva, ocupa tiempo y estación, y aparece en la agenda
exactamente igual que un servicio cuando va solo. Partirlo en dos tablas
duplicaría el motor de disponibilidad.

Lo que un tratamiento necesita es **una marca y un precio**, no una tabla:

1. **`services.kind`** — una columna con `'servicio' | 'tratamiento'`. Por
   defecto `'servicio'`, así ninguna fila existente cambia de significado.
2. **`service_price_tiers.price_addon`** — **ya existe**. Se llena con el
   bloque `TRATAMIENTOS MAS COLOR` de la planilla.
3. **La regla de cobro**: si en el mismo turno hay un servicio de la familia
   color y un `kind = 'tratamiento'`, el tratamiento cotiza a `price_addon`.
   Si va solo, cotiza a `price_main`.

Es una migración aditiva de una columna con default. Ninguna fila existente
cambia de comportamiento, y el cálculo vive donde ya viven precio y duración:
en el backend, nunca en el navegador.

### La otra columna que falta: la forma de pago

La hoja `servicios` tiene **ocho** columnas de precio, no cuatro: cuatro
largos por **dos formas de pago**. La fila 2 lo dice —`CORTO, CORTO, MEDIO,
MEDIO, LARGO, LARGO, XL, XL`— y la segunda de cada par es la primera más 10%,
en 249 de 264 parejas.

Confirmado contra los cobros reales: el **99,3%** de los montos en efectivo
termina en 000, contra el **20,8%** de los transferidos; y el **79,2%** de lo
transferido, dividido por 1,10, cae en un múltiplo exacto de mil. El +10% es
la forma de pago, no el largo del pelo.

**Esto cierra un pendiente abierto de la fuente de verdad**, que pedía
*«validar significado de las dos columnas/tarifas»*.

**Y no hace falta migración.** `business_settings` ya tiene
`payment_surcharge_pct = 10`, descrito como *«informativo, no aplicado
online»* y marcado `sol_pricelist_derived / medium`. Lo que corresponde es
subirlo a medido y decidir si se aplica. Duplicar 127 precios sería el diseño
equivocado: es **una regla global**, no un atributo por servicio.

### Qué se carga, y con qué etiqueta

`service_price_tiers.source` ya tiene el vocabulario exacto para esto:

| Valor | Qué significa | Cuántas filas hoy |
| --- | --- | --- |
| `industry_baseline` | promedio genérico, nadie lo validó | 123 |
| `sol_pricelist` | sale de la lista de Sol, ella todavía no lo confirmó | **0** |
| `sol_validated` | Sol lo miró y dijo que sí | 4 |
| `sol_adjusted` | Sol lo cambió desde el panel | 0 |

**Transcribir la lista de Sol no es inventar negocio: es copiarla.** Pasa de
`industry_baseline / low` a `sol_pricelist / medium`. Sol deja de tener que
tipear 127 números desde cero y pasa a tener que decir sí o no sobre 127
números que ya son suyos. Sólo cuando ella los confirme se marcan
`sol_validated`, y recién ahí son precio vigente.

---

## 5. Gastos: el módulo urgente que nadie pidió

La planilla tiene **27 filas con monto negativo** por −$325.850 en tres
meses: «super», «lavadero», «pedidos ya», «nafta», «AUTO», «entrada gra
mendez». Están **en la misma columna que lo que paga una clienta**, y sólo se
distinguen por el signo menos.

Esto no es un detalle contable. Mientras los gastos vivan mezclados con los
cobros:

- La caja del día es falsa: mezcla ingresos con salidas.
- No hay forma de saber el margen, que es justo el indicador que el dashboard
  declara **NO DISPONIBLE** por falta de costos.
- Cualquier número que el sistema le muestre a Sol va a discrepar con su
  planilla, y ella va a confiar en la planilla.

**Finanzas › Gastos ya existe en el árbol y dice «Todavía no».** Es la
construcción con mejor relación valor/esfuerzo del proyecto: una tabla, un
alta, una lista por día y una categoría. Nada de esto es difícil; lo difícil
era saber que hacía falta.

Además hay **74 filas con nombre y sin monto**: turnos anotados que no se
cobraron, o cobros que quedaron sin cargar. No hay forma de distinguirlos, y
esa ambigüedad es exactamente lo que el sistema viene a eliminar.

---

## 6. Clientas habituales: el mecanismo

El detalle funcional completo está en `docs/returning-customers-flow.md`.
Acá, la decisión de arquitectura y el número que la sostiene.

### Cómo reconoce el sistema a una clienta que vuelve

La regla es una sola y no se negocia: **el teléfono no autentica.** Una
coincidencia por WhatsApp no habilita ver historial. Está implementada así en
producción y es correcta: el teléfono es un dato de contacto que cualquiera
puede escribir.

La cadena real es:

```
proveedor de identidad (Google)  →  email probado
        │
        ▼
resolve_customer_identity (una RPC, una transacción)
        │
        ├─ 'known'          la ficha ya está vinculada      → ve su historial
        ├─ 'matched_email'  el email coincide con una ficha → queda 'pending_link'
        ├─ 'pending_link'   espera que Sol lo apruebe       → NO ve historial
        ├─ 'created'        ficha nueva                     → no hay historial
        └─ 'needs_phone'    faltan datos                    → flujo normal
```

`can_see_history` es lo único que abre el bloque de «Hola María». Y la
vinculación de una ficha existente **la aprueba Sol desde el panel**: el
sistema nunca decide solo que dos personas son la misma.

### El problema, que es de credenciales y no de diseño

`KnownCustomerBlock.tsx` está construido y funciona. Pero depende de Google
OAuth, y esas credenciales no están cargadas. **Hoy toda clienta que vuelve
es tratada como nueva.**

El documento funcional preveía un camino alternativo sin login —doble
coincidencia de WhatsApp normalizado + email— que **nunca se implementó**.

**Recomendación: no implementarlo.** Razones concretas:

1. La planilla muestra que los nombres de clientas no son identificadores:
   581 nombres crudos que al unir los obvios bajan a 498. El 14% del padrón
   es ambigüedad de tipeo. Un sistema de matching difuso sobre esos datos va
   a equivocarse, y equivocarse acá significa mostrarle a una persona el
   historial de otra.
2. Cargar credenciales de Google es una tarde de trabajo administrativo.
   Construir y auditar un matching sin login es varios bloques, con riesgo de
   privacidad real.

El camino corto es también el seguro.

### El aviso de re-reserva, con el número que lo define

Medido sobre 423 intervalos entre visitas de la planilla:

| | |
| --- | --- |
| Mediana entre visita y visita | **27 días** |
| Vuelve antes de 15 días | 28,8% |
| Vuelve entre 15 y 30 días | 42,8% |
| Vuelve entre 31 y 60 días | 24,6% |
| Vuelve después de 60 días | **3,8%** |

Siete de cada diez vuelven antes del mes. Pasados los 60 días, la clienta ya
se perdió.

**El umbral de «Sin venir hace tiempo» es 45 días.** Está después del ciclo
normal —no molesta a quien iba a volver igual— y antes del punto de no
retorno. No es un número elegido: es el percentil que separa a las que
vuelven de las que no.

Y el dato que justifica construir el módulo: **el 63% de la facturación viene
de clientas que volvieron al menos una vez**, sin ninguna concentración
peligrosa —las 10 que más gastan son el 6,6% del total—. El negocio se
sostiene sobre la repetición, y hoy no hay nada en el sistema que la cuide.

### Lo que NO se hace sin decidirlo con Sol

Cargar el padrón de 498 clientas con su historial de consumo. Son personas
reales que le dieron su nombre a una peluquera, no a un sistema. El
repositorio ya tiene una migración de `consentimiento_datos_personales`, así
que el tema está reconocido. **Esa decisión es de Sol.**

---

## 7. El plan, por bloques

Ordenados por dependencia, no por gusto.

| # | Bloque | Toca producción | Depende de |
| --- | --- | --- | --- |
| 1 | **Reconciliar el catálogo** — Sol marca qué queda, qué se renombra, qué se da de baja | No | Nada. La tabla ya está: `docs/sol-mai-catalogo-reconciliacion.md` |
| 2 | **`services.kind` + cargar `price_addon`** | Migración aditiva | Bloque 1 |
| 3 | **Cargar los precios reales como `sol_pricelist`** | Datos, no schema | Bloque 1 |
| 4 | **Finanzas › Gastos** | Tabla nueva | Nada |
| 5 | **Credenciales de Google OAuth** | Consola, no código | Nada |
| 6 | **Clientas › Fichas y Sin venir hace tiempo (45 días)** | Pantallas nuevas | Bloques 3 y 5 |
| 7 | **Agenda cerrada lunes y sábados** | Un valor de configuración | Confirmación de Sol |
| 8 | **Devolver una seña sin revertir la ausencia** | Endpoint nuevo | Nada |

El bloque 1 es el único que no se puede saltear: todo lo demás le pone
números o pantallas a un catálogo que primero tiene que ser el correcto.

---

## 8. Las respuestas de Sol (2026-09-12)

Sol contestó las dieciséis preguntas de la hoja. **Dos de sus respuestas
corrigen este documento**, y una corrige un error de método en el análisis de
la planilla.

### 8.1 Lo que queda decidido y se puede construir

| Pregunta | Respuesta de Sol | Qué habilita |
| --- | --- | --- |
| El +10% de la transferencia | **«Siempre se cobra»** | `payment_surcharge_pct` pasa a `sol_validated` / `high`. El sistema puede calcularlo solo: ya no hacen falta dos precios por servicio |
| Lunes y sábados | **«Los lunes siempre está cerrado. A veces abrimos los sábados»** | Agenda: lunes cerrado por defecto; **sábado abierto pero excepcional**, no cerrado |
| Los 21 tratamientos de su lista | **«Sí, están todos»** | La lista queda confirmada y se puede cargar |
| Las fichas de las clientas | **«Sí, cargalas»** | Luz verde de la dueña para sembrar Clientas › Fichas |
| El aviso a los 45 días | **«Sí, avisame»** | Se construye como aviso **a Sol**, que después escribe ella. No es mensajería automática a la clienta |

### 8.2 El «tratamiento más color»: era una oferta, no una dosis más chica

Sol lo explicó con sus palabras:

> «tratamiento solo, es una cosa. tratamiento más color son dos servicios
> juntos, por eso la diferencia de precio es como una oferta que se hace por
> optar por los dos»

**Esto corrige lo que decía §2 de este documento.** La lectura de «precio de
agregado — es menos servicio» era equivocada: es **el mismo tratamiento**, a
precio de paquete por llevarse las dos cosas.

Lo que **no** cambia es la implementación: `service_price_tiers.price_addon`
sigue siendo la columna correcta, porque la mecánica es la misma —si en el
turno hay un color y un tratamiento, el tratamiento cotiza a ese precio—.

Lo que **sí** cambia es la consecuencia de producto, y para mejor: si es una
oferta, la web tiene que **ofrecerla**. Elegido un color, corresponde proponer
sumarle un tratamiento al precio de paquete. Hoy no se ofrece, y es el 47% de
los tickets de color del salón.

Queda un detalle sin cerrar: en ese mismo bloque el corte baja 12% y los
tratamientos 63%. Si las dos cosas son «oferta por llevar dos», los
descuentos deberían parecerse más. Conviene confirmarlo cuando se carguen los
precios.

### 8.3 La corrección de método: la planilla no registra todo

§2 afirmaba que Maquillaje, los peinados, el recogido y otros seis servicios
tenían **cero facturación** en tres meses. **Ese conteo estaba mal hecho:**
sumaba sólo las columnas `efectivo` y `transferencia`, y el salón usa además
las columnas con nombre de peluquera.

La prueba está en `marzo pagos`, filas 209 a 215:

```
209  peindaos 7/3               (marca de bloque, sin monto)
210  melisa giacosa                                sol = 60.000
211  jesi urigh                                    sol = 55.000
212  analia presser                                (sin monto)
213  mariel shocron e hijas                        sol = 29.700
214  maca olivera                                  (sin monto)
215  ingrid                                        sol = 66.000
```

Seis clientas, cuatro con importe, **$210.700 anotados fuera de las columnas
que yo estaba contando**. Es una fiesta o un casamiento del sábado 7 de
marzo, cargado bajo el 13. Hay dos marcas más del mismo tipo: `sabado 21/ 3`
y `sabado 9`.

En total hay **7 filas** con importe sólo en una columna de peluquera y nada
en efectivo ni transferencia: **$255.100**. Es poco dinero sobre $48,5 M,
pero no es el monto lo que importa: **es la prueba de que la categoría
existe y de que la planilla no la registra igual que el resto.**

**El alcance de la corrección.** Todo lo que este documento deriva de
`precios.xlsx` describe **el trabajo de martes a viernes cobrado por caja**,
no la totalidad del salón. Los sábados y los eventos quedan afuera o a
medias. Las mediciones de días, ciclo de clientas y mezcla de servicios hay
que leerlas con ese límite.

**Lo que no se puede afirmar tampoco ahora.** La palabra «maquillaje» no
aparece en ninguna fila de ninguna de las tres hojas, ni siquiera en las que
tienen importe en columna de peluquera. Y la columna `sol` se usa de forma
inconsistente —a veces repite el total del ticket, a veces es una parte—, así
que no sirve para cuantificar. Que Sol haga maquillaje está fuera de
discusión; **cuánto** no se puede saber con este archivo.

### 8.4 Lo que quedó sin resolver: los nombres

Sol contestó «sí, lo hago» a los ocho servicios que el sistema publica y la
planilla no mostraba: Maquillaje, Babylights, Claritos, Baño de luz,
Hidratación profunda, Reconstrucción, Reparación capilar y Recogido. También
«lo hago seguido» a Alisado y a Peinados.

**La pregunta estaba mal formulada.** «¿Lo hacés?» le pregunta a una
peluquera si sabe hacer algo, y la respuesta va a ser que sí. Lo que hacía
falta preguntar es **cómo lo anota**, porque la hipótesis más probable sigue
siendo que lo hace con otro nombre: escribe «mechas» donde el sistema dice
«claritos», «karseell» donde dice «reconstrucción».

La reconciliación del catálogo **no está cerrada**. Falta una vuelta corta,
de una palabra por servicio: *«Cuando hacés un babylights, ¿qué escribís en
la planilla?»*.

### 8.5 El emparejamiento propuesto (2026-09-12)

A la repregunta —«cuando hacés un babylights, ¿qué escribís en la
planilla?»— llegó una respuesta con **la definición de cada técnica**, no con
la anotación. Sirve igual: con la definición y el vocabulario real de la
planilla se puede proponer el emparejamiento, que después Sol confirma o
corrige con un sí o un no.

**Nada de esta tabla está confirmado.** Es una hipótesis construida a partir
de la definición de cada técnica y de las palabras que aparecen en los 926
cobros. La columna de confianza dice cuánto me la creo.

| Nombre en la web | Cómo lo define Sol | Lo que probablemente escribe | Evidencia en los tickets | Confianza |
| --- | --- | --- | ---: | --- |
| **Baño de luz** | coloración semipermanente sin amoníaco, da brillo y reaviva el tono | `tono sobre tono` | tiene bloque propio en su lista (`TONO Well/tono sobre tono`); 9 tickets con la frase exacta, 48 con «tono» | **Alta** |
| **Reparación** | restaurar el cabello dañado, sellado de cutículas | `mascara repair` | 95 tickets con «repair», 33 con «mascara» | **Alta** |
| **Hidratación** | devuelve el agua y la humedad natural | `magic water` | 26 tickets con «magic», 30 con «agua»; el producto se llama literalmente agua | **Alta** |
| **Reconstrucción** | deposita proteínas y queratina, rellena y fortalece | `karseell` y/o `shock de keratina` | 39 tickets con karsell/karseell, 18 con keratina | **Alta** |
| **Recogido** | el pelo sujeto hacia arriba, moños | `peinados` | el bloque `peindaos 7/3` de §8.3, 6 clientas | **Alta** |
| **Babylights** | mechas muy finas que imitan los reflejos del sol | `mechas` o `reflejos` | mechas 27, reflejos 46, balayage 21 | **Media** |
| **Claritos** | mechas unos tonos más claras que la base | `mechas`, `iluminación`, `gorra` | iluminación 7, gorra 31 | **Media** |

**El hallazgo estructural está en las dos últimas filas.** Babylights y
Claritos caen sobre las mismas palabras —«mechas», «reflejos»—, y no hay en
la planilla nada que las separe. O sea: **la web es más detallada que el
registro del salón.** Distingue técnicas que Sol anota juntas.

Eso es una decisión de producto, no un dato que falte:

- **Agrupar en la web** bajo un nombre que la clienta entienda («Mechas y
  reflejos», con la técnica conversada en el turno), o
- **pedirle a Sol que empiece a distinguirlas** al anotar, para poder medir
  cuál se pide más.

La primera opción no le cambia el trabajo a nadie; la segunda le agrega
trabajo a cambio de información. Corresponde que lo decida Sol con dirección
de producto, no el sistema por defecto.

**Maquillaje quedó afuera de la respuesta.** La lista de definiciones tiene
siete técnicas y ninguna es de maquillaje. Sigue sin haber una sola fila con
esa palabra en las tres hojas, ni en las columnas de peluquera. Es la única
de las ocho que sigue entera sin resolver.

### 8.6 Lo que hay que preguntar ahora

Siete confirmaciones de una palabra, más una pregunta abierta:

1. ¿Baño de luz es lo que anotás como **tono sobre tono**?
2. ¿Reparación es la **máscara repair**?
3. ¿Hidratación es el **magic water**?
4. ¿Reconstrucción es el **karseell**, el **shock de keratina**, o los dos?
5. ¿Recogido entra en lo que anotás como **peinados**?
6. Cuando hacés **babylights** y cuando hacés **claritos**, ¿los dos los
   anotás como «mechas»? ¿Los distinguís de alguna forma?
7. **Maquillaje**: ¿lo hacés en el salón? Si sí, ¿dónde queda anotado,
   porque en estas planillas no aparece?

### 8.7 Emparejamiento confirmado (2026-09-12)

Sol contestó las siete. **Seis quedan cerradas**; la séptima abre un problema
de arquitectura que no es de catálogo.

| Nombre en la web | Lo que anota Sol | Estado |
| --- | --- | --- |
| Baño de luz | `tono sobre tono` | **Confirmado.** «Es la forma comercial de llamar a la coloración tono sobre tono» |
| Reparación | `mascara repair` | **Confirmado.** Sella la cutícula, daño externo |
| Hidratación | `magic water` | **Confirmado** |
| Reconstrucción | `shock de keratina` | **Confirmado con corrección**, abajo |
| Recogido | `peinados` | **Confirmado.** Moños, colitas y peinados de fiesta entran todos ahí |
| Babylights y Claritos | `mechas` | **Confirmado, y se agrupan**, abajo |

#### La corrección: Karseell no es reconstrucción

Yo había propuesto reconstrucción ↔ `karseell` **o** `shock de keratina`. Sol
los separa:

> «El shock de keratina es 100% reconstrucción (aporta la proteína pura para
> reponer masa capilar). La máscara de Karseell es un tratamiento de colágeno
> que funciona más como una nutrición e hidratación profunda.»

Entonces: **Reconstrucción = shock de keratina**, y Karseell es otra cosa.

**Qué hacer con Karseell.** Es el tratamiento con más volumen de todos —39
tickets en tres meses— y tiene línea propia en la lista de precios de Sol. No
corresponde meterlo a la fuerza en un cajón genérico: **va como servicio
propio, llamado Karseell**, que es como lo pide la clienta. Es el punto
general de esta reingeniería: el catálogo de Sol habla por marca de producto
y el sistema tiene que hablar igual.

#### La decisión de agrupar, tomada

Sobre babylights y claritos, Sol respondió lo que §8.5 planteaba como opción:

> «Sí, es lo ideal para simplificar. Ambas técnicas son variantes de mechas,
> así que podés agruparlas bajo ese nombre general.»

**Queda decidido: se agrupan en la web bajo Mechas.** La técnica concreta se
conversa en el turno. Se dan de baja `babylights` y `claritos` como servicios
separados.

#### Cómo se nombran los tratamientos en la web

De los emparejamientos sale una regla para el catálogo público: **el nombre
genérico orienta a quien no conoce, el nombre de marca es el que pide la
clienta habitual.** Con el 63% de la facturación viniendo de clientas que
vuelven, sacar el nombre de marca sería sacarles la palabra con la que piden.

La forma propuesta es mostrar los dos: **«Hidratación profunda (Magic
Water)»**, «Reconstrucción (Shock de keratina)», «Reparación (Máscara
repair)». Una línea, sin ficha aparte.

### 8.8 Maquillaje: no es catálogo, es un tercero dentro del salón

> «El maquillaje se hace en el salón pero lo hace una experta tercerizada,
> pero quiero que quede registro también en el sistema.»

**Esto explica el dato y lo confirma en vez de desmentirlo.** Maquillaje no
aparecía en tres meses de planilla porque esa plata no pasa por la caja de
Sol, no porque el servicio no exista. El cero era correcto; lo que estaba mal
era mi conclusión de que el servicio no se hacía.

Y lo que pide Sol —que quede registro— es una capacidad que el sistema **hoy
no tiene**. Todo lo que modela asume que quien atiende es del salón:
`staff_members` son personas con acceso al panel, y `areas` y `resources` son
capacidad propia.

Una tercerizada rompe tres supuestos a la vez:

| Qué | Por qué no encaja |
| --- | --- |
| **La plata** | El cierre de atención registra lo cobrado como ingreso del salón. Si la clienta le paga a la maquilladora, no es ingreso: o es cero, o es una comisión |
| **La agenda** | Ocupa lugar y tiempo en el salón, así que tiene que estar en la agenda; pero no consume una estación de peluquería |
| **La disponibilidad** | Los horarios los pone ella, no el salón. Ofrecerlo online sin saber cuándo viene es prometer un turno que el salón no controla |

**No se construye hasta responder tres preguntas**, porque cada respuesta da
un modelo distinto:

1. **¿Quién cobra?** ¿La clienta le paga directo a la maquilladora, le paga
   al salón y el salón le paga a ella, o hay una comisión?
2. **¿Se reserva online o sólo queda anotado?** Hoy la portada ya deriva
   novias y eventos a WhatsApp, que es la respuesta prudente mientras la
   disponibilidad dependa de un tercero.
3. **¿Tiene días fijos en el salón?** Si los tiene, es un horario más. Si
   viene cuando hay turno, la agenda tiene que poder anotar sin garantizar.

Mientras tanto, **los cinco servicios de maquillaje no deberían seguir
reservables online**: prometen un turno con alguien cuya agenda el salón no
tiene. Anotarlos sí; venderlos online, todavía no.

### 8.9 Maquillaje, resuelto (2026-09-12)

Sol contestó las tres preguntas de §8.8:

> La clienta le paga al salón y el salón le paga a ella.
> Se reserva online en el salón.
> Viene cuando hay turno.

**Esto deja sin efecto la recomendación de §8.8** de sacar maquillaje de la
reserva online: Sol quiere que se reserve online. Lo que hace falta es que se
pueda hacer sin prometer lo que el salón no controla.

#### Lo que ya está resuelto y no hace falta construir

| Qué | Estado en producción |
| --- | --- |
| **El área** | `areas.maquillaje` existe: capacidad 1, una estación activa, `is_bookable_online = true`. No consume sillones de peluquería |
| **El dinero que entra** | La clienta le paga al salón, así que es ingreso normal: cierre de atención y seña del 20% como cualquier servicio. Nada especial |
| **El dinero que sale** | Lo que el salón le paga a la maquilladora es un **costo de esa atención**, y `service_execution_records.cost_amount` ya existe para eso |

Sobre lo último, vale anotarlo: **es el primer uso real del campo de costo.**
Hoy está vacío en todas las atenciones, y por eso el dashboard informa el
margen como NO DISPONIBLE. El maquillaje tercerizado es justamente el caso
donde el costo se conoce con exactitud, porque es una factura.

#### El hueco que parecía haber, y no hay

§8.9 planteaba un problema: si la maquilladora «viene cuando hay turno», una
clienta podía tener un maquillaje confirmado para dentro de dos horas sin que
nadie le hubiera preguntado si podía venir. La corrección propuesta era una
anticipación mínima por área, con una columna nueva en `areas`.

**Sol lo aclaró y el problema desaparece:**

> La maquilladora siempre está disponible. Solamente tiene un arreglo
> comercial con Sol.

No es un tercero con agenda propia que haya que consultar: **es alguien que
está en el salón**, y lo de «tercerizada» describe cómo se le paga, no cuándo
aparece.

Con eso, **maquillaje es un servicio normal**:

- Se reserva online con la misma anticipación que todo lo demás.
- Ocupa el área `maquillaje`, que ya existe con capacidad 1.
- Se confirma sola al pagar la seña, como cualquier turno.

**No hace falta la columna `min_advance_hours` en `areas`**, ni pedirle un
número a Sol, ni tocar el motor de disponibilidad. Queda anotado porque la
recomendación llegó a escribirse acá: se retira.

#### Lo único que queda por definir: la forma del arreglo

Lo que el salón le paga es el **costo de esa atención**, y el esquema tiene
dos lugares para eso, los dos de **monto fijo**:

| Campo | Qué es |
| --- | --- |
| `service_parameters.standard_cost_amount` | El costo esperado de ese servicio. Se precarga al cerrar la atención |
| `service_execution_records.cost_amount` | El costo real de esa atención. Prevalece sobre el estándar |

**No existe ningún costo por porcentaje en el esquema** —se buscó y no hay—,
así que la forma del arreglo decide cuánto trabajo es:

1. **Monto fijo por servicio** (por ejemplo, tanto por un maquillaje social).
   Se carga una vez en `standard_cost_amount` y el cierre lo precarga solo.
   **Cero código.**
2. **Un porcentaje del precio.** No hay dónde guardarlo: habría que escribir
   el monto a mano en cada cierre, o agregar el concepto de comisión.
3. **Un alquiler o fijo mensual.** Entonces no es costo por atención: es un
   gasto del salón y va a Finanzas › Gastos.

**Contestado (2026-09-12): «se le paga un fijo por maquillaje».** Es el
primero de los tres casos, el que no necesita construir nada:
`service_parameters.standard_cost_amount` por cada servicio de maquillaje, y
el cierre de atención lo precarga solo.

Falta **el monto**, que lo pone Sol y no se inventa. Junto con el precio de
venta, porque los cinco servicios de maquillaje siguen con precios
`industry_baseline`. Son dos números por servicio: cuánto cobra el salón y
cuánto le queda a la maquilladora.

Y vale subrayar lo que esto habilita: **es el primer servicio del salón que
va a tener margen real calculado**, porque es el único donde el costo se
conoce con exactitud en vez de estimarse.

## 9. Lo que esta reingeniería deliberadamente no toca

| | Por qué |
| --- | --- |
| El motor de disponibilidad y capacidad | Funciona, está serializado con `pg_advisory_xact_lock` y probado contra PostgreSQL real |
| ÁREA ≠ ESTACIÓN ≠ PERSONA | Es la abstracción correcta y ya está resuelta |
| La autenticación del panel | Link de un solo uso al correo, con 401/403 distinguidos. Completo |
| Los estados de reserva y la ventana de 10 minutos | Decisión de negocio ya tomada y documentada |
| La navegación del panel | Recién rehecha (2026-09-11/12), una dirección por sección |
| Los textos de la web pública | Ya dicen lo que tienen que decir sobre la seña, antes de decidir |
| El modelo de productos | Ya está separado de servicios, que es lo que el principio exige |

---

## 10. Regla de mantenimiento

Este documento se actualiza cuando un bloque de los de §7 se completa, o
cuando Sol contesta una de las preguntas de §8. Las mediciones de la planilla
(§2, §6) valen para marzo–mayo de 2026 y habría que rehacerlas con datos
nuevos antes de usarlas para decidir dentro de un año.
