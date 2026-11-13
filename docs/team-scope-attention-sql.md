# Piloto aislado: alcance del equipo y atención sin cobro

## Estado

Borrador **no aplicado a ninguna base remota**. Se ejecutó realmente en PostgreSQL
17.12 nativo en modo offline `--single`: replay completo de 50 migraciones canónicas,
4 Site, aplicación local del borrador, aceptación SQL y rollback. Auth se representa
sólo por una tabla vacía; no es Supabase Auth ni una prueba de infraestructura hospedada.
El sistema operativo denegó crear el socket Unix (también tras ejecución ampliada
permitida). No se probó TCP ni se eludió esa restricción. **Concurrencia multi-sesión
pendiente**. Supabase CLI no está disponible: generar una migración numerada con
CLI fijado antes de un rollout separado autorizado; no introducir este borrador
en la cadena productiva.
Archivo: `supabase/site-migrations/drafts/team-scope-attention.sql`.
La cadena canónica `supabase/migrations` permanece intacta. El despliegue
original del piloto debe permanecer bloqueado hasta su rollout separado;
este borrador no autoriza activar `TEAM_SCOPE_ENABLED` ni aplicar DDL.

## Contrato y seguridad

- `roles.agenda_scope` es `assigned` por defecto. Sólo el owner protegido conserva
  `all`. No se promueve `mostrador`, no se mapean personas y no se crean cuentas.
- Nuevo RPC `resolve_staff_session_scoped(p_email text)` conserva los cinco campos
  del contrato anterior y añade `agenda_scope` y `attention_enabled=true`.
  La función antigua no se modifica: su retorno y wrappers existentes siguen.
- El servidor del piloto usa la nueva función sólo con activación explícita;
  errores o función ausente deben fallar cerrado, sin fallback de privilegios.
- `booking_attention(booking_id, started_at, started_by, finished_at, finished_by)`
  almacena hechos operativos, nunca precios/pagos/limpieza/capacidad. No se
  completan registros históricos ni se redefine el estado `attended`.
- RPC `record_booking_attention(p_booking_id uuid,p_action text,p_actor_id uuid)`:
  `start` o `finish`; respuesta `{booking_id,started_at,finished_at}`.
  Actor proviene de la sesión verificada por la API, nunca del JSON del browser.
- Revalida miembro activo/no borrado, rol, calendario `full` y asignación dentro
  de la transacción. Staff, rol y permiso se bloquean `FOR SHARE`; reserva
  `FOR UPDATE`. Una reasignación/baja/downgrade que gana el lock se aplica antes
  de autorizar. Si la atención gana primero, termina antes del cambio posterior.
  No se promete cancelar retroactivamente una escritura ya confirmada.
- Una reserva ajena, inexistente o sin asignación para `assigned` devuelve el
  mismo error sin contexto. Un operador global necesita también calendario full.
- Las horas salen de `clock_timestamp()` después de adquirir locks. Finalizar
  sin inicio falla; repetir inicio/fin devuelve los timestamps originales;
  repetir inicio después del fin nunca reabre. Se audita sólo la primera transición.
- Reserva cancelada, expirada o pendiente de pago no admite acciones. Un cierre
  histórico sin registro operativo no recibe una hora de inicio inventada.
- Nuevas funciones `SECURITY INVOKER`, `search_path` fijo y sólo `service_role`.
  Tabla con RLS, sin acceso anon/authenticated. Ningún usuario recibe una clave
  de servicio; la API sigue siendo la frontera de autorización.

## Aislamiento y lo que NO cambia

Aplicación futura únicamente al proyecto aislado ya verificado. El ejecutor
externo debe verificar host/URL e identidad del proyecto. Los GUC
`sol_mai.target_project_ref` y `sol_mai.apply_team_scope` son opt-in, no prueba
criptográfica del destino. El borrador exige ledger de Site, cero usuarios Auth,
cero pagos, propietario ficticio único y procedencia de reservas/clientas.
Exige la política existente de **24 h** y no la modifica.

No cambia `payments`, `service_execution_records`, `bookings`, cancelaciones,
refunds, seña, capacidad ni horas planificadas. No aplica excepciones comerciales.
La finalización real todavía no libera un puesto ni confirma limpieza. Separar
el cobro y su permiso en API es parte del bloque backend, no lo hace este SQL.

## Verificación

1. `scripts/site/sql-tests/team-scope-attention.sql`: pruebas RPC ejecutadas localmente
   en transacción con ROLLBACK; fixture A/B, propio/ajeno/sin asignar, miembro
   inactivo/borrado, downgrade, cambio de asignación, entradas inválidas,
   transiciones/idempotencia/auditoría, denegación anon/authenticated y comparación
   de snapshots de pagos/cierres/reservas/política sin cambios.
2. `scripts/site/sql-tests/isolation/specs/team_attention.spec`: cinco schedules
   para el `isolationtester` de PostgreSQL: doble inicio, reasignación ganadora,
   baja ganadora, downgrade ganador y reasignación después de inicio seguida de
   fin por B. Es **sólo para base local desechable**, por su setup/teardown de
   fixtures confirmados. IDs reservados: si colisionan, setup debe fallar; nunca
   ejecutar teardown contra otra base. El runner debe verificar loopback y opt-in.
   Todavía no hay archivo expected obtenido de ejecución; no está aprobado como
   test CI verde hasta ejecutar y revisar resultados/bloqueos.
3. `team-scope-source.test.ts`: inspección estática, expresamente NO una prueba
   del comportamiento de PostgreSQL. Útil contra regresiones obvias de grants,
   locks, permisos, target y escrituras financieras.

Puertas pendientes: revisión independiente; generar migración con CLI; ejecutar
concurrencia multi-sesión y entorno Supabase; confirmar target; autorización de
aplicación y activación. No activar cuentas o ampliar accesos antes de esas puertas.

## Evidencia nativa local (2026-11-13)

- Fuente oficial PostgreSQL 17.12: https://www.postgresql.org/ftp/source/v17.12/
- Tarball SHA256 verificado contra el archivo oficial: `9cf136a703d8ee2f83465c43be4e9e8e7930c82b0bfba13be7e2537be769ac55`.
- Compilación local con pgcrypto/btree_gist; dependencias bison/flex/m4 extraídas de paquetes del repositorio Debian firmado, sin instalación de sistema.
- Runner reproducible: `python scripts/site/sql-tests/run-native-offline.py /ruta/postgres/bin /ruta/nueva/evidencia`. Rechaza directorio existente, inicializa clúster ficticio propio y jamás abre sockets o conexiones. Requiere binarios oficiales previamente verificados con ambas extensiones.
- Guards sin opt-in y con destino incorrecto: rechazo esperado; tabla/columna ausentes tras rollback.
- Aceptación como service_role y denegaciones anon/authenticated ejecutadas realmente; RLS habilitado y grants mínimos, sin equivaler a prueba del gateway PostgREST.
- Finalizar después de cierre financiero sintético conserva cierre/pagos; cierre histórico sin tracking no inventa inicio.
- Tras rollback: cero reservas/clientas/atenciones/pagos/Auth; único propietario ficticio; política24 intacta.
- No se ejecutaron los schedules isolationtester; sólo quedaron preparados.

### RLS independiente de grants

La aceptación también concede temporalmente SELECT/INSERT a anon/authenticated
después de crear atenciones reales. Ambos ven cero filas y sus INSERT con FK
válidas reciben SQLSTATE42501 con mensaje de row-level security. El rollback
revierte fixtures y grants; el runner comprueba que los permisos temporales no
quedaron. El runner comprueba código de salida del proceso además de errores
PostgreSQL y sentinel final, incluidos los escenarios de rechazo esperado.

El primer ensayo RLS independiente detectó una particularidad de `--single`:
el contador de OIDs recién inicializado no se adelanta al rango normal como al
arrancar un postmaster. La tabla recibió OID14762 y PostgreSQL la trató como
objeto interno, omitiendo RLS. Ese ensayo **falló**, no cuenta como evidencia.
El runner ahora crea/elimina secuencias ficticias hasta alcanzar OID16384 antes
del replay; no modifica catálogos ni el motor. La aceptación exige además
`row_security_active(...) = true` para cada rol. La nueva ejecución desde cero
pasó todos los escenarios, incluido SELECT0, INSERT42501 por RLS y rollback de
los permisos temporales. Fuente del comportamiento: PostgreSQL17.12
`src/backend/utils/misc/rls.c`, guard `relid < FirstNormalObjectId`.
