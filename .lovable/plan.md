## Alcance

Fase 1 recortada. Una sola entrega: ficha-drawer de servicio entre el catálogo público y el wizard.

Todo lo demás (hero mobile, inversión de CTAs, orden de populares, active states, agrupaciones, sticky, confirmación, wizard) queda fuera de esta iteración.

## Archivos

**Crear**
- `src/components/booking/shared/ServiceDetailsDrawer.tsx`

**Modificar**
- `src/components/booking/Landing.tsx`

**No tocar**
- `useBookingWizard.ts`, `BookingWizard.tsx`, `booking-navigation-types.ts`, `booking-steps.ts`, `booking-schema.ts`, `booking-types.ts`
- `src/lib/booking-mock/**` (solo lectura)
- `routeTree.gen.ts`, `router.tsx`, rutas
- `BookingServiceCard.tsx` (se usa tal cual, solo se le pasa la prop `actionLabel` ya existente)
- Payload, CRM, disponibilidad, totales, reglas de agenda
- Sin nuevas dependencias, sin nuevos assets

## Cambios en `Landing.tsx`

1. Agregar `import { useState }` y `import type { Service } from "@/lib/booking-types"` (solo si hace falta importar el tipo; sin modificarlo).
2. Estado nuevo:
   ```ts
   const [previewService, setPreviewService] = useState<Service | null>(null);
   ```
3. En el grid público de servicios (`selectedServices.map(...)`):
   - `onClick` pasa a `() => setPreviewService(service)` (ya no llama a `onStart` directo).
   - Agregar prop `actionLabel="Ver servicio"` al `BookingServiceCard`.
4. Al final del JSX (después del `</main>`, antes del `<footer>`) renderizar:
   ```tsx
   <ServiceDetailsDrawer
     service={previewService}
     categoryId={selectedCategory}
     open={previewService !== null}
     onOpenChange={(open) => { if (!open) setPreviewService(null); }}
     onReserve={() => {
       if (!previewService || !selectedCategory) return;
       onStart({
         entryPoint: "public-catalog",
         initialSelection: { categoryId: selectedCategory, serviceId: previewService.id },
         returnTarget: { type: "catalog", categoryId: selectedCategory },
       });
       setPreviewService(null);
     }}
   />
   ```
5. Nada más cambia en `Landing.tsx`: hero, header, sección de categorías, footer, scroll restoration y back button quedan idénticos.

## `ServiceDetailsDrawer.tsx` — composición

**Base:** `Drawer` de `@/components/ui/drawer` (vaul, ya instalado). Bottom sheet con `max-h-[88vh]`, scroll interno. Cerrar por swipe-down, tap fuera, botón secundario o callback de reserva.

**Props:**
```ts
type Props = {
  service: Service | null;
  categoryId: CategoryId | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReserve: () => void;
};
```

Si `service` o `categoryId` son `null`, retornar `null` (no renderizar nada).

**Estructura vertical dentro de `DrawerContent`:**

1. **Bloque visual superior** (`aspect-[16/9] w-full overflow-hidden`):
   - Si existe una imagen real en el servicio (campo opcional, leído con acceso seguro tipo `(service as { imageUrl?: string }).imageUrl`), renderizar `<img>` con `object-cover`. **No se agrega el campo al tipo**; si no existe, simplemente cae al placeholder.
   - Placeholder premium por categoría: `div` con `bg-gradient-to-br` entre tokens `from-cream via-champagne/40 to-champagne-deep/20`, borde `border-border/60`, monograma `font-serif text-5xl text-champagne-deep/30` con las iniciales "Sol Mai" levemente desplazado, y un sutil chip arriba a la derecha con el nombre de la categoría (`category.name`). Sin emojis grandes, sin imágenes externas.
2. **Cuerpo con padding `px-5 pb-4`, scroll interno:**
   - **Nombre** `font-serif text-2xl text-foreground`.
   - **Meta** una línea: `duración · precio` (`text-sm text-muted-foreground`).
   - **Descripción completa** `text-sm leading-relaxed text-foreground/80` (sin truncar).
   - **"Recomendado para"** título `text-[10px] uppercase tracking-[0.2em] text-muted-foreground` + párrafo corto desde un **mapa estático interno del propio drawer** `recommendedForByServiceId: Record<string, string>` con fallback por categoría. **Vive dentro del archivo del drawer**, no se tocan mocks ni tipos.
   - **"Podés sumar"** título igual + máximo 3 (4 si la grilla lo permite) chips `nombre · precio` leyendo `extras[categoryId]` desde `@/lib/booking-data` (solo lectura, `.slice(0, 3)`). Sin lógica de selección ni reglas.
3. **Footer sticky del drawer** (`DrawerFooter`, `gap-2`):
   - Primario "Reservar turno" → `onReserve()`.
   - Secundario "Volver a servicios" → `onOpenChange(false)`.
   - Botones full-width en mobile, estilo coherente con los CTAs actuales de la landing (primario: `bg-primary text-primary-foreground rounded-full`; secundario: `border border-border bg-card text-foreground rounded-full`).

**Estética:** `bg-background`/`bg-card`, acentos `champagne-deep`, bordes `border-border`, tipografía `font-serif` para títulos. Mobile-first, mismo Drawer funciona como panel inferior en desktop sin branch adicional.

## Comportamiento confirmado

- Tap en card pública → abre drawer (no entra al wizard).
- "Reservar turno" del drawer → ejecuta `onStart` con **exactamente**:
  - `entryPoint: "public-catalog"`
  - `initialSelection: { categoryId, serviceId }`
  - `returnTarget: { type: "catalog", categoryId }`
  - y resetea `previewService` a `null`.
- "Volver a servicios" → cierra el drawer, mantiene categoría y scroll del catálogo.
- Cero cambios en payload, navegación, scroll restoration ni back button existentes.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Card pública sigue luciendo como CTA fuerte | `actionLabel="Ver servicio"` (prop ya soportada) |
| `service.imageUrl` no existe en los mocks | Acceso opcional con cast seguro; fallback siempre activo |
| Placeholder se ve pobre | Gradiente Sol Mai + monograma serif + chip categoría; QA mobile real |
| Drawer largo en mobile | Scroll interno; footer sticky con CTAs siempre visibles |
| Tocar tipos por error | El `imageUrl` se lee con cast inline; el mapa "Recomendado para" vive en el drawer |

## Validación post-implementación

1. `npx tsc --noEmit`
2. `bun run build`
3. eslint sobre los 2 archivos modificados
4. QA mobile 390×844 y 430×932: drawer abre/cierra (tap fuera, swipe-down, botón secundario), CTAs full-width, scroll interno con descripción larga.
5. QA desktop 1366×768: drawer como panel inferior, landing intacta.
6. Verificar que "Reservar turno" del drawer entra al wizard con `entryPoint: "public-catalog"` y, al volver, regresa al catálogo de la misma categoría (flujo ya validado en PR #35).
7. `git diff --name-status`: solo deben aparecer los 2 archivos esperados.
