import type { QueryClient } from "@tanstack/react-query";
const keys = {
  booking: [["admin", "agenda"], ["admin", "agenda-resumen"], ["admin", "capacity"], ["admin", "stations"], ["admin", "cash-register"], ["admin", "dashboard"], ["admin", "refunds-pending"], ["admin", "invoicing"], ["admin", "customers"], ["admin", "audit"], ["availability"], ["booking"]],
  price: [["admin", "salon", "services"], ["admin", "salon", "catalog"], ["admin", "audit"], ["catalog"], ["quote"], ["availability"]],
  hours: [["admin", "business-hours"], ["salon-info"], ["availability"], ["admin", "capacity"], ["admin", "dashboard"], ["admin", "audit"]],
  station: [["admin", "agenda"], ["admin", "stations"], ["admin", "capacity"], ["admin", "dashboard"], ["admin", "audit"], ["availability"], ["booking"]],
};
export async function invalidateAdminChange(client: QueryClient, change: keyof typeof keys) {
  await Promise.all(keys[change].map(queryKey => client.invalidateQueries({queryKey})));
}
