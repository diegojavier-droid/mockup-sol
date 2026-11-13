/**
 * Cliente del panel interno.
 *
 * Igual que el público, pero manda el token de staff. Los mensajes de
 * error vienen del backend en castellano y se muestran tal cual: el
 * panel no traduce ni inventa explicaciones.
 */

import { ApiError } from "@/lib/api/client";
import { reportUncertainStaffOutcome, denyStaffAccess, isStaffAccessDenied, readStaffAccessVersion, acceptStaffAccessVersion, invalidateStaffAccess, observeStaffAccess, type StaffIdentity, expireStaffSession, readStaffToken, readStaffSessionGeneration, subscribeStaffSession } from "@/lib/staff-session";

const GENERIC = "No pudimos completar la operación. Probá de nuevo.";

let identityRequest=0;
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const meSequence=path === "/me" ? ++identityRequest : null;
  const token = readStaffToken();
  if (!token) throw new ApiError(401, "Iniciá sesión para entrar al panel.");
  if(path!=="/me" && isStaffAccessDenied()) throw new ApiError(403, "No tenés acceso al panel.");
  const generation = readStaffSessionGeneration();
  const controller = new AbortController();
  const unsubscribe = subscribeStaffSession(() => controller.abort());
  const isCurrent = () => generation === readStaffSessionGeneration();
  const changed = () => {
    const ended=readStaffToken()===null;
    const writing=init?.method && init.method!=="GET";
    if(writing) reportUncertainStaffOutcome();
    return new ApiError(ended?401:409, writing
      ? `${ended ? "La sesión terminó." : "Cambió el acceso al panel."} No pudimos confirmar el resultado. Revisá el turno antes de repetir la operación.`
      : ended ? "La sesión terminó. Volvé a iniciar sesión." : "Cambió tu acceso al panel. Estamos actualizando los permisos.");
  };
  try {
    let response: Response;
    try {
      response = await fetch(`/api/v1/admin${path}`, {
        ...init,
        cache: "no-store",
        signal: controller.signal,
        headers: {
          authorization: `Bearer ${token}`,
          ...(init?.body ? { "content-type": "application/json" } : {}),
          ...init?.headers,
        },
      });
    } catch {
      if (!isCurrent()) throw changed();
      throw new ApiError(0, "No pudimos conectarnos. Revisá tu conexión.");
    }
    if (!isCurrent()) throw changed();
    if(meSequence!==null && meSequence!==identityRequest) throw changed();
    if(response.status===403) {
      // Close the boundary before reading even a malformed or stalled body.
      // Only the latest identity request can deny; repeated denial is stable.
      if(meSequence!==null) denyStaffAccess();
      else { identityRequest+=1; invalidateStaffAccess(); }
      throw new ApiError(403,"No tenés acceso al panel.");
    }
    let text: string;
    try { text = await response.text(); }
    catch {
      if(!isCurrent() || (meSequence!==null && meSequence!==identityRequest)) throw changed();
      if(init?.method && init.method!=="GET") {
        reportUncertainStaffOutcome();
        throw new ApiError(0,"No pudimos confirmar el resultado. Revisá el turno antes de repetir la operación.");
      }
      throw new ApiError(0,"No pudimos leer la respuesta. Volvé a intentar.");
    }
    if (!isCurrent()) throw changed();
    if(meSequence!==null && meSequence!==identityRequest) throw changed();
    if (response.status === 401 && readStaffToken() === token) expireStaffSession();
    const responseAccess=response.headers.get("x-staff-access-version");
    if(path!=="/me" && response.status!==401 && (response.ok || responseAccess!==null) && responseAccess!==readStaffAccessVersion()) {
      identityRequest += 1;
      invalidateStaffAccess();
      throw changed();
    }

    let payload: { data?: T; error?: { message?: string } } = {};
    try { payload = text ? JSON.parse(text) : {}; }
    catch { if(meSequence!==null && response.ok) denyStaffAccess(); throw new ApiError(response.status, GENERIC); }
    if (response.status === 401) {
      throw new ApiError(401, payload.error?.message ?? "Volvé a iniciar sesión.");
    }
    if (!response.ok) throw new ApiError(response.status, payload.error?.message ?? GENERIC);
    if(meSequence!==null) {
      if(meSequence!==identityRequest) throw changed();
      const invalidIdentity=()=>{denyStaffAccess();return new ApiError(403, GENERIC);};
      const identity=payload.data as StaffIdentity;
      if(!identity || typeof identity.staffId!=="string" || typeof identity.role!=="string" || !identity.permisos || typeof identity.permisos!=="object" || Array.isArray(identity.permisos)) throw invalidIdentity();
      if(readStaffAccessVersion()!==null && responseAccess===null) throw invalidIdentity();
      if((identity.accessVersion ?? null)!==responseAccess) throw invalidIdentity();
      acceptStaffAccessVersion(responseAccess);
      observeStaffAccess(identity);
    }
    return payload.data as T;
  } finally { unsubscribe(); }
}

export const adminApi = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "PATCH",
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  // `del` y no `delete`: es palabra reservada como nombre de método suelto.
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
