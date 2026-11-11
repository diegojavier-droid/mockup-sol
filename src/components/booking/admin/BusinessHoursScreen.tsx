import { useRef, useState } from "react";
import { useStaffIdentity } from "@/lib/api/admin-hooks";
import {
  changedHour,
  hourEdit,
  hourError,
  useBusinessHours,
  useSaveBusinessHour,
  type BusinessHourRow,
} from "@/lib/api/business-hours-admin";
import { puede } from "@/lib/staff-session";

const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const WEEK = [1, 2, 3, 4, 5, 6, 0];

/** Horario habitual ofrecido online. Las excepciones y los turnos ya tomados no se modifican. */
export function BusinessHoursScreen() {
  const identity = useStaffIdentity();
  const canView = puede(identity.data, "configuracion");
  const canEdit = puede(identity.data, "configuracion", "full");
  const hours = useBusinessHours(canView);

  if (identity.isLoading) return <p role="status">Cargando…</p>;
  if (!canView) return <p>No tenés acceso a los horarios del salón.</p>;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-serif text-xl text-foreground">Horarios del salón</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Horario semanal para los turnos online, en hora de Santa Fe (UTC-3). Los turnos ya tomados
          no cambian.
        </p>
        {!canEdit && (
          <p className="mt-2 text-sm text-muted-foreground">
            Tu acceso permite ver los horarios, sin cambiarlos.
          </p>
        )}
      </div>
      {hours.isLoading && <p role="status">Cargando horarios…</p>}
      {hours.isError && (
        <div role="alert" className="rounded-2xl border border-border p-4 text-sm">
          <p>{hours.error.message}</p>
          <button
            type="button"
            disabled={hours.isFetching}
            onClick={() => void hours.refetch()}
            className="mt-2 underline disabled:opacity-50"
          >
            Volver a cargar
          </button>
        </div>
      )}
      {hours.data && (
        <div className="space-y-3">
          {WEEK.map((day) => {
            const rows = hours.data
              .filter((row) => row.weekday === day)
              .sort((a, b) => a.opens_at.localeCompare(b.opens_at));
            return (
              <section
                key={day}
                aria-label={DAYS[day]}
                className="rounded-2xl border border-border bg-card p-4"
              >
                <h3 className="font-medium text-foreground">{DAYS[day]}</h3>
                {rows.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">Sin horario online cargado.</p>
                ) : (
                  <div className="mt-2 space-y-3">
                    {rows.map((row) => (
                      <HourRow key={row.id} row={row} day={DAYS[day]} canEdit={canEdit} />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Podés editar o desactivar las franjas cargadas. Los días sin franja no ofrecen turnos
        online; las atenciones especiales se siguen coordinando con el salón.
      </p>
    </section>
  );
}

function HourRow({ row, day, canEdit }: { row: BusinessHourRow; day: string; canEdit: boolean }) {
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  return (
    <div>
      {editing && canEdit ? (
        <HourForm
          original={row}
          onCancel={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            setSaved(true);
          }}
        />
      ) : (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <p>
            {row.opens_at.slice(0, 5)} a {row.closes_at.slice(0, 5)} ·{" "}
            {row.is_active ? "Disponible online" : "Sin turnos online"}
          </p>
          {canEdit && (
            <button
              type="button"
              aria-label={`Editar ${day} ${row.opens_at.slice(0, 5)}`}
              className="ml-auto rounded-full border border-border px-4 py-2"
              onClick={() => {
                setSaved(false);
                setEditing(true);
              }}
            >
              Editar
            </button>
          )}
        </div>
      )}
      {saved && (
        <p role="status" className="mt-2 text-sm text-muted-foreground">
          Horario guardado.
        </p>
      )}
    </div>
  );
}

function HourForm({
  original: current,
  onCancel,
  onSaved,
}: {
  original: BusinessHourRow;
  onCancel: () => void;
  onSaved: () => void;
}) {
  // Una recarga en segundo plano no pisa el borrador ni cambia su versión de partida.
  const [original] = useState(current);
  const [edit, setEdit] = useState(() => hourEdit(current));
  const [error, setError] = useState<string | null>(null);
  const saving = useSaveBusinessHour();
  const inFlight = useRef(false);
  const validation = hourError(edit);
  const changed = changedHour(original, edit);

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        if (inFlight.current || !changed || validation) return;
        inFlight.current = true;
        setError(null);
        try {
          await saving.mutateAsync({ original, edit });
          onSaved();
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "No se pudo guardar el horario.");
        } finally {
          inFlight.current = false;
        }
      }}
    >
      <fieldset disabled={saving.isPending} className="space-y-3 disabled:opacity-60">
        <div className="flex flex-wrap gap-3">
          <label className="text-sm">
            Apertura
            <input
              type="time"
              required
              value={edit.opensAt}
              onChange={(event) => {
                setError(null);
                setEdit({ ...edit, opensAt: event.target.value });
              }}
              className="mt-1 block rounded-xl border border-border bg-background px-3 py-2"
            />
          </label>
          <label className="text-sm">
            Cierre
            <input
              type="time"
              required
              value={edit.closesAt}
              onChange={(event) => {
                setError(null);
                setEdit({ ...edit, closesAt: event.target.value });
              }}
              className="mt-1 block rounded-xl border border-border bg-background px-3 py-2"
            />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={edit.isActive}
            onChange={(event) => {
              setError(null);
              setEdit({ ...edit, isActive: event.target.checked });
            }}
          />
          Ofrecer turnos online
        </label>
        {validation && (
          <p role="alert" className="text-sm text-destructive">
            {validation}
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={!changed || Boolean(validation)}
            className="rounded-full bg-foreground px-4 py-2 text-sm text-background disabled:opacity-50"
          >
            {saving.isPending ? "Guardando…" : "Guardar"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-border px-4 py-2 text-sm"
          >
            Cancelar
          </button>
        </div>
      </fieldset>
    </form>
  );
}
