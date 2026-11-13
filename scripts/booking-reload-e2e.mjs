/**
 * bun scripts/booking-reload-e2e.mjs
 * Uses an isolated browser and mocked API, never a real booking or payment.
 * Runs the actual client components without the Cloudflare development runtime.
 * CHROME_PATH may select an installed Chromium; otherwise uses Playwright's.
 */
import {browserProfile} from "./fixtures/browser-profile.mjs";
import {fileURLToPath} from "node:url";
import assert from "node:assert/strict";
import { chromium } from "playwright";

const root=fileURLToPath(new URL("../",import.meta.url));
const build = await Bun.build({
  ...browserProfile(root,"original"),
  entrypoints: [new URL("./fixtures/booking-reload.jsx", import.meta.url).pathname],
  target: "browser",
  define: { "process.env.NODE_ENV": '"development"' },
});
assert.ok(build.success, "client fixture must build");
const script = await build.outputs[0].text();
const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  fetch(req) {
    if (new URL(req.url).pathname === "/test.js") {
      return new Response(script, { headers: { "Content-Type": "text/javascript" } });
    }
    return new Response('<div id="root"></div><script type="module" src="/test.js"></script>', {
      headers: { "Content-Type": "text/html" },
    });
  },
});
const base = `http://127.0.0.1:${server.port}`;
const browser = await chromium.launch({
  ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.route("**/*", (route) => {
  if (new URL(route.request().url()).origin !== base) return route.abort();
  return route.continue();
});
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
let creates = 0;
let reads = 0;
let checkouts = 0;
let status = "pending_payment";
let failRead = false;
let failCreate = true;
const token = "synthetic-reload-test";
const booking = () => ({
  publicToken: token,
  status,
  startsAt: "2030-11-12T15:00:00Z",
  paymentRequiredUntil: new Date(Date.now() + 600_000).toISOString(),
  depositAmount: 2400,
  depositRatePct: 20,
  estimatedAmount: 12000,
  remainingAmount: 9600,
  items: [{ role: "main", name: "Cejas" }],
});
await page.route("**/api/v1/**", async (route) => {
  const path = new URL(route.request().url()).pathname.replace("/api/v1", "");
  const reply = (data, code = 200) =>
    route.fulfill({
      status: code,
      contentType: "application/json",
      body: JSON.stringify(code === 200 ? { data } : { error: { message: "Test unavailable" } }),
    });
  if (path === "/bookings") {
    creates++;
    await new Promise((resolve) => setTimeout(resolve, 75));
    return reply(booking(), failCreate ? 409 : 200);
  }
  if (path === `/bookings/${token}`) {
    reads++;
    return reply(booking(), failRead ? 503 : 200);
  }
  if (path === `/payments/checkout/${token}`) {
    checkouts++;
    return reply({ checkoutUrl: null, message: "Test: pago no habilitado" });
  }
  if (path === "/quote") {
    return reply({ ...booking(), estimatedMinAmount: 12000, durationShownMin: 15, items: [] });
  }
  if (path === "/availability") return reply({ bookableOnline: true, days: [] });
  if (path.startsWith("/catalog/services/")) {
    return reply({ slug: "cejas", personalization: [], extras: [], tiers: [], parameters: {} });
  }
  return reply({});
});
const key = "sol-mai-booking-draft-v1";
const draft = (paymentPending = false) => ({
  version: 1,
  updatedAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
  state: {
    currentStepKey: "customerData",
    selectedCategoryId: "depilacion",
    selectedServiceId: "cejas",
    personalization: {},
    additionalComments: "",
    selectedExtras: [],
    selectedDate: "2030-11-12",
    selectedTime: "12:00",
    customer: { firstName: "Prueba", whatsapp: "3425550000", email: "test@example.test" },
    paymentPending,
  },
});
const noDraft = async () => {
  assert.equal(await page.evaluate((key) => sessionStorage.getItem(key), key), null);
};
try {
  await page.goto(base);
  await page.evaluate(({ key, draft }) => sessionStorage.setItem(key, JSON.stringify(draft)), {
    key,
    draft: draft(),
  });
  await page.reload();
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: /^Continuar/ })
    .first()
    .click();
  const historyLength = await page.evaluate(() => history.length);
  const confirm = page.getByRole("button", { name: "Confirmar mi turno", exact: true });
  await confirm.waitFor();
  await confirm.click();
  await page.getByText("Test unavailable").waitFor();
  assert.equal(creates, 1);
  failCreate = false;
  // Same-tick repeated clicks exercise the ref before React disables it.
  await confirm.evaluate((button) => {
    button.click();
    button.click();
  });
  await page.waitForURL(`**/reserva/${token}`);
  await page.getByRole("button", { name: "Pagar la seña", exact: true }).waitFor();
  assert.equal(creates, 2);
  assert.equal(await page.evaluate(() => history.length), historyLength);
  await page.getByRole("button", { name: "Copiar el link de mi turno", exact: true }).waitFor();
  await noDraft();
  // Leaving and returning through browser history cannot revive the wizard.
  await page.getByRole("link", { name: /Volver al inicio/ }).click();
  await page.goBack();
  await page.getByRole("button", { name: "Pagar la seña", exact: true }).waitFor();
  assert.equal(creates, 2);
  const readsBefore = reads;
  await page.reload();
  await page.getByRole("button", { name: "Pagar la seña", exact: true }).waitFor();
  assert.ok(reads > readsBefore, "reload must query server state again");
  assert.match(await page.locator("body").innerText(), /2\.400/);
  assert.equal(creates, 2);
  await noDraft();
  await page.getByRole("button", { name: "Pagar la seña", exact: true }).click();
  await page.getByText("Test: pago no habilitado").waitFor();
  assert.equal(checkouts, 1);

  for (const [state, heading] of [
    ["confirmed", "Tu turno está confirmado"],
    ["expired", "Se venció el tiempo para reservar"],
    ["cancelled", "Este turno fue cancelado"],
  ]) {
    status = state;
    await page.reload();
    await page.getByRole("heading", { name: heading }).waitFor();
    assert.equal(await page.getByRole("button", { name: "Pagar la seña" }).count(), 0);
    assert.equal(creates, 2);
  }
  failRead = true;
  await page.reload();
  await page.getByRole("heading", { name: "No encontramos esa reserva" }).waitFor();
  assert.equal(await page.getByRole("button", { name: "Pagar la seña" }).count(), 0);
  assert.equal(creates, 2);
  failRead = false;

  await page.evaluate(({ key, draft }) => sessionStorage.setItem(key, JSON.stringify(draft)), {
    key,
    draft: draft(true),
  });
  await page.goto(base);
  await page.getByRole("heading", { name: "No encontramos esa reserva" }).waitFor();
  assert.doesNotMatch(await page.locator("body").innerText(), /\$0|Pagar la seña|Ya pagué/);
  await noDraft();
  await page.getByRole("button", { name: "Volver al inicio", exact: true }).click();
  await page
    .getByRole("button", { name: /Ver servicios/i })
    .first()
    .waitFor();
  await page.reload();
  await page
    .getByRole("button", { name: /Ver servicios/i })
    .first()
    .waitFor();
  assert.equal(creates, 2);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: submit once, reload, pending/confirmed/expired/cancelled, read failure, legacy recovery, close/reload",
  );
} finally {
  await browser.close();
  server.stop(true);
}
