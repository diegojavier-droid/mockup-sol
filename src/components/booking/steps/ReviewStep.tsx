import { categories } from "@/lib/booking-data";
import type { Personalization } from "@/lib/booking-data";
import { computeTotals } from "@/lib/booking-totals";
import type { SummaryData } from "../SummaryPanel";
import { StepShell } from "../wizard/StepShell";
import type { CustomerFormState } from "./CustomerDataStep";

export function ReviewStep({
  customer,
  data,
  personal: _personal,
  error,
  onConfirm,
}: {
  customer: CustomerFormState;
  data: SummaryData;
  personal: Personalization;
  error: string | null;
  onConfirm: () => void;
}) {
  const category = categories.find((currentCategory) => currentCategory.id === data.category);
  const { price, depositPrice, remainingPrice } = computeTotals(data);

  return (
    <StepShell title="Revisá tu solicitud">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="space-y-4">
          <section>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Servicio</p>
            <p className="mt-1 font-serif text-xl leading-tight text-foreground">
              {data.service?.name ?? category?.name ?? "Tu servicio"}
            </p>
            {data.extras.length > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                Extras: {data.extras.map((extra) => extra.name).join(", ")}
              </p>
            )}
          </section>

          <div className="grid grid-cols-2 gap-3">
            <ReviewField label="Fecha" value={data.date ?? "—"} />
            <ReviewField label="Hora" value={data.time ?? "—"} />
          </div>

          <section className="rounded-2xl bg-cream/50 px-4 py-3">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Datos de clienta
            </p>
            <div className="mt-2 grid gap-2 text-sm text-foreground/90">
              <p>{customer.firstName || "—"}</p>
              <p>{customer.whatsapp || "—"}</p>
              <p>{customer.email || "—"}</p>
            </div>
          </section>

          <section className="rounded-2xl border border-champagne-deep/30 bg-gradient-to-b from-champagne/45 to-cream/50 p-4">
            <ReviewAmount label="Total estimado" value={price} />
            <div className="mt-3 border-t border-champagne-deep/20 pt-3">
              <ReviewAmount label="Seña 20%" value={depositPrice} emphasize />
            </div>
            <div className="mt-3 border-t border-champagne-deep/20 pt-3">
              <ReviewAmount label="Saldo en salón" value={remainingPrice} />
            </div>
          </section>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={onConfirm}
        className="mt-5 w-full rounded-full bg-primary py-4 font-serif text-lg text-primary-foreground shadow-[0_20px_40px_-18px_rgba(80,55,30,0.55)] transition-all hover:translate-y-[-1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        Confirmar solicitud
      </button>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        Después vas a poder abonar la seña.
      </p>
    </StepShell>
  );
}

function ReviewField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-cream/40 px-4 py-3">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-serif text-lg leading-tight text-foreground">{value}</p>
    </div>
  );
}

function ReviewAmount({
  label,
  value,
  emphasize = false,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={emphasize ? "font-serif text-2xl text-foreground" : "font-serif text-lg text-foreground"}>
        {value}
      </span>
    </div>
  );
}
