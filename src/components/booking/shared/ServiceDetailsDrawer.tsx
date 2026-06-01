import { categories, extras, type CategoryId, type Service } from "@/lib/booking-data";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

type ServiceDetailsDrawerProps = {
  service: Service | null;
  categoryId: CategoryId | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReserve: () => void;
};

const recommendedForByServiceId: Record<string, string> = {
  // Peluquería
  "corte-femenino":
    "Ideal si querés renovar tu estilo o mantener un corte cuidado y bien terminado.",
  brushing: "Perfecto para una ocasión especial o si querés salir con el pelo impecable.",
  "peinado-diario": "Pensado para reuniones, salidas o un look prolijo del día a día.",
  "peinado-social": "Recomendado para eventos, fiestas y producciones especiales.",
  recogido: "Para novias, madrinas, quince y eventos donde querés un peinado elegante.",
  "color-global":
    "Indicado si buscás cambiar tu color o cubrir canas con un resultado parejo y luminoso.",
  "retoque-raiz": "Para mantener tu color cuidado entre visitas, cuando ya creció la raíz.",
  tonalizacion: "Ideal para refrescar el color, neutralizar tonos o sumar brillo.",
  "bano-luz": "Recomendado si querés brillo, suavidad y un acabado sano sin cambiar tu color.",
  mechas: "Para sumar luz, dimensión y un cambio visible sin perder tu base.",
  babylights: "Perfecto si buscás un degradé natural y sutil, con resultado luminoso.",
  balayage: "Ideal para un degradé prolijo, pintado a mano, con mantenimiento espaciado.",
  claritos: "Para sumar reflejos suaves en zonas estratégicas del rostro.",
  alisado: "Recomendado si querés reducir el frizz y ganar manejabilidad por varios meses.",
  "botox-capilar": "Para devolver suavidad, brillo y control del frizz al cabello castigado.",
  "nutricion-capilar": "Ideal para cabello seco o castigado que necesita nutrientes profundos.",
  "hidratacion-profunda": "Para recuperar elasticidad y brillo cuando sentís el pelo apagado.",
  "reparacion-capilar": "Recomendado si tu pelo tiene fibras dañadas que querés restaurar.",
  reconstruccion: "Plan intensivo para cabellos muy castigados que necesitan reparación profunda.",
  "tratamiento-post-color":
    "Pensado para sellar y proteger el color después de un servicio químico.",
  // Maquillaje
  "maquillaje-social": "Para eventos, fiestas y salidas donde querés un look prolijo y duradero.",
  "maquillaje-novia": "Diseñado para tu día con prueba previa y maquillaje de larga duración.",
  "maquillaje-evento":
    "Recomendado para quinces, casamientos y producciones que necesitan terminación impecable.",
  // Uñas
  semipermanente: "Para una manicura prolija y duradera, ideal para el día a día.",
  "soft-gel": "Recomendado si buscás más resistencia y largo sin descuidar lo natural.",
  "nail-art": "Para sumar diseño y personalidad a tu manicura.",
  manicura: "Una manicura clásica de cuidado, prolijidad y terminación.",
};

const recommendedForByCategory: Record<CategoryId, string> = {
  peluqueria: "Pensado para cuidar tu cabello con productos profesionales Itely Hairfashion.",
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
  const categoryExtras = extras[categoryId]?.slice(0, 3) ?? [];
  const recommendedFor =
    recommendedForByServiceId[service.id] ?? recommendedForByCategory[categoryId];

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
              <div className="aspect-[16/9] w-full">
                {service.imageUrl ? (
                  <img
                    src={service.imageUrl}
                    alt={service.name}
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
              <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <span>{service.duration}</span>
                <span className="h-1 w-1 rounded-full bg-champagne/70" />
                <span className="font-serif text-base text-foreground">{service.price}</span>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-foreground/80">{service.desc}</p>

              <div className="mt-5">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Recomendado para
                </p>
                <p className="mt-2 text-sm leading-relaxed text-foreground/80">
                  {recommendedFor}
                </p>
              </div>

              {categoryExtras.length > 0 ? (
                <div className="mt-5">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    Podés sumar
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {categoryExtras.map((extra) => (
                      <span
                        key={extra.id}
                        className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-foreground/80"
                      >
                        <span className="font-serif text-sm text-foreground">{extra.name}</span>
                        <span className="h-1 w-1 rounded-full bg-champagne/70" />
                        <span className="text-muted-foreground">{extra.price}</span>
                      </span>
                    ))}
                  </div>
                </div>
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
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="w-full rounded-full border border-border bg-card px-6 py-3 font-serif text-base text-foreground transition-colors hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Volver a servicios
            </button>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
