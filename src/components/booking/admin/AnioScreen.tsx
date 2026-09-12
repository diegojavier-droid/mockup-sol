/**
 * Agenda › Año.
 *
 * Doce meses con cuántos turnos tuvo cada uno, y una barra para
 * compararlos de un vistazo. Contesta «¿cómo viene el año?» y «¿cuándo
 * fue el mes fuerte?», que son preguntas de temporada, no del día.
 *
 * Tocar un mes abre ese mes.
 *
 * POR QUÉ TARDÓ EN EXISTIR
 *
 * El endpoint de la agenda devuelve el turno entero y acepta 31 días por
 * consulta: un año por ahí eran doce pedidos trayendo miles de filas
 * completas al navegador para contarlas y tirarlas. Se hizo un endpoint
 * de resumen que devuelve el número por día, y esta pantalla es un solo
 * pedido.
 *
 * LO QUE NO HACE
 *
 * No compara con el año pasado, no proyecta y no dice si un mes estuvo
 * «bien». Para eso haría falta decidir contra qué se compara, y eso lo
 * decide Sol, no el sistema.
 */

import { useMemo } from "react";
import { useAgendaResumen } from "@/lib/api/admin-hooks";

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

/** Hoy en el salón (UTC-3), no en el dispositivo de quien mira. */
function hoyEnElSalon(): string {
  return new Date(Date.now() - 180 * 60_000).toISOString().slice(0, 10);
}

export function AnioScreen({
  anio,
  onAnio,
  onMes,
}: {
  anio: number;
  onAnio: (anio: number) => void;
  onMes: (mes: string) => void;
}) {
  const resumen = useAgendaResumen({ desde: `${anio}-01-01`, hasta: `${anio}-12-31` });

  const porMes = useMemo(() => {
    const cuenta = Array<number>(12).fill(0);
    for (const d of resumen.data?.porDia ?? []) {
      const mes = Number(d.dia.slice(5, 7)) - 1;
      if (mes >= 0 && mes < 12) cuenta[mes] += d.turnos;
    }
    return cuenta;
  }, [resumen.data]);

  const total = porMes.reduce((n, c) => n + c, 0);
  // Para que la barra más larga llene la fila y el resto se compare
  // contra ella. Sin turnos no hay barras que dibujar.
  const pico = Math.max(...porMes, 0);
  const hoy = hoyEnElSalon();
  const mesDeHoy = hoy.slice(0, 4) === String(anio) ? Number(hoy.slice(5, 7)) - 1 : -1;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl text-foreground">{anio}</h2>
          <p className="text-sm text-muted-foreground">
            {resumen.isLoading
              ? "Buscando turnos…"
              : `${total} ${total === 1 ? "turno" : "turnos"} en el año`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onAnio(anio - 1)}
            aria-label="Año anterior"
            className="rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-champagne"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => onAnio(Number(hoy.slice(0, 4)))}
            className="rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-champagne"
          >
            Este año
          </button>
          <button
            type="button"
            onClick={() => onAnio(anio + 1)}
            aria-label="Año siguiente"
            className="rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-champagne"
          >
            →
          </button>
        </div>
      </header>

      {resumen.isError && (
        <p className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {(resumen.error as Error).message}
        </p>
      )}

      <ul className="overflow-hidden rounded-3xl border border-border bg-card">
        {MESES.map((nombre, i) => {
          const cuantos = porMes[i];
          const esEsteMes = i === mesDeHoy;
          const mes = `${anio}-${String(i + 1).padStart(2, "0")}`;

          return (
            <li key={nombre} className="border-b border-border/60 last:border-b-0">
              <button
                type="button"
                onClick={() => onMes(mes)}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-cream/50 ${
                  esEsteMes ? "bg-champagne/30" : ""
                }`}
              >
                <span
                  className={`w-24 shrink-0 text-sm ${esEsteMes ? "font-medium text-foreground" : "text-foreground/85"}`}
                >
                  {nombre}
                </span>

                {/* La barra es comparación, no dato: el número está al
                    lado. Por eso no lleva eje ni escala. */}
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-background">
                  {cuantos > 0 && pico > 0 && (
                    <span
                      className="block h-full rounded-full bg-champagne-deep/70"
                      style={{ width: `${Math.max(2, Math.round((cuantos / pico) * 100))}%` }}
                    />
                  )}
                </span>

                <span className="w-20 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
                  {cuantos > 0 ? `${cuantos} ${cuantos === 1 ? "turno" : "turnos"}` : "—"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
