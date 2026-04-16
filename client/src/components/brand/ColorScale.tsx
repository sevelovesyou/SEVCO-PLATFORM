import { ReactNode } from "react";

interface ColorScaleProps {
  title: string;
  children: ReactNode;
  "data-testid"?: string;
}

export function ColorScale({ title, children, ...rest }: ColorScaleProps) {
  const testId = rest["data-testid"] ?? `color-scale-${title.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div className="space-y-3" data-testid={testId}>
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {children}
      </div>
    </div>
  );
}
