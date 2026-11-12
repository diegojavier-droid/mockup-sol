import { useState } from "react";

/** Keep the recovery link accessible after handing off to the status page. */
export function BookingLink({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="mt-6 rounded-2xl border border-border bg-cream/40 px-4 py-3">
      <p className="text-xs leading-relaxed text-foreground/80">
        Guardá este link para ver o cancelar tu turno:
      </p>
      <button
        type="button"
        onClick={async () => {
          const url = `${window.location.origin}/reserva/${encodeURIComponent(token)}`;
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
          } catch {
            window.open(url, "_blank", "noopener");
          }
        }}
        className="mt-2 w-full rounded-full border border-champagne-deep/30 bg-card px-4 py-2 text-center text-xs text-foreground"
      >
        {copied ? "Link copiado" : "Copiar el link de mi turno"}
      </button>
    </div>
  );
}
