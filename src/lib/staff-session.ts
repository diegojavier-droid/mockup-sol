/**
 * Sesión del panel interno.
 *
 * La identidad la prueba Supabase Auth; la autorización la decide el
 * backend contra `staff_members` y la lista de acceso. Guardar el token
 * acá no da permisos: sin fila de staff, el API responde 403 igual.
 *
 * Se usa `sessionStorage` a propósito: en un mostrador compartido, la
 * sesión no debería sobrevivir a cerrar el navegador.
 */

const TOKEN_KEY = "sol-mai-staff-token";

/** Los nueve módulos, tal como los nombra §5.0 de la arquitectura. */
export type Modulo =
  | "calendario"
  | "clientas"
  | "finanzas"
  | "inventario"
  | "servicios"
  | "personal"
  | "compras"
  | "usuarios"
  | "configuracion";

export type Nivel = "none" | "view" | "full";

export interface StaffIdentity {
  email: string;
  staffId: string;
  displayName: string;
  /** El slug del rol. Dejó de ser una lista fija: Sol arma los roles. */
  role: string;
  /** Cómo se llama el rol en la pantalla. */
  roleName: string;
  /**
   * Qué puede tocar. Lo manda el servidor en `/me`, resuelto contra la
   * matriz de permisos, y es lo mismo que el servidor va a exigir en cada
   * pedido: la pantalla y la puerta usan la misma fuente.
   */
  permisos: Partial<Record<Modulo, Nivel>>;
}

/**
 * Esconder no es una frontera —el servidor niega igual—, pero mostrarle a
 * alguien puertas que no abren es ensuciarle la pantalla todos los días.
 */
export function puede(
  identidad: StaffIdentity | undefined,
  modulo: Modulo,
  nivel: "view" | "full" = "view",
): boolean {
  const tiene = identidad?.permisos?.[modulo];
  if (tiene === "full") return true;
  return nivel === "view" && tiene === "view";
}

export function readStaffToken(): string | null {
  try {
    return window.sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function writeStaffToken(token: string): void {
  try {
    window.sessionStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* modo privado o almacenamiento bloqueado: la sesión dura lo que la pestaña */
  }
}

export function clearStaffToken(): void {
  try {
    window.sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* nada que limpiar */
  }
}
