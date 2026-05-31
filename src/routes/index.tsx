import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Landing } from "@/components/booking/Landing";
import { BookingWizard } from "@/components/booking/BookingWizard";
import type { CategoryId } from "@/lib/booking-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sol Mai Peluquería · Reservá tu turno" },
      {
        name: "description",
        content:
          "Peluquería en Santa Fe Capital. Reservá tu turno de peluquería, maquillaje o uñas en minutos.",
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
  const [mode, setMode] = useState<"landing" | "wizard">("landing");
  const [initialCategory, setInitialCategory] = useState<CategoryId | undefined>();
  const [initialServiceId, setInitialServiceId] = useState<string | undefined>();

  const handleStartBooking = (categoryId?: CategoryId, serviceId?: string) => {
    setInitialCategory(categoryId);
    setInitialServiceId(serviceId);
    setMode("wizard");
  };

  const handleExitBooking = () => {
    setMode("landing");
    setInitialCategory(undefined);
    setInitialServiceId(undefined);
  };

  if (mode === "wizard") {
    return (
      <BookingWizard
        initialCategory={initialCategory}
        initialServiceId={initialServiceId}
        onExit={handleExitBooking}
      />
    );
  }

  return <Landing onStart={handleStartBooking} />;
}
