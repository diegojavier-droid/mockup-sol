import { categories, personalizationFields, type Personalization } from "@/lib/booking-data";
import { computeTotals } from "@/lib/booking-totals";
import type { CustomerFormState } from "../steps/CustomerDataStep";
import type { SummaryData } from "../SummaryPanel";

export function BookingSummaryDetails({
  customer,
  data,
  personal,
}: {
  customer?: CustomerFormState;
  data: SummaryData;
  personal: Personalization;
}) {
  const category = categories.find((currentCategory) => currentCategory.id === data.category);
  const { dur, price } = computeTotals(data);
  const fields = data.category ? personalizationFields[data.category] : [];

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Categoría" value={category?.name ?? "—"} />
        <Field label="Servicio" value={data.service?.name ?? "—"} />
        <Field label="Fecha" value={data.date ?? "—"} />
        <Field label="Hora" value={data.time ?? "—"} />
        <Field label="Duración estimada" value={dur} />
        <Field label="Precio estimado" value={price} />
      </div>

      {customer && (
        <div className="mt-5 border-t border-border pt-5">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Tus datos</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Nombre" value={customer.firstName || "—"} />
            <Field label="WhatsApp" value={customer.whatsapp || "—"} />
            <Field label="Email" value={customer.email || "—"} />
            <Field label="Mensaje" value={customer.notes || "—"} />
          </div>
        </div>
      )}

      {data.extras.length > 0 && (
        <div className="mt-5 border-t border-border pt-5">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Extras</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {data.extras.map((extra) => (
              <span key={extra.id} className="rounded-full bg-cream px-3 py-1 text-xs">
                {extra.name} · {extra.price}
              </span>
            ))}
          </div>
        </div>
      )}

      {fields.length > 0 && (
        <div className="mt-5 border-t border-border pt-5">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Tus preferencias
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {fields.map((field) => (
              <div key={field.id}>
                <p className="text-[11px] text-muted-foreground">{field.label}</p>
                <p className="text-sm text-foreground/90">{personal[field.id] ?? "—"}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-serif text-lg text-foreground">{value}</p>
    </div>
  );
}
