/**
 * POST /api/v1/quote — cotización server-side (única autoridad de precio).
 *
 * La respuesta es una ESTIMACIÓN salvo modo 'fixed'. La seña
 * (depositAmount) es el único número firme (Blueprint D4/C7).
 */

import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import type { ServerEnv } from "../../config/env";
import { createSupabaseAnonClient, createSupabaseAdminClient } from "../../lib/supabase";
import {
  recordAssistedActivityInBackground,
  waitUntilContextOf,
} from "../../lib/assisted/record";
import { createCatalogRepository } from "../../lib/catalog/repository";
import { loadQuoteContext } from "../../lib/quote/repository";
import { computeQuote } from "../../domain/quote";
import { QuoteError } from "../../domain/types";

const quoteRequestSchema = z.object({
  serviceSlug: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  lengthTier: z.enum(["corto", "medio", "largo", "xl", "unico"]).nullish(),
  personalization: z.record(z.string().max(64), z.string().max(64)).optional(),
  extraCodes: z.array(z.string().min(1).max(64)).max(10).default([]),
});

export type QuoteRequest = z.infer<typeof quoteRequestSchema>;

const QUOTE_ERROR_STATUS: Record<string, 400 | 404 | 422> = {
  length_required: 422,
  tier_not_found: 422,
  unknown_option: 422,
  service_not_quotable: 404,
};

export function createQuoteRoute(env: ServerEnv) {
  const route = new Hono();

  route.post("/", async (c) => {
    const parsed = quoteRequestSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      throw new HTTPException(400, { message: "Invalid quote request" });
    }

    const client = createSupabaseAnonClient(env);
    const catalog = createCatalogRepository(client);
    const context = await loadQuoteContext(client, catalog, {
      serviceSlug: parsed.data.serviceSlug,
      extraCodes: parsed.data.extraCodes,
    });
    if (!context) {
      throw new HTTPException(404, { message: "Service not found" });
    }

    try {
      const quote = computeQuote({
        service: context.service,
        lengthTier: parsed.data.lengthTier ?? null,
        personalization: parsed.data.personalization,
        extras: context.extras,
        settings: context.settings,
      });
      // La web acaba de contestar cuánto sale y cuánto dura. Es una de
      // las dos preguntas que hoy consumen a Sol antes de cada venta, y
      // no queda registrada en ningún lado si no se cuenta acá.
      recordAssistedActivityInBackground(
        createSupabaseAdminClient(env),
        "quote_self_service",
        waitUntilContextOf(c),
      );
      return c.json({ data: quote });
    } catch (error) {
      if (error instanceof QuoteError) {
        throw new HTTPException(QUOTE_ERROR_STATUS[error.code] ?? 400, {
          message: error.code,
        });
      }
      throw error;
    }
  });

  return route;
}
