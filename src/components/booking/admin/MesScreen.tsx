/**
 * Agenda › Mes.
 *
 * Contesta la pregunta que antes contestaba un campito de fecha suelto:
 * «¿tenés algo para el 15?». La diferencia es que el campito te hacía
 * adivinar el día —había que escribirlo para enterarse de si había
 * algo—, y esto muestra el mes entero con cuántos turnos cae en cada
 * día. Se ve dónde hay antes de elegir.
 *
 * Tocar un día abre la agenda de ese día, operable, con la dirección
 * puesta: `/panel/agenda/mes?dia=2026-09-15` se puede mandar por
 * mensaje.
 *
 * DE DÓNDE SALEN LOS NÚMEROS
 *
 * Del resumen de la agenda: un pedido que devuelve cuántos turnos cae
 * cada día, sin traer los turnos. Nada se escribe a mano ni se estima.
 */

import { useMemo } from "react";
import { useAgendaResumen } from "@/lib/api/admin-hooks";

const DIAS = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];
const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

/** Hoy en el salón (UTC-3), no en el dispositivo de quien mira. */
function hoyEnElSalon(): string {
  return new Date(Date.now() - 180 * 60_000).toISOString().slice(0, 10);
}

function iso(anio: number, mes: number, dia: number): string {
  return `${anio}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

/** Lunes = 0. `getUTCDay()` cuenta desde el domingo y acá la semana empieza el lunes. */
function columnaDe(anio: number, mes: number, dia: number): number {
  return (new Date(Date.UTC(anio, mes, dia)).getUTCDay() + 6) % 7;
}

export function MesScreen({
  mes,
  onDia,
  onMes,
}: {
  /** El mes que se mira, como `2026-09`. */
  mes: string;
  onDia: (dia: string) => void;
  onMes: (mes: string) => void;
}) {
  const [anio, mesN] = mes.split("-").map(Number);
  const mesIdx = mesN - 1;
  const cuantosDias = new Date(Date.UTC(anio, mesIdx + 1, 0)).getUTCDate();

  const agenda = useAgendaResumen({
    desde: iso(anio, mesIdx, 1),
    hasta: iso(anio, mesIdx, cuantosDias),
  });

  const porDia = useMemo(
    () => new Map((agenda.data?.porDia ?? []).map((d) => [d.dia, d.turnos])),
    [agenda.data],
  );

  const hoy = hoyEnElSalon();
  const total = (agenda.data?.porDia ?? []).reduce((n, d) => n + d.turnos, 0);

  const celdas: (number | null)[] = [
    ...Array<null>(columnaDe(anio, mesIdx, 1)).fill(null),
    ...Array.from({ length: cuantosDias }, (_, i) => i + 1),
  ];

  const mover = (delta: number) => {
    const d = new Date(Date.UTC(anio, mesIdx + delta, 1));
    onMes(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl capitalize text-foreground">
            {MESES[mesIdx]} {anio}
          </h2>
          <p className="text-sm text-muted-foreground">
            {agenda.isLoading
              ? "Buscando turnos…"
              : `${total} ${total === 1 ? "turno" : "turnos"} en el mes`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => mover(-1)}
            aria-label="Mes anterior"
            className="rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-champagne"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => {
              const h = hoy.slice(0, 7);
              if (h !== mes) onMes(h);
            }}
            className="rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-champagne"
          >
            Este mes
          </button>
          <button
            type="button"
            onClick={() => mover(1)}
            aria-label="Mes siguiente"
            className="rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-champagne"
          >
            →
          </button>
        </div>
      </header>

      {agenda.isError && (
        <p className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {(agenda.error as Error).message}
        </p>
      )}

      <div className="rounded-3xl border border-border bg-card p-3 sm:p-4">
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {DIAS.map((d) => (
            <div
              key={d}
              className="pb-1 text-center text-[11px] uppercase tracking-wider text-muted-foreground"
            >
              {d}
            </div>
          ))}

          {celdas.map((dia, i) => {
            if (dia === null) return <div key={`vacio-${i}`} />;

            const fecha = iso(anio, mesIdx, dia);
            const cuantos = porDia.get(fecha) ?? 0;
            const esHoy = fecha === hoy;

            return (
              <button
                key={fecha}
                type="button"
                onClick={() => onDia(fecha)}
                aria-label={`${dia} de ${MESES[mesIdx]}, ${cuantos} ${cuantos === 1 ? "turno" : "turnos"}`}
                className={`flex min-h-[58px] flex-col items-center justify-center gap-0.5 rounded-xl border p-1 transition-colors sm:min-h-[76px] ${
                  esHoy
                    ? "border-champagne-deep bg-champagne/40"
                    : cuantos > 0
                      ? "border-border bg-background hover:border-champagne"
                      : "border-transparent bg-background/40 hover:border-border"
                }`}
              >
                <span
                  className={`text-sm tabular-nums ${esHoy ? "font-medium text-foreground" : "text-foreground/80"}`}
                >
                  {dia}
                </span>
                {/* Un día sin turnos no dice «0»: dice nada. El cero
                    ocupa lugar y obliga a leerlo para descartarlo. */}
                {cuantos > 0 && (
                  <span className="text-[11px] leading-none text-muted-foreground">
                    {cuantos} {cuantos === 1 ? "turno" : "turnos"}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
