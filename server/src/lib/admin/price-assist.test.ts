/**
 * Lo que se testea acá es la aritmética, no el modelo.
 *
 * `proponerCambios` es la única parte del asistente que toca números, y
 * es pura a propósito: recibe la intención ya interpretada y el catálogo,
 * y devuelve qué quedaría. Si esto está bien, lo peor que puede hacer un
 * malentendido del modelo es proponer un cambio que Sol no pidió —y lo
 * va a ver antes de confirmarlo—.
 */
import { describe, expect, it } from "bun:test";
import { proponerCambios, type Intencion } from "./price-assist";
import type { ServiceTierRow } from "./salon-repository";

const CATALOGO: ServiceTierRow[] = [
  {
    slug: "corte",
    name: "Corte",
    area: "peluqueria",
    lengthTier: "corto",
    priceMain: 10_000,
    durationMin: 45,
    isActive: true,
  },
  {
    slug: "corte",
    name: "Corte",
    area: "peluqueria",
    lengthTier: "largo",
    priceMain: 12_000,
    durationMin: 60,
    isActive: true,
  },
  {
    slug: "color",
    name: "Color",
    area: "peluqueria",
    lengthTier: "unico",
    priceMain: 30_000,
    durationMin: 120,
    isActive: true,
  },
  {
    slug: "semi",
    name: "Semipermanente",
    area: "unas",
    lengthTier: "unico",
    priceMain: 8_000,
    durationMin: 60,
    isActive: true,
  },
  {
    slug: "viejo",
    name: "Servicio archivado",
    area: "peluqueria",
    lengthTier: "unico",
    priceMain: 5_000,
    durationMin: 30,
    isActive: false,
  },
];

const intencion = (p: Partial<Intencion>): Intencion => ({
  entiendo: true,
  explicacion: "",
  que: "precio",
  alcance: "todo",
  operacion: "porcentaje",
  valor: 10,
  ...p,
});

describe("proponerCambios", () => {
  it("sube un porcentaje sobre un área y no toca las otras", () => {
    const r = proponerCambios(
      intencion({ alcance: "area", area: "peluqueria", valor: 15, redondeo: 100 }),
      CATALOGO,
    );
    expect(r.entiendo).toBe(true);
    expect(r.cambios.map((c) => `${c.slug}/${c.lengthTier}:${c.precioAhora}`)).toEqual([
      "corte/corto:11500",
      "corte/largo:13800",
      "color/unico:34500",
    ]);
    // Uñas queda afuera, y el archivado también.
    expect(r.cambios.some((c) => c.area === "unas")).toBe(false);
    expect(r.cambios.some((c) => c.slug === "viejo")).toBe(false);
  });

  it("no toca la duración cuando el cambio es de precio", () => {
    const r = proponerCambios(
      intencion({ alcance: "servicios", servicios: ["color"], valor: 10 }),
      CATALOGO,
    );
    expect(r.cambios).toHaveLength(1);
    expect(r.cambios[0]!.duracionAntes).toBe(120);
    expect(r.cambios[0]!.duracionAhora).toBe(120);
    expect(r.cambios[0]!.precioAhora).toBe(33_000);
  });

  it("redondea a donde le digan", () => {
    const base = { alcance: "servicios" as const, servicios: ["semi"], valor: 7 };
    expect(
      proponerCambios(intencion({ ...base, redondeo: 0 }), CATALOGO).cambios[0]!.precioAhora,
    ).toBe(8_560);
    expect(
      proponerCambios(intencion({ ...base, redondeo: 100 }), CATALOGO).cambios[0]!.precioAhora,
    ).toBe(8_600);
    expect(
      proponerCambios(intencion({ ...base, redondeo: 1000 }), CATALOGO).cambios[0]!.precioAhora,
    ).toBe(9_000);
  });

  it("suma un monto fijo y deja un precio exacto", () => {
    const soloCorte = { alcance: "servicios" as const, servicios: ["corte"], largo: "corto" };
    expect(
      proponerCambios(intencion({ ...soloCorte, operacion: "monto", valor: 2_500 }), CATALOGO)
        .cambios[0]!.precioAhora,
    ).toBe(12_500);
    expect(
      proponerCambios(intencion({ ...soloCorte, operacion: "fijo", valor: 13_000 }), CATALOGO)
        .cambios[0]!.precioAhora,
    ).toBe(13_000);
  });

  it("cambia duraciones sin tocar precios", () => {
    const r = proponerCambios(
      intencion({
        que: "duracion",
        alcance: "servicios",
        servicios: ["corte"],
        operacion: "monto",
        valor: 15,
      }),
      CATALOGO,
    );
    expect(r.cambios.map((c) => c.duracionAhora)).toEqual([60, 75]);
    expect(r.cambios.every((c) => c.precioAhora === c.precioAntes)).toBe(true);
  });

  // -------- lo que NO tiene que dejar pasar ---------------------------

  it("no propone nada si el modelo dijo que no entendió", () => {
    const r = proponerCambios({ entiendo: false, explicacion: "", motivo: "¿Cuánto?" }, CATALOGO);
    expect(r.entiendo).toBe(false);
    expect(r.cambios).toHaveLength(0);
    expect(r.motivo).toBe("¿Cuánto?");
  });

  it("no propone nada si falta por cuánto cambiarlo", () => {
    const r = proponerCambios(intencion({ operacion: null, valor: null }), CATALOGO);
    expect(r.entiendo).toBe(false);
    expect(r.cambios).toHaveLength(0);
  });

  it("rechaza entero un cambio que dejaría un precio en cero o negativo", () => {
    const r = proponerCambios(intencion({ operacion: "monto", valor: -9_000 }), CATALOGO);
    expect(r.entiendo).toBe(false);
    expect(r.cambios).toHaveLength(0);
    expect(r.motivo).toContain("cero");
  });

  it("frena un porcentaje absurdo antes de calcular nada", () => {
    expect(proponerCambios(intencion({ valor: -95 }), CATALOGO).entiendo).toBe(false);
    expect(proponerCambios(intencion({ valor: 5_000 }), CATALOGO).entiendo).toBe(false);
  });

  it("frena una duración imposible", () => {
    const r = proponerCambios(
      intencion({ que: "duracion", operacion: "fijo", valor: 900 }),
      CATALOGO,
    );
    expect(r.entiendo).toBe(false);
  });

  it("avisa cuando el alcance no encuentra nada en vez de tocar todo", () => {
    const porArea = proponerCambios(intencion({ alcance: "area", area: "barberia" }), CATALOGO);
    expect(porArea.entiendo).toBe(false);
    expect(porArea.cambios).toHaveLength(0);

    const porServicio = proponerCambios(
      intencion({ alcance: "servicios", servicios: ["no-existe"] }),
      CATALOGO,
    );
    expect(porServicio.entiendo).toBe(false);
    expect(porServicio.cambios).toHaveLength(0);
  });

  it("avisa cuando el área quedó sin nombre en vez de aplicar a todo", () => {
    const r = proponerCambios(intencion({ alcance: "area", area: null }), CATALOGO);
    expect(r.entiendo).toBe(false);
    expect(r.cambios).toHaveLength(0);
  });

  it("no propone un cambio que deja todo igual", () => {
    const r = proponerCambios(intencion({ operacion: "porcentaje", valor: 0 }), CATALOGO);
    expect(r.entiendo).toBe(false);
    expect(r.cambios).toHaveLength(0);
  });

  it("lleva el valor anterior en cada renglón, que es lo que permite deshacer", () => {
    const r = proponerCambios(
      intencion({ alcance: "servicios", servicios: ["color"], valor: 20 }),
      CATALOGO,
    );
    expect(r.cambios[0]).toMatchObject({
      slug: "color",
      lengthTier: "unico",
      precioAntes: 30_000,
      precioAhora: 36_000,
      duracionAntes: 120,
      duracionAhora: 120,
    });
  });
});
