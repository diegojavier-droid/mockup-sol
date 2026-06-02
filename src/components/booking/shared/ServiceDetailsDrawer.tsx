import { categories, type CategoryId, type Service } from "@/lib/booking-data";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { getServiceImage } from "@/lib/service-images";

type ServiceDetailsDrawerProps = {
  service: Service | null;
  categoryId: CategoryId | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReserve: () => void;
};

const recommendedForByServiceId: Record<string, string> = {
  // Peluquería
  "corte-fem": "Si querés renovar tu estilo o mantener un corte cuidado y bien terminado.",
  brushing: "Para una ocasión especial o si querés salir con el pelo impecable.",
  "peinado-diario": "Reuniones, salidas o un look prolijo del día a día.",
  "peinado-social": "Eventos, fiestas y producciones especiales.",
  recogido: "Novias, madrinas, quince y eventos donde querés un peinado elegante.",
  "color-global": "Si buscás cambiar tu color o cubrir canas con un resultado parejo y luminoso.",
  "retoque-raiz": "Mantener tu color cuidado entre visitas, cuando ya creció la raíz.",
  tonalizacion: "Refrescar el color, neutralizar tonos o sumar brillo.",
  "bano-luz": "Si querés brillo, suavidad y un acabado sano sin cambiar tu color.",
  mechas: "Sumar luz, dimensión y un cambio visible sin perder tu base.",
  babylights: "Si buscás un degradé natural y sutil, con resultado luminoso.",
  balayage: "Un degradé prolijo, pintado a mano, con mantenimiento espaciado.",
  claritos: "Sumar reflejos suaves en zonas estratégicas del rostro.",
  alisado: "Si querés reducir el frizz y ganar manejabilidad por varios meses.",
  botox: "Devolver suavidad, brillo y control del frizz al cabello castigado.",
  nutricion: "Cabello seco o castigado que necesita nutrientes profundos.",
  hidratacion: "Recuperar elasticidad y brillo cuando sentís el pelo apagado.",
  reparacion: "Si tu pelo tiene fibras dañadas que querés restaurar.",
  reconstruccion: "Plan intensivo para cabellos muy castigados.",
  "post-color": "Sellar y proteger el color después de un servicio químico.",
  // Maquillaje
  "mk-social": "Eventos, fiestas y salidas donde querés un look prolijo y duradero.",
  "mk-novia": "Tu día, con prueba previa y maquillaje de larga duración.",
  "mk-evento": "Quinces, casamientos y producciones con terminación impecable.",
  // Uñas
  semi: "Una manicura prolija y duradera para el día a día.",
  softgel: "Si buscás más resistencia y largo sin descuidar lo natural.",
  nailart: "Sumar diseño y personalidad a tu manicura.",
  mani: "Una manicura clásica: cuidado, prolijidad y terminación.",
};

const recommendedForByCategory: Record<CategoryId, string> = {
  peluqueria: "Cabello cuidado con productos profesionales Itely Hairfashion.",
  maquillaje: "Maquillaje profesional para que te sientas cómoda y luminosa.",
  unas: "Manicura cuidada con terminación prolija y productos de calidad.",
};

export function ServiceDetailsDrawer({
  service,
  categoryId,
  open,
  onOpenChange,
  onReserve,
}: ServiceDetailsDrawerProps) {
  if (!service || !categoryId) {
    return null;
  }

  const category = categories.find((c) => c.id === categoryId);
  const recommendedRaw =
    recommendedForByServiceId[service.id] ?? recommendedForByCategory[categoryId];
  const recommendedSentence = recommendedRaw
    ? /^ideal\b/i.test(recommendedRaw)
      ? recommendedRaw
      : `Ideal ${recommendedRaw.charAt(0).toLowerCase()}${recommendedRaw.slice(1)}`
    : null;
  const imageSrc = getServiceImage(service.id, categoryId, service.imageUrl);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[88vh] bg-background">
        <DrawerHeader className="sr-only">
          <DrawerTitle>{service.name}</DrawerTitle>
          <DrawerDescription>{service.desc}</DrawerDescription>
        </DrawerHeader>

        <div className="flex max-h-[calc(88vh-1rem)] flex-col overflow-hidden">
          <div className="overflow-y-auto">
            {/* Bloque visual superior */}
            <div className="relative mx-4 mt-2 overflow-hidden rounded-2xl border border-border/60">
              <div className="h-32 w-full sm:h-36 md:h-32 lg:h-36">
                {imageSrc ? (
                  <img
                    src={imageSrc}
                    alt={service.name}
                    loading="lazy"
                    width={1280}
                    height={736}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="relative h-full w-full bg-gradient-to-br from-cream via-champagne/40 to-champagne-deep/20">
                    <span
                      aria-hidden="true"
                      className="absolute left-5 top-1/2 -translate-y-1/2 font-serif text-5xl italic text-champagne-deep/35"
                    >
                      Sol Mai
                    </span>
                    <span
                      aria-hidden="true"
                      className="absolute right-5 bottom-4 font-serif text-xs uppercase tracking-[0.28em] text-champagne-deep/50"
                    >
                      Peluquería boutique
                    </span>
                  </div>
                )}
              </div>
              {category ? (
                <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/90 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-foreground/70 backdrop-blur">
                  <span>{category.emoji}</span>
                  <span>{category.name}</span>
                </span>
              ) : null}
            </div>

            {/* Cuerpo */}
            <div className="px-5 pb-4 pt-4">
              <h2 className="font-serif text-2xl leading-tight text-foreground">{service.name}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {service.duration} <span className="text-champagne/80">·</span>{" "}
                <span className="font-serif text-foreground">Desde {service.price}</span>
              </p>

              <p className="mt-4 text-sm leading-relaxed text-foreground/80">{service.desc}</p>

              {recommendedSentence ? (
                <p className="mt-3 font-serif text-sm italic leading-relaxed text-foreground/75">
                  {recommendedSentence}
                </p>
              ) : null}
            </div>
          </div>

          <DrawerFooter className="border-t border-border/60 bg-card/60 px-5 pb-6 pt-4">
            <button
              type="button"
              onClick={onReserve}
              className="w-full rounded-full bg-primary px-6 py-3 font-serif text-base text-primary-foreground shadow-[0_18px_40px_-18px_rgba(80,55,30,0.5)] transition-all hover:translate-y-[-1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Reservar turno
            </button>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
