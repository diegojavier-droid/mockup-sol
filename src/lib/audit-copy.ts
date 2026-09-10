/**
 * El registro de cambios, dicho en castellano.
 *
 * La base guarda hechos: `service_price_changed` con un JSON al lado. Eso
 * está bien y no se toca —es lo que hace que el registro sirva dentro de
 * diez años, cuando esta pantalla ya no exista—. Pero nadie que abra el
 * panel tiene por qué saber qué significa `auto_no_show_reverted`.
 *
 * Acá vive la traducción, en el frontend, que es donde se puede corregir
 * una palabra sin migrar la base.
 *
 * DOS REGLAS
 *
 * 1. **Lo que no se sabe traducir se muestra igual.** Van a aparecer
 *    acciones nuevas a medida que crezca el sistema, y una pantalla que
 *    las esconde miente. Se muestra el código tal cual y su detalle: feo,
 *    pero cierto.
 * 2. **No se interpreta.** «El sistema la marcó ausente» es un hecho;
 *    «faltó sin avisar» sería una conclusión, y no nos toca sacarla.
 */

export interface AuditRow {
  id: number;
  cuando: string;
  quien: string;
  esSistema: boolean;
  accion: string;
  entityType: string | null;
  sobre: string | null;
  detalle: Record<string, unknown> | null;
}

export interface CambioDicho {
  /** Qué pasó, en una frase. Sin el nombre de la cosa: ese va aparte. */
  frase: string;
  /** El valor anterior y el nuevo, cuando el cambio los tiene. */
  antes?: string;
  ahora?: string;
  /** Cuando no sabemos traducir, el detalle crudo para no ocultar nada. */
  crudo?: string;
}

const pesos = (n: unknown) =>
  typeof n === "number" ? `$${n.toLocaleString("es-AR")}` : String(n ?? "—");

const minutos = (n: unknown) => (typeof n === "number" ? `${n} min` : String(n ?? "—"));

/**
 * Los dos roles que trae el sistema. Cualquier otro lo armó Sol, y se
 * muestra con su slug: inventarle un nombre acá sería adivinar cómo lo
 * llamó ella, y el registro no adivina.
 */
const ROL: Record<string, string> = { owner: "administradora", mostrador: "mostrador" };

/** Los módulos, con el nombre que tienen en la pantalla. */
const MODULO: Record<string, string> = {
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

/** Los tres niveles, dichos como los dice la pantalla de roles. */
const NIVEL: Record<string, string> = {
  none: "no lo ve",
  view: "lo mira",
  full: "lo maneja",
};

const ESTADO: Record<string, string> = {
  pending_payment: "esperando la seña",
  confirmed: "confirmado",
  attended: "atendido",
  no_show: "ausente",
  cancelled: "cancelado",
};

const CANAL: Record<string, string> = {
  online: "por la web",
  manual: "cargado a mano",
  phone: "por teléfono",
  whatsapp: "por WhatsApp",
  walk_in: "sin turno",
};

const texto = (v: unknown, mapa: Record<string, string>) =>
  typeof v === "string" ? (mapa[v] ?? v) : "—";

export function describirCambio(fila: AuditRow): CambioDicho {
  const d = fila.detalle ?? {};

  switch (fila.accion) {
    case "service_price_changed": {
      const mismoPrecio = d.precio_anterior === d.precio_nuevo;
      return {
        frase: mismoPrecio ? "Cambió cuánto lleva" : "Cambió el precio",
        antes: mismoPrecio ? minutos(d.duracion_anterior) : pesos(d.precio_anterior),
        ahora: mismoPrecio ? minutos(d.duracion_nueva) : pesos(d.precio_nuevo),
      };
    }

    case "staff_invited":
      return {
        frase: d.reingreso
          ? `Le devolvió el acceso, como ${texto(d.rol, ROL)}`
          : `Le dio acceso al panel, como ${texto(d.rol, ROL)}`,
      };

    case "staff_access_revoked":
      return { frase: "Le sacó el acceso al panel" };

    case "staff_access_restored":
      return { frase: "Le devolvió el acceso al panel" };

    case "staff_role_changed":
      return {
        frase: "Le cambió el rol",
        antes: texto(d.rol_anterior, ROL),
        ahora: texto(d.rol_nuevo, ROL),
      };

    case "booking_created":
      return { frase: `Cargó el turno ${texto(d.source, CANAL)}` };

    case "booking_status_changed":
      return {
        frase: "Cambió el estado del turno",
        antes: texto(d.previous_status, ESTADO),
        ahora: texto(d.new_status, ESTADO),
      };

    case "no_show_marked":
      return {
        frase: "Marcó el turno como ausente",
        antes: texto(d.previous_status, ESTADO),
        ahora: "ausente",
      };

    case "auto_no_show_reverted":
      return {
        frase: "Corrigió una ausencia: la clienta sí vino",
        antes: "ausente",
        ahora: texto(d.new_status, ESTADO),
      };

    case "refund_completed":
      return { frase: "Dio por devuelta la seña", ahora: pesos(d.amount) };

    case "service_closed": {
      const subio =
        typeof d.final_price === "number" &&
        typeof d.estimated === "number" &&
        d.final_price !== d.estimated;
      return {
        frase: d.reclosed ? "Volvió a cerrar la atención" : "Cerró la atención",
        antes: subio ? pesos(d.estimated) : undefined,
        ahora: pesos(d.final_price),
      };
    }

    case "station_created":
      return { frase: "Sumó un puesto de trabajo" };

    case "product_created":
      return { frase: "Sumó un producto" };

    case "product_updated":
      return { frase: "Cambió un producto" };

    // ------------------------------------------------- roles y permisos
    case "role_created":
      return { frase: `Creó el rol ${texto(d.nombre ?? d.rol, {})}` };

    case "role_deleted":
      return { frase: `Borró el rol ${texto(d.rol, {})}` };

    case "role_permission_changed":
      // El cambio entero en una línea: qué rol, qué módulo, de qué a qué.
      // Es la acción del sistema que más conviene poder auditar de un
      // vistazo, porque es la que reparte quién ve la plata.
      return {
        frase:
          `${texto(d.rol, ROL)}: ${texto(d.modulo, MODULO)} — ` +
          `${texto(d.nivel_anterior, NIVEL)} → ${texto(d.nivel_nuevo, NIVEL)}`,
      };

    // ------------------------------------------------------- facturación
    case "booking_invoiced":
      return {
        frase:
          `Anotó la factura por ${pesos(d.importe)}` +
          (d.numero ? `, ${texto(d.numero, {})}` : "") +
          (typeof d.precio_cerrado === "number" && d.precio_cerrado !== d.importe
            ? ` (la atención se cerró en ${pesos(d.precio_cerrado)})`
            : ""),
      };

    case "booking_invoice_undone":
      return {
        frase: `Deshizo la factura de ${pesos(d.importe_anterior)}`,
      };

    default:
      // Una acción que todavía no sabemos decir. Se muestra igual: una
      // pantalla que esconde lo que no entiende deja de ser un registro.
      return {
        frase: fila.accion,
        crudo: Object.keys(d).length > 0 ? JSON.stringify(d) : undefined,
      };
  }
}

/** Los tipos de cosa, para el filtro y para decir sobre qué fue el cambio. */
export const SOBRE_QUE: Record<string, string> = {
  booking: "Turno",
  customer: "Clienta",
  staff_member: "Persona",
  service: "Servicio",
  product: "Producto",
  resource: "Puesto",
  role: "Rol",
};
