/**
 * El asistente de precios: Sol escribe lo que quiere cambiar y el panel
 * le muestra qué quedaría.
 *
 * La regla que ordena todo este archivo: **el modelo entiende la frase,
 * el servidor hace las cuentas.** Claude nunca devuelve un precio.
 * Devuelve una intención —a qué servicios, qué operación, con qué
 * redondeo— y la aritmética la hace `proponerCambios`, que es una
 * función pura y está cubierta por tests.
 *
 * Es a propósito, y no por prolijidad. Un modelo que multiplica precios
 * se equivoca en silencio y el error llega a la clienta. Uno que sólo
 * dice «subí un 15% peluquería» se equivoca de forma visible: Sol lee la
 * propuesta antes de que se escriba nada.
 *
 * De ahí salen las otras dos reglas:
 *
 * - **Nada se guarda acá.** Este módulo propone. Escribir es otra
 *   llamada, con la lista explícita de cambios, y pasa por
 *   `set_service_price` como cualquier edición a mano: mismas
 *   validaciones, misma auditoría.
 * - **Ante la duda, no propone.** Si la instrucción no se entiende, o si
 *   la cuenta da un precio imposible, se devuelve el motivo en
 *   castellano y cero cambios. Una propuesta a medias es peor que
 *   ninguna.
 */
import { z } from "zod";
import type { ServerEnv } from "../../config/env";
import type { SupabaseAdminClient } from "../supabase";
import { listServiceTiers, setServicePrice, type ServiceTierRow } from "./salon-repository";

/** Lo que el modelo puede contestar. Nada de esto es un precio. */
const intencionSchema = z.object({
  entiendo: z.boolean(),
  explicacion: z.string().max(400).default(""),
  motivo: z.string().max(400).nullish(),
  que: z.enum(["precio", "duracion"]).nullish(),
  alcance: z.enum(["todo", "area", "servicios"]).nullish(),
  area: z.string().max(64).nullish(),
  servicios: z.array(z.string().max(120)).max(200).nullish(),
  largo: z.string().max(16).nullish(),
  operacion: z.enum(["porcentaje", "monto", "fijo"]).nullish(),
  valor: z.number().finite().nullish(),
  redondeo: z.union([z.literal(0), z.literal(100), z.literal(500), z.literal(1000)]).nullish(),
});

export type Intencion = z.infer<typeof intencionSchema>;

/**
 * El mismo contrato, en JSON Schema, para la herramienta que se le
 * ofrece al modelo.
 *
 * Se usa herramienta forzada y no salida estructurada porque acá corre
 * un modelo chico y elegido por su costo: la herramienta funciona en
 * todos, y lo que llega igual se valida con Zod antes de tocarlo.
 */
const ESQUEMA_HERRAMIENTA = {
  type: "object",
  properties: {
    entiendo: {
      type: "boolean",
      description: "false si la instrucción es ambigua o no habla de precios ni de duraciones.",
    },
    explicacion: {
      type: "string",
      description:
        "Una frase corta, en castellano rioplatense, diciendo qué entendiste. Ej: 'Subir un 15% todos los precios de peluquería'.",
    },
    motivo: {
      type: "string",
      description: "Sólo si entiendo=false: qué falta saber, en una frase y sin tecnicismos.",
    },
    que: { type: "string", enum: ["precio", "duracion"] },
    alcance: { type: "string", enum: ["todo", "area", "servicios"] },
    area: { type: "string", description: "Slug del área, sólo si alcance=area." },
    servicios: {
      type: "array",
      items: { type: "string" },
      description: "Slugs de servicios, sólo si alcance=servicios.",
    },
    largo: {
      type: "string",
      description: "Slug del tramo de largo, sólo si la instrucción nombra uno.",
    },
    operacion: {
      type: "string",
      enum: ["porcentaje", "monto", "fijo"],
      description:
        "porcentaje: sube o baja un %. monto: suma o resta pesos (o minutos). fijo: deja ese valor exacto.",
    },
    valor: {
      type: "number",
      description: "Negativo para bajar. Con operacion=fijo, el valor final.",
    },
    redondeo: {
      type: "number",
      enum: [0, 100, 500, 1000],
      description: "A cuánto redondear el precio resultante. 0 = sin redondear.",
    },
  },
  required: ["entiendo", "explicacion"],
} as const;

const SISTEMA = `Sos el asistente del panel de Sol Mai, una peluquería de Santa Fe.

Sol te escribe en castellano rioplatense qué quiere cambiar de sus precios
o de sus tiempos de trabajo. Tu único trabajo es traducir esa frase a la
herramienta \`proponer_cambio\`. No calcules precios: el sistema hace las
cuentas.

Reglas:
- Usá SIEMPRE la herramienta. Nunca contestes con texto suelto.
- Los slugs de área y de servicio salen del catálogo que te pasan. No
  inventes ninguno.
- Si la frase no dice claramente qué cambiar o por cuánto, respondé
  entiendo=false y explicá en \`motivo\` qué falta. Es mejor preguntar que
  adivinar: acá se cobra plata de verdad.
- Si Sol nombra un área ("peluquería", "uñas") usá alcance=area. Si nombra
  servicios concretos, alcance=servicios con sus slugs. Si dice "todo",
  alcance=todo.
- Con porcentajes, redondeá a 100 salvo que Sol pida otra cosa. Con
  duraciones no se redondea a pesos: usá redondeo=0.
- "Subí", "aumentá" son positivos; "bajá", "descontá" son negativos.`;

function catalogoParaElModelo(filas: ServiceTierRow[]): string {
  const porServicio = new Map<string, { name: string; area: string; largos: string[] }>();
  for (const f of filas) {
    const actual = porServicio.get(f.slug);
    if (actual) actual.largos.push(f.lengthTier);
    else porServicio.set(f.slug, { name: f.name, area: f.area, largos: [f.lengthTier] });
  }
  const areas = [...new Set(filas.map((f) => f.area))];
  const servicios = [...porServicio.entries()]
    .map(([slug, s]) => `- ${slug} · ${s.name} · área ${s.area} · largos: ${s.largos.join(", ")}`)
    .join("\n");
  return `Áreas: ${areas.join(", ")}\n\nServicios:\n${servicios}`;
}

export class AsistenteNoConfigurado extends Error {
  constructor() {
    super("asistente_no_configurado");
    this.name = "AsistenteNoConfigurado";
  }
}

export function asistenteDisponible(env: ServerEnv): boolean {
  return Boolean(env.ANTHROPIC_API_KEY);
}

/**
 * POR QUÉ ACÁ NO ESTÁ EL SDK DE ANTHROPIC
 *
 * Se probó `@anthropic-ai/sdk` y el Worker no arranca:
 *
 *     worker boot failed: ReferenceError: cp is not defined
 *
 * El SDK trae `internal/node.mjs`, que importa `node:child_process`,
 * `node:fs` y compañía para resolver credenciales de disco y para las
 * sandboxes autoalojadas. El build lo mete en el chunk del servidor y
 * workerd —que no tiene esos módulos— se cae al evaluarlo, antes de
 * atender un solo pedido. Se verificó que el chunk `node-*` aparece
 * recién cuando se agrega la dependencia, y no se va importando la
 * entrada angosta (`@anthropic-ai/sdk/client`).
 *
 * La API de mensajes es un POST. En un Worker, `fetch` es nativo, no
 * arrastra nada y no puede romper el arranque. Si alguien vuelve a
 * poner el SDK, que sea después de comprobar que el Worker levanta.
 */
const ENDPOINT = "https://api.anthropic.com/v1/messages";

/** Le pide al modelo que traduzca la frase. No toca la base ni calcula nada. */
export async function interpretarInstruccion(
  env: ServerEnv,
  instruccion: string,
  filas: ServiceTierRow[],
): Promise<Intencion> {
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new AsistenteNoConfigurado();

  const respuesta = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    // Sin tope, un modelo colgado deja a Sol mirando «Pensando…».
    signal: AbortSignal.timeout(20_000),
    body: JSON.stringify({
      model: env.ANTHROPIC_MODEL,
      max_tokens: 1024,
      system: SISTEMA,
      messages: [
        {
          role: "user",
          content: `${catalogoParaElModelo(filas)}\n\nInstrucción de Sol:\n${instruccion}`,
        },
      ],
      tools: [
        {
          name: "proponer_cambio",
          description: "Traduce la instrucción de Sol a un cambio que el sistema pueda calcular.",
          input_schema: ESQUEMA_HERRAMIENTA,
        },
      ],
      tool_choice: { type: "tool", name: "proponer_cambio" },
    }),
  });

  if (!respuesta.ok) {
    // El cuerpo del error puede traer la clave o datos de la cuenta: se
    // registra el estado, no el contenido.
    throw new Error(`anthropic_http_${respuesta.status}`);
  }

  const cuerpo = (await respuesta.json()) as {
    content?: { type?: string; name?: string; input?: unknown }[];
  };
  const uso = cuerpo.content?.find((b) => b.type === "tool_use" && b.name === "proponer_cambio");
  if (!uso) {
    return noEntiendoIntencion();
  }
  const parsed = intencionSchema.safeParse(uso.input);
  return parsed.success ? parsed.data : noEntiendoIntencion();
}

function noEntiendoIntencion(): Intencion {
  return { entiendo: false, explicacion: "", motivo: "No pude entender la instrucción." };
}

export interface CambioPropuesto {
  slug: string;
  name: string;
  area: string;
  lengthTier: string;
  precioAntes: number;
  precioAhora: number;
  duracionAntes: number;
  duracionAhora: number;
}

export interface Propuesta {
  entiendo: boolean;
  explicacion: string;
  motivo?: string;
  cambios: CambioPropuesto[];
}

/**
 * Topes de cordura. No están para limitar a Sol: están para que un
 * malentendido del modelo no llegue a la pantalla como si fuera una
 * propuesta razonable.
 *
 * Un "bajá todo un 95%" sale de un error de lectura mucho más seguido
 * que de una decisión comercial, y en el peor caso Sol lo hace en dos
 * pasos.
 */
const TOPES = {
  precio: { porcentaje: [-90, 300], monto: [-1_000_000, 1_000_000], fijo: [1, 10_000_000] },
  duracion: { porcentaje: [-90, 300], monto: [-600, 600], fijo: [1, 600] },
} as const;

function redondearA(valor: number, paso: number): number {
  if (paso <= 0) return Math.round(valor);
  return Math.round(valor / paso) * paso;
}

function noEntiendo(motivo: string): Propuesta {
  return { entiendo: false, explicacion: "", motivo, cambios: [] };
}

/**
 * Aplica la intención al catálogo y devuelve qué quedaría.
 *
 * Pura: mismas entradas, misma salida, sin red ni base. Es donde vive
 * toda la aritmética del asistente, y por eso es la parte que se testea.
 */
export function proponerCambios(intencion: Intencion, filas: ServiceTierRow[]): Propuesta {
  if (!intencion.entiendo) {
    return noEntiendo(intencion.motivo?.trim() || "No entendí qué querés cambiar.");
  }

  const que = intencion.que ?? "precio";
  const operacion = intencion.operacion;
  const valor = intencion.valor;
  if (!operacion || valor === null || valor === undefined) {
    return noEntiendo("No entendí por cuánto cambiarlo.");
  }

  const [min, max] = TOPES[que][operacion];
  if (valor < min || valor > max) {
    return noEntiendo(
      "Ese cambio es demasiado grande para hacerlo de una. Probá con un número más chico o cambialo a mano.",
    );
  }

  const alcance = intencion.alcance ?? "todo";
  const largo = intencion.largo?.trim() || null;
  const servicios = new Set((intencion.servicios ?? []).map((s) => s.trim()).filter(Boolean));

  let alcanzadas = filas.filter((f) => f.isActive);
  if (alcance === "area") {
    const area = intencion.area?.trim();
    if (!area) return noEntiendo("No entendí de qué área hablás.");
    alcanzadas = alcanzadas.filter((f) => f.area === area);
  } else if (alcance === "servicios") {
    if (servicios.size === 0) return noEntiendo("No entendí de qué servicios hablás.");
    alcanzadas = alcanzadas.filter((f) => servicios.has(f.slug));
  }
  if (largo) alcanzadas = alcanzadas.filter((f) => f.lengthTier === largo);

  if (alcanzadas.length === 0) {
    return noEntiendo("No encontré servicios que coincidan con eso.");
  }

  const redondeo = que === "precio" ? (intencion.redondeo ?? 0) : 0;
  const cambios: CambioPropuesto[] = [];

  for (const f of alcanzadas) {
    const actual = que === "precio" ? f.priceMain : f.durationMin;
    let calculado: number;
    if (operacion === "porcentaje") calculado = actual * (1 + valor / 100);
    else if (operacion === "monto") calculado = actual + valor;
    else calculado = valor;

    const nuevo = redondearA(calculado, redondeo);

    // Un solo renglón imposible invalida la propuesta entera. Mostrar
    // «doce cambios, uno de ellos absurdo» obliga a Sol a auditar una
    // lista, que es justo lo que el asistente venía a evitar.
    if (!Number.isFinite(nuevo) || nuevo <= 0) {
      return noEntiendo("Con ese cambio algún precio quedaría en cero o negativo.");
    }
    if (que === "duracion" && nuevo > 600) {
      return noEntiendo("Con ese cambio algún servicio pasaría de diez horas.");
    }

    const precioAhora = que === "precio" ? nuevo : f.priceMain;
    const duracionAhora = que === "duracion" ? nuevo : f.durationMin;
    if (precioAhora === f.priceMain && duracionAhora === f.durationMin) continue;

    cambios.push({
      slug: f.slug,
      name: f.name,
      area: f.area,
      lengthTier: f.lengthTier,
      precioAntes: f.priceMain,
      precioAhora,
      duracionAntes: f.durationMin,
      duracionAhora,
    });
  }

  if (cambios.length === 0) {
    return noEntiendo("Eso dejaría todo como está.");
  }

  return {
    entiendo: true,
    explicacion: intencion.explicacion?.trim() || "",
    cambios,
  };
}

/**
 * Escribe los cambios que Sol confirmó.
 *
 * Dos cosas que no son opcionales:
 *
 * 1. **Se verifica el «antes».** Entre que se armó la propuesta y que Sol
 *    apretó el botón alguien pudo cambiar un precio a mano. Si el valor
 *    actual no es el que la propuesta decía, ese renglón no se toca y se
 *    informa. Pisar en silencio el cambio de otra persona es la clase de
 *    error que nadie encuentra hasta que una clienta paga de menos.
 * 2. **Se escribe por `set_service_price`.** El mismo camino que la
 *    edición a mano: mismas validaciones, misma auditoría, mismo actor.
 *    El asistente no tiene una puerta propia a la base.
 */
export async function aplicarCambios(
  admin: SupabaseAdminClient,
  cambios: CambioPropuesto[],
  actor: { actorId: string; actorLabel?: string | null },
): Promise<{ aplicados: number; sinAplicar: { slug: string; lengthTier: string }[] }> {
  const actuales = new Map(
    (await listServiceTiers(admin)).map((f) => [`${f.slug}|${f.lengthTier}`, f]),
  );

  const sinAplicar: { slug: string; lengthTier: string }[] = [];
  let aplicados = 0;

  for (const c of cambios) {
    const actual = actuales.get(`${c.slug}|${c.lengthTier}`);
    if (!actual || actual.priceMain !== c.precioAntes || actual.durationMin !== c.duracionAntes) {
      sinAplicar.push({ slug: c.slug, lengthTier: c.lengthTier });
      continue;
    }
    await setServicePrice(admin, {
      slug: c.slug,
      lengthTier: c.lengthTier,
      priceMain: c.precioAhora,
      durationMin: c.duracionAhora,
      actorId: actor.actorId,
      actorLabel: actor.actorLabel ?? null,
    });
    aplicados += 1;
  }

  return { aplicados, sinAplicar };
}
