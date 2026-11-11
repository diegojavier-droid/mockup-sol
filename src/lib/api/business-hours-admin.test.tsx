import { describe, expect, test } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { BusinessHoursScreen } from "../../components/booking/admin/BusinessHoursScreen";
import {
  changedHour,
  hourEdit,
  hourError,
  hourPatch,
  type BusinessHourRow,
} from "./business-hours-admin";
const row: BusinessHourRow = {
  id: "test",
  weekday: 2,
  opens_at: "08:00:00",
  closes_at: "15:00:00",
  is_active: true,
};

describe("edición semanal", () => {
  test("usa horarios reales, no cambia valores intactos y compara la versión vista", () => {
    const edit = hourEdit(row);
    expect(edit).toEqual({ opensAt: "08:00", closesAt: "15:00", isActive: true });
    expect(changedHour(row, edit)).toBe(false);
    const disabled = { ...edit, isActive: false };
    expect(changedHour(row, disabled)).toBe(true);
    expect(hourPatch(row, disabled)).toEqual({
      isActive: false,
      expected: { opensAt: "08:00:00", closesAt: "15:00:00", isActive: true },
    });
    expect(hourPatch({ ...row, opens_at: "08:00:30" }, disabled).expected.opensAt).toBe("08:00:30");
  });
  test("rechaza vacíos, formato, horas fuera de rango, cierre igual o anterior", () => {
    for (const [opensAt, closesAt] of [
      ["", "15:00"],
      ["08:00", ""],
      ["8:00", "15:00"],
      ["24:00", "25:00"],
      ["08:60", "15:00"],
      ["15:00", "15:00"],
      ["20:00", "08:00"],
    ]) {
      expect(hourError({ opensAt, closesAt, isActive: true })).not.toBeNull();
    }
    expect(hourError({ opensAt: "00:00", closesAt: "23:59", isActive: false })).toBeNull();
  });
  test("la semana conserva días sin franja y view no tiene botones de escritura", () => {
    const qc = new QueryClient();
    qc.setQueryData(["admin", "me"], { permisos: { configuracion: "view" } });
    qc.setQueryData(
      ["admin", "business-hours"],
      [row, { ...row, id: "other", opens_at: "16:00:00", closes_at: "19:00:00", is_active: false }],
    );
    const html = renderToStaticMarkup(
      <QueryClientProvider client={qc}>
        <BusinessHoursScreen />
      </QueryClientProvider>,
    );
    expect(html).toContain("Sin horario online cargado.");
    expect(html).toContain("Sábado");
    expect(html).toContain("16:00");
    expect(html).toContain("Sin turnos online");
    expect(html).not.toContain("Editar");
    expect(html).not.toContain("Guardar");
  });
  test("sin permiso no muestra datos cacheados de otra sesión", () => {
    const qc = new QueryClient();
    qc.setQueryData(["admin", "me"], { permisos: {} });
    qc.setQueryData(["admin", "business-hours"], [row]);
    const html = renderToStaticMarkup(
      <QueryClientProvider client={qc}>
        <BusinessHoursScreen />
      </QueryClientProvider>,
    );
    expect(html).toContain("No tenés acceso");
    expect(html).not.toContain("08:00");
  });
});
