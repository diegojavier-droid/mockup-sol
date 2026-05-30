import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Landing } from "@/components/booking/Landing";
import { BookingWizard } from "@/components/booking/BookingWizard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sol Mai Peluquería · Reservá tu turno" },
      { name: "description", content: "Peluquería boutique en Santa Fe Capital. Reservá tu turno de peluquería, maquillaje o uñas en minutos." },
      { property: "og:title", content: "Sol Mai Peluquería · Reservá tu turno" },
      { property: "og:description", content: "Belleza serena, a tu medida. Color y cuidado capilar con productos Itely Hairfashion." },
    ],
  }),
  component: Index,
});

function Index() {
  const [mode, setMode] = useState<"landing" | "wizard">("landing");

  if (mode === "wizard") return <BookingWizard onExit={() => setMode("landing")} />;
  return <Landing onStart={() => setMode("wizard")} onSeeServices={() => setMode("wizard")} />;
}
