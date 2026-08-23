import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Landing } from "@/components/booking/Landing";
import { BookingWizard } from "@/components/booking/BookingWizard";
import { KnownCustomerBlock } from "@/components/booking/KnownCustomerBlock";
import { readCustomerToken } from "@/lib/api/identity-hooks";
import { useCatalog } from "@/lib/catalog-context";
import type {
  BookingReturnTarget,
  StartBookingInput,
} from "@/components/booking/booking-navigation-types";
import { hasValidBookingDraft } from "@/lib/booking-draft-storage";
import type { CategoryId } from "@/lib/booking-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sol Mai Peluquería · Reservá tu turno" },
      {
        name: "description",
        content:
          "Peluquería en Santa Fe Capital. Reservá tu turno de peluquería, maquillaje, uñas o depilación en minutos.",
      },
      { property: "og:title", content: "Sol Mai Peluquería · Reservá tu turno" },
      {
        property: "og:description",
        content: "Belleza, a tu medida. Color y cuidado capilar con productos Itely Hairfashion.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const [mode, setMode] = useState<"landing" | "wizard">(() =>
    hasValidBookingDraft() ? "wizard" : "landing",
  );
  const [initialCategory, setInitialCategory] = useState<CategoryId | undefined>();
  const [initialServiceId, setInitialServiceId] = useState<string | undefined>();
  const [returnTarget, setReturnTarget] = useState<BookingReturnTarget | undefined>();
  const [selectedPublicCategory, setSelectedPublicCategory] = useState<CategoryId | null>(null);
  const [restoreServicesViewKey, setRestoreServicesViewKey] = useState(0);

  const clearBookingContext = () => {
    setInitialCategory(undefined);
    setInitialServiceId(undefined);
    setReturnTarget(undefined);
  };

  // El token vive en el navegador; el backend decide qué puede ver.
  const [hasCustomerSession] = useState(() => Boolean(readCustomerToken()));
  const { services: servicesByCategory } = useCatalog();

  const categoryOfService = (slug: string): CategoryId | undefined => {
    for (const [categoryId, list] of Object.entries(servicesByCategory)) {
      if (list.some((s) => s.id === slug)) return categoryId as CategoryId;
    }
    return undefined;
  };

  const handleStartBooking = ({
    initialSelection,
    returnTarget: nextReturnTarget,
  }: StartBookingInput) => {
    setInitialCategory(initialSelection?.categoryId);
    setInitialServiceId(initialSelection?.serviceId);
    setReturnTarget(nextReturnTarget);
    setMode("wizard");
  };

  const handleExitBooking = () => {
    setMode("landing");
    setSelectedPublicCategory(null);
    setRestoreServicesViewKey(0);
    clearBookingContext();
  };

  const handleExitBookingToTarget = (target: BookingReturnTarget) => {
    setMode("landing");
    clearBookingContext();

    if (target.type === "catalog") {
      setSelectedPublicCategory(target.categoryId);
      setRestoreServicesViewKey((current) => current + 1);
      return;
    }

    if (target.type === "serviceDetail") {
      // ServiceDetail todavía no existe: fallback seguro al catálogo de la misma categoría.
      setSelectedPublicCategory(target.categoryId);
      setRestoreServicesViewKey((current) => current + 1);
      return;
    }

    setSelectedPublicCategory(null);
    setRestoreServicesViewKey(0);
  };

  if (mode === "wizard") {
    return (
      <BookingWizard
        initialCategory={initialCategory}
        initialServiceId={initialServiceId}
        onExit={handleExitBooking}
        onExitToTarget={handleExitBookingToTarget}
        returnTarget={returnTarget ?? { type: "landing" }}
      />
    );
  }

  return (
    <>
      {/* Para una clienta que ya vino, la reserva empieza por lo que ya
          se hizo, no por el catálogo. Sin historial no se muestra nada. */}
      <div className="pt-4">
        <KnownCustomerBlock
          enabled={hasCustomerSession}
          onRepeat={(service) =>
            handleStartBooking({
              initialSelection: {
                categoryId: categoryOfService(service.serviceSlug),
                serviceId: service.serviceSlug,
              },
              // Si vuelve atrás, vuelve al inicio: entró por su historial,
              // no navegando el catálogo.
              returnTarget: { type: "landing" },
            })
          }
        />
      </div>
      <Landing
        onSelectPublicCategory={setSelectedPublicCategory}
        onStart={handleStartBooking}
        restoreServicesViewKey={restoreServicesViewKey}
        selectedCategory={selectedPublicCategory}
      />
    </>
  );
}
