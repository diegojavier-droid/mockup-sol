import { useState } from "react";
import { useCashRegister, useStaffIdentity, type CashMovement } from "@/lib/api/admin-hooks";

const MEDIO_LABEL: Record<string, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  mercado_pago: "Mercado Pago",
  otro: "Otro",
};

const CONCEPTO_LABEL: Record<string, string> = {
  sena: "seña",
  balance: "saldo",
  deposit: "seña",
};

const pesos = (n: number) => `$${n.toLocaleString("es-AR")}`;

/**
 * La caja del día.
 *
 * Contesta una sola pregunta, la que Sol se hace al cerrar: cuánto entró
 * hoy y por dónde. No lleva filtros ni rangos: para mirar un período ya
 * está el resumen de operaciones.
 *
 * El total se puede abrir hasta los movimientos que lo formaron. Un
 * número que no lleva a los hechos no se puede verificar, y uno que no se
 * puede verificar no sirve para decidir nada.
 *
 * Sólo lo ve Sol. El componente mira el rol y ni siquiera pide el dato si
 * quien entró es la secretaria: la ruta se lo negaría igual, pero pedir
 * algo para comerse un 403 ensucia el panel y la consola.
 */
export function CashRegisterPanel() {
  const [abierto, setAbierto] = useState(false);
  const identity = useStaffIdentity();
  const isOwner = identity.data?.role === "owner";
  const caja = useCashRegister(isOwner);

  if (!isOwner || caja.isLoading || !caja.data) return null;

  const { entro, devuelto, queda, por_medio: porMedio, movimientos } = caja.data;

  // Un día sin movimientos no necesita una tarjeta que diga cero: la
  // agenda ya muestra que no pasó nada.
  if (entro === 0 && devuelto === 0) return null;

  return (
    <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="font-serif text-lg text-foreground">La caja de hoy</h2>
        <span className="font-serif text-2xl tabular-nums text-foreground">{pesos(queda)}</span>
      </div>

      {devuelto > 0 && (
        <p className="mt-1 text-xs text-muted-foreground">
          Entraron {pesos(entro)} y devolviste {pesos(devuelto)}.
        </p>
      )}

      <ul className="mt-4 space-y-1.5">
        {porMedio.map((m) => (
          <li key={m.medio} className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-muted-foreground">{MEDIO_LABEL[m.medio] ?? m.medio}</span>
            <span className="tabular-nums text-foreground">{pesos(m.monto)}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="mt-4 text-xs font-medium text-champagne-deep underline underline-offset-2"
      >
        {abierto ? "Ocultar el detalle" : `Ver los ${movimientos.length} movimientos`}
      </button>

      {abierto && (
        <ul className="mt-3 space-y-1.5 border-t border-border pt-3">
          {movimientos.map((m, i) => (
            <Movimiento key={`${m.hora}-${m.clienta}-${i}`} m={m} />
          ))}
        </ul>
      )}
    </section>
  );
}

function Movimiento({ m }: { m: CashMovement }) {
  return (
    <li className="flex items-baseline justify-between gap-3 text-xs">
      <span className="text-muted-foreground">
        <span className="tabular-nums">{m.hora}</span> · {m.clienta} ·{" "}
        {CONCEPTO_LABEL[m.concepto] ?? m.concepto} en {MEDIO_LABEL[m.medio] ?? m.medio}
      </span>
      <span className={`tabular-nums ${m.salida ? "text-destructive" : "text-foreground"}`}>
        {m.salida ? "−" : ""}
        {pesos(m.monto)}
      </span>
    </li>
  );
}
