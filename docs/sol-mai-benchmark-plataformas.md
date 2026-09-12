# Benchmark de plataformas de reserva para salones

> Relevado el 2026-09-12. Sirve para decidir qué patrones adoptar en Sol Mai
> y, sobre todo, cuáles **no**: varias de estas plataformas resuelven
> problemas que Sol no tiene (marketplace, multi-sucursal, comisión por
> clienta nueva) y arrastran complejidad que acá sería peso muerto.

Este documento no propone migrar a ninguna de ellas. Sol Mai tiene sistema
propio y la decisión de no depender de una plataforma ya está tomada
(`docs/platform-independence-and-owner-setup.md`). Lo que se busca acá es
**el patrón de diseño probado**, no el proveedor.

---

## 1. Qué hace cada una

### Booksy

- **Señas y multas son dos cosas distintas, y lo dicen explícitamente.** La
  *seña* (deposit) se cobra al reservar y **se descuenta del total al pagar**;
  si la clienta no viene, el salón se la queda. La *multa por cancelación*
  (cancellation fee) no se cobra al reservar: se guarda la tarjeta y se cobra
  después, sólo si cancela tarde o no viene.
- **La política se publica en el perfil, antes de reservar.** El salón escribe
  su propio texto y con cuánta anticipación hay que avisar para no pagar.
- **El salón puede perdonar el cargo.** Puede elegir cobro automático, cobro
  manual o eximir caso por caso.
- Dato que usan para justificar la función: *«el 80% de las cancelaciones son
  de último momento»*.
- Fuentes: [No-Show Protection](https://biz.booksy.com/en-us/features/no-show-protection) ·
  [Guía de políticas de cancelación](https://biz.booksy.com/en-us/blog/the-professional-guide-to-salon-cancellation-policies) ·
  [Cómo configurarlo](https://support.booksy.com/hc/en-us/articles/16487371034130-How-do-I-set-up-No-show-Protection)

### Fresha

- **Una sola pantalla de "políticas de pago"** donde el salón define todo:
  seña como porcentaje o monto fijo, si es reembolsable o no, y la ventana
  dentro de la cual se devuelve.
- El saldo se paga después del servicio; la seña sólo asegura el turno.
- **La política se muestra en el momento de reservar**, no enterrada en
  términos y condiciones.
- Fuentes: [Payments policies overview](https://www.fresha.com/help-center/knowledge-base/payments/613-payments-policies-overview) ·
  [Set up payment policies](https://www.fresha.com/help-center/knowledge-base/payments/101660-set-up-payment-policies) ·
  [Cómo protegerse de ausencias](https://www.fresha.com/blog/how-to-protect-your-business-against-no-shows-and-late-cancellations)

### Treatwell

- **Prepago total, no seña.** Salvo que la clienta elija «pagar en el salón»,
  el servicio se paga entero al reservar.
- **Ventana por defecto cuando el salón no define una:** 3 horas. Es un
  recordatorio útil: el sistema nunca puede quedarse sin política.
- Si la clienta paga y cancela fuera de la ventana del salón, **no hay
  reembolso automático**.
- Fuentes: [Treatwell Pay](https://www.treatwell.co.uk/partners/solutions/payments/) ·
  [Booking Terms and Conditions](https://www.treatwell.co.uk/info/booking-terms-and-conditions/)

### StyleSeat

- **Rebooking desde lo ya hecho.** La clienta vuelve a reservar a partir de
  un servicio anterior, sin escribir ni llamar.
- **Recordatorios de rebooking automáticos**, disparados por el intervalo
  típico de ese servicio.
- Fuente: [Client Experience](https://www.styleseat.com/join/client-experience)

### Vagaro

- Reserva y re-reserva desde la misma app, con recordatorios por mail o SMS.
- Fuente: [Salon Software](https://www.vagaro.com/pro/salon-software)

### Mindbody

- Orientado a estudios y cadenas; su fuerte es el procesamiento de pagos y
  paquetes/membresías, no la peluquería de barrio.
- Fuente: [Payment Processing Tools](https://www.mindbodyonline.com/en-au/business/payments)

### Nota sobre el modelo de negocio

Booksy, Fresha, StyleSeat y Vagaro son **marketplaces**: cobran comisión o
suscripción y, en varios casos, se quedan con la relación con la clienta. Un
análisis comparativo del sector lo señala como el costo oculto de esas
plataformas ([Zenoti, comparativa 2026](https://www.zenoti.com/thecheckin/best-salon-booking-software)).
Sol Mai no tiene ese problema porque el sistema es suyo. Es exactamente la
razón por la que conviene copiarles el diseño y no contratarlas.

---

## 2. Los patrones aplicables a Sol Mai

Siete patrones, ordenados por cuánto cambian el sistema actual.

### Patrón 1 — Seña y multa son dos mecanismos, no uno

**Qué hacen.** Booksy los separa: la seña se cobra al reservar y se descuenta
del total; la multa se cobra después y sólo si hubo falta.

**Cómo está Sol Mai hoy.** Sólo existe la seña (20% del estimado). Una
ausencia retiene la seña **sólo si estaba paga** —los cuatro canales internos
(mostrador, teléfono, WhatsApp, walk-in) nacen `confirmed` y sin seña, así
que ahí una ausencia no cuesta nada.

**Qué se propone.** Mantener sólo la seña en el MVP y **no** agregar multa.
Razón: una multa exige tarjeta guardada, y guardar tarjetas cambia el perfil
de riesgo y de cumplimiento del sistema entero. El hueco real no es la falta
de multa: es que el 100% de los turnos internos no tiene ninguna garantía.
Eso se resuelve en el panel, no cobrando más.

### Patrón 2 — La política se lee antes de decidir, no después

**Qué hacen.** Las tres grandes muestran la política de cancelación en la
pantalla de reserva.

**Cómo está Sol Mai hoy.** **Ya implementado y correcto.**
`src/components/booking/steps/ReviewStep.tsx:101-102` dice, antes de
confirmar:

> Cancelando con más de 24 horas de anticipación, te devolvemos la seña.
> Si no venís y no cancelaste antes, la seña no se devuelve.

Y `src/routes/reserva.$token.tsx:82-83` vuelve a decirlo en el momento de
cancelar, con el texto que corresponde según falten más o menos de 24 horas.

**Qué se propone.** No tocarlo. Es el patrón bien resuelto.

### Patrón 3 — Un valor por defecto para que nunca falte política

**Qué hacen.** Treatwell aplica 3 horas cuando el salón no configuró nada.

**Cómo está Sol Mai hoy.** `refund_window_hours = 24` está cargado como
`sol_validated` con confianza alta. No hay caso sin política.

**Qué se propone.** Nada. Ya está cubierto, y mejor: el valor lo validó Sol.

### Patrón 4 — Re-reservar desde lo que ya se hizo

**Qué hacen.** StyleSeat abre la reserva de una clienta conocida con sus
servicios anteriores, no con el catálogo.

**Cómo está Sol Mai hoy.** **Implementado** en
`src/components/booking/KnownCustomerBlock.tsx`: hasta tres servicios
**realizados** (no reservas: una reserva cancelada no cuenta), con la fecha
de la última vez y un botón para repetir.

**El problema:** está apagado en producción. Se habilita sólo con
`can_see_history`, que exige identidad probada por Google OAuth, y esas
credenciales todavía no están cargadas. Hoy toda clienta que vuelve es
tratada como nueva.

**Qué se propone.** Ver `docs/returning-customers-flow.md` §9.

### Patrón 5 — El aviso de re-reserva se dispara por el intervalo del servicio

**Qué hacen.** StyleSeat y las guías del sector recomiendan un aviso
específico —*«tu próximo corte está para el martes 15 a las 14»*— en vez de
un genérico «¡te extrañamos!».

**Cómo está Sol Mai hoy.** No existe. La sección **Clientas › Sin venir hace
tiempo** está en el árbol del panel y dice «Todavía no».

**Qué se propone, y con qué número.** La planilla de Sol da el intervalo real
medido sobre 423 visitas repetidas: **mediana de 27 días**, con el 71,6% de
las clientas volviendo antes del mes y sólo el 3,8% volviendo después de los
60 días. El umbral de aviso es **45 días**: pasado el ciclo normal, antes del
punto donde la clienta ya no vuelve. Ver `docs/sol-mai-reingenieria.md` §6.

### Patrón 6 — La seña es un porcentaje configurable y el cartel lo respeta

**Qué hacen.** Fresha permite porcentaje o monto fijo, y lo muestra tal cual.

**Cómo está Sol Mai hoy.** **Implementado.** `deposit_rate_pct = 20`, y el
porcentaje que se muestra es el que se aplica: si Sol lo cambia, cambia el
cartel.

**Qué se propone.** Nada.

### Patrón 7 — El salón puede perdonar

**Qué hacen.** Booksy deja procesar, automatizar o eximir el cargo caso por
caso.

**Cómo está Sol Mai hoy.** Parcial. Existe **Finanzas › Devoluciones** con
las señas pendientes de devolver, pero una ausencia (`no_show`) es un estado
terminal y no se puede revertir: *«revertirla sería reescribir lo que pasó»*.

**Qué se propone.** Mantener la irreversibilidad del estado —es correcta— y
separar la decisión del dinero: que Sol pueda **devolver la seña de una
ausencia** sin cambiar el estado del turno. Lo que pasó no se toca; lo que se
cobra, sí. Es una decisión comercial, no un error de registro.

---

## 3. Lo que deliberadamente NO se copia

| Patrón de la industria | Por qué no |
| --- | --- |
| Tarjeta guardada para multas | Cambia el perfil de cumplimiento del sistema entero por un problema que la seña ya cubre en el canal online |
| Prepago total (Treatwell) | El ticket mediano real es $45.000 y el p90 es $96.500. Pedir eso por adelantado en una peluquería de barrio de Santa Fe es fricción sin contraparte |
| Marketplace / perfil público en una plataforma | La relación con la clienta es de Sol. Es la decisión fundacional del proyecto |
| Paquetes y membresías (Mindbody) | Ni un solo indicio en 926 cobros reales. Sería inventar negocio |
| Selección de profesional al reservar | Hoy la capacidad se resuelve por área y estación, no por persona; y `staff_schedules` está vacío a propósito porque Sol no definió horarios por profesional |

---

## 4. Cierre

De los siete patrones, **cuatro ya están implementados y bien** (2, 3, 6 y el
grueso del 4). El trabajo real que este benchmark deja a la vista es otro y
es más chico de lo que parece:

1. **Encender** el reconocimiento de clientas que ya existe (patrón 4).
2. **Construir** el aviso de re-reserva a 45 días (patrón 5).
3. **Permitir** devolver una seña retenida sin falsear el historial (patrón 7).
4. **Decidir** qué hacer con los turnos internos sin garantía (patrón 1), que
   es un problema de organización del salón antes que de software.
