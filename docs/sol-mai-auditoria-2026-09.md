# Auditoría: ¿está bien planteado el sistema?

**Fecha:** 2026-09-09
**Origen:** dirección de producto (Diego): «estuvimos haciendo muchos
cambios y tengo miedo que el sistema se viva rompiendo, por eso es
importante hacer una auditoría para saber si el sistema está bien
planteado».

Todo lo que sigue está medido sobre el repositorio, no estimado.

---

## 1. La respuesta corta

**El sistema no se está rompiendo. Se está rompiendo la prueba, y la
prueba está atajando.** Son dos cosas distintas y conviene no
confundirlas: una es que el auto falle, la otra es que suene el detector
de fallas.

Pero hay **un hallazgo grave** —dos fuentes de verdad para el precio— que
justamente bloquea lo próximo que se va a construir. Está en §4.

---

## 2. El miedo, medido

En esta rama van **17 commits**. **Tres** fueron arreglos de CI.

De esos tres:

| Qué falló | Qué era en realidad |
|---|---|
| `business_settings expected 8, got 9` | El contador del workflow quedó viejo tras agregar una fila |
| `cobrado en efectivo (30000)` | La prueba comparaba contra un absoluto y otro bloque dejaba plata del mismo día |
| `el token de staff no abre el panel (403)` | Un usuario de prueba que un bloque nuevo no borraba |

**Ninguno fue un defecto del producto.** Dos eran del andamiaje de prueba
y uno de un dato de prueba. Y ninguno llegó a producción: los tres los
frenó CI antes de mergear, que es exactamente para lo que está.

Vale decirlo igual: **los tres los introduje yo**, y los tres se
arreglaron reproduciendo la falla localmente antes de tocar nada.

---

## 3. La red que sí existe, y dónde no existe

| Qué | Cuánto |
|---|---|
| Restricciones `check` en la base | **86** |
| Invariantes del clean-room (`raise exception`) | **137** |
| Aserciones e2e contra PostgreSQL y el Worker reales | **38** |
| Funciones `security definer` (la plata vive en la base) | **36** |
| Pruebas unitarias de dominio | **113** |

Eso es una red seria, y explica por qué las tres fallas fueron de
andamiaje: **lo que importa está sujetado por varios lados a la vez.**

**Y acá está la desigualdad.** El front tiene **75 archivos** y **uno
solo** con prueba. Los **nueve** componentes del panel de Sol: **cero**.

Cada vez que toqué la interfaz la verifiqué manejando Chromium a mano.
Funciona, pero **no queda nada que lo repita mañana**. Si alguien rompe
el botón «Llegó» o la casilla de los términos, hoy no se entera nadie
hasta que Sol lo sufre.

**Primer paso dado (2026-09-09):** `scripts/panel-e2e.mjs` maneja el panel
en un navegador real y verifica catorce cosas: que Sol vea el mapa de
módulos, que «El salón» abra con sus tres secciones, que cambiar un precio
muestre «antes → ahora», que deshacer funcione de verdad, y que quien
atiende no vea ni los números ni «El salón». Ya encontró un defecto real
—el botón de deshacer no actualizaba la pantalla— antes de que llegara a
nadie.

Queda pendiente meterlo en CI, que necesita Chromium y el Worker
levantados en el runner. Se hace aparte y con cuidado: no vale la pena
arreglar la red rompiendo el techo.

Es el hueco más importante, y pesa el doble ahora que la prioridad
declarada es que el sistema **se adopte sin fricción**: la fricción vive
justamente donde no hay red.

---

## 4. El hallazgo grave: el precio se calcula en dos lugares

**El resumen que ve la clienta antes de confirmar NO muestra el precio
del servidor. Lo calcula el navegador.**

`ReviewStep` y `SummaryPanel` llaman a `computeTotals()`, que arma el
precio con:

- el precio del servicio tal como lo tiene el catálogo del front;
- los modificadores de `booking-rules.ts`, **623 líneas de matriz escrita
  a mano**;
- `BOOKING_DEPOSIT_RATE = 0.2`, **una constante en el código**.

Mientras tanto, el precio que efectivamente se cobra lo calcula el
servidor, con los precios de la base y `business_settings.deposit_rate_pct`.

**Hoy coinciden.** Lo verifiqué: `corte-fem` vale 18.000 en la base y
18.000 en el front; la seña es 20% en los dos lados.

**Coinciden por casualidad, no por diseño.** Nada los mantiene sincronizados.

### Por qué esto bloquea el bloque 2

Lo próximo que se va a construir es que Sol pueda cambiar precios. **El
día que cambie uno, el resumen le va a seguir mostrando a la clienta el
precio viejo mientras el sistema cobra el nuevo.** No es una hipótesis
lejana: es la consecuencia directa de la primera vez que use la
funcionalidad.

Y del otro lado, si algún día Sol cambia el porcentaje de seña desde el
panel —que ya puede—, la clienta vería un 20% que ya no es cierto.

### Qué hay que hacer, y en qué orden

**Primero:** que el precio del resumen venga del servidor, que es quien
ya lo calcula bien. Recién después, dejar que Sol lo cambie.

Al revés sería entregarle a Sol un botón que rompe la promesa que la
página le hace a la clienta.

---

## 5. Lo que quedó de Lovable, y por qué no es urgente

`src/lib/booking-mock/` —el catálogo de la época de Lovable— sigue
importado por **22 archivos del front**.

No es tan grave como suena: el wizard pide catálogo y disponibilidad
reales al servidor, y el mock quedó sosteniendo tipos, imágenes y textos
de apoyo. Pero es el que alimenta el cálculo de §4, así que **se va a ir
muriendo por ese lado**, no por una limpieza aparte.

---

## 6. Deuda clásica: casi no hay

| Señal | Cuánto |
|---|---|
| `TODO` / `FIXME` / `HACK` | **1** (el link de Mercado Pago, legítimo) |
| `@ts-ignore` / `@ts-expect-error` | **0** |
| `as any` | **5**, todos en `routeTree.gen.ts`, que es generado |
| `console.log` sueltos | **3** |

No hay lugares donde alguien le haya mentido al compilador para seguir
adelante.

---

## 7. Conclusión, sin adornos

**Bien planteado:** la plata y las reservas viven en la base, con
restricciones y funciones que fallan antes de escribir algo incoherente.
Ésa es la decisión estructural correcta y está sostenida.

**Mal planteado:** el precio que ve la clienta. Se calcula donde no
corresponde, con datos que nadie sincroniza.

**Faltante:** la interfaz no tiene ninguna red automática, y es donde se
juega la adopción.

Las tres cosas se atienden en ese orden.
