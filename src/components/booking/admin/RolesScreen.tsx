import { useState } from "react";
import {
  useCreateRole,
  useDeleteRole,
  useRoles,
  useSetRolePermission,
  useStaffIdentity,
  type RoleRow,
} from "@/lib/api/admin-hooks";
import { puede, type Modulo, type Nivel } from "@/lib/staff-session";

/**
 * «Usuarios y roles · Roles»: quién ve qué.
 *
 * Hasta este bloque había dos roles escritos en el código y una sola
 * pregunta —«¿sos la dueña?»— para veintiocho pantallas. Eso obliga a
 * elegir entre dos cosas malas: o la persona del mostrador ve la
 * facturación, o Sol tiene que hacer sola todo lo que no sea la agenda.
 *
 * TRES NIVELES Y NO MÁS
 *
 * La tentación es hacer permisos por acción —«puede cancelar pero no
 * reprogramar»—. Eso produce una pantalla que nadie entiende y que Sol
 * no va a mantener; a los dos meses todo el mundo termina con todo
 * prendido. Tres niveles por módulo se explican en una frase.
 *
 * ESTA PANTALLA NO ES LA FRONTERA
 *
 * Lo que se decide acá lo aplica el servidor en cada pedido. Si alguien
 * abre la consola y se dibuja los botones que quiera, no gana nada.
 */

const MODULOS: { key: Modulo; label: string; que: string }[] = [
  { key: "calendario", label: "Calendario", que: "Los turnos: verlos, tomarlos, cerrarlos" },
  { key: "clientas", label: "Clientas", que: "Las fichas y lo que cada una autorizó" },
  { key: "finanzas", label: "Finanzas", que: "La caja, lo que entró y la facturación" },
  { key: "inventario", label: "Inventario", que: "Los productos y lo que queda" },
  { key: "servicios", label: "Servicios", que: "Precios, tiempos y qué se hace en el salón" },
  { key: "personal", label: "Personal", que: "Quién trabaja y cuánto produjo" },
  { key: "compras", label: "Compras", que: "Proveedores y pedidos" },
  { key: "usuarios", label: "Usuarios y roles", que: "Quién entra y qué puede tocar" },
  { key: "configuracion", label: "Configuración", que: "Horarios, datos del negocio, términos" },
];

const NIVELES: { valor: Nivel; label: string }[] = [
  { valor: "none", label: "No lo ve" },
  { valor: "view", label: "Lo mira" },
  { valor: "full", label: "Lo maneja" },
];

export function RolesScreen() {
  const identity = useStaffIdentity();
  const puedeAdministrar = puede(identity.data, "usuarios", "full");
  const roles = useRoles(puedeAdministrar);
  const [aviso, setAviso] = useState<string | null>(null);

  if (!puedeAdministrar) return null;

  return (
    <div className="space-y-6">
      <section>
        <h2 className="font-serif text-xl text-foreground">Qué ve cada rol</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Cada persona tiene un rol, y el rol decide a qué partes del sistema llega.
        </p>

        {aviso && (
          <p className="mt-3 rounded-2xl border border-champagne-deep/30 bg-cream/60 px-4 py-3 text-sm text-foreground/85">
            {aviso}
          </p>
        )}

        {roles.isLoading && <p className="mt-4 text-sm text-muted-foreground">Cargando…</p>}

        <div className="mt-4 space-y-4">
          {(roles.data ?? []).map((rol) => (
            <Rol key={rol.slug} rol={rol} onAviso={setAviso} />
          ))}
        </div>
      </section>

      <CrearRol onAviso={setAviso} />
    </div>
  );
}

function Rol({ rol, onAviso }: { rol: RoleRow; onAviso: (s: string | null) => void }) {
  const cambiar = useSetRolePermission();
  const borrar = useDeleteRole();

  const gente =
    rol.personas === 0
      ? "Todavía no lo tiene nadie"
      : rol.personas === 1
        ? "Lo tiene 1 persona"
        : `Lo tienen ${rol.personas} personas`;

  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border px-4 py-3">
        <h3 className="text-sm font-medium text-foreground">{rol.name}</h3>
        <p className="text-xs text-muted-foreground">{gente}</p>
        <div className="ml-auto">
          {rol.isSystem ? (
            // No es un permiso que falta: es la garantía de que el salón
            // no se queda sin nadie que pueda arreglarlo.
            <span className="text-xs text-muted-foreground">Entra a todo, siempre</span>
          ) : (
            <button
              aria-label={`Borrar el rol ${rol.name}`}
              className="rounded-full border border-border px-3 py-1 text-xs disabled:opacity-50"
              disabled={borrar.isPending}
              onClick={() => {
                onAviso(null);
                borrar.mutate(
                  { slug: rol.slug },
                  {
                    onSuccess: () => onAviso(`Borramos el rol ${rol.name}.`),
                    onError: (e) =>
                      onAviso(e instanceof Error ? e.message : "No se pudo borrar ese rol."),
                  },
                );
              }}
              type="button"
            >
              Borrar rol
            </button>
          )}
        </div>
      </div>

      <div className="divide-y divide-border">
        {MODULOS.map((m) => {
          const nivel = rol.permisos[m.key] ?? "none";
          return (
            <div key={m.key} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-foreground">{m.label}</p>
                <p className="truncate text-xs text-muted-foreground">{m.que}</p>
              </div>
              <select
                aria-label={`${m.label} para ${rol.name}`}
                className="rounded-xl border border-border bg-background px-2 py-1.5 text-sm disabled:opacity-50"
                disabled={rol.isSystem || cambiar.isPending}
                onChange={(e) => {
                  onAviso(null);
                  cambiar.mutate(
                    { slug: rol.slug, module: m.key, level: e.target.value as Nivel },
                    {
                      onSuccess: () =>
                        onAviso(
                          `${rol.name}: ${m.label.toLowerCase()} — ${NIVELES.find(
                            (n) => n.valor === e.target.value,
                          )?.label.toLowerCase()}.`,
                        ),
                      onError: (err) =>
                        onAviso(err instanceof Error ? err.message : "No se pudo guardar."),
                    },
                  );
                }}
                value={rol.isSystem ? "full" : nivel}
              >
                {NIVELES.map((n) => (
                  <option key={n.valor} value={n.valor}>
                    {n.label}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CrearRol({ onAviso }: { onAviso: (s: string | null) => void }) {
  const crear = useCreateRole();
  const [nombre, setNombre] = useState("");

  return (
    <section>
      <h2 className="font-serif text-xl text-foreground">Armar un rol nuevo</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Nace sin ver nada. Vos le vas dando lo que necesite.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <input
          aria-label="Nombre del rol"
          className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm"
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Recepción, Encargada, Ayudante…"
          value={nombre}
        />
        <button
          className="shrink-0 rounded-full border border-champagne-deep bg-cream/70 px-4 py-2 text-sm disabled:opacity-50"
          disabled={!nombre.trim() || crear.isPending}
          onClick={() => {
            const n = nombre.trim();
            if (!n) return;
            onAviso(null);
            crear.mutate(
              { name: n },
              {
                onSuccess: (r) => {
                  setNombre("");
                  onAviso(`Creamos el rol ${r.name}. Todavía no ve nada: dale lo que necesite.`);
                },
                onError: (e) =>
                  onAviso(e instanceof Error ? e.message : "No se pudo crear ese rol."),
              },
            );
          }}
          type="button"
        >
          Crear rol
        </button>
      </div>
    </section>
  );
}
