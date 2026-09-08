# El CRM de Sol Mai: qué muestra y qué se niega a mostrar

**Estado:** documento de definición. Nada de esto está construido todavía.
**Encuadre reemplazado (2026-09-08):** este documento trataba al CRM como
si fuera todo el panel. Pasó a ser uno de nueve módulos; ver
`docs/sol-mai-arquitectura-modular.md`. Lo que sigue vigente acá es el
contenido: qué muestra y qué no muestra la ficha de la clienta.
**Fecha:** 2026-09-07
**Origen:** dirección de producto (Diego): «estoy viendo por primera vez el
CRM en imágenes y nunca nos pusimos de acuerdo de lo que mostrará o no.
Debe ser una herramienta fácil, operable, amigable y sin complicaciones.
Recordemos que será asistida por IA y lo que se busca es descomplicar las
operaciones de la peluquería, no agregarle más complejidad. No me interesa
un CRM anticuado.»

---

## 0. Aclaración necesaria antes de discutir nada

**Hoy no existe ninguna pantalla de CRM en el producto.** Lo que se vio en
imágenes no es una pantalla construida: es un mockup o una captura de
referencia.

Lo que sí existe, y funciona, es el backend:

| Endpoint | Qué hace hoy | Quién lo usa |
|---|---|---|
| `GET /admin/customers?q=` | Busca clientas por nombre o teléfono | Sólo el diálogo de turno nuevo |
| `GET /admin/customers/:id` | Ficha: últimos 50 turnos con precio de cierre real y fórmula, más las últimas 50 notas | **Nadie** |
| `POST /admin/customers/:id/notes` | Agrega una nota a la ficha | **Nadie** |

Es decir: la ficha de la clienta ya está escrita y devolviendo datos
reales, y no hay una sola pantalla que la muestre. Ese es el hueco.

---

## 1. Qué se usa realmente en este rubro

Investigación (búsqueda web, septiembre 2026; los sitios de los productos
no se pudieron abrir desde este entorno, así que esto son resúmenes de
prensa y de los propios blogs de los proveedores, no citas textuales de
producto).

### Lo que se usa afuera

| Producto | A quién apunta | Lo que lo distingue |
|---|---|---|
| **Fresha** | Salones chicos y medianos | Gratis, pero cobra ~20% de comisión sobre clientas nuevas del marketplace |
| **Booksy** | Barberías y peluquerías | Muy intuitivo; en 2026 usa IA para optimizar la grilla de turnos |
| **Mangomint** | Salones modernos de gama alta | El que se cita como referencia de diseño |
| **Boulevard** | Cadenas | Multi-local, reporting pesado |
| **Phorest** | Marcas establecidas | App propia con la marca del salón |

### Lo que se usa en Argentina

| Producto | Nota |
|---|---|
| **Booksolut** | Bot de WhatsApp con IA en español rioplatense, Mercado Pago, seña obligatoria, ficha de clientas |
| **Gendu** | Argentino, precio fijo en pesos, sin porcentaje sobre ingresos |
| **LinkTurno** | Para profesionales solos: un link corto que se comparte por WhatsApp |
| **AgendaPro** | Recordatorios por WhatsApp/SMS/email programables |

**El dato que importa:** en Argentina todos, sin excepción, entran por
WhatsApp y casi todos cobran seña por Mercado Pago. Eso ya lo tenemos o
está en curso. Ninguno de ellos es una ventaja competitiva; son la mesa de
entrada.

### Lo que la IA agrega, según los proveedores

Cuatro cosas se repiten. Las anoto con su origen, porque **son promesas de
marketing de los propios vendedores, no mediciones nuestras**:

1. **Ficha con historial, fórmula, preferencias y fotos**, accesible en
   cualquier turno futuro sin importar quién atienda. Es lo que más se usa
   en un salón de color.
2. **Rebooking automático**: el sistema nota que una clienta que viene
   cada cinco semanas va por la séptima y manda un mensaje personalizado.
3. **Predicción de ausencia**: probabilidad de que falte, calculada antes
   del turno, para actuar sobre las de riesgo alto.
4. **Recuperación de clientas dormidas**: detectar la fuga antes de que
   sea fuga.

Cifras que circulan y **que no vamos a repetir como propias**: −27% de
ausencias, −50,7% de turnos perdidos, +82% de retención, +35% de
rebooking, −80% de ausencias con recordatorios por WhatsApp. Son de los
blogs de los proveedores. No hay forma de auditarlas.

---

## 2. El error que no vamos a cometer

Un CRM anticuado no es feo. Es **una pantalla que le pide a Sol que cargue
datos para que el sistema tenga datos.** Segmentos, etiquetas, campañas,
embudos, estados del cliente, campos personalizados. Todo eso existe
porque alguien tiene que llenarlo, y en un salón de dos personas nadie lo
llena. A las tres semanas la base miente y la pantalla es decoración.

Sol tiene ~150 clientas y las conoce por nombre. **No necesita un sistema
que le informe quién es la clienta. Necesita un sistema que recuerde lo
que ella ya no puede recordar de memoria** —qué fórmula usó en abril,
cuánto pagó, qué le molestó— y que haga sola la parte administrativa.

De ahí la regla que ordena todo el diseño:

> **Si un campo del CRM sólo se llena porque el CRM lo pide, no va.**

Todo lo que el CRM muestre tiene que salir de algo que ya ocurrió: un
turno que se cerró, una seña que se pagó, una nota que Sol escribió porque
le servía a ella.

---

## 3. Qué muestra el CRM de Sol Mai

Una sola pantalla por clienta, que se abre desde la agenda o desde el
buscador. No hay «módulo de CRM»: hay **la ficha de la clienta**, y se
llega a ella tocando su nombre donde sea que aparezca.

### 3.1. Arriba: quién es y cuándo vuelve

- Nombre y WhatsApp (con botón para abrir la conversación).
- **Cada cuánto viene**, calculado de los turnos reales: «viene cada 5
  semanas más o menos». Si tiene menos de tres turnos, dice «todavía no se
  puede saber» en vez de inventar un número.
- Próximo turno, si tiene.

### 3.2. El centro: la última vez

Lo primero que Sol necesita antes de tocarle el pelo a alguien:

- **Qué se hizo la última vez**, con la fecha.
- **La fórmula**, textual, tal como se cerró el turno. Ya la guardamos en
  `service_execution_records.formula`. Es el campo más usado del CRM en un
  salón de color y nosotros lo tenemos escrito y sin mostrar.
- **Cuánto se cobró de verdad** (`final_price_amount`), no el estimado.
- Las notas: las que escribió la clienta al reservar y las que escribió
  Sol después.

### 3.3. Abajo: el historial

La lista de turnos, del más nuevo al más viejo, cada uno con servicio,
fecha, precio de cierre y estado. Sin gráficos. Sin «valor de vida del
cliente». Si Sol quiere ver un año atrás, baja.

### 3.4. Lo que Sol escribe

Un solo campo libre, siempre visible, que agrega una nota fechada. Sin
categorías, sin etiquetas, sin campos obligatorios. Ya existe el endpoint.

---

## 4. Qué NO muestra

Esto es la mitad de la definición, y es la mitad que se olvida.

| No va | Por qué |
|---|---|
| Puntaje, ranking o clasificación de clientas (A/B/C, «VIP», «en riesgo») | Sol conoce a sus clientas. Un cartel que diga «riesgo de fuga» al lado del nombre de alguien que viene hace ocho años es ofensivo y además probablemente falso con 150 filas de historia |
| Valor de vida del cliente, ticket promedio proyectado, margen | Ya está decidido: **no se muestran costos ni márgenes inventados**. Y proyectar sobre 150 clientas es estadística de fantasía |
| Embudos, oportunidades, etapas, pipeline | Vocabulario de venta B2B. Acá no hay pipeline: hay turnos |
| Campos personalizados y etiquetas | Nadie los va a llenar. Ver la regla de la sección 2 |
| Campañas de marketing masivo | Mandar 150 mensajes iguales por WhatsApp es la forma más rápida de que a Sol le bloqueen el número |
| Cumpleaños, si nadie lo pidió | No lo pedimos al reservar y no vamos a agregar un campo al formulario de la clienta para alimentar al CRM |
| Fotos | Es la funcionalidad más citada afuera y **la dejamos afuera a propósito por ahora**: implica almacenamiento, consentimiento de la clienta y una política de borrado. Es una decisión de Sol, no una feature que se cuela |

---

## 5. Dónde entra la IA (y dónde no)

La IA acá no es un chat adentro del panel. Es que **el trabajo aparezca
hecho.**

### 5.1. Lo que ya está construido y es exactamente esto

- La ausencia se marca sola pasadas las horas de gracia.
- La devolución pendiente aparece sola en un cartel, con el monto, y Sol
  toca «ya la devolví».
- Sol marca «llegó». Nada más.

Eso ya es la tesis funcionando. El CRM la continúa, no la reemplaza.

### 5.2. Lo que corresponde agregar, en orden

**a) El resumen de la clienta, escrito.** Dos o tres líneas sobre la ficha
que digan lo que Sol miraría en treinta segundos: qué se hizo la última
vez, con qué fórmula, si algo salió mal, cada cuánto viene. Es resumir
datos que ya están, no adivinar.

**b) El aviso de que alguien se pasó de su ritmo.** Si viene cada cinco
semanas y va por la octava, aparece en una lista. **La lista es una
sugerencia, no una acción**: el mensaje lo manda Sol tocando un botón que
abre WhatsApp con el texto ya escrito. Nunca sale solo.

**c) El borrador de mensaje.** Cuando Sol quiere escribirle a alguien, el
texto ya está redactado con su voz y con los datos reales del turno. Sol
lee, corrige si quiere, manda. El envío es siempre de ella.

### 5.3. Las tres reglas que no se negocian

1. **La IA no inventa un dato.** Si no hay fórmula guardada, dice que no
   hay. No la deduce del servicio.
2. **La IA no le escribe a nadie sola.** Redacta; manda Sol. Un mensaje
   automático mal mandado a una clienta de ocho años cuesta más que todo
   lo que ahorra la automatización.
3. **La IA no clasifica personas.** Puede decir «hace nueve semanas que no
   viene». No puede decir «clienta en riesgo».

---

## 6. La métrica

No es cuántas clientas hay cargadas ni cuántas notas se escribieron.

**Es cuántas veces Sol tuvo que abrir el panel para hacer una tarea
administrativa.** Si el CRM funciona, ese número baja. Si sube, el CRM se
convirtió en el trabajo en vez de sacarlo.

---

## 7. Qué falta para construirlo

Casi nada de backend. Casi todo de pantalla.

| Pieza | Estado |
|---|---|
| Buscar clientas | **Existe** |
| Ficha con turnos, fórmula y precio de cierre | **Existe**, sin pantalla |
| Escribir notas | **Existe**, sin pantalla |
| Pantalla de ficha | Falta (es el bloque principal) |
| Entrar a la ficha desde la agenda | Falta |
| Cada cuánto viene | Falta: se calcula de los turnos, no se guarda |
| Resumen escrito | Falta |
| Lista de «se pasó de su ritmo» | Falta |
| Botón que abre WhatsApp con el texto listo | Falta |
| Fotos | **Decisión pendiente de Sol** |

---

## 8. Decisiones que necesito de dirección antes de construir

1. **¿Fotos sí o no?** Es la funcionalidad más usada afuera y la que más
   compromete: hay que guardar imágenes de las clientas y decidir quién
   las ve y cuándo se borran.
2. **¿La ficha se abre desde la agenda tocando el nombre, o hay también
   una lista de clientas?** Mi recomendación: sólo desde la agenda y desde
   el buscador. Una lista de 150 filas no se usa nunca.
3. **¿Cuántas semanas de atraso convierten a alguien en «hace mucho que no
   viene»?** Hoy no hay dato validado. Lo dejo configurable y sin valor
   por defecto inventado.
