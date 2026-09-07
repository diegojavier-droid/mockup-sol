import type { CategoryId, PersonalizationField } from "@/lib/booking-types";

export const personalizationFields: Record<CategoryId, PersonalizationField[]> = {
  peluqueria: [
    {
      id: "largo",
      label: "Largo del pelo",
      options: ["Corto", "Media melena", "Largo", "Muy largo"],
    },
    { id: "densidad", label: "Densidad", options: ["Fina", "Media", "Abundante"] },
    { id: "tipo", label: "Tipo de pelo", options: ["Liso", "Ondulado", "Rizado", "Crespo"] },
    {
      id: "quimicos",
      label: "Antecedentes químicos",
      options: ["Ninguno", "Color reciente", "Alisado previo", "Decoloración"],
    },
    { id: "alergias", label: "Alergias", options: ["No", "Sí, leves", "Sí, importantes"] },
    {
      id: "objetivo",
      label: "Objetivo buscado",
      options: ["Cambio de look", "Mantenimiento", "Brillo y cuidado", "Iluminar el rostro"],
    },
  ],
  maquillaje: [
    {
      id: "evento",
      label: "Tipo de evento",
      options: ["Social", "Cumpleaños", "Casamiento", "Sesión de fotos"],
    },
    { id: "horario", label: "Horario del evento", options: ["Mañana", "Tarde", "Noche"] },
    {
      id: "estilo",
      label: "Preferencia de estilo",
      options: ["Natural", "Glam", "Editorial", "Clásico"],
    },
    { id: "prueba", label: "¿Requiere prueba previa?", options: ["Sí", "No"] },
    // Es la misma pregunta, con las mismas opciones, que en peluquería:
    // una sola forma de preguntarlo en todo el salón. Los productos de
    // maquillaje van sobre la cara y cerca de los ojos, así que acá
    // importa por lo menos tanto como en el pelo.
    { id: "alergias", label: "Alergias", options: ["No", "Sí, leves", "Sí, importantes"] },
  ],
  unas: [
    {
      id: "estado",
      label: "Estado actual de las uñas",
      options: ["Naturales", "Con semipermanente", "Con soft gel", "Dañadas"],
    },
    {
      id: "terminacion",
      label: "Tipo de terminación",
      options: ["Brillante", "Mate", "Francesa", "Color liso"],
    },
  ],
  depilacion: [
    // Depilación es cera sobre la piel: si hay algo que preguntar antes
    // de empezar, es esto. Hasta ahora el área no preguntaba nada.
    { id: "alergias", label: "Alergias", options: ["No", "Sí, leves", "Sí, importantes"] },
  ],
};
