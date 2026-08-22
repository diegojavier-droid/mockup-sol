/**
 * Cliente HTTP del API de Sol Mai.
 *
 * El backend y la app viven en el mismo Worker, así que las rutas son
 * relativas: no hay CORS ni base URL configurable en el navegador.
 */

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const GENERIC_ERROR = "No pudimos completar la operación. Probá de nuevo en un momento.";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, {
      ...init,
      headers: {
        ...(init?.body ? { "content-type": "application/json" } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiError(0, "No pudimos conectarnos. Revisá tu conexión e intentá otra vez.");
  }

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as { data?: T; error?: { message?: string } }) : {};

  if (!response.ok) {
    // El backend ya devuelve mensajes en lenguaje humano; se muestran tal cual.
    throw new ApiError(response.status, payload.error?.message ?? GENERIC_ERROR);
  }
  return payload.data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
};
