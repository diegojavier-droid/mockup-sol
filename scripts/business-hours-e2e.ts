/** Component QA against synthetic HTTP fixtures only. Never contacts Supabase. */
import { chromium } from "playwright";
import { mkdtemp, rm, symlink, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import assert from "node:assert/strict";
import type { QueryClient } from "@tanstack/react-query";

declare global {
  interface Window {
    qc: QueryClient;
  }
}

const root = resolve(import.meta.dir, "..");
const temp = await mkdtemp(join(tmpdir(), "solmai-hours-"));
await symlink(join(root, "node_modules"), join(temp, "node_modules"), "dir");
const entry = join(temp, "entry.tsx");
await Bun.write(
  entry,
  `
import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BusinessHoursScreen } from ${JSON.stringify(join(root, "src/components/booking/admin/BusinessHoursScreen.tsx"))};
sessionStorage.setItem("sol-mai-staff-token", "fixture");
const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
window.qc = qc;
qc.setQueryData(["salon-info"], { hours: [] });
qc.setQueryData(["availability", "fixture"], { slots: [] });
createRoot(document.getElementById("root")).render(<QueryClientProvider client={qc}><BusinessHoursScreen /></QueryClientProvider>);
`,
);
const build = await Bun.build({
  entrypoints: [entry],
  outdir: temp,
  target: "browser",
  tsconfig: join(root, "tsconfig.json"),
  naming: "app.js",
  define: { "process.env.NODE_ENV": '"development"' },
});
if (!build.success) throw new Error(build.logs.join("\n"));
let rows = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    weekday: 2,
    opens_at: "08:00:00",
    closes_at: "15:00:00",
    is_active: true,
  },
];
const assets = join(root, "dist/client/assets");
const css = (await readdir(assets)).find(
  (file) => file.startsWith("styles-") && file.endsWith(".css"),
);
if (!css) throw new Error("Run bun run build before component QA.");
let level = "full";
let mode = "ok";
let releaseSlowPatch = () => {};
let notifySlowPatch = () => {};
const writes: unknown[] = [];
let getFailure = false;
const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === "/style.css") return new Response(Bun.file(join(assets, css)));
    if (url.pathname === "/app.js") return new Response(Bun.file(join(temp, "app.js")));
    if (url.pathname === "/api/v1/admin/me")
      return Response.json({ data: { permisos: { configuracion: level } } });
    if (url.pathname === "/api/v1/admin/business-hours")
      return getFailure
        ? Response.json({ error: { message: "No pudimos cargar los horarios." } }, { status: 503 })
        : Response.json({ data: rows });
    if (url.pathname.startsWith("/api/v1/admin/business-hours/") && req.method === "PATCH") {
      const body = await req.json();
      writes.push(body);
      if (mode === "slow") {
        await new Promise<void>((resolve) => {
          releaseSlowPatch = resolve;
          notifySlowPatch();
        });
      }
      if (mode === "error")
        return Response.json(
          { error: { message: "No pudimos guardar. Probá de nuevo." } },
          { status: 503 },
        );
      if (mode === "conflict") {
        rows = [{ ...rows[0], opens_at: "10:00:00" }];
        return Response.json(
          { error: { message: "El horario cambió. Cancelá la edición y volvé a abrirlo." } },
          { status: 409 },
        );
      }
      rows = [
        {
          ...rows[0],
          ...(body.opensAt !== undefined ? { opens_at: body.opensAt } : {}),
          ...(body.closesAt !== undefined ? { closes_at: body.closesAt } : {}),
          ...(body.isActive !== undefined ? { is_active: body.isActive } : {}),
        },
      ];
      return Response.json({ data: { ok: true, hour: rows[0] } });
    }
    if (url.pathname.startsWith("/api/"))
      return Response.json({ error: { message: "Unexpected fixture route" } }, { status: 404 });
    return new Response(
      '<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Horarios QA</title><link rel="stylesheet" href="/style.css"><main id="root" class="mx-auto max-w-3xl p-4"></main><script type="module" src="/app.js"></script></html>',
      { headers: { "content-type": "text/html" } },
    );
  },
});
let browser;
try {
  browser = await chromium.launch({
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
    headless: true,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    return url.hostname === "127.0.0.1" ? route.continue() : route.abort();
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => {
    errors.push(error.message);
    console.error("Browser error:", error.message);
  });
  page.on("console", (message) => {
    if (message.type() === "error") console.error("Browser console:", message.text());
  });
  await page.goto(`http://127.0.0.1:${server.port}`);
  const edit = () => page.getByRole("button", { name: /Editar Martes/ });
  const save = () => page.getByRole("button", { name: "Guardar", exact: true });
  await edit().waitFor();
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    true,
  );
  assert.equal(
    await page.getByRole("region", { name: "Sábado", exact: true }).textContent(),
    "SábadoSin horario online cargado.",
  );
  // Cancel discards the draft and sends nothing.
  await edit().click();
  await page.getByLabel("Apertura", { exact: true }).fill("09:00");
  await page.getByRole("button", { name: "Cancelar" }).click();
  assert.equal(writes.length, 0);
  await edit().click();
  assert.equal(await page.getByLabel("Apertura", { exact: true }).inputValue(), "08:00");
  assert.equal(await save().isDisabled(), true);
  // Invalid and empty values cannot save.
  await page.getByLabel("Cierre", { exact: true }).fill("07:00");
  assert.equal(await save().isDisabled(), true);
  await page.getByLabel("Cierre", { exact: true }).fill("");
  assert.equal(await save().isDisabled(), true);
  await page.getByLabel("Cierre", { exact: true }).fill("16:00");
  mode = "error";
  await save().click();
  await page.getByRole("alert").filter({ hasText: "No pudimos guardar" }).waitFor();
  assert.equal(await page.getByLabel("Cierre", { exact: true }).inputValue(), "16:00");
  // Retry after failure succeeds; repeated submission is guarded.
  mode = "slow";
  const started = new Promise<void>((resolve) => {
    notifySlowPatch = resolve;
  });
  await save().click();
  await started;
  await page.locator("form").evaluate((form) => {
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
  assert.equal(await page.getByRole("button", { name: "Cancelar" }).isDisabled(), true);
  releaseSlowPatch();
  await page.getByRole("status").filter({ hasText: "Horario guardado" }).waitFor();
  assert.equal(writes.length, 2);
  assert.equal(rows[0].closes_at, "16:00");
  const invalidated = await page.evaluate(() => [
    window.qc.getQueryState(["salon-info"])?.isInvalidated,
    window.qc.getQueryState(["availability", "fixture"])?.isInvalidated,
  ]);
  assert.deepEqual(invalidated, [true, true]);
  // An incoming refetch does not overwrite an unsaved draft.
  await edit().click();
  await page.getByLabel("Apertura", { exact: true }).fill("09:30");
  await page.evaluate(() => window.qc.invalidateQueries({ queryKey: ["admin", "business-hours"] }));
  assert.equal(await page.getByLabel("Apertura", { exact: true }).inputValue(), "09:30");
  // A failed refetch must not unmount the editor or lose its draft.
  getFailure = true;
  await page.evaluate(() => window.qc.invalidateQueries({ queryKey: ["admin", "business-hours"] }));
  await page.getByText("No pudimos cargar los horarios.").waitFor();
  assert.equal(await page.getByLabel("Apertura", { exact: true }).inputValue(), "09:30");
  getFailure = false;
  await page.getByRole("button", { name: "Volver a cargar" }).click();
  await page.getByText("No pudimos cargar los horarios.").waitFor({ state: "hidden" });
  assert.equal(await page.getByLabel("Apertura", { exact: true }).inputValue(), "09:30");
  mode = "conflict";
  await save().click();
  await page.getByRole("alert").filter({ hasText: "El horario cambió" }).waitFor();
  await page.waitForFunction(
    () =>
      window.qc.getQueryData<{ opens_at: string }[]>(["admin", "business-hours"])?.[0]?.opens_at ===
      "10:00:00",
  );
  assert.equal(await page.getByLabel("Apertura", { exact: true }).inputValue(), "09:30");
  await page.getByRole("button", { name: "Cancelar" }).click();
  await edit().click();
  assert.equal(await page.getByLabel("Apertura", { exact: true }).inputValue(), "10:00");
  // Disable and restore an existing interval without deleting it.
  mode = "ok";
  await page.getByLabel("Ofrecer turnos online").uncheck();
  await save().click();
  await page.getByRole("status").filter({ hasText: "Horario guardado" }).waitFor();
  assert.equal(rows[0].is_active, false);
  await edit().click();
  await page.getByLabel("Ofrecer turnos online").check();
  await save().click();
  await page.getByRole("status").filter({ hasText: "Horario guardado" }).waitFor();
  assert.equal(rows[0].is_active, true);
  // Permission revocation closes the editor; read-only cannot mutate.
  await edit().click();
  level = "view";
  await page.evaluate(() => window.qc.invalidateQueries({ queryKey: ["admin", "me"] }));
  await page.getByText("Tu acceso permite ver los horarios, sin cambiarlos.").waitFor();
  assert.equal(await page.getByRole("button", { name: /Editar|Guardar/ }).count(), 0);
  level = "none";
  await page.reload();
  await page.getByText("No tenés acceso a los horarios del salón.").waitFor();
  assert.equal(await page.getByText("08:00").count(), 0);
  // Failed load is recoverable without inventing a schedule.
  level = "full";
  getFailure = true;
  await page.reload();
  await page.getByRole("button", { name: "Volver a cargar" }).waitFor();
  assert.equal(await edit().count(), 0);
  getFailure = false;
  await page.getByRole("button", { name: "Volver a cargar" }).click();
  await edit().waitFor();
  await page.setViewportSize({ width: 1440, height: 900 });
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    true,
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: mobile/desktop component fixture; cancel, invalid inputs, errors/retry, repeated submit, conflicts, background refetch, inactive/reopen, cache invalidation, view/none/revoked permissions and failed-load recovery.",
  );
} finally {
  await browser?.close();
  server.stop(true);
  await rm(temp, { recursive: true, force: true });
}
