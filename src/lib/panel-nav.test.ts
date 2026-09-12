/**
 * Invariantes del árbol del panel.
 *
 * Existe por un error concreto: hasta este bloque, las secciones del
 * módulo de los turnos estaban escritas en tres lugares y los tres
 * decían cosas distintas —el chip decía «Hoy · Semana», §5.0 de la
 * arquitectura decía «Hoy · Semana · Mes · Año» y los filtros de adentro
 * decían «Hoy · Mañana · Semana»—. Ninguna prueba lo notó porque no
 * había nada que comparar.
 *
 * Ahora el árbol es uno solo y esto lo defiende.
 */

import { describe, expect, test } from "bun:test";
import { ARBOL, BARRA_TELEFONO, buscarModulo, primeraSeccion, rutaDe } from "./panel-nav";

describe("el árbol del panel", () => {
  test("son los diez módulos de §5.0", () => {
    // Diez desde el 2026-09-12: «Puestos de trabajo» se separó de
    // Servicios para juntar el alta/baja con los bloqueos, que vivían en
    // un cuadro de la Agenda con otro nombre.
    expect(ARBOL.map((m) => m.slug)).toEqual([
      "agenda",
      "clientas",
      "finanzas",
      "inventario",
      "servicios",
      "puestos",
      "personal",
      "compras",
      "usuarios",
      "configuracion",
    ]);
  });

  test("el orden es el de la frecuencia de uso, con dos cortes y ningún rótulo", () => {
    // Los rótulos («Todos los días», «Cada tanto», «Casi nunca, pero
    // tiene que estar») se fueron: describían al sistema en vez de
    // ayudar a encontrar. El orden que decidían se queda.
    expect(ARBOL.filter((m) => m.cortaDespues).map((m) => m.slug)).toEqual([
      "inventario",
      "compras",
    ]);
  });

  test("ningún módulo se queda sin secciones", () => {
    for (const m of ARBOL) expect(m.secciones.length).toBeGreaterThan(0);
  });

  test("no hay dos secciones con la misma dirección dentro de un módulo", () => {
    for (const m of ARBOL) {
      const slugs = m.secciones.map((s) => s.slug);
      expect(new Set(slugs).size).toBe(slugs.length);
    }
  });

  test("las direcciones sólo usan letras, números y guiones", () => {
    for (const m of ARBOL) {
      expect(m.slug).toMatch(/^[a-z0-9-]+$/);
      for (const s of m.secciones) expect(s.slug).toMatch(/^[a-z0-9-]+$/);
    }
  });

  test("la cuenta de secciones es la que dice la arquitectura", () => {
    // Si esto cambia, hay que corregir §5.0 de
    // `docs/sol-mai-arquitectura-modular.md` en el mismo commit: son la
    // misma afirmación escrita dos veces.
    const total = ARBOL.reduce((n, m) => n + m.secciones.length, 0);
    // 37 desde que Servicios se abrió en tres: Servicios, Tratamientos y
    // Promociones son submódulos del catálogo. Ver §5.0.
    expect(total).toBe(37);
  });
});

describe("la barra de abajo del teléfono", () => {
  test("lleva a módulos que existen", () => {
    for (const slug of BARRA_TELEFONO) expect(buscarModulo(slug)).toBeDefined();
  });

  test("son tres destinos más «Más», y se nombran por módulo", () => {
    // Decidido el 2026-09-11: la misma palabra abajo, en la barra
    // lateral, en las migas y en la dirección.
    expect(BARRA_TELEFONO).toEqual(["agenda", "clientas", "finanzas"]);
    for (const slug of BARRA_TELEFONO) {
      expect(buscarModulo(slug)!.label).toBe(
        { agenda: "Agenda", clientas: "Clientas", finanzas: "Finanzas" }[slug],
      );
    }
  });
});

describe("a dónde lleva tocar el nombre de un módulo", () => {
  test("a su primera sección con pantalla", () => {
    expect(primeraSeccion(buscarModulo("agenda")!).slug).toBe("hoy");
    expect(primeraSeccion(buscarModulo("finanzas")!).slug).toBe("caja");
    expect(primeraSeccion(buscarModulo("usuarios")!).slug).toBe("personas");
  });

  test("y si el módulo entero está por construirse, a la primera de todas", () => {
    // Clientas no tiene ninguna pantalla todavía. Cae en Fichas, que
    // explica qué va a haber ahí en vez de dejar la pantalla en blanco.
    const clientas = buscarModulo("clientas")!;
    expect(clientas.secciones.some((s) => s.listo)).toBe(false);
    expect(primeraSeccion(clientas).slug).toBe("fichas");
  });

  test("la entrada del panel es Agenda › Hoy", () => {
    expect(rutaDe(buscarModulo("agenda")!, primeraSeccion(buscarModulo("agenda")!))).toBe(
      "/panel/agenda/hoy",
    );
  });
});

describe("el permiso y el nombre visible son cosas distintas", () => {
  test("el módulo se llama Agenda pero el permiso sigue siendo `calendario`", () => {
    // El permiso es el contrato con el servidor y con la matriz de la
    // base. Renombrarlo es una migración de datos, no de navegación.
    const agenda = buscarModulo("agenda")!;
    expect(agenda.label).toBe("Agenda");
    expect(agenda.permiso).toBe("calendario");
  });

  test("los demás módulos usan su propio slug como permiso", () => {
    // Salvo los dos que no pueden: los nueve nombres de `Modulo` son el
    // contrato con la matriz de la base, y cambiarlos es una migración
    // de datos. Agenda usa `calendario`; Puestos de trabajo usa
    // `servicios`, que es el que ya gobernaba sus dos pantallas.
    for (const m of ARBOL) {
      if (m.slug === "agenda" || m.slug === "puestos") continue;
      expect(m.permiso).toBe(m.slug as typeof m.permiso);
    }
  });

  test("Puestos de trabajo hereda el permiso de Servicios", () => {
    expect(buscarModulo("puestos")!.permiso).toBe("servicios");
  });

  test("y ya no cuelga de Servicios", () => {
    const servicios = buscarModulo("servicios")!;
    expect(servicios.secciones.map((s) => s.slug)).toEqual([
      "catalogo",
      "tratamientos",
      "promociones",
      "precios",
      "areas",
      "horarios",
    ]);
    expect(servicios.secciones.some((s) => s.slug.startsWith("puesto"))).toBe(false);
  });

  /**
   * Los tres submódulos del catálogo van primero y los tres tienen
   * pantalla. Si alguno quedara apagado, la sección se vería gris y no
   * habría manera de dar de alta un servicio, que es justamente lo que
   * este bloque vino a arreglar.
   */
  test("Servicios, Tratamientos y Promociones tienen pantalla", () => {
    const servicios = buscarModulo("servicios")!;
    for (const slug of ["catalogo", "tratamientos", "promociones"]) {
      expect(servicios.secciones.find((s) => s.slug === slug)?.listo).toBe(true);
    }
  });
});

describe("una dirección que no existe", () => {
  test("no resuelve a ningún módulo", () => {
    expect(buscarModulo("inventado")).toBeUndefined();
    expect(buscarModulo(undefined)).toBeUndefined();
  });
});
