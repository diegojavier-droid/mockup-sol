/**
 * Panel interno del salón.
 *
 * La autorización la decide el backend: guardar un token acá no da
 * acceso a nada. Esta pantalla sólo evita mostrar una agenda vacía a
 * quien todavía no inició sesión.
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AgendaScreen } from "@/components/booking/admin/AgendaScreen";
import { DashboardScreen } from "@/components/booking/admin/DashboardScreen";
import { SalonScreen } from "@/components/booking/admin/SalonScreen";
import { PeopleScreen } from "@/components/booking/admin/PeopleScreen";
import { AuditScreen } from "@/components/booking/admin/AuditScreen";
import { RolesScreen } from "@/components/booking/admin/RolesScreen";
import { InvoicingScreen } from "@/components/booking/admin/InvoicingScreen";
import { ModuleNav, type ModuleKey } from "@/components/booking/admin/ModuleNav";
import { useStaffIdentity } from "@/lib/api/admin-hooks";
import { puede, readStaffToken, writeStaffToken } from "@/lib/staff-session";
import { entrarConGoogle, leerConfig, recuperarSesion, salir } from "@/lib/staff-auth";

export const Route = createFileRoute("/agenda")({
  head: () => ({ meta: [{ title: "Sol Mai · Agenda" }] }),
  component: AgendaRoute,
});

function AgendaRoute() {
  const [hasToken, setHasToken] = useState(() => Boolean(readStaffToken()));
  const [tab, setTab] = useState<ModuleKey>("calendario");
  const identity = useStaffIdentity();
  const qc = useQueryClient();

  // Al volver de Google, Supabase deja la sesión guardada y `recuperarSesion`
  // la espeja en el token que usa el cliente del panel. También cubre el
  // caso de recargar la página con una sesión que ya existía.
  useEffect(() => {
    if (hasToken) return;
    let vivo = true;
    void recuperarSesion().then((hay) => {
      if (!vivo || !hay) return;
      qc.removeQueries({ queryKey: ["admin", "me"] });
      setHasToken(true);
    });
    return () => {
      vivo = false;
    };
  }, [hasToken, qc]);

  if (!hasToken || identity.isError) {
    return (
      <SignIn
        onToken={() => {
          // Volver a preguntar quién es. Sin esto quedaba el error del
          // 401 anterior —el de cuando todavía no había token— y la
          // pantalla seguía mostrando el login para siempre: había que
          // recargar la página para poder entrar.
          qc.removeQueries({ queryKey: ["admin", "me"] });
          setHasToken(true);
        }}
        error={hasToken ? ((identity.error as Error | null) ?? null) : null}
      />
    );
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
                {identity.data.roleName ? ` · ${identity.data.roleName.toLowerCase()}` : ""}
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                void salir().then(() => setHasToken(false));
              }}
              className="underline-offset-4 hover:underline"
            >
              Salir
            </button>
          </div>
        </div>
        {/* El mapa del sistema. Quien atiende ve sólo lo suyo: el
            backend niega el resto igual, pero mostrarle puertas cerradas
            sería ensuciarle la pantalla todos los días. */}
        <div className="mb-6">
          <ModuleNav activo={tab} identidad={identity.data} onElegir={setTab} />
        </div>

        {/* El permiso se vuelve a mirar acá aunque `ModuleNav` ya esconda
            lo que no corresponde: esconder no es una frontera, y el
            módulo activo sobrevive a que Sol le cambie los permisos a
            alguien mientras tiene la pantalla abierta. */}
        {tab === "finanzas" && puede(identity.data, "finanzas") ? (
          <>
            <DashboardScreen />
            <div className="mt-8 border-t border-border pt-8">
              <InvoicingScreen />
            </div>
          </>
        ) : tab === "servicios" && puede(identity.data, "servicios") ? (
          <SalonScreen />
        ) : tab === "personas" && puede(identity.data, "usuarios") ? (
          <>
            <PeopleScreen />
            <div className="mt-8 border-t border-border pt-8">
              <RolesScreen />
            </div>
            <div className="mt-8 border-t border-border pt-8">
              <AuditScreen />
            </div>
          </>
        ) : (
          <AgendaScreen />
        )}
      </div>
    </main>
  );
}

/**
 * La puerta del panel.
 *
 * Hasta este bloque pedía que alguien pegara a mano un token de sesión de
 * Supabase. Andaba para probar, pero significaba que Sol no podía entrar
 * sola: todo lo construido quedaba detrás de un campo que sólo sabe
 * llenar quien tiene la consola abierta.
 *
 * El campo del token sigue existiendo, pero SÓLO si Google no está
 * configurado. Es un guard que falla del lado seguro: si el día de mañana
 * alguien despliega sin las credenciales cargadas, la pantalla lo dice y
 * deja una forma de entrar, en vez de mostrar un botón que no hace nada.
 */
function SignIn({ onToken, error }: { onToken: () => void; error: Error | null }) {
  const [token, setToken] = useState("");
  const [config, setConfig] = useState<Awaited<ReturnType<typeof leerConfig>> | undefined>(
    undefined,
  );
  const [yendo, setYendo] = useState(false);
  const [falla, setFalla] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    void leerConfig().then((c) => vivo && setConfig(c));
    return () => {
      vivo = false;
    };
  }, []);

  const conGoogle = config?.proveedores?.includes("google") ?? false;

  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-3xl border border-champagne-deep/20 bg-card p-6 shadow-sm">
        <h1 className="font-serif text-xl text-foreground">Panel del salón</h1>
        <p className="mt-1 text-sm text-muted-foreground">Entrá con la cuenta que Sol autorizó.</p>

        {(error || falla) && (
          <p className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {falla ?? error?.message}
          </p>
        )}

        {config === undefined && (
          <p className="mt-5 text-sm text-muted-foreground">Un segundo…</p>
        )}

        {config !== undefined && conGoogle && (
          <>
            <button
              type="button"
              disabled={yendo}
              onClick={() => {
                setFalla(null);
                setYendo(true);
                void entrarConGoogle().then((r) => {
                  if (!r.ok) {
                    setFalla(r.mensaje ?? "No pudimos abrir el ingreso con Google.");
                    setYendo(false);
                  }
                  // Si salió bien, el navegador ya se está yendo a Google:
                  // no se apaga el «Entrando…» para que no parpadee.
                });
              }}
              className="mt-5 w-full rounded-full bg-primary py-3 font-serif text-base text-primary-foreground transition-all hover:translate-y-[-1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
            >
              {yendo ? "Entrando…" : "Entrar con Google"}
            </button>

            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              Entrás con tu cuenta de Google. No guardamos tu contraseña: no la vemos nunca.
            </p>
          </>
        )}

        {config !== undefined && !conGoogle && (
          <>
            {/* Sin Google configurado. Se dice con todas las letras en vez
                de mostrar una pantalla que parece rota. */}
            <p className="mt-5 rounded-2xl border border-champagne-deep/30 bg-cream/60 px-4 py-3 text-sm text-foreground/85">
              El ingreso con Google todavía no está configurado en este servidor. Mientras tanto se
              entra con el token de la sesión de Supabase.
            </p>

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
          </>
        )}
      </div>
    </main>
  );
}
