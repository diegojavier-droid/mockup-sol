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
  const isEmpty = !data.category && !data.service;

  if (variant === "bottom") {
    return (
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Tu reserva
          </p>
          <p className="mt-0.5 truncate font-serif text-base text-foreground">
            {data.service?.name ?? cat?.name ?? "Sin elegir"}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">
            {dur} ·{" "}
            {data.extras.length > 0
              ? `${data.extras.length} extra${data.extras.length > 1 ? "s" : ""}`
              : "sin extras"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Estimado</p>
          <p className="font-serif text-xl text-foreground">{price}</p>
        </div>
      </div>
    );
  }

  return (
    <aside className="sticky top-28 overflow-hidden rounded-3xl border border-border bg-card shadow-[0_1px_0_0_rgba(0,0,0,0.02),0_30px_50px_-35px_rgba(120,90,60,0.25)]">
      <div className="border-b border-border/70 bg-gradient-to-b from-cream/70 to-card px-6 pb-5 pt-6">
        <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Tu reserva</p>
        <h3 className="mt-1 font-serif text-2xl text-foreground">Sol Mai</h3>
        <div className="mt-3 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-foreground/60">
          <span className="h-1 w-1 rounded-full bg-champagne-deep" /> Santa Fe Capital
        </div>
      </div>

      <div className="space-y-4 px-6 py-5 text-sm">
        {isEmpty ? (
          <div className="rounded-2xl border border-dashed border-border bg-cream/40 p-5 text-center">
            <p className="font-serif text-base text-foreground">Empezá tu reserva</p>
            <p className="mt-1 text-xs text-muted-foreground">
              A medida que elijas, tu resumen se completa acá.
            </p>
          </div>
        ) : (
          <>
            <Row label="Categoría" value={cat?.name ?? "—"} />
            <Row label="Servicio" value={data.service?.name ?? "—"} />
            <Row
              label="Extras"
              value={data.extras.length ? data.extras.map((extra) => extra.name).join(", ") : "—"}
            />
            <div className="grid grid-cols-2 gap-3">
              <Row label="Fecha" value={data.date ?? "—"} />
              <Row label="Hora" value={data.time ?? "—"} />
            </div>
          </>
        )}
      </div>

      <div className="space-y-2 border-t border-border/70 bg-cream/30 px-6 py-5">
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Duración
          </span>
          <span className="font-serif text-base text-foreground">{dur}</span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Precio estimado
          </span>
          <span className="font-serif text-2xl text-foreground">{price}</span>
        </div>
        <p className="pt-2 text-[11px] leading-relaxed text-muted-foreground">
          Valores orientativos. El salón confirma el turno por WhatsApp.
        </p>
      </div>
    </aside>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-foreground/90">{value}</p>
    </div>
  );
}
