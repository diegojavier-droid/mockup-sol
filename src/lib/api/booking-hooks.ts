import {isSiteTest} from "@deployment/booking-policy";
import {invalidateAdminChange} from "./admin-invalidation";
/**
 * Hooks del flujo de reserva contra el API real.
 *
 * El precio, la duración y la disponibilidad los calcula el backend
 * (D3): acá sólo se piden y se muestran. El frontend nunca cotiza.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type { ApiBookingView, ApiServiceDetail } from "./catalog-types";

import {
  availabilityQueryOptions,
  quoteQueryOptions,
  submitBooking,
  type QuoteInput,
} from "./booking-requests";

export { AVAILABILITY_WINDOW_DAYS } from "./booking-requests";
export type { QuoteInput, CreateBookingInput } from "./booking-requests";

export function useServiceDetail(slug: string | null) {
  return useQuery({
    queryKey: ["catalog", "service", slug],
    queryFn: () => api.get<ApiServiceDetail>(`/catalog/services/${slug}`),
    enabled: Boolean(slug),
    staleTime: 5 * 60_000,
  });
}

export function useQuote(input: QuoteInput) {
  const detail = useServiceDetail(input.serviceSlug);
  const query = useQuery(quoteQueryOptions(input, detail.data));
  return {
    ...query,
    error: detail.error ?? query.error,
    isLoading: detail.isLoading || query.isLoading,
  };
}

export function useAvailability(input: QuoteInput & { days?: number }) {
  const detail = useServiceDetail(input.serviceSlug);
  const query = useQuery(availabilityQueryOptions(input, detail.data));
  return {
    ...query,
    error: detail.error ?? query.error,
    isLoading: detail.isLoading || query.isLoading,
  };
}

export function useCreateBooking() {
  const qc=useQueryClient();
  return useMutation({ mutationFn: submitBooking, onSuccess:()=>invalidateAdminChange(qc,"booking") });
}

export function useBooking(token: string | null) {
  return useQuery({
    queryKey: ["booking", token],
    queryFn: () => api.get<ApiBookingView>(`/bookings/${token}`),
    enabled: Boolean(token),
    retry: false,
  });
}

export function useDepositCheckout() {
  return useMutation({
    mutationFn: (token: string) => {
      if(isSiteTest) throw new Error("Los pagos están deshabilitados.");
      return api.post<{
        checkoutUrl: string | null;
        depositAmount: number;
        paymentRequiredUntil: string | null;
        message?: string;
      }>(`/payments/checkout/${token}`);
    },
  });
}

export function useCancelBooking() {
  const qc=useQueryClient();
  return useMutation({
    mutationFn: (input: { token: string; reason?: string }) =>
      api.post<{ status: string; refundDue: boolean; message: string }>(
        `/bookings/${input.token}/cancel`,
        { reason: input.reason },
      ),
    onSuccess:()=>invalidateAdminChange(qc,"booking"),
  });
}
