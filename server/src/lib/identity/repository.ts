/**
 * Acceso a la identidad de clientas.
 *
 * Toda la lógica de a-quién-corresponde y qué-puede-ver vive en la RPC
 * `resolve_customer_identity`, en una sola transacción. Acá no se decide
 * nada: si la decisión estuviera partida entre SQL y TypeScript, sería
 * cuestión de tiempo que las dos mitades dejaran de coincidir.
 */

import type { SupabaseAdminClient } from "../supabase";

export interface IdentityResolution {
  outcome: "known" | "matched_email" | "pending_link" | "created" | "needs_phone";
  customer_id?: string;
  first_name?: string | null;
  link_status?: "linked" | "pending";
  can_see_history: boolean;
}

export async function resolveCustomerIdentity(
  admin: SupabaseAdminClient,
  params: {
    provider: "google" | "password" | "manual";
    subject: string | null;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
  },
): Promise<IdentityResolution> {
  const { data, error } = await admin.rpc("resolve_customer_identity", {
    p_provider: params.provider,
    p_subject: params.subject,
    p_email: params.email,
    p_first_name: params.firstName ?? null,
    p_last_name: params.lastName ?? null,
    p_phone: params.phone ?? null,
  });
  if (error) throw error;
  return data as IdentityResolution;
}

export interface RecentService {
  service_slug: string;
  service_name: string;
  length_tier: string | null;
  last_done_at: string;
  times_done: number;
}

/** Servicios efectivamente REALIZADOS. Una reserva cancelada no cuenta. */
export async function loadRecentServices(
  admin: SupabaseAdminClient,
  customerId: string,
  limit = 3,
): Promise<RecentService[]> {
  const { data, error } = await admin.rpc("recent_services", {
    p_customer_id: customerId,
    p_limit: limit,
  });
  if (error) throw error;
  return (data ?? []) as RecentService[];
}

export interface PendingLink {
  id: string;
  customerId: string;
  email: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
}

export async function listPendingLinks(admin: SupabaseAdminClient): Promise<PendingLink[]> {
  const { data, error } = await admin
    .from("customer_identities")
    .select(
      "id, customer_id, email, created_at, customers!inner(first_name, last_name, phone_e164)",
    )
    .eq("link_status", "pending")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => {
    const row = r as unknown as {
      id: string;
      customer_id: string;
      email: string;
      created_at: string;
      customers: { first_name: string; last_name: string | null; phone_e164: string };
    };
    return {
      id: row.id,
      customerId: row.customer_id,
      email: row.email,
      createdAt: row.created_at,
      customerName: `${row.customers.first_name}${row.customers.last_name ? ` ${row.customers.last_name}` : ""}`,
      customerPhone: row.customers.phone_e164,
    };
  });
}

export async function resolvePendingLink(
  admin: SupabaseAdminClient,
  params: {
    identityId: string;
    approve: boolean;
    actorId?: string | null;
    actorLabel?: string | null;
  },
): Promise<{ resolved: boolean; approved: boolean }> {
  const { data, error } = await admin.rpc("resolve_pending_link", {
    p_identity_id: params.identityId,
    p_approve: params.approve,
    p_actor_id: params.actorId ?? null,
    p_actor_label: params.actorLabel ?? null,
  });
  if (error) throw error;
  return data as { resolved: boolean; approved: boolean };
}
