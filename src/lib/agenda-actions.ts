/**
 * Llegar y cerrar son dos hechos distintos aunque ambos usen `attended`.
 * Nunca abrir el formulario vacío sobre un cierre existente: sus cobros
 * reemplazarían los anteriores. La DB sigue validando las transiciones.
 */
export function agendaActions(entry: { status: string; hasServiceClosure?: boolean }) {
  return {
    markArrival: entry.status === "confirmed",
    closeService:
      (entry.status === "confirmed" || entry.status === "attended") &&
      entry.hasServiceClosure === false,
    manageBooking: entry.status === "confirmed" || entry.status === "pending_payment",
  };
}
