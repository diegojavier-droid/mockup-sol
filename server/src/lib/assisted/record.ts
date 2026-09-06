/**
 * Registro de lo que la web resolvió sin que interviniera una persona.
 *
 * Dirección fijó que la métrica estratégica es la carga administrativa
 * evitada. Para poder calcularla algún día hay que empezar a contar hoy:
 * cada consulta que la web contesta sin dejar rastro es una medición que
 * se pierde para siempre.
 *
 * Dos reglas de diseño:
 *
 * 1. Contar NUNCA puede degradar la respuesta a la clienta. El registro
 *    va por `waitUntil` cuando la plataforma lo ofrece, y si falla se
 *    traga el error: una consulta de precio no se rompe porque el
 *    contador esté caído.
 *
 * 2. El nombre dice lo que pasó, no lo que suponemos. "La web contestó
 *    un precio" es un hecho; "se evitó un WhatsApp" es una inferencia.
 */

import type { SupabaseAdminClient } from "../supabase";

export type AssistedMetric = "quote_self_service" | "availability_self_service";

/** Lo que Cloudflare Workers expone para trabajo posterior a la respuesta. */
export interface WaitUntilContext {
  waitUntil?: (promise: Promise<unknown>) => void;
}

export async function recordAssistedActivity(
  admin: SupabaseAdminClient,
  metric: AssistedMetric,
): Promise<void> {
  const { error } = await admin.rpc("record_assisted_activity", { p_metric: metric });
  if (error) throw new Error(error.message ?? "record_assisted_activity failed");
}

/**
 * Versión que no espera ni propaga: para usar en las rutas públicas.
 *
 * Devuelve la promesa para que los tests puedan esperarla; en producción
 * nadie la aguarda.
 */
export function recordAssistedActivityInBackground(
  admin: SupabaseAdminClient,
  metric: AssistedMetric,
  ctx?: WaitUntilContext | null,
): Promise<void> {
  const work = recordAssistedActivity(admin, metric).catch((error: unknown) => {
    // Un contador caído no es motivo para que la clienta vea un error.
    console.error(
      JSON.stringify({
        evento: "assisted_activity_no_registrada",
        metrica: metric,
        detalle: error instanceof Error ? error.message : String(error),
      }),
    );
  });
  ctx?.waitUntil?.(work);
  return work;
}

/**
 * `c.executionCtx` de Hono lanza cuando la plataforma no lo ofrece —los
 * tests y el runtime de Node, por ejemplo—. Preguntarlo así evita tener
 * que rodear cada ruta con un try.
 */
export function waitUntilContextOf(c: {
  executionCtx?: unknown;
}): WaitUntilContext | null {
  try {
    const ctx = c.executionCtx as WaitUntilContext | undefined;
    return ctx && typeof ctx.waitUntil === "function" ? ctx : null;
  } catch {
    return null;
  }
}
