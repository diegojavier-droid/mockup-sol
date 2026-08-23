/**
 * Identidad de la clienta.
 *
 *   POST /api/v1/identity/session   resolver quién es a partir de su login
 *   GET  /api/v1/identity/recent    sus últimos servicios REALIZADOS
 *
 * La identidad la prueba Supabase Auth (Google o email). Este módulo
 * decide a qué ficha corresponde y —lo importante— si puede ver el
 * historial de esa ficha.
 *
 * Regla que gobierna todo el módulo: el teléfono NO es autenticación.
 * Que alguien conozca un teléfono no le da acceso al historial de esa
 * persona. Coincidir sólo de teléfono deja el vínculo pendiente: puede
 * reservar, pero no ve nada de lo anterior.
 */

import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { ServerEnv } from "../../config/env";
import { createSupabaseAdminClient } from "../../lib/supabase";
import { normalizePhoneAr } from "../../domain/phone";
import {
  resolveCustomerIdentity,
  loadRecentServices,
  type IdentityResolution,
} from "../../lib/identity/repository";

interface AuthedUser {
  subject: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

/** Identidad probada por Supabase Auth. Nunca se confía en el cuerpo. */
async function authenticate(
  env: ServerEnv,
  c: { req: { header: (k: string) => string | undefined } },
) {
  const header = c.req.header("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) {
    throw new HTTPException(401, { message: "Iniciá sesión para continuar." });
  }

  const auth = createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await auth.auth.getUser(token);
  const email = data?.user?.email;
  if (error || !email || !data.user) {
    throw new HTTPException(401, { message: "Tu sesión venció. Volvé a entrar." });
  }

  const meta = (data.user.user_metadata ?? {}) as {
    full_name?: string;
    given_name?: string;
    family_name?: string;
  };
  const full = meta.full_name?.trim().split(/\s+/) ?? [];
  return {
    subject: data.user.id,
    email,
    firstName: meta.given_name ?? full[0] ?? null,
    lastName: meta.family_name ?? (full.length > 1 ? full.slice(1).join(" ") : null),
  } satisfies AuthedUser;
}

function toPublicResolution(r: IdentityResolution) {
  return {
    outcome: r.outcome,
    // Sólo se devuelve el nombre cuando la persona tiene derecho a esa
    // ficha. En un vínculo pendiente, decir el nombre ya sería filtrarlo.
    firstName: r.can_see_history ? (r.first_name ?? null) : null,
    canSeeHistory: r.can_see_history,
    linkStatus: r.link_status ?? null,
    needsPhone: r.outcome === "needs_phone",
    pendingReview: r.outcome === "pending_link",
  };
}

export function createIdentityRoute(env: ServerEnv) {
  const route = new Hono();

  route.post("/session", async (c) => {
    const user = await authenticate(env, c);

    const schema = z.object({ phone: z.string().min(6).max(30).optional() });
    const parsed = schema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw new HTTPException(400, { message: "Revisá el teléfono." });

    let phone: string | null = null;
    if (parsed.data.phone) {
      phone = normalizePhoneAr(parsed.data.phone);
      if (!phone) {
        throw new HTTPException(400, {
          message: "Revisá el teléfono: necesitamos un número donde podamos escribirte.",
        });
      }
    }

    const resolution = await resolveCustomerIdentity(createSupabaseAdminClient(env), {
      provider: "google",
      subject: user.subject,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone,
    });

    return c.json({ data: toPublicResolution(resolution) });
  });

  route.get("/recent", async (c) => {
    const user = await authenticate(env, c);
    const admin = createSupabaseAdminClient(env);

    const resolution = await resolveCustomerIdentity(admin, {
      provider: "google",
      subject: user.subject,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: null,
    });

    // Sin derecho a la ficha no hay historial. Se devuelve vacío en vez
    // de un error: la clienta puede reservar igual, sólo que empezando
    // por el catálogo.
    if (!resolution.can_see_history || !resolution.customer_id) {
      return c.json({ data: { firstName: null, services: [] } });
    }

    const services = await loadRecentServices(admin, resolution.customer_id, 3);
    return c.json({
      data: {
        firstName: resolution.first_name ?? null,
        services: services.map((s) => ({
          serviceSlug: s.service_slug,
          serviceName: s.service_name,
          lengthTier: s.length_tier,
          lastDoneAt: s.last_done_at,
          timesDone: Number(s.times_done),
        })),
      },
    });
  });

  return route;
}
