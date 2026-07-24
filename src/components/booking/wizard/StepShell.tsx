import type { ReactNode } from "react";

export function StepShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby="booking-step-title">
      <h2
        id="booking-step-title"
        className="font-serif text-[1.7rem] leading-tight text-foreground sm:text-3xl lg:text-4xl"
      >
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-1.5 text-sm text-muted-foreground lg:mt-2 lg:text-base">{subtitle}</p>
      ) : null}
      <div className={subtitle ? "mt-5 lg:mt-8" : "mt-4 lg:mt-6"}>{children}</div>
    </section>
  );
}
