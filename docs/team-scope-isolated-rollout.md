# Agenda propia y atención separada: piloto aislado

## Alcance autorizado

Preparación en una rama aislada. No se abren cuentas, no se amplían permisos remotos,
no se modifica producción, no se activa dinero ni mensajería. La política vigente
se conserva en 24 horas: la propuesta de 8 horas fue retirada antes de aplicarse.

## Contrato nuevo

- El alcance de agenda se resuelve en el servidor. `assigned` limita lecturas a
  `bookings.staff_id` de la persona; `NULL` no concede acceso. La agenda resumida
  y el detalle aplican el mismo filtro. La identidad verificada no la elige el
  navegador.
- Un rol de alcance propio no se vuelve global por tener permisos modulares:
  las rutas globales, fichas, auditoría y mutaciones legacy quedan bloqueadas.
- El DTO operativo no selecciona ni devuelve montos, costos, pagos, tokens
  públicos o contactos globales. La nota y alergias corresponden al turno propio,
  no al historial completo de la clienta. Los precios del catálogo público no
  constituyen datos internos secretos.
- `all` sólo se acepta desde el contrato de DB confiable. El propietario
  protegido conserva alcance global. No se convierte `mostrador` en secretaria
  ni se asignan personas a roles nuevos automáticamente.
- Cobrar, decidir el destino de una seña y registrar devoluciones requieren
  autorización financiera; tener calendario ya no concede esas acciones.
- Inicio y fin de atención tienen registros y tiempos del servidor independientes
  de `payments`. No cobran ni inventan horas de atenciones históricas.
- Un cambio observado de alcance o permisos retira el caché administrativo y
  descarta respuestas anteriores. Sólo `/me` vigente adopta la nueva identidad;
  una respuesta tardía o una cabecera distinta no concede permisos.

## Activación bloqueada hasta verificación

`TEAM_SCOPE_ENABLED` queda desactivado por defecto. Activarlo requiere el nuevo
resolver de sesión y la tabla/función de atención. Si faltan, no hay fallback que
abra acceso. El piloto sólo admite un destino local explícito o el proyecto
aislado ya identificado; eso complementa la verificación real de la conexión y
los guardas SQL, no la reemplaza.

El Site publicado conserva la identidad de propietario, no cuentas individuales
del equipo. Su adaptación mantiene la atención nueva desactivada y no amplía la
lista de operaciones firmadas. Una prueba con el propietario no demuestra
aislamiento entre empleadas.

El comando estándar `deploy` se detiene antes de construir o publicar. No tiene
un override de entorno. Es un seguro de publicación accidental, no una frontera
de autorización: las herramientas de publicación también deben respetar el
alcance aprobado. Los builds locales siguen disponibles para inspección.

## Puertas de salida

1. Revisión independiente del commit y de los artefactos finales.
2. Aceptación PostgreSQL de asignación, permisos, RLS, idempotencia, rollback y
   carreras de reasignación/baja/cambio de rol. Distinguir pruebas estáticas,
   transporte simulado, PostgreSQL local y Supabase Auth real.
3. Verificación de destino y aprobación exigida para aplicar el SQL aislado.
   No usar la cadena de migraciones productivas ni modificar su historia.
4. Prueba de interfaz con profesional A/B y secretaría ficticias, incluyendo
   llamadas directas a rutas ajenas y cambio de permisos en la misma sesión.
5. Decisión explícita sobre las personas/roles de secretaría antes de conceder
   acceso global o financiero. Sin cuentas reales creadas por este bloque.
6. Plan productivo separado. El vínculo actual por email y la revocación de
   access tokens requieren su propia validación; logout no se presenta como
   revocación inmediata del JWT.

## No resuelto por este bloque

- Limpieza, ocupación real de puestos y recálculo de disponibilidad.
- Asignación por prestación cuando intervienen varias profesionales.
- Alta y recuperación de cuentas reales.
- Historial completo compartido de clientas, compras, stock, gastos o sueldos.
- Nueva preferencia de pantalla inicial.

El informe de auditoría conserva los requisitos de esas áreas. Ocultar un enlace
pendiente reduce confusión, pero no implementa la función que falta.
