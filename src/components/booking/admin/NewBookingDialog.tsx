/**
 * Tomar un turno desde el mostrador.
 *
 * Restricción de diseño: esto pasa con una persona esperando de pie. Si
 * toma más de treinta segundos, el salón vuelve al papel. Por eso todo
 * lo que no es imprescindible es opcional, y nada obliga a elegir
 * estación ni profesional.
 *
 * Y cuando el horario no entra, el sistema no dice "no": dice cuántos
 * lugares hay ocupados y ofrece tomarlo igual.
 */

import { useState } from "react";
import {
  useCreateInternalBooking,
  useCustomerSearch,
  type BookingSource,
} from "@/lib/api/admin-hooks";
import { useServiceDetail } from "@/lib/api/booking-hooks";
import type { LengthTier } from "@/lib/api/catalog-types";
import { useCatalog } from "@/lib/catalog-context";

const LENGTH_LABEL: Record<string, string> = {
  corto: "Corto",
  medio: "Media melena",
  largo: "Largo",
  xl: "Muy largo",
  unico: "Único",
};

const CHANNELS: { id: Exclude<BookingSource, "online">; label: string }[] = [
  { id: "walk_in", label: "Sin turno" },
  { id: "phone", label: "Teléfono" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "manual", label: "Mostrador" },
];

function salonNowValue(): string {
  const d = new Date(Date.now() - 180 * 60_000);
  return d.toISOString().slice(0, 16);
}

export function NewBookingDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (message: string) => void;
}) {
  const { categories, services: servicesByCategory } = useCatalog();
  const [source, setSource] = useState<Exclude<BookingSource, "online">>("walk_in");
  const [serviceSlug, setServiceSlug] = useState("");
  const [when, setWhen] = useState(salonNowValue());
  const [firstName, setFirstName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [search, setSearch] = useState("");
  const [lengthTier, setLengthTier] = useState<LengthTier | "">("");
  const [conflict, setConflict] = useState<string | null>(null);
  const [overrideReason, setOverrideReason] = useState("");

  const hits = useCustomerSearch(search);
  const create = useCreateInternalBooking();
  // Igual que en el flujo público: se pregunta sólo lo que ESE servicio
  // necesita. La mayoría de Peluquería cobra por largo y sin ese dato el
  // backend no puede cotizar.
  const detail = useServiceDetail(serviceSlug || null);
  const lengthOptions = (detail.data?.tiers ?? [])
    .map((t) => t.lengthTier)
    .filter((t): t is LengthTier => Boolean(t) && t !== "unico");
  const needsLength = lengthOptions.length > 1;

  const services = categories.flatMap((c) =>
    (servicesByCategory[c.id] ?? []).map((s) => ({ slug: s.id, name: s.name, area: c.name })),
  );

  const canSubmit =
    serviceSlug && firstName.trim() && phone.trim() && when && (!needsLength || lengthTier);

  function submit(withOverride: boolean) {
    setConflict(null);
    create.mutate(
      {
        serviceSlug,
        lengthTier: lengthTier || null,
        startsAt: `${when}:00-03:00`,
        customer: { firstName: firstName.trim(), phone: phone.trim() },
        note: note.trim() || undefined,
        source,
        override: withOverride,
        overrideReason: withOverride ? overrideReason.trim() : undefined,
      },
      {
        onSuccess: (r) =>
          onCreated(
            r.created_via_override
              ? "Turno tomado como excepción. Queda registrado quién lo creó y por qué."
              : "Turno tomado.",
          ),
        onError: (e) => setConflict((e as Error).message),
      },
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/30 p-0 sm:items-center sm:p-4">
      <div className="max-h-[92svh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-border bg-card p-5 shadow-xl sm:rounded-3xl sm:p-6">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-serif text-xl text-foreground">Nuevo turno</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Cerrar
          </button>
        </div>

        <Field label="¿Por dónde llegó?">
          <div className="flex flex-wrap gap-2">
            {CHANNELS.map((ch) => (
              <button
                key={ch.id}
                type="button"
                onClick={() => setSource(ch.id)}
                aria-pressed={source === ch.id}
                className={`rounded-full border px-3 py-1.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  source === ch.id
                    ? "border-champagne-deep bg-champagne/40 text-foreground"
                    : "border-border text-muted-foreground hover:border-champagne"
                }`}
              >
                {ch.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Clienta">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o teléfono"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {(hits.data ?? []).length > 0 && (
            <ul className="mt-2 max-h-36 overflow-y-auto rounded-xl border border-border">
              {(hits.data ?? []).slice(0, 6).map((h) => (
                <li key={h.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setFirstName(h.firstName);
                      setPhone(h.phone);
                      setSearch("");
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-cream/60"
                  >
                    {h.firstName} {h.lastName ?? ""} · {h.phone}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Nombre"
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Teléfono"
              inputMode="tel"
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </Field>

        <Field label="Servicio">
          <select
            value={serviceSlug}
            onChange={(e) => {
              setServiceSlug(e.target.value);
              setLengthTier("");
            }}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Elegir…</option>
            {services.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.name} · {s.area}
              </option>
            ))}
          </select>
        </Field>

        {needsLength && (
          <Field label="Largo del pelo">
            <div className="flex flex-wrap gap-2">
              {lengthOptions.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setLengthTier(t)}
                  aria-pressed={lengthTier === t}
                  className={`rounded-full border px-3 py-1.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    lengthTier === t
                      ? "border-champagne-deep bg-champagne/40 text-foreground"
                      : "border-border text-muted-foreground hover:border-champagne"
                  }`}
                >
                  {LENGTH_LABEL[t] ?? t}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Este servicio cobra distinto según el largo.
            </p>
          </Field>
        )}

        <Field label="Cuándo">
          <input
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </Field>

        <Field label="Nota (opcional)">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Algo que convenga recordar"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </Field>

        {/* El conflicto no cierra el camino: explica y ofrece seguir. */}
        {conflict && (
          <div className="mt-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3">
            <p className="text-sm text-foreground/90">{conflict}</p>
            {/* El motivo no es opcional: dentro de un mes, "por qué hay
                seis turnos donde entran cinco" tiene que poder
                responderse sin adivinar. */}
            <input
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="¿Por qué lo tomás igualmente?"
              aria-label="Motivo de la excepción"
              className="mt-2.5 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <div className="mt-2.5 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={create.isPending || overrideReason.trim().length === 0}
                title={
                  overrideReason.trim().length === 0 ? "Contá por qué antes de tomarlo" : undefined
                }
                onClick={() => submit(true)}
                className="rounded-full border border-amber-600/50 px-4 py-1.5 text-xs text-amber-800 transition-colors hover:bg-amber-500/15 disabled:opacity-50 dark:text-amber-300"
              >
                Tomarlo igualmente
              </button>
              <button
                type="button"
                onClick={() => setConflict(null)}
                className="rounded-full border border-border px-4 py-1.5 text-xs text-muted-foreground hover:border-champagne"
              >
                Elegir otro horario
              </button>
            </div>
          </div>
        )}

        {!conflict && create.isError && (
          <p className="mt-4 text-sm text-destructive">{(create.error as Error).message}</p>
        )}

        <button
          type="button"
          disabled={!canSubmit || create.isPending}
          onClick={() => submit(false)}
          className="mt-5 w-full rounded-full bg-primary py-3 font-serif text-base text-primary-foreground transition-all hover:translate-y-[-1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        >
          {create.isPending ? "Tomando el turno…" : "Tomar turno"}
        </button>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Queda confirmado. Los turnos que toma el salón no piden seña.
        </p>
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
