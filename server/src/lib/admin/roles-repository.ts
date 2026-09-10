/**
 * Los roles y su matriz de permisos.
 *
 * Igual que el resto de la administración: acá no se decide nada. Las
 * funciones de la base verifican quién llama, validan y auditan. Que la
 * regla esté además en PostgreSQL es a propósito —es lo que sostiene que
 * a la administradora no se le pueda recortar un módulo ni siquiera con
 * un UPDATE escrito a mano.
 */
import type { SupabaseAdminClient } from "../supabase";
import type { MapaDePermisos, Modulo, NivelGuardado } from "../../http/middleware/permisos";

export class RoleAdminError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "RoleAdminError";
  }
}

function rethrow(error: { message?: string } | null): never {
  throw new RoleAdminError(error?.message ?? "unknown_error");
}

export interface RoleRow {
  slug: string;
  name: string;
  /** Los roles del sistema no se editan ni se borran. */
  isSystem: boolean;
  /** Cuánta gente activa lo tiene hoy. */
  personas: number;
  permisos: MapaDePermisos;
}

export async function listRoles(admin: SupabaseAdminClient): Promise<RoleRow[]> {
  const { data, error } = await admin.rpc("list_roles");
  if (error) rethrow(error);
  return (
    (data ?? []) as {
      slug: string;
      name: string;
      is_system: boolean;
      personas: number | string;
      permisos: MapaDePermisos | null;
    }[]
  ).map((r) => ({
    slug: r.slug,
    name: r.name,
    isSystem: r.is_system,
    personas: Number(r.personas ?? 0),
    permisos: r.permisos ?? {},
  }));
}

export async function createRole(
  admin: SupabaseAdminClient,
  name: string,
  actorId: string,
  actorLabel?: string | null,
) {
  const { data, error } = await admin.rpc("create_role", {
    p_name: name,
    p_actor_id: actorId,
    p_actor_label: actorLabel ?? null,
  });
  if (error) rethrow(error);
  return data as { slug: string; name: string };
}

export async function setRolePermission(
  admin: SupabaseAdminClient,
  slug: string,
  module: Modulo,
  level: NivelGuardado,
  actorId: string,
  actorLabel?: string | null,
) {
  const { data, error } = await admin.rpc("set_role_permission", {
    p_role_slug: slug,
    p_module: module,
    p_level: level,
    p_actor_id: actorId,
    p_actor_label: actorLabel ?? null,
  });
  if (error) rethrow(error);
  return data as { rol: string; modulo: string; nivel: string; sin_cambios: boolean };
}

export async function deleteRole(
  admin: SupabaseAdminClient,
  slug: string,
  actorId: string,
  actorLabel?: string | null,
) {
  const { data, error } = await admin.rpc("delete_role", {
    p_slug: slug,
    p_actor_id: actorId,
    p_actor_label: actorLabel ?? null,
  });
  if (error) rethrow(error);
  return data as { slug: string; borrado: boolean };
}

/**
 * Cada guard de la base, dicho de manera que se entienda sin saber qué
 * es un rol del sistema ni una clave foránea.
 */
export const ROLE_ADMIN_MESSAGES: Record<string, { status: 400 | 403 | 404 | 409; message: string }> =
  {
    sin_permiso_usuarios: {
      status: 403,
      message: "No podés administrar los roles del salón.",
    },
    rol_del_sistema: {
      status: 409,
      message:
        "La administradora tiene que poder entrar a todo: ese rol no se edita ni se borra.",
    },
    rol_no_encontrado: { status: 404, message: "Ese rol ya no existe." },
    rol_en_uso: {
      status: 409,
      message: "Ese rol lo tiene gente del salón. Cambiales el rol antes de borrarlo.",
    },
    modulo_no_encontrado: { status: 400, message: "Ese módulo no existe." },
    nivel_invalido: { status: 400, message: "Elegí uno de los tres niveles." },
    nombre_requerido: { status: 400, message: "Poné un nombre para el rol." },
  };
