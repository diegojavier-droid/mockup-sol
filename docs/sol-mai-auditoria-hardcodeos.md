# Auditoría de hardcodeos · qué puede cambiar Sol sin que alguien toque código

> **Qué es esto.** El relevamiento de todo lo que hoy está fijo en el sistema
> y debería ser un dato que Sol edita. Es el insumo del bloque de
> parametrización: lo que no está acá, no se construye.
>
> **Cómo se relevó.** Código (`src/`, `server/src/`), las 40 migraciones, los
> endpoints de escritura del panel y las pantallas de administración. Cada
> afirmación lleva archivo y línea.
>
> **Qué sigue.** El modelo que responde a esta auditoría está en
> [`sol-mai-modelo-parametrizable.md`](./sol-mai-modelo-parametrizable.md), con
> el diagrama ER y las funciones de escritura del catálogo.

---

## 1. La conclusión, primero

**No es cierto que «todo esté hardcodeado».** Buena parte del sistema ya es
parametrizable y Sol ya puede cambiarla desde el panel. Decir lo contrario
llevaría a reconstruir cosas que funcionan.

Lo que falta es específico y se puede nombrar: **no se puede crear nada
nuevo.** Sol puede cambiarle el precio a un servicio que existe, pero no dar
de alta un servicio; puede desactivar una estación, pero no crear una
categoría; y las promociones no existen como entidad en ninguna parte —la
regla vive escrita en TypeScript—.

| | |
| --- | --- |
| Entidades que Sol ya edita desde el panel | **10** |
| Entidades que sólo se pueden editar, no crear | **2** |
| Entidades que no existen y hay que construir | **4** |
| Listas de slugs escritas a mano en código | **3 lugares** |

---

## 2. Lo que Sol YA puede cambiar hoy

Cada fila tiene endpoint de escritura y pantalla. Nada de esto hay que
rehacer.

| Qué | Endpoint | Pantalla del panel |
| --- | --- | --- |
| **Precio y duración** por servicio y largo | `PATCH /admin/services/:slug/tiers/:tier` | Servicios › Precios y tiempos |
| **Precio** por servicio (atajo) | `POST /admin/salon/services/:slug/price` | Servicios › Precios y tiempos |
| **Estaciones**: alta y activar/desactivar | `POST /admin/salon/stations`, `.../:id/active` | Puestos de trabajo › Listado |
| **Estación fuera de servicio** | `POST /admin/stations/:id/block` | Puestos › Fuera de servicio |
| **Productos**: alta y activar/desactivar | `POST /admin/salon/products`, `.../:id/active` | Inventario › Productos |
| **Personal**: alta, activo, rol | `POST /admin/staff`, `.../active`, `.../role` | Usuarios y roles › Personas |
| **Roles y permisos** por módulo | `POST /admin/roles`, `.../permission`, `DELETE` | Usuarios y roles › Roles |
| **Horario del salón** y **qué días abre** | `PATCH /admin/business-hours/:id` (acepta `isActive`) | Servicios › Horarios |
| **Días cerrados** y bloqueos | `POST/DELETE /admin/schedule-exceptions` | Servicios › Horarios |
| **Áreas** y su configuración | `PATCH /admin/areas/:slug` | — (sin pantalla) |
| **Valores de negocio**: seña, ventana de reembolso, buffer, anticipación | `PATCH /admin/settings/:key` | — (sin pantalla) |
| **Costo real de una atención** | `POST /admin/bookings/:id/close` (campo `costAmount`) | Agenda › cierre |

Dos de ellas —Áreas y los valores de negocio— **tienen endpoint pero no
pantalla**: hoy se editan por API o por SQL. Es trabajo de UI, no de modelo.

---

## 3. Lo que NO se puede: el hueco real

### 3.1 Entidades que existen pero no se pueden crear ni dar de baja

| Entidad | Qué falta | Por qué importa |
| --- | --- | --- |
| **Servicios** | `POST /salon/services` no existe. Sólo hay `.../:slug/price` | Sol no puede agregar un servicio nuevo. Los 16 tratamientos de su lista entraron por migración, no por el panel |
| **Categorías** | Ningún endpoint | Las cuatro categorías públicas están fijas desde el bootstrap |

También falta poder editar, en un servicio que ya existe: el **nombre**, la
**descripción**, la **categoría**, si es **público**, y su **`kind`**
(servicio, color o tratamiento). Nada de eso tiene endpoint.

### 3.2 Entidades que no existen

| Entidad | Dónde vive hoy | Qué hace falta |
| --- | --- | --- |
| **Promociones** | En TypeScript: `server/src/domain/promocion.ts`. La regla «color + tratamiento» está escrita, no configurada | Tabla, CRUD y motor que lea reglas de la base |
| **Líneas de coloración** | En ningún lado. La lista de Sol tiene raíz y total por línea —Exiline, Sin TACC, Tono Well, Itely— y el sistema tiene un solo `retoque-raiz` genérico | Entidad propia o variante de servicio |
| **Costo estándar por servicio** | La columna `service_parameters.standard_cost_amount` existe y está vacía; no tiene endpoint | Endpoint y campo en la pantalla de precios |
| **Clientas** | `customers` existe pero desde el panel sólo se le agregan notas | ABM de ficha |

---

## 4. Los hardcodeos concretos, con archivo y línea

### 4.1 Listas de slugs escritas a mano

**`src/components/booking/Landing.tsx:413-446`** — la agrupación del catálogo
público mezcla dos criterios: el `tag` del servicio (que sí es un dato) y
listas de slugs a mano.

```ts
// línea 425
["mechas", "babylights", "balayage", "claritos"].includes(service.id)
// línea 431
["corte-fem", "brushing", "peinado-diario", "peinado-social", "recogido"]
// línea 439
service.tag === "tratamiento" || service.id === "alisado"
```

Consecuencia comprobada: `babylights` y `claritos` se dieron de baja del
catálogo y **siguen nombrados acá**. El código quedó mintiendo el mismo día.

Y al revés: un servicio nuevo que Sol cargue cae en «Otros servicios», porque
ninguna lista lo nombra.

**`supabase/migrations/20260912120000`, `...130000`, `...140000`** — las tres
migraciones de hoy marcan `kind` y dan de baja servicios con `where slug in
(...)`. En una migración eso es correcto —describe un cambio puntual— pero
deja el estado dependiendo de que nadie lo toque después desde el panel, que
es justamente lo que falta construir.

### 4.2 El árbol del panel

**`src/lib/panel-nav.ts`** — los diez módulos y sus 34 secciones son un
literal de TypeScript. **`src/lib/staff-session.ts:19-28`** — los nueve
nombres de `Modulo` son un tipo cerrado.

Esto **no se propone parametrizar**: los nombres de módulo son el contrato
con la matriz de permisos de la base, y agregar uno es una migración de datos.
Un panel cuyas secciones se editan desde el panel es un problema de arranque,
no una funcionalidad. Queda declarado como fijo a propósito.

### 4.3 Valores por defecto en código

**`server/src/lib/quote/repository.ts:18-21`** — `depositRatePct: 20` y
`defaultSetupMinutes: 12` como respaldo si la base no contesta.
**`server/src/lib/admin/repository.ts:159`** — `SALON_OFFSET_MS = -3h`, la
zona horaria del salón.

Los dos primeros son respaldos de valores que **sí están en
`business_settings`**, así que están bien: existen para que el sistema no se
caiga, no para gobernar. El tercero es una constante geográfica, no una regla
de negocio.

---

## 5. Los tres casos específicos, y qué los destraba

| Caso | Por qué hoy es una pregunta | Qué lo convierte en configuración |
| --- | --- | --- |
| **¿Mechas y balayage reciben la promoción de tratamientos?** | Porque «cuáles son color» está en un `update ... where slug in (...)` de una migración, y sólo un desarrollador lo cambia | Que `services.kind` sea editable desde el panel, con las tres opciones a la vista |
| **¿Cuánto se le paga a la maquilladora?** | Porque `standard_cost_amount` existe, está vacía y no tiene endpoint | Un campo de costo en la pantalla de precios, al lado del precio de venta |
| **¿Raíz de Exiline, Sin TACC, Tono Well o Itely?** | Porque el sistema tiene un `retoque-raiz` genérico y la lista de Sol tiene cuatro precios distintos | Poder crear servicios, o una entidad de línea de coloración que multiplique los precios |

Los tres se resuelven con lo mismo: **alta y edición completa de servicios,
más una entidad de promoción**. No hay que preguntarle nada a Sol; hay que
darle dónde escribirlo.

---

## 6. Lo que hay que construir, en orden de dependencia

| # | Qué | Estado |
| --- | --- | --- |
| 1 | **ABM completo de servicios** (alta, nombre, descripción, categoría, `kind`, público, baja) | **Hecho.** Servicios › Servicios y › Tratamientos |
| 2 | **Promociones como entidad**: tabla y CRUD | **Hecho.** Servicios › Promociones |
| 3 | **Costo estándar por servicio** | **Hecho.** Un campo en la fila de cada servicio |
| 4 | **Líneas de coloración** | **Hecho como configuración**: son servicios, y Sol los da de alta |
| 5 | **Motor que lea las reglas de la base** | Pendiente. La regla sigue en `promocion.ts` con el mismo contenido |
| 6 | **Agrupación del catálogo público por dato, no por lista** | Pendiente. Hoy el código nombra servicios dados de baja |
| 7 | **Pantalla para áreas y para los valores de negocio** | Pendiente. Tienen endpoint y no tienen UI |
| 8 | **ABM de clientas** y de **categorías** | Pendiente. Los de menos urgencia comprobada |

El modelo y las pantallas están en
[`sol-mai-modelo-parametrizable.md`](./sol-mai-modelo-parametrizable.md) §10.

---

## 7. Lo que se declara fijo a propósito

No todo lo que está en código es un error. Estas cosas **no** se
parametrizan, y conviene que quede escrito para que nadie las «arregle»:

- **Los nombres de los módulos del panel y sus permisos.** Son el contrato
  con la matriz de la base.
- **La zona horaria del salón** (`SALON_OFFSET_MS`).
- **Los respaldos de `business_settings`** en código: existen para que el
  sistema arranque si la base no contesta, no para gobernar el negocio.
- **Los estados de una reserva** y la ventana de 10 minutos: son el modelo,
  no una preferencia.
- **La palabra «oferta» en `availability.test.ts` y
  `catalog-v2-architecture.md`**: ahí significa disponibilidad, no
  descuento. Ver el commit del renombre.
