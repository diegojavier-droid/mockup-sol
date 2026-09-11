# Señas, ausencias y avisos automáticos

**Estado:** puntos 1 y 2 del plan CONSTRUIDOS (2026-09-07). El resto,
propuesta.
**Fecha:** 2026-09-07
**Origen:** dirección de producto (Diego): «Sol sólo se debe preocupar por
ingresar una validación cuando la clienta llegue al local. El resto deberá
ser automático. Queremos aliviarle la vida, no meterle más
preocupaciones.»

---

## 1. El objetivo, en una línea

**Sol hace UNA sola cosa: marcar que la clienta llegó.** Todo lo demás
—retener, devolver, avisar— ocurre solo.

Hoy no es así. Hoy Sol tiene que marcar la ausencia a mano, y la
devolución de una seña no la hace nadie: el sistema anota que corresponde
devolver y ahí queda. Se le prometió a la clienta y no hay quien lo
ejecute.

---

## 2. Dos hallazgos que corrigen el pedido

### 2.1. Mercado Pago no cobra comisión cuando se devuelve

La instrucción fue: «se le devuelve la seña **menos lo que cobra Mercado
Pago** y se le explica; no lo absorbemos nosotros».

La documentación de Mercado Pago dice que **al procesar un reembolso no se
cobra la comisión del pago recibido**, tanto en devoluciones totales como
parciales, hasta 90 días después del pago.

Si eso se confirma, **no hay nada que descontar**: descontarlo igual sería
cobrarle a la clienta un costo que el salón no tuvo. Eso es exactamente lo
contrario de «cubrirnos las espaldas»: es lo que no se puede defender si
una clienta lo reclama.

**No está verificado todavía.** El contenedor no llega a los sitios de
Mercado Pago, así que esto viene de su documentación leída de segunda
mano. **Se resuelve solo con una prueba real**: en cuanto haya
credenciales, se cobra una seña de prueba, se devuelve, y se lee cuánto
volvió. El objeto de pago de Mercado Pago trae el detalle de comisiones,
así que el número sale de ahí y no de una suposición.

**Hasta tener ese número, el sistema no debe prometer «te devolvemos el
100%» ni «menos la comisión».** Ver §4.

### 2.2. El número de WhatsApp: hay dos caminos, y cambian todo

**Revisado el 2026-09-11.** Lo que decía antes esta sección —que migrar un
número es siempre un camino de ida— era cierto para el único camino que
existía cuando se escribió. Ahora hay dos, y conviene verificar cuál
aplica antes de gastar un trámite.

**Camino 1 — migración directa.** El número entra a la API y **deja de
funcionar en la aplicación de WhatsApp y en WhatsApp Web**, para siempre.
El historial de chats de ese número **se pierde** y no se puede restaurar.
Esto está en la documentación de Meta y no está en duda.

**Camino 2 — coexistencia.** El mismo número funciona a la vez en la
aplicación y en la API: los chats y los contactos se conservan, y Sol
sigue conversando desde su teléfono mientras el sistema manda los avisos.
Se hace a través de un proveedor que soporte el alta de un número de la
Business App, no por el flujo directo de la Cloud API.

**Lo que NO está verificado** y hay que confirmar antes de decidir:

- Si la coexistencia está disponible en Argentina hoy. Varias fuentes de
  proveedores dicen que desde mayo de 2026 está en todos los países; no se
  pudo abrir la documentación de Meta desde este entorno para confirmarlo.
- Si exige que el número esté en **WhatsApp Business App** y no en
  WhatsApp común. El nombre del flujo —«business app number onboarding»—
  sugiere que sí.
- Qué proveedores lo soportan para Argentina, y a qué precio.

**Por qué importa tanto.** Si la coexistencia funciona, lo mejor NO es un
segundo número: es que los avisos salgan **del número que las clientas ya
tienen agendado**. Un recordatorio que llega de un número desconocido se
lee como spam; uno que llega del número de Sol, no.

Si no funciona, vale lo de antes: **hace falta un segundo número dedicado**
y el de Sol queda intacto para conversar.

---

## 3. El flujo automático

Estados que ya existen en la base: `pending_payment`, `confirmed`,
`attended`, `cancelled`, `expired`, `no_show`. La seña tiene su propio
estado: `none`, `paid`, `refunded`, `retained`.

### 3.1. Lo único que hace Sol

Cuando la clienta llega: **marcar que llegó**. Un botón en la agenda.

### 3.2. Lo que ocurre solo

| Situación | Disparador | Qué hace el sistema |
|---|---|---|
| La clienta llega | Sol marca la llegada | Turno `attended`. La seña se aplica al total; el saldo se cobra en el salón. |
| Cancela con ≥ 24 h | La clienta desde su link o respondiendo el aviso | Turno `cancelled`, **devolución pedida a Mercado Pago automáticamente**, aviso a la clienta con el monto que vuelve. |
| Cancela con < 24 h | Ídem | Turno `cancelled`, seña retenida, aviso explicando por qué. |
| No llega y no avisó | Tarea automática, un rato después del horario | Turno `no_show`, seña retenida, aviso a la clienta. |
| No pagó la seña a tiempo | Ya funciona hoy | Turno `expired`, el horario se libera. |

La ventana de 24 h no está escrita en el código: es el parámetro
`refund_window_hours`. Cambiarla es cambiar un número.

### 3.3. El riesgo del marcado automático de ausencia, y cómo se cubre

Si Sol se olvida de marcar una llegada, el sistema marcaría ausente a una
clienta **que sí vino** y le retendría la seña. Es el error más caro que
puede cometer este diseño: le cobra a alguien que cumplió.

Tres protecciones, en orden:

1. **Margen generoso.** La ausencia no se marca al minuto siguiente del
   horario, sino bastante después —a definir con Sol; se sugiere el
   cierre del día—. Una clienta que llegó tarde y fue atendida da tiempo
   a que Sol marque la llegada.
2. **La clienta es la red de seguridad, no Sol.** El aviso de ausencia se
   le manda a ella. Si vino y le llega ese mensaje, responde en el acto.
   Es quien más incentivo tiene para revisar, y no le agrega trabajo a
   Sol.
3. **Todo es reversible y queda registrado.** Ya existe el mecanismo para
   que Sol revierta y decida distinto, guardando su decisión **y** lo que
   la regla hubiera dicho. Una excepción queda explicada, no parece un
   error.

---

## 4. Qué se le dice a la clienta, y cuándo

Regla que atraviesa todo: **la clienta se entera de la regla antes de
pagar, no después de perder la plata.** Eso es lo que de verdad «cubre las
espaldas»; el resto es letra chica que nadie leyó.

### 4.1. Antes de confirmar (ya existe, se refuerza)

Hoy el paso final dice:

> Cancelando con más de 24 horas de anticipación, te devolvemos la seña.
> Si no venís y no cancelaste antes, la seña no se devuelve.

Está bien y es claro. **Falta una línea sobre el monto exacto de la
devolución**, y no se puede escribir hasta tener el número real (§2.1).

### 4.2. Recordatorio (24 h antes)

Le recuerda el turno y le da la salida antes de que la ventana se cierre.
Es el mensaje que más ausencias evita, y el más barato: una clienta que
cancela a tiempo libera el horario.

### 4.3. Al cancelar dentro de la ventana

Le confirma la devolución **con el monto** y el plazo. Nada de «te
devolvemos la seña» a secas: cuánto y cuándo.

### 4.4. Al cancelar fuera de la ventana

Le explica por qué no vuelve, sin culparla, y le recuerda que el turno
quedó libre. El tono importa: es una clienta que probablemente vuelva.

### 4.5. Al marcarse la ausencia

El más delicado. Tiene que decir qué pasó, qué pasó con la seña, y **abrir
la puerta a que conteste si es un error** (§3.3, protección 2).

Todos estos textos se escriben con `.claude/skills/copy-sol-mai/`.

---

## 5. WhatsApp: opciones reales

### 5.1. Lo que ya funciona, gratis

El sitio ya abre WhatsApp con el mensaje escrito (`wa.me`), para novias y
eventos. **No sirve para avisos automáticos**: requiere que la persona
apriete y mande. Es para que la clienta inicie, no para que el salón
avise.

### 5.2. WhatsApp Business Cloud API (Meta, directo)

- Los avisos salientes van como **plantillas aprobadas por Meta**.
- Categoría **Utility** (recordatorios, confirmaciones, avisos de pago):
  la tarifa de Meta para Argentina rondaba **$37,68 ARS** por mensaje
  fuera de la ventana de servicio, a agosto de 2026.
- Dentro de la ventana de 24 h abierta por la clienta era gratis, **pero
  desde el 1 de octubre de 2026 los mensajes de servicio salientes por API
  también se cobran**. Hay que confirmarlo antes de presupuestar.
- No hace falta servidor propio.
- **Requiere el segundo número** (§2.2).

Cuenta rápida, con números que hay que confirmar: unas 150 clientas, con
recordatorio + eventuales avisos, da un orden de **unos pocos miles de
pesos por mes**. No es gratis y no es caro.

### 5.3. A través de un proveedor (Twilio, 360dialog, Wati y similares)

Más fácil de poner en marcha, más caro por mensaje. Tiene sentido si Sol
además quiere una bandeja compartida para responder. Si sólo se trata de
avisos automáticos, la Cloud API directa es más barata y ya está
contemplada en el entorno (`WHATSAPP_PROVIDER_TOKEN`).

### 5.4. Recomendación por etapas

**Etapa 1 — sin WhatsApp, ya.** La automatización de señas y ausencias no
depende de WhatsApp. Se construye primero, con aviso por email, que ya se
pide en la reserva y no cuesta nada. Sol deja de tener que acordarse de
nada.

**Etapa 2 — WhatsApp cuando haya segundo número.** Se agrega como canal de
los mismos avisos. El sistema ya guarda el canal de origen de cada
reserva, así que sumar un canal de salida no cambia el modelo.

Hacerlo al revés —esperar a WhatsApp para automatizar— deja el hueco
abierto: hoy hay señas que habría que devolver y nadie las devuelve.

---

## 6. Qué falta decidir

1. **El monto exacto de la devolución.** Depende de la prueba real de
   §2.1. Hasta entonces no se escribe la promesa.
2. **Cuánto se espera antes de marcar una ausencia.** Sugerido: el cierre
   del día. Lo decide Sol.
3. ~~**El segundo número de WhatsApp.** Si Sol lo consigue, y cuál.~~
   **RESUELTO a medias (2026-09-11).** El segundo número existe y lo tiene
   Diego, para traspasarlo a Sol. El número **no se escribe acá**: hoy es
   un dato personal suyo y no del salón, y la historia de git no se borra.
   Cuando se dé de alta va como variable de configuración —y además va a
   ser público, porque es el número que ven las clientas—.

   Lo que falta antes de dar de alta:

   - **Confirmar si es móvil o fijo.** Cambia el formato: los móviles
     argentinos llevan un `9` entre el código de país y el área, y se les
     saca el `15`. El de Sol ya está así en `src/lib/sol-mai-contact.ts`
     (`5493425156726`, trece dígitos). Un número cargado sin el `9` falla
     al registrarse.
   - **El número TIENE WhatsApp en uso** (confirmado 2026-09-11). Por el
     camino directo se pierde la aplicación y el historial; por
     coexistencia, no. Cuál aplica es lo primero a verificar (§2.2).
     Mientras eso no esté confirmado, un chip nuevo sin WhatsApp es la
     opción que no depende de nada.
   - **Abrir la cuenta de Meta Business a nombre del salón, no de Diego.**
     La verificación de negocio se hace una vez y con datos fiscales; si
     se verifica con los de Diego, después hay que traspasar la cuenta
     entera, no sólo el número. Hacerlo bien de entrada cuesta lo mismo.

   El número de Sol que ya está en el sistema —el del botón de WhatsApp
   para novias y eventos— **no se toca**. Ese es el que ella usa para
   conversar, y es justamente el que §2.2 dice que no hay que migrar.
4. **Si Sol quiere revisar las ausencias antes de que se avise**, o
   confía en que la clienta corrija. Cambia el diseño de §3.3.

---

## 7. Orden de construcción

1. ~~**Lista de señas por devolver en el panel.**~~ **HECHO.** Aparece
   en la agenda sólo cuando hay algo pendiente, con nombre, monto,
   teléfono y un botón «Ya la devolví». La distinción entre «se decidió
   devolver» y «la plata volvió» ahora existe en la base
   (`refund_completed_at`).
2. ~~**Marcar la llegada, y la ausencia automática.**~~ **HECHO.** Botón
   «Llegó» en la fila del turno, a un toque y sin desplegar nada. La
   tarea que corre cada cinco minutos da por ausente los turnos
   confirmados que nadie marcó, pasado el margen de
   `no_show_grace_hours` (provisional: 6 h, lo decide Sol).
3. **Devolución automática contra la API de Mercado Pago.** Necesita
   credenciales. Incluye la prueba que resuelve §2.1.
4. **Avisos por email.** Recordatorio, cancelación, ausencia.
5. **WhatsApp**, cuando exista el segundo número.
