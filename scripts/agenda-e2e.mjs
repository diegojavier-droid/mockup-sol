/**
 * Agenda real + hooks reales, API sintética y toda salida externa bloqueada.
 * No requiere credenciales, Supabase ni datos del salón.
 * bun run test:e2e:agenda (SOLMAI_CHROME opcional si Chromium ya está instalado).
 */
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { chromium } from "playwright";

const root = fileURLToPath(new URL("../", import.meta.url));
const server = await createServer({
  configFile: false,
  root,
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": `${root}src` } },
  optimizeDeps: { entries: ["scripts/fixtures/agenda.html"] },
  server: { host: "127.0.0.1", port: 0, hmr: false },
});
await server.listen();
const base = `http://127.0.0.1:${server.httpServer.address().port}`;
let browser;

const seed = {
  id: "synthetic-booking",
  publicToken: "synthetic-public-token",
  startsAt: "2026-11-12T13:00:00Z",
  endsAt: "2026-11-12T14:00:00Z",
  shownDurationMin: 60,
  status: "confirmed",
  hasServiceClosure: false,
  source: "online",
  depositStatus: "paid",
  depositAmount: 4000,
  priceEstimatedMin: 20000,
  priceDisplayMode: "fixed",
  createdViaOverride: false,
  overrideReason: null,
  area: "peluqueria",
  customerNote: null,
  station: null,
  customer: {
    id: "synthetic-customer",
    firstName: "Prueba",
    lastName: null,
    phone: "",
    email: null,
  },
  services: ["Servicio de prueba"],
};

async function scenario(viewport, overrides = {}, options = {}) {
  const context = await browser.newContext({ viewport, serviceWorkers: "block" });
  const state = {
    entry: { ...seed, ...overrides },
    payments: [],
    calls: [],
    failArrival: false,
    failClose: false,
  };
  const page = await context.newPage();
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== base) return route.abort();
    if (!url.pathname.startsWith("/api/")) return route.continue();
    const reply = (data, status = 200) => route.fulfill({ status, json: { data } });
    const failure = (message) => route.fulfill({ status: 409, json: { error: { message } } });
    if (url.pathname === "/api/v1/admin/areas") return reply([]);
    if (url.pathname === "/api/v1/admin/agenda")
      return reply({ date: "2026-11-12", days: 1, entries: [state.entry] });
    state.calls.push({ path: url.pathname, body: request.postDataJSON() });
    if (url.pathname.endsWith("/status")) {
      if (state.failArrival) return failure("No se pudo registrar la llegada.");
      assert.equal(request.postDataJSON().status, "attended");
      state.entry.status = "attended";
      return reply({ status: "attended" });
    }
    if (url.pathname.endsWith("/no-show/revert")) {
      state.entry.status = "attended";
      if (state.entry.depositStatus === "retained") state.entry.depositStatus = "paid";
      return reply({ message: "Turno corregido." });
    }
    if (url.pathname.endsWith("/close")) {
      if (state.failClose) return failure("No se pudo registrar el cierre.");
      if (options.waitForClose) await options.waitForClose;
      assert.equal(
        state.entry.hasServiceClosure,
        false,
        "no recerrar una atención cobrada desde un formulario vacío",
      );
      const body = request.postDataJSON();
      state.payments = body.payments;
      state.entry.status = "attended";
      state.entry.hasServiceClosure = true;
      const collected = body.payments.reduce(
        (sum, p) => sum + p.amount,
        state.entry.depositStatus === "paid" ? state.entry.depositAmount : 0,
      );
      return reply({
        message: "Atención cerrada.",
        status: "attended",
        final_price: body.finalPrice,
        collected,
        outstanding: Math.max(body.finalPrice - collected, 0),
      });
    }
    throw new Error(`API sin fixture: ${request.method()} ${url.pathname}`);
  });
  await page.goto(`${base}/scripts/fixtures/agenda.html`);
  await page.locator("article").waitFor();
  const closeAction = () => page.getByRole("button", { name: "Cerrar atención", exact: true });
  const waitClosed = () =>
    page.waitForFunction(
      () =>
        ![...document.querySelectorAll("button")].some(
          (button) => button.textContent === "Cerrar atención",
        ),
    );
  return { context, page, state, closeAction, waitClosed };
}

try {
  browser = await chromium.launch({
    ...(process.env.SOLMAI_CHROME ? { executablePath: process.env.SOLMAI_CHROME } : {}),
    args: [
      "--no-sandbox",
      "--disable-background-networking",
      "--disable-component-update",
      "--disable-sync",
    ],
  });

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 1280, height: 900 },
  ]) {
    let releaseClose;
    const waitForClose = new Promise((resolve) => {
      releaseClose = resolve;
    });
    const { context, page, state, closeAction, waitClosed } = await scenario(
      viewport,
      {},
      { waitForClose },
    );
    await page.getByRole("button", { name: "Llegó", exact: true }).click();
    await page.getByText("Prueba llegó.", { exact: true }).waitFor();
    await closeAction().waitFor();
    assert.equal(await page.getByRole("button", { name: "No vino", exact: true }).count(), 0);
    assert.equal(await page.getByRole("button", { name: "Asignar un puesto" }).count(), 0);
    assert.deepEqual(state.payments, [], "marcar llegada no registra ningún cobro");

    // Cancelar el formulario no cambia el estado ni manda cobros.
    await closeAction().click();
    await page.getByRole("button", { name: "Cerrar", exact: true }).click();
    assert.equal(state.calls.filter((c) => c.path.endsWith("/close")).length, 0);
    await closeAction().click();
    await page.getByText("Ya abonó $4.000 de seña.", { exact: true }).waitFor();
    await page.getByPlaceholder("Monto", { exact: true }).fill("16000");
    await page.getByText("Sin saldo pendiente.", { exact: true }).waitFor();
    await closeAction().last().click();
    await page.getByRole("button", { name: "Cerrando…", exact: true }).waitFor();
    assert.equal(
      await page.getByRole("button", { name: "Cerrar", exact: true }).isDisabled(),
      true,
    );
    assert.equal(
      await page.getByRole("button", { name: "Cerrando…", exact: true }).isDisabled(),
      true,
    );
    releaseClose();
    await page.getByText("Atención cerrada.", { exact: true }).waitFor();
    await waitClosed();
    assert.deepEqual(state.payments, [{ amount: 16000, method: "efectivo", kind: "balance" }]);
    assert.equal(state.calls.filter((c) => c.path.endsWith("/close")).length, 1);
    await page.reload();
    await page.locator("article").waitFor();
    assert.equal(await closeAction().count(), 0, "la recarga no habilita recobrar");
    await context.close();
    console.log(`OK llegada → cancelar → cerrar → recargar, ${viewport.width}px`);
  }

  const viewport = { width: 390, height: 844 };
  {
    const { context, page, state, closeAction, waitClosed } = await scenario(viewport, {
      status: "no_show",
      depositStatus: "retained",
    });
    await page.getByRole("button", { name: "Vino igual" }).click();
    await page.getByText("Turno corregido.", { exact: true }).waitFor();
    await closeAction().waitFor();
    await closeAction().click();
    await page.getByText("Ya abonó $4.000 de seña.", { exact: true }).waitFor();
    await page.getByPlaceholder("Monto").fill("16000");
    await closeAction().last().click();
    await waitClosed();
    assert.deepEqual(state.payments, [{ amount: 16000, method: "efectivo", kind: "balance" }]);
    await context.close();
    console.log("OK Vino igual permite cerrar descontando la seña recuperada");
  }
  {
    const { context, page, state, closeAction, waitClosed } = await scenario(viewport, {
      status: "attended",
    });
    await closeAction().click();
    await page.getByPlaceholder("Monto").fill("16000");
    state.entry.hasServiceClosure = true;
    await page.evaluate(() => window.dispatchEvent(new Event("test:refresh-agenda")));
    await waitClosed();
    assert.equal(state.calls.filter((c) => c.path.endsWith("/close")).length, 0);
    await context.close();
    console.log(
      "OK un cierre registrado por otra persona descarta el formulario sin enviar cobros",
    );
  }
  {
    const { context, page, state, closeAction, waitClosed } = await scenario(viewport, {
      source: "manual",
      depositStatus: "not_required",
      depositAmount: 0,
    });
    await closeAction().click();
    await page.getByText("Queda un saldo de $20.000.", { exact: true }).waitFor();
    await closeAction().last().click();
    await waitClosed();
    assert.deepEqual(state.payments, [], "cerrar sin cobro no inventa dinero recibido");
    await context.close();
    console.log("OK cierre sin seña ni cobro conserva saldo sin inventar pagos");
  }
  for (const overrides of [
    { status: "attended", hasServiceClosure: true },
    { status: "confirmed", hasServiceClosure: true },
    { status: "attended", hasServiceClosure: undefined },
    { status: "cancelled" },
    { status: "expired" },
    { status: "pending_payment" },
    { status: "no_show" },
  ]) {
    const { context, closeAction } = await scenario(viewport, overrides);
    assert.equal(await closeAction().count(), 0, JSON.stringify(overrides));
    await context.close();
  }
  console.log("OK no reabrir cobros existentes, desconocidos ni estados no cerrables");
  {
    const { context, page, state, closeAction, waitClosed } = await scenario(viewport);
    state.failArrival = true;
    await page.getByRole("button", { name: "Llegó", exact: true }).click();
    await page.getByRole("alert").getByText("No se pudo registrar la llegada.").waitFor();
    assert.equal(state.entry.status, "confirmed");
    await closeAction().click();
    await page.getByPlaceholder("Monto").fill("16000");
    state.failClose = true;
    await closeAction().last().click();
    await page.getByText("No se pudo registrar el cierre.", { exact: true }).waitFor();
    assert.equal(await page.getByPlaceholder("Monto").inputValue(), "16000");
    assert.deepEqual(state.payments, []);
    state.failClose = false;
    await closeAction().last().click();
    await waitClosed();
    assert.equal(state.payments.length, 1);
    await context.close();
    console.log("OK errores visibles, datos preservados y reintento sin duplicar");
  }
} finally {
  await browser?.close();
  await server.close();
}
