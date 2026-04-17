export const DEFAULT_DARK_VALUES: Record<string, string> = {
  "color.dark.primary": "225 65% 58%",
  "color.dark.background": "222 20% 8%",
  "color.dark.foreground": "210 20% 92%",
  "color.dark.accent": "222 14% 16%",
};

export function parseHslTriple(val: string): { h: number; s: number; l: number } | null {
  const parts = val.trim().split(/\s+/);
  if (parts.length !== 3) return null;
  const h = parseFloat(parts[0]);
  const s = parseFloat(parts[1]);
  const l = parseFloat(parts[2]);
  if (!Number.isFinite(h) || !Number.isFinite(s) || !Number.isFinite(l)) return null;
  return { h, s, l };
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function fmtHsl(h: number, s: number, l: number): string {
  return `${clamp(h, 0, 360)} ${clamp(s, 0, 100)}% ${clamp(l, 0, 100)}%`;
}

export type DerivedDarkSurfaces = {
  border: string;
  card: string;
  cardBorder: string;
  popover: string;
  popoverBorder: string;
  sidebar: string;
  sidebarBorder: string;
  sidebarAccent: string;
  muted: string;
  secondary: string;
  accent: string;
  input: string;
};

export function deriveDarkSurfaces(bgHsl: string): DerivedDarkSurfaces | null {
  const parsed = parseHslTriple(bgHsl);
  if (!parsed) return null;
  const { h, l } = parsed;
  const s = Math.min(parsed.s, 14);
  return {
    border: fmtHsl(h, s, l + 10),
    card: fmtHsl(h, s, l + 3),
    cardBorder: fmtHsl(h, s, l + 10),
    popover: fmtHsl(h, s, l + 3),
    popoverBorder: fmtHsl(h, s, l + 10),
    sidebar: fmtHsl(h, s, l + 2),
    sidebarBorder: fmtHsl(h, s, l + 10),
    sidebarAccent: fmtHsl(h, s, l + 7),
    muted: fmtHsl(h, s, l + 6),
    secondary: fmtHsl(h, s, l + 8),
    accent: fmtHsl(h, s, l + 8),
    input: fmtHsl(h, s, l + 14),
  };
}

export function derivedDarkSurfacesAsCssVars(bgHsl: string): Record<string, string> {
  const d = deriveDarkSurfaces(bgHsl);
  if (!d) return {};
  return {
    "--border": d.border,
    "--card": d.card,
    "--card-border": d.cardBorder,
    "--popover": d.popover,
    "--popover-border": d.popoverBorder,
    "--sidebar": d.sidebar,
    "--sidebar-border": d.sidebarBorder,
    "--sidebar-accent": d.sidebarAccent,
    "--muted": d.muted,
    "--secondary": d.secondary,
    "--accent": d.accent,
    "--input": d.input,
  };
}
