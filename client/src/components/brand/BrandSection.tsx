import { ReactNode } from "react";

interface BrandSectionProps {
  id: string;
  eyebrow?: string;
  title: string;
  intro?: string;
  children: ReactNode;
  "data-testid"?: string;
}

export function BrandSection({ id, eyebrow, title, intro, children, ...rest }: BrandSectionProps) {
  const testId = rest["data-testid"] ?? `brand-section-${id}`;
  return (
    <section id={id} className="space-y-6 scroll-mt-24" data-testid={testId}>
      <div className="space-y-2">
        {eyebrow && (
          <p className="text-[11px] font-semibold uppercase tracking-wider text-primary" data-testid={`eyebrow-${id}`}>
            {eyebrow}
          </p>
        )}
        <h2 className="text-2xl font-bold tracking-tight text-foreground" data-testid={`title-${id}`}>
          {title}
        </h2>
        {intro && (
          <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl" data-testid={`intro-${id}`}>
            {intro}
          </p>
        )}
      </div>
      <div className="space-y-6">{children}</div>
    </section>
  );
}
