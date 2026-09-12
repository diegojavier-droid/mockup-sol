/**
 * Varias prestaciones en un mismo turno.
 *
 * «Agendá a María para color y corte el jueves a las 15» es el ejemplo
 * que fija el norte de producto, y hasta ahora no era escribible: el
 * contrato aceptaba un `serviceSlug` y nada más.
 *
 * Acá vive lo compartido entre las tres rutas que crean o cotizan
 * turnos, para que la regla no se escriba tres veces y se desincronice.
 */

import { z } from "zod";
import { QuoteError, type QuoteResult, type QuoteSettings } from "../../domain/types";
import { aplicarPromocion } from "../../domain/promocion";
import { composeQuote, computeQuote } from "../../domain/quote";
import type { CatalogRepository } from "../catalog/repository";
import type { SupabaseAnonServerClient } from "../supabase";
import { loadQuoteContext, type LoadedQuoteContext } from "./repository";

/** Tope deliberado: un turno con más prestaciones que esto es un error
 *  de carga, no una atención. Sol puede subirlo cuando haga falta. */
export const MAX_SERVICE_PARTS = 4;

export const servicePartSchema = z.object({
  serviceSlug: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  lengthTier: z.enum(["corto", "medio", "largo", "xl", "unico"]).nullish(),
  personalization: z.record(z.string().max(64), z.string().max(64)).optional(),
});

export type ServicePart = z.infer<typeof servicePartSchema>;

/**
 * La forma singular sigue viva: el contrato anterior no se rompe, y la
 * clienta que reserva un solo servicio manda exactamente lo mismo que
 * antes.
 */
export interface RawPartsInput {
  services?: ServicePart[] | null;
  serviceSlug?: string | null;
  lengthTier?: ServicePart["lengthTier"];
  personalization?: Record<string, string>;
}

export class ServicePartsError extends Error {
  constructor(public code: "no_services" | "too_many_services" | "mixed_areas") {
    super(code);
    this.name = "ServicePartsError";
  }
}

/** Normaliza las dos formas del pedido a una sola lista. */
export function normalizeServiceParts(input: RawPartsInput): ServicePart[] {
  const parts =
    input.services && input.services.length > 0
      ? input.services
      : input.serviceSlug
        ? [
            {
              serviceSlug: input.serviceSlug,
              lengthTier: input.lengthTier ?? null,
              personalization: input.personalization,
            },
          ]
        : [];

  if (parts.length === 0) throw new ServicePartsError("no_services");
  if (parts.length > MAX_SERVICE_PARTS) throw new ServicePartsError("too_many_services");
  return parts;
}

export interface LoadedParts {
  contexts: LoadedQuoteContext[];
  areaSlug: string;
}

/**
 * Carga el contexto de cada prestación.
 *
 * Los extras son del TURNO, no de cada prestación: se cargan una sola
 * vez, con la primera, para que no se cobren ni se sumen dos veces.
 *
 * Todas tienen que caer en la misma área. Una reserva ocupa capacidad en
 * un área y sólo una; un turno que mezclara peluquería con uñas tendría
 * que reservar lugar en las dos a la vez, y eso es un cambio de modelo
 * de capacidad, no de cotización. Se rechaza con nombre propio en vez de
 * crear un turno que ocupa mal.
 */
export async function loadServiceParts(
  client: SupabaseAnonServerClient,
  catalog: CatalogRepository,
  params: { parts: ServicePart[]; extraCodes: string[] },
): Promise<LoadedParts | null> {
  const contexts: LoadedQuoteContext[] = [];

  for (const [index, part] of params.parts.entries()) {
    const context = await loadQuoteContext(client, catalog, {
      serviceSlug: part.serviceSlug,
      extraCodes: index === 0 ? params.extraCodes : [],
    });
    if (!context) return null;
    contexts.push(context);
  }

  const areaSlug = contexts[0].areaSlug;
  if (contexts.some((c) => c.areaSlug !== areaSlug)) {
    throw new ServicePartsError("mixed_areas");
  }

  return { contexts, areaSlug };
}

/**
 * Cotiza el turno entero, con la promoción de color + tratamiento aplicada.
 *
 * POR QUÉ ACÁ Y NO EN CADA RUTA
 *
 * Cuatro lugares cotizan turnos: `/quote`, `/availability`, `/bookings` y
 * el alta del panel. Si la promoción se escribiera en cada uno, alcanzaría con
 * que alguien tocara tres para que el cuarto empezara a cobrar de más, y
 * nadie se enteraría hasta que una clienta lo notara. Este archivo existe
 * justo para eso: acá vive lo compartido.
 *
 * EL ORDEN IMPORTA
 *
 * Primero se decide la promoción mirando el turno entero —un tratamiento no
 * sabe solo si viene con un color— y recién después se cotiza cada parte.
 * Al revés no se puede: cuando `computeQuote` terminó, el precio ya está
 * puesto.
 */
export interface PartesCotizadas {
  /** El turno entero, que es lo que se le cobra a la clienta. */
  total: QuoteResult;
  /** Cada prestación por separado, para armar los items del turno. */
  partes: QuoteResult[];
  /** Cuáles entraron a precio de promoción, en el mismo orden. */
  conPromocion: boolean[];
}

export function cotizarPartes(
  contexts: LoadedQuoteContext[],
  parts: ServicePart[],
  settings: QuoteSettings,
): PartesCotizadas {
  const conPromocion = aplicarPromocion(contexts.map((c) => c.service));

  const partes = contexts.map((context, i) =>
    computeQuote({
      service: context.service,
      lengthTier: parts[i].lengthTier ?? null,
      personalization: parts[i].personalization,
      extras: context.extras,
      settings: context.settings,
      comoAgregado: conPromocion[i],
    }),
  );

  return { total: composeQuote(partes, settings), partes, conPromocion };
}

/** Qué se le dice a la persona, por su nombre. */
export function servicePartsErrorMessage(code: ServicePartsError["code"]): string {
  const messages: Record<ServicePartsError["code"], string> = {
    no_services: "Elegí al menos un servicio.",
    too_many_services: `Un turno admite hasta ${MAX_SERVICE_PARTS} servicios.`,
    mixed_areas:
      "Esos servicios se atienden en áreas distintas: hay que tomar un turno para cada uno.",
  };
  return messages[code];
}

export { QuoteError };
