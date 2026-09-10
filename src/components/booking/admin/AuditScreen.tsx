import { useMemo, useState } from "react";
import {
  useAuditActors,
  useAuditLog,
  useStaffIdentity,
  type AuditApiRow,
} from "@/lib/api/admin-hooks";
import { describirCambio, SOBRE_QUE } from "@/lib/audit-copy";
import { puede } from "@/lib/staff-session";

const VENTANAS = [
  { label: "Hoy", dias: 1 },
  { label: "7 días", dias: 7 },
  { label: "30 días", dias: 30 },
  { label: "Todo", dias: 0 },
];

const SALON_TZ = "America/Argentina/Cordoba";

function cuando(iso: string): string {
  const d = new Date(iso);
  const hoy = new Date();
  const mismoDia =
    d.toLocaleDateString("es-AR", { timeZone: SALON_TZ }) ===
    hoy.toLocaleDateString("es-AR", { timeZone: SALON_TZ });
  // 24 horas: acá se dice «14:30», no «2:30 p. m.». El default de es-AR
  // en este motor devuelve el de 12, así que hay que pedirlo.
  const hora = d.toLocaleTimeString("es-AR", {
    timeZone: SALON_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  if (mismoDia) return `hoy ${hora}`;
  const fecha = d.toLocaleDateString("es-AR", {
    timeZone: SALON_TZ,
    day: "2-digit",
    month: "2-digit",
  });
  return `${fecha} ${hora}`;
}

/**
 * «Usuarios y roles · Registro de cambios».
 *
 * `audit_log` se venía escribiendo desde el principio —cada cambio de
 * plata, de precio y de turno, con quién lo hizo y qué valor había
 * antes— y no había una sola pantalla que lo leyera. Un registro que
 * nadie puede consultar no cumple su función.
 *
 * Para qué sirve, concretamente: entender por qué un número no cierra, y
 * poder deshacer algo sabiendo a qué se vuelve.
 *
 * No se edita ni se borra, ni siquiera desde acá. No hay botón porque no
 * hay endpoint: un registro que se puede retocar no sirve para lo único
 * que sirve un registro.
 */
export function AuditScreen() {
  const identity = useStaffIdentity();
  // El registro de cambios vive en «Usuarios y roles».
  const soyDuena = puede(identity.data, "usuarios");
  const [dias, setDias] = useState(7);
  const [quien, setQuien] = useState<string>("");
  const [sobreQue, setSobreQue] = useState<string>("");
  const [paginas, setPaginas] = useState<number[]>([]);

  // `Date.now()` en cada render daba un `desde` distinto cada vez, así que
  // la clave de la consulta cambiaba sin parar y la pantalla se quedaba en
  // «Cargando…» para siempre. Congelarlo además es lo correcto: la ventana
  // no debería correrse sola mientras se la está mirando.
  const desde = useMemo(
    () => (dias > 0 ? new Date(Date.now() - dias * 24 * 60 * 60_000).toISOString() : undefined),
    [dias],
  );
  const registro = useAuditLog(soyDuena, {
    desde,
    actorId: quien || undefined,
    entityType: sobreQue || undefined,
    cursor: paginas.at(-1),
  });
  const gente = useAuditActors(soyDuena);

  if (!soyDuena) return null;

  const filas = registro.data ?? [];
  const reiniciar = () => setPaginas([]);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-serif text-xl text-foreground">Registro de cambios</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Todo lo que se tocó, con quién lo tocó y qué había antes. No se puede editar ni borrar.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {VENTANAS.map((v) => (
          <button
            className={
              v.dias === dias
                ? "rounded-full border border-champagne-deep bg-cream/70 px-3 py-1.5 text-xs font-medium"
                : "rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground"
            }
            key={v.label}
            onClick={() => {
              setDias(v.dias);
              reiniciar();
            }}
            type="button"
          >
            {v.label}
          </button>
        ))}

        <select
          aria-label="Filtrar por persona"
          className="rounded-xl border border-border bg-background px-2 py-1.5 text-xs"
          onChange={(e) => {
            setQuien(e.target.value);
            reiniciar();
          }}
          value={quien}
        >
          <option value="">Cualquier persona</option>
          {(gente.data ?? [])
            .filter((g) => g.actorId)
            .map((g) => (
              <option key={g.actorId} value={g.actorId!}>
                {g.quien}
              </option>
            ))}
        </select>

        <select
          aria-label="Filtrar por tipo de cosa"
          className="rounded-xl border border-border bg-background px-2 py-1.5 text-xs"
          onChange={(e) => {
            setSobreQue(e.target.value);
            reiniciar();
          }}
          value={sobreQue}
        >
          <option value="">Cualquier cosa</option>
          {Object.entries(SOBRE_QUE).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>

      {registro.isLoading && <p className="text-sm text-muted-foreground">Cargando…</p>}

      {!registro.isLoading && filas.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border px-5 py-8 text-center text-sm text-muted-foreground">
          No se tocó nada en ese período.
        </p>
      )}

      {filas.length > 0 && (
        <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
          {filas.map((f) => (
            <Cambio fila={f} key={f.id} />
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {paginas.length > 0 && (
          <button
            className="rounded-full border border-border px-3 py-1.5 text-xs"
            onClick={() => setPaginas((p) => p.slice(0, -1))}
            type="button"
          >
            Volver
          </button>
        )}
        {filas.length === 50 && (
          <button
            className="rounded-full border border-border px-3 py-1.5 text-xs"
            onClick={() => setPaginas((p) => [...p, filas[filas.length - 1]!.id])}
            type="button"
          >
            Ver más atrás
          </button>
        )}
      </div>
    </section>
  );
}

function Cambio({ fila }: { fila: AuditApiRow }) {
  const dicho = describirCambio({
    id: fila.id,
    cuando: fila.cuando,
    quien: fila.quien,
    esSistema: fila.esSistema,
    accion: fila.accion,
    entityType: fila.entityType,
    sobre: fila.sobre,
    detalle: fila.detalle,
  });

  return (
    <li className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-3 text-sm">
      <span className="w-20 shrink-0 text-xs tabular-nums text-muted-foreground">
        {cuando(fila.cuando)}
      </span>
      <span
        className={
          fila.esSistema
            ? "w-20 shrink-0 truncate text-xs italic text-muted-foreground"
            : "w-20 shrink-0 truncate text-xs font-medium text-foreground"
        }
      >
        {fila.quien}
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-foreground">{dicho.frase}</span>
        {fila.sobre && <span className="text-foreground/70"> · {fila.sobre}</span>}
        {(dicho.antes || dicho.ahora) && (
          <span className="ml-2 whitespace-nowrap text-xs tabular-nums text-muted-foreground">
            {dicho.antes && <>{dicho.antes} → </>}
            {dicho.ahora}
          </span>
        )}
        {dicho.crudo && (
          <span className="ml-2 break-all font-mono text-[10px] text-muted-foreground">
            {dicho.crudo}
          </span>
        )}
      </span>
    </li>
  );
}
