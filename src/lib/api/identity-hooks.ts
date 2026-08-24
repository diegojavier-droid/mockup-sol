/**
 * Identidad de la clienta en el navegador.
 *
 * El token lo emite Supabase Auth (Google). Guardarlo no da acceso a
 * nada: el backend decide a qué ficha corresponde y si esa persona
 * puede ver ese historial. El teléfono nunca autentica.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "./client";

const TOKEN_KEY = "sol-mai-customer-token";

export function readCustomerToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function writeCustomerToken(token: string): void {
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* almacenamiento bloqueado: la sesión dura lo que la pestaña */
  }
}

export function clearCustomerToken(): void {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* nada que limpiar */
  }
}

async function identityRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = readCustomerToken();
  if (!token) throw new ApiError(401, "Iniciá sesión para continuar.");
  const response = await fetch(`/api/v1/identity${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const text = await response.text();
  const payload = text ? (JSON.parse(text) as { data?: T; error?: { message?: string } }) : {};
  if (response.status === 401) {
    clearCustomerToken();
    throw new ApiError(401, payload.error?.message ?? "Volvé a entrar.");
  }
  if (!response.ok) {
    throw new ApiError(response.status, payload.error?.message ?? "No pudimos identificarte.");
  }
  return payload.data as T;
}

export interface IdentitySession {
  outcome: string;
  firstName: string | null;
  canSeeHistory: boolean;
  linkStatus: string | null;
  needsPhone: boolean;
  /** Coincidió sólo el teléfono: el salón tiene que confirmar el vínculo. */
  pendingReview: boolean;
}

export function useIdentitySession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { phone?: string } = {}) =>
      identityRequest<IdentitySession>("/session", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["identity"] }),
  });
}

export interface RecentService {
  serviceSlug: string;
  serviceName: string;
  lengthTier: string | null;
  lastDoneAt: string;
  timesDone: number;
}

export function useRecentServices(enabled: boolean) {
  return useQuery({
    queryKey: ["identity", "recent"],
    queryFn: () =>
      identityRequest<{ firstName: string | null; services: RecentService[] }>("/recent"),
    enabled,
    retry: false,
    staleTime: 60_000,
  });
}
