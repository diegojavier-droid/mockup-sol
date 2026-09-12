/**
 * El árbol del panel: nueve módulos, sus secciones, y qué permiso gobierna
 * cada uno.
 *
 * POR QUÉ ESTÁ TODO EN UN SOLO ARCHIVO
 *
 * La barra lateral, la barra de abajo del teléfono, las migas, el título
 * de la pestaña y el ruteo son cinco vistas del mismo árbol. Cuando cada
 * una tenía su propia lista, discrepaban: el chip decía «Hoy · Semana»,
 * §5.0 decía «Hoy · Semana · Mes · Año» y los filtros de adentro decían
 * «Hoy · Mañana · Semana». Tres listas para un solo módulo.
 *
 * Acá se declara una vez y las cinco leen de acá.
 *
 * EL NOMBRE DEL MÓDULO Y EL NOMBRE DEL PERMISO NO SON EL MISMO
 *
 * `slug` es lo que se ve en la dirección; `permiso` es el nombre que usa
 * el servidor en la matriz de permisos. Para los turnos son distintos a
 * propósito: dirección elegió llamar al módulo **Agenda** (2026-09-11),
 * pero el permiso se sigue llamando `calendario` en la base y en `/me`.
 * Renombrarlo es una migración de datos, no una de navegación, y este
 * bloque es sólo navegación. Queda anotado como deuda en
 * `docs/sol-mai-arquitectura-modular.md` §5.0.
 */

import type { Modulo } from "@/lib/staff-session";

export interface Seccion {
  /** Lo que va en la dirección: /panel/<modulo>/<slug>. */
  slug: string;
  /** Lo que lee quien usa el panel. */
  label: string;
  /**
   * Si hay pantalla construida. Las que no, se muestran apagadas: el
   * boceto decidió que esconderlas haría parecer el sistema más chico de
   * lo que va a ser, y mostrarlas como si anduvieran sería mentir.
   */
  listo: boolean;
}

export interface ModuloDef {
  /** Lo que va en la dirección: /panel/<slug>. */
  slug: string;
  label: string;
  /** El nombre del módulo en la matriz de permisos del servidor. */
  permiso: Modulo;
  secciones: Seccion[];
  /**
   * Dónde cae un separador después de este módulo. El orden sigue siendo
   * el de la frecuencia de uso —lo diario primero—, pero la etiqueta que
   * lo nombraba («Todos los días», «Cada tanto», «Casi nunca, pero tiene
   * que estar») se fue: describía al sistema en vez de ayudar a
   * encontrar.
   */
  cortaDespues?: boolean;
}

const seccion = (slug: string, label: string, listo = false): Seccion => ({ slug, label, listo });

export const ARBOL: ModuloDef[] = [
  {
    slug: "agenda",
    label: "Agenda",
    permiso: "calendario",
    secciones: [
      seccion("hoy", "Hoy", true),
      seccion("manana", "Mañana", true),
      seccion("semana", "Semana", true),
      seccion("mes", "Mes", true),
      seccion("anio", "Año", true),
    ],
  },
  {
    slug: "clientas",
    label: "Clientas",
    permiso: "clientas",
    secciones: [
      seccion("fichas", "Fichas"),
      seccion("sin-venir", "Sin venir hace tiempo"),
      seccion("consentimientos", "Consentimientos"),
    ],
  },
  {
    slug: "finanzas",
    label: "Finanzas",
    permiso: "finanzas",
    secciones: [
      seccion("caja", "Caja del día", true),
      seccion("cobros", "Cobros"),
      seccion("devoluciones", "Devoluciones", true),
      seccion("facturacion", "Facturación", true),
      seccion("gastos", "Gastos"),
      seccion("resumen", "Resumen", true),
    ],
  },
  {
    slug: "inventario",
    label: "Inventario",
    permiso: "inventario",
    secciones: [
      seccion("productos", "Productos", true),
      seccion("stock", "Stock"),
      seccion("movimientos", "Movimientos"),
    ],
    cortaDespues: true,
  },
  {
    slug: "servicios",
    label: "Servicios",
    permiso: "servicios",
    secciones: [
      seccion("precios", "Precios y tiempos", true),
      seccion("areas", "Áreas"),
      seccion("horarios", "Horarios", true),
    ],
  },
  {
    /**
     * Todo lo de los puestos, en un solo lugar (2026-09-12).
     *
     * Estaba partido en dos con nombres parecidos y funciones distintas:
     * «Estaciones», un cuadro dentro de la Agenda para sacar de servicio
     * un puesto roto, y «Puestos de trabajo», una sección de Servicios
     * para dar de alta y de baja. Parecían lo mismo repetido y no lo
     * eran, que es peor: obligaba a acordarse de cuál de las dos hacía
     * qué.
     *
     * EL PERMISO ES `servicios`, NO UNO PROPIO
     *
     * Los nueve nombres de `Modulo` son el contrato con la matriz de la
     * base y con `/me`: agregar uno décimo es una migración de datos, no
     * de navegación. Se usa el permiso que ya gobernaba estas dos
     * pantallas. Queda como deuda, igual que Agenda con `calendario`.
     *
     * Consecuencia a la vista: sacar un puesto de servicio pasa a exigir
     * permiso de Servicios. Quien atiende el mostrador podía hacerlo
     * desde la Agenda y ya no.
     */
    slug: "puestos",
    label: "Puestos de trabajo",
    permiso: "servicios",
    secciones: [
      seccion("listado", "Listado", true),
      seccion("bloqueos", "Fuera de servicio", true),
    ],
  },
  {
    slug: "personal",
    label: "Personal",
    permiso: "personal",
    secciones: [
      seccion("empleados", "Empleados"),
      seccion("horarios", "Horarios"),
      seccion("produccion", "Producción"),
    ],
  },
  {
    slug: "compras",
    label: "Compras",
    permiso: "compras",
    secciones: [seccion("proveedores", "Proveedores"), seccion("pedidos", "Pedidos")],
    cortaDespues: true,
  },
  {
    slug: "usuarios",
    label: "Usuarios y roles",
    permiso: "usuarios",
    secciones: [
      seccion("personas", "Personas", true),
      seccion("roles", "Roles", true),
      seccion("accesos", "Accesos"),
      seccion("cambios", "Registro de cambios", true),
    ],
  },
  {
    slug: "configuracion",
    label: "Configuración",
    permiso: "configuracion",
    secciones: [
      seccion("negocio", "Datos del negocio"),
      seccion("terminos", "Términos y privacidad"),
      seccion("integraciones", "Integraciones"),
    ],
  },
];

/**
 * Los cuatro destinos fijos de la barra de abajo, en el teléfono.
 *
 * Decidido el 2026-09-11: se nombran por módulo —la misma palabra abajo,
 * en la barra lateral, en las migas y en la dirección— y no por la
 * sección a la que llevan. Clientas queda a la vista aunque todavía no
 * tenga pantalla, para que la barra no cambie de forma el día que la
 * tenga.
 */
export const BARRA_TELEFONO = ["agenda", "clientas", "finanzas"] as const;

/** Dónde entra quien abre el panel sin pedir nada en particular. */
export const ENTRADA = "/panel/agenda/hoy";

/**
 * Direcciones que existieron y se mudaron.
 *
 * `/panel/servicios/puestos` vivió poco —un día— pero es una dirección
 * que ya circuló, y una dirección que alguna vez anduvo no se devuelve
 * como 404 si sabemos a dónde fue.
 */
export const MUDANZAS: Record<string, { modulo: string; seccion: string }> = {
  "servicios/puestos": { modulo: "puestos", seccion: "listado" },
};

export function buscarModulo(slug: string | undefined): ModuloDef | undefined {
  return ARBOL.find((m) => m.slug === slug);
}

export function buscarSeccion(modulo: ModuloDef, slug: string | undefined): Seccion | undefined {
  return modulo.secciones.find((s) => s.slug === slug);
}

/**
 * La primera sección con pantalla, que es a donde lleva tocar el nombre
 * del módulo. Si el módulo entero está por construirse, cae en la
 * primera: la pantalla de «todavía no» explica qué va a haber ahí.
 */
export function primeraSeccion(modulo: ModuloDef): Seccion {
  return modulo.secciones.find((s) => s.listo) ?? modulo.secciones[0];
}

export function rutaDe(modulo: ModuloDef, seccion: Seccion): string {
  return `/panel/${modulo.slug}/${seccion.slug}`;
}
