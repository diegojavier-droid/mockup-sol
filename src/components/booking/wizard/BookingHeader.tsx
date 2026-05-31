export function BookingHeader({ onBack }: { onBack: () => void }) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="relative mx-auto flex max-w-6xl items-center justify-between px-4 pb-2.5 pt-[calc(env(safe-area-inset-top)+0.625rem)] lg:px-8 lg:py-4">
        <button
          type="button"
          onClick={onBack}
          className="relative z-10 flex min-h-11 items-center gap-1.5 pr-3 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:gap-2 lg:text-sm"
        >
          <span aria-hidden="true" className="text-sm lg:text-base">
            ←
          </span>
          Volver
        </button>
        <div className="pointer-events-none absolute left-1/2 top-[calc(env(safe-area-inset-top)+0.5rem)] -translate-x-1/2 text-center lg:static lg:pointer-events-auto lg:translate-x-0">
          <p className="font-serif text-base leading-none text-foreground lg:text-lg">Sol Mai</p>
          <p className="mt-0.5 text-center text-[9px] uppercase tracking-[0.22em] text-muted-foreground lg:text-[10px] lg:tracking-[0.25em]">
            <span className="lg:hidden">Peluquería</span>
            <span className="hidden lg:inline">Peluquería · Santa Fe</span>
          </p>
        </div>
        <div className="w-12" />
      </div>
    </header>
  );
}
