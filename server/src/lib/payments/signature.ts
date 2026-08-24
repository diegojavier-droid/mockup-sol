/**
 * Verificación de la firma del webhook de Mercado Pago.
 *
 * Sin esto, cualquiera que conozca la URL puede confirmar reservas
 * ajenas: el webhook es la ÚNICA autoridad que pasa un turno a
 * `confirmed`. Que una notificación llegue desde internet no prueba
 * nada sobre quién la mandó.
 *
 * Esquema documentado por Mercado Pago:
 *   x-signature: ts=<timestamp>,v1=<hmac-sha256>
 *   x-request-id: <id de la petición>
 *   manifest: id:<data.id>;request-id:<x-request-id>;ts:<ts>;
 *   v1 = HMAC-SHA256(manifest, secreto)
 *
 * La comparación es en tiempo constante: comparar hashes con `===`
 * filtra información por el tiempo que tarda en fallar.
 */

export type SignatureFailure =
  | "missing_secret"
  | "missing_signature"
  | "malformed_signature"
  | "missing_data_id"
  | "stale_timestamp"
  | "mismatch";

export interface SignatureCheck {
  valid: boolean;
  reason?: SignatureFailure;
}

/** Ventana de tolerancia: acota el replay de una notificación capturada. */
const MAX_AGE_SECONDS = 15 * 60;

function parseSignatureHeader(header: string): { ts?: string; v1?: string } {
  const out: Record<string, string> = {};
  for (const part of header.split(",")) {
    const [rawKey, ...rest] = part.split("=");
    if (!rawKey || rest.length === 0) continue;
    out[rawKey.trim()] = rest.join("=").trim();
  }
  return { ts: out.ts, v1: out.v1 };
}

/** Comparación en tiempo constante de dos hex de igual semántica. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyMercadoPagoSignature(params: {
  secret: string | undefined;
  signatureHeader: string | undefined;
  requestId: string | undefined;
  dataId: string | undefined;
  now?: Date;
}): Promise<SignatureCheck> {
  if (!params.secret) return { valid: false, reason: "missing_secret" };
  if (!params.signatureHeader) return { valid: false, reason: "missing_signature" };
  if (!params.dataId) return { valid: false, reason: "missing_data_id" };

  const { ts, v1 } = parseSignatureHeader(params.signatureHeader);
  if (!ts || !v1) return { valid: false, reason: "malformed_signature" };

  const tsNumber = Number(ts);
  if (!Number.isFinite(tsNumber)) return { valid: false, reason: "malformed_signature" };

  // El timestamp de Mercado Pago viene en milisegundos.
  const ageSeconds = Math.abs((params.now ?? new Date()).getTime() - tsNumber) / 1000;
  if (ageSeconds > MAX_AGE_SECONDS) return { valid: false, reason: "stale_timestamp" };

  // El id se normaliza en minúsculas según la documentación del proveedor.
  const manifest = `id:${params.dataId.toLowerCase()};request-id:${params.requestId ?? ""};ts:${ts};`;
  const expected = await hmacSha256Hex(params.secret, manifest);

  return timingSafeEqual(expected, v1.toLowerCase())
    ? { valid: true }
    : { valid: false, reason: "mismatch" };
}
