import { cn } from "@/lib/utils";

export function SelectedMark({ compact = false }: { compact?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex flex-none items-center justify-center rounded-full bg-champagne-deep text-primary-foreground",
        compact ? "h-5 w-5 text-[10px]" : "absolute right-4 top-4 h-6 w-6 text-[11px]",
      )}
    >
      ✓
    </span>
  );
}
