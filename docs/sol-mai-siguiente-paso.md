# Dónde íbamos · 2026-09-11

Este archivo existe porque las sesiones se pierden y el repositorio no.
Es corto a propósito: lo que hay que decidir y lo que sigue, nada más.
Cuando el bloque de navegación esté hecho, se borra.

## Lo que está esperando una respuesta de dirección

**1. Las tres definiciones de la navegación.** Sin esto no arranca la
implementación. Están dibujadas en el lienzo de `diseno/navegacion/`.

| Qué | Opciones |
| --- | --- |
| Las etiquetas de la barra de abajo, en el teléfono | `Hoy · Clientas · Caja` (secciones, más directo) **o** `Calendario · Clientas · Finanzas` (módulos, más consistente con el árbol) |
| Cómo se llama el módulo | **Calendario** o **Agenda**. Hoy el sistema dice las dos cosas: el árbol dice una y la pantalla dice la otra |
| Clientas todavía no existe | ¿Queda en la barra apagada, o se saca hasta que esté? |

**2. `ensure_rls` como migración.** Ver §6 bis de
`docs/sol-mai-seguridad.md`. Existe en producción y no en el repositorio,
así que el clean-room prueba una base menos protegida que la real. Hace
falta un sí para escribirla: es DDL sobre producción.

**3. WhatsApp.** Ver §2.2 y §6 de
`docs/sol-mai-senas-ausencias-y-avisos.md`. El segundo número existe, es
móvil, tiene WhatsApp en uso, y el formato para Meta es con el `9`
(trece dígitos). Falta preguntarle a un proveedor si hay coexistencia
para Argentina antes de tocarlo: por el camino directo se pierden la
aplicación y el historial.

## Lo que está hecho y desplegado

- Ingreso al panel por link al correo, con los tres finales distinguidos
  (PR #91) y la separación 401 / 403 (PR #92). Las dos desplegadas.
- Boceto de la navegación nueva en `diseno/navegacion/`, con
  `verificar.py` que cuenta lo que tiene que estar en cada pantalla.
- Auditoría contra producción: el esquema coincide, 37 = 37.

## Alcance acordado del bloque siguiente

**Sólo la navegación.** Jerarquía con dirección propia por sección, barra
inferior en el teléfono, migas de pan, matar `/operaciones`, sacar los
rótulos de grupo. Las pantallas de adentro quedan como están; rehacerlas
a los tres formatos es otro bloque y se decidió no mezclarlos.

## Notas de entorno

- La red del entorno pasó a **Completo** el 2026-09-11. Antes era una
  lista personalizada de trece hosts, y por eso `developers.facebook.com`,
  `nngroup.com`, `odoo.com` y `dl.acm.org` daban 403. Aplica a sesiones
  nuevas, no a la que estaba abierta.
- Los conectores de Supabase y Cloudflare están conectados y verificados.
- Producción corre PostgreSQL 17.6.1; el stack local, 16.
- `wrangler dev` se cae en el contenedor cada N pedidos y el pedido que
  cae encima devuelve 500. No es el código: se comprobó con tres pedidos
  idénticos seguidos (403, 403, 500).
