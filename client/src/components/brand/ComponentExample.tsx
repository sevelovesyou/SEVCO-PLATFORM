import { ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Copy, ChevronDown, SunMoon } from "lucide-react";
import { ThemePane } from "./ThemeCompare";

interface ComponentExampleProps {
  title: string;
  code: string;
  children: ReactNode;
  "data-testid"?: string;
}

export function ComponentExample({ title, code, children, ...rest }: ComponentExampleProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [compare, setCompare] = useState(false);
  const slug = title.toLowerCase().replace(/\s+/g, "-");
  const testId = rest["data-testid"] ?? `component-example-${slug}`;

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const previewInner = (
    <div className="flex flex-wrap items-center gap-3">{children}</div>
  );

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden" data-testid={testId}>
      <div className={compare ? "flex flex-col" : "grid md:grid-cols-2"}>
        <div className={`p-5 bg-muted/20 ${compare ? "border-b" : "border-b md:border-b-0 md:border-r"} border-border min-h-[120px]`}>
          {compare ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <ThemePane mode="light">{previewInner}</ThemePane>
              <ThemePane mode="dark">{previewInner}</ThemePane>
            </div>
          ) : (
            previewInner
          )}
        </div>
        <div className="flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border">
            <p className="text-xs font-semibold text-foreground">{title}</p>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs gap-1"
                onClick={() => setCompare((v) => !v)}
                aria-pressed={compare}
                title={compare ? "Hide compare view" : "Compare light and dark"}
                data-testid={`button-compare-${slug}`}
              >
                <SunMoon className="h-3 w-3" />
                {compare ? "Single" : "Compare"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs gap-1"
                onClick={onCopy}
                data-testid={`button-copy-${slug}`}
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? "Copied" : "Copy"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs gap-1"
                onClick={() => setOpen((v) => !v)}
                data-testid={`button-toggle-${slug}`}
              >
                <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
                {open ? "Hide" : "Code"}
              </Button>
            </div>
          </div>
          {open && (
            <pre className="text-[11px] font-mono text-foreground bg-muted/30 p-3 overflow-x-auto whitespace-pre">
              <code>{code}</code>
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
