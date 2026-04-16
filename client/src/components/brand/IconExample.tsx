import type { ComponentType, CSSProperties } from "react";

type IconLike = ComponentType<{ className?: string; style?: CSSProperties; size?: number | string }>;

interface IconExampleProps {
  name: string;
  Icon: IconLike;
  importPath: string;
  sizes?: number[];
  "data-testid"?: string;
}

export function IconExample({ name, Icon, importPath, sizes = [16, 20, 24, 32], ...rest }: IconExampleProps) {
  const testId = rest["data-testid"] ?? `icon-example-${name.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3" data-testid={testId}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-semibold text-foreground">{name}</p>
        <p className="text-[10px] font-mono text-muted-foreground truncate">{importPath}</p>
      </div>
      <div className="flex items-end gap-5">
        {sizes.map((s) => (
          <div key={s} className="flex flex-col items-center gap-1">
            <Icon style={{ width: s, height: s }} className="text-foreground" />
            <p className="text-[10px] font-mono text-muted-foreground">{s}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
