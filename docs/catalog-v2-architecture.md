# Catálogo real v2 — especificación técnica/funcional

> **Estado:** propuesta de arquitectura y documentación funcional.
>
> **Alcance:** este documento describe el futuro catálogo real v2 de Sol Mai Peluquería. No implementa tipos runtime, no reemplaza el catálogo actual, no carga datos reales definitivos y no inventa precios, productos ni duraciones.

## 1. Objetivo del catálogo v2

El catálogo v2 busca convertir la oferta real de Sol Mai Peluquería en una **fuente de verdad estructurada**, validada y auditable. Su propósito es permitir que la información comercial, técnica y operativa se modele de forma consistente sin depender de reglas dispersas en componentes visuales o mocks temporales.

La fuente de verdad del catálogo v2 deberá servir para:

- el wizard de reserva;
- el cálculo de precio y duración;
- reglas comerciales configurables;
- CRM futuro;
- productos de venta;
- productos de uso interno;
- reportes futuros.

Hasta que Sol Mai valide el archivo de catálogo simplificado, el catálogo v2 debe mantenerse como **diseño técnico/funcional**, no como dataset definitivo.

## 2. Problema del modelo actual

El modelo actual resuelve el MVP, pero no expresa correctamente la lógica real esperada para el catálogo v2:

- existe un único `Service` principal por reserva;
- los `Extra[]` se interpretan como adicionales cobrables;
- las combinaciones actuales son servicios prearmados con tag `combinado`, no una composición de líneas internas;
- no hay líneas internas separadas para corte, color, tratamiento, brushing, descuentos o inclusiones;
- no existe un mecanismo explícito para aplicar descuentos sobre un subítem específico, por ejemplo descuento sobre la línea de corte cuando se combina con color;
- no existe una representación clara de ítems incluidos no cobrables, como secado final o brushing incluido;
- no se separan productos de uso interno de productos de venta;
- `priceIsEstimated` es demasiado genérico para diferenciar precio fijo, desde, variable o a consultar;
- `computeBookingTotals` suma linealmente servicio principal, modificadores y extras, lo cual dificulta emitir un desglose auditable de subtotal, descuentos, incluidos, total, seña y saldo.

## 3. Principios del catálogo v2

El catálogo v2 debe respetar estos principios:

- No hardcodear reglas comerciales en componentes UI.
- Separar servicio vendible de ítem incluido.
- Separar producto usado de producto vendido.
- Preservar la seña actual del 20%.
- Preservar compatibilidad con el MVP actual durante la transición.
- No mostrar lógica interna compleja a la clienta.
- Catálogo público por intención, catálogo interno por técnica/producto.
- Documentar supuestos, decisiones pendientes y reglas en estado de validación.
- Evitar cargar datos reales definitivos hasta recibir validación de Sol Mai.
- Permitir auditoría del cálculo sin obligar a mostrar todo el detalle en UI pública.

## 4. Entidades conceptuales

Las siguientes entidades son **conceptuales**. No deben implementarse todavía en runtime. Los bloques TypeScript son una guía de diseño para una futura etapa.

### `CatalogItemV2`

Representa una unidad catalogable general: servicio, adicional, inclusión, descuento o producto.

```ts
type CatalogItemKindV2 =
  | "service"
  | "chargeable_add_on"
  | "included_item"
  | "discount"
  | "retail_product"
  | "internal_product"
  | "dual_role_product";

type ServiceLineV2 =
  | "corte"
  | "color"
  | "tratamiento"
  | "styling_brushing"
  | "maquillaje"
  | "unas"
  | "depilacion"
  | "producto";

type PriceTypeV2 = "fixed" | "from" | "variable" | "consultation_required";

interface CatalogItemV2 {
  id: string;
  catalogVersion: "v2";
  kind: CatalogItemKindV2;
  line: ServiceLineV2;
  name: string;
  description?: string;
  priceType: PriceTypeV2;
  basePrice?: number;
  estimatedDurationMinutes?: number;
  isPubliclyVisible: boolean;
  requiresValidation?: boolean;
  notes?: string;
}
```

### `ServiceItemV2`

Representa un servicio vendible o seleccionable en el flujo de reserva.

```ts
interface ServiceItemV2 extends CatalogItemV2 {
  kind: "service" | "chargeable_add_on";
  canBePrimarySelection: boolean;
  canBeCombinedWith?: ServiceLineV2[];
  includesFinalDrying?: boolean;
  includesBrushing?: boolean;
  includedItemIds?: string[];
  defaultModifierIds?: string[];
}
```

### `TreatmentItemV2`

Especializa un servicio de tratamiento para expresar producto/línea, finalidad y compatibilidad.

```ts
type TreatmentPurposeV2 =
  | "hidratacion"
  | "nutricion"
  | "reparacion"
  | "reconstruccion"
  | "brillo"
  | "control_frizz"
  | "post_color"
  | "mantenimiento"
  | "otro";

interface TreatmentItemV2 extends ServiceItemV2 {
  line: "tratamiento";
  brand?: string;
  productLineOrProduct?: string;
  purpose: TreatmentPurposeV2;
  compatibleWithColor?: boolean;
  compatibleWithCut?: boolean;
  recommendedPostColor?: boolean;
  includesBrushing: boolean;
  relatedRetailProductIds?: string[];
  relatedInternalProductIds?: string[];
}
```

### `ProductV2`

Representa productos de venta, productos de uso interno o productos con doble rol.

```ts
type ProductRoleV2 = "retail" | "internal" | "dual_role";

interface ProductV2 {
  id: string;
  catalogVersion: "v2";
  role: ProductRoleV2;
  brand?: string;
  name: string;
  line?: string;
  publicDescription?: string;
  internalNotes?: string;
  isPubliclyVisible: boolean;
  canBeRecommendedAfterService?: boolean;
  canBeUsedInFormula?: boolean;
  canBeSold?: boolean;
}
```

### `BookingLineSelectionV2`

Representa lo que la clienta o el sistema selecciona como líneas de reserva antes del cálculo final.

```ts
interface BookingLineSelectionV2 {
  selectionId: string;
  catalogItemId: string;
  line: ServiceLineV2;
  quantity: number;
  selectedBy: "client" | "system" | "staff";
  source: "wizard" | "recommendation" | "bundle_expansion" | "rule";
  personalization?: Record<string, string | number | boolean>;
}
```

### `PricingLineV2`

Representa una línea auditable del cálculo: cargo, inclusión, descuento o línea informativa.

```ts
type PricingLineTypeV2 = "charge" | "included" | "discount" | "informational";

type PricingVisibilityV2 = "client_visible" | "staff_only" | "hidden";

interface PricingLineV2 {
  id: string;
  type: PricingLineTypeV2;
  catalogItemId?: string;
  label: string;
  line: ServiceLineV2;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  discountAmount?: number;
  total: number;
  durationMinutes?: number;
  visibility: PricingVisibilityV2;
  reason?: string;
}
```

### `AppliedPricingRuleV2`

Registra una regla comercial aplicada o evaluada para auditoría.

```ts
type PricingRuleStatusV2 = "applied" | "skipped" | "pending_validation";

interface AppliedPricingRuleV2 {
  id: string;
  code: string;
  name: string;
  status: PricingRuleStatusV2;
  affectedPricingLineIds: string[];
  discountAmount?: number;
  configuredPercentage?: number;
  notes?: string;
}
```

### `BookingTotalsV2`

Resume totales, descuentos, seña y saldo preservando la seña del 20%.

```ts
interface BookingTotalsV2 {
  catalogVersion: "v2";
  subtotal: number;
  includedValue?: number;
  discountTotal: number;
  total: number;
  depositPercentage: 20;
  depositAmount: number;
  remainingBalance: number;
  visibleDurationMinutes: number;
  operationalDurationMinutes?: number;
  pricingLines: PricingLineV2[];
  appliedRules: AppliedPricingRuleV2[];
}
```

## 5. Clasificación de ítems

El catálogo v2 debe clasificar los ítems para evitar mezclar comportamiento comercial, técnico y visual.

| Tipo de ítem | Descripción | Impacto esperado |
| --- | --- | --- |
| Servicio independiente | Servicio seleccionable por sí mismo. | Puede iniciar una reserva y sumar precio/duración. |
| Add-on cobrable | Adicional seleccionado sobre un servicio principal o una combinación. | Suma precio y puede sumar duración. |
| Ítem incluido no cobrable | Parte del servicio, por ejemplo secado o brushing incluido. | No suma precio, puede sumar duración visible u operativa según configuración. |
| Descuento | Ajuste negativo aplicado a una línea específica o al total. | Resta importe y debe ser auditable. |
| Producto de venta | Producto visible o recomendable para compra. | Puede alimentar CRM, recomendaciones y reportes. |
| Producto de uso interno | Producto usado técnicamente en salón. | No necesariamente visible; puede alimentar historial técnico y costos futuros. |
| Producto con doble rol | Producto usado en salón y también vendido. | Debe distinguir uso técnico de recomendación/venta. |

## 6. Líneas de servicio

Las líneas mínimas del catálogo v2 son:

- corte;
- color;
- tratamiento;
- styling/brushing;
- maquillaje;
- uñas;
- depilación;
- producto.

Color y tratamientos pueden seguir perteneciendo visualmente a la categoría **Peluquería** en la UI pública. Sin embargo, funcionalmente deben tener línea propia para que el motor de reglas pueda:

- detectar combinaciones color + corte;
- evitar doble cobro de brushing;
- marcar tratamientos recomendados post-color;
- calcular duraciones y buffers con mayor precisión;
- aplicar descuentos sobre una línea específica y no sobre todo el servicio.

## 7. Catálogo público por intención, catálogo interno por técnica/producto

El catálogo v2 debe separar explícitamente dos niveles de información para evitar que la landing o el wizard público expongan todas las combinaciones técnicas del Excel real. El Excel puede contener muchas combinaciones de color, tratamientos, productos, marcas, líneas y finalidades; mostrar todo eso como opciones públicas genera sobrecarga cognitiva, confusión y menor adopción del sistema de reservas.

### Catálogo público simplificado

El catálogo público es lo que ve la clienta. Debe estar orientado a intención o servicio base, no a producto técnico. Debe mostrar solo la información necesaria para reservar con confianza:

- servicio base;
- intención de servicio;
- duración estimada;
- precio desde/base;
- aviso de variabilidad;
- qué incluye de forma simple.

Servicios públicos sugeridos:

- Corte;
- Color;
- Mechas / balayage;
- Tratamiento capilar;
- Peinado / brushing;
- Uñas;
- Maquillaje;
- Depilación.

Depilación queda contemplada como línea/categoría pública vigente y reservable en MVP, con servicios faciales simples, capacidad operativa 1, sin buffer y sin preguntas previas obligatorias según la fuente de verdad actual.

Ejemplo público para tratamiento:

| Campo | Valor público sugerido |
| --- | --- |
| Servicio | Tratamiento capilar |
| Descripción | Hidratación, nutrición o reparación según necesidad del cabello. |
| Precio/duración | Desde $X · 60 min aprox. |
| Aviso | El producto se define en salón según evaluación. |

La clienta no debe elegir entre todas las marcas, productos o líneas técnicas en la landing. Debe elegir una intención o servicio base. La selección específica del producto se define internamente por Sol o la peluquera.

### Catálogo técnico interno

El catálogo técnico interno es lo que gestiona Sol o la peluquera. Puede registrar información profesional completa, aunque no sea visible ni obligatoria para la clienta durante la reserva:

- producto/línea usada;
- fórmula;
- cantidad/calidad de producto;
- finalidad técnica;
- costo futuro;
- ajuste de precio;
- observaciones profesionales;
- tratamiento real aplicado.

Los productos y líneas técnicas pueden aparecer como respaldo profesional, recomendación o registro interno, pero no como variantes obligatorias que la clienta debe decidir en la reserva.

### Reglas de precio visible

La UI pública debe comunicar precio de forma honesta y simple:

- usar “desde” cuando el precio dependa de largo, técnica o producto;
- usar “estimado” cuando el precio pueda variar;
- usar “a consultar” cuando no haya precio confiable;
- no prometer precio exacto en color, balayage, mechas o tratamientos variables.

### Impacto en cálculo y precio final

El cálculo público puede usar un precio base estimado para orientar a la clienta y calcular la reserva inicial. El precio final puede ajustarse internamente según:

- largo;
- densidad;
- técnica;
- cantidad de producto;
- calidad/línea de producto;
- evaluación profesional.

Este ajuste debe estar documentado como una diferencia entre el total estimado público y el total final definido por evaluación profesional, no como un error del sistema.

### Impacto en seña

La seña del 20% se calcula sobre el total estimado mostrado en la reserva. Si el servicio es altamente variable, debe quedar claro que el saldo puede ajustarse en salón según evaluación.

Esta decisión no modifica la lógica actual de seña ni requiere cambios en `computeBookingTotals`.

## 8. Tratamientos por producto + finalidad

Los tratamientos no deben modelarse como un “tratamiento genérico”. Cada tratamiento debe poder expresar:

- marca;
- línea o producto usado;
- finalidad;
- compatibilidad con color y/o corte;
- duración estimada;
- precio o tipo de precio;
- si incluye brushing;
- si se recomienda post-color;
- productos de venta asociados.

Finalidades sugeridas:

- hidratación;
- nutrición;
- reparación;
- reconstrucción;
- brillo;
- control frizz;
- post-color;
- mantenimiento;
- otro.

La finalidad debe ayudar a orientar recomendaciones y reportes sin forzar a la clienta a entender detalles técnicos. Por ejemplo, una recomendación post-color puede mostrarse como sugerencia opcional y no como obligación. La clienta elige la intención pública, como “Tratamiento capilar”, y la peluquera define producto, línea y fórmula según evaluación.

## 9. Productos de venta vs productos de uso interno

### Productos de venta

Los productos de venta son productos que pueden ser visibles o consultables públicamente, según defina Sol Mai. Pueden asociarse a recomendaciones posteriores al servicio y aparecer en un CRM o comunicación post-servicio.

Características esperadas:

- visibilidad pública configurable;
- asociación con tratamientos, color, mantenimiento o recomendaciones;
- posible aparición en historial comercial o CRM;
- precio y disponibilidad a validar antes de publicarse.

### Productos de uso interno

Los productos de uso interno son utilizados en fórmulas, color, tratamientos o procesos técnicos. No necesariamente deben ser visibles para la clienta.

Características esperadas:

- uso técnico en salón;
- posible registro en historial técnico;
- posible uso futuro para costos, stock o reportes internos;
- visibilidad pública desactivada por defecto.

### Producto con doble rol

Un producto con doble rol se usa en salón y también se vende. El catálogo v2 debe evitar confundir esos usos: una cosa es registrar que se usó técnicamente en un tratamiento y otra es recomendarlo o venderlo a la clienta.

## 10. Reglas comerciales v2

Las reglas comerciales deben ser configurables, auditables y estar fuera de componentes UI.

### A. Color + corte

- **Condición:** la reserva contiene al menos una línea de color y una línea de corte en la misma visita.
- **Acción:** aplicar descuento sobre la línea de corte, no sobre el total completo.
- **Descuento:** porcentaje configurable, actualmente detectado como aproximado al 15%.
- **Estado:** pendiente de validación con Sol Mai; no debe asumirse como porcentaje fijo definitivo.

### B. Color/tratamiento incluye acabado

- **Condición:** la reserva contiene color o tratamiento configurado con secado/acabado/brushing incluido.
- **Acción:** agregar una línea incluida no cobrable o evitar que el brushing se cobre como extra.
- **Visibilidad:** configurable; puede mostrarse como “incluye acabado” o quedar implícito según decisión de Sol Mai.

### C. Evitar doble cobro de brushing

- **Condición:** la selección contiene un servicio que ya incluye brushing/secado y además aparece un brushing final cobrable.
- **Acción:** bloquear el brushing final como cobro adicional, convertirlo en línea incluida o solicitar resolución operativa.
- **Objetivo:** evitar que la clienta pague dos veces por un acabado ya contemplado en el precio del servicio.

### D. Tratamiento recomendado post-color

- **Condición:** la reserva contiene color y existe un tratamiento compatible/recomendado post-color.
- **Acción:** sugerir el tratamiento de forma no invasiva.
- **Cobro y duración:** solo suma precio y duración si la clienta lo selecciona explícitamente o si staff lo agrega con confirmación.

## 11. Pipeline de cálculo v2

Flujo recomendado del futuro motor de cálculo v2:

1. Normalizar selección.
2. Expandir bundles/combos.
3. Agregar inclusiones.
4. Aplicar modificadores de personalización.
5. Aplicar reglas comerciales.
6. Calcular duración visible.
7. Calcular duración operativa/buffer.
8. Calcular subtotal.
9. Aplicar descuentos.
10. Calcular total.
11. Calcular seña 20%.
12. Calcular saldo.
13. Emitir desglose auditable.

El pipeline debe poder producir un resultado técnico completo aunque la UI pública muestre solo una versión simplificada.

## 12. Compatibilidad con MVP actual

La transición debe preservar el MVP actual y evitar reemplazos abruptos.

### Etapa 1: Tipos/documentación v2 en paralelo

Mantener el catálogo v2 como documentación y diseño conceptual, sin tocar runtime ni datos actuales.

### Etapa 2: Catálogo v2 normalizado desde Excel validado

Cuando Sol Mai devuelva la validación, transformar el Excel validado en una estructura normalizada. No cargar Excel crudo directamente en runtime.

### Etapa 3: Adaptador v2 → `Service[]` / `Extra[]`

Crear un adaptador para que el MVP pueda seguir consumiendo `Service[]` y `Extra[]` mientras el catálogo v2 madura.

### Etapa 4: Motor de cálculo v2 en shadow mode

Ejecutar el cálculo v2 en paralelo al cálculo actual para comparar resultados sin afectar a clientas.

### Etapa 5: Activar reglas brushing incluido y color+corte

Activar reglas validadas para evitar doble cobro de brushing y aplicar descuento color+corte según configuración aprobada.

### Etapa 6: Extender payload

Agregar campos como `catalogVersion`, `pricingLines` y `appliedRules` para auditoría y compatibilidad futura.

### Etapa 7: UI de desglose si se aprueba

Mostrar desglose simple a la clienta solo si Sol Mai lo aprueba y si aporta claridad/confianza.

## 13. Reglas de visibilidad para clienta

La UI pública debe priorizar claridad y confianza, no exposición de complejidad técnica.

La clienta puede ver:

- servicio;
- duración estimada;
- precio estimado;
- seña;
- saldo;
- ítems incluidos si se decide mostrarlos;
- descuentos simples si aportan confianza.

La clienta no debe ver:

- fórmula técnica;
- producto interno sensible;
- reglas internas;
- costos;
- buffers;
- notas internas;
- lógica de estaciones;
- variantes obligatorias de marca, producto o línea técnica.

## 14. Campos pendientes de validación con Sol Mai

Pendientes antes de cargar un catálogo real definitivo:

- si brushing aparece visible como incluido o queda implícito;
- si descuento color+corte es 15% fijo o variable;
- precios actualizados;
- duración estimada por servicio;
- tratamientos activos;
- finalidad real de cada tratamiento;
- productos visibles públicamente;
- productos solo internos;
- qué servicios se muestran como “desde”;
- qué servicios requieren consulta;
- qué productos o líneas pueden mostrarse solo como respaldo profesional o recomendación, sin convertirse en opciones obligatorias de reserva.

### Preguntas pendientes sobre Depilación

Antes de habilitar Depilación como reservable, Sol Mai debe confirmar:

- duración de rostro completo;
- duración de cejas;
- duración de bigote;
- duración de bozo/bigote y mentón;
- capacidad simultánea;
- si usa los mismos horarios generales del salón o una agenda propia;
- buffer necesario entre turnos;
- si requiere preguntas previas sobre piel sensible, alergias, medicación, irritación o tratamiento facial reciente.

## 15. Riesgos

Riesgos principales a controlar durante la transición:

- doble cobro de brushing;
- descuento aplicado sobre monto incorrecto;
- convertir combos en precios rígidos;
- mostrar precio exacto donde debe ser estimado;
- contaminar UI pública con lógica interna;
- cargar Excel crudo sin normalizar;
- mezclar producto de venta con producto de uso técnico;
- romper seña 20%;
- mostrar demasiadas combinaciones técnicas en público, generando sobrecarga cognitiva, confusión y baja adopción del sistema de reservas.

## 16. Decisiones explícitas

Decisiones para esta etapa:

- No implementar catálogo real hasta validación de Sol Mai.
- No reemplazar `Service`/`Extra` de golpe.
- No tocar `computeBookingTotals` todavía.
- No tocar UI visual.
- No tocar seña 20%.
- No tocar Mercado Pago.
- No tocar CRM real.
- No tocar clientas recurrentes todavía.
- No cargar datos reales definitivos.
- No inventar precios, productos ni duraciones.
