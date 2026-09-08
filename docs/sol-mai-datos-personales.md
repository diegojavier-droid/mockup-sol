# Datos personales: consentimiento, alcance y lo que falta

**Estado:** implementado el consentimiento en la web (2026-09-08).
**Pendiente y no negociable:** revisión por un profesional. Quien escribió
el texto legal no es abogado.
**Origen:** dirección de producto (Diego): «si vamos a recolectar datos de
clientes en la web, esto tiene que aceptar términos y condiciones según la
reglamentación argentina de protección de datos, para cubrirnos las
espaldas».

---

## 1. El hallazgo que cambia la urgencia

La web no pide sólo nombre, WhatsApp y email. En peluquería, maquillaje y
depilación **pregunta por alergias.**

Eso es información de salud, y en la Ley 25.326 los datos de salud son
**datos sensibles**: tienen un régimen más estricto que un teléfono. No es
un detalle de formulario; es la diferencia entre un incumplimiento menor y
uno que no se puede defender.

Hasta hoy el sistema los guardaba **sin pedir ni registrar nada.** Un
consentimiento que no quedó asentado, a los efectos de defenderse, es lo
mismo que no haberlo pedido.

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

## 3. Lo que NO resuelve esto

### 3.1. No lo revisó un abogado

El texto sigue la estructura del art. 6 de la Ley 25.326, pero **no fue
revisado por un profesional.** Publicarlo es mejor que el estado anterior
—que era recolectar datos de salud sin decir nada— y no equivale a estar
cubierto. Es lo primero que hay que hacer revisar.

### 3.2. Los turnos que toma Sol por teléfono

Sólo se exige consentimiento en la web. Un turno tomado por teléfono o
mostrador se crea sin él, y bloquearlo dejaría a Sol sin poder trabajar.
La tabla ya distingue el canal, así que la evidencia no miente sobre su
propio respaldo. Cómo se pide ese consentimiento en el mostrador es una
decisión operativa, no técnica.

### 3.3. El derecho de arrepentimiento choca con la política de la seña

Esto apareció investigando y **hay que llevarlo al abogado junto con el
resto.**

La compra de un servicio a distancia tiene un derecho de arrepentimiento
de 10 días corridos (Ley 24.240 art. 34; el «botón de arrepentimiento»
estaba en la Resolución 424/2020 de Comercio Interior, reordenada por la
Disposición 954/2025). La política del salón dice que la seña se devuelve
si se avisa con 24 horas y se retiene si no.

**Las dos reglas pueden no convivir**, y si no conviven, la que cede es la
del salón. No es una opinión legal: es una tensión que alguien tiene que
resolver antes de que una clienta la plantee. También hay que definir si
corresponde publicar el botón en la portada.

### 3.4. Registro de bases de datos

La Ley 25.326 prevé un Registro Nacional de Bases de Datos a cargo de la
AAIP. Si corresponde inscribir la base del salón, es un trámite, no
código. Va en la misma consulta.

---

## 4. Lo que hay que preguntarle al abogado o al contador

1. ¿El texto de `/privacidad` es suficiente, y qué le falta?
2. ¿Corresponde el botón de arrepentimiento, y cómo se lleva con la
   política de la seña?
3. ¿Hay que inscribir la base de datos ante la AAIP?
4. ¿Cómo se pide el consentimiento en un turno tomado por teléfono?

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
