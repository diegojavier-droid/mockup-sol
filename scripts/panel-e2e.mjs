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
ok(
  "ve los módulos con sus nombres nuevos",
  t.includes("Calendario") && t.includes("Finanzas") && t.includes("Servicios"),
);
ok("ve «Usuarios y roles»", t.includes("Usuarios y roles"));
ok("ve lo que todavía no está, apagado", t.includes("Todavía no"));

await sol.locator("button").filter({ hasText: "Servicios" }).first().click();
await sol.waitForTimeout(2500);
t = await sol.locator("body").innerText();
ok("Servicios abre con precios y tiempos", t.includes("Precios y tiempos"));
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
  await sinIA.locator("button").filter({ hasText: "Servicios" }).first().click();
  await sinIA.waitForTimeout(2500);
  const t5 = await sinIA.locator("body").innerText();
  ok("sin asistente configurado, el campo no aparece", !t5.includes("Cambiar varios"));
  ok("y los precios se siguen editando a mano", t5.includes("Precios y tiempos"));
  await sinIA.close();
}

// Usuarios y roles · Personas. Lo que se prueba acá es el circuito
// entero: sumar a alguien que NO está en la lista de emails del entorno,
// verlo aparecer, y sacarle el acceso. Es el agujero que cerraba el
// bloque.
console.log("\n── Usuarios y roles · Personas");
{
  await sol.locator("button").filter({ hasText: "Usuarios y roles" }).first().click();
  await sol.waitForTimeout(2500);
  let tp = await sol.locator("body").innerText();
  ok("abre con quién puede entrar", tp.includes("Quién puede entrar"));
  ok(
    "dice que se entra con Google y que no se guardan contraseñas",
    /cuenta de Google/.test(tp) && /no guardamos contraseñas/i.test(tp),
  );
  ok("avisa que no se manda ningún mail", /no le llega ningún mail/i.test(tp));

  const correo = sol.locator('input[aria-label="Correo de Google"]');
  ok("hay dónde sumar a alguien", (await correo.count()) > 0);
  if (await correo.count()) {
    const nuevo = `panel-e2e-${Date.now()}@sol-mai.test`;
    await correo.fill(nuevo);
    await sol.locator('input[aria-label="Nombre"]').fill("Prueba E2E");

    // El rol ya no viene elegido: dar acceso es una decisión, y un
    // valor por defecto es cómo alguien termina con más permisos de los
    // que nadie le quiso dar.
    ok(
      "no deja sumar a nadie sin elegir el rol",
      await sol.locator("button", { hasText: /^Sumar$/ }).first().isDisabled(),
    );
    ok("y dice qué falta", /elegí con qué rol entra/i.test(await sol.locator("body").innerText()));

    await sol.locator('select[aria-label="Rol de la persona nueva"]').selectOption("mostrador");
    await sol
      .locator("button", { hasText: /^Sumar$/ })
      .first()
      .click();
    await sol.waitForTimeout(2500);
    tp = await sol.locator("body").innerText();
    ok("al sumarla dice que ya puede entrar", /ya puede entrar/i.test(tp), tp.slice(0, 200));
    ok("y aparece en la lista", tp.includes("Prueba E2E"));

    // La fila de ESA persona, no cualquiera: la de la propia dueña tiene
    // el botón deshabilitado a propósito, y `.last()` caía justo ahí.
    const fila = sol.locator("div.flex.flex-wrap.items-center").filter({ hasText: "Prueba E2E" });
    const sacar = fila.locator("button", { hasText: /Sacarle el acceso/ }).first();
    if (await sacar.count()) {
      await sacar.click();
      await sol.waitForTimeout(2500);
      tp = await sol.locator("body").innerText();
      ok("sacarle el acceso lo dice", /ya no puede entrar/i.test(tp), tp.slice(0, 200));
      // El encabezado se muestra en mayúsculas por CSS, y `innerText` devuelve
      // el texto ya transformado: comparar con la forma escrita falla siempre.
      ok("y la mueve a «Ya no entran»", /ya no entran/i.test(tp));
    } else {
      ok("hay botón para sacar el acceso", false);
    }
  }

  // La dueña no puede sacarse a sí misma: el botón de su propia fila
  // está deshabilitado, no es que falle al tocarlo.
  const filaPropia = sol.locator("div.flex.flex-wrap.items-center").filter({ hasText: "(vos)" });
  const suBoton = filaPropia.locator("button", { hasText: /Sacarle el acceso/ }).first();
  if (await suBoton.count()) {
    ok("no puede sacarse el acceso a sí misma", await suBoton.isDisabled());
  }
}

// El registro de cambios vive debajo de Personas, en el mismo módulo.
// Lo que se prueba: que traduzca los códigos a castellano —nadie tiene
// por qué saber qué es `staff_invited`— y que no ofrezca borrar nada.
console.log("\n── Usuarios y roles · Registro de cambios");
{
  const t = await sol.locator("body").innerText();
  ok("el registro está en la misma pantalla", t.includes("Registro de cambios"));
  ok(
    "traduce las acciones a castellano en vez de mostrar el código",
    /le dio acceso al panel/i.test(t) && !t.includes("staff_invited"),
    t.slice(t.indexOf("Registro de cambios"), t.indexOf("Registro de cambios") + 300),
  );
  ok("dice quién lo hizo", /dev/i.test(t));
  ok("no ofrece borrar ni editar el registro", !/borrar el registro|editar el registro/i.test(t));
  ok("avisa que no se puede editar ni borrar", /no se puede editar ni borrar/i.test(t));

  const filtro = sol.locator('select[aria-label="Filtrar por persona"]');
  ok("se puede filtrar por persona", (await filtro.count()) > 0);
  if (await filtro.count()) {
    await sol.locator('select[aria-label="Filtrar por tipo de cosa"]').selectOption("service");
    await sol.waitForTimeout(2000);
    const t2 = await sol.locator("body").innerText();
    ok("filtrar por tipo cambia la lista", /cambió el precio/i.test(t2));
  }
}

console.log("\n── Finanzas · Facturación");
{
  await sol.locator('button:has-text("Finanzas")').first().click();
  await sol.waitForTimeout(2500);
  const t = await sol.locator("body").innerText();

  ok("la facturación está en Finanzas", /facturación/i.test(t));
  // Lo primero que tiene que quedar claro es que el sistema no factura:
  // si Sol creyera que sí, dejaría de emitir y eso es un problema fiscal.
  ok("dice que las facturas las emite ella", /las emitís vos desde arca/i.test(t));
  ok("muestra lo que falta facturar", /falta facturar/i.test(t));

  // LA REGLA DEL BLOQUE: el tope lo carga el contador. Sin cargar, la
  // pantalla tiene que decir que no lo sabe en vez de mostrar un número.
  ok("sin tope cargado dice que no está", /no disponible/i.test(t));
  ok("y dice quién lo carga", /lo carga tu contador/i.test(t));
  ok("no inventa ningún porcentaje del tope", !/llevás el \d+%/i.test(t));

  const marcar = sol.locator('button[aria-label^="Marcar como facturada"]').first();
  if ((await marcar.count()) > 0) {
    await marcar.click();
    await sol.waitForTimeout(500);
    const importe = sol.locator('input[aria-label^="Importe facturado"]').first();
    ok("el importe viene cargado con lo cobrado", (await importe.inputValue()) !== "");

    const fecha = sol.locator('input[aria-label^="Fecha del comprobante"]').first();
    ok("la fecha no deja elegir un día futuro", (await fecha.getAttribute("max")) !== null);

    await sol.locator('button:has-text("Anotar")').first().click();
    await sol.waitForTimeout(2500);
    const t2 = await sol.locator("body").innerText();
    ok("anotar la factura lo confirma", /anotamos la factura/i.test(t2), t2.slice(0, 160));
    ok("y deja de figurar como pendiente", /no queda nada por facturar/i.test(t2));

    // Tipear mal un importe es lo más fácil que hay. Sin esta salida, la
    // única sería que alguien toque la base a mano —sobre datos fiscales—.
    // Además deja la prueba como la encontró, así la corrida siguiente
    // arranca igual que ésta.
    const undo = sol.locator('button[aria-label^="Deshacer la factura"]').first();
    ok("se puede deshacer lo que se acaba de anotar", (await undo.count()) > 0);
    if (await undo.count()) {
      await undo.click();
      await sol.waitForTimeout(2500);
      const t3 = await sol.locator("body").innerText();
      ok("deshacer lo dice", /volvimos atrás/i.test(t3));
      ok("y la atención vuelve a lo que falta facturar", !/no queda nada por facturar/i.test(t3));
    }
  } else {
    ok("hay algo para facturar en la prueba", false, "no apareció ninguna atención pendiente");
  }
}

console.log("\n── Roles y permisos");
{
  await sol.locator('button:has-text("Usuarios y roles")').first().click();
  await sol.waitForTimeout(2500);
  const t = await sol.locator("body").innerText();

  ok("Sol ve la matriz de permisos", /qué ve cada rol/i.test(t));
  ok("están los nueve módulos", /Inventario/i.test(t) && /Compras/i.test(t) && /Configuración/i.test(t));
  ok("dice qué es cada módulo, no sólo su nombre", /la caja, lo que entró/i.test(t));

  // A la administradora no se le puede recortar nada: si esto se
  // pudiera, el salón se queda sin nadie que lo arregle.
  const selDuena = sol.locator('select[aria-label="Finanzas para Administradora"]');
  ok("el rol de la administradora no se edita", (await selDuena.count()) > 0
    ? await selDuena.first().isDisabled()
    : false);
  ok("y la pantalla explica por qué", /entra a todo, siempre/i.test(t));

  // Un rol nuevo nace sin ver nada. Se crea, se comprueba, y se borra
  // para que la corrida siguiente arranque igual que ésta.
  const nombreRol = "Prueba " + Date.now().toString().slice(-5);
  await sol.locator('input[aria-label="Nombre del rol"]').fill(nombreRol);
  await sol.locator('button:has-text("Crear rol")').click();
  await sol.waitForTimeout(2500);
  const t2 = await sol.locator("body").innerText();
  ok("se puede armar un rol nuevo", t2.includes(nombreRol));
  ok("y nace sin ver nada", /todavía no ve nada/i.test(t2));

  // Por `aria-label` exacto y no por «el div que contiene el nombre»: en
  // esta pantalla conviven Personas, Roles y el Registro de cambios, y un
  // selector por texto agarra el contenedor de otra sección.
  const selFin = sol.locator(`select[aria-label="Finanzas para ${nombreRol}"]`);
  await selFin.waitFor({ timeout: 10000 }).catch(() => {});
  ok(
    "el rol nuevo arranca en «No lo ve»",
    (await selFin.count()) > 0 ? (await selFin.inputValue()) === "none" : false,
  );

  if (await selFin.count()) {
    await selFin.selectOption("view");
    await sol.waitForTimeout(2000);
    ok("darle un permiso queda guardado", (await selFin.inputValue()) === "view");
  }

  await sol.locator(`button[aria-label="Borrar el rol ${nombreRol}"]`).click();
  await sol.waitForTimeout(2500);
  const t4 = await sol.locator("body").innerText();
  ok("se puede borrar un rol que no usa nadie", /borramos el rol/i.test(t4));
  ok(
    "y desaparece de la lista",
    (await sol.locator(`select[aria-label="Finanzas para ${nombreRol}"]`).count()) === 0,
  );
}

console.log("\n── Quien atiende");
const staff = await abrirPanel(TOKEN_STAFF);
const ts = await staff.locator("body").innerText();
ok("puede trabajar el día", ts.includes("Agenda"));
ok("NO ve Servicios", !ts.includes("Servicios"));
ok("NO ve Finanzas", !ts.includes("Finanzas"));
ok("NO ve Usuarios y roles", !ts.includes("Usuarios y roles"));
ok("NO ve Inventario ni Compras", !ts.includes("Inventario") && !ts.includes("Compras"));
// Los módulos que sí le tocan aparecen aunque todavía no estén hechos:
// esconderlos haría que el panel parezca más chico de lo que va a ser.
ok("sí ve Clientas, que es suyo aunque no esté hecho", ts.includes("Clientas"));

await browser.close();
console.log(fallos.length ? `\n=== PANEL CON ${fallos.length} FALLA(S) ===` : "\n=== PANEL OK ===");
process.exit(fallos.length ? 1 : 0);
