import type { Category } from "@/lib/booking-types";

export const categories: Category[] = [
  { id: "peluqueria", name: "Peluquería", tagline: "Corte, color y tratamientos", emoji: "✂" },
  {
    id: "maquillaje",
    name: "Maquillaje",
    tagline: "Social, eventos y novias",
    emoji: "✿",
  },
  { id: "unas", name: "Uñas", tagline: "Semipermanente, soft gel y nail art", emoji: "✦" },
];
