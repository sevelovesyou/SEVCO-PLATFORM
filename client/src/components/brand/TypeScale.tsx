import { useEffect, useRef, useState } from "react";

const SCALE = [
  { label: "Display", className: "text-6xl font-black tracking-tight", sample: "Display" },
  { label: "H1", className: "text-5xl font-bold tracking-tight", sample: "Heading One" },
  { label: "H2", className: "text-3xl font-bold tracking-tight", sample: "Heading Two" },
  { label: "H3", className: "text-2xl font-bold tracking-tight", sample: "Heading Three" },
  { label: "H4", className: "text-xl font-semibold", sample: "Heading Four" },
  { label: "H5", className: "text-lg font-semibold", sample: "Heading Five" },
  { label: "H6", className: "text-base font-semibold", sample: "Heading Six" },
  { label: "Body Large", className: "text-lg leading-relaxed", sample: "The quick brown fox jumps over the lazy dog." },
  { label: "Body", className: "text-base leading-relaxed", sample: "The quick brown fox jumps over the lazy dog." },
  { label: "Caption", className: "text-xs text-muted-foreground", sample: "Caption text used for metadata and helpers." },
  { label: "Code", className: "text-sm font-mono bg-muted px-2 py-1 rounded", sample: "const x = 42;" },
];

interface TypeScaleProps {
  "data-testid"?: string;
}

export function TypeScale({ ...rest }: TypeScaleProps = {}) {
  const refs = useRef<(HTMLParagraphElement | null)[]>([]);
  const [metrics, setMetrics] = useState<string[]>(SCALE.map(() => ""));

  useEffect(() => {
    const m = refs.current.map((el) => {
      if (!el) return "";
      const cs = getComputedStyle(el);
      const size = parseFloat(cs.fontSize);
      const lh = parseFloat(cs.lineHeight);
      const weight = cs.fontWeight;
      return `${Math.round(size * 100) / 100}px / ${isNaN(lh) ? cs.lineHeight : Math.round(lh) + "px"} / ${weight}`;
    });
    setMetrics(m);
  }, []);

  const testId = rest["data-testid"] ?? "type-scale";

  return (
    <div className="rounded-xl border border-border bg-card divide-y divide-border" data-testid={testId}>
      {SCALE.map((row, i) => (
        <div key={row.label} className="grid grid-cols-1 md:grid-cols-[120px_1fr_220px] gap-3 px-4 py-3 items-baseline">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{row.label}</p>
          <p
            ref={(el) => { refs.current[i] = el; }}
            className={`${row.className} text-foreground`}
          >
            {row.sample}
          </p>
          <p className="text-[10px] font-mono text-muted-foreground truncate" data-testid={`type-metric-${row.label.toLowerCase().replace(/\s+/g, "-")}`}>
            {metrics[i] || "—"}
          </p>
        </div>
      ))}
    </div>
  );
}
