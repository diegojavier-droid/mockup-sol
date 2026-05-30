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
          "Peluquería boutique en Santa Fe Capital. Reservá tu turno de peluquería, maquillaje o uñas en minutos.",
      },
      { property: "og:title", content: "Sol Mai Peluquería · Reservá tu turno" },
      {
        property: "og:description",
        content:
          "Belleza serena, a tu medida. Color y cuidado capilar con productos Itely Hairfashion.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const [mode, setMode] = useState<"landing" | "wizard">("landing");
  const [initialCategory, setInitialCategory] = useState<CategoryId | undefined>();

  const seeServices = () => {
    document.getElementById("servicios")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleStartBooking = (categoryId?: CategoryId) => {
    setInitialCategory(categoryId);
    setMode("wizard");
  };

  const handleExitBooking = () => {
    setMode("landing");
    setInitialCategory(undefined);
  };

  if (mode === "wizard") {
    return <BookingWizard initialCategory={initialCategory} onExit={handleExitBooking} />;
  }

  return <Landing onStart={handleStartBooking} onSeeServices={seeServices} />;
}
