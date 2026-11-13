/**
 * Sesión del panel interno.
 *
 * La identidad la prueba Supabase Auth; la autorización la decide el
 * backend contra `staff_members` y la lista de acceso. Guardar el token
 * acá no da permisos: sin fila de staff, el API responde 403 igual.
 *
 * Esto es una COPIA de lectura del `access_token` vigente, no la sesión.
 * La sesión la guarda Supabase —en `localStorage`, porque PKCE necesita
 * su clave temporal disponible en la pestaña que abre el link del mail—
 * y `recuperarSesion()` vuelve a escribir acá el token en cada arranque.
 * Por eso la copia puede vivir en `sessionStorage` sin dejar a nadie
 * afuera: si falta, se rehace. Cerrar la sesión de verdad es «Salir».
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
  agendaScope?: "assigned" | "all";
  attentionEnabled?: boolean;
  accessVersion?: string;
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
  if (identidad?.agendaScope === "assigned" && modulo !== "calendario") return false;
  const tiene = identidad?.permisos?.[modulo];
  if (tiene === "full") return true;
  return nivel === "view" && tiene === "view";
}

export function staffAccessKey(identity: StaffIdentity): string {
 return JSON.stringify([identity.staffId,identity.role,identity.agendaScope??'legacy',identity.attentionEnabled===true,Object.entries(identity.permisos).sort(([a],[b])=>a.localeCompare(b))]);
}
const outcomeListeners=new Set<()=>void>();
let uncertainOutcome=false;
export function readUncertainStaffOutcome(): boolean { return uncertainOutcome; }
export function subscribeUncertainStaffOutcome(listener:()=>void):()=>void { outcomeListeners.add(listener);return ()=>{outcomeListeners.delete(listener);}; }
export function reportUncertainStaffOutcome(): void { if(!uncertainOutcome){uncertainOutcome=true;for(const listener of outcomeListeners)listener();} }
export function dismissUncertainStaffOutcome(): void { if(uncertainOutcome){uncertainOutcome=false;for(const listener of outcomeListeners)listener();} }

let accessKey: string | null = null;
let accessVersion: string | null = null;
let accessDenied=false;
export function isStaffAccessDenied(): boolean { return accessDenied; }
export function denyStaffAccess(): void {
 if(accessDenied)return;
 accessDenied=true;
 changed();
}
export function readStaffAccessVersion(): string | null { return accessVersion; }
export function acceptStaffAccessVersion(value: string | null): void { accessVersion=value; }
export function invalidateStaffAccess(): void { changed(); }
export function observeStaffAccess(identity: StaffIdentity): void {
 const next=staffAccessKey(identity), previous=accessKey;
 accessKey=next;
 accessDenied=false;
 if(previous!==null && previous!==next) changed();
}

// Generación local, no credencial: cambia al cambiar/cerrar sesión. Las
// respuestas que comenzaron con otra generación nunca se muestran al equipo.
let generation = 0;
let memoryToken: string | null = null;
let initialized = false;
const listeners = new Set<() => void>();
const expirationListeners = new Set<() => void>();
function changed() {
  generation += 1;
  for (const listener of listeners) listener();
}
export function readStaffSessionGeneration(): number { return generation; }
export function subscribeStaffSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function subscribeStaffExpiration(listener: () => void): () => void {
  expirationListeners.add(listener);
  return () => { expirationListeners.delete(listener); };
}
export function readStaffToken(): string | null {
  if (!initialized) {
    initialized = true;
    try { memoryToken = window.sessionStorage.getItem(TOKEN_KEY); } catch { /* memoria */ }
  }
  return memoryToken;
}
/** Unverified claims partition LOCAL caches only; never grant server access. */
function sessionScope(token: string | null): string | null {
  if (!token || token.length > 16_384) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g,"+").replace(/_/g,"/"))) as Record<string,unknown>;
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return typeof payload.sub === "string" && uuid.test(payload.sub) && typeof payload.session_id === "string" && uuid.test(payload.session_id)
      ? `${payload.sub}:${payload.session_id}` : null;
  } catch { return null; }
}
export function writeStaffToken(token: string): void {
  const previous = readStaffToken();
  initialized = true;
  memoryToken = token;
  try { window.sessionStorage.setItem(TOKEN_KEY, token); } catch { /* memoria */ }
  const before = sessionScope(previous), after = sessionScope(token);
  // Refresh of the same user/session must not interrupt a mutation that may
  // already have committed. Missing/ambiguous identity remains conservative.
  if (previous !== token && (!before || !after || before !== after)) { accessKey=null; accessVersion=null; accessDenied=false; changed(); }
}
export function clearStaffToken(): void {
  initialized = true;
  memoryToken = null;
  accessKey=null;
  accessVersion=null;
  accessDenied=false;
  try { window.sessionStorage.removeItem(TOKEN_KEY); } catch { /* memoria */ }
  changed();
}
/** Sólo un 401 de la generación vigente invalida también la sesión del SDK. */
export function expireStaffSession(): void {
  clearStaffToken();
  for (const listener of expirationListeners) listener();
}
