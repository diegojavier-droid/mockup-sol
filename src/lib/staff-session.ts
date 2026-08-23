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

export interface StaffIdentity {
  email: string;
  staffId: string;
  displayName: string;
  role: "owner" | "staff";
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
