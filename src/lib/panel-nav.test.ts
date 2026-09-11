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
  test("son los nueve módulos de §5.0", () => {
    expect(ARBOL.map((m) => m.slug)).toEqual([
      "agenda",
      "clientas",
      "finanzas",
      "inventario",
      "servicios",
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
    expect(total).toBe(33);
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
    for (const m of ARBOL) {
      if (m.slug === "agenda") continue;
      expect(m.permiso).toBe(m.slug as typeof m.permiso);
    }
  });
});

describe("una dirección que no existe", () => {
  test("no resuelve a ningún módulo", () => {
    expect(buscarModulo("inventado")).toBeUndefined();
    expect(buscarModulo(undefined)).toBeUndefined();
  });
});
