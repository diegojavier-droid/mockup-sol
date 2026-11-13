import { afterEach, describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ApiPersonalizationField } from "@/lib/api/catalog-types";
import { CatalogProvider } from "@/lib/catalog-context";
import {
  useBookingWizard,
} from "@/components/booking/hooks/useBookingWizard";
import { BOOKING_DRAFT_STORAGE_KEY, BOOKING_DRAFT_VERSION } from "@/lib/booking-draft-storage";

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
afterEach(() => {
  if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
  else Reflect.deleteProperty(globalThis, "window");
});

function restore(
  step: string,
  personalization: Record<string, string> = { alergias: "Sí, importantes" },
  fields: ApiPersonalizationField[] = [],
  startSelected = false,
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
  let storageAccesses=0;
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      get sessionStorage() { storageAccesses++; return {
        getItem: (key: string) => key === BOOKING_DRAFT_STORAGE_KEY ? JSON.stringify(draft) : null,
        removeItem: () => {},
      }; },
      get localStorage() { storageAccesses++; throw new Error("No browser persistence"); },
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
    captured = useBookingWizard(() => {}, startSelected ? {categoryId:"maquillaje",serviceId:"mk-social"} : undefined);
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
  expect(storageAccesses).toBe(0);
  return captured!;
}

// Site-specific derivative of canonical #103 tests. Upstream keeps restoration
// and allergy optionality coverage; this private Site deliberately stores nothing
// and never restores contact/context. Test that contract rather than disabling tests.
describe("Site: recarga sin almacenamiento ni consentimiento inventado", () => {
  test("ignora una revisión guardada con contacto, salud y aceptación manipulada", () => {
    const wizard = restore("review");
    expect(wizard.wasDraftRestored).toBe(false);
    expect(wizard.stepKey).toBe("category");
    expect(wizard.acceptedTerms).toBe(false);
    expect(wizard.personal).toEqual({});
    expect(wizard.additionalComments).toBe("");
    expect(wizard.customer).toEqual({firstName:"",whatsapp:"",email:""});
    expect(wizard.confirmedBooking).toBeNull();
    expect(wizard.paymentPending).toBe(false);
  });
  test("un paso guardado no salta selección ni recupera una fecha o un turno", () => {
    const wizard = restore("dateTime");
    expect(wizard.stepKey).toBe("category");
    expect(wizard.acceptedTerms).toBe(false);
    expect(wizard.service).toBeNull();
    expect(wizard.date).toBeNull();
    expect(wizard.time).toBeNull();
  });
  test("cada nueva inicialización requiere aceptación explícita", async () => {
    for(let i=0;i<2;i++) {
      const wizard=restore("review",{},[],true);
      expect(wizard.acceptedTerms).toBe(false);
      // Without acceptance the handler exits before any booking mutation.
      await wizard.confirmBookingRequest();
      expect(wizard.confirmedBooking).toBeNull();
      expect(wizard.paymentPending).toBe(false);
    }
  });
});
const field: ApiPersonalizationField = {
  slug:"tipo",categorySlug:"maquillaje",label:"Tipo",fieldType:"single_choice",
  isRequired:false,fieldRole:"modifier",decision:"operational",options:[],
};
describe("Site: obligatoriedad operativa sin contexto restaurado",()=>{
  test("la selección explícita abre detalles sin recuperar respuestas privadas",()=>{
    const wizard=restore("review",{alergias:"Sí, importantes"},[field],true);
    expect(wizard.stepKey).toBe("details");
    expect(wizard.service?.id).toBe("mk-social");
    expect(wizard.personal).toEqual({});
    expect(wizard.data.personalization).toEqual({});
    expect(wizard.canNext).toBe(true);
  });
  test("una pregunta operativa opcional no bloquea",()=>{
    const wizard=restore("details",{},[field],true);
    expect(wizard.stepKey).toBe("details");
    expect(wizard.canNext).toBe(true);
  });
  test("si el catálogo hace obligatoria esa pregunta, falta responder",()=>{
    const wizard=restore("details",{tipo:"Liso"},[{...field,isRequired:true}],true);
    expect(wizard.stepKey).toBe("details");
    expect(wizard.canNext).toBe(false);
    expect(wizard.personal).toEqual({});
  });
});
