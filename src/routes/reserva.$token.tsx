/**
 * Estado de una reserva, por su token público.
 *
 * Es la pantalla a la que vuelve la clienta desde Mercado Pago, así que
 * tiene que contestar lo que trae en la cabeza en ese momento: ¿quedó
 * tomado mi turno? Y si el pago no llegó, ofrecerle terminar.
 *
 * La confirmación la da el webhook, no el navegador: volver de Mercado
 * Pago con `?pago=ok` no confirma nada por sí solo, sólo cambia lo que
 * se le explica mientras el estado real termina de llegar.
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { useBooking, useDepositCheckout } from "@/lib/api/booking-hooks";
import { formatPrice } from "@/lib/catalog-context";

export const Route = createFileRoute("/reserva/$token")({
  head: () => ({
    meta: [{ title: "Sol Mai · Tu reserva" }],
  }),
  component: BookingStatus,
});

const DIA = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MES = [
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

/** Fecha en hora del salón (UTC-3), no en la del dispositivo. */
function formatWhen(iso: string): string {
  const local = new Date(new Date(iso).getTime() - 180 * 60_000);
  const hh = String(local.getUTCHours()).padStart(2, "0");
  const mm = String(local.getUTCMinutes()).padStart(2, "0");
  return `${DIA[local.getUTCDay()]} ${local.getUTCDate()} de ${MES[local.getUTCMonth()]}, ${hh}:${mm}`;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-svh bg-background px-4 py-10">
      <div className="mx-auto w-full max-w-lg">
        <div className="rounded-3xl border border-champagne-deep/20 bg-card p-6 shadow-sm sm:p-8">
          {children}
        </div>
        <Link
          to="/"
          className="mt-6 inline-flex rounded-full border border-border bg-card px-4 py-2 text-sm text-foreground transition-colors hover:border-champagne"
        >
          ← Volver al inicio
        </Link>
      </div>
    </main>
  );
}

function BookingStatus() {
  const { token } = Route.useParams();
  const { data: booking, isLoading, isError } = useBooking(token);
  const checkout = useDepositCheckout();

  if (isLoading) {
    return (
      <Shell>
        <p className="text-muted-foreground">Buscando tu reserva…</p>
      </Shell>
    );
  }

  if (isError || !booking) {
    return (
      <Shell>
        <h1 className="mb-2 text-xl text-foreground">No encontramos esa reserva</h1>
        <p className="text-sm text-muted-foreground">
          Puede que el enlace esté incompleto. Si tenés dudas, escribinos y lo vemos juntas.
        </p>
      </Shell>
    );
  }

  const main = booking.items.find((item) => item.role === "main") ?? booking.items[0];
  const holdExpired =
    booking.status === "pending_payment" &&
    booking.paymentRequiredUntil !== null &&
    new Date(booking.paymentRequiredUntil).getTime() <= Date.now();

  const heading =
    booking.status === "confirmed" || booking.status === "attended"
      ? "Tu turno está confirmado"
      : booking.status === "cancelled"
        ? "Este turno fue cancelado"
        : booking.status === "expired" || holdExpired
          ? "Se venció el tiempo para reservar"
          : "Falta la seña para dejarlo tomado";

  return (
    <Shell>
      <h1 className="mb-1 text-xl text-foreground">{heading}</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {main?.name} · {formatWhen(booking.startsAt)}
      </p>

      {(booking.status === "confirmed" || booking.status === "attended") && (
        <p className="text-sm text-muted-foreground">
          Te esperamos. Si necesitás cambiarlo, escribinos con 24 horas de anticipación.
        </p>
      )}

      {booking.status === "pending_payment" && !holdExpired && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Reservás con una seña de {formatPrice(booking.depositAmount)}. El resto lo abonás en el
            salón.
          </p>

          <button
            type="button"
            disabled={checkout.isPending}
            onClick={() =>
              checkout.mutate(token, {
                onSuccess: (result) => {
                  if (result.checkoutUrl) window.location.href = result.checkoutUrl;
                },
              })
            }
            className="w-full rounded-full bg-champagne-deep px-5 py-3 text-sm text-background transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {checkout.isPending ? "Abriendo el pago…" : "Pagar la seña"}
          </button>

          {checkout.isSuccess && !checkout.data?.checkoutUrl && (
            <p className="text-sm text-muted-foreground">
              {checkout.data?.message ??
                "Te vamos a escribir para coordinar la seña y dejar el turno tomado."}
            </p>
          )}
          {checkout.isError && (
            <p className="text-sm text-destructive">{(checkout.error as Error).message}</p>
          )}
        </div>
      )}

      {(booking.status === "expired" || holdExpired) && (
        <p className="text-sm text-muted-foreground">
          El horario volvió a quedar libre para otras clientas. Podés elegir uno nuevo y lo tomamos
          al toque.
        </p>
      )}

      {booking.status === "cancelled" && (
        <p className="text-sm text-muted-foreground">
          {booking.refundDue
            ? "Te devolvemos la seña."
            : "Si te quedó alguna duda, escribinos y lo vemos."}
        </p>
      )}
    </Shell>
  );
}
