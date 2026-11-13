import { afterEach, describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ApiPersonalizationField } from "./api/catalog-types";
import { CatalogProvider } from "./catalog-context";
import {
  buildBookingRequestPayload,
  useBookingWizard,
} from "../components/booking/hooks/useBookingWizard";
import { BOOKING_DRAFT_STORAGE_KEY, BOOKING_DRAFT_VERSION } from "./booking-draft-storage";

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
afterEach(() => {
  if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
  else Reflect.deleteProperty(globalThis, "window");
});

function restore(
  step: string,
  personalization: Record<string, string> = { alergias: "Sí, importantes" },
  fields: ApiPersonalizationField[] = [],
) {
  const draft = {
    version: BOOKING_DRAFT_VERSION,
    updatedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    state: {
      currentStepKey: step,
      selectedCategoryId: "maquillaje",
      selectedServiceId: "mk-social",
      personalization,
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
  client.setQueryData(["catalog", "personalization"], fields);
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

const detailFields: ApiPersonalizationField[] = [
  {
    slug: "estilo",
    categorySlug: "maquillaje",
    label: "Estilo",
    fieldType: "single_choice",
    isRequired: true,
    fieldRole: "modifier",
    decision: "operational",
    options: [],
  },
  {
    slug: "alergias",
    categorySlug: "maquillaje",
    label: "Alergias",
    fieldType: "single_choice",
    isRequired: false,
    fieldRole: "modifier",
    decision: "operational",
    options: [],
  },
];

describe("obligatoriedad de los detalles desde el catálogo real", () => {
  test("permite continuar sin responder alergias cuando el catálogo la declara opcional", () => {
    const wizard = restore("details", { estilo: "Natural" }, detailFields);
    expect(wizard.stepKey).toBe("details");
    expect(wizard.canNext).toBe(true);
    expect(wizard.personal).toEqual({ estilo: "Natural" });
  });

  test("bloquea continuar si falta un campo obligatorio aunque se responda el opcional", () => {
    const wizard = restore("details", { alergias: "Sí, importantes" }, detailFields);
    expect(wizard.stepKey).toBe("details");
    expect(wizard.canNext).toBe(false);
  });

  test("respeta un cambio de obligatoriedad del catálogo sin reglas especiales por slug", () => {
    const fields = detailFields.map((field) => ({ ...field, isRequired: true }));
    const wizard = restore("details", { estilo: "Natural" }, fields);
    expect(wizard.canNext).toBe(false);
  });

  test("conserva la elección de alergia y el resto de respuestas en resumen y solicitud", () => {
    const personal = { estilo: "Natural", alergias: "Sí, importantes" };
    const wizard = restore("details", personal, detailFields);
    expect(wizard.canNext).toBe(true);
    expect(wizard.data.personalization).toEqual(personal);
    const payload = buildBookingRequestPayload({
      category: wizard.category,
      service: wizard.service,
      personal: wizard.personal,
      additionalComments: wizard.additionalComments,
      chosenExtras: wizard.chosenExtras,
      date: wizard.date,
      time: wizard.time,
      customer: wizard.customer,
      isCustomerRecognized: wizard.isCustomerRecognized,
    });
    expect(payload).toMatchObject({ selection: { personalization: personal } });
  });
});
