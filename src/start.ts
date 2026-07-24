import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";

// NOTE: `attachSupabaseAuth` (from `@/integrations/supabase/auth-attacher`)
// is intentionally NOT registered here. Auth is out of scope for the current
// phase (Bloque 3.2.1); the attacher calls `supabase.auth.getSession()` on
// every serverFn call from the browser, which would touch localStorage and
// hit Supabase Auth even though no protected serverFn or login flow exists
// yet. Re-add it in the same commit that introduces the first protected
// serverFn or authenticated route.

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

export const startInstance = createStart(() => ({
  functionMiddleware: [],
  requestMiddleware: [errorMiddleware],
}));
