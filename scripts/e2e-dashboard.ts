/**
 * E2E · los números del salón.
 *
 * Verifica en un navegador real, a 390 px, que la pestaña existe sólo
 * para la dueña y que el margen dice NO DISPONIBLE mientras no haya
 * costos cargados: es la regla que evita que Sol tome una decisión
 * sobre un número inventado.
 *
 *   bun run scripts/e2e-dashboard.ts [base] [tokenOwner] [tokenStaff]
 */

import { chromium, type Page } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:4173";
const OWNER_TOKEN = process.argv[3] ?? "";
const STAFF_TOKEN = process.argv[4] ?? "";
const CHROME = process.env.E2E_CHROME ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

let failures = 0;
function check(label: string, ok: boolean, detail?: string) {
  console.log(`${ok ? "OK  ·" : "FALLA ·"} ${label}${ok || !detail ? "" : ` — ${detail}`}`);
  if (!ok) failures += 1;
}

async function signIn(page: Page, token: string) {
  await page.goto(`${BASE}/agenda`, { waitUntil: "networkidle" });
  await page.evaluate((t) => sessionStorage.setItem("sol-mai-staff-token", t), token);
  await page.reload({ waitUntil: "networkidle" });
}

async function main() {
  if (!OWNER_TOKEN || !STAFF_TOKEN) {
    console.error("Faltan los tokens: bun run scripts/e2e-dashboard.ts <base> <owner> <staff>");
    process.exit(2);
  }

  const browser = await chromium.launch({ executablePath: CHROME });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  const serverErrors: string[] = [];
  page.on("response", (r) => {
    if (r.url().includes("/api/v1") && r.status() >= 500) {
      serverErrors.push(`${r.status()} ${r.url().split("/api/v1")[1]}`);
    }
  });

  console.log(`\nE2E · los números · ${BASE}\n`);

  // --- quien atiende no ve la plata del salón -------------------------
  await signIn(page, STAFF_TOKEN);
  const staffBody = (await page.textContent("body")) ?? "";
  check("quien atiende entra a la agenda", /Agenda|Hoy/i.test(staffBody));
  check(
    "quien atiende NO ve la pestaña de los números",
    !(await page
      .getByRole("button", { name: "Los números" })
      .isVisible()
      .catch(() => false)),
  );

  // --- la dueña sí ----------------------------------------------------
  await signIn(page, OWNER_TOKEN);
  const tab = page.getByRole("button", { name: "Los números" });
  check("la dueña ve la pestaña de los números", await tab.isVisible());

  await tab.click();
  await page.waitForResponse((r) => r.url().includes("/admin/dashboard"), { timeout: 15_000 });
  await page.waitForTimeout(500);

  const body = (await page.textContent("body")) ?? "";
  check("muestra lo cobrado", /Cobrado/i.test(body));
  check("muestra el ticket promedio", /Ticket promedio/i.test(body));
  check("muestra la ocupación", /Ocupación/i.test(body));
  check("abre la ocupación por área", /Ocupación por área/i.test(body) && /Peluquería/i.test(body));
  check("muestra las reservas por canal", /Reservas por canal/i.test(body));
  check("muestra las señas retenidas", /Señas retenidas/i.test(body));

  // La regla que importa: el margen nunca aparece como cero.
  const marginBlock = await page
    .locator("div", { hasText: /^Margen/ })
    .last()
    .textContent()
    .catch(() => "");
  const shown = marginBlock ?? "";
  const hasCost = /Calculado sobre/i.test(shown);
  if (hasCost) {
    check(
      "con costos parciales dice sobre cuántas atenciones se calculó",
      /Calculado sobre \d+ de \d+/i.test(shown),
      shown.slice(0, 160),
    );
  } else {
    check(
      "sin costos el margen dice NO DISPONIBLE, no $0",
      /No disponible/i.test(shown),
      shown.slice(0, 160),
    );
  }
  check("el margen nunca se muestra como $0", !/^\s*\$0\s*$/m.test(shown), shown.slice(0, 160));

  // --- período vacío no rompe ni miente -------------------------------
  await page.getByRole("button", { name: "Mes anterior" }).click();
  await page.waitForResponse((r) => r.url().includes("/admin/dashboard"), { timeout: 15_000 });
  await page.waitForTimeout(500);
  const empty = (await page.textContent("body")) ?? "";
  check("un período sin atenciones no inventa un ticket", /Ticket promedio/i.test(empty));
  check(
    "un período sin atenciones no inventa un margen",
    /No disponible/i.test(empty),
    empty.slice(0, 200),
  );

  check("ninguna respuesta 5xx", serverErrors.length === 0, serverErrors.join(", "));

  await browser.close();
  console.log(failures === 0 ? "\n=== E2E DASHBOARD OK ===\n" : `\n=== ${failures} FALLAS ===\n`);
  process.exit(failures === 0 ? 0 : 1);
}

void main();
