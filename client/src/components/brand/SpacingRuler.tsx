import { useEffect, useState } from "react";

const SPACING_STEPS = [1, 2, 3, 4, 6, 8, 12, 16];

const RADII = [
  { name: "rounded-sm", className: "rounded-sm" },
  { name: "rounded-md", className: "rounded-md" },
  { name: "rounded-lg", className: "rounded-lg" },
  { name: "rounded-xl", className: "rounded-xl" },
  { name: "rounded-2xl", className: "rounded-2xl" },
  { name: "rounded-full", className: "rounded-full" },
];

interface SpacingRulerProps {
  "data-testid"?: string;
}

export function SpacingRuler({ ...rest }: SpacingRulerProps = {}) {
  const [basePx, setBasePx] = useState<number>(4);
  const [radius, setRadius] = useState<string>("");

  useEffect(() => {
    const root = document.documentElement;
    const styles = getComputedStyle(root);
    const fontSize = parseFloat(styles.fontSize) || 16;
    const spacingRaw = styles.getPropertyValue("--spacing").trim();
    let px = 4;
    if (spacingRaw.endsWith("rem")) px = parseFloat(spacingRaw) * fontSize;
    else if (spacingRaw.endsWith("px")) px = parseFloat(spacingRaw);
    setBasePx(px);
    setRadius(styles.getPropertyValue("--radius").trim());
  }, []);

  const testId = rest["data-testid"] ?? "spacing-ruler";

  return (
    <div className="space-y-6" data-testid={testId}>
      <div className="space-y-2">
        <p className="text-xs font-semibold text-foreground">
          Spacing scale (base: <span className="font-mono">var(--spacing) = {basePx}px</span>)
        </p>
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          {SPACING_STEPS.map((step) => {
            const px = step * basePx;
            return (
              <div key={step} className="flex items-center gap-3" data-testid={`spacing-${step}`}>
                <p className="text-[11px] font-mono text-muted-foreground w-20 shrink-0">
                  calc({step} * var(--spacing))
                </p>
                <div className="h-3 rounded-sm bg-primary/70" style={{ width: `calc(${step} * var(--spacing))` }} />
                <p className="text-[11px] font-mono text-muted-foreground">{px}px</p>
              </div>
            );
          })}
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-xs font-semibold text-foreground">
          Radius scale (base: <span className="font-mono">var(--radius) = {radius || "—"}</span>)
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {RADII.map((r) => (
            <div key={r.name} className="space-y-1.5 text-center" data-testid={`radius-${r.name}`}>
              <div className={`h-16 w-full bg-primary/15 border border-primary/30 ${r.className}`} />
              <p className="text-[10px] font-mono text-muted-foreground">{r.name}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
