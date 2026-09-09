# Datos personales: consentimiento, alcance y lo que falta

**Estado:** implementado y funcionando (2026-09-08).
**Origen:** dirección de producto (Diego): «que la clienta acepte dar sus
datos, con unos términos y condiciones que al final nadie lee. Es algo
para mostrar más profesionalidad en la página y que la clienta se sienta
segura dentro de la experiencia de navegación».

**Qué es esto y qué no.** No es un blindaje jurídico ni pretende serlo:
es una pieza de confianza. La mayoría de las clientas no va a leer el
texto, y está bien —así funciona en todos lados—. Lo que sí ven es que la
página lo tiene, que les pide permiso en vez de tomarlo, y que hay una
respuesta clara si alguna vez la buscan. Eso es lo que transmite un salón
que sabe lo que hace.

---

## 1. El hallazgo que justificó hacerlo bien

La web no pide sólo nombre, WhatsApp y email. En peluquería, maquillaje y
depilación **pregunta por alergias.**

Eso es información de salud, y en la Ley 25.326 los datos de salud son
**datos sensibles**: tienen un régimen más estricto que un teléfono. No es
un detalle de formulario; es la diferencia entre un incumplimiento menor y
uno que no se puede defender.

Hasta hoy el sistema los guardaba **sin pedir ni registrar nada.** Más
allá de lo formal, es lo que una clienta notaría si prestara atención: le
preguntan por su salud y nadie le dice para qué ni le pide permiso. Eso
es justo lo contrario de la sensación que la página tiene que dar.

---

## 2. Qué se construyó

### 2.1. El consentimiento es un hecho, no una casilla

Tabla `customer_consents`: quién aceptó, **qué versión del texto**, por
qué canal y cuándo. Se guarda el hecho, no un booleano que se pisa: si
mañana cambia la política, hay que poder decir qué texto aceptó cada
clienta, no sólo que alguna vez aceptó algo.

### 2.2. La versión la manda el servidor

`TERMS_VERSION` vive en el servidor y viaja al navegador en
`GET /catalog/salon`. El front no tiene copia propia y devuelve la que
recibió. Si no coinciden, el servidor rechaza y pide recargar.

Esto cubre un caso real: una pestaña abierta hace dos semanas muestra el
texto viejo. Sin esta comprobación, esa aceptación quedaría registrada
como si fuera del texto nuevo. Sería una prueba falsa fabricada por
nosotros.

**La regla que lo sostiene:** cambiar el texto sin subir `TERMS_VERSION`
en el mismo commit es el único error grave posible acá.

### 2.3. Sin aceptar no se reserva

- En la pantalla: la casilla **no viene premarcada** —un casillero
  premarcado no es consentimiento libre y expreso, y además no sirve como
  prueba— y el botón de continuar no avanza sin ella.
- En la API: sin `consent`, la reserva se rechaza antes de crear nada.

Los dos, porque el guard de la interfaz protege a la clienta y el de la
API protege al salón.

### 2.4. Lo que deliberadamente NO se guarda

**La dirección IP.** Es la forma habitual de «reforzar la prueba», y es
recolectar un dato personal más para cubrirse de haber recolectado datos
personales. La minimización es un principio de la propia ley. Para un
salón de barrio, la versión, la fecha y el turno alcanzan.

### 2.5. El texto

`/privacidad` cubre lo que pide el art. 6: quién es responsable, qué se
guarda y para qué, que **responder por alergias es voluntario**, con quién
se comparte, cuánto se conserva, y los derechos de acceso, rectificación y
supresión con el correo para ejercerlos.

---

## 3. Lo que queda afuera

Tres cosas, ninguna bloqueante. Se anotan para que no se descubran por
sorpresa dentro de seis meses.

**Los turnos que Sol toma por teléfono.** Sólo se pide aceptación en la
web. Bloquear el mostrador dejaría a Sol sin poder trabajar, así que no se
bloquea. La tabla guarda el canal, de modo que un turno de teléfono no
figura con el mismo respaldo que uno de la web: el registro no miente
sobre sí mismo.

**El derecho de arrepentimiento.** Contratar un servicio a distancia da
diez días de arrepentimiento (Ley 24.240 art. 34). La política del salón
devuelve la seña con 24 horas de aviso. Los dos plazos conviven mientras
nadie reclame; si algún día alguien lo plantea, la respuesta más barata es
devolverle la seña y seguir. No cambia nada de lo que hay que construir.

**Inscribir la base ante la AAIP.** Existe un registro nacional de bases
de datos. Es un trámite administrativo, no código, y en su momento lo
resolverá el contador de Sol junto con lo demás.

---

## 4. La regla operativa que sí importa

**Si se toca el texto de `/privacidad`, se sube `TERMS_VERSION` en el
mismo commit.** Es el único error grave posible acá: dejaría filas
diciendo que alguien aceptó algo que nunca vio, que es exactamente la
prueba que este trabajo vino a construir.

---

## 5. Cómo se probó

Contra PostgreSQL real, el Worker real y Chromium, no contra mocks.

| Prueba | Resultado |
|---|---|
| Reservar sin aceptar → rechazado | HTTP 400 |
| Reservar con una versión vieja → rechazado | HTTP 422 |
| Reservar aceptando → creado y consentimiento registrado | 201 + fila en `customer_consents` |
| Turnos online sin consentimiento en la base | 0 |
| La casilla no viene premarcada | verificado en el navegador |
| Sin tildar no avanza, y explica por qué | verificado en el navegador |
| Reserva completa desde el navegador | creada, con su consentimiento |
| Suites e2e (flujo, estaciones, combo) | verdes |
| 113 pruebas unitarias, typecheck, lint, build | verdes |
