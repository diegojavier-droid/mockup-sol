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
3. Que el email esté en `INTERNAL_AUTH_ALLOWED_EMAILS` **y** tenga una
   fila activa en `staff_members`.

Estar autenticado no alcanza: cualquiera puede crearse una cuenta en el
proyecto de Supabase. La autorización es explícita y separada.

### 2.2. Dos roles, revisados en el servidor

`owner` y `staff`. `requireOwner()` protege **22 rutas** de administración.
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

### 3.1. No se puede dar de alta ni de baja a nadie

**No hay una sola escritura a `staff_members` en todo el backend.**
Sumar a alguien hoy es: editar un secreto en GitHub, desplegar, y meter
una fila a mano en SQL. Sacarlo, lo mismo al revés.

La migración que creó los roles
(`20260822190000_staff_access.sql`) dice textualmente _«Al equipo lo da
de alta la dueña desde el panel»_. Esa pantalla nunca se construyó.

**Consecuencia real:** el día que alguien deja el salón, sacarle el
acceso depende de que nosotros estemos disponibles. Eso no puede ser.

### 3.2. Los roles son dos y están fijos en el código

Alcanzaban cuando había una pantalla. Con nueve módulos, `staff` pasó a
significar demasiadas cosas: hoy quien atiende no ve Finanzas, pero
tampoco hay manera de decir «esta persona sí puede ver Inventario y no
Compras» sin tocar código.

### 3.3. El registro de cambios se escribe para nadie

`audit_log` no tiene **ningún** endpoint que lo lea. Un registro que
nadie puede consultar no cumple su función: no sirve para entender por
qué un número no cierra, ni para saber quién cambió qué.

### 3.4. Cambiar quién entra exige un despliegue

`INTERNAL_AUTH_ALLOWED_EMAILS` es una variable de entorno. Es una
barrera fuerte —resiste incluso a que alguien escriba en la base— pero
rígida: nadie del salón puede operarla.

### 3.5. No hay cierre de sesión remoto

Si un teléfono se pierde con la sesión abierta, no hay un botón que
corte esa sesión. Desactivar a la persona en `staff_members` corta el
acceso en el siguiente pedido, que es la mitigación real hoy, pero
depende de 3.1 para poder hacerse.

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

| #   | Qué                                                      | Por qué primero                                                                   |
| --- | -------------------------------------------------------- | --------------------------------------------------------------------------------- |
| 1   | **Personas**: alta, baja y cambio de rol desde el panel  | Es el agujero operativo real: hoy sacarle el acceso a alguien depende de nosotros |
| 2   | **Registro de cambios**: la pantalla que lee `audit_log` | Es lo más barato de todo: el dato ya se escribe, falta la puerta                  |
| 3   | **Roles por módulo**                                     | Recién tiene sentido con los nueve módulos en pie                                 |
| 4   | **Accesos**: cuándo entró cada uno, y cortar una sesión  | Necesita 1 para poder actuar sobre lo que muestra                                 |

Los pasos 1 y 3 tocan permisos, así que van con tests negativos y con
una invariante en el clean-room: **no se puede dejar el sistema sin
ninguna dueña activa.**

---

## 6. Lo que sólo Sol puede decidir

- **Qué roles necesita el salón**, más allá de dueña y mostrador. Acá
  no inventamos su organigrama: el sistema aporta el mecanismo.
- **Quién ve la plata.** Hoy la caja y los números son sólo de ella.
- **Cuánto tiempo se conserva la ficha de una clienta que no vuelve.**
  Guardar para siempre es una decisión, no un default.
