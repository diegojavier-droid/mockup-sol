/**
 * Hooks del flujo de reserva contra el API real.
 *
 * El precio, la duración y la disponibilidad los calcula el backend
 * (D3): acá sólo se piden y se muestran. El frontend nunca cotiza.
 */

import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "./client";
import type {
  ApiAvailability,
  ApiBookingView,
  ApiCreatedBooking,
  ApiQuote,
  ApiServiceDetail,
  LengthTier,
} from "./catalog-types";

export interface QuoteInput {
  serviceSlug: string | null;
  lengthTier?: LengthTier | null;
  personalization?: Record<string, string>;
  extraCodes?: string[];
}

export function useServiceDetail(slug: string | null) {
  return useQuery({
    queryKey: ["catalog", "service", slug],
    queryFn: () => api.get<ApiServiceDetail>(`/catalog/services/${slug}`),
    enabled: Boolean(slug),
    staleTime: 5 * 60_000,
  });
}

export function useQuote(input: QuoteInput) {
  return useQuery({
    queryKey: ["quote", input],
    queryFn: () =>
      api.post<ApiQuote>("/quote", {
        serviceSlug: input.serviceSlug,
        lengthTier: input.lengthTier ?? null,
        personalization: input.personalization ?? {},
        extraCodes: input.extraCodes ?? [],
      }),
    enabled: Boolean(input.serviceSlug),
    // Una cotización inválida (falta el largo) no se reintenta: es una
    // decisión pendiente de la clienta, no un fallo de red.
    retry: false,
    staleTime: 60_000,
  });
}

export function useAvailability(input: QuoteInput & { days?: number }) {
  const params = new URLSearchParams();
  if (input.serviceSlug) params.set("service", input.serviceSlug);
  if (input.lengthTier) params.set("length", input.lengthTier);
  if (input.extraCodes?.length) params.set("extras", input.extraCodes.join(","));
  const personalization = Object.entries(input.personalization ?? {})
    .map(([k, v]) => `${k}:${v}`)
    .join(",");
  if (personalization) params.set("personalization", personalization);
  params.set("days", String(input.days ?? 21));

  return useQuery({
    queryKey: ["availability", params.toString()],
    queryFn: () => api.get<ApiAvailability>(`/availability?${params.toString()}`),
    enabled: Boolean(input.serviceSlug),
    retry: false,
    staleTime: 30_000,
  });
}

export interface CreateBookingInput extends QuoteInput {
  startsAt: string;
  customer: {
    firstName: string;
    lastName?: string;
    phone: string;
    email: string;
    acceptsMarketing?: boolean;
  };
  note?: string;
}

export function useCreateBooking() {
  return useMutation({
    mutationFn: (input: CreateBookingInput) =>
      api.post<ApiCreatedBooking>("/bookings", {
        serviceSlug: input.serviceSlug,
        lengthTier: input.lengthTier ?? null,
        personalization: input.personalization ?? {},
        extraCodes: input.extraCodes ?? [],
        startsAt: input.startsAt,
        customer: input.customer,
        note: input.note,
      }),
  });
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
    mutationFn: (token: string) =>
      api.post<{
        checkoutUrl: string | null;
        depositAmount: number;
        paymentRequiredUntil: string | null;
        message?: string;
      }>(`/payments/checkout/${token}`),
  });
}

export function useCancelBooking() {
  return useMutation({
    mutationFn: (input: { token: string; reason?: string }) =>
      api.post<{ status: string; refundDue: boolean; message: string }>(
        `/bookings/${input.token}/cancel`,
        { reason: input.reason },
      ),
  });
}
