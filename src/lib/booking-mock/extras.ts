import type { CategoryId, Extra } from "@/lib/booking-types";

export const extras: Record<CategoryId, Extra[]> = {
  peluqueria: [
    { id: "ampolla", name: "Ampolla nutritiva", price: "$3.500" },
    { id: "hidra-express", name: "Hidratación express", price: "$4.000" },
    { id: "corte-extra", name: "Corte adicional", price: "$8.000" },
    { id: "brushing-final", name: "Brushing final", price: "$6.000" },
    { id: "toni-extra", name: "Tonalización", price: "$10.000" },
    { id: "sellado", name: "Sellado", price: "$5.000" },
    { id: "masaje", name: "Masaje capilar", price: "$3.500" },
  ],
  maquillaje: [
    { id: "pestanas", name: "Pestañas", price: "$3.500" },
    { id: "prueba", name: "Prueba previa", price: "$12.000" },
    { id: "retoque", name: "Retoque", price: "$6.000" },
  ],
  unas: [
    { id: "nailart-extra", name: "Nail art", price: "$3.000" },
    { id: "retiro-extra", name: "Retiro previo", price: "$3.500" },
    { id: "refuerzo", name: "Refuerzo", price: "$4.000" },
  ],
};
