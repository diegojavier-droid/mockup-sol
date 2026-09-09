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

async function abrirPanel(token, { sinAsistente = false } = {}) {
  const page = await browser.newPage({ viewport: { width: 420, height: 950 } });
  await page.route("**/*", (r) => {
    const u = r.request().url();
    return u.includes("127.0.0.1") || u.includes("localhost") ? r.continue() : r.abort();
  });
  if (sinAsistente) {
    // Simula un despliegue sin ANTHROPIC_API_KEY. Es el estado por
    // defecto y el que más importa: si el campo se mostrara igual, Sol
    // tocaría un botón que falla, y eso enseña a no tocar nada.
    //
    // Va DESPUÉS del comodín a propósito: Playwright prueba las rutas en
    // orden inverso al de registro, así que la última que se agrega es la
    // primera que gana.
    await page.route("**/admin/salon/asistente", (r) =>
      r.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: { disponible: false } }),
      }),
    );
  }
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

// El asistente de precios. La clave que corre en esta prueba es falsa a
// propósito: lo que se verifica es que el campo esté, que el error se
// cuente en castellano y que la pantalla siga viva. Que el modelo
// entienda bien una frase es otra prueba y necesita una clave real.
console.log("\n── El asistente de precios");
{
  const t3 = await sol.locator("body").innerText();
  ok("con clave configurada, ofrece cambiar varios de una vez", t3.includes("Cambiar varios"));

  const campoIA = sol.locator("#asistente-precios");
  ok("hay dónde escribir la instrucción", (await campoIA.count()) > 0);
  if (await campoIA.count()) {
    const boton = sol.locator("button", { hasText: /Ver qué cambia/ }).first();
    ok("el botón arranca deshabilitado hasta que hay algo escrito", await boton.isDisabled());
    await campoIA.fill("subí un 15% todo peluquería");
    ok("y se habilita al escribir", !(await boton.isDisabled()));
    await boton.click();
    await sol.waitForTimeout(6000);
    const t4 = await sol.locator("body").innerText();
    ok(
      "si el asistente falla, lo dice en castellano y sin tecnicismos",
      /No pude consultar al asistente/.test(t4),
      t4.slice(0, 200),
    );
    ok(
      "y la pantalla sigue en pie: los precios siguen editables",
      t4.includes("Precios y tiempos"),
    );
  }
}

// Sin clave, el campo no existe.
{
  const sinIA = await abrirPanel(TOKEN_SOL, { sinAsistente: true });
  await sinIA.locator("button").filter({ hasText: "El salón" }).first().click();
  await sinIA.waitForTimeout(2500);
  const t5 = await sinIA.locator("body").innerText();
  ok("sin asistente configurado, el campo no aparece", !t5.includes("Cambiar varios"));
  ok("y los precios se siguen editando a mano", t5.includes("Precios y tiempos"));
  await sinIA.close();
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
