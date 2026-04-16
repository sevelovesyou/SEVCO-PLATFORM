import { useEffect, useState } from "react";

interface ColorSwatchProps {
  name: string;
  cssVar?: string;
  settingKey?: string;
  fallback?: string;
  usage?: string;
  platformSettings?: Record<string, string>;
  "data-testid"?: string;
}

export function ColorSwatch({ name, cssVar, settingKey, fallback, usage, platformSettings, ...rest }: ColorSwatchProps) {
  const [computed, setComputed] = useState<string>(fallback || "");

  useEffect(() => {
    if (settingKey && platformSettings?.[settingKey]) {
      setComputed(platformSettings[settingKey]);
      return;
    }
    if (!cssVar) return;
    const read = () => {
      const v = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
      if (v) setComputed(v);
      else if (fallback) setComputed(fallback);
    };
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style", "data-theme"] });
    return () => obs.disconnect();
  }, [cssVar, settingKey, fallback, platformSettings]);

  const hsl = computed || fallback || "0 0% 50%";
  const testId = rest["data-testid"] ?? `swatch-${name.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <div
      className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5"
      data-testid={testId}
    >
      <div
        className="h-10 w-10 rounded-md border border-border/60 shrink-0"
        style={{ backgroundColor: `hsl(${hsl})` }}
      />
      <div className="min-w-0">
        <p className="text-xs font-semibold text-foreground truncate">{name}</p>
        <p className="text-[10px] font-mono text-muted-foreground truncate">hsl({hsl})</p>
        {usage && <p className="text-[10px] text-muted-foreground truncate">{usage}</p>}
      </div>
    </div>
  );
}
