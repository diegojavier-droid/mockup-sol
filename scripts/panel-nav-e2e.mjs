/**
 * La navegación del panel, en un navegador real y sin backend.
 *
 * POR QUÉ ESTÁ SEPARADA DE `panel-e2e.mjs`
 *
 * Aquélla prueba que el panel FUNCIONA: pide tokens de verdad, una base
 * con datos y el servidor levantado. Ésta prueba que se puede LLEGAR a
 * las cosas, que es una pregunta distinta y no necesita nada de eso: la
 * sesión se simula y las respuestas del API se inventan. Corre con
 * `vite dev` y nada más, así que puede correrse siempre.
 *
 * Lo que defiende es el bloque de navegación del 2026-09-11: que cada
 * sección sea un lugar. Antes el módulo activo vivía en un `useState` y
 * las cuatro pantallas del panel eran la misma dirección, así que el
 * botón «atrás» no volvía, los links no se podían compartir y recargar
 * te dejaba donde el sistema quisiera.
 *
 *     bun run dev &
 *     node scripts/panel-nav-e2e.mjs
 *
 * Variables: `SOLMAI_NAV_BASE` (default http://localhost:5173) y
 * `SOLMAI_CHROME` (default el Chromium del contenedor).
 *
 * Necesita `playwright` instalado. No está en `package.json` —tampoco lo
 * está para `panel-e2e.mjs`, que lo usa desde antes—, así que
 * `bun install` no lo trae: hay que instalarlo aparte.
 */

import { chromium } from "playwright";

const BASE = process.env.SOLMAI_NAV_BASE ?? "http://localhost:5173";
const CHROME = process.env.SOLMAI_CHROME ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

const fallos = [];
const ok = (n, c, d = "") => {
  console.log(c ? `OK  · ${n}` : `FALLA · ${n}${d ? ` — ${d}` : ""}`);
  if (!c) fallos.push(n);
};

/** Sol: ve todo. */
const SOL = {
  email: "sol@ejemplo.test",
  staffId: "staff-sol",
  displayName: "Sol",
  role: "duena",
  roleName: "Administradora",
  permisos: {
    calendario: "full",
    clientas: "full",
    finanzas: "full",
    inventario: "full",
    servicios: "full",
    personal: "full",
    compras: "full",
    usuarios: "full",
    configuracion: "full",
  },
};

/** Quien atiende el mostrador: sin Finanzas. */
const MOSTRADOR = {
  ...SOL,
  displayName: "Ana",
  role: "mostrador",
  roleName: "Mostrador",
  permisos: { calendario: "full", clientas: "view" },
};

// Un proyecto de Supabase inventado con una sesión ya guardada. Es la
// forma de mirar el panel sin backend: `recuperarSesion()` levanta la
// sesión de `localStorage` y espeja el token, igual que en producción.
const CONFIG = {
  supabaseUrl: "https://falso.supabase.test",
  publishableKey: "clave-de-prueba",
  proveedores: ["email"],
};
const SESION = {
  access_token: "token-de-prueba",
  refresh_token: "refresh-de-prueba",
  token_type: "bearer",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: {
    id: "u1",
    email: "sol@ejemplo.test",
    aud: "authenticated",
    app_metadata: { provider: "email" },
    user_metadata: {},
  },
};

const browser = await chromium.launch({
  executablePath: CHROME,
  args: [
    "--no-sandbox",
    "--disable-background-networking",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-component-update",
    "--disable-sync",
  ],
});

const errores = [];

async function abrir(quien = SOL, { ancho = 1440, alto = 900, demoraMe = 0 } = {}) {
  const ctx = await browser.newContext({ viewport: { width: ancho, height: alto } });
  await ctx.addInitScript(
    ([s]) => window.localStorage.setItem("sb-falso-auth-token", JSON.stringify(s)),
    [SESION],
  );
  await ctx.route("**/api/v1/auth/panel-config", (r) => r.fulfill({ json: { data: CONFIG } }));
  await ctx.route("**/api/v1/admin/me", async (r) => {
    // `demoraMe` simula la conexión lenta o el Worker frío: es el rato
    // en que la pantalla ya se dibujó y todavía no sabe quién sos.
    if (demoraMe) await new Promise((listo) => setTimeout(listo, demoraMe));
    return r.fulfill({ json: { data: quien } });
  });
  await ctx.route("**/api/v1/**", (r) => {
    const u = r.request().url();
    if (/admin\/me|panel-config/.test(u)) return r.fallback();
    // El resumen: cuántos turnos por día. Lo usan Mes y Año.
    if (/admin\/agenda\/resumen/.test(u))
      return r.fulfill({
        json: {
          data: {
            desde: "2026-01-01",
            hasta: "2026-12-31",
            porDia: [
              { dia: "2026-05-15", turnos: 40 },
              { dia: "2026-09-12", turnos: 3 },
            ],
          },
        },
      });
    if (/admin\/agenda/.test(u)) return r.fulfill({ json: { data: { entries: [] } } });
    if (/admin\/cash-register/.test(u))
      return r.fulfill({
        json: {
          data: {
            dia: "2026-01-01",
            entro: 48000,
            devuelto: 0,
            queda: 48000,
            por_medio: [{ medio: "efectivo", monto: 48000, cuantos: 2 }],
            movimientos: [],
          },
        },
      });
    if (/admin\/refunds-pending/.test(u))
      return r.fulfill({ json: { data: { totalAmount: 0, items: [] } } });
    if (/admin\/(dashboard|summary|invoic)/.test(u)) return r.fulfill({ json: { data: {} } });
    return r.fulfill({ json: { data: [] } });
  });
  // Nada de afuera. Las fuentes de Google cuelgan al navegador en el
  // contenedor y no tienen nada que ver con lo que se prueba.
  await ctx.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, (r) => r.abort());

  const page = await ctx.newPage();
  page.on("pageerror", (e) => errores.push(e.message));
  return { ctx, page };
}

const limpio = (t) => (t ?? "").replace(/\s+/g, " ").trim();

async function esperar(page, patron, ms = 8000) {
  const hasta = Date.now() + ms;
  let t = "";
  while (Date.now() < hasta) {
    t = limpio(
      await page
        .locator("main")
        .innerText()
        .catch(() => ""),
    );
    if (patron.test(t)) return t;
    await page.waitForTimeout(200);
  }
  return t;
}

async function ver(page, ruta) {
  await page.goto(`${BASE}${ruta}`, { waitUntil: "commit", timeout: 20000 });
  await page.waitForSelector('nav[aria-label="Dónde estás"]', { timeout: 20000 });
  return limpio(await page.locator("body").innerText());
}

console.log("── Cada sección es un lugar");
{
  const { ctx, page } = await abrir();

  await page.goto(`${BASE}/panel`, { waitUntil: "commit" });
  await page.waitForSelector('nav[aria-label="Dónde estás"]', { timeout: 20000 });
  ok("/panel entra directo a Agenda › Hoy", page.url().endsWith("/panel/agenda/hoy"), page.url());

  for (const [ruta, migas] of [
    ["/panel/agenda/hoy", "Panel›Agenda›Hoy"],
    ["/panel/finanzas/caja", "Panel›Finanzas›Caja del día"],
    ["/panel/servicios/horarios", "Panel›Servicios›Horarios"],
    ["/panel/usuarios/roles", "Panel›Usuarios y roles›Roles"],
  ]) {
    await ver(page, ruta);
    const m = limpio(await page.locator('nav[aria-label="Dónde estás"]').textContent());
    ok(`${ruta} dice dónde estás`, m === migas, `migas: ${m}`);
  }

  await ctx.close();
}

console.log("\n── El botón «atrás» del navegador vuelve");
{
  const { ctx, page } = await abrir();
  await ver(page, "/panel/agenda/hoy");
  await page
    .locator('nav[aria-label="Módulos del panel"]')
    .getByRole("link", { name: "Finanzas" })
    .click();
  await page.waitForURL("**/panel/finanzas/**", { timeout: 10000 });
  const ida = page.url();
  await page.goBack();
  await page.waitForURL("**/panel/agenda/hoy", { timeout: 10000 }).catch(() => {});
  ok(
    "de Finanzas se vuelve a la Agenda",
    page.url().endsWith("/panel/agenda/hoy"),
    `fue a ${ida}, volvió a ${page.url()}`,
  );
  await ctx.close();
}

console.log("\n── «Volver» sube un nivel y no echa al sitio público");
{
  const { ctx, page } = await abrir();
  await ver(page, "/panel/servicios/horarios");
  await page
    .locator('nav[aria-label="Dónde estás"]')
    .getByRole("link", { name: "Servicios" })
    .click();
  await page.waitForURL("**/panel/servicios/**", { timeout: 10000 }).catch(() => {});
  ok(
    "la miga «Servicios» sube a Servicios",
    page.url().includes("/panel/servicios/") && !page.url().endsWith("/horarios"),
    page.url(),
  );
  await ctx.close();
}

console.log("\n── Lo que era /operaciones y /agenda sigue llevando a algún lado");
{
  const { ctx, page } = await abrir();
  await page.goto(`${BASE}/operaciones`, { waitUntil: "commit" });
  await page.waitForSelector('nav[aria-label="Dónde estás"]', { timeout: 20000 });
  ok(
    "/operaciones es Servicios › Horarios",
    page.url().endsWith("/panel/servicios/horarios"),
    page.url(),
  );

  // `/agenda` es la dirección a la que vuelve el link del mail, y el
  // código de ingreso viaja pegado atrás: la redirección tiene que
  // conservarlo o quien abre su correo se queda afuera.
  await page.goto(`${BASE}/agenda?code=prueba123`, { waitUntil: "commit" });
  await page.waitForURL("**/panel/agenda/hoy**", { timeout: 20000 }).catch(() => {});
  ok("/agenda lleva al panel", page.url().includes("/panel/agenda/hoy"), page.url());
  ok("y NO tira lo que traía pegado atrás", page.url().includes("code=prueba123"), page.url());

  await ctx.close();
}

console.log("\n── Los rótulos de grupo se fueron, el orden se queda");
{
  const { ctx, page } = await abrir();
  await ver(page, "/panel/agenda/hoy");
  const lateral = limpio(await page.locator('nav[aria-label="Módulos del panel"]').textContent());
  ok(
    "la barra lateral no dice ninguno de los tres rótulos",
    !/todos los d[íi]as/i.test(lateral) &&
      !/cada tanto/i.test(lateral) &&
      !/casi nunca/i.test(lateral),
    lateral,
  );
  ok(
    "y los nueve módulos siguen en orden de frecuencia",
    lateral.includes(
      "AgendaClientasFinanzasInventarioServiciosPuestos de trabajoPersonalComprasUsuarios y roles",
    ),
    lateral,
  );
  ok("el módulo de los turnos se llama Agenda", !lateral.includes("Calendario"), lateral);
  await ctx.close();
}

console.log("\n── El teléfono: cuatro destinos que no se mueven");
{
  const { ctx, page } = await abrir(SOL, { ancho: 390, alto: 844 });
  await ver(page, "/panel/agenda/hoy");
  const barra = limpio(await page.locator('nav[aria-label="Ir a"]').textContent());
  ok(
    "la barra de abajo es Agenda · Clientas · Finanzas · Más",
    barra === "AgendaClientasFinanzasMás",
    barra,
  );

  const encendido = async () =>
    await page
      .locator('nav[aria-label="Ir a"] [aria-current="page"]')
      .textContent()
      .catch(() => null);
  ok("en la Agenda se enciende Agenda", limpio(await encendido()) === "Agenda");

  await page.goto(`${BASE}/panel/mas`, { waitUntil: "commit" });
  await page.waitForSelector('nav[aria-label="Ir a"]', { timeout: 20000 });
  ok("en «Más» se enciende Más, y sólo Más", limpio(await encendido()) === "Más");

  const tm = limpio(await page.locator("body").innerText());
  ok(
    "«Más» es una pantalla con los nueve módulos",
    tm.includes("Compras") && tm.includes("Personal"),
  );
  ok("y dice cuáles todavía no están", tm.includes("Todavía no"));
  await ctx.close();
}

console.log("\n── La barra se arma con lo que el permiso deja pasar");
{
  const { ctx, page } = await abrir(MOSTRADOR, { ancho: 390, alto: 844 });
  await ver(page, "/panel/agenda/hoy");
  const barra = limpio(await page.locator('nav[aria-label="Ir a"]').textContent());
  ok("quien atiende no tiene Finanzas abajo", !barra.includes("Finanzas"), barra);
  ok("pero sí la Agenda y Clientas", barra.includes("Agenda") && barra.includes("Clientas"), barra);

  // Esconder no es una frontera —el servidor niega igual—, pero escribir
  // la dirección a mano no puede mostrar la pantalla.
  const t = await ver(page, "/panel/finanzas/caja");
  ok("y escribir la dirección a mano no abre Finanzas", !/la caja de hoy/i.test(t));
  ok(
    "se lo dice, en vez de dejar la pantalla en blanco",
    /no tiene acceso a Finanzas/i.test(t),
    t.slice(0, 120),
  );
  await ctx.close();
}

console.log("\n── Una sección vacía dice que está vacía");
{
  const { ctx, page } = await abrir();
  const t = await ver(page, "/panel/finanzas/devoluciones");
  ok("sin señas por devolver, lo explica", /no hay señas para devolver/i.test(t), t.slice(0, 140));

  // Las secciones que están en el árbol y todavía no tienen pantalla.
  const t2 = await ver(page, "/panel/clientas/fichas");
  ok("una sección sin construir dice «todavía no»", /todav[íi]a no/i.test(t2), t2.slice(0, 140));
  await ctx.close();
}

console.log("\n── Una dirección que no existe es un 404");
{
  const { ctx, page } = await abrir();
  for (const ruta of ["/panel/inventado/cosa", "/panel/agenda/inventada"]) {
    const res = await page.goto(`${BASE}${ruta}`, { waitUntil: "commit" });
    await page.waitForTimeout(1200);
    ok(`${ruta} no existe`, res?.status() === 404, `status ${res?.status()}`);
  }
  await ctx.close();
}

console.log("\n── Mientras no se sabe quién sos, no se dice que no");
{
  // El defecto que motivó esta comprobación: `identidad` vale
  // `undefined` tanto mientras el pedido viaja como cuando no hay
  // permisos, y la pantalla contestaba «esto no es tuyo» a las dos. Sol
  // abría su propio panel y leía que le pidiera acceso a quien lo
  // administra, que es ella.
  const { ctx, page } = await abrir(SOL, { demoraMe: 2500 });
  await page.goto(`${BASE}/panel/finanzas/caja`, { waitUntil: "commit", timeout: 20000 });
  await page.waitForSelector('nav[aria-label="Dónde estás"]', { timeout: 20000 });

  // Se mira DURANTE la espera, no después: mirar al final es
  // exactamente lo que dejó pasar el defecto.
  const durante = [];
  for (let i = 0; i < 12; i++) {
    durante.push(
      limpio(
        await page
          .locator("main")
          .innerText()
          .catch(() => ""),
      ),
    );
    await page.waitForTimeout(150);
  }
  const enAlgunMomento = (re) => durante.some((t) => re.test(t));

  ok(
    "no dice «esto no es tuyo» mientras espera",
    !enAlgunMomento(/no es tuyo|no tiene acceso/i),
    durante.find((t) => /no es tuyo|no tiene acceso/i.test(t)) ?? "",
  );
  ok("dice que está esperando", enAlgunMomento(/un segundo/i), durante[0]?.slice(0, 80));

  // Y cuando por fin llega, abre.
  const fin = await esperar(page, /la caja de hoy|todavía no entró plata/i, 8000);
  ok(
    "y cuando llega la identidad, abre la sección",
    /la caja de hoy|todavía no entró plata/i.test(fin),
    fin.slice(0, 90),
  );
  await ctx.close();
}

console.log("\n── Los puestos viven en un solo módulo");
{
  const { ctx, page } = await abrir();

  // El alta y baja, y los bloqueos: dos secciones del mismo módulo.
  const tl = await ver(page, "/panel/puestos/listado");
  ok("Puestos › Listado da de alta y de baja", /puestos de trabajo/i.test(tl));
  const tb = await ver(page, "/panel/puestos/bloqueos");
  ok("Puestos › Fuera de servicio saca un puesto roto", /fuera de servicio/i.test(tb));

  // Y la Agenda ya no tiene su propio cuadro de puestos.
  const ta = await ver(page, "/panel/agenda/hoy");
  ok("la Agenda ya no tiene el cuadro «Estaciones»", !/estaciones/i.test(ta), ta.slice(0, 120));

  // Servicios tampoco los tiene: la dirección vieja lleva a la nueva.
  await page.goto(`${BASE}/panel/servicios/puestos`, { waitUntil: "commit", timeout: 20000 });
  await page.waitForSelector('nav[aria-label="Dónde estás"]', { timeout: 20000 });
  ok(
    "la dirección vieja de Puestos lleva a la nueva",
    page.url().endsWith("/panel/puestos/listado"),
    page.url(),
  );
  await ctx.close();
}

console.log("\n── Mes y Año son pantallas, no un campito de fecha");
{
  const { ctx, page } = await abrir();

  const tm = await ver(page, "/panel/agenda/mes?mes=2026-09");
  ok("Mes muestra la grilla del mes", /septiembre 2026/i.test(tm), tm.slice(0, 90));
  ok("y cuenta los turnos por día", /3 turnos/.test(tm));
  // El campito suelto se fue: lo reemplazó esta pantalla.
  const th = await ver(page, "/panel/agenda/hoy");
  ok("la Agenda ya no tiene el campito «Otra fecha»", !/otra fecha/i.test(th));

  const ta = await ver(page, "/panel/agenda/anio?mes=2026-01");
  ok("Año muestra los doce meses", /Enero/.test(ta) && /Diciembre/.test(ta));
  ok("con el total del año", /43 turnos en el año/.test(ta), ta.slice(0, 90));
  ok("y un mes sin turnos dice «—», no «0»", /Abril —/.test(ta));

  // Tocar un día del mes abre ese día, y la dirección lo dice.
  await ver(page, "/panel/agenda/mes?mes=2026-09");
  await page.locator('button[aria-label^="12 de"]').click();
  await page.waitForURL("**dia=2026-09-12**", { timeout: 10000 }).catch(() => {});
  ok(
    "tocar un día del mes lo abre, y se puede compartir",
    page.url().includes("dia=2026-09-12"),
    page.url(),
  );

  await ctx.close();
}

await browser.close();

if (errores.length) {
  console.log("\nErrores de consola del navegador:");
  for (const e of [...new Set(errores)]) console.log(`  ${e}`);
  fallos.push("hubo errores de consola");
}

console.log(
  fallos.length ? `\n=== NAVEGACIÓN CON ${fallos.length} FALLA(S) ===` : "\n=== NAVEGACIÓN OK ===",
);
process.exit(fallos.length ? 1 : 0);
