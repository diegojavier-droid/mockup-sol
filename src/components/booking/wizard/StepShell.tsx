import type { ReactNode } from "react";

export function StepShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby="booking-step-title">
      <h2 id="booking-step-title" className="font-serif text-3xl text-foreground lg:text-4xl">
        {title}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground lg:text-base">{subtitle}</p>
      <div className="mt-6 lg:mt-8">{children}</div>
    </section>
  );
}
