import type { CategoryId, Extra, Personalization, Service } from "@/lib/booking-data";

import { computeTotals } from "@/lib/booking-totals";
import { useCatalog } from "@/lib/catalog-context";

export interface SummaryData {
  category: CategoryId | null;
  service: Service | null;
  extras: Extra[];
  personalization: Personalization;
  additionalComments: string;
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
  const { categories } = useCatalog();
  const cat = categories.find((category) => category.id === data.category);
  const { dur, price, depositPrice, remainingPrice } = computeTotals(data);
  const isEmpty = !data.category && !data.service;

  if (variant === "bottom") {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-cream/35 px-3 py-2">
        <div className="min-w-0 flex-1">
          <p className="truncate font-serif text-[15px] leading-tight text-foreground">
            {data.service?.name ?? cat?.name ?? "Sin elegir"}
          </p>
          <p className="mt-0.5 truncate text-[10px] leading-tight text-muted-foreground">
            {dur}
            {data.extras.length > 0
              ? ` · ${data.extras.length} extra${data.extras.length > 1 ? "s" : ""}`
              : ""}
          </p>
        </div>
        <p className="shrink-0 font-serif text-lg leading-tight text-foreground">{price}</p>
      </div>
    );
  }

  return (
    <aside className="sticky top-28 overflow-hidden rounded-3xl border border-border bg-card shadow-[0_1px_0_0_rgba(0,0,0,0.02),0_30px_50px_-35px_rgba(120,90,60,0.25)]">
      <div className="border-b border-border/70 bg-gradient-to-b from-cream/70 to-card px-6 pb-5 pt-6">
        <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Tu reserva</p>
        <div className="mt-2 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-foreground/60">
          <span className="h-1 w-1 rounded-full bg-champagne-deep" /> Santa Fe Capital
        </div>
      </div>

      <div className="space-y-4 px-6 py-5 text-sm">
        {isEmpty ? (
          <div className="rounded-2xl border border-dashed border-border bg-cream/40 p-5 text-center">
            <p className="text-xs text-muted-foreground">Tu resumen se arma a medida que elegís.</p>
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
            Total estimado
          </span>
          <span className="font-serif text-2xl text-foreground">{price}</span>
        </div>
        <div className="space-y-1 border-t border-border/70 pt-3">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Seña 20%
            </span>
            <span className="font-serif text-base text-foreground">{depositPrice}</span>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Saldo salón
            </span>
            <span className="font-serif text-base text-foreground">{remainingPrice}</span>
          </div>
        </div>
        <p className="pt-2 text-[11px] leading-relaxed text-muted-foreground">
          Valores orientativos. Tu turno queda reservado cuando se acredita la seña.
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
