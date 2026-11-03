import type { ReactNode } from "react";

export function ChartCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-label={title}
      className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4"
    >
      <header className="flex flex-col gap-0.5">
        <h2 className="font-medium text-sm">{title}</h2>
        {description && (
          <p className="text-muted-foreground text-xs">{description}</p>
        )}
      </header>
      {children}
    </section>
  );
}
