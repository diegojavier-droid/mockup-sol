import type { CategoryId, Extra } from "@/lib/booking-types";

export const extras: Record<CategoryId, Extra[]> = {
  peluqueria: [
    {
      id: "ampolla",
      name: "Ampolla nutritiva",
      durationMinutes: 5,
      price: "$3.500",
      priceAmount: 3500,
    },
    {
      id: "hidra-express",
      name: "Hidratación express",
      durationMinutes: 15,
      price: "$4.000",
      priceAmount: 4000,
    },
    {
      id: "corte-extra",
      name: "Corte adicional",
      durationMinutes: 30,
      price: "$8.000",
      priceAmount: 8000,
    },
    {
      id: "brushing-final",
      name: "Brushing final",
      durationMinutes: 25,
      price: "$6.000",
      priceAmount: 6000,
    },
    {
      id: "toni-extra",
      name: "Tonalización",
      durationMinutes: 35,
      price: "$10.000",
      priceAmount: 10000,
    },
    { id: "sellado", name: "Sellado", durationMinutes: 20, price: "$5.000", priceAmount: 5000 },
    {
      id: "masaje",
      name: "Masaje capilar",
      durationMinutes: 10,
      price: "$3.500",
      priceAmount: 3500,
    },
  ],
  maquillaje: [
    { id: "pestanas", name: "Pestañas", durationMinutes: 10, price: "$3.500", priceAmount: 3500 },
    {
      id: "prueba",
      name: "Prueba previa",
      durationMinutes: 60,
      price: "$12.000",
      priceAmount: 12000,
    },
    { id: "retoque", name: "Retoque", durationMinutes: 20, price: "$6.000", priceAmount: 6000 },
  ],
  unas: [
    {
      id: "nailart-extra",
      name: "Nail art",
      durationMinutes: 20,
      price: "$3.000",
      priceAmount: 3000,
    },
    {
      id: "retiro-extra",
      name: "Retiro previo",
      durationMinutes: 25,
      price: "$3.500",
      priceAmount: 3500,
    },
    { id: "refuerzo", name: "Refuerzo", durationMinutes: 15, price: "$4.000", priceAmount: 4000 },
  ],
  depilacion: [],
};
