/**
 * Hooks del panel interno.
 *
 * La agenda es la pantalla que se abre veinte veces por día: se refresca
 * sola y no cachea de más, porque un turno que entró hace un minuto tiene
 * que estar ahí.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "./admin-client";
import { readStaffToken, type StaffIdentity } from "../staff-session";

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
  station: { id: string; code: string; name: string } | null;
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

/**
 * Quién está mirando el panel.
 *
 * `enabled` importa: sin token guardado la consulta NO se dispara. Antes
 * salía igual, cobraba un 401 y quedaba marcada como error para siempre
 * —`retry: false`, sin nada que la reintentara—. Como la pantalla decide
 * mostrar el login mirando ese error, pegar el token no servía de nada:
 * había que recargar la página para poder entrar. Le pasaba a cualquiera
 * que abriera el panel sin sesión, que es la primera vez de todo el
 * mundo.
 */
export function useStaffIdentity() {
  return useQuery({
    queryKey: ["admin", "me"],
    queryFn: () => adminApi.get<StaffIdentity>("/me"),
    enabled: Boolean(readStaffToken()),
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

export interface PendingRefund {
  booking_id: string;
  amount: number;
  starts_at: string;
  cancelled_at: string | null;
  status: string;
  customer: string;
  phone: string | null;
  email: string | null;
}

/**
 * Las señas que se prometió devolver y todavía no volvieron.
 *
 * Se refresca seguido a propósito: es una lista de plata ajena esperando,
 * no un informe.
 */
export function usePendingRefunds() {
  return useQuery({
    queryKey: ["admin", "refunds-pending"],
    queryFn: () =>
      adminApi.get<{ totalAmount: number; items: PendingRefund[] }>("/refunds-pending"),
    staleTime: 30_000,
  });
}

/**
 * Deshace una ausencia que marcó el sistema.
 *
 * Existe porque la marca automática puede equivocarse de una sola manera:
 * la clienta vino y nadie tocó «Llegó». Sin esto, esa clienta queda
 * anotada como ausente y sin su seña, por una distracción.
 */
export interface ServiceTierRow {
  slug: string;
  name: string;
  area: string;
  lengthTier: string;
  priceMain: number;
  durationMin: number;
  isActive: boolean;
}

export interface ProductRow {
  id: string;
  name: string;
  brand: string | null;
  salePrice: number | null;
  isActive: boolean;
}

/** El catálogo tal como Sol lo edita: un renglón por tramo de largo. */
export function useSalonServices(enabled: boolean) {
  return useQuery({
    queryKey: ["admin", "salon", "services"],
    queryFn: () => adminApi.get<ServiceTierRow[]>("/salon/services"),
    enabled,
    staleTime: 30_000,
  });
}

export function useSetServicePrice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { slug: string; lengthTier: string; priceMain: number; durationMin: number }) =>
      adminApi.post<Record<string, number | string>>(`/salon/services/${v.slug}/price`, {
        lengthTier: v.lengthTier,
        priceMain: v.priceMain,
        durationMin: v.durationMin,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "salon", "services"] });
      // El catálogo público también cambia: si no se refresca, Sol ve el
      // precio nuevo en su panel y la clienta el viejo en la web.
      qc.invalidateQueries({ queryKey: ["catalog"] });
    },
  });
}

export function useSalonProducts(enabled: boolean) {
  return useQuery({
    queryKey: ["admin", "salon", "products"],
    queryFn: () => adminApi.get<ProductRow[]>("/salon/products"),
    enabled,
    staleTime: 30_000,
  });
}

export function useUpsertProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: {
      name: string;
      brand?: string | null;
      salePrice?: number | null;
      productId?: string | null;
    }) => adminApi.post<Record<string, unknown>>("/salon/products", v),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "salon", "products"] }),
  });
}

export function useSetProductActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { productId: string; active: boolean }) =>
      adminApi.post<Record<string, unknown>>(`/salon/products/${v.productId}/active`, {
        active: v.active,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "salon", "products"] }),
  });
}

export function useUpsertStation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { areaSlug: string; name: string; stationId?: string | null }) =>
      adminApi.post<{ id: string; accion: string }>("/salon/stations", v),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "stations"] });
      qc.invalidateQueries({ queryKey: ["admin", "capacity"] });
    },
  });
}

export function useSetStationActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { stationId: string; active: boolean }) =>
      adminApi.post<{ id: string; activa: boolean }>(`/salon/stations/${v.stationId}/active`, {
        active: v.active,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "stations"] });
      qc.invalidateQueries({ queryKey: ["admin", "capacity"] });
    },
  });
}

export interface CashMovement {
  hora: string;
  clienta: string;
  medio: string;
  concepto: string;
  monto: number;
  salida: boolean;
}

export interface CashRegister {
  dia: string;
  entro: number;
  devuelto: number;
  queda: number;
  por_medio: { medio: string; monto: number; cuantos: number }[];
  movimientos: CashMovement[];
}

/**
 * La caja del día. Sólo la ve Sol: la ruta está detrás del rol `owner` y
 * a quien atiende le responde 403, así que el panel no la pide.
 */
export function useCashRegister(enabled: boolean) {
  return useQuery({
    queryKey: ["admin", "cash-register"],
    queryFn: () => adminApi.get<CashRegister>("/cash-register"),
    enabled,
    staleTime: 60_000,
  });
}

export function useRevertAutoNoShow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bookingId: string) =>
      adminApi.post<{ status: string; message: string }>(`/bookings/${bookingId}/no-show/revert`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "agenda"] });
      qc.invalidateQueries({ queryKey: ["admin", "refunds-pending"] });
      qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    },
  });
}

export function useMarkRefundDone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bookingId: string) =>
      adminApi.post<{ status: string; amount?: number; message: string }>(
        `/bookings/${bookingId}/refund-done`,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "refunds-pending"] });
      qc.invalidateQueries({ queryKey: ["admin", "agenda"] });
    },
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

export type PaymentMethod = "efectivo" | "transferencia" | "mercado_pago" | "otro";

export interface CloseServiceInput {
  bookingId: string;
  finalPrice: number;
  servicesDone?: string;
  staffId?: string | null;
  durationMin?: number | null;
  formula?: string;
  /** NULL es válido y significa "no sabemos". Nunca se estima. */
  costAmount?: number | null;
  observation?: string;
  payments?: { amount: number; method: PaymentMethod; kind?: string; note?: string }[];
}

export function useCloseService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, ...body }: CloseServiceInput) =>
      adminApi.post<{
        booking_id: string;
        status: string;
        final_price: number;
        estimated: number;
        collected: number;
        outstanding: number;
        message: string;
      }>(`/bookings/${bookingId}/close`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "agenda"] }),
  });
}

export interface DashboardAreaOccupancy {
  area: string;
  name: string;
  sold_minutes: number;
  capacity_minutes: number;
  rate_pct: number | null;
}

export interface DashboardSummary {
  from: string;
  to: string;
  collected_amount: number;
  invoiced_amount: number;
  attended_count: number;
  average_ticket: number;
  bookings_by_channel: Record<string, number>;
  bookings_by_status: Record<string, number>;
  retained_deposits: number;
  new_customers: number;
  active_customers: number;
  occupancy: {
    basis: "stations";
    sold_minutes: number;
    capacity_minutes: number;
    rate_pct: number | null;
    by_area: DashboardAreaOccupancy[];
  };
  margin: { available: boolean; coverage: number; amount: number | null };
  top_services: Array<{ name: string; count: number }>;
}

export function useDashboard(params: { from: string; to: string }) {
  const search = new URLSearchParams({ from: params.from, to: params.to });
  return useQuery({
    queryKey: ["admin", "dashboard", search.toString()],
    queryFn: () => adminApi.get<DashboardSummary>(`/dashboard?${search.toString()}`),
    staleTime: 60_000,
  });
}

export interface Station {
  id: string;
  area: string;
  code: string;
  name: string;
  isActive: boolean;
  blockedUntil: string | null;
  blockReason: string | null;
}

export function useStations(area?: string) {
  const search = new URLSearchParams();
  if (area) search.set("area", area);
  return useQuery({
    queryKey: ["admin", "stations", search.toString()],
    queryFn: () => adminApi.get<Station[]>(`/stations?${search.toString()}`),
    staleTime: 60_000,
  });
}

export function useAssignStation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { bookingId: string; stationId: string | null }) =>
      adminApi.post<{ ok: true }>(`/bookings/${input.bookingId}/station`, {
        stationId: input.stationId,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "agenda"] });
    },
  });
}

export function useBlockStation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { stationId: string; startsAt: string; endsAt: string; reason: string }) =>
      adminApi.post<{ id: string; displacedBookings: number; message: string | null }>(
        `/stations/${input.stationId}/block`,
        { startsAt: input.startsAt, endsAt: input.endsAt, reason: input.reason },
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "agenda"] });
      void qc.invalidateQueries({ queryKey: ["admin", "stations"] });
    },
  });
}

export function useUnblockStation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (blockId: string) =>
      adminApi.post<{ ok: true }>(`/stations/blocks/${blockId}/remove`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "stations"] });
    },
  });
}
