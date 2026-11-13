// Client-only test shell: the real index, wizard, hooks and booking route.
// No Worker, production credentials or backend writes are used here.
import {expectedTermsVersion} from "@deployment/booking-policy";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRootRoute, createRouter, Outlet, RouterProvider } from "@tanstack/react-router";
import { CatalogProvider } from "../../src/lib/catalog-context";
import { Route as indexImport } from "../../src/routes/index";
import { Route as bookingImport } from "../../src/routes/reserva.$token";

const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
client.setQueryData(["catalog", "categories"], [{ slug: "depilacion", name: "Depilación" }]);
client.setQueryData(
  ["catalog", "services"],
  [
    {
      slug: "cejas",
      categorySlug: "depilacion",
      name: "Cejas",
      durationMinutes: 15,
      priceAmount: 12000,
      priceFromAmount: 12000,
      priceDisplayMode: "fixed",
    },
  ],
);
client.setQueryData(["catalog", "extras"], []);
client.setQueryData(["catalog", "personalization"], []);
client.setQueryData(["salon-info"], { hours: [], depositRatePct: 20, termsVersion: expectedTermsVersion });

const root = createRootRoute({
  component: () => (
    <QueryClientProvider client={client}>
      <CatalogProvider>
        <Outlet />
      </CatalogProvider>
    </QueryClientProvider>
  ),
});
const index = indexImport.update({ id: "/", path: "/", getParentRoute: () => root });
const booking = bookingImport.update({
  id: "/reserva/$token",
  path: "/reserva/$token",
  getParentRoute: () => root,
});
const router = createRouter({ routeTree: root.addChildren([index, booking]) });
createRoot(document.getElementById("root")).render(<RouterProvider router={router} />);
