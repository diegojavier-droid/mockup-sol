# Agenda propia y atención separada de cobros

Implementación aislada, sin migraciones aplicadas ni habilitación de cuentas.

- `agendaScope` proviene de `/me`. Assigned sólo navega calendario; la API restringe filas y operaciones. La UI no concede acceso.
- DTO operacional no contiene importes, contactos, ID de clienta ni token público. No se reemplaza un importe ausente por cero.
- No hay búsqueda de áreas de configuración para assigned. Mes/año conservan consulta de resumen con alcance del servidor.
- Inicio/fin dependen de `attentionEnabled` y capacidades explícitas por fila. No usan horas del navegador ni registran pagos. Sin bandera, Site propietario mantiene su operación existente.
- Limpieza, liberación real de puesto y disponibilidad por atención no están implementadas en esta UI. No se presentan como resueltas.
- Cierre financiero visible sólo con finanzas/full; alta legacy requiere vista financiera además de calendario/full.
- El header `X-Staff-Access-Version` sólo detecta discrepancias. Un 200 con versión distinta se descarta y exige `/me`; sólo `/me` con body/header coincidentes acepta la nueva versión. Una respuesta antigua no puede ampliar identidad.
- Cambio observado de permisos/scope retira caché y generación de requests sin cambiar el token. Refresh de misma sesión/acceso conserva generación. Respuestas /me anteriores no pueden reampliar el acceso. No se promete revocación de datos ya vistos ni de operaciones ya confirmadas por servidor.

## Copy

Marca, vetos y corpus Sol Mai leídos. Referencias de flujo consultadas por el integrador el 13/11/2026:
- AgendaPro: https://ayuda.agendapro.com/es/articles/8677272-como-registrar-tus-ventas-en-agendapro-version-nueva (guardar edición separado de pagar).
- Fresha: https://www.fresha.com/es-MX/help-center/knowledge-base/calendario/29-completar-citas (completar asociado a pago; no copiamos esa asociación).
- Softalon: https://www.softalon.com/es/help/salons/complete-an-appointment (finalización y cobro).

«Empezar atención», «Finalizar atención» y «No registra un cobro» son adaptación propia al requisito, no citas de proveedores ni investigación nueva de salones argentinos. No se cambia pantalla inicial.

## Navegación operativa

Se ocultan únicamente destinos sin ninguna sección `listo:true` y secciones pendientes. Esto incluye Clientas como destino móvil pendiente. No se eliminan rutas ni endpoints: el acceso directo conserva una explicación simple sin fecha de lanzamiento. Las pantallas de lectura existentes siguen visibles según permisos. No se cambia `/panel/agenda/hoy` como entrada actual.

Esta reducción de opciones no implementa Clientas, stock ni compras, ni representa autorización. La lista de módulos pendientes sigue en `panel-nav.ts` y las restricciones siguen siendo responsabilidad del backend.

## Denegación y resultado incierto

El primer `/me` vigente que deniega retira generación y cachés antes de leer el cuerpo; denegaciones repetidas no causan un ciclo de remontaje. Las respuestas de identidad anteriores se descartan también tras leer un cuerpo demorado. Una respuesta con header de acceso explícito distinto exige revalidación incluso si es 409 u otro error autenticado.

Si se descarta la respuesta de una escritura, el panel muestra un aviso genérico fuera del contenido privado: no confirma que haya fallado y pide revisar el turno antes de repetir. El aviso no incluye datos de la operación, vive sólo en memoria y permanece hasta cerrarlo o recargar la página.
