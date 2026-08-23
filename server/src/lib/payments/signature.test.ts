import { describe, expect, test } from "bun:test";
import { verifyMercadoPagoSignature } from "./signature";

const SECRET = "secreto-de-prueba";

async function sign(dataId: string, requestId: string, ts: string): Promise<string> {
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(manifest));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

describe("firma del webhook de Mercado Pago", () => {
  const now = new Date("2026-08-23T12:00:00Z");
  const ts = String(now.getTime());

  test("acepta una notificación legítima", async () => {
    const v1 = await sign("PAY-1", "REQ-1", ts);
    const r = await verifyMercadoPagoSignature({
      secret: SECRET,
      signatureHeader: `ts=${ts},v1=${v1}`,
      requestId: "REQ-1",
      dataId: "PAY-1",
      now,
    });
    expect(r.valid).toBe(true);
  });

  test("rechaza una firma inventada", async () => {
    const r = await verifyMercadoPagoSignature({
      secret: SECRET,
      signatureHeader: `ts=${ts},v1=${"a".repeat(64)}`,
      requestId: "REQ-1",
      dataId: "PAY-1",
      now,
    });
    expect(r.valid).toBe(false);
    expect(r.reason).toBe("mismatch");
  });

  test("rechaza una firma de OTRO pago (no se puede reusar)", async () => {
    const v1 = await sign("PAY-OTRO", "REQ-1", ts);
    const r = await verifyMercadoPagoSignature({
      secret: SECRET,
      signatureHeader: `ts=${ts},v1=${v1}`,
      requestId: "REQ-1",
      dataId: "PAY-1",
      now,
    });
    expect(r.valid).toBe(false);
  });

  test("rechaza si cambia el request-id", async () => {
    const v1 = await sign("PAY-1", "REQ-1", ts);
    const r = await verifyMercadoPagoSignature({
      secret: SECRET,
      signatureHeader: `ts=${ts},v1=${v1}`,
      requestId: "REQ-DISTINTO",
      dataId: "PAY-1",
      now,
    });
    expect(r.valid).toBe(false);
  });

  test("rechaza un replay viejo aunque la firma sea válida", async () => {
    const viejo = String(now.getTime() - 60 * 60 * 1000);
    const v1 = await sign("PAY-1", "REQ-1", viejo);
    const r = await verifyMercadoPagoSignature({
      secret: SECRET,
      signatureHeader: `ts=${viejo},v1=${v1}`,
      requestId: "REQ-1",
      dataId: "PAY-1",
      now,
    });
    expect(r.valid).toBe(false);
    expect(r.reason).toBe("stale_timestamp");
  });

  test("rechaza sin cabecera de firma", async () => {
    const r = await verifyMercadoPagoSignature({
      secret: SECRET,
      signatureHeader: undefined,
      requestId: "REQ-1",
      dataId: "PAY-1",
      now,
    });
    expect(r.reason).toBe("missing_signature");
  });

  test("rechaza una cabecera malformada", async () => {
    const r = await verifyMercadoPagoSignature({
      secret: SECRET,
      signatureHeader: "esto-no-es-una-firma",
      requestId: "REQ-1",
      dataId: "PAY-1",
      now,
    });
    expect(r.reason).toBe("malformed_signature");
  });

  test("sin secreto configurado no valida — nunca acepta por omisión", async () => {
    const v1 = await sign("PAY-1", "REQ-1", ts);
    const r = await verifyMercadoPagoSignature({
      secret: undefined,
      signatureHeader: `ts=${ts},v1=${v1}`,
      requestId: "REQ-1",
      dataId: "PAY-1",
      now,
    });
    expect(r.valid).toBe(false);
    expect(r.reason).toBe("missing_secret");
  });

  test("un secreto equivocado no valida", async () => {
    const v1 = await sign("PAY-1", "REQ-1", ts);
    const r = await verifyMercadoPagoSignature({
      secret: "otro-secreto",
      signatureHeader: `ts=${ts},v1=${v1}`,
      requestId: "REQ-1",
      dataId: "PAY-1",
      now,
    });
    expect(r.valid).toBe(false);
    expect(r.reason).toBe("mismatch");
  });
});
