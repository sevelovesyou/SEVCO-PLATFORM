import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface MotionDemoProps {
  name: string;
  durationVar: string;
  easingVar: string;
  description: string;
  "data-testid"?: string;
}

export function MotionDemo({ name, durationVar, easingVar, description, ...rest }: MotionDemoProps) {
  const [on, setOn] = useState(false);
  const [duration, setDuration] = useState("");
  const [easing, setEasing] = useState("");
  const testId = rest["data-testid"] ?? `motion-demo-${name.toLowerCase()}`;

  useEffect(() => {
    const read = () => {
      const styles = getComputedStyle(document.documentElement);
      setDuration(styles.getPropertyValue(durationVar).trim());
      setEasing(styles.getPropertyValue(easingVar).trim());
    };
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style", "data-theme"] });
    return () => obs.disconnect();
  }, [durationVar, easingVar]);

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3" data-testid={testId}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-semibold text-foreground">{name}</p>
        <p className="text-[10px] font-mono text-muted-foreground">{duration || "—"}</p>
      </div>
      <div className="h-12 rounded-md bg-muted/50 relative overflow-hidden">
        <div
          className="absolute top-1/2 -translate-y-1/2 h-6 w-6 rounded-md bg-primary"
          style={{
            transitionProperty: "transform",
            transitionDuration: `var(${durationVar})`,
            transitionTimingFunction: `var(${easingVar})`,
            transform: on ? "translateX(calc(100% * 8))" : "translateX(8px)",
          }}
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] font-mono text-muted-foreground space-y-0.5 min-w-0 flex-1">
          <p className="truncate">var({durationVar})</p>
          <p className="truncate">var({easingVar})</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs shrink-0"
          onClick={() => setOn((v) => !v)}
          data-testid={`button-motion-${name.toLowerCase()}`}
        >
          Play
        </Button>
      </div>
      <div className="text-[10px] font-mono text-muted-foreground border-t border-border pt-2">
        <p className="truncate">{easing || "—"}</p>
      </div>
      <p className="text-[11px] text-muted-foreground">{description}</p>
    </div>
  );
}
