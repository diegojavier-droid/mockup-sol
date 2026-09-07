# Cómo escriben los salones argentinos

Frases **textuales**, transcritas de los sitios el 7 de septiembre de 2026.
Cada una está atada a su fuente. Cuando algo sea interpretación mía y no
una cita, lo digo.

Si volvés a investigar, sumá acá lo que encuentres — y si encontrás un
contraejemplo de algo que este archivo afirma, corregilo. Ya pasó una vez
(ver «La corrección» más abajo).

---

## BUCLES · Palermo Soho · bucles.com.ar

**Titular de la portada, textual:**

> RESERVÁ TU TURNO ONLINE Y OLVIDÁTE DE ESPERAR!

**Cómo explican el proceso de reserva:**

> TE EXPLICAMOS EN 3 SIMPLES PASOS
>
> 1. Seleccioná la Promo
> 2. Confirmá Fecha y Hora
> 3. Elegí el medio de pago.

**Títulos de sección:**

> Servicios Destacados
> COMBOS Especiales

**Frases de venta:**

> A LA VANGUARDIA DE LAS NUEVAS TENDENCIAS.
> EL CAMBIO QUE ESTÁS BUSCANDO.
> PROCESO DURADERO.

**La dirección, como título de la página:**

> Paraguay 4415 (esq. Guatemala) - Palermo Soho

Qué se aprende:

- **«Reservá tu turno» es literal, no una aproximación.** Y va con
  «online» al lado.
- **Los pasos se explican en imperativo y en vos**, numerados y de tres o
  cuatro palabras: «Seleccioná la Promo», «Confirmá Fecha y Hora». Es
  exactamente el patrón que necesita un asistente de reserva. Sol Mai usa
  la misma construcción en «Elegí por dónde empezar» y «Pedir mi turno».
- **«Servicios Destacados», sin posesivo.** Confirma por qué «Nuestras
  especialidades» sonaba raro: el rubro nombra lo que hay, no de quién es.
- **La dirección va arriba y grande.** No escondida en el pie.

---

## CERINI · Buenos Aires · cerini.net

**Su historia, textual:**

> Cerini abrió su primer salón en la calle M.T de Alvear en 1985 y desde
> el primer momento, se convirtió en una marca registrada en materia de
> tendencias en color, cortes y peinados.

> El curriculum de la peluquería, dirigida desde siempre por Claudio
> Cerini, incluye algunos de los cambios de looks más icónicos de la moda
> argentina como los cortes de pelo Carolina Peleritti y Deborah de
> Corral.

> Desde entonces hasta hoy Cerini ha recibido celebridades de todos los
> ámbitos […] quienes confían en el estilo personalizado que es el ADN de
> la peluquería.

**Cómo escriben el horario:**

> Lunes a Sábado de 8hs a 20hs

**Cómo avisan que los precios pueden cambiar:**

> Listado de precios vigentes a partir del 21 de Agosto de 2026
>
> Los precios y la disponibilidad, pueden estar sujetos a modificaciones
> sin previo aviso.

**Cómo nombran los largos en la lista de precios:**

> CORTO / MEDIO
> LARGO (debajo del hombro)

Qué se aprende:

- **La antigüedad se dice con la fecha y el lugar**, no con un adjetivo:
  «abrió su primer salón en la calle M.T de Alvear en 1985». Es el mismo
  movimiento que «Diez años peinando Santa Fe»: un dato verificable, no
  una promesa.
- **«Estilo personalizado» sí se usa** — pero Cerini se lo gana con
  cuarenta años y clientas con nombre y apellido. Ahí está el matiz que
  hundió a «Belleza a tu medida»: la frase no es mala en sí, es que no se
  puede afirmar sin nada que la sostenga.
- **«8hs a 20hs»** es la forma local de escribir un horario. La app usa
  «8 a 15», que es la misma familia y entra mejor en un teléfono.
- **Los largos se aclaran con una referencia física**: «LARGO (debajo del
  hombro)». La app hoy dice «Corto / Media melena / Largo / Muy largo»
  sin referencia. Vale la pena considerarlo: la clienta que duda entre
  «largo» y «muy largo» está adivinando, y de eso depende el precio.
- **Un aviso de precios sujetos a cambio es normal en el rubro**, y está
  escrito sin pedir disculpas. Relevante porque los precios de Sol son
  provisionales y la app muestra «Total estimado».

---

## AgendaPro · plataforma de reservas · agendapro.com

> Encuentra el servicio perfecto para ti
> Elige cuando

Qué se aprende, y es un contraste útil: **la plataforma NO habla en
argentino.** «Encuentra», «para ti», «Elige» — es español neutro, porque
le sirve a toda la región. Los salones, en cambio, escriben en voseo.

Sol Mai tiene que sonar a salón, no a plataforma. Si un texto del producto
se puede leer igual en México, está mal escrito.

---

## La corrección

La versión anterior de este archivo afirmaba:

> «Ningún salón relevado vende la reserva online como ahorro de contacto
> humano. Ninguno dice "sin llamar", "sin esperar respuesta" ni "sin
> hablar con nadie".»

**Era falso, y se armó con resúmenes de buscador en vez de con los sitios
abiertos.** BUCLES, uno de los salones más conocidos de Palermo, encabeza
su portada con «OLVIDÁTE DE ESPERAR».

Pero el veto de `vetos.md` sigue en pie, y ahora por una razón más
precisa. Hay que separar dos cosas que se parecen:

- **«Olvidate de esperar» (BUCLES) habla del tiempo**: no hacer cola, no
  quedarse sentada, no depender de que haya lugar. Eso es un beneficio
  real y se puede decir.
- **«Reservá sin esperar respuesta» (vetado) hablaba de la persona**:
  prometía que del otro lado no hay nadie que conteste.

Lo primero saca una molestia. Lo segundo saca el vínculo, que en un salón
de 150 clientas es el producto. La regla queda así: **se puede prometer
que no vas a perder tiempo; no se puede prometer que no vas a hablar con
nadie.**

Esta corrección vale más que cualquier frase de este archivo: muestra que
una regla escrita sin mirar las fuentes se convierte en una regla falsa
que después se aplica con confianza.

---

## Cómo se juntó esto

Con `curl` desde el contenedor, sobre los sitios reales, y extrayendo el
texto de los títulos y párrafos del HTML. La herramienta de fetch del
asistente sigue bloqueada aunque el entorno permita el dominio: usá
`curl` y leé el HTML.

Instagram sigue sin ser accesible (pide login). El material de la cuenta
del salón entra por capturas — ver `marca.md`, que tiene la voz de Sol
transcrita de un posteo.

## Fuentes

- https://www.bucles.com.ar/
- https://cerini.net/ · /historia/ · /servicios/
- https://agendapro.com/mp/ar/peluquerias-buenos-aires
- https://www.stardust.salon/ (la portada llega vacía: se arma con
  JavaScript, así que `curl` no ve el texto)
