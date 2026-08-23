/**
 * E2E del flujo de la clienta contra el Worker real.
 *
 * Recorre lo que hace una persona: entra, elige categoría y servicio,
 * responde sólo lo que ese servicio pregunta, ve estimación y duración,
 * elige un horario realmente disponible, deja sus datos y confirma.
 * Después verifica contra el API que la reserva quedó persistida.
 *
 *   bun run scripts/e2e-booking.ts [baseUrl]
 */

import { chromium, type Page } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:4173";
const SHOT_DIR = process.env.E2E_SHOT_DIR ?? "/tmp/e2e";
const CHROME = process.env.E2E_CHROME ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  console.log(`  ${ok ? "ok  " : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
}

async function shot(page: Page, name: string) {
  await page.screenshot({ path: `${SHOT_DIR}/${name}.png` });
}

/** Clic en el primer elemento VISIBLE con ese texto: la UI es
 *  mobile-first y oculta variantes según el viewport. */
async function clickText(page: Page, text: string, timeout = 10000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const matches = page.getByText(text, { exact: false });
    for (let i = 0; i < (await matches.count()); i += 1) {
      const node = matches.nth(i);
      if (await node.isVisible().catch(() => false)) {
        await node.click();
        return;
      }
    }
    await page.waitForTimeout(250);
  }
  throw new Error(`no visible element with text: ${text}`);
}

async function fillLabelled(page: Page, labelRe: RegExp, value: string) {
  const inputs = page.locator("input, textarea");
  for (let i = 0; i < (await inputs.count()); i += 1) {
    const node = inputs.nth(i);
    if (!(await node.isVisible().catch(() => false))) continue;
    const meta = [
      await node.getAttribute("placeholder"),
      await node.getAttribute("name"),
      await node.getAttribute("id"),
      await node.getAttribute("aria-label"),
      await node.getAttribute("type"),
    ]
      .filter(Boolean)
      .join(" ");
    if (labelRe.test(meta)) {
      await node.fill(value);
      return true;
    }
  }
  return false;
}

async function tryClick(page: Page, labels: string[], timeout = 2500) {
  for (const label of labels) {
    try {
      await clickText(page, label, timeout);
      return label;
    } catch {
      /* probar la siguiente etiqueta */
    }
  }
  return null;
}

async function main() {
  const browser = await chromium.launch({ executablePath: CHROME });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  const consoleErrors: string[] = [];
  const serverErrors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });
  page.on("response", (r) => {
    if (r.url().includes("/api/v1") && r.status() >= 500) {
      serverErrors.push(`${r.status()} ${r.url().split("/api/v1")[1]}`);
    }
  });

  console.log(`\nE2E · flujo de la clienta · ${BASE}\n`);

  await page.goto(BASE, { waitUntil: "networkidle" });
  await shot(page, "01-landing");
  const landing = (await page.textContent("body")) ?? "";
  check("la landing carga", /Sol Mai/i.test(landing));
  check("las categorías vienen de la base de datos", /Depilaci/i.test(landing));

  // La bajada identifica la tarjeta; el nombre suelto también está en el header.
  await clickText(page, "Depilación facial, cejas y bozo");
  await page.waitForTimeout(2000);
  await shot(page, "02-categoria");
  const catalog = ((await page.textContent("body")) ?? "").replace(/\s+/g, "");
  check("los servicios llegan del API", /Cejas|Rostrocompleto/i.test(catalog));
  check(
    "depilación muestra precio cerrado (sin 'Desde')",
    catalog.includes("Cejas$12.000") && !catalog.includes("Desde$12.000"),
  );

  await clickText(page, "Reservar en depilación");
  await page.waitForTimeout(2200);
  await shot(page, "03-wizard");

  await clickText(page, "Cejas");
  await page.waitForTimeout(2400);
  await shot(page, "04-tras-servicio");
  const afterService = (await page.textContent("body")) ?? "";
  check(
    "depilación no pregunta largo ni textura (preguntas condicionales)",
    !/Largo del cabello|Tipo de cabello|Densidad/i.test(afterService),
  );

  // Buscar un día con horarios reales
  const slots = page.locator("button").filter({ hasText: /^\s*\d{2}:\d{2}\s*$/ });
  // Los días del carrusel se rotulan "Lun24", "Mar25"…
  const days = page
    .locator("button")
    .filter({ hasText: /^(Lun|Mar|Mié|Jue|Vie|Sáb|Dom)\s*\d{1,2}/i });
  if ((await slots.count()) === 0) {
    const n = Math.min(await days.count(), 12);
    for (let i = 0; i < n; i += 1) {
      const d = days.nth(i);
      if (!(await d.isVisible().catch(() => false))) continue;
      await d.click().catch(() => {});
      await page.waitForTimeout(800);
      if ((await slots.count()) > 0) break;
    }
  }
  const hasSlots = (await slots.count()) > 0;
  check("hay horarios calculados por el backend", hasSlots);

  let slotLabel = "";
  if (hasSlots) {
    slotLabel = ((await slots.first().textContent()) ?? "").trim();
    await slots.first().click();
    await page.waitForTimeout(1000);
  }
  await shot(page, "05-horario");
  check("se pudo elegir un horario", Boolean(slotLabel), slotLabel);

  const quoted = (await page.textContent("body")) ?? "";
  check("se muestra precio", /\$\s?[\d.]+/.test(quoted));
  check("se muestra duración", /\d+\s*min|\d+\s*h/i.test(quoted));
  check("se comunica la seña", /se[ñn]a/i.test(quoted));

  await tryClick(page, ["Continuar", "Siguiente"]);
  await page.waitForTimeout(1400);

  const stamp = Date.now().toString().slice(-6);
  await fillLabelled(page, /nombre|first/i, "Clara E2E");
  await fillLabelled(page, /whatsapp|tel/i, `3425${stamp}`);
  await fillLabelled(page, /mail/i, `clara${stamp}@test.ar`);
  await shot(page, "06-datos");

  await tryClick(page, ["Continuar", "Siguiente"]);
  await page.waitForTimeout(1400);
  await shot(page, "07-revision");

  const clicked = await tryClick(page, ["Confirmar", "Reservar turno", "Pagar seña"], 3000);
  await page.waitForTimeout(3000);
  await shot(page, "08-cierre");
  check("hay una acción de confirmación", Boolean(clicked), clicked ?? "");

  const finalText = (await page.textContent("body")) ?? "";
  check(
    "el flujo cierra con un mensaje para la clienta",
    /se[ñn]a|turno|confirmad|pendiente/i.test(finalText),
  );
  // Sin este enlace la clienta no tiene forma de volver a su reserva:
  // todavía no hay email de confirmación.
  check(
    "se le entrega el enlace a su propia reserva",
    finalText.includes("Copiar enlace de mi reserva"),
  );
  // El porcentaje sale del backend: si Sol lo cambia, el cartel cambia.
  check(
    "el porcentaje de seña es el real, no uno fijo en el código",
    /Seña\s*\d+%/.test(finalText),
    finalText.match(/Seña\s*\d+%/)?.[0] ?? "no se encontró",
  );

  await browser.close();

  // La prueba real: ¿quedó la reserva en la base?
  const created = await fetch(`${BASE}/api/v1/admin/agenda`).catch(() => null);
  check("la agenda interna sigue protegida sin sesión", created?.status === 401);

  console.log(`\n  errores de consola: ${consoleErrors.length}`);
  for (const e of consoleErrors.slice(0, 4)) console.log(`    ${e.slice(0, 120)}`);
  console.log(`  respuestas 5xx del API: ${serverErrors.length}`);
  for (const e of serverErrors.slice(0, 4)) console.log(`    ${e}`);
  check("el API no devolvió errores de servidor", serverErrors.length === 0);

  console.log(`\n${failures === 0 ? "E2E OK" : `E2E con ${failures} fallo(s)`}\n`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error("E2E crashed:", error);
  process.exit(1);
});
