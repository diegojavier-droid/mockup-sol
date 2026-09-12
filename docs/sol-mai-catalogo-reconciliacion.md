# Reconciliación de catálogo · sistema vs salón real

> Generado el 2026-09-12 comparando `precios.xlsx` (hoja `servicios` + tres
> hojas de pagos, 926 cobros reales) contra las tablas `services` y
> `service_price_tiers` del Supabase de producción.

> **Ninguna fila de esta tabla es una decisión.** Es el insumo para que Sol
> marque qué queda, qué se renombra y qué se da de baja.

## 1. Lo que el sistema publica hoy, y cuánto aparece en la facturación real

«Tickets» = cuántos de los 926 cobros de marzo-mayo mencionan ese servicio
en el texto libre de la columna «Que se hace». Es una cota inferior: un
servicio escrito con una palabra que no está en la búsqueda no se cuenta.

**Cuidado al leer:** varios slugs comparten la misma palabra de búsqueda
—`corte-fem`, `corte-brushing` y `mechas-corte-brushing` se buscan todos con
«corte»— así que sus conteos no son independientes y no deben sumarse. Lo que
la tabla sí prueba sin ambigüedad es el extremo de abajo: **un cero es un
cero**. Si ni una palabra de las asociadas a ese servicio aparece en 926
cobros, ese servicio no se facturó.

### Peluquería

| Servicio del sistema | Tickets reales | Veredicto propuesto |
| --- | ---: | --- |
| `corte-brushing` | 343 | **Confirmado** |
| `corte-fem` | 343 | **Confirmado** |
| `retoque-raiz` | 267 | **Confirmado** |
| `color-tratamiento` | 238 | **Confirmado** |
| `color-global` | 180 | **Confirmado** |
| `tonalizacion` | 69 | **Confirmado** |
| `brushing` | 50 | **Confirmado** |
| `mechas` | 27 | **Confirmado** |
| `mechas-corte-brushing` | 27 | **Confirmado** |
| `mechas-tonalizacion` | 27 | **Confirmado** |
| `balayage` | 21 | **Confirmado** |
| `balayage-nutricion` | 21 | **Confirmado** |
| `nutricion` | 15 | Confirmado, bajo volumen |
| `post-color` | 9 | Confirmado, bajo volumen |
| `botox` | 8 | Confirmado, bajo volumen |
| `color-nutricion` | 8 | Confirmado, bajo volumen |
| `alisado` | 2 | Marginal · ¿existe? |
| `alisado-corte` | 2 | Marginal · ¿existe? |
| `alisado-nutricion` | 2 | Marginal · ¿existe? |
| `peinado-diario` | 1 | Marginal · ¿existe? |
| `peinado-social` | 1 | Marginal · ¿existe? |
| `babylights` | 0 | **Sin facturación en 3 meses** |
| `bano-luz` | 0 | **Sin facturación en 3 meses** |
| `claritos` | 0 | **Sin facturación en 3 meses** |
| `hidratacion` | 0 | **Sin facturación en 3 meses** |
| `recogido` | 0 | **Sin facturación en 3 meses** |
| `reconstruccion` | 0 | **Sin facturación en 3 meses** |
| `reparacion` | 0 | **Sin facturación en 3 meses** |

### Maquillaje

| Servicio del sistema | Tickets reales | Veredicto propuesto |
| --- | ---: | --- |
| `mk-evento` | 0 | **Sin facturación en 3 meses** |
| `mk-fiesta` | 0 | **Sin facturación en 3 meses** |
| `mk-novia` | 0 | **Sin facturación en 3 meses** |
| `mk-prueba` | 0 | **Sin facturación en 3 meses** |
| `mk-social` | 0 | **Sin facturación en 3 meses** |

### Uñas

| Servicio del sistema | Tickets reales | Veredicto propuesto |
| --- | ---: | --- |
| `nailart` | 83 | **Confirmado** |
| `kapping` | 0 | **Sin facturación en 3 meses** |
| `mani` | 0 | **Sin facturación en 3 meses** |
| `retiro` | 0 | **Sin facturación en 3 meses** |
| `semi` | 0 | **Sin facturación en 3 meses** |
| `softgel` | 0 | **Sin facturación en 3 meses** |

### Depilación

| Servicio del sistema | Tickets reales | Veredicto propuesto |
| --- | ---: | --- |
| `depi-cejas` | 9 | Confirmado, bajo volumen |
| `depi-bigote` | 0 | **Sin facturación en 3 meses** |
| `depi-bozo-menton` | 0 | **Sin facturación en 3 meses** |
| `depi-rostro-completo` | 0 | **Sin facturación en 3 meses** |

## 2. Lo que el salón cobra y el sistema no tiene

Los nombres tal cual Sol los escribió en la hoja `servicios`, por bloque.
Los del bloque «TRATAMIENTOS MAS COLOR» son el **mismo** tratamiento con
precio de agregado: no son servicios distintos.

### Bloque `COLORACIONES` — 11 líneas con precio

| Fila | Nombre en la planilla | Precio efectivo (corto → xl) |
| ---: | --- | --- |
| 3 | raiz | 28.000 · 30.000 · 33.000 · 38.000 |
| 4 | total | 34.000 · 38.000 · 44.000 · 50.000 |
| 6 | raiz | 32.000 · 34.000 · 38.000 · 41.000 |
| 7 | total | 40.000 · 44.000 · 47.000 · 53.000 |
| 9 | raiz | 36.000 · 40.000 · 45.000 · 55.000 |
| 10 | total | 60.000 · 70.000 · 80.000 · 95.000 |
| 14 | MATIZADO | 33.000 · 38.000 · 44.000 · 50.000 |
| 17 | solo vincha | 28.000 · 30.000 · 35.000 · 40.000 |
| 18 | todo(matizado) color comun | 40.000 · 50.000 · 60.000 · 75.000 |
| 21 | raiz | 33.000 · 36.000 · 39.000 · 45.000 |
| 22 | total | 40.000 · 45.000 · 52.000 · 60.000 |

### Bloque `SERVICIOS` — 10 líneas con precio

| Fila | Nombre en la planilla | Precio efectivo (corto → xl) |
| ---: | --- | --- |
| 50 | LAVADO | 3.000 · 3.000 · 3.000 · 3.000 |
| 51 | CORTE | 17.000 · 17.000 · 17.000 · 17.000 |
| 52 | CORTE FLEQUILLO | 7.000 · 7.000 · 7.000 · 7.000 |
| 53 | SECADO/ MODELADO | 3.000 · 3.000 · 3.000 · 3.000 |
| 54 | BRUSHING | 12.000 · 14.000 · 16.000 |
| 55 | BRUSHING Y PLANCHA | 14.000 · 16.000 · 18.000 |
| 56 | BRUSHING CON MOVIMIENTO | 13.000 · 15.000 · 18.000 |
| 57 | ONDAS CON PLANCHA | 18.000 · 19.000 · 20.000 |
| 58 | TRENZAS ( hasta 2) | 15.000 · 15.000 · 15.000 · 15.000 |
| 59 | PASAR COLOR | 14.000 · 14.000 · 14.000 · 14.000 |

### Bloque `TRATAMIENTOS` — 22 líneas con precio

| Fila | Nombre en la planilla | Precio efectivo (corto → xl) |
| ---: | --- | --- |
| 69 | AMPOLLA | 20.000 · 22.000 · 25.000 · 28.000 |
| 70 | SHOCK keratina | 25.000 · 32.000 · 36.000 · 40.000 |
| 71 | BIOTINA | 25.000 · 32.000 · 36.000 · 40.000 |
| 72 | BOTOX | 18.000 · 20.000 · 23.000 · 26.000 |
| 73 | MASCRA MAGIC | 18.000 · 20.000 · 23.000 · 26.000 |
| 74 | MASCARA REPAIR | 20.000 · 22.000 · 25.000 · 28.000 |
| 75 | FILLER MAS REPAIR | 23.000 · 25.000 · 28.000 · 30.000 |
| 76 | FILLER Y MAGIC WATER | 25.000 · 30.000 · 34.000 · 37.000 |
| 77 | MAGIC WATER | 22.000 · 26.000 · 28.000 · 31.000 |
| 78 | RIFLESSI | 21.000 · 24.000 · 28.000 · 34.000 |
| 79 | NUTRICION | 17.000 · 19.000 · 21.000 · 24.000 |
| 80 | LISS BIOCELL | 40.000 · 45.000 · 50.000 · 55.000 |
| 81 | SOW EXPRESS | 21.000 · 23.000 · 27.000 · 30.000 |
| 82 | VITAMIN REPAIR / elixir SOW | 27.000 · 30.000 · 36.000 · 40.000 |
| 83 | COLOR SHINE | 25.000 · 30.000 · 34.000 · 37.000 |
| 84 | CONTROL FRIZZ | 32.000 · 36.000 · 41.000 · 44.000 |
| 85 | AMINOFUSION | 25.000 · 28.000 · 32.000 · 35.000 |
| 86 | AKA MOA | 22.000 · 25.000 · 28.000 · 32.000 |
| 87 | KARSEELL | 20.000 · 24.000 · 26.000 · 30.000 |
| 88 | PLASMA | 22.000 · 25.000 · 30.000 · 36.000 |
| 89 | LAVADO | 3.000 · 3.000 · 3.000 · 3.000 |
| 90 | FUSION | 22.000 · 25.000 · 30.000 · 34.000 |

### Bloque `TRATAMIENTOS MAS COLOR` — 21 líneas con precio

| Fila | Nombre en la planilla | Precio efectivo (corto → xl) |
| ---: | --- | --- |
| 27 | MASCARA REPAIR | 7.000 · 8.000 · 9.000 · 10.000 |
| 28 | BOTOX | 6.000 · 7.000 · 9.000 · 10.000 |
| 29 | SHOCK keratina | 9.000 · 10.000 · 12.000 · 14.000 |
| 30 | BIOTINA | 9.000 · 10.000 · 12.000 · 14.000 |
| 31 | AMPOLLA | 7.000 · 8.000 · 9.000 · 10.000 |
| 32 | MASCARA RIFLESSI | 8.000 · 9.000 · 10.000 · 11.000 |
| 33 | MASCARA MAGIC | 7.000 · 8.000 · 9.000 · 10.000 |
| 34 | MASCARA PRO COLORIS | 8.000 · 9.000 · 10.000 · 11.000 |
| 35 | FILLER Y MASCARA REPAIR | 10.000 · 11.000 · 12.000 · 13.000 |
| 36 | MAGIC WATER | 8.000 · 9.000 · 10.000 · 11.000 |
| 37 | FILLER Y MAGIC WATER | 10.000 · 11.000 · 12.000 · 13.000 |
| 38 | AMPOLLA kera y argan Y MASCARA de protenat | 8.000 · 9.000 · 10.000 · 11.000 |
| 39 | SOW  EXPRESS | 8.000 · 9.000 · 10.000 · 11.000 |
| 40 | VITAMIN / elixir | 10.000 · 11.000 · 12.000 · 13.000 |
| 41 | COLOR SHINE | 12.000 · 14.000 · 15.000 · 16.000 |
| 42 | CORTE | 15.000 · 15.000 · 15.000 · 15.000 |
| 43 | FLEQUILLO | 5.000 · 5.000 · 5.000 · 5.000 |
| 44 | ALISADO FLEQUILLO | 8.000 · 8.000 · 8.000 · 8.000 |
| 45 | KARSEELL | 7.000 · 8.000 · 9.000 · 10.000 |
| 46 | PLASMA | 9.000 · 10.000 · 11.000 · 13.000 |
| 47 | FUSION WELLA | 9.000 · 12.000 · 14.000 · 15.000 |

### Bloque `PEINADOS FIESTA` — 4 líneas con precio

| Fila | Nombre en la planilla | Precio efectivo (corto → xl) |
| ---: | --- | --- |
| 63 | ONDAS AL AGUA O GLAM | 45.000 · 50.000 · 60.000 · 70.000 |
| 64 | SEMIRECOGIDO | 50.000 · 55.000 · 60.000 · 65.000 |
| 65 | RECOGIDO | 55.000 · 60.000 · 75.000 · 90.000 |
| 66 | MAQUILLAJE | 75.000 |

### Bloque `UNAS` — 4 líneas con precio

| Fila | Nombre en la planilla | Precio efectivo (corto → xl) |
| ---: | --- | --- |
| 94 | SEMIPERMANTE | 17.000 |
| 97 | KAPPING | 19.000 |
| 100 | SOFT GEL | 22.000 |
| 103 | RECONSTRUCCION UÑA | 2.000 |

### Bloque `DEPILACION` — 4 líneas con precio

| Fila | Nombre en la planilla | Precio efectivo (corto → xl) |
| ---: | --- | --- |
| 108 | Depi Rostro completo( incluye cejas, bozo,mejillas, contorno facial) | 30.000 |
| 109 | •Cejas $12.000 | 12.000 |
| 110 | •Bigote $5.000 | 5.000 |
| 111 | •Bozo(bigote y mentón) $11.500 | 11.500 |

