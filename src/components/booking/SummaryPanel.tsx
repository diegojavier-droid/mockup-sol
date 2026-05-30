import type { CategoryId, Extra, Service } from "@/lib/booking-data";
import { categories } from "@/lib/booking-data";
import { computeTotals } from "@/lib/booking-totals";

export interface SummaryData {
  category: CategoryId | null;
  service: Service | null;
  extras: Extra[];
  date: string | null;
  time: string | null;
}

export function SummaryPanel({
  data,
  variant = "side",
}: {
  data: SummaryData;
  variant?: "side" | "bottom";
}) {
  const cat = categories.find((category) => category.id === data.category);
  const { dur, price } = computeTotals(data);

  if (variant === "bottom") {
    return (
      <div className="flex items-center justify-between gap-3 text-sm">
        <div className="min-w-0 flex-1">
          <p className="truncate font-serif text-base text-foreground">
            {data.service?.name ?? cat?.name ?? "Tu reserva"}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {dur} ·{" "}
            {data.extras.length > 0
              ? `${data.extras.length} extra${data.extras.length > 1 ? "s" : ""}`
              : "sin extras"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Estimado</p>
          <p className="font-serif text-lg text-foreground">{price}</p>
        </div>
      </div>
    );
  }

  return (
    <aside className="sticky top-24 rounded-2xl border border-border bg-card p-6 shadow-[0_1px_0_0_rgba(0,0,0,0.02),0_20px_40px_-30px_rgba(120,90,60,0.18)]">
      <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Tu reserva</p>
      <h3 className="mt-1 font-serif text-2xl text-foreground">Sol Mai</h3>
      <div className="mt-5 space-y-4 text-sm">
        <Row label="Categoría" value={cat?.name ?? "—"} />
        <Row label="Servicio" value={data.service?.name ?? "—"} />
        <Row
          label="Extras"
          value={data.extras.length ? data.extras.map((extra) => extra.name).join(", ") : "—"}
        />
        <Row label="Fecha" value={data.date ?? "—"} />
        <Row label="Hora" value={data.time ?? "—"} />
      </div>
      <div className="mt-6 space-y-2 border-t border-border pt-5">
        <div className="flex items-baseline justify-between">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Duración</span>
          <span className="font-serif text-base">{dur}</span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            Precio estimado
          </span>
          <span className="font-serif text-xl text-foreground">{price}</span>
        </div>
      </div>
      <p className="mt-5 text-[11px] leading-relaxed text-muted-foreground">
        Los valores son orientativos. El salón confirmará el turno por WhatsApp.
      </p>
    </aside>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-foreground/90">{value}</p>
    </div>
  );
}
