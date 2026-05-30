export type CategoryId = "peluqueria" | "maquillaje" | "unas";

export type Tag = "popular" | "combinado" | "tratamiento" | "color" | "evento";

export interface Service {
  id: string;
  name: string;
  desc: string;
  duration: string;
  price: string;
  tag?: Tag;
}

export interface Extra {
  id: string;
  name: string;
  price: string;
}

export const categories: { id: CategoryId; name: string; tagline: string; emoji: string }[] = [
  { id: "peluqueria", name: "Peluquería", tagline: "Corte, color y tratamientos", emoji: "✂" },
  {
    id: "maquillaje",
    name: "Maquillaje profesional",
    tagline: "Social, eventos y novias",
    emoji: "✿",
  },
  { id: "unas", name: "Uñas", tagline: "Semipermanente, soft gel y nail art", emoji: "✦" },
];

export const services: Record<CategoryId, Service[]> = {
  peluqueria: [
    {
      id: "corte-fem",
      name: "Corte femenino",
      desc: "Diseño personalizado según rostro y estilo.",
      duration: "45 min",
      price: "$18.000",
      tag: "popular",
    },
    {
      id: "brushing",
      name: "Brushing",
      desc: "Secado con forma y movimiento.",
      duration: "30 min",
      price: "$10.000",
    },
    {
      id: "peinado-diario",
      name: "Peinado diario",
      desc: "Look prolijo para el día a día.",
      duration: "30 min",
      price: "$11.000",
    },
    {
      id: "peinado-social",
      name: "Peinado social",
      desc: "Para reuniones y salidas especiales.",
      duration: "50 min",
      price: "$18.000",
    },
    {
      id: "recogido",
      name: "Recogido",
      desc: "Updo elegante para ocasiones.",
      duration: "1 h",
      price: "$22.000",
      tag: "evento",
    },
    {
      id: "color-global",
      name: "Color global",
      desc: "Color uniforme de raíz a puntas.",
      duration: "1 h 30",
      price: "$32.000",
      tag: "color",
    },
    {
      id: "retoque-raiz",
      name: "Retoque de raíz",
      desc: "Cobertura de crecimiento.",
      duration: "1 h",
      price: "$22.000",
      tag: "color",
    },
    {
      id: "tonalizacion",
      name: "Tonalización",
      desc: "Refresca y unifica el tono.",
      duration: "45 min",
      price: "$16.000",
      tag: "color",
    },
    {
      id: "bano-luz",
      name: "Baño de luz",
      desc: "Brillo y matiz instantáneo.",
      duration: "30 min",
      price: "$14.000",
    },
    {
      id: "mechas",
      name: "Mechas",
      desc: "Iluminación clásica.",
      duration: "2 h",
      price: "$42.000",
      tag: "color",
    },
    {
      id: "babylights",
      name: "Babylights",
      desc: "Mechas finas y naturales.",
      duration: "2 h 30",
      price: "$52.000",
      tag: "popular",
    },
    {
      id: "balayage",
      name: "Balayage",
      desc: "Degradé natural pintado a mano.",
      duration: "3 h",
      price: "$58.000",
      tag: "popular",
    },
    {
      id: "claritos",
      name: "Claritos",
      desc: "Reflejos suaves en zonas clave.",
      duration: "1 h 30",
      price: "$28.000",
    },
    {
      id: "alisado",
      name: "Alisado",
      desc: "Lacio duradero con cuidado capilar.",
      duration: "3 h",
      price: "$65.000",
    },
    {
      id: "botox",
      name: "Botox capilar",
      desc: "Suavidad, brillo y reducción del frizz.",
      duration: "1 h 30",
      price: "$28.000",
      tag: "tratamiento",
    },
    {
      id: "nutricion",
      name: "Nutrición capilar",
      desc: "Aporte de nutrientes profundos.",
      duration: "45 min",
      price: "$15.000",
      tag: "tratamiento",
    },
    {
      id: "hidratacion",
      name: "Hidratación profunda",
      desc: "Recupera elasticidad y brillo.",
      duration: "45 min",
      price: "$15.000",
      tag: "tratamiento",
    },
    {
      id: "reparacion",
      name: "Reparación capilar",
      desc: "Fibras dañadas restauradas.",
      duration: "1 h",
      price: "$20.000",
      tag: "tratamiento",
    },
    {
      id: "reconstruccion",
      name: "Reconstrucción",
      desc: "Plan intensivo para cabellos castigados.",
      duration: "1 h",
      price: "$22.000",
      tag: "tratamiento",
    },
    {
      id: "post-color",
      name: "Tratamiento post-color",
      desc: "Sella y prolonga el color.",
      duration: "30 min",
      price: "$12.000",
      tag: "tratamiento",
    },
    {
      id: "corte-brushing",
      name: "Corte + brushing",
      desc: "Corte con terminación profesional.",
      duration: "1 h 15",
      price: "$25.000",
      tag: "combinado",
    },
    {
      id: "color-nutricion",
      name: "Color + nutrición",
      desc: "Color con tratamiento incluido.",
      duration: "2 h",
      price: "$42.000",
      tag: "combinado",
    },
    {
      id: "mechas-tonalizacion",
      name: "Mechas + tonalización",
      desc: "Iluminación con matiz a medida.",
      duration: "2 h 30",
      price: "$52.000",
      tag: "combinado",
    },
    {
      id: "balayage-nutricion",
      name: "Balayage + nutrición",
      desc: "Degradé con tratamiento.",
      duration: "3 h 30",
      price: "$68.000",
      tag: "combinado",
    },
    {
      id: "alisado-corte",
      name: "Alisado + corte",
      desc: "Lacio con renovación de forma.",
      duration: "3 h 30",
      price: "$72.000",
      tag: "combinado",
    },
    {
      id: "alisado-nutricion",
      name: "Alisado + nutrición",
      desc: "Lacio con cuidado profundo.",
      duration: "3 h 30",
      price: "$72.000",
      tag: "combinado",
    },
    {
      id: "mechas-corte-brushing",
      name: "Mechas + corte + brushing",
      desc: "Pack completo de transformación.",
      duration: "3 h",
      price: "$62.000",
      tag: "combinado",
    },
    {
      id: "color-tratamiento",
      name: "Color + tratamiento reparador",
      desc: "Color con reparación intensiva.",
      duration: "2 h 30",
      price: "$48.000",
      tag: "combinado",
    },
  ],
  maquillaje: [
    {
      id: "mk-social",
      name: "Maquillaje social",
      desc: "Look natural luminoso.",
      duration: "45 min",
      price: "$18.000",
    },
    {
      id: "mk-fiesta",
      name: "Maquillaje de fiesta",
      desc: "Glamour y larga duración.",
      duration: "1 h",
      price: "$24.000",
      tag: "popular",
    },
    {
      id: "mk-evento",
      name: "Maquillaje para eventos",
      desc: "Para invitadas especiales.",
      duration: "1 h",
      price: "$26.000",
      tag: "evento",
    },
    {
      id: "mk-novia",
      name: "Maquillaje de novia",
      desc: "Diseño exclusivo para tu día.",
      duration: "1 h 30",
      price: "$45.000",
      tag: "evento",
    },
    {
      id: "mk-prueba",
      name: "Prueba de maquillaje",
      desc: "Ensayo previo personalizado.",
      duration: "1 h",
      price: "$20.000",
    },
  ],
  unas: [
    {
      id: "semi",
      name: "Esmaltado semipermanente",
      desc: "Color duradero y brillo.",
      duration: "45 min",
      price: "$10.000",
      tag: "popular",
    },
    {
      id: "kapping",
      name: "Kapping",
      desc: "Refuerzo sobre uña natural.",
      duration: "1 h",
      price: "$13.000",
    },
    {
      id: "softgel",
      name: "Soft gel",
      desc: "Extensión liviana y natural.",
      duration: "1 h 30",
      price: "$18.000",
      tag: "popular",
    },
    {
      id: "nailart",
      name: "Nail art",
      desc: "Diseños y detalles a mano.",
      duration: "30 min",
      price: "$5.000",
    },
    {
      id: "mani",
      name: "Manicura completa",
      desc: "Cutícula, forma y prolijidad.",
      duration: "45 min",
      price: "$8.000",
    },
    {
      id: "retiro",
      name: "Retiro y renovación",
      desc: "Quita previa y nuevo color.",
      duration: "1 h",
      price: "$12.000",
    },
  ],
};

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

export const personalizationFields: Record<
  CategoryId,
  { id: string; label: string; options: string[] }[]
> = {
  peluqueria: [
    {
      id: "largo",
      label: "Largo del cabello",
      options: ["Corto", "Media melena", "Largo", "Muy largo"],
    },
    { id: "densidad", label: "Densidad", options: ["Fina", "Media", "Abundante"] },
    { id: "tipo", label: "Tipo de cabello", options: ["Liso", "Ondulado", "Rizado", "Crespo"] },
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
    { id: "retiro", label: "¿Necesita retiro previo?", options: ["Sí", "No"] },
    { id: "nailart", label: "¿Desea nail art?", options: ["Sí", "No"] },
  ],
};

export const mockDates = (() => {
  const today = new Date();
  const out: { iso: string; label: string; weekday: string; day: string }[] = [];
  const weekdays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const months = [
    "ene",
    "feb",
    "mar",
    "abr",
    "may",
    "jun",
    "jul",
    "ago",
    "sep",
    "oct",
    "nov",
    "dic",
  ];
  for (let i = 1; i <= 10; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    out.push({
      iso: d.toISOString().slice(0, 10),
      label: `${d.getDate()} ${months[d.getMonth()]}`,
      weekday: weekdays[d.getDay()],
      day: String(d.getDate()),
    });
  }
  return out;
})();

export const mockTimes = ["09:30", "10:30", "11:30", "13:00", "14:30", "16:00", "17:30", "18:30"];
