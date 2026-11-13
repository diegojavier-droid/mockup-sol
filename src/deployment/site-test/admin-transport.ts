/** Private Site admin transport. Identity is verified by the same-origin gateway. */
import { ApiError } from "@/lib/api/client";
const GENERIC = "No pudimos completar la operación. Probá de nuevo.";
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/v1/admin${path}`, {
      ...init, credentials: "same-origin", cache: "no-store",
      headers: { ...(init?.body ? { "content-type": "application/json" } : {}), ...init?.headers },
    });
  } catch { throw new ApiError(0, "No pudimos conectarnos. Revisá tu conexión."); }
  let payload: { data?: T; error?: { message?: string } };
  try { payload = await response.json(); }
  catch { throw new ApiError(response.status >= 400 ? response.status : 502, GENERIC); }
  if (!response.ok) throw new ApiError(response.status, payload.error?.message ?? GENERIC);
  return payload.data as T;
}
const intentions = new Map<string, { key: string; pending?: Promise<unknown> }>();
function post<T>(path: string, body: unknown = {}): Promise<T> {
  const serialized = JSON.stringify(body);
  if (path !== "/bookings") return request<T>(path, { method: "POST", body: serialized });
  let intention = intentions.get(serialized);
  if (!intention) { intention = { key: crypto.randomUUID() }; intentions.set(serialized, intention); }
  if (intention.pending) return intention.pending as Promise<T>;
  const current = intention;
  current.pending = request<T>(path, { method: "POST", body: serialized,
    headers: { "X-Idempotency-Key": current.key } }).then((data) => {
      intentions.delete(serialized); return data;
    }, (error) => {
      current.pending = undefined;
      if (error instanceof ApiError && error.status >= 400 && error.status < 500 &&
          ![408, 425, 429].includes(error.status)) intentions.delete(serialized);
      throw error;
    });
  return current.pending as Promise<T>;
}
export const adminApi = {
  get: <T>(path: string) => request<T>(path), post,
  patch: <T>(path: string, body: unknown = {}) => request<T>(path, {method:"PATCH", body:JSON.stringify(body)}),
  del: <T>(path: string) => request<T>(path, {method:"DELETE"}),
};
