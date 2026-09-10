/**
 * Quién puede entrar al panel.
 *
 * Igual que el resto de la administración, acá no hay ninguna regla: todo
 * pasa por funciones de la base que verifican el rol de quien llama,
 * validan y auditan. La ruta HTTP tiene su propio guard; que la regla
 * esté además en la base es a propósito, y es lo que sostiene la
 * invariante de que el salón nunca queda sin dueña —incluso frente a un
 * UPDATE escrito a mano.
 */
import type { SupabaseAdminClient } from "../supabase";

export class StaffAdminError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "StaffAdminError";
  }
}

function rethrow(error: { message?: string } | null): never {
  throw new StaffAdminError(error?.message ?? "unknown_error");
}

export interface StaffRow {
  id: string;
  displayName: string;
  email: string;
  /** El slug del rol. Dejó de ser una lista fija cuando Sol pudo armarlos. */
  role: string;
  isActive: boolean;
  createdAt: string;
}

export async function listStaff(admin: SupabaseAdminClient): Promise<StaffRow[]> {
  const { data, error } = await admin.rpc("list_staff_members");
  if (error) rethrow(error);
  return (
    (data ?? []) as {
      id: string;
      display_name: string;
      email: string;
      role: string;
      is_active: boolean;
      created_at: string;
    }[]
  ).map((r) => ({
    id: r.id,
    displayName: r.display_name,
    email: r.email,
    role: r.role,
    isActive: r.is_active,
    createdAt: r.created_at,
  }));
}

export async function inviteStaff(
  admin: SupabaseAdminClient,
  p: {
    email: string;
    displayName?: string | null;
    role: string;
    actorId: string;
    actorLabel?: string | null;
  },
) {
  const { data, error } = await admin.rpc("invite_staff_member", {
    p_email: p.email,
    p_display_name: p.displayName ?? null,
    p_role: p.role,
    p_actor_id: p.actorId,
    p_actor_label: p.actorLabel ?? null,
  });
  if (error) rethrow(error);
  return data as { id: string; reingreso: boolean };
}

export async function setStaffActive(
  admin: SupabaseAdminClient,
  p: { staffId: string; active: boolean; actorId: string; actorLabel?: string | null },
) {
  const { data, error } = await admin.rpc("set_staff_active", {
    p_staff_id: p.staffId,
    p_active: p.active,
    p_actor_id: p.actorId,
    p_actor_label: p.actorLabel ?? null,
  });
  if (error) rethrow(error);
  return data as { id: string; activa: boolean; sin_cambios: boolean };
}

export async function setStaffRole(
  admin: SupabaseAdminClient,
  p: {
    staffId: string;
    role: string;
    actorId: string;
    actorLabel?: string | null;
  },
) {
  const { data, error } = await admin.rpc("set_staff_role", {
    p_staff_id: p.staffId,
    p_role: p.role,
    p_actor_id: p.actorId,
    p_actor_label: p.actorLabel ?? null,
  });
  if (error) rethrow(error);
  return data as { id: string; rol: string; sin_cambios: boolean };
}

/**
 * Qué se le dice a quien está mirando la pantalla.
 *
 * Cada mensaje explica qué hacer, no sólo qué falló: un 409 que dice
 * «conflicto» obliga a adivinar, y quien está del otro lado no tiene por
 * qué saber qué es un conflicto.
 */
export const STAFF_ADMIN_MESSAGES: Record<
  string,
  { status: 400 | 403 | 404 | 409; message: string }
> = {
  solo_la_duena: {
    status: 403,
    message: "Esto lo puede hacer sólo la administradora principal.",
  },
  email_invalido: { status: 400, message: "Revisá el correo: no parece una dirección válida." },
  rol_invalido: { status: 400, message: "Ese rol no existe." },
  ya_esta: { status: 409, message: "Esa persona ya tiene acceso al panel." },
  persona_no_encontrada: { status: 404, message: "No encontramos a esa persona." },
  no_a_vos_misma: {
    status: 409,
    message:
      "No podés sacarte el acceso ni cambiarte el rol a vos misma. Te lo tiene que hacer otra administradora.",
  },
  sin_duena: {
    status: 409,
    message:
      "El salón no puede quedar sin ninguna administradora. Nombrá a otra antes de hacer este cambio.",
  },
};

/* ------------------------------------------------------------------ */
/*  El registro de cambios                                            */
/* ------------------------------------------------------------------ */

export interface AuditRow {
  id: number;
  cuando: string;
  actorId: string | null;
  quien: string;
  esSistema: boolean;
  accion: string;
  entityType: string | null;
  entityId: string | null;
  sobre: string | null;
  detalle: Record<string, unknown> | null;
}

export async function readAuditLog(
  admin: SupabaseAdminClient,
  p: {
    desde?: string | null;
    hasta?: string | null;
    actorId?: string | null;
    entityType?: string | null;
    cursor?: number | null;
    limit?: number;
  },
): Promise<AuditRow[]> {
  const { data, error } = await admin.rpc("read_audit_log", {
    p_desde: p.desde ?? null,
    p_hasta: p.hasta ?? null,
    p_actor_id: p.actorId ?? null,
    p_entity_type: p.entityType ?? null,
    p_cursor: p.cursor ?? null,
    p_limit: p.limit ?? 50,
  });
  if (error) rethrow(error);
  return (
    (data ?? []) as {
      id: number;
      cuando: string;
      actor_id: string | null;
      quien: string;
      es_sistema: boolean;
      accion: string;
      entity_type: string | null;
      entity_id: string | null;
      sobre: string | null;
      detalle: Record<string, unknown> | null;
    }[]
  ).map((r) => ({
    id: r.id,
    cuando: r.cuando,
    actorId: r.actor_id,
    quien: r.quien,
    esSistema: r.es_sistema,
    accion: r.accion,
    entityType: r.entity_type,
    entityId: r.entity_id,
    sobre: r.sobre,
    detalle: r.detalle,
  }));
}

export async function auditActors(admin: SupabaseAdminClient) {
  const { data, error } = await admin.rpc("audit_actors");
  if (error) rethrow(error);
  return ((data ?? []) as { actor_id: string | null; quien: string; cuantos: number }[]).map(
    (r) => ({ actorId: r.actor_id, quien: r.quien, cuantos: Number(r.cuantos) }),
  );
}
