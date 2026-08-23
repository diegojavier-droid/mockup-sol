/**
 * Panel interno del salón.
 *
 * La autorización la decide el backend: guardar un token acá no da
 * acceso a nada. Esta pantalla sólo evita mostrar una agenda vacía a
 * quien todavía no inició sesión.
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AgendaScreen } from "@/components/booking/admin/AgendaScreen";
import { useStaffIdentity } from "@/lib/api/admin-hooks";
import { clearStaffToken, readStaffToken, writeStaffToken } from "@/lib/staff-session";

export const Route = createFileRoute("/agenda")({
  head: () => ({ meta: [{ title: "Sol Mai · Agenda" }] }),
  component: AgendaRoute,
});

function AgendaRoute() {
  const [hasToken, setHasToken] = useState(() => Boolean(readStaffToken()));
  const identity = useStaffIdentity();

  if (!hasToken || identity.isError) {
    return <SignIn onToken={() => setHasToken(true)} error={identity.error as Error | null} />;
  }

  return (
    <main className="min-h-svh bg-background px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/operaciones"
            className="inline-flex rounded-full border border-border bg-card px-4 py-2 text-sm text-foreground transition-colors hover:border-champagne"
          >
            Configuración
          </Link>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {identity.data && (
              <span>
                {identity.data.displayName}
                {identity.data.role === "owner" ? " · dueña" : ""}
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                clearStaffToken();
                setHasToken(false);
              }}
              className="underline-offset-4 hover:underline"
            >
              Salir
            </button>
          </div>
        </div>
        <AgendaScreen />
      </div>
    </main>
  );
}

function SignIn({ onToken, error }: { onToken: () => void; error: Error | null }) {
  const [token, setToken] = useState("");

  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-3xl border border-champagne-deep/20 bg-card p-6 shadow-sm">
        <h1 className="font-serif text-xl text-foreground">Panel del salón</h1>
        <p className="mt-1 text-sm text-muted-foreground">Entrá con la cuenta que Sol autorizó.</p>

        {error && (
          <p className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error.message}
          </p>
        )}

        <label
          htmlFor="staff-token"
          className="mt-5 block text-[11px] uppercase tracking-wider text-muted-foreground"
        >
          Token de acceso
        </label>
        <input
          id="staff-token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button
          type="button"
          disabled={!token.trim()}
          onClick={() => {
            writeStaffToken(token.trim());
            onToken();
          }}
          className="mt-4 w-full rounded-full bg-primary py-3 font-serif text-base text-primary-foreground transition-all hover:translate-y-[-1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        >
          Entrar
        </button>

        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          El ingreso definitivo va a ser con Google, una vez cargadas las credenciales del proyecto.
          Hasta entonces se entra con el token de la sesión de Supabase.
        </p>
      </div>
    </main>
  );
}
