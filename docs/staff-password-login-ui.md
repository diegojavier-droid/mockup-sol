# Ingreso individual al panel: interfaz

La app original permite correo y contraseña cuando `/api/v1/auth/panel-config`
incluye el proveedor `email`. Usa `supabase.auth.signInWithPassword` del cliente
existente, sin crear un sistema de contraseñas propio ni cambiar proveedores.
Un resultado sin `data.session.access_token` falla cerrado. Tener sesión no
concede acceso: el backend sigue comprobando identidad, proveedor, personal
activo y permisos antes de mostrar el panel.

El formulario guarda la contraseña sólo en estado efímero; la borra al iniciar
el intento, cambiar de método o borrar datos. Desmontar elimina ese estado.
El argumento temporal del SDK dura lo necesario para terminar la solicitud.
No se manda a logs, URL, analytics, React Query ni almacenamiento del navegador.
La sesión de Supabase sigue su política existente, que es independiente de la
contraseña. El botón se bloquea y una referencia inmediata impide doble envío.

El link por correo continúa como alternativa con `shouldCreateUser:false`:
la cuenta debe estar previamente habilitada por una invitación/alta autorizada.
No hay formulario de signup ni entrada manual de tokens, incluso si falta la
configuración. Google se ofrece sólo si ya figura en la configuración; su propia
política de creación de cuentas depende de Supabase/OAuth, no de este formulario.

Pruebas locales: adaptador del SDK con mocks, SSR, regresiones de código UI y
renderizado React interactivo usando el SDK real con transporte sustituido.
El formulario anónimo permanece fuera del árbol privado con clave de sesión:
iniciar una contraseña no desmonta la pantalla ni borra su estado pendiente o
el error posterior. Un error de red/500 al consultar identidad ofrece reintentar
o cerrar sesión, no otro formulario dentro del árbol privado. Cambiar de cuenta
no recarga la página y conserva el aviso si no se pudo borrar persistencia.
Los tests de unidad prohíben fetch sin fixture con un preload global.
No prueban entrega de correo, login real, credenciales, autorización de una cuenta
real ni configuración productiva. No se crearon cuentas ni se publicó este bloque.
