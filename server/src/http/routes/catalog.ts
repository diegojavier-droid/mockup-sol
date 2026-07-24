/**
 * /api/v1/catalog/* — public read-only catalog API.
 *
 * Response envelope: { data: T } on success, { error: { message, status } }
 * on failure (handled by the shared errorHandler for thrown exceptions).
 *
 * Query/param validation uses Zod. RLS is enforced at the database layer;
 * this route additionally filters by is_public/is_active/deleted_at as
 * defence in depth.
 */

import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import type { ServerEnv } from "../../config/env";
import { createSupabaseAnonClient } from "../../lib/supabase";
import { createCatalogRepository } from "../../lib/catalog/repository";

const slugSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "invalid slug");

const listQuerySchema = z.object({
  category: slugSchema.optional(),
});

export function createCatalogRoute(env: ServerEnv) {
  const route = new Hono();

  const repo = () => createCatalogRepository(createSupabaseAnonClient(env));

  route.get("/categories", async (c) => {
    const data = await repo().listCategories();
    return c.json({ data });
  });

  route.get("/services", async (c) => {
    const parsed = listQuerySchema.safeParse({
      category: c.req.query("category"),
    });
    if (!parsed.success) {
      throw new HTTPException(400, { message: "Invalid query parameters" });
    }
    const data = await repo().listServices({
      categorySlug: parsed.data.category,
    });
    return c.json({ data });
  });

  route.get("/services/:slug", async (c) => {
    const parsed = slugSchema.safeParse(c.req.param("slug"));
    if (!parsed.success) {
      throw new HTTPException(400, { message: "Invalid service slug" });
    }
    const data = await repo().getServiceDetail(parsed.data);
    if (!data) {
      throw new HTTPException(404, { message: "Service not found" });
    }
    return c.json({ data });
  });

  route.get("/extras", async (c) => {
    const parsed = listQuerySchema.safeParse({
      category: c.req.query("category"),
    });
    if (!parsed.success) {
      throw new HTTPException(400, { message: "Invalid query parameters" });
    }
    const data = await repo().listExtras({
      categorySlug: parsed.data.category,
    });
    return c.json({ data });
  });

  route.get("/personalization", async (c) => {
    const parsed = listQuerySchema.safeParse({
      category: c.req.query("category"),
    });
    if (!parsed.success) {
      throw new HTTPException(400, { message: "Invalid query parameters" });
    }
    const data = await repo().listPersonalizationFields({
      categorySlug: parsed.data.category,
    });
    return c.json({ data });
  });

  return route;
}
