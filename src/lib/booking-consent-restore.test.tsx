import { afterEach, describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CatalogProvider } from "./catalog-context";
import { useBookingWizard } from "../components/booking/hooks/useBookingWizard";
import { BOOKING_DRAFT_STORAGE_KEY, BOOKING_DRAFT_VERSION } from "./booking-draft-storage";

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
afterEach(() => {
  if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
  else Reflect.deleteProperty(globalThis, "window");
});

function restore(step: string) {
  const draft = {
    version: BOOKING_DRAFT_VERSION,
    updatedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    state: {
      currentStepKey: step,
      selectedCategoryId: "maquillaje",
      selectedServiceId: "mk-social",
      personalization: { alergias: "Sí, importantes" },
      additionalComments: "Nota sintética",
      selectedExtras: [],
      selectedDate: "2030-11-12",
      selectedTime: "12:00",
      customer: { firstName: "Prueba", whatsapp: "+5493425550000", email: "prueba@example.test" },
      paymentPending: false,
      // Una propiedad de más en un borrador viejo/manipulado no es consentimiento.
      acceptedTerms: true,
      acceptedTermsVersion: "test-version",
    },
  };
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      sessionStorage: {
        getItem: (key: string) =>
          key === BOOKING_DRAFT_STORAGE_KEY ? JSON.stringify(draft) : null,
        removeItem: () => {},
      },
    },
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(["catalog", "categories"], [{ slug: "maquillaje", name: "Maquillaje" }]);
  client.setQueryData(
    ["catalog", "services"],
    [
      {
        slug: "mk-social",
        categorySlug: "maquillaje",
        name: "Social",
        durationMinutes: 30,
        priceAmount: 1000,
        priceFromAmount: 1000,
        priceDisplayMode: "fixed",
      },
    ],
  );
  client.setQueryData(["catalog", "extras"], []);
  client.setQueryData(["catalog", "personalization"], []);
  client.setQueryData(["salon-info"], { hours: [], termsVersion: "test-version" });
  let captured: ReturnType<typeof useBookingWizard> | undefined;
  function Harness() {
    captured = useBookingWizard(() => {});
    return null;
  }
  renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <CatalogProvider>
        <Harness />
      </CatalogProvider>
    </QueryClientProvider>,
  );
  client.clear();
  return captured!;
}

describe("inicialización React con borrador guardado", () => {
  test("review vuelve a datos sin inventar consentimiento, conservando contexto", () => {
    const wizard = restore("review");
    expect(wizard.wasDraftRestored).toBe(true);
    expect(wizard.stepKey).toBe("customerData");
    expect(wizard.acceptedTerms).toBe(false);
    expect(wizard.personal.alergias).toBe("Sí, importantes");
    expect(wizard.customer.firstName).toBe("Prueba");
  });
  test("un paso anterior no se adelanta ni pierde la selección", () => {
    const wizard = restore("dateTime");
    expect(wizard.stepKey).toBe("dateTime");
    expect(wizard.acceptedTerms).toBe(false);
    expect(wizard.service?.id).toBe("mk-social");
  });
});
