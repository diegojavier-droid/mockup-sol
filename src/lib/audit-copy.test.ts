/**
 * Lo que se prueba acá es que el registro diga la verdad en castellano.
 *
 * Las formas de `detalle` no son inventadas: salen de las migraciones que
 * escriben cada acción. Si mañana una cambia y esto no se actualiza, el
 * test avisa antes que la pantalla.
 */
import { describe, expect, it } from "bun:test";
import { describirCambio, type AuditRow } from "./audit-copy";

const fila = (accion: string, detalle: Record<string, unknown> = {}): AuditRow => ({
  id: 1,
  cuando: "2026-09-10T13:00:00Z",
  quien: "Sol",
  esSistema: false,
  accion,
  entityType: "service",
  sobre: "Color",
  detalle,
});

describe("describirCambio", () => {
  it("dice un cambio de precio con el antes y el ahora", () => {
    const r = describirCambio(
      fila("service_price_changed", {
        precio_anterior: 35000,
        precio_nuevo: 38500,
        duracion_anterior: 120,
        duracion_nueva: 120,
      }),
    );
    expect(r.frase).toBe("Cambió el precio");
    expect(r.antes).toBe("$35.000");
    expect(r.ahora).toBe("$38.500");
  });

  it("cuando sólo cambió el tiempo, lo dice en minutos y no en pesos", () => {
    const r = describirCambio(
      fila("service_price_changed", {
        precio_anterior: 35000,
        precio_nuevo: 35000,
        duracion_anterior: 120,
        duracion_nueva: 90,
      }),
    );
    expect(r.frase).toBe("Cambió cuánto lleva");
    expect(r.antes).toBe("120 min");
    expect(r.ahora).toBe("90 min");
  });

  it("distingue dar acceso de devolverlo", () => {
    expect(describirCambio(fila("staff_invited", { rol: "staff", reingreso: false })).frase).toBe(
      "Le dio acceso al panel, como mostrador",
    );
    expect(describirCambio(fila("staff_invited", { rol: "owner", reingreso: true })).frase).toBe(
      "Le devolvió el acceso, como administradora",
    );
  });

  it("traduce los roles y los estados, no los muestra en inglés", () => {
    const rol = describirCambio(
      fila("staff_role_changed", { rol_anterior: "staff", rol_nuevo: "owner" }),
    );
    expect(rol.antes).toBe("mostrador");
    expect(rol.ahora).toBe("administradora");

    const estado = describirCambio(
      fila("booking_status_changed", { previous_status: "confirmed", new_status: "attended" }),
    );
    expect(estado.antes).toBe("confirmado");
    expect(estado.ahora).toBe("atendido");
  });

  it("dice por qué canal entró un turno", () => {
    expect(describirCambio(fila("booking_created", { source: "whatsapp" })).frase).toBe(
      "Cargó el turno por WhatsApp",
    );
    expect(describirCambio(fila("booking_created", { source: "online" })).frase).toBe(
      "Cargó el turno por la web",
    );
  });

  it("al cerrar una atención muestra el estimado sólo si el final fue otro", () => {
    const subio = describirCambio(fila("service_closed", { estimated: 30000, final_price: 41200 }));
    expect(subio.antes).toBe("$30.000");
    expect(subio.ahora).toBe("$41.200");

    const igual = describirCambio(fila("service_closed", { estimated: 30000, final_price: 30000 }));
    expect(igual.antes).toBeUndefined();
    expect(igual.ahora).toBe("$30.000");
  });

  it("no interpreta: una ausencia corregida se cuenta como lo que pasó", () => {
    const r = describirCambio(fila("auto_no_show_reverted", { new_status: "attended" }));
    expect(r.frase).toBe("Corrigió una ausencia: la clienta sí vino");
    expect(r.ahora).toBe("atendido");
  });

  // --- lo que importa que NO haga --------------------------------------

  it("una acción que no sabe traducir se muestra igual, no se esconde", () => {
    const r = describirCambio(fila("algo_que_no_existe_todavia", { x: 1 }));
    expect(r.frase).toBe("algo_que_no_existe_todavia");
    expect(r.crudo).toBe('{"x":1}');
  });

  it("un detalle vacío no rompe nada", () => {
    expect(() => describirCambio(fila("service_price_changed"))).not.toThrow();
    expect(describirCambio(fila("staff_role_changed")).antes).toBe("—");
  });

  it("un valor desconocido se muestra tal cual en vez de desaparecer", () => {
    const r = describirCambio(fila("booking_status_changed", { new_status: "un_estado_nuevo" }));
    expect(r.ahora).toBe("un_estado_nuevo");
  });
});
