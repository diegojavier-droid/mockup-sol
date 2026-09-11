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
import { ApiError } from "@/lib/api/client";
import {
  correoDeLaSesion,
  entrarConGoogle,
  leerConfig,
  pedirLinkPorMail,
  recuperarSesion,
  salir,
} from "@/lib/staff-auth";

export const Route = createFileRoute("/agenda")({
  head: () => ({ meta: [{ title: "Sol Mai · Agenda" }] }),
  component: AgendaRoute,
});

function AgendaRoute() {
  const [hasToken, setHasToken] = useState(() => Boolean(readStaffToken()));
  const [tab, setTab] = useState<ModuleKey>("calendario");
  // Por qué quedó afuera quien volvió del mail. Antes esto se descartaba
  // y el resultado era el peor de los mundos: el formulario de nuevo, sin
  // decir nada, pidiendo el correo que la persona acababa de escribir.
  const [problemaAlVolver, setProblemaAlVolver] = useState<string | null>(null);
  const identity = useStaffIdentity();
  const qc = useQueryClient();

  // Al volver del link del mail —o de Google— Supabase canjea el código,
  // deja la sesión guardada y `recuperarSesion` la espeja en el token que
  // usa el cliente del panel. También cubre el caso de recargar la página
  // con una sesión que ya existía.
  useEffect(() => {
    if (hasToken) return;
    let vivo = true;
    void recuperarSesion().then(({ adentro, problema }) => {
      if (!vivo) return;
      setProblemaAlVolver(problema);
      if (!adentro) return;
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
        aviso={problemaAlVolver}
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
 * EL CAMINO PRINCIPAL ES EL LINK AL MAIL
 *
 * Google exige un cliente de OAuth en Google Cloud y credenciales
 * cargadas en Supabase: dos consolas ajenas antes de que nadie pueda
 * abrir el panel. El link al correo no necesita nada de eso y prueba lo
 * mismo —que la casilla es tuya—, así que es lo que se ofrece primero.
 * Google queda como opción y aparece sólo si está configurado de verdad.
 *
 * QUÉ SE DICE Y QUÉ NO
 *
 * La versión anterior decía «Entrá con la cuenta que Sol autorizó», que
 * le habla a una tercera persona que no existe —cuando lo abre Sol, le
 * está diciendo que entre con la cuenta que ella misma autorizó—, y
 * tranquilizaba sobre la contraseña, un miedo que nadie tenía.
 *
 * En su lugar se explica lo único que confunde de verdad: identificarse
 * y tener acceso son cosas distintas. Quien no lo sabe interpreta que
 * cualquiera con una cuenta entra al panel.
 */
function SignIn({
  onToken,
  error,
  aviso,
}: {
  onToken: () => void;
  error: Error | null;
  /** Por qué falló el intento anterior, si volvió de uno. */
  aviso: string | null;
}) {
  const [token, setToken] = useState("");
  const [mail, setMail] = useState("");
  const [config, setConfig] = useState<Awaited<ReturnType<typeof leerConfig>> | undefined>(
    undefined,
  );
  const [yendo, setYendo] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [falla, setFalla] = useState<string | null>(null);
  const [correo, setCorreo] = useState<string | null>(null);

  // IDENTIFICADA PERO SIN ACCESO
  //
  // Es el otro final de esta pantalla y el que más desconcierta: el link
  // anduvo, Supabase dio la sesión, y el servidor igual dijo que no. Ahí
  // volver a pedir el correo es peor que no decir nada —manda a pedir otro
  // link, que no arregla nada y consume el cupo de correos por hora—, así
  // que el formulario se guarda y se explica qué falta de verdad.
  //
  // Sólo cuenta si el servidor RECHAZÓ. Un 0 —quedarse sin conexión— o un
  // 500 no prueban nada sobre el acceso, y tratarlos igual le diría a
  // alguien que no tiene permisos cuando lo que tiene es mal el wifi.
  const rechazado = error instanceof ApiError && (error.status === 401 || error.status === 403);

  useEffect(() => {
    let vivo = true;
    void leerConfig().then((c) => vivo && setConfig(c));
    return () => {
      vivo = false;
    };
  }, []);

  useEffect(() => {
    if (!rechazado) return;
    let vivo = true;
    void correoDeLaSesion().then((c) => vivo && setCorreo(c));
    return () => {
      vivo = false;
    };
  }, [rechazado]);

  const conGoogle = (config?.proveedores?.includes("google") ?? false) && !rechazado;
  const conMail = (config?.proveedores?.includes("email") ?? false) && !rechazado;
  const sinPuerta = config !== undefined && !rechazado && !conGoogle && !conMail;

  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm rounded-3xl border border-champagne-deep/20 bg-card p-6 shadow-sm">
        <h1 className="font-serif text-xl text-foreground">Panel del salón</h1>
        <p className="mt-1 text-sm text-muted-foreground">La agenda, las clientas y la caja.</p>

        {/* Un solo cartel, y gana el más reciente: lo que acaba de pasar
            en esta pantalla antes que el motivo con el que se llegó. */}
        {(falla || aviso || error) && (
          <p className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {falla ?? aviso ?? error?.message}
          </p>
        )}

        {rechazado && (
          <>
            <p className="mt-4 text-sm leading-relaxed text-foreground/85">
              {correo ? (
                <>
                  Te identificaste como <span className="font-medium">{correo}</span>, así que el
                  link anduvo.
                </>
              ) : (
                <>Te identificaste bien, así que el link anduvo.</>
              )}{" "}
              Lo que falta es el acceso al panel, y eso lo da quien lo administra: pedir otro link
              no lo cambia.
            </p>
            <button
              type="button"
              onClick={() => {
                void salir().then(() => window.location.assign("/agenda"));
              }}
              className="mt-4 w-full rounded-full border border-border bg-card py-3 text-sm text-foreground transition-colors hover:border-champagne"
            >
              Probar con otro correo
            </button>
          </>
        )}

        {config === undefined && !rechazado && (
          <p className="mt-5 text-sm text-muted-foreground">Un segundo…</p>
        )}

        {/* El link ya salió. No se vuelve a mostrar el formulario: quien
            está esperando un mail no necesita otro campo, necesita saber
            que tiene que ir a mirar la casilla. */}
        {enviado && (
          <div className="mt-5 rounded-2xl border border-champagne-deep/30 bg-cream/60 px-4 py-4">
            <p className="text-sm text-foreground/85">
              Te mandamos un link a <span className="font-medium">{mail.trim()}</span>. Abrilo desde
              este mismo dispositivo y entrás.
            </p>
            <button
              type="button"
              onClick={() => {
                setEnviado(false);
                setFalla(null);
              }}
              className="mt-3 text-xs text-muted-foreground underline underline-offset-4"
            >
              Usar otro correo
            </button>
          </div>
        )}

        {conMail && !enviado && (
          <>
            <label
              htmlFor="staff-mail"
              className="mt-5 block text-[11px] uppercase tracking-wider text-muted-foreground"
            >
              Tu correo
            </label>
            <input
              id="staff-mail"
              type="email"
              autoComplete="email"
              value={mail}
              onChange={(e) => setMail(e.target.value)}
              placeholder="vos@ejemplo.com"
              className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <button
              type="button"
              disabled={yendo || mail.trim() === ""}
              onClick={() => {
                setFalla(null);
                setYendo(true);
                void pedirLinkPorMail(mail).then((r) => {
                  setYendo(false);
                  if (r.ok) setEnviado(true);
                  else setFalla(r.mensaje ?? "No pudimos mandar el link.");
                });
              }}
              className="mt-3 w-full rounded-full bg-primary py-3 font-serif text-base text-primary-foreground transition-all hover:translate-y-[-1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              {yendo ? "Mandando…" : "Mandarme un link"}
            </button>
          </>
        )}

        {conGoogle && !enviado && (
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
              });
            }}
            className={
              conMail
                ? "mt-3 w-full rounded-full border border-border bg-card py-3 text-sm text-foreground transition-colors hover:border-champagne disabled:opacity-60"
                : "mt-5 w-full rounded-full bg-primary py-3 font-serif text-base text-primary-foreground transition-all hover:translate-y-[-1px] disabled:opacity-60"
            }
          >
            Entrar con Google
          </button>
        )}

        {/* Lo que de verdad confunde: identificarse no es tener acceso. */}
        {(conMail || conGoogle) && (
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            Entrar sólo dice quién sos. El acceso al panel lo da quien lo administra.
          </p>
        )}

        {sinPuerta && (
          <>
            {/* Ni link ni Google: el proyecto de Supabase no tiene
                habilitado ninguno de los dos. Se dice con todas las
                letras y se deja una forma de entrar, porque si no el
                sistema queda sin nadie que pueda arreglarlo. */}
            <p className="mt-5 rounded-2xl border border-champagne-deep/30 bg-cream/60 px-4 py-3 text-sm text-foreground/85">
              Este servidor todavía no tiene habilitado ningún modo de ingreso. Mientras tanto se
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
