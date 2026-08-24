/**
 * Cliente del panel interno.
 *
 * Igual que el público, pero manda el token de staff. Los mensajes de
 * error vienen del backend en castellano y se muestran tal cual: el
 * panel no traduce ni inventa explicaciones.
 */

import { ApiError } from "./client";
import { clearStaffToken, readStaffToken } from "../staff-session";

const GENERIC = "No pudimos completar la operación. Probá de nuevo.";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = readStaffToken();
  if (!token) throw new ApiError(401, "Iniciá sesión para entrar al panel.");

  let response: Response;
  try {
    response = await fetch(`/api/v1/admin${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${token}`,
        ...(init?.body ? { "content-type": "application/json" } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiError(0, "No pudimos conectarnos. Revisá tu conexión.");
  }

  const text = await response.text();
  const payload = text
    ? (JSON.parse(text) as { data?: T; error?: { message?: string } })
    : ({} as { data?: T; error?: { message?: string } });

  if (response.status === 401) {
    // El token venció: no tiene sentido conservarlo.
    clearStaffToken();
    throw new ApiError(401, payload.error?.message ?? "Volvé a iniciar sesión.");
  }
  if (!response.ok) {
    throw new ApiError(response.status, payload.error?.message ?? GENERIC);
  }
  return payload.data as T;
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
};
