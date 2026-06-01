# Plan: drawer responsive + imágenes de servicios

Dos tareas relacionadas, ambas tocando únicamente `ServiceDetailsDrawer.tsx` (+ nuevos assets en `src/assets/services/`).

---

## Tarea 1 — Limitar altura visual en desktop

**Archivo:** `src/components/booking/shared/ServiceDetailsDrawer.tsx`

**Cambio puntual** en el contenedor del bloque visual (hoy `aspect-[16/9] w-full`):

- Mobile: mantener `aspect-[16/9] w-full` actual (sin cambios).
- Desktop/tablet: agregar `md:aspect-auto md:h-44 lg:h-52` (≈176–208 px) para que el visual no domine el viewport en 1366×768.
- Mantener `object-cover` en el `<img>` y el placeholder Sol Mai sin cambios estéticos.
- Mantener chip de categoría posicionado igual.

Resultado esperado: en desktop 1366×768, "Recomendado para" y "Podés sumar" quedan visibles cerca del fold; en mobile el visual sigue 16:9 como hoy.

---

## Tarea 2 — Imágenes reales en 6 servicios

**Generación:** `imagegen--generate_image` (Nano Banana / fast tier) con estética Sol Mai — marfil, crema, champagne, madera clara, luz natural cálida, fotorealista, sin texto, sin logos, sin rostros reconocibles, paleta nude.

**Assets nuevos** en `src/assets/services/` (formato `.jpg`, 1280×720, 16:9):

| categoryId  | service.id | Asset                          | Concepto visual                                                |
|-------------|------------|--------------------------------|----------------------------------------------------------------|
| peluqueria  | `corte-fem`| `corte-femenino.jpg`           | Tijera profesional y mechón de cabello castaño sobre paño crema |
| peluqueria  | `balayage` | `balayage.jpg`                 | Detalle de cabello con degradé rubio natural, luz suave        |
| maquillaje  | `mk-social`| `maquillaje-social.jpg`        | Brochas de maquillaje y paleta nude sobre mármol claro          |
| maquillaje  | `mk-fiesta`| `maquillaje-fiesta.jpg`        | Detalle de párpado con sombra dorada/champagne, piel luminosa   |
| unas        | `semi`     | `esmaltado-semipermanente.jpg` | Manos cuidadas con esmalte nude sobre mesa de madera clara      |
| unas        | `softgel`  | `soft-gel.jpg`                 | Detalle de uñas largas naturales con acabado brillo, herramientas limpias |

**Mapa interno** dentro de `ServiceDetailsDrawer.tsx`:

```ts
import corteFem from "@/assets/services/corte-femenino.jpg";
// ...resto de imports

const serviceImages: Record<string, string> = {
  "corte-fem": corteFem,
  balayage: balayageImg,
  "mk-social": mkSocialImg,
  "mk-fiesta": mkFiestaImg,
  semi: semiImg,
  softgel: softgelImg,
};
```

**Render:** cambiar la condición actual de `service.imageUrl` por:

```ts
const imageSrc = service.imageUrl ?? serviceImages[service.id];
```

Si `imageSrc` existe → `<img>`; si no → placeholder premium actual (sin cambios).

No se modifican `booking-types.ts`, `services.ts`, ni ningún mock.

---

## Out of scope (confirmado, no se toca)

`Landing.tsx`, `useBookingWizard.ts`, `BookingWizard.tsx`, `booking-navigation-types.ts`, `booking-steps.ts`, `booking-schema.ts`, `booking-types.ts`, mocks (`services.ts`, `extras.ts`, etc.), `routeTree.gen.ts`, rutas, payload, disponibilidad, CRM, extras, precios, duraciones, lógica de reserva.

---

## Validación

- Mobile 390×844: drawer mantiene 16:9, 6 fichas con imagen renderizan correctamente.
- Desktop 1366×768: visual reducido (~h-52), "Recomendado para" + "Podés sumar" cerca del fold.
- `npx tsc --noEmit`
- `bun run build`
- `bunx eslint src/components/booking/shared/ServiceDetailsDrawer.tsx`
- `git diff --check`

---

## Reporte final

1. Archivos modificados (`ServiceDetailsDrawer.tsx`) + 6 assets nuevos en `src/assets/services/`.
2. Diff resumido del cambio responsive y del mapa de imágenes.
3. Lista de los 6 servicios con imagen (categoryId + service.id + asset).
4. QA mobile + desktop con observaciones.
5. Resultado de tsc / build / eslint / git diff --check.
6. Confirmación de scope: solo `ServiceDetailsDrawer.tsx` y assets nuevos.

¿Apruebo y paso a build?
