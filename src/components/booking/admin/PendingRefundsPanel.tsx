/**
 * Señas que hay que devolver.
 *
 * Cuando una clienta cancela dentro de la ventana, el sistema le dice
 * «te devolvemos la seña». Marcarlo no mueve la plata: hasta que exista
 * la devolución automática contra Mercado Pago, alguien la tiene que
 * hacer. Antes esa promesa no se veía en ningún lado y podía quedar
 * colgada para siempre.
 *
 * Si no hay nada pendiente, este panel NO aparece. La idea es sacarle
 * trabajo a Sol, no darle una sección más para revisar todos los días.
 */

import { usePendingRefunds, useMarkRefundDone } from "@/lib/api/admin-hooks";

function pesos(amount: number): string {
  return `$${amount.toLocaleString("es-AR")}`;
}

function cuando(iso: string | null): string {
  if (!iso) return "";
  // Fecha del salón (UTC-3), no la del dispositivo de quien mira.
  const d = new Date(new Date(iso).getTime() - 180 * 60_000);
  return `${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
}

export function PendingRefundsPanel({ onFeedback }: { onFeedback: (msg: string) => void }) {
  const pending = usePendingRefunds();
  const markDone = useMarkRefundDone();

  const items = pending.data?.items ?? [];
  if (items.length === 0) return null;

  return (
    <section className="mb-5 rounded-2xl border border-amber-600/35 bg-amber-500/10 px-4 py-3.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-serif text-base text-foreground">
          {items.length === 1
            ? "Hay una seña para devolver"
            : `Hay ${items.length} señas para devolver`}
        </h2>
        <span className="text-sm tabular-nums text-foreground/80">
          {pesos(pending.data?.totalAmount ?? 0)}
        </span>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-foreground/70">
        Cancelaron con la anticipación suficiente, así que les prometimos la seña de vuelta.
        Devolvelas por Mercado Pago y marcalas acá.
      </p>

      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li
            key={item.booking_id}
            className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-xl border border-current/15 bg-card/70 px-3 py-2"
          >
            <div className="min-w-0">
              <p className="truncate text-sm text-foreground">{item.customer}</p>
              <p className="text-xs text-muted-foreground">
                {pesos(item.amount)} · turno del {cuando(item.starts_at)}
                {item.phone ? ` · ${item.phone}` : ""}
              </p>
            </div>
            <button
              type="button"
              disabled={markDone.isPending}
              onClick={() =>
                markDone.mutate(item.booking_id, {
                  onSuccess: (r) => onFeedback(r.message),
                })
              }
              className="shrink-0 rounded-full border border-current/30 px-3 py-1 text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
            >
              Ya la devolví
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
