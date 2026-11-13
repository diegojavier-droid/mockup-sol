# Sol Mai: una fuente, dos adaptadores de despliegue

## Alcance y estado

El núcleo es el repositorio canónico de Sol Mai: un catálogo, un motor de
cotización/disponibilidad, una entidad `bookings`, una agenda y un wizard.
No se mantiene una segunda maqueta ni una copia manual del panel.

Esta integración parte de `main` `7d352b0040d15574e5ade852567c801f485c0522`,
incorpora los PR 103–106 y la implementación de sesión con contraseña revisada
(tree `c2d09913e1148e4778f8798d9593fffd4576a165`). La adaptación de Sites se
recuperó de la fuente privada `3526432c9c671460a9269c9747741c575f97f6bb`.

Una rama local no equivale a una rama publicada, un build no equivale a un
despliegue y las pruebas con transportes simulados no equivalen a Supabase Auth
real. El registro de verificación distingue esos estados. Ninguna tarea de
esta integración habilita pagos, publica datos reales ni migra producción.

## Selección explícita antes de compilar

| Comando | Entrada servidor | Acceso interno | Datos |
| --- | --- | --- | --- |
| `bun run build:original` | `src/server.ts` | Supabase Auth + membresía/rol en cada request | Configuración propia del despliegue original |
| `bun run build:site-test` | `src/server-site-test.ts` | Propietario autenticado por Sites, comprobado también en servidor | Exclusivamente Sol Mai - Pruebas Site |

`build` y el workflow original eligen explícitamente `original`; nunca deducen
el modo del hostname, cookies, query string, almacenamiento del navegador o
cabeceras enviadas por una clienta. Un perfil desconocido o ausente en Vite
falla. El perfil Site no es una manera alternativa de autenticarse en la API
original.

Las diferencias inevitables de transporte, acceso al panel, privacidad y
persistencia del borrador viven en adaptadores compilados en
`src/deployment/{original,site-test}`. Las pantallas y el dominio se comparten.
La navegación de clientas no presenta un enlace al panel. Ocultarlo no es un
control de acceso: las rutas y las acciones del servidor siguen protegidas.

## Autenticación original

El panel original ofrece contraseña individual mediante Supabase Auth, sin
crear cuentas desde el formulario. Identidad confirmada, proveedor admitido,
membresía activa y permisos vigentes se verifican server-side. `user_metadata`
no concede privilegios. La baja o reducción de permisos corta el próximo
pedido a la API, no operaciones que ya hayan concluido.

El ciclo local de sesión limpia datos y peticiones administrativas al cambiar
de persona. Una renovación legítima de la misma sesión no cancela una mutación
ya enviada. Los eventos de otra pestaña atrasados no sustituyen una sesión más
nueva. El cierre informa si no pudo confirmarse ante el proveedor; no se
promete revocación inmediata del JWT de acceso: Supabase revoca el refresh,
pero un JWT copiado puede seguir vigente hasta expirar. La membresía todavía
se vincula por correo verificado, no por UUID de Auth. Son límites conocidos,
no requisitos satisfechos por un cartel de login.

No se han creado credenciales reales de Sol o del equipo. La aceptación real
se prepara en `scripts/acceptance-staff-password-local.ts` y sólo admite un
Supabase efímero local con confirmación de entorno `ephemeral-clean-room`.
La nueva combinación debe pasar esa prueba en CI antes de presentarse como
lista para uso con cuentas reales.

## Frontera del Site privado

El Site conserva acceso privado de su propietario. No es un acceso público de
reservas ni un login de equipo con contraseña. Las cabeceras de identidad sólo
son confiables detrás del Dispatch de Sites: el Worker no se publica por
Wrangler directo. Sus APIs y rutas privadas fallan sin la identidad esperada.

El gateway valida una allowlist estricta antes de transmitir; firma el cuerpo,
ruta, operación y vencimiento exactos. El servidor aislado consume un nonce
durable, fija el proyecto de prueba y rechaza redirecciones/otros destinos.
Los pagos, notificaciones y proveedores externos permanecen ausentes. La
creación transaccional utiliza el motor canónico y agrega un ledger de prueba
para reintentos/procedencia, no otra agenda.

Los contactos son editables, teléfono y email obligatorios y validados. Sólo
se usan datos ficticios para QA. El comentario libre puede contener información
sensible: la advertencia no garantiza que una persona escriba sólo ficción.
Se exige aceptación de la política vigente antes de transmitir contactos,
alergias o comentario. No aparecen en precio, disponibilidad, query keys ni
almacenamiento persistente del Site. Las alergias conservan `No`, `Sí, leves`,
`Sí, importantes`, sin selección inicial; ausencia no significa `No`. La
etiqueta es `Alergias`, sin cambiar su obligatoriedad por una corrección de copy.

La agenda del Site autoriza la proyección del contexto por IDs obtenidos de
las filas de la base y corroborados por ledger. Error o ausencia de procedencia
falla cerrado; ningún nombre, teléfono o ID enviado por el navegador concede
ese acceso. Los enlaces públicos de estado no muestran el contexto privado. La unificación
extiende esta protección al endpoint original: `getBookingByToken` deja de
seleccionar `customer_note` y conserva el campo público como `null`; la agenda
autenticada mantiene la nota. Es un endurecimiento deliberado de privacidad,
no sólo un movimiento de archivos.

La política de prueba es un borrador que no sustituye revisión jurídica. Su
versión no reemplaza silenciosamente la de la aplicación original.

## Migraciones y operación

- `supabase/migrations` conserva exclusivamente el schema canónico.
- `supabase/site-migrations` registra las estructuras exclusivas de prueba,
  incluida la migración histórica de la primera demo. Quedan fuera del runner
  productivo. Mover el archivo en Git no altera el ledger de una base existente.
- No se borra ni renumera el historial aplicado a Sol Mai - Pruebas Site.
- `check:deployment` y el workflow de schema rechazan migraciones exclusivas
  del Site en la cadena productiva.
- No hay despliegue automático del Site desde esta rama ni cambios de sharing.
  Una publicación privada usa la herramienta oficial de Sites, con el commit
  exacto ya revisado y su configuración aislada existente.

## Un cambio, una revisión, dos builds

1. Editar la rama de integración del repositorio canónico; no editar dos copias
   a mano. Resolver ahí conflictos semánticos, además de conflictos Git.
2. Ejecutar pruebas originales y Site, tipos de ambos perfiles, guards y
   clean-room; revisar de nuevo la combinación, no sólo cada PR por separado.
3. Compilar ambos perfiles desde el mismo commit limpio. Cada build escribe
   `dist/server/build-provenance.json` con perfil, commit, tree y hashes de
   artefactos. Un árbol sucio queda marcado y no debe publicarse como ese SHA.
4. Con publicación autorizada, subir la rama y PR borrador al repositorio
   canónico, verificar el head remoto y los checks de ese SHA. Nada de merge
   automático ni despliegue productivo implícito.
5. El repositorio privado de Sites es un espejo de entrega del mismo código,
   no la fuente canónica. Su historial previo se conserva sin force-push ni
   importarlo al repositorio público. Puede existir un commit de entrega con
   ese SHA canónico como ancestro y exactamente el mismo tree. En ese caso,
   `SOL_MAI_CANONICAL_SOURCE` permite registrar ambos IDs: el build verifica
   igualdad de árboles y ascendencia, no confía sólo en una etiqueta. Empaquetar
   `build:site-test`, guardar versión privada y verificar UI/API en el destino
   real. El código sigue siendo uno, aunque los historiales de entrega difieran.
6. Mantener un punto de retorno verificado. Un rollback del Worker no revierte
   migraciones: no inventar una reversión de datos.

Compartir fuente no significa compartir bases, secretos, autenticación ni
visibilidad. Esa separación es precisamente lo que permite probar el mismo
sistema sin exponer a las clientas reales.
