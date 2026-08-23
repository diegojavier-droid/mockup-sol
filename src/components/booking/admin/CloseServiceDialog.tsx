/**
 * Cerrar la atención.
 *
 * Se completa con la clienta todavía en el salón, así que sólo tres
 * cosas son obligatorias: qué se hizo, cuánto se acordó y cuánto entró.
 * Todo lo demás —profesional, duración real, fórmula, costo, notas— es
 * opcional y no traba el cierre.
 *
 * El costo vacío es un valor válido y significa "no sabemos". Nunca se
 * estima: sin costo, el margen es NO DISPONIBLE.
 */

import { useState } from "react";
import { useCloseService, type AgendaEntry, type PaymentMethod } from "@/lib/api/admin-hooks";

const METHODS: { id: PaymentMethod; label: string }[] = [
  { id: "efectivo", label: "Efectivo" },
  { id: "transferencia", label: "Transferencia" },
  { id: "mercado_pago", label: "Mercado Pago" },
  { id: "otro", label: "Otro" },
];

function money(n: number): string {
  return `$${n.toLocaleString("es-AR")}`;
}

export function CloseServiceDialog({
  entry,
  onClose,
  onClosed,
}: {
  entry: AgendaEntry;
  onClose: () => void;
  onClosed: (message: string) => void;
}) {
  const [finalPrice, setFinalPrice] = useState(String(entry.priceEstimatedMin));
  const [servicesDone, setServicesDone] = useState(entry.services.join(" + "));
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("efectivo");
  const [durationMin, setDurationMin] = useState("");
  const [cost, setCost] = useState("");
  const [observation, setObservation] = useState("");
  const close = useCloseService();

  const priceNum = Number(finalPrice) || 0;
  const amountNum = Number(amount) || 0;
  // La seña ya acreditada cuenta como cobrada: no se le pide dos veces.
  const alreadyPaid = entry.depositStatus === "paid" ? entry.depositAmount : 0;
  const outstanding = Math.max(priceNum - alreadyPaid - amountNum, 0);
  const differs = priceNum !== entry.priceEstimatedMin;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/30 sm:items-center sm:p-4">
      <div className="max-h-[92svh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-border bg-card p-5 shadow-xl sm:rounded-3xl sm:p-6">
        <div className="mb-1 flex items-baseline justify-between">
          <h2 className="font-serif text-xl text-foreground">Cerrar atención</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Cerrar
          </button>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          {entry.customer.firstName} {entry.customer.lastName ?? ""}
        </p>

        <Field label="Qué se hizo">
          <input
            value={servicesDone}
            onChange={(e) => setServicesDone(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </Field>

        <Field label="Precio final">
          <input
            value={finalPrice}
            onChange={(e) => setFinalPrice(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {differs && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              Estimado {money(entry.priceEstimatedMin)} ·{" "}
              {priceNum > entry.priceEstimatedMin ? "+" : "−"}
              {money(Math.abs(priceNum - entry.priceEstimatedMin))}
            </p>
          )}
        </Field>

        <Field label="Cobro">
          {alreadyPaid > 0 && (
            <p className="mb-1.5 text-xs text-muted-foreground">
              Ya abonó {money(alreadyPaid)} de seña.
            </p>
          )}
          <div className="flex gap-2">
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              placeholder="Monto"
              className="w-32 rounded-xl border border-border bg-background px-3 py-2 text-sm tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as PaymentMethod)}
              className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {METHODS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {outstanding > 0 ? `Queda un saldo de ${money(outstanding)}.` : "Sin saldo pendiente."}
          </p>
        </Field>

        <details className="mt-4 rounded-2xl border border-border px-4 py-3">
          <summary className="cursor-pointer text-sm text-foreground/85">
            Agregar detalle (opcional)
          </summary>
          <Field label="Duración real (min)">
            <input
              value={durationMin}
              onChange={(e) => setDurationMin(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              placeholder={String(entry.shownDurationMin)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </Field>
          <Field label="Costo de insumos">
            <input
              value={cost}
              onChange={(e) => setCost(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              placeholder="Dejalo vacío si no lo sabés"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Vacío está bien. Sin costo no se calcula margen, y no se inventa ninguno.
            </p>
          </Field>
          <Field label="Nota">
            <input
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </Field>
        </details>

        {close.isError && (
          <p className="mt-4 text-sm text-destructive">{(close.error as Error).message}</p>
        )}

        <button
          type="button"
          disabled={!priceNum || close.isPending}
          onClick={() =>
            close.mutate(
              {
                bookingId: entry.id,
                finalPrice: priceNum,
                servicesDone: servicesDone.trim() || undefined,
                durationMin: durationMin ? Number(durationMin) : null,
                costAmount: cost ? Number(cost) : null,
                observation: observation.trim() || undefined,
                payments: amountNum > 0 ? [{ amount: amountNum, method, kind: "balance" }] : [],
              },
              { onSuccess: (r) => onClosed(r.message) },
            )
          }
          className="mt-5 w-full rounded-full bg-primary py-3 font-serif text-base text-primary-foreground transition-all hover:translate-y-[-1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        >
          {close.isPending ? "Cerrando…" : "Cerrar atención"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}
