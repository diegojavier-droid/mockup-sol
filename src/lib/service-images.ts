import type { CategoryId } from "@/lib/booking-data";

// Service-specific images
import corteFemeninoImg from "@/assets/services/corte-femenino.jpg";
import brushingImg from "@/assets/services/brushing.jpg";
import recogidoImg from "@/assets/services/recogido.jpg";
import colorGlobalImg from "@/assets/services/color-global.jpg";
import mechasImg from "@/assets/services/mechas.jpg";
import balayageImg from "@/assets/services/balayage.jpg";
import alisadoImg from "@/assets/services/alisado.jpg";
import tratamientoImg from "@/assets/services/tratamiento.jpg";
import maquillajeSocialImg from "@/assets/services/maquillaje-social.jpg";
import maquillajeFiestaImg from "@/assets/services/maquillaje-fiesta.jpg";
import maquillajeNoviaImg from "@/assets/services/maquillaje-novia.jpg";
import esmaltadoSemipermanenteImg from "@/assets/services/esmaltado-semipermanente.jpg";
import softGelImg from "@/assets/services/soft-gel.jpg";
import nailArtImg from "@/assets/services/nail-art.jpg";
import manicuraImg from "@/assets/services/manicura.jpg";

// Category fallback covers
import peluqueriaCover from "@/assets/sol-mai-peluqueria.jpg";
import maquillajeCover from "@/assets/sol-mai-maquillaje.jpg";
import unasCover from "@/assets/sol-mai-unas.jpg";

const byServiceId: Record<string, string> = {
  // Peluquería
  "corte-fem": corteFemeninoImg,
  brushing: brushingImg,
  "peinado-diario": brushingImg,
  "peinado-social": recogidoImg,
  recogido: recogidoImg,
  "color-global": colorGlobalImg,
  "retoque-raiz": colorGlobalImg,
  tonalizacion: colorGlobalImg,
  "bano-luz": colorGlobalImg,
  mechas: mechasImg,
  babylights: mechasImg,
  balayage: balayageImg,
  claritos: mechasImg,
  alisado: alisadoImg,
  botox: tratamientoImg,
  nutricion: tratamientoImg,
  hidratacion: tratamientoImg,
  reparacion: tratamientoImg,
  reconstruccion: tratamientoImg,
  "post-color": tratamientoImg,
  "corte-brushing": corteFemeninoImg,
  "color-nutricion": colorGlobalImg,
  "mechas-tonalizacion": mechasImg,
  "balayage-nutricion": balayageImg,
  "alisado-corte": alisadoImg,
  "alisado-nutricion": alisadoImg,
  "mechas-corte-brushing": mechasImg,
  "color-tratamiento": colorGlobalImg,
  // Maquillaje
  "mk-social": maquillajeSocialImg,
  "mk-fiesta": maquillajeFiestaImg,
  "mk-evento": maquillajeFiestaImg,
  "mk-novia": maquillajeNoviaImg,
  "mk-prueba": maquillajeSocialImg,
  // Uñas
  semi: esmaltadoSemipermanenteImg,
  kapping: esmaltadoSemipermanenteImg,
  softgel: softGelImg,
  nailart: nailArtImg,
  mani: manicuraImg,
  retiro: manicuraImg,
};

const byCategory: Record<CategoryId, string> = {
  peluqueria: peluqueriaCover,
  maquillaje: maquillajeCover,
  unas: unasCover,
  depilacion: maquillajeCover,
};

export function getServiceImage(
  serviceId: string,
  categoryId?: CategoryId | null,
  override?: string,
): string {
  if (override) return override;
  const direct = byServiceId[serviceId];
  if (direct) return direct;
  if (categoryId) return byCategory[categoryId];
  return peluqueriaCover;
}
