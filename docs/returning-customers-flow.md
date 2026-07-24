# Flujo de clientas recurrentes

## Alcance

Este documento define la especificación funcional del flujo de clientas recurrentes para Sol Mai Peluquería. Es documentación técnica/funcional: no implementa runtime, no modifica componentes, hooks, schemas, navegación, catálogo, Mercado Pago, CRM ni reglas de seña.

## 1. Objetivo del flujo

El flujo de clientas recurrentes existe para mejorar la experiencia de reserva cuando una clienta ya tuvo interacciones previas con el salón, sin introducir todavía mecanismos de autenticación ni un CRM completo.

Objetivos principales:

- **Reducir fricción:** evitar que una clienta frecuente tenga que reconstruir manualmente toda su reserva si el sistema puede reconocer datos seguros.
- **Permitir repetir servicios simples:** facilitar la repetición de servicios de bajo riesgo operativo, siempre con una confirmación mínima por parte de la clienta.
- **Recuperar datos:** reutilizar datos básicos de contacto y preferencias visibles solo cuando exista confirmación suficiente de identidad.
- **Preparar un futuro CRM:** ordenar estados, contratos conceptuales y criterios de privacidad para una implementación posterior.
- **Mantener privacidad:** no exponer información interna, sensible, técnica o de otras clientas durante el proceso de reserva.

## 2. Decisión MVP

La decisión MVP para este flujo es:

- La detección de clienta recurrente ocurre en el paso **“Tus datos”**.
- El **WhatsApp normalizado** se usa como identificador operativo principal para contactar y ordenar reservas, pero por sí solo nunca habilita recuperar datos ni repetir el último servicio en el MVP.
- El **email** es opcional para crear una reserva normal, pero es el segundo dato requerido para confirmar recuperación de datos o repetición de último servicio en el MVP sin OTP/login.
- El **nombre** no es criterio de confirmación de identidad. Solo puede usarse como apoyo visual después de confirmar a la clienta por WhatsApp normalizado + email o por una verificación futura de canal.
- No se incorpora login.
- No se incorpora OTP.
- No se agrega todavía una entrada separada **“Ya soy clienta”** desde la landing.

Implicancias:

- La clienta entra al flujo de reserva normal.
- Al completar o editar sus datos, el sistema puede evaluar si existe una coincidencia segura o probable.
- La identificación no debe depender de nombre ni apellido; esos datos no elevan una coincidencia probable a confirmada.
- Un match por WhatsApp normalizado **no confirma identidad por sí solo**; debe tratarse como `possible_returning_customer` si no existe email coincidente.
- Para pasar a `confirmed_returning_customer` sin OTP/login, debe existir doble coincidencia fuerte y no ambigua: WhatsApp normalizado + email coincidente.
- Si la coincidencia no es suficientemente confiable, se debe pedir email, confirmar por un canal futuro o continuar como reserva nueva; no se debe asumir identidad ni prellenar datos sensibles.

Decisión sobre contacto e identidad en MVP:

- El **WhatsApp es obligatorio** para crear una reserva normal, porque es el canal operativo principal de contacto y seguimiento del turno.
- El email **no es obligatorio** para reservar; para una reserva normal es opcional.
- El email **sí es necesario** para recuperar datos o repetir el último servicio mientras no existan OTP, login o link mágico.
- WhatsApp solo, aunque coincida con un perfil existente, clasifica como `possible_returning_customer`.
- WhatsApp normalizado + email coincidentes con un perfil único no ambiguo clasifica como `confirmed_returning_customer`.
- Sin doble coincidencia WhatsApp normalizado + email, no se debe mostrar último servicio, historial, datos prellenados sensibles ni información interna.
- Si la clienta no quiere dar email, puede continuar como reserva nueva con WhatsApp obligatorio y email opcional.

## 3. Estados funcionales

### `new_customer`

**Definición:** clienta sin coincidencias detectadas por WhatsApp normalizado ni email.

**Condición de entrada:** no existe perfil asociado al teléfono normalizado ni al email ingresado, o no hay datos suficientes para intentar una búsqueda confiable.

**Qué ve la clienta:** el formulario estándar de datos y el flujo normal para elegir servicio, fecha, horario y confirmar la reserva.

**Qué NO se debe mostrar:** mensajes que sugieran que el sistema la conoce, historial, servicios anteriores, preferencias previas ni datos parciales de terceros.

**Acción recomendada:** continuar como reserva nueva y guardar los datos necesarios para futuras interacciones, respetando consentimientos.

### `possible_returning_customer`

**Definición:** existe una coincidencia probable, pero no suficientemente fuerte para confirmar automáticamente que la clienta es recurrente.

**Condición de entrada:** el WhatsApp normalizado, el email o una combinación de señales ingresadas se parece a un perfil existente, pero hay señales incompletas, inconsistentes o de baja confianza. Incluye explícitamente el caso en que el WhatsApp normalizado coincide con un perfil existente, pero el email no fue provisto o no coincide. En el MVP, una coincidencia por WhatsApp solo siempre queda en este estado.

**Qué ve la clienta:** una señal suave de recuperación, sin revelar datos históricos ni confirmar que el teléfono pertenece a un perfil específico. Ejemplo: **“Encontramos una posible coincidencia. Para recuperar tus datos, agregá tu email.”** También debe poder continuar completando información o reservar como nueva.

**Qué NO se debe mostrar:** último servicio, última visita, historial completo, fórmulas, productos asociados, notas internas, datos sensibles, servicios técnicos detallados, datos prellenados sensibles, datos de otra persona ni información que permita inferir identidad de terceros.

**Acción recomendada:** pedir email coincidente para confirmar recuperación/repetición, ofrecer continuar como reserva nueva si no quiere proveerlo y mantener oculta cualquier información histórica hasta que exista doble coincidencia o verificación futura de canal.

### `confirmed_returning_customer`

**Definición:** clienta reconocida con una coincidencia suficientemente confiable.

**Condición de entrada:** existe coincidencia fuerte de WhatsApp normalizado + email con un perfil único no ambiguo; o, en una etapa futura, existe verificación de canal mediante OTP, link mágico u otro mecanismo equivalente. WhatsApp solo, WhatsApp + nombre o nombre + email nunca alcanzan para este estado en el MVP.

**Qué ve la clienta:** recién después de la doble coincidencia o verificación futura, un bloque funcional con el mensaje **“Encontramos tus datos”**, nombre de pila como apoyo visual, último servicio seguro y opciones para repetir un servicio simple, elegir otro servicio o actualizar sus datos.

**Qué NO se debe mostrar:** notas internas, fórmulas técnicas completas, observaciones sensibles, historial completo sin verificación adicional, conflictos, deuda, puntualidad o comentarios administrativos internos.

**Acción recomendada:** permitir una experiencia abreviada, manteniendo confirmación mínima antes de repetir servicios y solicitando evaluación cuando el servicio sea técnico o variable.

### `incomplete_customer_data`

**Definición:** los datos ingresados son insuficientes o inválidos para determinar si la clienta es nueva o recurrente.

**Condición de entrada:** falta WhatsApp para una reserva normal, el teléfono no puede normalizarse, falta email cuando la clienta intenta recuperar datos/repetir último servicio sin OTP/login, o los campos mínimos de contacto no cumplen criterios funcionales.

**Qué ve la clienta:** mensajes claros para completar o corregir los datos necesarios.

**Qué NO se debe mostrar:** resultados de búsqueda, sugerencias de perfiles, historial, datos previos ni mensajes que indiquen coincidencias no verificadas.

**Acción recomendada:** pedir corrección de teléfono/email antes de continuar con recuperación de datos; si la clienta no puede completar los datos, continuar como flujo estándar sin recuperación.

### `ambiguous_match`

**Definición:** existen dos o más perfiles potencialmente asociados a los datos ingresados, o la coincidencia podría pertenecer a otra persona.

**Condición de entrada:** WhatsApp compartido, email compartido, duplicados CRM, múltiples perfiles para el mismo WhatsApp + email, nombres similares, registros incompletos o señales contradictorias.

**Qué ve la clienta:** una experiencia prudente que solicita completar datos o elegir continuar sin recuperación automática.

**Qué NO se debe mostrar:** nombres completos de posibles perfiles, datos de otras clientas, últimos servicios, fechas de visita, notas internas ni cualquier pista que revele información de terceros.

**Acción recomendada:** no autocompletar información sensible; escalar a revisión manual o tratar como reserva estándar hasta que exista confirmación confiable.

### `active_booking_customer`

**Definición:** clienta reconocida que tiene un turno activo, pendiente o próximo.

**Condición de entrada:** coincidencia confiable, bajo el criterio de `confirmed_returning_customer`, con un perfil que posee una reserva activa asociada.

**Qué ve la clienta:** información mínima y segura sobre que tiene un turno activo, junto con opciones funcionales permitidas por el producto, como continuar con una nueva reserva o revisar canales de contacto.

**Qué NO se debe mostrar:** detalles internos de gestión, notas de agenda, comentarios administrativos, datos técnicos completos ni información de pagos no necesaria para el flujo.

**Acción recomendada:** evitar duplicaciones accidentales, advertir de forma clara si intenta reservar un servicio superpuesto y ofrecer actualizar datos o elegir otro servicio si corresponde.

### `inactive_reactivatable_customer`

**Definición:** clienta reconocida con historial previo, pero sin actividad reciente ni turno activo.

**Condición de entrada:** coincidencia confiable, bajo el criterio de `confirmed_returning_customer`, con perfil existente cuya última visita está fuera de una ventana reciente definida por negocio, sin turno activo vigente.

**Qué ve la clienta:** un mensaje de bienvenida prudente, datos básicos seguros y la posibilidad de reservar nuevamente.

**Qué NO se debe mostrar:** historial completo, motivos internos de inactividad, comentarios sobre conducta, deuda, conflictos, fórmulas técnicas o evaluaciones internas.

**Acción recomendada:** permitir reactivación simple, sugerir servicios seguros o frecuentes si aplica y pedir evaluación/confirmación para servicios técnicos o variables.

## 4. Experiencia visible

### A. Coincidencia solo por WhatsApp

Cuando exista match por WhatsApp normalizado pero el email no fue provisto o no coincide, el estado debe ser `possible_returning_customer`, no `confirmed_returning_customer`. La interfaz puede mostrar un mensaje prudente como:

> Encontramos una posible coincidencia. Para recuperar tus datos, agregá tu email.

En este estado no se debe mostrar:

- Último servicio.
- Última visita.
- Historial.
- Fórmulas.
- Notas internas.
- Productos asociados.
- Datos prellenados sensibles, nombre completo u otros datos que permitan confirmar que el teléfono pertenece a otra clienta.

La clienta debe poder completar email para intentar confirmar recuperación, corregir WhatsApp o continuar como reserva nueva. Mientras no exista email coincidente, no se debe mostrar último servicio, historial ni datos prellenados sensibles.

### B. Clienta recurrente confirmada

Cuando el estado sea `confirmed_returning_customer`, por coincidencia fuerte de WhatsApp normalizado + email o por verificación futura de canal, la interfaz puede mostrar una tarjeta o bloque funcional con el mensaje:

> Encontramos tus datos

El bloque puede incluir únicamente información segura y útil para continuar la reserva:

- Nombre de pila, únicamente como apoyo visual posterior a la confirmación.
- Último servicio seguro.
- Última visita, si está disponible y es segura para mostrar.
- Opción **“Repetir último servicio”**.
- Opción **“Elegir otro servicio”**.
- Opción **“Actualizar mis datos”**.

Criterios de UX:

- La tarjeta debe ser útil, breve y tranquilizadora.
- Debe quedar claro que la clienta puede corregir datos.
- La repetición del último servicio no debe ejecutarse sin una acción explícita.
- Sin email coincidente o verificación futura de canal, este bloque no debe renderizarse aunque el WhatsApp coincida.
- Si el último servicio no es seguro para repetición automática, la opción debe llevar a una confirmación o selección guiada, no a una preselección cerrada.

## 5. Política de repetición de servicios

### A. Servicios simples repetibles

Ejemplos conceptuales:

- Brushing.
- Corte simple.
- Mantenimiento de uñas.
- Esmaltado similar.

Política funcional:

- Pueden permitir preselección.
- Pueden permitir salto parcial de pasos si la clienta confirma.
- Deben mostrar una confirmación mínima antes de finalizar.
- Deben permitir cambiar servicio, fecha, horario y datos.

### B. Servicios técnicos

Ejemplos conceptuales:

- Color.
- Mechas.
- Balayage.
- Alisado.
- Tratamientos complejos.

Política funcional:

- No deben repetirse automáticamente como si fueran servicios simples.
- Deben pedir confirmación mínima sobre contexto actual.
- Pueden requerir evaluación profesional, diagnóstico, fotos o contacto previo.
- No deben exponer fórmulas técnicas completas ni antecedentes internos.
- No deben prometer duración, precio o resultado exacto cuando dependen de evaluación.

### C. Eventos/maquillaje especial

Ejemplos conceptuales:

- Maquillaje para evento.
- Peinado social.
- Producciones o eventos con contexto específico.

Política funcional:

- No deben repetirse sin contexto.
- Deben solicitar fecha, tipo de evento, referencias o necesidades actuales.
- Pueden usar preferencias visibles como apoyo, pero no asumir que el evento anterior aplica al nuevo.

## 6. Privacidad y seguridad

Nunca se debe mostrar a la clienta durante este flujo:

- Notas internas.
- Fórmulas técnicas completas.
- Observaciones sensibles.
- Historial completo sin verificación.
- Datos de otras clientas.
- Comentarios internos sobre deuda, conducta, puntualidad o conflictos.

Reglas adicionales:

- Sin login, OTP, link mágico o doble coincidencia WhatsApp normalizado + email, ningún dato histórico debe mostrarse en la experiencia pública.
- El nombre no identifica por sí solo y no debe usarse como criterio de confirmación; solo puede aparecer como apoyo visual después de confirmar identidad.
- WhatsApp solo es un identificador operativo principal, pero no confirma identidad para recuperar datos, mostrar historial ni repetir último servicio.
- El email no es obligatorio para reservar, pero sí debe coincidir con el WhatsApp normalizado para recuperar datos/repetir último servicio en el MVP sin OTP/login.
- Si la clienta no quiere dar email, debe poder continuar como reserva nueva sin ver historial ni últimos servicios.
- Un teléfono o email compartido debe tratarse como riesgo de ambigüedad.
- Las coincidencias parciales deben priorizar privacidad sobre conveniencia.
- Las preferencias visibles deben ser aptas para mostrarse a la clienta.
- Los datos técnicos o administrativos internos deben permanecer fuera de la experiencia pública de reserva.

## 7. Datos CRM futuros

Campos conceptuales necesarios para una futura implementación CRM:

- Teléfono normalizado.
- Email.
- Canal preferido.
- Consentimiento transaccional.
- Consentimiento comercial.
- Último servicio.
- Servicios frecuentes.
- Última visita.
- Turno activo.
- Preferencias visibles.
- Notas internas.
- Antecedentes técnicos.
- Flags de revisión técnica.
- Riesgo de duplicado.
- Contacto compartido.

Estos campos no implican implementación actual. Sirven como guía para modelar datos, privacidad y reglas de producto en una etapa posterior.

## 8. Contratos conceptuales

Las siguientes interfaces TypeScript son contratos conceptuales para documentación. No representan código ejecutable ni deben importarse en runtime.

```ts
type CustomerStatus =
  | "new_customer"
  | "possible_returning_customer"
  | "confirmed_returning_customer"
  | "incomplete_customer_data"
  | "ambiguous_match"
  | "active_booking_customer"
  | "inactive_reactivatable_customer";

type ServiceRepeatPolicy = "simple" | "technical_confirmation_required" | "context_required";

interface CustomerProfile {
  id: string;
  firstName?: string;
  fullNameForStaff?: string;
  normalizedPhone?: string;
  email?: string;
  preferredChannel?: "whatsapp" | "email" | "phone";
  transactionalConsent: boolean;
  marketingConsent: boolean;
  visiblePreferences?: string[];
  internalNotes?: string[];
  technicalBackground?: string[];
  technicalReviewFlags?: string[];
  duplicateRisk?: boolean;
  sharedContact?: boolean;
}

interface LastBookingSummary {
  bookingId: string;
  serviceId: string;
  serviceName: string;
  serviceRepeatPolicy: ServiceRepeatPolicy;
  visitDate?: string;
  safeToDisplay: boolean;
  variablePrice: boolean;
}

interface ReturningCustomerMatch {
  status: CustomerStatus;
  confidence: "none" | "low" | "medium" | "high";
  matchedBy?: "normalized_phone" | "email" | "phone_and_email" | "future_channel_verification" | "combined_signals";
  customer?: CustomerProfile;
  lastBooking?: LastBookingSummary;
  requiresManualReview?: boolean;
  reason?: string;
}

interface RepeatBookingInput {
  customerId: string;
  sourceBookingId?: string;
  requestedServiceId: string;
  repeatPolicy: ServiceRepeatPolicy;
  customerConfirmed: boolean;
  updatedContactData?: {
    normalizedPhone?: string;
    email?: string;
    preferredChannel?: "whatsapp" | "email" | "phone";
  };
  technicalContextConfirmed?: boolean;
}
```

## 9. Riesgos

Riesgos funcionales y de producto:

- **Teléfono mal escrito:** puede impedir detectar una clienta recurrente o asociar datos incorrectos.
- **WhatsApp compartido:** un mismo número puede pertenecer a familia, pareja, equipo o persona administradora.
- **Clientas con mismo nombre:** el nombre nunca debe resolver identidad por sí solo.
- **Duplicados:** perfiles repetidos pueden generar coincidencias ambiguas o información desactualizada.
- **Repetir servicio técnico sin evaluación:** puede causar errores de expectativa, precio, duración o resultado.
- **Exponer información interna:** notas, fórmulas, conflictos o deuda pueden dañar confianza y privacidad.
- **Exponer historial por WhatsApp solo:** permitir que un match telefónico muestre último servicio o última visita puede filtrar información a cualquiera que conozca el número de otra clienta.
- **Prometer precio exacto en servicios variables:** servicios técnicos o contextuales pueden requerir diagnóstico antes de confirmar precio final.

## 10. Decisiones postergadas

Queda fuera del MVP y de este documento implementar o modificar:

- Entrada **“Ya soy clienta”** en landing.
- OTP.
- Login.
- CRM real.
- Historial completo.
- Mercado Pago.
- Catálogo v2.
- Reglas comerciales reales.
- Cambios en `computeBookingTotals`.
- Cambios en seña 20%.

Estas decisiones pueden retomarse cuando exista una definición de CRM, reglas de privacidad, validación de identidad y criterios comerciales más completos.
