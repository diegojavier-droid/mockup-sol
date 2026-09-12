/**
 * Qué módulo y qué nivel pide cada ruta del panel.
 *
 * POR QUÉ ESTO ES UNA TABLA Y NO UN `if` EN CADA HANDLER
 *
 * Antes había una sola pregunta —«¿sos la dueña?»— y se contestaba con un
 * middleware colgado de un router. Con nueve módulos y roles que Sol
 * arma sola, la pregunta pasó a ser «¿esta persona puede escribir en
 * Finanzas?», y esa pregunta hay que poder auditarla de un vistazo. Una
 * tabla se lee entera en dos minutos; cuarenta y nueve `if` repartidos en
 * mil cuatrocientas líneas, no.
 *
 * LA GARANTÍA POR PARTIDA DOBLE
 *
 * 1. Acá está declarado el permiso de cada ruta.
 * 2. `permisos.test.ts` recorre las rutas que Hono tiene registradas de
 *    verdad y falla si alguna no está declarada acá, o si acá sobra una
 *    declaración que no corresponde a ninguna ruta.
 * 3. En tiempo de ejecución, una ruta sin declarar NO se atiende. Aunque
 *    alguien agregue una ruta y saltee el test, el servidor contesta 403
 *    y lo deja anotado. Olvidarse falla cerrado, nunca abierto.
 *
 * El punto 3 es el que importa: el 1 y el 2 dependen de que alguien se
 * acuerde, y de esas dos se puede salir con un `--no-verify`.
 */

import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import type { StaffVars } from "./staffAuth";

export const MODULOS = [
  "calendario",
  "clientas",
  "finanzas",
  "inventario",
  "servicios",
  "personal",
  "compras",
  "usuarios",
  "configuracion",
] as const;

export type Modulo = (typeof MODULOS)[number];

/** Lo que puede tener un rol sobre un módulo. */
export type NivelGuardado = "none" | "view" | "full";

/** Lo que puede pedir una ruta. Ninguna ruta pide `none`. */
export type NivelPedido = "view" | "full";

export type MapaDePermisos = Partial<Record<Modulo, NivelGuardado>>;

/**
 * Mirar es `view`; cambiar algo es `full`. La distinción vale para que
 * Sol pueda dejar que alguien vea la caja del día sin poder tocarla.
 */
export interface Permiso {
  modulo: Modulo;
  nivel: NivelPedido;
}

/**
 * Rutas que atiende cualquier persona con acceso al panel, sin pedir
 * módulo. Es una lista declarada, no un olvido: `/me` es lo que el panel
 * consulta para saber qué dibujar, así que exigirle un módulo dejaría a
 * la persona sin pantalla en la que enterarse de que no tiene permiso.
 */
export const SIN_MODULO = new Set<string>(["GET /me"]);

/**
 * EL REPARTO, Y LA REGLA QUE LO ORDENÓ
 *
 * Nadie gana ni pierde acceso el día que esto se aplica. Las rutas que
 * hoy atiende cualquiera del salón quedan en `calendario` y `clientas`,
 * que son los dos módulos que el rol `mostrador` tiene completos; las que
 * hoy están detrás de `requireOwner()` quedan repartidas en los módulos
 * que les corresponden, y como el rol `owner` los tiene todos, la dueña
 * sigue llegando exactamente a lo mismo.
 *
 * DOS DECISIONES, YA CONFIRMADAS POR DIRECCIÓN (2026-09-10)
 *
 * · Cerrar un turno y devolver una seña quedan en `calendario`, no en
 *   `finanzas`. Son operaciones de un turno que hace quien está en el
 *   mostrador con la clienta enfrente; moverlas a Finanzas se la sacaría.
 *   La caja se mira en Finanzas; el turno se cierra en Calendario.
 * · Las estaciones se listan desde `calendario` (para sentar a alguien) y
 *   se crean desde `configuracion` (para cambiar el salón).
 */
export const PERMISOS: Record<string, Permiso> = {
  // ---------------------------------------------------------- calendario
  "GET /agenda": { modulo: "calendario", nivel: "view" },
  // Devuelve cuántos turnos por día, no los turnos. Mismo módulo y mismo
  // nivel que la agenda: es la agenda contada.
  "GET /agenda/resumen": { modulo: "calendario", nivel: "view" },
  "GET /bookings/:id": { modulo: "calendario", nivel: "view" },
  "GET /capacity": { modulo: "calendario", nivel: "view" },
  "GET /stations": { modulo: "calendario", nivel: "view" },
  "GET /refunds-pending": { modulo: "calendario", nivel: "view" },
  "GET /schedule-exceptions": { modulo: "calendario", nivel: "view" },
  "POST /bookings": { modulo: "calendario", nivel: "full" },
  "PATCH /bookings/:id/status": { modulo: "calendario", nivel: "full" },
  "POST /bookings/:id/no-show": { modulo: "calendario", nivel: "full" },
  "POST /bookings/:id/no-show/revert": { modulo: "calendario", nivel: "full" },
  "POST /bookings/:id/refund-done": { modulo: "calendario", nivel: "full" },
  "POST /bookings/:id/close": { modulo: "calendario", nivel: "full" },
  "POST /bookings/:id/station": { modulo: "calendario", nivel: "full" },
  "POST /stations/:id/block": { modulo: "calendario", nivel: "full" },
  "POST /stations/blocks/:blockId/remove": { modulo: "calendario", nivel: "full" },
  "POST /schedule-exceptions": { modulo: "calendario", nivel: "full" },
  "DELETE /schedule-exceptions/:id": { modulo: "calendario", nivel: "full" },

  // ------------------------------------------------------------ clientas
  "GET /customers": { modulo: "clientas", nivel: "view" },
  "GET /customers/:id": { modulo: "clientas", nivel: "view" },
  "GET /pending-links": { modulo: "clientas", nivel: "view" },
  "POST /customers/:id/notes": { modulo: "clientas", nivel: "full" },
  "POST /pending-links/:id": { modulo: "clientas", nivel: "full" },

  // ------------------------------------------------------------ finanzas
  "GET /cash-register": { modulo: "finanzas", nivel: "view" },
  "GET /dashboard": { modulo: "finanzas", nivel: "view" },
  "GET /reconciliation": { modulo: "finanzas", nivel: "view" },
  "GET /invoicing/pending": { modulo: "finanzas", nivel: "view" },
  "GET /invoicing/summary": { modulo: "finanzas", nivel: "view" },
  "POST /bookings/:id/invoiced": { modulo: "finanzas", nivel: "full" },
  "DELETE /bookings/:id/invoiced": { modulo: "finanzas", nivel: "full" },

  // ---------------------------------------------------------- inventario
  "GET /salon/products": { modulo: "inventario", nivel: "view" },
  "POST /salon/products": { modulo: "inventario", nivel: "full" },
  "POST /salon/products/:id/active": { modulo: "inventario", nivel: "full" },

  // ------------------------------------------------------------ servicios
  "GET /salon/services": { modulo: "servicios", nivel: "view" },
  "GET /salon/asistente": { modulo: "servicios", nivel: "view" },
  "GET /services/:slug/tiers": { modulo: "servicios", nivel: "view" },
  "GET /pending-values": { modulo: "servicios", nivel: "view" },
  "POST /salon/services/:slug/price": { modulo: "servicios", nivel: "full" },
  "POST /salon/price-assist": { modulo: "servicios", nivel: "full" },
  "POST /salon/price-assist/apply": { modulo: "servicios", nivel: "full" },
  "PATCH /services/:slug/tiers/:tier": { modulo: "servicios", nivel: "full" },

  // ------------------------------------------------------------ usuarios
  "GET /staff": { modulo: "usuarios", nivel: "view" },
  "GET /audit": { modulo: "usuarios", nivel: "view" },
  "GET /audit/actors": { modulo: "usuarios", nivel: "view" },
  "GET /roles": { modulo: "usuarios", nivel: "view" },
  "POST /staff": { modulo: "usuarios", nivel: "full" },
  "POST /staff/:id/active": { modulo: "usuarios", nivel: "full" },
  "POST /staff/:id/role": { modulo: "usuarios", nivel: "full" },
  "POST /roles": { modulo: "usuarios", nivel: "full" },
  "POST /roles/:slug/permission": { modulo: "usuarios", nivel: "full" },
  "DELETE /roles/:slug": { modulo: "usuarios", nivel: "full" },

  // ------------------------------------------------------- configuracion
  "GET /settings": { modulo: "configuracion", nivel: "view" },
  "GET /business-hours": { modulo: "configuracion", nivel: "view" },
  "GET /areas": { modulo: "configuracion", nivel: "view" },
  "PATCH /settings/:key": { modulo: "configuracion", nivel: "full" },
  "PATCH /business-hours/:id": { modulo: "configuracion", nivel: "full" },
  "PATCH /areas/:slug": { modulo: "configuracion", nivel: "full" },
  "POST /salon/stations": { modulo: "configuracion", nivel: "full" },
  "POST /salon/stations/:id/active": { modulo: "configuracion", nivel: "full" },
};

/** `full` alcanza para mirar; `view` no alcanza para cambiar. */
export function alcanza(guardado: NivelGuardado | undefined, pedido: NivelPedido): boolean {
  if (guardado === "full") return true;
  return pedido === "view" && guardado === "view";
}

export function puede(permisos: MapaDePermisos, permiso: Permiso): boolean {
  return alcanza(permisos[permiso.modulo], permiso.nivel);
}

/** El nombre con el que Sol conoce cada módulo, para el mensaje de error. */
const NOMBRE: Record<Modulo, string> = {
  calendario: "Calendario",
  clientas: "Clientas",
  finanzas: "Finanzas",
  inventario: "Inventario",
  servicios: "Servicios",
  personal: "Personal",
  compras: "Compras",
  usuarios: "Usuarios y roles",
  configuracion: "Configuración",
};

/**
 * Saca de `matchedRoutes` la ruta que de verdad va a atender el pedido.
 *
 * `c.req.routePath` acá adentro devuelve `/*` —el patrón de este mismo
 * middleware—, así que no sirve para buscar en la tabla. `matchedRoutes`
 * sí trae la lista completa, con los middlewares (`ALL`) adelante y el
 * handler concreto al final.
 */
function rutaQueAtiende(c: {
  req: { matchedRoutes?: { method: string; path: string }[] };
}): { method: string; path: string } | undefined {
  const rutas = c.req.matchedRoutes ?? [];
  for (let i = rutas.length - 1; i >= 0; i -= 1) {
    if (rutas[i]!.method !== "ALL") return rutas[i];
  }
  return undefined;
}

export function claveDeRuta(method: string, path: string, prefijo: string): string {
  const relativo = path.startsWith(prefijo) ? path.slice(prefijo.length) : path;
  return `${method} ${relativo || "/"}`;
}

/**
 * El cortafuegos. Corre después de `staffAuth`, que ya dejó en `staff`
 * quién es la persona y qué puede.
 */
export function requirePermission() {
  return createMiddleware<{ Variables: StaffVars }>(async (c, next) => {
    // El prefijo sale del patrón de este mismo middleware (`/api/v1/admin/*`)
    // en vez de estar escrito a mano, así que mover el panel de lugar no
    // deja la tabla apuntando a otro lado en silencio.
    const prefijo = c.req.routePath.replace(/\/\*+$/, "");
    const ruta = rutaQueAtiende(c as never);

    // Ninguna ruta concreta matcheó: no hay handler que proteger, y el
    // 404 lo contesta quien corresponde.
    if (!ruta) return next();

    const clave = claveDeRuta(ruta.method, ruta.path, prefijo);
    if (SIN_MODULO.has(clave)) return next();

    const permiso = PERMISOS[clave];
    if (!permiso) {
      // Fallar cerrado. Si esto aparece en los logs, alguien agregó una
      // ruta al panel sin declarar qué módulo la gobierna.
      console.error(
        `[sol-mai-api] ruta del panel sin permiso declarado: ${clave}. ` +
          `Declarala en server/src/http/middleware/permisos.ts.`,
      );
      throw new HTTPException(403, {
        message: "Esta parte del panel todavía no está habilitada.",
      });
    }

    const staff = c.get("staff");
    if (!staff || !puede(staff.permisos, permiso)) {
      // El mensaje sale de lo que la persona TIENE, no de lo que la ruta
      // pide. Decirle «podés mirar, pero no cambiar» a alguien que no ve
      // el módulo la manda a buscar un botón que no existe.
      const tiene = staff?.permisos[permiso.modulo];
      throw new HTTPException(403, {
        message:
          tiene === "view"
            ? `Podés mirar ${NOMBRE[permiso.modulo]}, pero no cambiarlo.`
            : `No tenés acceso a ${NOMBRE[permiso.modulo]}.`,
      });
    }

    await next();
  });
}
