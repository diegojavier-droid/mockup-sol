/**
 * El camino de la clienta, en un navegador real, sin backend.
 *
 * POR QUÉ EXISTE
 *
 * `scripts/panel-e2e.mjs` prueba el panel pero necesita base, servidor y
 * tokens de verdad. Este prueba la otra mitad —la web pública— y no necesita
 * nada: simula el API de catálogo, cotización y disponibilidad, y recorre
 * landing → categoría → servicio → fecha → datos → resumen como lo haría
 * una clienta.
 *
 * Lo que verifica no es que el backend ande: es que **la clienta puede
 * llegar sola hasta el final y entender qué paga**. En particular, que la
 * regla de la seña está escrita ANTES de confirmar, no después.
 *
 * CÓMO SE CORRE
 *
 *   bun run dev            # en otra terminal
 *   node scripts/reserva-e2e.mjs
 *
 * Requiere `playwright` instalado aparte: no está en package.json.
 * El Chromium del contenedor está en /opt/pw-browsers/.
 */

import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:5173";
const CHROME = process.env.CHROME_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

// ── Catálogo de prueba, con precios reales de la planilla de Sol ────────
const CATEGORIES = [
  { slug: "peluqueria", name: "Peluquería", tagline: "Color, corte y tratamientos", emoji: "✂️" },
  { slug: "unas", name: "Uñas", tagline: "Esmaltado y esculpidas", emoji: "💅" },
];

const SERVICES = [
  {
    slug: "corte-fem",
    categorySlug: "peluqueria",
    name: "Corte",
    description: "Corte y lavado.",
    durationMinutes: 45,
    priceAmount: 15000,
    currency: "ARS",
    tag: null,
    priceDisplayMode: "from",
    priceFromAmount: 15000,
  },
  {
    slug: "retoque-raiz",
    categorySlug: "peluqueria",
    name: "Color de raíces",
    description: "Retoque de raíz.",
    durationMinutes: 90,
    priceAmount: 28000,
    currency: "ARS",
    tag: "popular",
    priceDisplayMode: "from",
    priceFromAmount: 28000,
  },
  {
    slug: "semi",
    categorySlug: "unas",
    name: "Esmaltado semipermanente",
    description: null,
    durationMinutes: 60,
    priceAmount: 17000,
    currency: "ARS",
    tag: null,
    priceDisplayMode: "fixed",
    priceFromAmount: 17000,
  },
];

const ELEGIDO = SERVICES[0]; // Corte, $15.000 → seña de $3.000

const detalle = (slug) => {
  const s = SERVICES.find((x) => x.slug === slug) ?? ELEGIDO;
  return {
    ...s,
    extras: [],
    personalization: [],
    tiers: [
      {
        lengthTier: "corto",
        priceMain: s.priceAmount,
        durationMainMin: s.durationMinutes,
        processMin: 0,
        source: "sol_pricelist",
        confidence: "medium",
      },
    ],
    parameters: {
      priceDisplayMode: s.priceDisplayMode,
      lengthAffectsPrice: false,
      lengthAffectsDuration: false,
      requiresConsultation: false,
    },
  };
};

const cotizar = (s) => {
  const deposito = Math.round(s.priceAmount * 0.2);
  return {
    items: [
      {
        role: "main",
        slug: s.slug,
        name: s.name,
        priceAmount: s.priceAmount,
        lengthTier: "corto",
        durationMin: s.durationMinutes,
      },
    ],
    priceDisplayMode: s.priceDisplayMode,
    isEstimate: s.priceDisplayMode === "from",
    estimatedMinAmount: s.priceAmount,
    estimatedMaxAmount: null,
    durationShownMin: s.durationMinutes,
    depositRatePct: 20,
    depositAmount: deposito,
    remainingAmount: s.priceAmount - deposito,
    requiresConsultation: false,
  };
};

/** Martes a viernes: los días que el salón abre de verdad. */
function disponibilidad() {
  const days = [];
  const d = new Date();
  while (days.length < 8) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() >= 2 && d.getDay() <= 5) {
      days.push({
        date: d.toISOString().slice(0, 10),
        times: ["09:00", "10:30", "12:00", "14:30", "16:00"],
      });
    }
  }
  return { bookableOnline: true, days };
}

// ── Comprobaciones ──────────────────────────────────────────────────────
let ok = 0;
const fallos = [];
function check(nombre, condicion) {
  if (condicion) {
    ok += 1;
    console.log(`  ✓ ${nombre}`);
  } else {
    fallos.push(nombre);
    console.log(`  ✗ ${nombre}`);
  }
}

const navegador = await chromium.launch({ executablePath: CHROME });
const pagina = await navegador.newPage({ viewport: { width: 400, height: 860 } });

// Las fuentes de Google cuelgan a Chromium en el contenedor.
await pagina.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());

await pagina.route("**/api/v1/**", (route) => {
  const ruta = new URL(route.request().url()).pathname.replace("/api/v1", "");
  const responder = (data) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data }) });

  if (ruta === "/catalog/categories") return responder(CATEGORIES);
  if (ruta === "/catalog/services") return responder(SERVICES);
  if (ruta === "/catalog/extras") return responder([]);
  if (ruta === "/catalog/personalization") return responder([]);
  if (ruta.startsWith("/catalog/services/")) return responder(detalle(ruta.split("/").pop()));
  if (ruta === "/quote") return responder(cotizar(ELEGIDO));
  if (ruta === "/availability") return responder(disponibilidad());
  if (ruta === "/bookings") {
    return responder({
      publicToken: "tok-prueba",
      status: "pending_payment",
      startsAt: new Date(Date.now() + 864e5).toISOString(),
      paymentRequiredUntil: new Date(Date.now() + 6e5).toISOString(),
      depositAmount: 3000,
      depositRatePct: 20,
      estimatedAmount: 15000,
      remainingAmount: 12000,
      priceDisplayMode: "from",
      isEstimate: true,
    });
  }
  return responder({});
});

const erroresDePagina = [];
pagina.on("pageerror", (e) => erroresDePagina.push(String(e)));

const texto = () => pagina.locator("body").innerText();
const esperar = () => pagina.waitForTimeout(800);

console.log(`\nRecorriendo ${BASE} a 400px de ancho (teléfono)\n`);

// ── 1. Landing ──────────────────────────────────────────────────────────
await pagina.goto(BASE, { waitUntil: "domcontentloaded" });
await pagina.waitForTimeout(2200);
console.log("1. Landing");
check("la portada invita a ver servicios", (await texto()).includes("Ver servicios"));
check(
  "no se habla de señas, estados ni canales en la portada",
  !/pending_payment|walk_in|no_show/i.test(await texto()),
);

// ── 2. Categorías ───────────────────────────────────────────────────────
await pagina
  .getByRole("button", { name: /ver servicios/i })
  .first()
  .click();
await esperar();
console.log("2. Categorías");
const cuerpoCategorias = await texto();
check(
  "aparecen las categorías del salón",
  cuerpoCategorias.includes("Peluquería") && cuerpoCategorias.includes("Uñas"),
);

// ── 3. Servicios de la categoría ────────────────────────────────────────
await pagina
  .getByRole("button", { name: /Peluquería/i })
  .first()
  .click();
await esperar();
console.log("3. Servicios");
const cuerpoServicios = await texto();
check(
  "se listan los servicios con precio orientativo",
  cuerpoServicios.includes("Corte") && /Desde\s*\$\s?15\.000/.test(cuerpoServicios),
);
check("el precio se comunica como «Desde», no como cerrado", cuerpoServicios.includes("Desde"));

// ── 4. Ficha del servicio y arranque de la reserva ───────────────────────
// El nombre accesible de la tarjeta incluye el alt de su foto, así que se
// busca por el precio, que es único: «Corte Desde $15.000».
await pagina
  .locator("button:visible")
  .filter({ hasText: /Desde \$\s?15\.000/ })
  .first()
  .click();
await esperar();
console.log("4. Ficha del servicio");
check("se abre la ficha del servicio elegido", (await texto()).includes("Corte"));

// La ficha se abre como panel lateral y su acción se llama «Reservar turno».
const botonReservar = pagina
  .locator("button:visible")
  .filter({ hasText: /^Reservar turno$/ })
  .first();
check("la ficha ofrece reservar", (await botonReservar.count()) > 0);
await botonReservar.click();
await esperar();
await esperar();

// ── 5. Fecha y hora ─────────────────────────────────────────────────────
console.log("5. Fecha y hora");
let cuerpo = await texto();
check("el wizard pide fecha y hora", /Fecha y hora/i.test(cuerpo));

// El wizard se saltea Detalles y Extras porque este servicio no tiene ni
// campos de personalización ni extras: por eso dice «PASO 3 DE 5» y no de 7.
check(
  "el wizard omite los pasos que no piden una decisión real",
  /PASO\s*3\s*DE\s*5/i.test(cuerpo),
);

// Los días sin horarios se muestran apagados con el motivo a la vista.
check("los días cerrados se marcan «sin lugar», no se esconden", /sin lugar/i.test(cuerpo));

// Primero el día, después el horario: los horarios no existen hasta elegir
// día. Se busca recorriendo los botones porque el texto del día viene
// partido en varias líneas («MAR» arriba, «15» abajo).
const botones = pagina.locator("button:visible");
let dia = null;
for (let i = 0; i < (await botones.count()); i += 1) {
  const b = botones.nth(i);
  const t = (await b.innerText()).replace(/\s+/g, " ").trim();
  if (/^(MAR|MIÉ|JUE|VIE)\b/.test(t) && !/sin lugar/i.test(t)) {
    dia = b;
    break;
  }
}
check("hay al menos un día con lugar", dia !== null);
await dia.click();
await esperar();

const horario = pagina
  .locator("button:visible")
  .filter({ hasText: /^(09:00|10:30|12:00|14:30|16:00)$/ })
  .first();
check("al elegir el día aparecen los horarios", (await horario.count()) > 0);
await horario.click();
await esperar();

const siguiente = () =>
  pagina
    .locator("button:visible")
    .filter({ hasText: /Continuar|Siguiente/i })
    .first();
if (await siguiente().count()) {
  await siguiente().click();
  await esperar();
}

// ── 6. Datos de la clienta ──────────────────────────────────────────────
console.log("6. Tus datos");
cuerpo = await texto();
check("se piden los datos de contacto", /Tus datos|nombre|WhatsApp|correo|email/i.test(cuerpo));
check("se explica para qué se usan esos datos", /confirmaci|recordatorio|seña|aviso/i.test(cuerpo));

const escribir = async (etiqueta, valor) => {
  const campo = pagina.getByLabel(new RegExp(etiqueta, "i")).first();
  if (await campo.count()) {
    await campo.fill(valor);
    return true;
  }
  return false;
};
await escribir("nombre", "Ana Prueba");
await escribir("apellido", "Prueba");
await escribir("whatsapp|tel", "3425551234");
await escribir("mail|correo", "ana@ejemplo.com");

// El consentimiento de datos personales es obligatorio y bloquea el paso.
// Es lo correcto: sin él no se puede guardar la ficha (Ley 25.326).
const consentimiento = pagina.locator('input[type="checkbox"]:visible').first();
check("hay que aceptar los términos para poder seguir", (await consentimiento.count()) > 0);
check(
  "se explica para qué se usan los datos, con link al detalle",
  /sólo para tu turno|Leer el detalle/i.test(await texto()),
);

// PRIMERO se intenta avanzar SIN aceptar. Si el sistema dejara pasar, esta
// comprobación falla: guardar datos personales sin consentimiento sería el
// error grave, y un test que no lo intenta no prueba nada.
await esperar();
await siguiente().click();
await esperar();
check("NO deja avanzar sin aceptar el consentimiento", /Tus datos/i.test(await texto()));

await consentimiento.check();
await esperar();
await siguiente().click();
await esperar();
await esperar();

// ── 7. Resumen: lo que de verdad importa ────────────────────────────────
console.log("7. Resumen");
cuerpo = await texto();
check("el resumen dice cuánto es la seña", /seña/i.test(cuerpo));
check(
  "LA REGLA CLAVE: dice que si no viene, la seña no se devuelve",
  /si no ven[íi]s|no se devuelve/i.test(cuerpo),
);
check("dice la ventana de 24 horas antes de confirmar", /24\s*h(oras)?/i.test(cuerpo));

// ── Cierre ──────────────────────────────────────────────────────────────
console.log(
  "\nErrores de JavaScript en la página:",
  erroresDePagina.length ? erroresDePagina.slice(0, 3) : "ninguno",
);
check("la página no tiró ningún error de JavaScript", erroresDePagina.length === 0);

// Sólo se deja una captura cuando algo falló: un PNG por corrida exitosa
// ensucia el repositorio y nadie lo mira.
if (fallos.length) {
  await pagina.screenshot({ path: "reserva-e2e-fallo.png" });
  console.log("Captura del estado final en reserva-e2e-fallo.png");
}
await navegador.close();

console.log(`\n${ok} comprobaciones pasaron, ${fallos.length} fallaron.`);
if (fallos.length) {
  console.log("Fallaron:\n  - " + fallos.join("\n  - "));
  process.exit(1);
}
