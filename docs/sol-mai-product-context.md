# Sol Mai — contexto de producto y norte del sistema

Este documento fija **para qué existe** el sistema Sol Mai y con qué criterio
se decide qué construir. No describe el estado técnico vigente —eso vive en
`docs/sol-mai-current-source-of-truth.md`— sino la intención que debe
gobernar las decisiones de producto.

Se agrega a la lista de lectura obligatoria de `AGENTS.md`.

---

## 1. Qué estamos construyendo

Sol Mai es una peluquería/centro de estética real en Santa Fe. Estamos
construyendo un sistema digital propio de reservas, CRM y gestión operativa.

El objetivo **no** es un ERP genérico. Es un **sistema operativo adaptado a la
realidad de Sol Mai**.

La operación actual tiene un alto grado de informalidad: WhatsApp, teléfono,
clientas que llegan al salón, papel, hojas de cálculo y conocimiento acumulado
en Sol y sus empleados. Esa informalidad **no debe combatirse de forma
abrupta**: el sistema debe absorberla progresivamente y transformarla en
información estructurada.

## 2. Principio fundamental

> Sol y sus empleados **no** deben adaptarse al software.
> El software debe adaptarse a la forma real de trabajar de Sol Mai.

El sistema debe **reducir** carga administrativa, no agregarla. La complejidad
—datos, reglas, normalización, cálculos, trazabilidad— debe vivir dentro del
sistema y no recaer sobre las personas.

Criterio de diseño derivado: si una función obliga a una persona a cargar,
recordar o normalizar algo que el sistema podría deducir, esa función está mal
diseñada aunque funcione.

## 3. Objetivo de negocio prioritario

Liberar a Sol y a la secretaría de una de sus mayores cargas actuales:
**explicar repetidamente los servicios, responder consultas, estimar precios y
tiempos y coordinar turnos** durante largos intercambios previos a la venta.

La web debe convertirse progresivamente en el principal medio de información,
consulta y captura de reservas — pero **no se asume** que todas las clientas la
usarán desde el principio.

## 4. Captura multicanal: una sola agenda

Durante una etapa prolongada coexistirán reservas de: **web/online, WhatsApp,
teléfono, walk-in y carga manual**.

Reglas no negociables:

- Todos los canales alimentan **una única agenda**.
- Todos representan la **misma entidad de negocio**: `booking`.
- Se conserva el **canal de origen** y **quién creó/modificó** la reserva.

Un canal no es una etiqueta cosmética: responde cuánto empuja lo online de
verdad, y sin esa respuesta no se puede medir el objetivo de la sección 3.

## 5. Dos interfaces, dos objetivos

| Superficie | Objetivo |
| --- | --- |
| Web pública | comprensión → orientación → decisión → reserva |
| Back-office | velocidad → modificación → excepción → resolución |

No deben converger en un mismo diseño. Optimizar el back-office para "explicar"
o la web para "resolver excepciones" degrada ambos.

## 6. La IA como capa de organización asistida

La IA debe funcionar como **capa de organización asistida**, no como chatbot
decorativo. Debe: interpretar lenguaje humano, identificar intención y
entidades, recuperar datos existentes, aplicar reglas, **proponer** acciones y
pedir intervención humana **sólo cuando sea necesario**.

Ejemplo de referencia:

> «Agendá a María para color y corte el jueves a las 15, tiene muchísimo pelo».

El sistema debería interpretar clienta, servicios, fecha, hora y variables
relevantes; calcular disponibilidad, duración y precio cuando corresponda; y
**proponer** la reserva.

Restricción dura: **la IA nunca debe inventar datos.** Si un dato no existe o
no está validado, la respuesta correcta es pedirlo o marcarlo como faltante —
nunca completarlo con un valor plausible. Esto es la misma regla que ya rige
para precios, duraciones y costos (`GET /admin/pending-values`).

## 7. Normalización detrás de escena

Sol puede usar lenguaje informal —«botox», «mechas», «color»— mientras el
sistema mantiene una **taxonomía interna rigurosa**. La traducción es
responsabilidad del sistema, no de la persona.

## 8. Jerarquía de origen del dato

No todo dato que el sistema necesita debe cargarse a mano. Prioridad:

1. captura automática;
2. reutilización de datos existentes;
3. inferencia;
4. selección simple;
5. carga humana **sólo cuando sea necesaria**.

## 9. Excepciones y operación manual

Automatizar **no** significa impedir que Sol o un empleado intervengan. El
sistema debe permitir la excepción — de forma explícita, con motivo y
registrada. Nunca silenciosa, nunca prohibida.

## 10. Fuente de verdad única

La información operativa debe tener **una** fuente de verdad y evitar la doble
carga manual. Si un dato hay que escribirlo dos veces, el diseño está
incompleto.

## 11. Métrica estratégica: carga administrativa evitada

El éxito **no** se mide solamente por cantidad de reservas online ni por
funcionalidades implementadas. La métrica estratégica es la **carga
administrativa evitada**: cuánto tiempo y trabajo humano que antes hacían Sol
o la secretaría hoy lo resuelve, asiste o elimina el sistema.

## 12. Evolución esperada

1. operación híbrida;
2. digitalización progresiva;
3. automatización;
4. operación asistida por IA.

Meta final: que Sol haga **cada vez menos** trabajo administrativo para
sostener una operación **cada vez más** organizada.

---

## 13. Estado actual verificado contra estos principios

Lectura hecha sobre `main` en `85e7e03`. Es un contraste con el código real,
no una lista de deseos.

### Ya existe y sostiene el principio

| Principio | Dónde está | Verificado |
| --- | --- | --- |
| Cinco canales, una sola agenda (§4) | `bookings.source in ('online','manual','phone','whatsapp','walk_in')` — `supabase/migrations/20260823120000_channels_noshow_and_overrides.sql` | Sí: constraint en DB, no convención |
| Misma entidad para todos los canales (§4) | `create_booking(...)` con `p_source`; `POST /admin/bookings` (`server/src/http/routes/admin.ts:383`) | Sí: un solo RPC crea las reservas de todos los canales |
| Quién **creó** la reserva (§4) | `bookings.created_by` → `staff_members`; null = la creó la clienta online | Sí |
| Excepción explícita con motivo (§9) | `created_via_override` + `override_reason`, obligatorio a nivel DB (`20260824110000`), y `record_audit` | Sí: el servidor rechaza un override sin motivo |
| Bitácora de acciones operativas (§4, §9) | `audit_log` + `record_audit(...)`, escrito desde los RPC | Sí |
| El sistema no inventa datos (§6) | `pending_values` / `confidence: low`; margen = NO DISPONIBLE sin costos cargados | Sí |
| Back-office orientado a resolución (§5) | `/agenda`, `/operaciones`; alta, estación, cierre, ausencia | Parcial: existe, falta medir velocidad |
| Fuente de verdad única del schema (§10) | `supabase/migrations/` como única definición canónica | Sí |

### No existe todavía

| Principio | Brecha real |
| --- | --- |
| Quién **modificó** la reserva (§4) | `PATCH /admin/bookings/:id/status` (`server/src/http/routes/admin.ts:122`) llama a `updateBookingStatus` (`server/src/lib/admin/repository.ts:156`) **sin actor y sin `record_audit`**. Confirmar, cancelar o marcar atendida hoy **no queda atribuido a una persona**. El resto de las acciones (alta, ausencia, cierre, override, vínculo de identidad) sí registran actor. |
| Capa de IA (§6) | **No existe ninguna**: no hay integración con ningún proveedor de modelos en `server/` ni en `src/`. No hay interpretación de lenguaje, ni extracción de entidades, ni propuesta de acción. |
| Normalización de lenguaje informal (§7) | La taxonomía interna existe (áreas, servicios, extras), pero no hay ninguna capa que traduzca «botox» o «mechas» a esa taxonomía. |
| Captura automática / inferencia (§8) | Hoy el back-office es carga humana asistida por selección. Existe reutilización de clienta (`customers`, identidad), pero no inferencia. |
| Métrica de carga administrativa evitada (§11) | El dashboard mide ocupación y dinero, no trabajo humano ahorrado. No hay ningún dato registrado que permita calcularla. |
| Captura desde WhatsApp/teléfono sin doble carga (§4, §10) | El canal se **registra**, pero la reserva se **carga a mano**. No hay ingreso desde WhatsApp: la informalidad se transcribe, no se absorbe. |

### Consecuencia

El sistema está en la etapa **1 (operación híbrida)** de la evolución de §12,
con parte de la etapa 2 (digitalización progresiva) hecha: la agenda es única,
los canales están modelados y la trazabilidad existe salvo en el cambio de
estado. Las etapas 3 y 4 no están empezadas.

---

## 14. Alcance de este documento

Este documento **no autoriza implementar nada**. No define alcance de un
bloque, no aprueba funcionalidades y no reemplaza la fuente de verdad técnica.
Es el criterio con el que se evalúa una propuesta antes de convertirla en
trabajo.

Debe actualizarse cuando cambie la intención de producto, no cuando cambie el
código.
