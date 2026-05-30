import type { Tag } from "@/lib/booking-data";

export const selectableCardClass =
  "transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export const tagStyle: Record<Tag, string> = {
  popular: "bg-champagne text-accent-foreground",
  combinado: "bg-blonde/60 text-foreground/80",
  tratamiento: "border border-border bg-cream text-foreground/70",
  color: "bg-wood/30 text-foreground/80",
  evento: "bg-sand text-foreground/80",
};
