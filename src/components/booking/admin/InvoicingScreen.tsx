import { useState } from "react";
import {
  useInvoicingSummary,
  useMarkInvoiced,
  usePendingInvoices,
  useStaffIdentity,
  useUnmarkInvoiced,
  type PendingInvoice,
} from "@/lib/api/admin-hooks";
import { puede } from "@/lib/staff-session";

const pesos = (n: number) => `$${n.toLocaleString("es-AR")}`;

/**
 * «Finanzas · Facturación».
 *
 * ESTA PANTALLA NO EMITE COMPROBANTES, Y ESO ESTÁ DECIDIDO.
 *
 * Integrar ARCA exigiría un certificado digital atado al CUIT de Sol
 * viviendo en nuestra infraestructura —una llave que emite documentos
 * fiscales a su nombre— para ahorrarle los treinta segundos que tarda en
 * emitir una factura C desde el celular. Ese canje no cierra (§8.3).
 *
 * El problema real no es emitir: es **no saber qué falta emitir**. Al
 * cerrar el día, hasta hoy nada le decía a Sol qué atenciones todavía no
 * tienen comprobante. Eso es lo único que esta pantalla resuelve, y por
 * eso el dato que muestra grande es el nombre y el importe listos para
 * tipear en la app de ARCA.
 *
 * EL TOPE DE LA CATEGORÍA NO LO ESCRIBIMOS NOSOTROS
 *
 * Pasarse del límite anual obliga a recategorizarse, así que el acumulado
 * sirve. Pero el número lo fija ARCA y cambia con la inflación: un tope
 * viejo daría una tranquilidad falsa sobre una obligación fiscal. Si no
 * está cargado, la pantalla dice que no lo sabe.
 */
export function InvoicingScreen() {
  const identity = useStaffIdentity();
  const veFinanzas = puede(identity.data, "finanzas");
  const puedeMarcar = puede(identity.data, "finanzas", "full");
  const pendientes = usePendingInvoices(veFinanzas);
  const resumen = useInvoicingSummary(veFinanzas);
  const [aviso, setAviso] = useState<string | null>(null);
  // La mutación vive acá, no en la fila. Al anotar una factura la fila
  // deja de estar pendiente y se desmonta, y React Query descarta los
  // callbacks de un componente desmontado: el aviso nunca llegaba a
  // mostrarse aunque la factura sí quedaba anotada.
  const marcar = useMarkInvoiced();
  const deshacer = useUnmarkInvoiced();
  // Lo último que se anotó, para poder volver atrás. Tipear mal un
  // importe es lo más fácil que hay, y sin esto la única salida sería
  // pedirle a alguien que toque la base a mano.
  const [ultima, setUltima] = useState<{ bookingId: string; clienta: string } | null>(null);

  if (!veFinanzas) return null;

  const filas = pendientes.data ?? [];

  return (
    <div className="space-y-6">
      <section>
        <h2 className="font-serif text-xl text-foreground">Facturación</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Las facturas las emitís vos desde ARCA. Acá marcás cuáles ya emitiste, para no perder
          ninguna de vista.
        </p>

        {aviso && (
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-champagne-deep/30 bg-cream/60 px-4 py-3 text-sm text-foreground/85">
            <span className="min-w-0 flex-1">{aviso}</span>
            {ultima && puedeMarcar && (
              <button
                aria-label={`Deshacer la factura de ${ultima.clienta}`}
                className="shrink-0 rounded-full border border-border bg-card px-3 py-1 text-xs disabled:opacity-50"
                disabled={deshacer.isPending}
                onClick={() => {
                  const u = ultima;
                  deshacer.mutate(
                    { bookingId: u.bookingId },
                    {
                      onSuccess: () => {
                        setUltima(null);
                        setAviso(`Volvimos atrás: la atención de ${u.clienta} figura sin facturar.`);
                      },
                      onError: (e) =>
                        setAviso(e instanceof Error ? e.message : "No se pudo deshacer."),
                    },
                  );
                }}
                type="button"
              >
                Deshacer
              </button>
            )}
          </div>
        )}

        <Resumen resumen={resumen.data} />
      </section>

      <section>
        <h3 className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Falta facturar
        </h3>

        {pendientes.isLoading && <p className="mt-3 text-sm text-muted-foreground">Cargando…</p>}

        {!pendientes.isLoading && filas.length === 0 && (
          <p className="mt-3 rounded-2xl border border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
            No queda nada por facturar.
          </p>
        )}

        <div className="mt-3 space-y-2">
          {filas.map((f) => (
            <Pendiente
              key={f.bookingId}
              fila={f}
              marcar={marcar}
              puedeMarcar={puedeMarcar}
              onAviso={setAviso}
              onAnotada={setUltima}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function Resumen({ resumen }: { resumen: ReturnType<typeof useInvoicingSummary>["data"] }) {
  if (!resumen) return null;

  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-3">
      <Dato titulo={`Facturado en ${resumen.anio}`} valor={pesos(resumen.facturado)} />
      <Dato
        titulo="Falta facturar"
        valor={pesos(resumen.pendiente)}
        pie={
          resumen.pendiente !== resumen.pendienteCobrado
            ? `${resumen.cuantosPendientes} ${
                resumen.cuantosPendientes === 1 ? "atención" : "atenciones"
              } · entró ${pesos(resumen.pendienteCobrado)}`
            : `${resumen.cuantosPendientes} ${
                resumen.cuantosPendientes === 1 ? "atención" : "atenciones"
              }`
        }
      />
      <Dato
        titulo="Tope de tu categoría"
        valor={resumen.topeCargado && resumen.tope !== null ? pesos(resumen.tope) : "No disponible"}
        pie={
          resumen.topeCargado && resumen.tope !== null
            ? `Llevás el ${Math.round((resumen.facturado / resumen.tope) * 100)}%`
            : "Lo carga tu contador en Configuración"
        }
        apagado={!resumen.topeCargado}
      />
    </div>
  );
}

function Dato({
  titulo,
  valor,
  pie,
  apagado,
}: {
  titulo: string;
  valor: string;
  pie?: string;
  apagado?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-3">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{titulo}</p>
      <p
        className={
          apagado
            ? "mt-1 text-lg text-muted-foreground"
            : "mt-1 text-lg tabular-nums text-foreground"
        }
      >
        {valor}
      </p>
      {pie && <p className="mt-0.5 text-xs text-muted-foreground">{pie}</p>}
    </div>
  );
}

function Pendiente({
  fila,
  marcar,
  puedeMarcar,
  onAviso,
  onAnotada,
}: {
  fila: PendingInvoice;
  marcar: ReturnType<typeof useMarkInvoiced>;
  puedeMarcar: boolean;
  onAviso: (s: string | null) => void;
  onAnotada: (u: { bookingId: string; clienta: string } | null) => void;
}) {
  // Sólo se bloquea la fila que se está guardando, no todas.
  const guardando = marcar.isPending && marcar.variables?.bookingId === fila.bookingId;
  const [abierto, setAbierto] = useState(false);
  // Arranca en el precio de la atención, que es lo que se factura casi
  // siempre. Que sea editable es lo que permite que el contador de Sol
  // decida otra cosa —facturar sólo lo cobrado, por ejemplo— sin que el
  // sistema opine.
  const [importe, setImporte] = useState(String(fila.precio));
  const [fecha, setFecha] = useState(() => hoyEnElSalon());
  const [numero, setNumero] = useState("");

  const cuando = new Date(fila.cuando).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
  });

  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-foreground">
            {fila.clienta || "Sin nombre"}
            <span className="ml-2 text-xs text-muted-foreground">{cuando}</span>
          </p>
          <p className="truncate text-xs text-muted-foreground">{fila.servicios}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm tabular-nums text-foreground">{pesos(fila.precio)}</p>
          {/* El saldo impago se dice sólo cuando existe. Callarlo haría que
              Sol facturara sobre plata que todavía no entró. */}
          {fila.cobrado !== fila.precio && (
            <p className="text-[11px] tabular-nums text-muted-foreground">
              entró {pesos(fila.cobrado)}
            </p>
          )}
        </div>
        {puedeMarcar && (
          <button
            aria-label={`Marcar como facturada la atención de ${fila.clienta}`}
            className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs font-medium"
            onClick={() => setAbierto((v) => !v)}
            type="button"
          >
            {abierto ? "Cancelar" : "Ya la facturé"}
          </button>
        )}
      </div>

      {abierto && (
        <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-border pt-3">
          <label className="text-xs text-muted-foreground">
            Importe
            <input
              aria-label={`Importe facturado a ${fila.clienta}`}
              className="mt-1 block w-32 rounded-xl border border-border bg-background px-2 py-1.5 text-sm tabular-nums text-foreground"
              inputMode="numeric"
              onChange={(e) => setImporte(e.target.value.replace(/[^\d]/g, ""))}
              value={importe}
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Fecha
            <input
              aria-label={`Fecha del comprobante de ${fila.clienta}`}
              className="mt-1 block rounded-xl border border-border bg-background px-2 py-1.5 text-sm text-foreground"
              max={hoyEnElSalon()}
              onChange={(e) => setFecha(e.target.value)}
              type="date"
              value={fecha}
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Número <span className="text-muted-foreground/70">(si lo tenés)</span>
            <input
              aria-label={`Número de comprobante de ${fila.clienta}`}
              className="mt-1 block w-40 rounded-xl border border-border bg-background px-2 py-1.5 text-sm text-foreground"
              onChange={(e) => setNumero(e.target.value)}
              placeholder="00001-00000123"
              value={numero}
            />
          </label>
          <button
            className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
            disabled={guardando || Number(importe) <= 0 || fecha === ""}
            onClick={() => {
              onAviso(null);
              marcar.mutate(
                {
                  bookingId: fila.bookingId,
                  amount: Number(importe),
                  on: fecha,
                  number: numero.trim() || null,
                },
                {
                  onSuccess: () => {
                    onAnotada({ bookingId: fila.bookingId, clienta: fila.clienta });
                    onAviso(`Anotamos la factura de ${fila.clienta}.`);
                  },
                  onError: (e) => {
                    onAnotada(null);
                    onAviso(e instanceof Error ? e.message : "No se pudo anotar la factura.");
                  },
                },
              );
            }}
            type="button"
          >
            {guardando ? "Anotando…" : "Anotar"}
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Hoy en hora de Santa Fe. A las 21:00 acá ya es mañana en UTC, y una
 * fecha de comprobante adelantada un día la rechaza el servidor.
 */
function hoyEnElSalon(): string {
  const ahora = new Date();
  const salon = new Date(ahora.getTime() - 3 * 60 * 60 * 1000);
  return salon.toISOString().slice(0, 10);
}
