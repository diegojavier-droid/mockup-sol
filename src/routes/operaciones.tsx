import { createFileRoute, Link } from "@tanstack/react-router";
import { ClosedDaysBlocksPanel } from "@/components/booking/admin/ClosedDaysBlocksPanel";

export const Route = createFileRoute("/operaciones")({
  head: () => ({
    meta: [{ title: "Sol Mai · Operaciones" }],
  }),
  component: Operations,
});

function Operations() {
  return (
    <main className="min-h-svh bg-background px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Link
          to="/"
          className="mb-5 inline-flex rounded-full border border-border bg-card px-4 py-2 text-sm text-foreground transition-colors hover:border-champagne focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          ← Volver al sitio público
        </Link>
        <ClosedDaysBlocksPanel />
      </div>
    </main>
  );
}
