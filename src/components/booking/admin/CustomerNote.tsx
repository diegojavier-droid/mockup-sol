import type { AgendaEntry } from "@/lib/api/admin-hooks";
/** Plain text only. The authorized backend projects only permitted test notes. */
export function CustomerNote({entry}: {entry: Pick<AgendaEntry,"customerNote">}) {
  const note = entry.customerNote;
  if (typeof note !== "string" || !note.trim() || note.length > 500) return null;
  return <section aria-label="Comentario para Sol" className="mt-3 rounded-xl border border-border p-3 text-sm">
    <h3 className="font-medium">Comentario para Sol</h3>
    <p className="whitespace-pre-wrap break-words">{note}</p>
    <p className="mt-2 text-xs text-muted-foreground">Para conversar al llegar, antes del servicio.</p>
  </section>;
}
