/**
 * Hooks del panel interno.
 *
 * La agenda es la pantalla que se abre veinte veces por día: se refresca
 * sola y no cachea de más, porque un turno que entró hace un minuto tiene
 * que estar ahí.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "./admin-client";
import type { StaffIdentity } from "../staff-session";

export type BookingSource = "online" | "manual" | "phone" | "whatsapp" | "walk_in";

export interface AgendaEntry {
  id: string;
  publicToken: string;
  startsAt: string;
  endsAt: string;
  shownDurationMin: number;
  status: string;
  source: BookingSource;
  depositStatus: string;
  createdViaOverride: boolean;
  overrideReason: string | null;
  area: string;
  priceEstimatedMin: number;
  priceDisplayMode: string;
  depositAmount: number;
  customerNote: string | null;
  customer: {
    id: string;
    firstName: string;
    lastName: string | null;
    phone: string;
    email: string | null;
  };
  services: string[];
}

export interface AgendaPage {
  date: string;
  days: number;
  entries: AgendaEntry[];
}

export function useStaffIdentity() {
  return useQuery({
    queryKey: ["admin", "me"],
    queryFn: () => adminApi.get<StaffIdentity>("/me"),
    retry: false,
    staleTime: 5 * 60_000,
  });
}

export function useAgenda(params: { date: string; days: number; area?: string }) {
  const search = new URLSearchParams({ date: params.date, days: String(params.days) });
  if (params.area) search.set("area", params.area);
  return useQuery({
    queryKey: ["admin", "agenda", search.toString()],
    queryFn: () => adminApi.get<AgendaPage>(`/agenda?${search.toString()}`),
    // Un turno tomado hace un minuto tiene que aparecer.
    staleTime: 10_000,
    refetchInterval: 60_000,
  });
}

export interface AreaRow {
  id: string;
  slug: string;
  name: string;
  capacity: number;
  isBookableOnline: boolean;
  isActive: boolean;
}

export function useAreas() {
  return useQuery({
    queryKey: ["admin", "areas"],
    queryFn: () => adminApi.get<AreaRow[]>("/areas"),
    staleTime: 10 * 60_000,
  });
}

export interface CapacityCheck {
  found: boolean;
  area?: string;
  area_name?: string;
  capacity?: number;
  peak?: number;
  area_closed?: boolean;
  fits?: boolean;
  message?: string | null;
}

export function useCapacityCheck() {
  return useMutation({
    mutationFn: (input: { area: string; startsAt: string; endsAt: string }) => {
      const q = new URLSearchParams(input);
      return adminApi.get<CapacityCheck>(`/capacity?${q.toString()}`);
    },
  });
}

export interface CreateInternalBooking {
  serviceSlug: string;
  lengthTier?: string | null;
  extraCodes?: string[];
  startsAt: string;
  customer: { firstName: string; lastName?: string; phone: string; email?: string };
  note?: string;
  source: Exclude<BookingSource, "online">;
  override?: boolean;
  overrideReason?: string;
}

export function useCreateInternalBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateInternalBooking) =>
      adminApi.post<{ id: string; status: string; created_via_override: boolean }>(
        "/bookings",
        input,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "agenda"] }),
  });
}

export function useMarkNoShow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bookingId: string) =>
      adminApi.post<{
        status: string;
        deposit_status: string;
        deposit_amount: number;
        message: string;
      }>(`/bookings/${bookingId}/no-show`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "agenda"] }),
  });
}

export function useUpdateBookingStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { bookingId: string; status: string }) =>
      adminApi.patch<AgendaEntry>(`/bookings/${input.bookingId}/status`, { status: input.status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "agenda"] }),
  });
}

export interface CustomerHit {
  id: string;
  firstName: string;
  lastName: string | null;
  phone: string;
  email: string | null;
  lastVisitAt?: string | null;
}

export function useCustomerSearch(term: string) {
  return useQuery({
    queryKey: ["admin", "customers", term],
    queryFn: () => adminApi.get<CustomerHit[]>(`/customers?q=${encodeURIComponent(term)}`),
    enabled: term.trim().length >= 2,
    staleTime: 30_000,
  });
}
