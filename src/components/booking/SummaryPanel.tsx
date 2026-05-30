import type { CategoryId, Service, Extra } from "@/lib/booking-data";
import { categories } from "@/lib/booking-data";

export interface SummaryData {
  category: CategoryId | null;
  service: Service | null;
  extras: Extra[];
  date: string | null;
  time: string | null;
}

function totalDurationMin(s: Service | null) {
  if (!s) return 0;
  const m = s.duration.match(/(\d+)\s*h(?:\s*(\d+))?|(\d+)\s*min/g);
  let total = 0;
  s.duration.split("+").forEach(() => {});
  const hMatch = s.duration.match(/(\d+)\s*h/);
  const mMatch = s.duration.match(/(\d+)\s*min/);
  const h30 = /h\s*30/.test(s.duration);
  if (hMatch) total += parseInt(hMatch[1]) * 60;
  if (h30) total += 30;
  if (mMatch) total += parseInt(mMatch[1]);
  void m;
  return total;
}

function fmtDuration(min: number) {
  if (min === 0) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h && m) return `${h} h ${m} min`;
  if (h) return `${h} h`;
  return `${m} min`;
}

function parsePrice(p: string) {
  return parseInt(p.replace(/[^\d]/g, ""), 10) || 0;
}

function fmtPrice(n: number) {
  return "$" + n.toLocaleString("es-AR");
}

export function computeTotals(data: SummaryData) {
  const dur = totalDurationMin(data.service) + data.extras.length * 15;
  const price = parsePrice(data.service?.price ?? "") + data.extras.reduce((a, e) => a + parsePrice(e.price), 0);
  return { dur: fmtDuration(dur), price: price ? fmtPrice(price) : "—" };
}

export function SummaryPanel({ data, variant = "side" }: { data: SummaryData; variant?: "side" | "bottom" }) {
  const cat = categories.find((c) => c.id === data.category);
  const { dur, price } = computeTotals(data);

  if (variant === "bottom") {
    return (
      <div className="flex items-center justify-between gap-3 text-sm">
        <div className="min-w-0 flex-1">
          <p className="truncate font-serif text-base text-foreground">
            {data.service?.name ?? cat?.name ?? "Tu reserva"}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {dur} · {data.extras.length > 0 ? `${data.extras.length} extra${data.extras.length > 1 ? "s" : ""}` : "sin extras"}
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
    <aside className="sticky top-6 rounded-2xl border border-border bg-card p-6 shadow-[0_1px_0_0_rgba(0,0,0,0.02),0_20px_40px_-30px_rgba(120,90,60,0.18)]">
      <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Tu reserva</p>
      <h3 className="mt-1 font-serif text-2xl text-foreground">Sol Mai</h3>
      <div className="mt-5 space-y-4 text-sm">
        <Row label="Categoría" value={cat?.name ?? "—"} />
        <Row label="Servicio" value={data.service?.name ?? "—"} />
        <Row
          label="Extras"
          value={data.extras.length ? data.extras.map((e) => e.name).join(", ") : "—"}
        />
        <Row label="Fecha" value={data.date ?? "—"} />
        <Row label="Hora" value={data.time ?? "—"} />
      </div>
      <div className="mt-6 border-t border-border pt-5 space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Duración</span>
          <span className="font-serif text-base">{dur}</span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Precio estimado</span>
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
