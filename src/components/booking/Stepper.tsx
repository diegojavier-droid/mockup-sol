interface Props { current: number; total: number; labels: string[]; }

export function Stepper({ current, total, labels }: Props) {
  return (
    <div className="w-full">
      <div className="flex items-center gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-500 ${
              i <= current ? "bg-champagne-deep" : "bg-sand/60"
            }`}
          />
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        <span>Paso {current + 1} de {total}</span>
        <span className="text-foreground/70">{labels[current]}</span>
      </div>
    </div>
  );
}
