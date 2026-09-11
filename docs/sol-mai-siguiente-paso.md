# Dónde íbamos · 2026-09-11

Este archivo existe porque las sesiones se pierden y el repositorio no.
Es corto a propósito: lo que hay que decidir y lo que sigue, nada más.

## EMPEZÁ POR ACÁ

En este orden, sin saltear:

1. **Comprobá la red.** `curl -sS -o /dev/null -w '%{http_code}' --max-time 15
   https://developers.facebook.com/docs/whatsapp/`. Si da 403, decilo y
   seguí igual: no bloquea nada de abajo. El 2026-09-11 dio **301**, que
   es una redirección y no un bloqueo: la red quedó en Completo.
2. **Preguntá las definiciones abiertas** de la sección siguiente, con
   `AskUserQuestion`, que se contesta con un clic.
3. **Implementá** lo que esas respuestas desbloqueen.

---

## Lo que está esperando una respuesta de dirección

**1. `ensure_rls` como migración.** Ver §6 bis de
`docs/sol-mai-seguridad.md`. Existe en producción y no en el repositorio,
así que el clean-room prueba una base menos protegida que la real. Hace
falta un sí para escribirla: es DDL sobre producción.

**2. WhatsApp.** Ver §2.2 y §6 de
`docs/sol-mai-senas-ausencias-y-avisos.md`. El segundo número existe, es
móvil, tiene WhatsApp en uso, y el formato para Meta es con el `9`
(trece dígitos). Falta preguntarle a un proveedor si hay coexistencia
para Argentina antes de tocarlo: por el camino directo se pierden la
aplicación y el historial.

**3. El destino del link del mail.** Hoy `emailRedirectTo` apunta a
`/agenda`, que quedó como redirección a `/panel/agenda/hoy`. Funciona,
pero son dos cargas de página para quien vuelve del correo. Moverlo a
`/panel` exige **primero** agregar esa URL en la lista de Redirect URLs
del proyecto de Supabase: si no está, Supabase manda al Site URL y el
link deja de entrar. Es un cambio de consola, no de código.

## Lo que está hecho y desplegado

- Ingreso al panel por link al correo, con los tres finales distinguidos
  (PR #91) y la separación 401 / 403 (PR #92). Las dos desplegadas.
- Boceto de la navegación nueva en `diseno/navegacion/`. Quedó como
  registro de cómo se llegó a la decisión; sus dibujos dicen
  «Calendario», que es el nombre que se descartó.
- Auditoría contra producción: el esquema coincide, 37 = 37.

## La navegación del panel: hecha (2026-09-11)

Las tres definiciones que bloqueaban el bloque quedaron decididas:

| Qué | Qué se decidió |
| --- | --- |
| Las etiquetas de la barra de abajo | Por **módulo**, no por sección: la misma palabra abajo, en la barra lateral, en las migas y en la dirección |
| Cómo se llama el módulo | **Agenda**. §5.0 y el boceto decían «Calendario» y quedaron corregidos |
| Clientas, que todavía no existe | **Queda a la vista, apagada**, para que la barra no cambie de forma el día que exista |

De las dos primeras juntas sale la barra: **Agenda · Clientas ·
Finanzas · Más**.

Lo construido: una dirección por sección (`/panel/<modulo>/<seccion>`),
barra inferior fija en el teléfono, barra lateral de nueve módulos en la
computadora sin rótulos de grupo, migas que suben un nivel, y
`/operaciones` convertido en Servicios › Horarios. El árbol vive en
`src/lib/panel-nav.ts` y lo defiende `src/lib/panel-nav.test.ts`.

**Las pantallas de adentro no se rehicieron**, que era el acuerdo. Siguen
con el mismo aspecto; lo único que cambió es dónde se montan.

## Lo que el bloque dejó anotado

- **El permiso del módulo sigue llamándose `calendario`** aunque el
  módulo se llame Agenda. Es el nombre en la matriz de la base y en
  `/me`; renombrarlo es una migración de datos. Ver §5.0.
- **Mes, Año, Áreas, Cobros, Gastos, Accesos** y los cuatro módulos sin
  pantalla están en el árbol y dicen «Todavía no» al entrar.
- **Productos se mudó de Servicios a Inventario**, que es donde §5.0 lo
  pone. Es el único panel que cambió de módulo además de los dos de
  plata.
- **`src/lib/audit-copy.test.ts` tiene 4 errores de formato** que vienen
  de antes de este bloque y siguen ahí: `bunx prettier --write` sobre ese
  archivo los arregla, pero no se tocó por estar fuera de alcance.

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
- Para probar el panel en el navegador sin backend hace falta simular el
  proyecto de Supabase: sembrar `sb-<ref>-auth-token` en `localStorage`,
  responder `/api/v1/auth/panel-config` y `/api/v1/admin/me`, y **cortar
  todo pedido a un host externo** —las fuentes de Google cuelgan a
  Chromium en este contenedor—. Playwright anda con
  `executablePath: /opt/pw-browsers/chromium-1194/chrome-linux/chrome`.
