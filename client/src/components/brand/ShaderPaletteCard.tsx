import { useRef } from "react";
import { ShaderBackground, PALETTE_PRESETS, type PaletteId } from "@/components/shader-background";

interface ShaderPaletteCardProps {
  paletteId: Exclude<PaletteId, "custom">;
  title: string;
  mood: string;
  useFor: string;
  "data-testid"?: string;
}

export function ShaderPaletteCard({ paletteId, title, mood, useFor, ...rest }: ShaderPaletteCardProps) {
  const mouseRef = useRef<[number, number]>([0.5, 0.5]);
  const palette = PALETTE_PRESETS[paletteId];
  const colors: [string, string, string, string, string] = [
    palette.base, palette.shadow, palette.mid, palette.highlight, palette.peak,
  ];
  const testId = rest["data-testid"] ?? `shader-palette-${paletteId}`;

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card" data-testid={testId}>
      <div className="relative h-40 bg-black">
        <ShaderBackground
          mouse={mouseRef}
          paletteColors={colors}
          isMobile
          timeScale={0.4}
          starDensity={0.3}
          vignetteStrength={0.7}
        />
        <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1.5 z-10">
          {colors.map((c) => (
            <div key={c} className="h-2 flex-1 rounded-sm border border-white/20" style={{ backgroundColor: c }} />
          ))}
        </div>
      </div>
      <div className="p-3 space-y-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-xs font-semibold text-foreground capitalize">{title}</p>
          <p className="text-[10px] font-mono text-muted-foreground">{paletteId}</p>
        </div>
        <p className="text-[11px] text-muted-foreground">{mood}</p>
        <p className="text-[10px] text-muted-foreground italic">Use for: {useFor}</p>
      </div>
    </div>
  );
}
