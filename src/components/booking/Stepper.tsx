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
            <div key={i} className="flex flex-1 items-center gap-2">
              <span
                className={`flex h-6 w-6 flex-none items-center justify-center rounded-full font-serif text-[11px] transition-all duration-300 ${
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
      <div className="mt-3 flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
        <span>
          Paso {current + 1} de {total}
        </span>
        <span className="font-serif text-sm normal-case tracking-normal text-foreground/80">
          {currentLabel}
        </span>
      </div>
    </div>
  );
}
