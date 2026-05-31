interface Props {
  current: number;
  total: number;
  labels: string[];
}

export function Stepper({ current, total, labels }: Props) {
  const currentLabel = labels[current];

  return (
    <div
      className="w-full"
      aria-label={`Paso ${current + 1} de ${total}: ${currentLabel}`}
      aria-valuemax={total}
      aria-valuemin={1}
      aria-valuenow={current + 1}
      role="progressbar"
    >
      <div className="flex items-center justify-between gap-2" aria-hidden="true">
        {Array.from({ length: total }).map((_, i) => {
          const state = i < current ? "done" : i === current ? "current" : "todo";
          return (
            <div key={i} className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
              <span
                className={`flex h-5 w-5 flex-none items-center justify-center rounded-full font-serif text-[10px] transition-all duration-300 sm:h-6 sm:w-6 sm:text-[11px] ${
                  state === "done"
                    ? "bg-champagne-deep text-primary-foreground"
                    : state === "current"
                      ? "border border-champagne-deep bg-champagne text-foreground"
                      : "border border-border bg-card text-muted-foreground"
                }`}
              >
                {state === "done" ? "✓" : i + 1}
              </span>
              {i < total - 1 && (
                <span
                  className={`h-px flex-1 transition-all duration-500 ${
                    i < current ? "bg-champagne-deep/70" : "bg-border"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.16em] text-muted-foreground sm:mt-3 sm:text-[11px] sm:tracking-[0.2em]">
        <span>
          Paso {current + 1} de {total}
        </span>
        <span className="min-w-0 truncate text-right font-serif text-xs normal-case tracking-normal text-foreground/80 sm:text-sm">
          {currentLabel}
        </span>
      </div>
    </div>
  );
}
