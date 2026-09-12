import { describe, expect, it } from "bun:test";
import { estadoDelRechazo } from "./catalog-repository";

describe("estadoDelRechazo", () => {
  it("lo que no existe es un 404 y se muestra tal cual", () => {
    expect(estadoDelRechazo("No existe el servicio raiz-exiline")).toEqual({
      status: 404,
      message: "No existe el servicio raiz-exiline",
    });
    expect(estadoDelRechazo("No existe la promoción verano").status).toBe(404);
  });

  it("las validaciones propias salen con 400 y con su texto", () => {
    const r = estadoDelRechazo("La duración tiene que ser mayor a cero.");
    expect(r.status).toBe(400);
    expect(r.message).toBe("La duración tiene que ser mayor a cero.");
  });

  it("una pregunta también es una validación", () => {
    expect(estadoDelRechazo("¿Cuál de las dos líneas es?").status).toBe(400);
  });

  it("un slug repetido es un 409 con texto propio", () => {
    expect(
      estadoDelRechazo('duplicate key value violates unique constraint "services_slug_key"'),
    ).toEqual({ status: 409, message: "Ya existe algo con ese identificador." });
  });

  /**
   * La comprobación que justifica que exista esta función: un error crudo
   * de PostgreSQL no se le muestra a Sol. No le dice nada y cuenta cómo
   * está hecha la base.
   */
  it("un error crudo de la base no se filtra a la pantalla", () => {
    const r = estadoDelRechazo(
      'null value in column "price_amount" of relation "services" violates not-null constraint',
    );
    expect(r.status).toBe(500);
    expect(r.message).toBe("No se pudo guardar. Probá de nuevo.");
    expect(r.message).not.toContain("price_amount");
  });

  it("un mensaje vacío no se hace pasar por validación", () => {
    expect(estadoDelRechazo("   ").status).toBe(500);
  });
});
