# El módulo cliente · la web pública

> **Qué es esto.** El recorrido completo de una clienta desde que entra a la
> web hasta que su turno queda reservado, documentado contra el código que lo
> implementa y **verificado en un navegador real**.
>
> **Cómo se verificó.** `scripts/reserva-e2e.mjs` recorre el camino entero a
> 400 px de ancho —un teléfono— con el API simulado, y hace 21
> comprobaciones. Corrió en verde el 2026-09-12. Instrucciones al final.

---

## 1. El principio que gobierna esta mitad del sistema

**La clienta no ve la informalidad interna.**

Adentro hay estados (`pending_payment`, `expired`, `no_show`), canales
(`online`, `manual`, `phone`, `whatsapp`, `walk_in`), procedencias de precio
(`industry_baseline`, `sol_pricelist`), excepciones de capacidad y bloqueos
de estación. **Nada de eso aparece del lado de la clienta**, y el recorrido
automatizado lo comprueba explícitamente: la primera pantalla se revisa
buscando `pending_payment`, `walk_in` y `no_show`, y no aparecen.

Lo que la clienta ve es una guía: qué se hace acá, cuánto sale más o menos,
cuándo hay lugar, y cuánto tiene que pagar ahora para que el turno sea suyo.

---

## 2. El recorrido, paso a paso

### Paso 0 · Portada — `src/routes/index.tsx`

```
PELUQUERÍA · Santa Fe · República de Siria 3798
«Un lugar pensado para vos.»
«Elegí el horario que te quede cómodo y reservá tu turno.»
                 [ Ver servicios ]
```

Una sola acción principal. Debajo, «Elegí por dónde empezar» con las
categorías, y un bloque aparte para novias y eventos que **deriva a
WhatsApp** en vez de intentar reservarlo online: son turnos que se arman
hablando, y fingir lo contrario sería peor que no ofrecerlo.

Si la clienta está identificada y Sol aprobó el vínculo, acá arriba aparece
además el bloque «Hola María» con sus servicios anteriores
(`KnownCustomerBlock`, §5).

### Paso 1 · Categorías — `steps/CategoryStep.tsx`

Cuatro categorías públicas: **Peluquería, Uñas, Maquillaje, Depilación**.

> **Hallazgo pendiente de decisión.** Maquillaje está publicada y reservable
> online y **no facturó un solo peso en los tres meses de planilla**. Ver
> `docs/sol-mai-reingenieria.md` §2.

### Paso 2 · Servicios — `steps/ServiceStep.tsx`

Los servicios de esa categoría, en tarjetas con foto, agrupados («Más
elegidos», «Cortes & peinados»). El precio se comunica **«Desde $15.000»**,
nunca como precio cerrado: es orientativo y el sistema no promete lo que no
puede garantizar antes de ver el pelo.

Tocar una tarjeta abre la **ficha del servicio** como panel lateral, con la
descripción y el botón `Reservar turno`.

### Paso 3 · Detalles y Extras — se omiten cuando no aportan

Acá está la decisión de diseño más importante del wizard: **un paso que no
pide una decisión real no se muestra.** Si el servicio no tiene campos de
personalización, no hay paso «Detalles»; si no tiene extras, no hay paso
«Extras».

Verificado: con un servicio sin campos ni extras, el wizard anuncia
**«PASO 3 DE 5»**, no «de 7». Los pasos no existen, no aparecen vacíos.

### Paso 4 · Fecha y hora — `steps/DateTimeStep.tsx`

```
‹  Septiembre 2026  ›
LUN 14      MAR 15   MIÉ 16   JUE 17   VIE 18      SÁB 19      DOM 20
sin lugar                                          sin lugar   sin lugar

Horarios
«Tocá un día de arriba y te mostramos los horarios.»
```

Dos decisiones correctas:

1. **Los días sin lugar se muestran apagados, con el motivo escrito.** No se
   esconden. Una clienta que no ve el lunes no sabe si el salón cierra o si
   la web se rompió; una que ve «LUN 14 · sin lugar» lo sabe.
2. **Los horarios no existen hasta elegir el día.** No hay una grilla enorme
   de la que haya que descartar.

> Con el calendario real de Sol —martes a viernes— los lunes, sábados y
> domingos van a salir siempre «sin lugar». Conviene que lo digan mejor:
> «cerrado» en vez de «sin lugar». Ver §6.

### Paso 5 · Tus datos — `steps/CustomerDataStep.tsx`

```
PASO 4 DE 5 · Tus datos
¿Cómo podemos contactarte?
Con esto te llega la confirmación, el link para pagar la seña
y el recordatorio del turno.

Nombre *      [ Tu nombre           ]
WhatsApp *    [ Ej: 342 555 1234    ]
Email *       [ tu@email.com        ]

[ ] Acepto los términos y la política de privacidad.
    Tus datos los usamos sólo para tu turno. Leer el detalle
```

Tres cosas bien resueltas:

- **Se dice para qué se piden los datos**, en la misma pantalla y antes de
  pedirlos.
- **El consentimiento es obligatorio y bloqueante.** El recorrido lo prueba
  intentando avanzar sin tildarlo: el sistema no deja pasar. Guardar datos
  personales sin consentimiento sería el error grave de esta pantalla, y la
  comprobación lo intenta de verdad en vez de darlo por hecho.
- **El detalle está a un clic**, no enterrado.

### Paso 6 · Resumen — `steps/ReviewStep.tsx`

El paso que justifica todo el flujo. Antes de confirmar, y **no después**:

> Cancelando con más de 24 horas de anticipación, te devolvemos la seña.
> **Si no venís y no cancelaste antes, la seña no se devuelve.**

Esa segunda línea es la regla que convierte la seña en un compromiso y no en
un trámite. Está en `ReviewStep.tsx:102` y el recorrido la verifica.

Que la comprobación no es decorativa se probó borrando esa línea del
componente: el recorrido pasó de 21/21 a 20/21 señalando exactamente
«LA REGLA CLAVE: dice que si no viene, la seña no se devuelve». Restaurada la
línea, volvió a 21/21.

### Paso 7 · Pago de la seña y estado de la reserva

- La reserva nace `pending_payment` y **retiene el turno 10 minutos**
  (`payment_required_until = created_at + 10 min`).
- Sin pago aprobado en esa ventana pasa a `expired` y libera el turno.
- El importe **lo calcula el backend**: el navegador nunca manda montos.
- Sólo el webhook de Mercado Pago, con firma HMAC-SHA256 verificada, confirma
  un turno.
- La clienta recibe el link a `/reserva/:token`, donde ve el estado, paga y
  puede cancelar. La regla de 24 h se le vuelve a decir **antes** de
  confirmar la cancelación, con el texto que corresponde según cuánto falte
  (`src/routes/reserva.$token.tsx:82-83`).

---

## 3. El resultado del recorrido verificado

```
1. Landing        ✓ la portada invita a ver servicios
                  ✓ no se habla de señas, estados ni canales en la portada
2. Categorías     ✓ aparecen las categorías del salón
3. Servicios      ✓ se listan los servicios con precio orientativo
                  ✓ el precio se comunica como «Desde», no como cerrado
4. Ficha          ✓ se abre la ficha del servicio elegido
                  ✓ la ficha ofrece reservar
5. Fecha y hora   ✓ el wizard pide fecha y hora
                  ✓ el wizard omite los pasos que no piden una decisión real
                  ✓ los días cerrados se marcan «sin lugar», no se esconden
                  ✓ hay al menos un día con lugar
                  ✓ al elegir el día aparecen los horarios
6. Tus datos      ✓ se piden los datos de contacto
                  ✓ se explica para qué se usan esos datos
                  ✓ hay que aceptar los términos para poder seguir
                  ✓ se explica para qué se usan los datos, con link al detalle
                  ✓ NO deja avanzar sin aceptar el consentimiento
7. Resumen        ✓ el resumen dice cuánto es la seña
                  ✓ LA REGLA CLAVE: dice que si no viene, la seña no se devuelve
                  ✓ dice la ventana de 24 horas antes de confirmar
                  ✓ la página no tiró ningún error de JavaScript

21 comprobaciones pasaron, 0 fallaron.
```

**Qué prueba y qué no.** Prueba que el recorrido se puede completar en un
teléfono, sin ayuda, y que las reglas del dinero están escritas antes de
decidir. **No prueba** que el backend funcione: el API está simulado. Para
eso está `scripts/panel-e2e.mjs`, que sí necesita base y tokens reales.

---

## 4. Servicios ≠ Tratamientos ≠ Productos, del lado de la clienta

| Eje | Cómo lo ve la clienta | Dónde |
| --- | --- | --- |
| **Servicio** | Se elige, se reserva, tiene fecha y hora | Catálogo público |
| **Tratamiento** | **Hoy se ve igual que un servicio, y está mal** | §6 |
| **Producto** | No se ve. No es reservable ni aparece en la web | Sólo panel (Inventario) |

Los productos ya están correctamente afuera: no ensucian el catálogo.

El problema son los tratamientos. Para la clienta, `botox` o `nutricion`
aparecen como un servicio suelto igual que un corte, cuando en el salón real
casi siempre se hacen **arriba de un color** y a un precio distinto —medido:
$7.000 a $11.000 como agregado contra $20.000 a $36.000 sueltos—.

**Lo que la clienta debería poder hacer y hoy no puede:** elegir un color y
que la web le ofrezca sumarle un tratamiento, con el precio de agregado. Es
exactamente lo que Sol hace en el mostrador en el 47% de los tickets de
color. Hoy la web no lo ofrece, así que el enganche comercial más importante
del salón no existe online.

---

## 5. La clienta que vuelve

Especificación completa en `docs/returning-customers-flow.md`. En una línea:
si la identidad está probada por un proveedor de identidad **y Sol aprobó el
vínculo**, la reserva no empieza con el catálogo sino con lo que ya se hizo.
El teléfono nunca alcanza para eso.

---

## 6. Lo que falta, en orden

| # | Qué | Por qué | Dónde |
| --- | --- | --- | --- |
| 1 | **Ofrecer tratamientos como agregado de un color** | Es el 47% de los tickets de color y online no existe | §4 |
| 2 | **Encender el reconocimiento de clientas** | Está construido y apagado por falta de credenciales de Google | `returning-customers-flow.md` §9 |
| 3 | **Cobro real de la seña** | Sin credenciales de Mercado Pago, `checkoutUrl: null` y la seña se coordina a mano | Fuente de verdad |
| 4 | **Confirmaciones y recordatorios reales** | Falta proveedor de email y de WhatsApp | Fuente de verdad |
| 5 | **«Cerrado» en vez de «sin lugar» los días que el salón no abre** | Con el calendario real, los lunes van a decir «sin lugar» siempre, que suena a «se llenó» | §2, paso 4 |
| 6 | **Revisar Maquillaje** | Publicada, reservable, cero facturación en tres meses | `sol-mai-reingenieria.md` §2 |

Los puntos 3 y 4 **no son trabajo de código**: son credenciales.

---

## 7. Cómo correr el recorrido

```bash
bun run dev                    # en una terminal
node scripts/reserva-e2e.mjs   # en otra
```

`playwright` no está en `package.json` y hay que instalarlo aparte. En el
contenedor, Chromium está en `/opt/pw-browsers/`; si está en otro lado, se
pasa por `CHROME_PATH`. Para apuntar a otra URL, `BASE_URL`.

Cuando una comprobación falla, el script deja `reserva-e2e-fallo.png` con el
estado final de la pantalla (ignorado por git). Cuando pasa todo no deja
nada: un PNG por corrida exitosa ensucia el repositorio y nadie lo mira.

**Las fuentes de Google se bloquean a propósito**: cuelgan a Chromium en este
contenedor. La página se ve con tipografías de respaldo y eso no afecta
ninguna comprobación.
