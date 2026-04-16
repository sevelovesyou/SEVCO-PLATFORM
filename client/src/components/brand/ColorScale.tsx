import { ReactNode, useState } from "react";
import { CompareToggle, ThemePane } from "./ThemeCompare";

interface ColorScaleProps {
  title: string;
  children: ReactNode;
  "data-testid"?: string;
}

export function ColorScale({ title, children, ...rest }: ColorScaleProps) {
  const [compare, setCompare] = useState(false);
  const slug = title.toLowerCase().replace(/\s+/g, "-");
  const testId = rest["data-testid"] ?? `color-scale-${slug}`;

  const grid = (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
      {children}
    </div>
  );

  return (
    <div className="space-y-3" data-testid={testId}>
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        <CompareToggle slug={slug} compare={compare} onToggle={() => setCompare((v) => !v)} />
      </div>
      {compare ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ThemePane mode="light">{grid}</ThemePane>
          <ThemePane mode="dark">{grid}</ThemePane>
        </div>
      ) : (
        grid
      )}
    </div>
  );
}
