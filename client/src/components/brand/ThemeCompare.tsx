import { ReactNode } from "react";
import { SunMoon } from "lucide-react";

export function ThemePane({ mode, children, className = "" }: { mode: "light" | "dark"; children: ReactNode; className?: string }) {
  const themeClass = mode === "dark" ? "dark theme-dark" : "theme-light";
  return (
    <div
      className={`${themeClass} rounded-lg border border-border bg-background p-3 ${className}`}
      data-testid={`theme-pane-${mode}`}
    >
      <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
        {mode}
      </p>
      {children}
    </div>
  );
}

interface CompareToggleProps {
  compare: boolean;
  onToggle: () => void;
  slug: string;
}

export function CompareToggle({ compare, onToggle, slug }: CompareToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={compare}
      title={compare ? "Hide compare view" : "Compare light and dark"}
      className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors rounded-md px-1.5 py-0.5 hover-elevate"
      data-testid={`button-compare-${slug}`}
    >
      <SunMoon className="h-3 w-3" />
      {compare ? "Single" : "Compare"}
    </button>
  );
}
