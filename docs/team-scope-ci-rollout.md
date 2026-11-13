# CI efímero para agenda propia: preparación y límites

## Estado antes de publicar la rama

La fuente del piloto pasó pruebas offline y PostgreSQL nativo `--single`.
Eso no prueba concurrencia, Auth ni PostgREST reales. El nuevo workflow
`team-scope-clean-room.yml` está preparado para ejecutarlos en un runner
desechable, sin credenciales de servicios alojados ni datos reales.

La inspección de capacidades encontró un único entorno conectado, sin Docker.
Crear sockets PostgreSQL allí fue denegado; no se reintentó con otra modalidad.
Dos consultas remotas de solo lectura, autorizadas específicamente, devolvieron
PIDs diferentes pero tiempos no solapados. No se cuentan como concurrencia.

## Fronteras del workflow nuevo

- Evento PR normal, nunca `pull_request_target`; token de GitHub `contents: read`.
- Checkout sin persistir credenciales; sin environment productivo, secretos del
  repositorio, enlace remoto de Supabase, despliegue o subida de artefactos.
- Stack en directorio temporal nuevo, no se copian `.env` ni enlaces remotos.
  Red Docker propia con puertos publicados sólo en loopback.
- Estado local se lee como JSON, no se ejecuta como shell. API y DB se validan
  por autoridad literal antes de usarlas; rechaza IP abreviada, destinos remotos,
  parámetros, fragmentos y valores multilínea. Claves sólo efímeras del stack.
- SQL y cinco schedules con locks comprobados preceden a cualquier cuenta Auth.
  Después se comprueban login, permisos, propios/ajenos, DTO, atención, bajas y
  restricciones directas vía Auth/PostgREST reales.
- Se espera la disponibilidad real del RPC después de recargar PostgREST.
- Cleanup por IDs de cada prueba, más destrucción del stack con `always()` y
  `--no-backup`. Archivos de credenciales/logs privados no se publican.

Los checks offline del runner y workflow prueban sus guardas, no el resultado
de servicios que aún no arrancaron. El primer resultado de CI debe inspeccionarse;
no se generan expected outputs para aceptar automáticamente lo que ocurra.

## Versiones

Se fija Bun 1.4.4, la misma versión usada en las pruebas locales, y Supabase CLI
2.122.1, release de mantenimiento de la línea 2. No se adopta `latest`: CLI 3
cambió comandos, configuración y selección de destino. No se usa ningún comando
remoto ni se altera configuración Auth alojada.

Fuentes primarias consultadas:
- [Supabase CLI 2.122.1](https://github.com/supabase/cli/releases/tag/v2.122.1).
- [Cambios de CLI 3 y alternativa de mantener v2](https://github.com/orgs/supabase/discussions/52779).
- [Stack local y publicación de puertos sólo en loopback](https://supabase.com/docs/guides/local-development).
- [Creación administrativa de usuarios exclusivamente en servidor](https://supabase.com/docs/reference/javascript/auth-admin-createuser).

## Bloqueo productivo

El bloqueo de `package.json deploy` no bastaba para Actions, que llamaba Wrangler
directamente. Ahora los workflows de Worker y schema tienen un job obligatorio
sin secretos que termina con error antes del job productivo. No hay override
por variable. Pruebas parsean YAML y comprueban dependencia, orden y ausencia de
`continue-on-error` o condiciones que omitan ese gate.

Publicar una rama/PR para CI no autoriza fusionarla, quitar el gate, crear cuentas
reales, aplicar la migración a un proyecto alojado ni ampliar acceso al Site.
El Site privado vigente y la política de 24 horas permanecen separados del CI.
