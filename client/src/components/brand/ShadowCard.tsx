interface ShadowCardProps {
  token: string;
  usage?: string;
  "data-testid"?: string;
}

export function ShadowCard({ token, usage, ...rest }: ShadowCardProps) {
  const testId = rest["data-testid"] ?? `shadow-card-${token}`;
  return (
    <div className="space-y-2" data-testid={testId}>
      <div
        className="h-24 rounded-lg bg-card border border-border flex items-center justify-center"
        style={{ boxShadow: `var(--${token})` }}
      >
        <p className="text-xs font-mono text-muted-foreground">--{token}</p>
      </div>
      {usage && <p className="text-[11px] text-muted-foreground text-center">{usage}</p>}
    </div>
  );
}
