import { useState } from "react";
import {
  useInviteStaff,
  useRoles,
  useSetStaffActive,
  useSetStaffRole,
  useStaffIdentity,
  useStaffList,
  type RoleRow,
  type StaffRow,
} from "@/lib/api/admin-hooks";
import { puede } from "@/lib/staff-session";

/**
 * «Usuarios y roles · Personas»: quién puede entrar al panel.
 *
 * Hasta este bloque, sumar o sacar a alguien era editar un secreto,
 * desplegar y tocar la base a mano. El día que una persona deja el
 * salón, sacarle el acceso no puede depender de que estemos nosotros.
 *
 * Dos cosas que la pantalla dice y conviene que diga:
 *
 * - **No se manda ningún mail.** El sistema no invita: habilita. La
 *   persona entra con su cuenta de Google cuando quiera. Prometer un
 *   mail que no existe haría que Sol espere algo que no va a pasar.
 * - **Sacar el acceso no borra el trabajo.** Los turnos que cargó y los
 *   cierres que hizo quedan con su nombre. Se saca la llave, no la
 *   historia.
 */
export function PeopleScreen() {
  const identity = useStaffIdentity();
  const puedeAdministrar = puede(identity.data, "usuarios", "full");
  const gente = useStaffList(puedeAdministrar);
  // Los roles ya no son dos escritos en el código: son los que Sol armó.
  const roles = useRoles(puedeAdministrar);
  const [aviso, setAviso] = useState<string | null>(null);

  if (!puedeAdministrar) return null;

  const activas = (gente.data ?? []).filter((p) => p.isActive);
  const sinAcceso = (gente.data ?? []).filter((p) => !p.isActive);

  return (
    <div className="space-y-6">
      <section>
        <h2 className="font-serif text-xl text-foreground">Quién puede entrar</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Cada persona entra con su cuenta de Google. No guardamos contraseñas de nadie.
        </p>

        {aviso && (
          <p className="mt-3 rounded-2xl border border-champagne-deep/30 bg-cream/60 px-4 py-3 text-sm text-foreground/85">
            {aviso}
          </p>
        )}

        {gente.isLoading && <p className="mt-4 text-sm text-muted-foreground">Cargando…</p>}

        <div className="mt-4 divide-y divide-border rounded-2xl border border-border bg-card">
          {activas.map((p) => (
            <Persona
              key={p.id}
              persona={p}
              roles={roles.data ?? []}
              esVos={p.id === identity.data?.staffId}
              onAviso={setAviso}
            />
          ))}
        </div>

        {sinAcceso.length > 0 && (
          <>
            <h3 className="mt-6 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Ya no entran
            </h3>
            <div className="mt-2 divide-y divide-border rounded-2xl border border-border bg-card">
              {sinAcceso.map((p) => (
                <Persona
                  key={p.id}
                  persona={p}
                  roles={roles.data ?? []}
                  esVos={false}
                  onAviso={setAviso}
                />
              ))}
            </div>
          </>
        )}

        <p className="mt-4 text-xs text-muted-foreground">
          Sacarle el acceso a alguien no borra su trabajo: los turnos que cargó y los cierres que
          hizo quedan con su nombre.
        </p>
      </section>

      <Sumar roles={roles.data ?? []} onAviso={setAviso} />
    </div>
  );
}

function Persona({
  persona,
  roles,
  esVos,
  onAviso,
}: {
  persona: StaffRow;
  roles: RoleRow[];
  esVos: boolean;
  onAviso: (s: string | null) => void;
}) {
  const activar = useSetStaffActive();
  const cambiarRol = useSetStaffRole();
  const error = (e: unknown) => onAviso(e instanceof Error ? e.message : "No se pudo guardar.");

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-foreground">
          {persona.displayName}
          {esVos && <span className="ml-2 text-xs text-muted-foreground">(vos)</span>}
        </p>
        <p className="truncate text-xs text-muted-foreground">{persona.email}</p>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <span className="sr-only">Rol de {persona.displayName}</span>
        <select
          aria-label={`Rol de ${persona.displayName}`}
          className="rounded-xl border border-border bg-background px-2 py-1.5 text-sm disabled:opacity-50"
          disabled={esVos || !persona.isActive || cambiarRol.isPending}
          onChange={(e) => {
            onAviso(null);
            const elegido = e.target.value;
            cambiarRol.mutate(
              { staffId: persona.id, role: elegido },
              {
                onSuccess: () =>
                  onAviso(
                    `${persona.displayName} ahora es ${
                      roles.find((r) => r.slug === elegido)?.name ?? elegido
                    }.`,
                  ),
                onError: error,
              },
            );
          }}
          value={persona.role}
        >
          {roles.map((r) => (
            <option key={r.slug} value={r.slug}>
              {r.name}
            </option>
          ))}
        </select>
      </label>

      <button
        className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs font-medium disabled:opacity-50"
        disabled={esVos || activar.isPending}
        onClick={() => {
          onAviso(null);
          activar.mutate(
            { staffId: persona.id, active: !persona.isActive },
            {
              onSuccess: () =>
                onAviso(
                  persona.isActive
                    ? `${persona.displayName} ya no puede entrar.`
                    : `${persona.displayName} puede entrar de nuevo.`,
                ),
              onError: error,
            },
          );
        }}
        type="button"
      >
        {persona.isActive ? "Sacarle el acceso" : "Devolverle el acceso"}
      </button>
    </div>
  );
}

function Sumar({
  roles,
  onAviso,
}: {
  roles: RoleRow[];
  onAviso: (s: string | null) => void;
}) {
  const sumar = useInviteStaff();
  const [email, setEmail] = useState("");
  const [nombre, setNombre] = useState("");
  // Vacío hasta que carguen los roles: preseleccionar uno fijo haría que,
  // si Sol lo borró, el alta fallara con un rol que la pantalla eligió sola.
  const [rol, setRol] = useState("");

  const enviar = () => {
    const e = email.trim();
    if (!e || !rol) return;
    onAviso(null);
    sumar.mutate(
      { email: e, displayName: nombre.trim() || null, role: rol },
      {
        onSuccess: (r) => {
          setEmail("");
          setNombre("");
          onAviso(
            r.reingreso
              ? "Le devolvimos el acceso. Ya puede entrar con su cuenta de Google."
              : "Listo. Ya puede entrar con su cuenta de Google.",
          );
        },
        onError: (err) =>
          onAviso(err instanceof Error ? err.message : "No se pudo sumar a esa persona."),
      },
    );
  };

  return (
    <section>
      <h2 className="font-serif text-xl text-foreground">Sumar a alguien</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Con esto ya puede entrar. No le llega ningún mail: entra sola con su cuenta de Google cuando
        quiera.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <input
          aria-label="Correo de Google"
          className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Su correo de Google"
          type="email"
          value={email}
        />
        <input
          aria-label="Nombre"
          className="w-40 rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre"
          value={nombre}
        />
        <select
          aria-label="Rol de la persona nueva"
          className="rounded-xl border border-border bg-background px-2 py-2 text-sm"
          onChange={(e) => setRol(e.target.value)}
          value={rol}
        >
          <option value="">Elegí un rol</option>
          {roles.map((r) => (
            <option key={r.slug} value={r.slug}>
              {r.name}
            </option>
          ))}
        </select>
        <button
          className="shrink-0 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
          disabled={sumar.isPending || email.trim().length === 0 || rol === ""}
          onClick={enviar}
          type="button"
        >
          {sumar.isPending ? "Sumando…" : "Sumar"}
        </button>
      </div>

      {/* Dar acceso es una decisión, no un trámite: el rol no viene
          elegido de fábrica. Pero un botón apagado sin explicación es
          igual de malo, así que la pantalla dice qué falta. */}
      {email.trim() !== "" && rol === "" && (
        <p className="mt-3 text-xs text-foreground/80">Elegí con qué rol entra.</p>
      )}

      <p className="mt-3 text-xs text-muted-foreground">
        A qué llega cada rol lo decidís vos más abajo, en «Qué ve cada rol».
      </p>
    </section>
  );
}
