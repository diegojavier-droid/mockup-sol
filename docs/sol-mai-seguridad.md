# Seguridad de Sol Mai

Medido sobre el repo el 2026-09-10, no estimado. Este documento existe
porque la seguridad no es un módulo: es una condición que cada bloque
tiene que cumplir mientras se construye. La pantalla de «Usuarios y
roles» es sólo la parte visible.

---

## 1. Qué protege este sistema, y de quién

No es un sitio de folletos. Adentro hay:

- **Los datos de 150 clientas reales**: nombre, teléfono, email, y qué
  se hicieron en la cabeza los últimos años.
- **Un dato de salud.** La web pregunta por alergias en peluquería,
  maquillaje y depilación. Para la Ley 25.326 eso es **dato sensible**,
  con más obligaciones que un teléfono. Es también el dato que más
  puede lastimar a alguien si falta.
- **Plata.** Señas cobradas, saldos, devoluciones, precios de lista.
- **Las llaves del negocio.** Quien entra al panel ve la agenda entera
  y puede cambiar lo que se le cobra a una clienta.

De quién: no de un atacante dedicado. De lo que efectivamente pasa en un
negocio chico —una cuenta que quedó abierta, alguien que se fue del
salón y sigue entrando, un permiso que nadie sacó— y de un error de
configuración nuestro.

---

## 2. Las cuatro barreras que existen hoy

### 2.1. Para entrar al panel hacen falta tres cosas, no una

`server/src/http/middleware/staffAuth.ts`:

1. Un **access token válido** emitido por Supabase Auth.
2. Que el proveedor sea **confiable**. En producción sólo Google:
   `INTERNAL_AUTH_ALLOWED_PROVIDERS` lo controla y el arranque **falla**
   si alguien pone ahí un proveedor que no verifica el email. Sin esto,
   cualquiera se registra con el correo de Sol y entra.
3. Que tenga una **fila activa en `staff_members`**.
   `INTERNAL_AUTH_ALLOWED_EMAILS` ya sólo gobierna el arranque en frío
   (§3.1): con el sistema andando manda `staff_members`, que administra
   Sol.

Estar autenticado no alcanza: cualquiera puede crearse una cuenta en el
proyecto de Supabase. La autorización es explícita y separada.

**Cómo entra Sol (desde 2026-09-10).** Con el botón «Entrar con Google».
Antes la pantalla pedía pegar a mano un token de sesión de Supabase, lo
que significaba que no podía entrar sola a su propio sistema.

La sesión la maneja Supabase —flujo PKCE, no implícito, así que los
tokens no quedan en el historial del navegador— y el panel sólo espeja el
`access_token` vigente. Renovar antes de que venza también lo hace
Supabase: escribir eso a mano es el tipo de código cuyos errores no se
ven hasta que alguien queda afuera.

**Qué se expone al navegador, y por qué es seguro.** La URL del proyecto
y la clave **publicable**, servidas por el Worker en
`GET /api/v1/auth/panel-config` —no horneadas en el build, para que el
sitio publicado no pueda apuntar a un proyecto distinto del que lo
atiende—. Medido contra la base el 2026-09-10, el rol `anon` que habilita
esa clave **no tiene ni el GRANT** sobre `customers`, `bookings`,
`payments`, `staff_members`, `audit_log`, `customer_consents`,
`customer_notes`, `service_execution_records`, `roles` ni
`role_permissions`: rebota con «permission denied» antes de que RLS entre
en juego. Lo único que alcanza es el catálogo que la web pública ya
muestra. La clave secreta no sale de ese endpoint, y hay una prueba que
lo verifica campo por campo.

### 2.2. Cada ruta declara qué módulo la gobierna

Las **55 rutas** del panel dicen qué módulo y qué nivel piden —`view` o
`full`—, y un único middleware decide. La declaración está en
`server/src/http/middleware/permisos.ts`, en una tabla que se lee entera
en dos minutos.

La garantía es por partida triple, porque las dos primeras dependen de
que alguien se acuerde:

1. La declaración explícita.
2. Una prueba que le pregunta a Hono qué rutas tiene registradas de
   verdad y falla si alguna no está declarada, o si sobra una
   declaración sin ruta.
3. **En tiempo de ejecución, una ruta sin declarar no se atiende.** Se
   contesta 403 y queda en el log. Olvidarse falla cerrado.

El frontend además esconde lo que no corresponde, pero eso es comodidad,
no seguridad: quien atiende recibe 403 en la caja aunque escriba la URL
a mano.

### 2.3. La base no confía en el backend

- **RLS activa en las 30 tablas de 30.**
- **11 políticas**, todas de lectura pública del catálogo (servicios,
  precios de lista, horarios, preguntas). El resto de las tablas
  —clientas, turnos, cobros, staff, auditoría— queda **sin política**,
  que en PostgreSQL significa _nadie_: ni `anon` ni `authenticated`
  leen una fila.
- **41 funciones `security definer`** con `search_path` fijado, que son
  la única vía para las operaciones delicadas.
- El backend tiene **dos clientes distintos**: uno con la clave
  publicable, donde RLS se aplica, y uno administrador que la saltea.
  Son archivos separados a propósito.

### 2.4. Queda registro de lo que se hace

`audit_log` guarda actor, acción, entidad, detalle en JSON y fecha. Se
escribe en cada cambio de precio, de estado de turno y de plata, con el
valor anterior.

---

## 3. Lo que NO está protegido, con evidencia

Esto es lo que un segundo auditor debería mirar primero.

### 3.1. ~~No se puede dar de alta ni de baja a nadie~~ · CERRADO (2026-09-10)

Era el agujero real, y era operativo y no criptográfico: no había una
sola escritura a `staff_members` en todo el backend, así que sacarle el
acceso a alguien dependía de que nosotros estuviéramos disponibles.

**Resuelto.** `Usuarios y roles › Personas` suma, saca el acceso, lo
devuelve y cambia el rol, con auditoría y con el guard del rol también en
la base. La invariante «el salón nunca queda sin dueña» es un trigger
sobre la tabla, así que aguanta incluso un `UPDATE` escrito a mano —que
es exactamente la forma en que alguien se dejaría afuera de su propio
sistema.

### 3.2. ~~Los roles son dos y están fijos en el código~~ · CERRADO (2026-09-10)

Hay una tabla `roles` y una matriz `role_permissions` de módulo por
nivel. Sol arma los roles que quiera desde «Usuarios y roles › Roles» y
les da, módulo por módulo, uno de tres niveles: no lo ve, lo mira, lo
maneja.

**Nadie ganó ni perdió acceso al aplicarlo.** El rol `mostrador`
reproduce exactamente lo que hacía `staff`, medido sobre las rutas que no
estaban detrás de `requireOwner()`; el rol `owner` tiene los nueve
módulos completos. Un cambio de permisos que ocurre solo, sin que nadie
lo decida, es la peor forma de romper la confianza en un sistema de
permisos.

Tres niveles y no más. La tentación es hacer permisos por acción —«puede
cancelar pero no reprogramar»—; eso produce una pantalla que nadie
entiende y que a los dos meses termina con todo prendido.

**Dos límites que no se mueven.** Al rol de la administradora no se le
puede recortar un módulo ni borrarlo, porque si se pudiera el sistema
quedaría sin nadie que lo arregle. Y quien tiene «Usuarios y roles»
completo administra a la gente del salón pero **no** puede nombrar una
administradora nueva, ni bajar de rango a una, ni sacarle el acceso: sin
ese corte podía nombrar administradora a un cómplice y después desactivar
a Sol, porque el trigger de «siempre una dueña» ya no se habría quejado.

**Confirmado por dirección (2026-09-10).** Cerrar un turno y marcar una
seña como devuelta quedan en `calendario`, no en `finanzas`: son
operaciones del turno, que hace quien está con la clienta enfrente. La
caja se mira en Finanzas. Queda cerrado, no es una decisión pendiente.

### 3.3. ~~El registro de cambios se escribe para nadie~~ · CERRADO (2026-09-10)

`Usuarios y roles › Registro de cambios` lo lee, con filtros por
período, persona y tipo de cosa, y traduce los códigos a castellano —«Sol
cambió el precio de Corte femenino, $47.000 → $21.000», no
`service_price_changed`—.

La traducción vive en el frontend a propósito: la base guarda hechos, que
es lo que la hace servir dentro de diez años, y la redacción se corrige
sin migrar nada. Lo que el sistema todavía no sabe decir se muestra tal
cual, con su detalle: una pantalla que esconde lo que no entiende deja de
ser un registro.

**No existe la contracara y no la va a haber.** No hay función para
editar ni para borrar, y el clean-room falla si alguna aparece.

### 3.4. ~~Cambiar quién entra exige un despliegue~~ · ACOTADO (2026-09-10)

`INTERNAL_AUTH_ALLOWED_EMAILS` sigue siendo una variable de entorno, pero
ya sólo gobierna el **arranque en frío**: qué cuenta puede provisionarse
como dueña en una instalación nueva. Sumar y sacar gente con el sistema
andando se hace desde el panel y no exige desplegar nada.

Lo que queda: si algún día no hubiera ninguna dueña activa —cosa que el
trigger de «siempre una dueña» impide—, recuperar el acceso pasaría por
esa variable, y eso sí necesita un despliegue.

### 3.5. No hay cierre de sesión remoto

Si un teléfono se pierde con la sesión abierta, no hay un botón que corte
**esa** sesión. «Salir» cierra la de la pestaña, no la de todos los
dispositivos.

La mitigación real es desactivar a la persona en `staff_members`: corta
el acceso en el pedido siguiente, ya se puede hacer desde el panel (§3.1)
y está probado contra el Worker. Alcanza para el caso que importa —un
teléfono perdido—, porque el token deja de servir aunque siga guardado.

Lo que falta es la pantalla de «dónde está abierta mi sesión» y el corte
selectivo, que es el bloque de **Accesos**.

---

## 4. Las ocho reglas que gobiernan cada bloque

Esto es la parte «en todo el proceso». Un bloque no está terminado si
no cumple estas ocho.

1. **El permiso se revisa en el servidor, siempre.** Esconder un botón
   no es una frontera de seguridad. El frontend oculta para no
   ensuciar la pantalla; el servidor decide.

2. **Mínimo privilegio en la base.** Se usa el cliente con RLS salvo
   que la operación exija el administrador, y cuando lo exige se
   escribe por qué en el código. Toda operación delicada va por una
   función `security definer` con `search_path` fijo, no por SQL suelto.

3. **Toda escritura que toque plata, precios, turnos o permisos se
   audita**, con actor y valor anterior. Sin excepciones: el bloque que
   crea la acción crea su auditoría, no un bloque futuro.

4. **Todo bloque trae al menos un test negativo.** Alguien sin permiso
   recibe 403; un dato inválido se rechaza. Que algo funcione no prueba
   que lo que no debe funcionar esté cerrado.

5. **La integridad va en PostgreSQL cuando la integridad lo exige**,
   con constraints y transacciones, no sólo en TypeScript. Un guard en
   el servidor se saltea con otro camino de escritura; una constraint no.

6. **Un dato personal que no se necesita, no se guarda.** La IP de
   quien acepta los términos no se guarda a propósito: sería recolectar
   un dato personal más para cubrirse de haber recolectado datos
   personales.

7. **Si existe riesgo de configuración incorrecta, un guard que falle
   de manera segura.** Ya hay tres: el proveedor no confiable tumba el
   arranque en producción, el despliegue rechaza un token de pago sin
   su clave de webhook, y el clean-room tiene **137 comprobaciones**
   que fallan a propósito si la base reconstruida no coincide.

8. **Los secretos no pasan por un chat, nunca.** Se cargan en los
   secrets del repositorio y el despliegue los publica. Si sólo nombra
   algo —un identificador de proyecto, una URL— no es secreto; si abre
   una puerta por sí solo, sí.

### Lista para pegar en cada bloque

```
[ ] ¿Qué rol puede hacer esto, y lo revisa el servidor?
[ ] ¿Usa el cliente con RLS, o justifiqué el administrador?
[ ] ¿Queda auditado con actor y valor anterior?
[ ] ¿Hay un test que compruebe que sin permiso da 403?
[ ] ¿La integridad está en la base o sólo en el código?
[ ] ¿Guardo algún dato personal que no necesito?
[ ] ¿Puede quedar mal configurado sin que nadie se entere?
```

---

## 5. Qué hay que construir, en orden

| #   | Qué                                                                               | Por qué primero                                   |
| --- | --------------------------------------------------------------------------------- | ------------------------------------------------- |
| 1   | ~~Personas: alta, baja y cambio de rol desde el panel~~ · **HECHO** (2026-09-10)  | Era el agujero operativo real                     |
| 2   | ~~Registro de cambios: la pantalla que lee `audit_log`~~ · **HECHO** (2026-09-10) | El dato ya se escribía; faltaba la puerta         |
| 3   | ~~Roles por módulo~~ · **HECHO** (2026-09-10)                                     | Recién tenía sentido con los nueve módulos en pie |
| 4   | **Accesos**: cuándo entró cada uno, y cortar una sesión                           | Necesita 1 para poder actuar sobre lo que muestra |

Los pasos 1 y 3 tocaban permisos, así que fueron con tests negativos
—67 contra PostgreSQL, 14 sobre la tabla de rutas y 24 pedidos contra el
Worker— y con invariantes en el clean-room: **no se puede dejar el
sistema sin ninguna dueña activa**, y **a la administradora no se le
puede recortar un módulo**.

---

## 6. Lo que sólo Sol puede decidir

- **Qué roles necesita el salón**, más allá de dueña y mostrador. Acá
  no inventamos su organigrama: el sistema aporta el mecanismo.
- **Quién ve la plata.** Hoy la caja y los números son sólo de ella.
- **Cuánto tiempo se conserva la ficha de una clienta que no vuelve.**
  Guardar para siempre es una decisión, no un default.

---

## 7. Lo que hay que cargar para que el ingreso con Google funcione

Nada de esto lo puede hacer el código: son credenciales y configuración de
consola. Van cargadas por quien administra las cuentas, **nunca pasan por
un chat ni por el repositorio**.

| Dónde                                         | Qué                                             | Detalle                                           |
| --------------------------------------------- | ----------------------------------------------- | ------------------------------------------------- |
| Google Cloud                                  | Un cliente OAuth 2.0 de tipo «Aplicación web»   | Da un Client ID y un Client Secret                |
| Google Cloud                                  | URI de redirección autorizado                   | `https://<proyecto>.supabase.co/auth/v1/callback` |
| Supabase → Authentication → Providers         | Habilitar Google y pegar ese Client ID y Secret |                                                   |
| Supabase → Authentication → URL Configuration | Site URL y Redirect URLs                        | La dirección del panel: `<sitio>/agenda`          |
| Cloudflare (variables del Worker)             | `INTERNAL_AUTH_ALLOWED_EMAILS`                  | El mail de Sol, para el arranque en frío          |

`INTERNAL_AUTH_ALLOWED_PROVIDERS` no hace falta tocarlo: por defecto es
`google`, y el arranque **falla** si alguien pone ahí un proveedor que no
verifica el email.

**Cómo se comprueba que quedó bien**, sin necesidad de mirar logs: abrir
el panel. Si el botón dice «Entrar con Google», el Worker está sirviendo
la configuración. Si en cambio aparece el aviso de que Google todavía no
está configurado y el campo de token, es que falta algo de la tabla de
arriba —la pantalla lo dice en vez de mostrar un botón que no anda—.
