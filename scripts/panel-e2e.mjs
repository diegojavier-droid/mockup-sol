/**
 * Prueba del panel en un navegador real.
 *
 * Es la red que faltaba: el front tenía 75 archivos y uno solo con
 * prueba, y el panel es justamente donde se juega que Sol lo adopte. Cada
 * cosa que se verifica acá es algo que, si se rompe, Sol lo sufre.
 */
import { chromium } from "playwright";

const BASE = process.env.SOLMAI_E2E_BASE ?? "http://127.0.0.1:4173";
const TOKEN_SOL = process.argv[2];
const TOKEN_STAFF = process.argv[3];
const fallos = [];
const ok = (n, c, d = "") => {
  console.log(c ? `OK  · ${n}` : `FALLA · ${n}${d ? ` — ${d}` : ""}`);
  if (!c) fallos.push(n);
};

const browser = await chromium.launch({
  executablePath: process.env.SOLMAI_CHROME ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: [
    "--no-sandbox",
    "--disable-background-networking",
    "--disable-component-update",
    "--disable-sync",
  ],
});

async function abrirPanel(token) {
  const page = await browser.newPage({ viewport: { width: 420, height: 950 } });
  await page.route("**/*", (r) => {
    const u = r.request().url();
    return u.includes("127.0.0.1") || u.includes("localhost") ? r.continue() : r.abort();
  });
  await page.goto(`${BASE}/agenda`, { waitUntil: "domcontentloaded" });
  await page.evaluate((t) => window.sessionStorage.setItem("sol-mai-staff-token", t), token);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  return page;
}

console.log("── Sol (dueña)");
const sol = await abrirPanel(TOKEN_SOL);
let t = await sol.locator("body").innerText();
ok(
  "ve el mapa de módulos agrupado por frecuencia",
  /todos los d[íi]as/i.test(t) && /cada tanto/i.test(t),
);
ok("ve «El salón»", t.includes("El salón"));
ok("ve lo que todavía no está, apagado", t.includes("Todavía no"));

await sol.locator("button").filter({ hasText: "El salón" }).first().click();
await sol.waitForTimeout(2500);
t = await sol.locator("body").innerText();
ok("El salón abre con precios y tiempos", t.includes("Precios y tiempos"));
ok("y con puestos de trabajo", t.includes("Puestos de trabajo"));
ok("y con productos", t.includes("Productos que vendés"));
ok(
  "avisa que las preguntas del turno no se tocan desde acá",
  t.includes("no se cambian desde acá"),
);

// Cambiar un precio de verdad y comprobar que queda guardado.
const campo = sol.locator('input[aria-label^="Precio de Corte femenino"]').first();
ok("hay un campo de precio editable en la fila", (await campo.count()) > 0);
if (await campo.count()) {
  const antes = await campo.inputValue();
  await campo.fill("47000");
  await sol.locator("body").click();
  await sol.waitForTimeout(2000);
  const t2 = await sol.locator("body").innerText();
  ok("al guardar muestra «antes → ahora»", /→/.test(t2), t2.slice(0, 160));
  ok("y ofrece deshacer", t2.includes("Deshacer"));
  const dsh = sol.locator("button", { hasText: /^Deshacer$/ }).first();
  if (await dsh.count()) {
    await dsh.click();
    await sol.waitForTimeout(2000);
    const vuelto = await sol
      .locator('input[aria-label^="Precio de Corte femenino"]')
      .first()
      .inputValue();
    ok(`deshacer devuelve el precio anterior (${antes})`, vuelto === antes, `quedó ${vuelto}`);
  }
}

console.log("\n── Quien atiende");
const staff = await abrirPanel(TOKEN_STAFF);
const ts = await staff.locator("body").innerText();
ok("puede trabajar el día", ts.includes("Hoy"));
ok("NO ve «El salón»", !ts.includes("El salón"));
ok("NO ve los números", !ts.includes("Los números"));

await browser.close();
console.log(fallos.length ? `\n=== PANEL CON ${fallos.length} FALLA(S) ===` : "\n=== PANEL OK ===");
process.exit(fallos.length ? 1 : 0);
