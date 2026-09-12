/**
 * Servicios, Tratamientos y Promociones, en un navegador real, sin backend.
 *
 * POR QUÉ EXISTE
 *
 * Las funciones de la base están probadas contra PostgreSQL y las rutas
 * compilan, pero nada de eso dice que Sol pueda **dar de alta un servicio
 * tocando la pantalla**. Este recorrido simula el API del panel y hace lo
 * que haría ella: entra a cada submódulo, cambia una clase, carga un
 * costo, crea un servicio y arma una promoción.
 *
 * Lo que verifica no es que el backend ande —eso lo prueba el clean-room—
 * sino que la pantalla manda lo que dice que manda. Cada escritura se
 * intercepta y se compara contra lo esperado: si un botón dijera una cosa
 * y mandara otra, acá se ve.
 *
 * CÓMO SE CORRE
 *
 *   bun run dev            # en otra terminal
 *   node scripts/catalogo-e2e.mjs
 *
 * Requiere `playwright` instalado aparte: no está en package.json.
 * El Chromium del contenedor está en /opt/pw-browsers/.
 */

import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:5173";
const CHROME = process.env.CHROME_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

const IDENTIDAD = {
  email: "sol@salon",
  staffId: "00000000-0000-0000-0000-000000000001",
  displayName: "Sol",
  role: "duenia",
  roleName: "Dueña",
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

const CATEGORIAS = [
  { slug: "peluqueria", name: "Peluquería", isPublic: true },
  { slug: "maquillaje", name: "Maquillaje", isPublic: true },
];

// Un catálogo chico con las tres clases representadas, para que las dos
// pantallas tengan algo que mostrar y el filtro se pueda comprobar.
const CATALOGO = [
  {
    slug: "corte-fem",
    name: "Corte",
    description: null,
    category: "peluqueria",
    kind: "servicio",
    durationMin: 45,
    priceAmount: 15000,
    standardCost: null,
    isPublic: true,
    isActive: true,
  },
  {
    slug: "mechas",
    name: "Mechas",
    description: null,
    category: "peluqueria",
    kind: "servicio",
    durationMin: 150,
    priceAmount: 60000,
    standardCost: null,
    isPublic: true,
    isActive: true,
  },
  {
    slug: "retoque-raiz",
    name: "Color de raíces",
    description: null,
    category: "peluqueria",
    kind: "color",
    durationMin: 90,
    priceAmount: 28000,
    standardCost: null,
    isPublic: true,
    isActive: true,
  },
  {
    slug: "karseell",
    name: "Karseell",
    description: null,
    category: "peluqueria",
    kind: "tratamiento",
    durationMin: 45,
    priceAmount: 23000,
    standardCost: null,
    isPublic: false,
    isActive: true,
  },
  {
    slug: "mk-social",
    name: "Maquillaje social",
    description: null,
    category: "maquillaje",
    kind: "servicio",
    durationMin: 45,
    priceAmount: 18000,
    standardCost: null,
    isPublic: true,
    isActive: true,
  },
];

const PROMOS = [
  {
    slug: "color-mas-tratamiento",
    name: "Tratamiento con tu color",
    description: "Si te hacés color y le sumás un tratamiento, el tratamiento sale menos.",
    benefitKind: "precio_de_agregado",
    benefitValue: null,
    startsOn: null,
    endsOn: null,
    isActive: true,
    disparadores: [{ serviceKind: "color", serviceSlug: null }],
    beneficios: [{ serviceKind: "tratamiento", serviceSlug: null }],
  },
];

// Lo que la pantalla mandó al servidor. Es el producto de este recorrido:
// sin esto sólo se sabría que no explotó.
const escrituras = [];

/**
 * El servidor de mentira guarda de verdad.
 *
 * Hace falta: la pantalla vuelve a pedir el catálogo después de cada
 * escritura, y si la respuesta fuera siempre la misma, un campo que se
 * acaba de guardar volvería al valor viejo. Peor todavía, la pantalla
 * omite las escrituras que no cambian nada —comparando contra lo que el
 * servidor le contestó—, así que un servidor que nunca cambia hace que la
 * segunda edición de un mismo campo no salga nunca.
 */
function aplicar(metodo, ruta, cuerpo) {
  const conSlug = (prefijo) =>
    ruta.startsWith(prefijo) ? ruta.slice(prefijo.length).split("/")[0] : null;

  if (metodo === "POST" && ruta === "/salon/catalog") {
    CATALOGO.push({
      description: null,
      standardCost: null,
      isActive: true,
      isPublic: false,
      ...cuerpo,
      priceAmount: cuerpo.price,
    });
    return;
  }
  const costoDe = ruta.endsWith("/cost") ? conSlug("/salon/catalog/") : null;
  if (costoDe) {
    const s = CATALOGO.find((x) => x.slug === costoDe);
    if (s) s.standardCost = cuerpo.amount;
    return;
  }
  if (metodo === "PATCH" && ruta.startsWith("/salon/catalog/")) {
    const s = CATALOGO.find((x) => x.slug === conSlug("/salon/catalog/"));
    if (s) Object.assign(s, cuerpo);
  }
}

let fallos = [];
function check(nombre, ok) {
  if (ok) console.log(`  ✓ ${nombre}`);
  else {
    fallos.push(nombre);
    console.log(`  ✗ ${nombre}`);
  }
}

const navegador = await chromium.launch({ executablePath: CHROME });
const pagina = await navegador.newPage({ viewport: { width: 1100, height: 900 } });

// Las fuentes de Google cuelgan a Chromium en el contenedor.
await pagina.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());

await pagina.addInitScript(() => {
  window.sessionStorage.setItem("sol-mai-staff-token", "token-de-prueba");
});

await pagina.route("**/api/v1/**", async (route) => {
  const req = route.request();
  // El panel cuelga de `/api/v1/admin`; el catálogo público, de `/api/v1`.
  const ruta = new URL(req.url()).pathname.replace("/api/v1/admin", "").replace("/api/v1", "");
  const metodo = req.method();
  const responder = (data) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data }) });

  if (metodo !== "GET") {
    let cuerpo = null;
    try {
      cuerpo = req.postDataJSON();
    } catch {
      cuerpo = null;
    }
    escrituras.push({ metodo, ruta, cuerpo });
    aplicar(metodo, ruta, cuerpo);
    return responder({ ok: true });
  }

  if (ruta === "/me") return responder(IDENTIDAD);
  if (ruta === "/salon/catalog") return responder(CATALOGO);
  if (ruta === "/salon/categories") return responder(CATEGORIAS);
  if (ruta === "/salon/promotions") return responder(PROMOS);
  return responder([]);
});

const erroresDePagina = [];
pagina.on("pageerror", (e) => erroresDePagina.push(String(e)));

const texto = () => pagina.locator("body").innerText();
const esperar = () => pagina.waitForTimeout(700);
const ir = async (seccion) => {
  await pagina.goto(`${BASE}/panel/servicios/${seccion}`, { waitUntil: "domcontentloaded" });
  await pagina.waitForTimeout(1800);
};

console.log(`\nRecorriendo el panel de ${BASE}\n`);

// ── 1. Los tres submódulos existen y se llegan por dirección propia ─────
console.log("1. Los tres submódulos");
await ir("catalogo");
const enServicios = await texto();
// El nombre se edita donde se ve, así que vive en un campo: `innerText`
// no lo trae. Preguntar por el texto de la página daría siempre que no
// está, y la comprobación pasaría sin comprobar nada.
const nombresVisibles = () =>
  pagina
    .locator("input[aria-label^='Nombre de']")
    .evaluateAll((campos) => campos.map((c) => c.value));
check("Servicios tiene su propia dirección", enServicios.includes("Servicios"));
check("muestra los que no son tratamiento", (await nombresVisibles()).includes("Mechas"));
check("y deja los tratamientos afuera", !(await nombresVisibles()).includes("Karseell"));
check(
  "explica para qué sirve marcar «Color»",
  /promociones de tratamientos|dispare/i.test(enServicios),
);

await ir("tratamientos");
const enTratamientos = await texto();
check("Tratamientos tiene su propia dirección", (await nombresVisibles()).includes("Karseell"));
check("y deja los servicios afuera", !(await nombresVisibles()).includes("Mechas"));

await ir("promociones");
const enPromos = await texto();
check("Promociones tiene su propia dirección", enPromos.includes("Tratamiento con tu color"));
// Los dos títulos van en versalitas, así que `innerText` los devuelve en
// mayúsculas: comparar con la cadena tal como está escrita en el código
// fallaría por el estilo y no por el contenido.
check("dice con qué se activa", /se activa con/i.test(enPromos));
check("y qué abarata", /abarata/i.test(enPromos));

// ── 2. La palabra es «promoción» ────────────────────────────────────────
console.log("2. La palabra");
const todoElTexto = enServicios + enTratamientos + enPromos;
check("en ninguna de las tres pantallas dice «oferta»", !/oferta/i.test(todoElTexto));

// ── 3. El caso de mechas: se tilda, no se pregunta ──────────────────────
console.log("3. Mechas pasa a ser color");
await ir("catalogo");
const filaMechas = pagina
  .locator("div")
  .filter({ hasText: /^Mechas/ })
  .first();
await pagina
  .locator("div.rounded-2xl")
  .filter({ has: pagina.locator('input[value="Mechas"]') })
  .getByRole("button", { name: "Color", exact: true })
  .click();
await esperar();
const cambioDeClase = escrituras.find((e) => e.ruta === "/salon/catalog/mechas");
check("manda un PATCH al servicio", cambioDeClase?.metodo === "PATCH");
check(
  "con la clase nueva y nada más",
  JSON.stringify(cambioDeClase?.cuerpo) === '{"kind":"color"}',
);
check("y ofrece deshacer", (await texto()).includes("Deshacer"));
void filaMechas;

// ── 4. El caso de la maquilladora: el costo es un campo ─────────────────
console.log("4. El costo de la maquilladora");
const campoCosto = pagina
  .locator("div.rounded-2xl")
  .filter({ has: pagina.locator('input[value="Maquillaje social"]') })
  .locator('input[placeholder="No sabemos"]');
check("el costo vacío dice «No sabemos», no cero", (await campoCosto.inputValue()) === "");
check("y avisa que sin el dato no hay margen", (await texto()).includes("Vacío no es cero"));
await campoCosto.fill("12000");
await campoCosto.blur();
await esperar();
const costo = escrituras.find((e) => e.ruta === "/salon/catalog/mk-social/cost");
check("manda el costo al servidor", costo?.cuerpo?.amount === 12000);

// Borrar el campo tiene que mandar «no sabemos», no cero. Es la diferencia
// entre un margen sin calcular y un margen calculado sobre un número
// inventado, que parece un dato y no lo es.
await campoCosto.fill("");
await campoCosto.blur();
await esperar();
const borrado = escrituras.filter((e) => e.ruta === "/salon/catalog/mk-social/cost").at(-1);
check("borrar el costo manda «no sabemos», no cero", borrado?.cuerpo?.amount === null);

// ── 5. El caso de las líneas de coloración: alta desde la pantalla ──────
console.log("5. Una línea de coloración nueva");
await pagina.getByRole("button", { name: /agregar un servicio/i }).click();
await esperar();
await pagina.getByPlaceholder("Raíz Exiline").fill("Raíz Exiline");
await esperar();
check("propone el nombre corto solo, sin acentos", (await texto()).includes("raiz-exiline"));
await pagina.getByPlaceholder("28000").fill("28000");
await pagina
  .locator("div.rounded-2xl")
  .filter({ has: pagina.getByPlaceholder("Raíz Exiline") })
  .getByRole("button", { name: "Color", exact: true })
  .click();
check("avisa que entra sin publicar", /sin publicar en la web/i.test(await texto()));
await pagina.getByRole("button", { name: "Agregar", exact: true }).click();
await esperar();
const alta = escrituras.find((e) => e.ruta === "/salon/catalog" && e.metodo === "POST");
check("manda el alta", Boolean(alta));
check("con el nombre corto derivado del nombre", alta?.cuerpo?.slug === "raiz-exiline");
check("marcada como color", alta?.cuerpo?.kind === "color");
check("y con el precio que se escribió", alta?.cuerpo?.price === 28000);
// Nace sin publicar. Publicar algo cuya duración nadie confirmó es
// ofrecerle a una clienta un turno de una duración inventada.
check("y sin publicar en la web", alta?.cuerpo?.isPublic !== true);

// ── 6. La promoción se edita por sus dos lados ──────────────────────────
console.log("6. Los dos lados de la promoción");
await ir("promociones");
// La tarjeta se busca por los dos lados de la regla y no por el nombre: el
// cartel de «deshacer» también nombra la promoción y aparece antes en la
// página, así que filtrar por texto agarraría el cartel.
const tarjeta = pagina
  .locator("div.rounded-2xl")
  .filter({ has: pagina.getByRole("region", { name: "Se activa con" }) })
  .first();
// El primer bloque es «Se activa con»; el segundo, «Abarata».
await tarjeta
  .getByRole("region", { name: "Se activa con" })
  .getByRole("button", { name: "Servicio", exact: true })
  .click();
await esperar();
const reglaNueva = escrituras.find((e) => e.ruta.endsWith("/rules"));
check("manda la regla al lado correcto", reglaNueva?.cuerpo?.lado === "disparador");
check("por clase de servicio", reglaNueva?.cuerpo?.serviceKind === "servicio");
check("y agregando, no sacando", reglaNueva?.cuerpo?.agregar === true);

await tarjeta.getByRole("button", { name: /^Activa$/ }).click();
await esperar();
const apagar = escrituras.find((e) => e.ruta.endsWith("/active"));
check("apagar manda active:false", apagar?.cuerpo?.active === false);

// ── 7. Nada explotó ─────────────────────────────────────────────────────
console.log("7. La consola");
check("ningún error de JavaScript", erroresDePagina.length === 0);
if (erroresDePagina.length) console.log("   ", erroresDePagina.slice(0, 3));

await navegador.close();

const total = fallos.length === 0;
console.log(`\n${total ? "Todo pasó" : `Fallaron ${fallos.length}`}`);
if (!total) for (const f of fallos) console.log(`  · ${f}`);
process.exit(total ? 0 : 1);
