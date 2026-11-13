# SQL aislado CI: fuente preparada, NO EJECUTADO

No se arrancó ningún servidor ni se conectó a ninguna DB para desarrollar este
runner. La restricción de sockets local se respeta. Los siete tests offline de
guards/parse/barrier pasan; no constituyen prueba de concurrencia. La evidencia
previa PostgreSQL `--single` corresponde a semántica/rollback/RLS, no a este runner.

## Orden obligatorio

1. Workflow autorizado inicia Supabase local efímero vacío, CLI fijado2.122.1.
   No conectar ni enlazar proyectos remotos; no ejecutar migraciones automáticamente
   antes del runner (rechaza tablas public existentes).
2. Proveer psql del sistema oficial y variables de entorno efímeras:
   `SOLMAI_DISPOSABLE_LOCAL_SQL=yes`, `PGHOST=127.0.0.1`, `PGPORT=54322`
   (o puerto publicado explícito), `PGDATABASE=postgres`, `PGUSER=postgres`,
   `PGPASSWORD` desde secreto local CI, nunca argumentos ni logs.
3. Ejecutar `python scripts/site/sql-tests/run-local-ci.py`.
4. Sólo si termina0 y muestra `SQL before Auth PASS`, ejecutar aceptación Auth.
   El propietario ficticio `site-owner@example.invalid` queda sin usuario Auth;
   los fixtures de concurrencia se eliminan y verifican individualmente.
5. Destruir todo el entorno efímero al terminar, también ante fallo. No reusar DB.

El runner exige IP literal loopback, no admite URL, DNS, sockets, listas de hosts,
servicios libpq o PGHOSTADDR que redirijan. Construye un entorno libpq limpio;
psql usa `-X` y no lee psqlrc ni archivos de password. El socket TCP publicado
localmente puede terminar dentro de Docker con dirección172.x: por eso no confunde
`inet_server_addr()` del contenedor con el destino cliente127.0.0.1. Confirma DB y
usuario exactos, transporte TCP, esquema public vacío y cero auth.users antes de
escribir. El workflow es responsable de crear ese contenedor desechable local;
una variable de opt-in no demuestra procedencia de un túnel externo.

## Qué ejecutará

- Las50 migraciones canónicas y4Site sin modificarlas, por archivo en transacción.
- Propietaria ficticia; draft aislado con opt-in; aceptación SQL con rollback,
  permisos y RLS independientes, política24 sin cambios.
- Cinco schedules de sesiones psql distintas, IDs y rol UUID nuevos por escenario:
  doble inicio, reasignación ganadora, baja ganadora, downgrade ganador e inicio
  seguido de reasignación y fin por la nueva profesional.
- Antes de liberar el primer COMMIT, una tercera sesión exige que
  `pg_blocking_pids(waiter)` contenga exactamente el PID del holder esperado.
  Polling acotado no sustituye ese requisito: sin bloqueo probado, falla.
- Doble inicio devuelve mismo JSON/timestamps y un solo evento; los tres rechazos
  verifican PT404/PT403 sin filas; finalización registra dos eventos y actorB.
- Cleanup por IDs de esta corrida, sin truncar tablas; comprueba ausencia de
  filas/atenciones/auditoría/roles/permisos propias, cero pagos/Auth, política24.

No imprime SQL, contraseñas, respuestas de DB ni stderr de psql. Un fallo devuelve
mensaje genérico y código no cero; no se declara aprobación automáticamente ni se
generan expected outputs para "bendecir" resultados inesperados. Timeout de
statement15s, locks10s, barrera5s. Sesiones se terminan al fallar para liberar locks.

Tests offline: `PYTHONDONTWRITEBYTECODE=1 python scripts/site/sql-tests/test-local-ci.py`.
Pendiente: primera ejecución real en CI autorizado y revisión de resultados.

Cada archivo aplicado registra ruta relativa y SHA256 en orden después de su
COMMIT. No se rellena ni se finge el ledger `supabase_migrations.schema_migrations`:
este replay es explícito psql sobre entorno desechable. Al final emite
`NOTIFY pgrst, 'reload schema'`; el siguiente runner debe esperar disponibilidad
real del endpoint/RPC. NOTIFY no confirma que PostgREST ya recargó.

## Contrato inicial Supabase y propietario

El runner verifica roles anon/authenticated/service_role (este último BYPASSRLS),
auth.users y pgcrypto instalado en extensions antes del replay. No fabrica roles
o tablas Auth si falta el contrato: falla cerrado. La base inicial real del CLI
fijado todavía no se ejecutó en esta entrega; su compatibilidad queda pendiente
de CI. Esquemas internos Supabase pueden contener tablas; public debe estar vacío.

La migración Site20261112064000 ya llama provision_initial_owner. El runner no
inserta un segundo propietario: comprueba exactamente uno, activo y no borrado,
con email ficticio esperado, antes del draft. Un test offline de main con sesiones
falsas comprueba orden y ausencia del INSERT duplicado; no simula SQL como pasado.
