export const DEFAULT_DARK_VALUES: Record<string, string> = {
  "color.dark.primary": "0 0% 96%",
  "color.dark.background": "0 0% 0%",
  "color.dark.foreground": "0 0% 96%",
  "color.dark.accent": "0 0% 14%",
};

export const DEFAULT_LIGHT_VALUES: Record<string, string> = {
  "color.light.primary": "0 0% 9%",
  "color.light.primaryFg": "0 0% 100%",
  "color.light.background": "0 0% 100%",
  "color.light.foreground": "0 0% 9%",
  "color.light.accent": "0 0% 93%",
  "color.light.accentFg": "0 0% 20%",
  "color.light.secondary": "0 0% 93%",
  "color.light.secondaryFg": "0 0% 20%",
  "color.light.card": "0 0% 100%",
  "color.light.cardFg": "0 0% 9%",
  "color.light.muted": "0 0% 95%",
  "color.light.mutedFg": "0 0% 40%",
  "color.light.border": "0 0% 89%",
  "color.light.destructive": "0 72% 51%",
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

export type DerivedSurfaces = {
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

export type DerivedDarkSurfaces = DerivedSurfaces;
export type DerivedLightSurfaces = DerivedSurfaces;

export function deriveDarkSurfaces(bgHsl: string): DerivedDarkSurfaces | null {
  const parsed = parseHslTriple(bgHsl);
  if (!parsed) return null;
  const { h, l } = parsed;
  const s = Math.min(parsed.s, 14);
  return {
    border: fmtHsl(h, s, l + 12),
    card: fmtHsl(h, s, l + 4),
    cardBorder: fmtHsl(h, s, l + 12),
    popover: fmtHsl(h, s, l + 4),
    popoverBorder: fmtHsl(h, s, l + 12),
    sidebar: fmtHsl(h, s, l + 3),
    sidebarBorder: fmtHsl(h, s, l + 12),
    sidebarAccent: fmtHsl(h, s, l + 9),
    muted: fmtHsl(h, s, l + 8),
    secondary: fmtHsl(h, s, l + 10),
    accent: fmtHsl(h, s, l + 10),
    input: fmtHsl(h, s, l + 16),
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

export function deriveLightSurfaces(bgHsl: string): DerivedLightSurfaces | null {
  const parsed = parseHslTriple(bgHsl);
  if (!parsed) return null;
  const { h, l } = parsed;
  const s = Math.min(parsed.s, 14);
  return {
    border: fmtHsl(h, s, l - 11),
    card: fmtHsl(h, s, l),
    cardBorder: fmtHsl(h, s, l - 9),
    popover: fmtHsl(h, s, l),
    popoverBorder: fmtHsl(h, s, l - 11),
    sidebar: fmtHsl(h, s, l - 4),
    sidebarBorder: fmtHsl(h, s, l - 11),
    sidebarAccent: fmtHsl(h, s, l - 8),
    muted: fmtHsl(h, s, l - 5),
    secondary: fmtHsl(h, s, l - 7),
    accent: fmtHsl(h, s, l - 7),
    input: fmtHsl(h, s, l - 15),
  };
}

export function derivedLightSurfacesAsCssVars(bgHsl: string): Record<string, string> {
  const d = deriveLightSurfaces(bgHsl);
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
