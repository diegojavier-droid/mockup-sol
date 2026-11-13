/** Ingreso individual; la sesión identifica y el backend autoriza. */

import { useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api/client";
import {
  correoDeLaSesion,
  correoValido,
  entrarConContrasena,
  ERROR_INGRESO,
  entrarConGoogle,
  leerConfig,
  pedirLinkPorMail,
  salir,
} from "@/lib/staff-auth";

export function SignIn({
  onToken,
  onSignOut,
  error,
  aviso,
}: {
  onToken: () => void;
  onSignOut?: () => void;
  error: Error | null;
  /** Por qué falló el intento anterior, si volvió de uno. */
  aviso: string | null;
}) {
  const [password, setPassword] = useState("");
  const ocupado = useRef(false);
  const montado = useRef(true);
  useEffect(() => {
    montado.current = true;
    return () => { montado.current = false; };
  }, []);
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
  // SÓLO 403, y la diferencia con el 401 es la que hace que esto sirva.
  //
  // La primera versión también contaba el 401, y eso convertía una sesión
  // vencida en «pedile acceso a quien administra el panel»: el consejo
  // opuesto al que necesita alguien que sólo tiene que volver a entrar.
  // Lo marcó la revisión automática y era cierto.
  //
  // Ahora el servidor los separa: 401 es «no sé quién sos» —token vencido,
  // falso, o de un proveedor que no aceptamos—, y ahí el cliente borra el
  // token solo y vuelve el formulario. 403 es «sé quién sos y no te
  // alcanza», el único caso donde pedir otro link no sirve de nada.
  //
  // Un 0 —quedarse sin conexión— o un 500 tampoco cuentan: dirían que no
  // tiene permisos a alguien que lo que tiene es mal el wifi.
  const rechazado = error instanceof ApiError && error.status === 403;

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
                  Te identificaste como <span className="font-medium">{correo}</span>, pero todavía no tenés acceso al panel.
                </>
              ) : (
                <>Tu sesión está identificada, pero todavía no tenés acceso al panel.</>
              )}{" "}
              Lo que falta es el acceso al panel, y eso lo da quien lo administra: volver a iniciar sesión con el mismo correo no lo cambia.
            </p>
            <button
              type="button"
              onClick={() => {
                if (onSignOut) { onSignOut(); return; }
                void salir().then((result) => {
                  if (montado.current) setFalla(result.mensaje ?? null);
                  // Do not reload: a session that could not be erased may still
                  // be persisted. The parent owns the safe transition and notice.
                });
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
              Si ese correo tiene una cuenta habilitada, recibirá un link: <span className="font-medium">{mail.trim()}</span>. Abrilo desde
              este mismo dispositivo para continuar.
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
          <form onSubmit={(event) => {
            event.preventDefault();
            if (ocupado.current || !correoValido(mail) || !password) return;
            ocupado.current = true;
            setFalla(null); setYendo(true);
            const intento = entrarConContrasena(mail, password);
            setPassword("");
            void intento.then((r) => {
              if (!montado.current) return;
              if (r.ok) onToken();
              else setFalla(r.mensaje ?? ERROR_INGRESO);
            }).catch(() => setFalla(ERROR_INGRESO)).finally(() => {
              ocupado.current = false; setYendo(false); setPassword("");
            });
          }}>
            <label
              htmlFor="staff-mail"
              className="mt-5 block text-[11px] uppercase tracking-wider text-muted-foreground"
            >
              Tu correo
            </label>
            <input
              id="staff-mail"
              type="email"
              autoComplete="username"
              required
              maxLength={254}
              disabled={yendo}
              value={mail}
              onChange={(e) => setMail(e.target.value)}
              placeholder="vos@ejemplo.com"
              className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <label htmlFor="staff-password" className="mt-4 block text-sm">Contraseña</label>
            <input id="staff-password" type="password" autoComplete="current-password"
              required maxLength={1024} value={password} disabled={yendo}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
            <button type="submit" disabled={yendo || !correoValido(mail) || !password}
              className="mt-3 w-full rounded-full bg-primary py-3 text-primary-foreground disabled:opacity-50">
              {yendo ? "Verificando…" : "Entrar"}
            </button>
            <button type="button" disabled={yendo || !correoValido(mail)}
              onClick={() => {
                if (ocupado.current) return;
                ocupado.current = true;
                setPassword(""); setFalla(null); setYendo(true);
                void pedirLinkPorMail(mail).then((r) => {
                  if (r.ok) setEnviado(true);
                  else setFalla(r.mensaje ?? ERROR_INGRESO);
                }).catch(() => setFalla(ERROR_INGRESO)).finally(() => {
                  ocupado.current = false; setYendo(false);
                });
              }} className="mt-3 w-full text-sm underline disabled:opacity-50">
              Mandarme un link por correo
            </button>
            <button type="button" disabled={yendo} onClick={() => {setPassword(""); setMail(""); setFalla(null);}}
              className="mt-3 w-full text-sm underline">Borrar datos</button>
          </form>
        )}

        {conGoogle && !enviado && (
          <button
            type="button"
            disabled={yendo}
            onClick={() => {
              if (ocupado.current) return;
              ocupado.current = true;
              setPassword(""); setFalla(null);
              setYendo(true);
              void entrarConGoogle().then((r) => {
                if (!r.ok) {
                  setFalla(r.mensaje ?? "No pudimos abrir el ingreso con Google.");
                  setYendo(false); ocupado.current = false;
                }
              }).catch(() => {setFalla(ERROR_INGRESO); setYendo(false); ocupado.current = false;});
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
          <p className="mt-5 text-sm text-muted-foreground">
            El ingreso no está disponible. Consultá con quien administra el panel.
          </p>
        )}
      </div>
    </main>
  );
}
