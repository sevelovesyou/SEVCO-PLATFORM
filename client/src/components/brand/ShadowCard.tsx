import { useState } from "react";
import { CompareToggle, ThemePane } from "./ThemeCompare";

interface ShadowCardProps {
  token: string;
  usage?: string;
  "data-testid"?: string;
}

export function ShadowCard({ token, usage, ...rest }: ShadowCardProps) {
  const [compare, setCompare] = useState(false);
  const testId = rest["data-testid"] ?? `shadow-card-${token}`;

  const swatch = (
    <div
      className="h-24 rounded-lg bg-card border border-border flex items-center justify-center"
      style={{ boxShadow: `var(--${token})` }}
    >
      <p className="text-xs font-mono text-muted-foreground">--{token}</p>
    </div>
  );

  return (
    <div className="space-y-2" data-testid={testId}>
      {compare ? (
        <div className="grid grid-cols-2 gap-2">
          <ThemePane mode="light">{swatch}</ThemePane>
          <ThemePane mode="dark">{swatch}</ThemePane>
        </div>
      ) : (
        swatch
      )}
      <div className="flex items-center justify-between gap-2">
        {usage ? (
          <p className="text-[11px] text-muted-foreground truncate flex-1">{usage}</p>
        ) : (
          <span />
        )}
        <CompareToggle slug={`shadow-${token}`} compare={compare} onToggle={() => setCompare((v) => !v)} />
      </div>
    </div>
  );
}
