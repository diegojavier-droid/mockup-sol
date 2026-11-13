import { describe, expect, mock, test } from "bun:test";
import type { SupabaseAdminClient } from "../supabase";
import { getBookingForStaff, listAgenda } from "./repository";

// Sólo datos sintéticos. La forma real del join también se ejercita en
// scripts/e2e-flow.sh contra el Supabase efímero del clean-room.
const row = {
  id: "turno-test",
  status: "attended",
  areas: { slug: "peluqueria" },
  customers: { id: "clienta-test", first_name: "Prueba" },
  booking_items: [],
  resources: null,
};

function client(record: unknown) {
  const select = mock((_columns: string) => query);
  const query = {
    select,
    gte: () => query,
    lt: () => query,
    eq: () => query,
    order: async () => ({ data: [{ ...row, service_execution_records: record }], error: null }),
    maybeSingle: async () => ({ data: { ...row, service_execution_records: record }, error: null }),
  };
  return { admin: { from: () => query } as unknown as SupabaseAdminClient, select };
}

describe("la agenda informa el cierre real sin inferirlo de attended", () => {
  for (const [name, record, closed] of [
    ["llegó, sin registro", null, false],
    ["sin registro (relación en lista)", [], false],
    ["cerrado", { booking_id: "turno-test" }, true],
    ["cerrado (relación en lista)", [{ booking_id: "turno-test" }], true],
  ] as const) {
    test(name, async () => {
      const { admin, select } = client(record);
      const entries = await listAgenda(admin, { from: new Date(0), to: new Date(1) });
      const detail = await getBookingForStaff(admin, "turno-test");
      expect(entries[0].status).toBe("attended");
      expect(entries[0].hasServiceClosure).toBe(closed);
      expect(detail?.hasServiceClosure).toBe(closed);
      expect(select.mock.calls[0]).toEqual([
        expect.stringContaining("service_execution_records(booking_id)"),
      ]);
    });
  }
});
