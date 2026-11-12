import { Navigate } from "@tanstack/react-router";
import type { ApiCreatedBooking } from "@/lib/api/catalog-types";
import { solMaiContact } from "@/lib/sol-mai-contact";

export function BookingConfirmation({
  onClose,
  booking,
}: {
  onClose: () => void;
  booking: ApiCreatedBooking | null;
}) {
  // The existing status page reads the server on every reload. Replacing
  // the wizard URL also avoids returning to a submitted form with Back.
  // Do not persist the bearer token or a payment snapshot in the draft.
  if (booking) {
    return <Navigate to="/reserva/$token" params={{ token: booking.publicToken }} replace />;
  }

  // Older drafts saved paymentPending without a booking reference. There
  // is nothing trustworthy to recover: do not invent a $0 deposit, offer
  // payment or submit a second booking. Keep a way to contact the salon.
  return (
    <div className="flex min-h-screen items-start justify-center bg-background px-4 py-6 sm:items-center sm:py-12">
      <div className="w-full max-w-md space-y-4 rounded-[2rem] border border-border bg-card px-5 py-5 sm:px-8 sm:py-8">
        <h1 className="text-xl text-foreground">No encontramos esa reserva</h1>
        <p className="text-sm text-muted-foreground">
          Si tenés dudas, escribinos y lo vemos juntas.
        </p>
        <p className="break-words text-sm text-muted-foreground">
          <span className="break-all">{solMaiContact.email}</span> · {solMaiContact.whatsappDisplay}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-full border border-border px-4 py-3 text-sm text-foreground"
        >
          Volver al inicio
        </button>
      </div>
    </div>
  );
}
