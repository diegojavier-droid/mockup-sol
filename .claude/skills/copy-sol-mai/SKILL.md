---
name: copy-sol-mai
description: >
  Escribir, revisar o corregir cualquier texto que vea una clienta de Sol Mai
  Peluquería: títulos de portada, subtítulos, nombres de sección, botones,
  mensajes de error, confirmaciones, recordatorios, mails y textos de WhatsApp.
  Usala SIEMPRE que se toque una palabra visible en la app —aunque el pedido
  parezca sólo de código, de diseño o de UX— y también cuando alguien pida
  "mejorar el texto", "cambiar el título", "qué ponemos acá", "no me gusta
  cómo suena" o proponga una frase para que la evalúes. La regla central es
  que nunca se recomienda copy sin haber mirado antes cómo escriben los
  salones y las marcas argentinas de referencia, y sin haber leído el registro
  de frases que Sol ya rechazó.
---

# Copy de Sol Mai

Sol Mai es una peluquería de barrio en Santa Fe capital que cumplió diez años
en agosto de 2026, tiene unas 150 clientas y una dueña —Sol— a la que le
importa mucho cómo se ve su salón. La página no es un folleto: es la
herramienta que Sol tiene que querer usar y mostrar. Si el texto suena a
plantilla, Sol no la muestra, y si Sol no la muestra, el producto no existe.

Antes de escribir una sola palabra, leé los tres archivos de `references/`.
El segundo es el más importante.

| Archivo | Qué tiene | Cuándo leerlo |
|---|---|---|
| `references/marca.md` | Quién es Sol, qué se sabe del salón y qué está confirmado | Siempre |
| `references/vetos.md` | Frases ya rechazadas y **por qué** | Siempre, antes de proponer |
| `references/corpus-argentino.md` | Cómo escriben los salones y marcas argentinas | Antes de proponer |

## El error que originó esta skill

Se propusieron frases de portada —«Belleza a tu medida», «Nuestras
especialidades», «reservá sin esperar respuesta»— inventadas desde cero, sin
haber mirado nunca cómo escribe un salón argentino real. Las tres se
rechazaron, y la última además ofendía: vendía como beneficio que la clienta
no hable con nadie.

De ahí sale la regla que ordena todo lo demás: **el copy se investiga antes de
escribirse.** No porque haya que copiar a nadie, sino porque un rubro tiene
convenciones y romperlas por ignorancia se nota. Sonar raro es peor que sonar
común.

## Cómo trabajar

### 1. Investigá y mostrá lo que encontraste

Buscá cómo resuelven ese mismo texto los salones argentinos de referencia y
las marcas argentinas que le hablan a la misma clienta. Citá al menos tres
fuentes reales, con la frase textual que viste y de dónde salió.

Si el entorno bloquea la salida a internet —pasa: en el contenedor de este
repo sólo funciona la búsqueda web, no abrir los sitios—, **decilo en la
respuesta y marcá la propuesta como no verificada**. Es una limitación
molesta pero honesta. Presentar una frase inventada como si fuera producto de
investigación es exactamente lo que hizo falta corregir.

### 2. Proponé tres caminos, no tres sinónimos

Tres opciones que apuesten a cosas distintas: una a los diez años, otra al
trato, otra a la comodidad de reservar. Tres variantes de la misma idea no
son opciones, son una sola disfrazada.

Para cada una, decí en una línea qué apuesta y qué arriesga. Sol no necesita
que le vendas: necesita elegir con criterio.

### 3. Pasá cada frase por estas cuatro pruebas

**La prueba del nombre.** Cambiale el nombre del salón. Si la frase sigue
funcionando igual, no dice nada de Sol Mai y hay que tirarla. «Belleza a tu
medida» le sirve a cualquier peluquería del mundo; «Diez años en República de
Siria» no.

**La prueba del dato.** Cada número, horario o afirmación de la frase tiene
que salir de la base de datos o de algo que Sol dijo. Nada de «+500 clientas»,
nada de «Próximo turno: mañana 11:30» si no se consultó la agenda. Un dato
inventado en la portada es una promesa que el salón va a incumplir en persona.

**La prueba de la clienta.** Leé la frase poniéndote en la clienta de 45 años
que hace ocho años se peina con Sol. ¿La trata de igual? ¿Le promete algo que
el salón cumple? ¿Le suena a Sol o a una app? Si la frase sugiere que ahora
hay menos contacto humano, está mal escrita aunque sea verdad.

**La prueba del orgullo.** ¿Sol mandaría esta frase por WhatsApp a una amiga?
Es dueña de un salón que decoró ella, cumplió diez años y quiere que se note.
El texto tiene que estar a la altura de eso sin volverse pomposo.

### 4. Escribí en argentino

Voseo siempre: *reservá*, *elegí*, *vení*, *escribinos*. Nunca «reserva tu
cita», nunca «tú», nunca el usted salvo en un texto legal.

Vocabulario que no se negocia, porque es el que usa la clienta:

| Se dice | No se dice |
|---|---|
| turno | cita, reserva |
| reservá tu turno | agenda tu cita, book now |
| seña | depósito, anticipo, adelanto |
| pelo | cabello |
| salón, peluquería | centro de estética, beauty studio |
| te esperamos | la esperamos |

### 5. Respetá el largo

Un título que no entra en un teléfono no es un título.

| Lugar | Largo | Nota |
|---|---|---|
| Título de portada | 2 a 5 palabras | Tiene que entrar en dos renglones en un celular |
| Subtítulo de portada | 1 frase, hasta ~90 caracteres | Dice qué hacer y qué esperar |
| Título de sección | 2 a 4 palabras | Nombra lo que la clienta quiere, no cómo se organiza el negocio |
| Botón | 1 a 3 palabras, con verbo en vos | «Reservar turno», no «Continuar» |
| Error | 1 frase | Qué pasó y qué hacer ahora. Nunca culpar a la clienta |

### 6. Actualizá el registro de vetos

Cuando Sol o quien dirija el producto rechace una frase, sumala a
`references/vetos.md` **con el motivo textual**. El motivo vale más que la
frase: es lo que evita volver a equivocarse de la misma manera con otras
palabras. Ese archivo es el activo real de esta skill.

## Formato de entrega

```
## <Dónde va el texto>

**Lo que hay hoy:** «...»
**Por qué no sirve:** una línea

**Lo que encontré:** tres referencias reales, con la frase textual y la fuente.
(O, si no se pudo abrir ningún sitio: decirlo acá con todas las letras.)

**Opción A — <la apuesta en dos palabras>**
«...»
Apuesta a: ... · Riesgo: ...

**Opción B — <la apuesta>**
«...»
Apuesta a: ... · Riesgo: ...

**Opción C — <la apuesta>**
«...»
Apuesta a: ... · Riesgo: ...

**Cuál recomiendo y por qué:** un párrafo corto.
```

Una recomendación, no un catálogo. Si las tres te parecen iguales de buenas,
es que no exploraste tres caminos distintos.
