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
import { QuoteError } from "../../domain/types";
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
