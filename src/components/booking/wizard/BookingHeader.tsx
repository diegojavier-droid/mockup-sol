export function BookingHeader({ onBack }: { onBack: () => void }) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 lg:px-8">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <span aria-hidden="true" className="text-base">
            ←
          </span>
          Volver
        </button>
        <div className="text-center">
          <p className="font-serif text-lg leading-none text-foreground">Sol Mai</p>
          <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            Peluquería · Santa Fe
          </p>
        </div>
        <div className="w-12" />
      </div>
    </header>
  );
}
