/**
 * El pedido a la API y la lectura de la respuesta.
 *
 * No se prueba el modelo —eso necesita una clave y plata—, se prueba lo
 * que pasa en nuestra casa: que el pedido salga con la herramienta
 * forzada, que una respuesta real se convierta en intención, y que
 * cualquier otra cosa termine en «no entendí» en vez de en un cambio de
 * precios inventado.
 */
import { afterEach, describe, expect, it } from "bun:test";
import { interpretarInstruccion, AsistenteNoConfigurado } from "./price-assist";
import type { ServerEnv } from "../../config/env";
import type { ServiceTierRow } from "./salon-repository";

const CATALOGO: ServiceTierRow[] = [
  {
    slug: "corte",
    name: "Corte",
    area: "peluqueria",
    lengthTier: "corto",
    priceMain: 10_000,
    durationMin: 45,
    isActive: true,
  },
];

const env = (extra: Partial<ServerEnv> = {}) =>
  ({
    ANTHROPIC_API_KEY: "sk-ant-de-prueba",
    ANTHROPIC_MODEL: "claude-haiku-4-5",
    ...extra,
  }) as ServerEnv;

const fetchReal = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = fetchReal;
});

function responder(cuerpo: unknown, status = 200) {
  const visto: { url?: string; init?: RequestInit } = {};
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    visto.url = url;
    visto.init = init;
    return new Response(JSON.stringify(cuerpo), {
      status,
      headers: { "content-type": "application/json" },
    });
  }) as unknown as typeof fetch;
  return visto;
}

const TOOL_USE = {
  content: [
    { type: "text", text: "Listo" },
    {
      type: "tool_use",
      name: "proponer_cambio",
      input: {
        entiendo: true,
        explicacion: "Subir un 15% los precios de peluquería",
        que: "precio",
        alcance: "area",
        area: "peluqueria",
        operacion: "porcentaje",
        valor: 15,
        redondeo: 100,
      },
    },
  ],
};

describe("interpretarInstruccion", () => {
  it("sin clave no llama a nadie: avisa que no está configurado", async () => {
    let llamo = false;
    globalThis.fetch = (async () => {
      llamo = true;
      return new Response("{}");
    }) as unknown as typeof fetch;

    await expect(
      interpretarInstruccion(env({ ANTHROPIC_API_KEY: undefined }), "subí todo", CATALOGO),
    ).rejects.toBeInstanceOf(AsistenteNoConfigurado);
    expect(llamo).toBe(false);
  });

  it("pide la herramienta forzada y manda el catálogo, no los precios", async () => {
    const visto = responder(TOOL_USE);
    await interpretarInstruccion(env(), "subí un 15% peluquería", CATALOGO);

    expect(visto.url).toBe("https://api.anthropic.com/v1/messages");
    const headers = visto.init!.headers as Record<string, string>;
    expect(headers["x-api-key"]).toBe("sk-ant-de-prueba");
    expect(headers["anthropic-version"]).toBe("2023-06-01");

    const body = JSON.parse(visto.init!.body as string);
    expect(body.model).toBe("claude-haiku-4-5");
    expect(body.tool_choice).toEqual({ type: "tool", name: "proponer_cambio" });
    expect(body.tools[0].name).toBe("proponer_cambio");
    // El modelo ve qué servicios hay; no necesita cuánto salen, porque no
    // hace cuentas.
    const prompt = body.messages[0].content as string;
    expect(prompt).toContain("corte");
    expect(prompt).toContain("peluqueria");
    expect(prompt).not.toContain("10000");
  });

  it("convierte la respuesta en intención", async () => {
    responder(TOOL_USE);
    const r = await interpretarInstruccion(env(), "subí un 15% peluquería", CATALOGO);
    expect(r).toMatchObject({
      entiendo: true,
      alcance: "area",
      area: "peluqueria",
      operacion: "porcentaje",
      valor: 15,
    });
  });

  it("si contesta sólo texto, no inventa una intención", async () => {
    responder({ content: [{ type: "text", text: "subiles un 15%" }] });
    const r = await interpretarInstruccion(env(), "subí algo", CATALOGO);
    expect(r.entiendo).toBe(false);
  });

  it("si la herramienta vuelve con basura, tampoco", async () => {
    responder({
      content: [{ type: "tool_use", name: "proponer_cambio", input: { entiendo: "puede ser" } }],
    });
    const r = await interpretarInstruccion(env(), "subí algo", CATALOGO);
    expect(r.entiendo).toBe(false);
  });

  it("un error de la API se propaga sin el cuerpo, que puede traer datos de la cuenta", async () => {
    responder({ error: { message: "invalid x-api-key sk-ant-secreta" } }, 401);
    await expect(interpretarInstruccion(env(), "subí algo", CATALOGO)).rejects.toThrow(
      "anthropic_http_401",
    );
  });
});
