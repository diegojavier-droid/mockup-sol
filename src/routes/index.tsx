import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Landing } from "@/components/booking/Landing";
import { BookingWizard } from "@/components/booking/BookingWizard";
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
    <Landing
      onSelectPublicCategory={setSelectedPublicCategory}
      onStart={handleStartBooking}
      restoreServicesViewKey={restoreServicesViewKey}
      selectedCategory={selectedPublicCategory}
    />
  );
}
