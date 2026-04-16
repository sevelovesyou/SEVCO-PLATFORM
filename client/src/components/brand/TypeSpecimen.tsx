interface TypeSpecimenProps {
  name: string;
  family: "sans" | "serif" | "mono";
  cssVar: string;
  fallbackStack: string;
  usage: string;
  weights?: string;
  "data-testid"?: string;
}

export function TypeSpecimen({ name, family, cssVar, fallbackStack, usage, weights, ...rest }: TypeSpecimenProps) {
  const fontClass = family === "sans" ? "font-sans" : family === "serif" ? "font-serif" : "font-mono";
  const sample = family === "mono" ? "const sevco = 'design system';" : "The quick brown fox";
  const testId = rest["data-testid"] ?? `type-specimen-${family}`;

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3" data-testid={testId}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-semibold text-foreground">{name}</p>
        <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">{family}</p>
      </div>
      <p className={`${fontClass} text-3xl text-foreground leading-tight`} style={{ fontFamily: `var(${cssVar})` }}>
        {sample}
      </p>
      <p className={`${fontClass} text-sm text-muted-foreground`} style={{ fontFamily: `var(${cssVar})` }}>
        Aa Bb Cc 0123456789 — !? &amp; @
      </p>
      <div className="text-[11px] text-muted-foreground space-y-0.5 font-mono">
        <p>var({cssVar})</p>
        <p className="truncate">{fallbackStack}</p>
        {weights && <p>weights: {weights}</p>}
      </div>
      <p className="text-xs text-muted-foreground border-t border-border pt-2.5">{usage}</p>
    </div>
  );
}
