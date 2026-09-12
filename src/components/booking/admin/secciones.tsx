/**
 * Qué se ve en cada dirección.
 *
 * Es la única tabla que traduce `/panel/<modulo>/<seccion>` a una
 * pantalla. El árbol —qué módulos y qué secciones existen— vive en
 * `@/lib/panel-nav`; acá sólo se dice cuál de ellas ya tiene algo que
 * mostrar.
 *
 * NINGUNA PANTALLA DE ADENTRO SE REHIZO EN ESTE BLOQUE
 *
 * Los componentes son los mismos de antes, con el mismo aspecto. Lo
 * único que cambió es dónde se montan: la caja del día y las
 * devoluciones estaban dentro de la agenda y pasaron a Finanzas, y los
 * productos estaban dentro de Servicios y pasaron a Inventario, que es
 * donde §5.0 del árbol los pone. Rehacer su interior es el bloque
 * siguiente.
 */

import { useState } from "react";
import { useCashRegister, usePendingRefunds, useStaffIdentity } from "@/lib/api/admin-hooks";
import { puede } from "@/lib/staff-session";
import { AgendaScreen } from "./AgendaScreen";
import { MesScreen } from "./MesScreen";
import { AnioScreen } from "./AnioScreen";
import { CashRegisterPanel } from "./CashRegisterPanel";
import { PendingRefundsPanel } from "./PendingRefundsPanel";
import { InvoicingScreen } from "./InvoicingScreen";
import { DashboardScreen } from "./DashboardScreen";
import { PreciosYTiemposScreen, PuestosScreen, ProductosScreen } from "./SalonScreen";
import { PuestosFueraScreen } from "./PuestosFueraScreen";
import { ClosedDaysBlocksPanel } from "./ClosedDaysBlocksPanel";
import { OperationalBufferPanel } from "./OperationalBufferPanel";
import { PeopleScreen } from "./PeopleScreen";
import { RolesScreen } from "./RolesScreen";
import { AuditScreen } from "./AuditScreen";

/**
 * La agenda, con el rango leído de la dirección.
 *
 * Hoy, Mañana y Semana eran tres valores de un `useState`: el botón
 * «atrás» no volvía al rango anterior y no se podía mandar un link
 * diciendo «mirá el viernes». Ahora son tres lugares, y quien los elige
 * es la fila de secciones del armazón: la agenda ya no dibuja su propia
 * fila de Hoy · Mañana · Semana, que quedaba duplicada justo debajo.
 */

/**
 * Una sección vacía tiene que decir que está vacía.
 *
 * La caja y las devoluciones se dibujan solas cuando no hay nada:
 * embebidas en la agenda eso estaba bien —no le agregaban una tarjeta en
 * cero a una pantalla que ya decía que no pasó nada—, pero ahora cada
 * una es un lugar al que se llega a propósito, y llegar a una pantalla en
 * blanco parece que se rompió algo.
 */
function Vacio({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border px-5 py-10 text-center">
      <p className="font-serif text-lg text-foreground">{titulo}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">{texto}</p>
    </div>
  );
}

/** Finanzas › Caja del día. */
function Caja() {
  const identidad = useStaffIdentity();
  const caja = useCashRegister(puede(identidad.data, "finanzas"));

  if (caja.isLoading) return <p className="text-sm text-muted-foreground">Un segundo…</p>;
  if (caja.data && (caja.data.entro !== 0 || caja.data.devuelto !== 0))
    return <CashRegisterPanel />;

  return (
    <Vacio
      titulo="Todavía no entró plata hoy"
      texto="Cuando se cobre una seña o un saldo, el movimiento aparece acá."
    />
  );
}

/** Finanzas › Devoluciones. */
function Devoluciones() {
  const [feedback, setFeedback] = useState<string | null>(null);
  const pendientes = usePendingRefunds();
  const hay = (pendientes.data?.items.length ?? 0) > 0;

  if (pendientes.isLoading) return <p className="text-sm text-muted-foreground">Un segundo…</p>;

  return (
    <div className="space-y-5">
      {feedback && (
        <p className="rounded-2xl border border-champagne-deep/30 bg-cream/60 px-4 py-3 text-sm text-foreground/85">
          {feedback}
        </p>
      )}
      {hay ? (
        <PendingRefundsPanel onFeedback={setFeedback} />
      ) : (
        <Vacio
          titulo="No hay señas para devolver"
          texto="Cuando una clienta cancele dentro de la ventana, la seña queda acá hasta que la devuelvas."
        />
      )}
    </div>
  );
}

/**
 * Servicios › Horarios.
 *
 * Acá aterriza lo que era `/operaciones`: una página suelta cuyo único
 * botón de volver decía «← Volver al sitio público» y te echaba del
 * panel. Sus dos paneles nunca fueron una página, eran dos secciones de
 * Servicios que quedaron sueltas.
 */
function Horarios() {
  return (
    <div className="space-y-6">
      <OperationalBufferPanel />
      <ClosedDaysBlocksPanel />
    </div>
  );
}

/** Usuarios y roles › Roles. Las dos mitades son la misma pregunta. */
function Roles() {
  return <RolesScreen />;
}

/**
 * Agenda › Mes, y el día que se haya abierto desde ahí.
 *
 * Cuando la dirección trae `?dia=`, la pantalla es la agenda de ese día
 * —operable, la misma de siempre— con una forma de volver al mes. Sin
 * `?dia=`, es la grilla del mes.
 */
function Mes({
  mes,
  dia,
  irAlMes,
  irAlDia,
}: {
  mes: string;
  dia?: string;
  irAlMes: (mes: string) => void;
  irAlDia: (dia: string | undefined) => void;
}) {
  if (dia) {
    const [a, m, d] = dia.split("-");
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => irAlDia(undefined)}
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          ← Volver a {m}/{a}
        </button>
        <p className="font-serif text-xl text-foreground">
          {d}/{m}/{a}
        </p>
        <AgendaScreen range="hoy" fecha={dia} />
      </div>
    );
  }
  return <MesScreen mes={mes} onDia={(f) => irAlDia(f)} onMes={irAlMes} />;
}

export function contenidoDe(
  modulo: string,
  seccion: string,
  nav?: {
    mes: string;
    dia?: string;
    anio: number;
    irAlMes: (mes: string) => void;
    irAlDia: (dia: string | undefined) => void;
    irAlAnio: (anio: number) => void;
    verElMes: (mes: string) => void;
  },
): React.ReactNode | null {
  switch (`${modulo}/${seccion}`) {
    case "agenda/hoy":
      return <AgendaScreen range="hoy" />;
    case "agenda/manana":
      return <AgendaScreen range="manana" />;
    case "agenda/semana":
      return <AgendaScreen range="semana" />;
    case "agenda/mes":
      return nav ? (
        <Mes mes={nav.mes} dia={nav.dia} irAlMes={nav.irAlMes} irAlDia={nav.irAlDia} />
      ) : null;
    case "agenda/anio":
      return nav ? <AnioScreen anio={nav.anio} onAnio={nav.irAlAnio} onMes={nav.verElMes} /> : null;

    case "finanzas/caja":
      return <Caja />;
    case "finanzas/devoluciones":
      return <Devoluciones />;
    case "finanzas/facturacion":
      return <InvoicingScreen />;
    case "finanzas/resumen":
      return <DashboardScreen />;

    case "inventario/productos":
      return <ProductosScreen />;

    case "servicios/precios":
      return <PreciosYTiemposScreen />;
    case "servicios/horarios":
      return <Horarios />;

    // Los puestos, que estaban partidos en dos módulos con nombres
    // parecidos: el alta y baja en Servicios, y los bloqueos en un
    // cuadro de la Agenda llamado «Estaciones».
    case "puestos/listado":
      return <PuestosScreen />;
    case "puestos/bloqueos":
      return <PuestosFueraScreen />;

    case "usuarios/personas":
      return <PeopleScreen />;
    case "usuarios/roles":
      return <Roles />;
    case "usuarios/cambios":
      return <AuditScreen />;

    default:
      return null;
  }
}
