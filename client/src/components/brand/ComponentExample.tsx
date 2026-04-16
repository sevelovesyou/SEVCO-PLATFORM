import { ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Copy, ChevronDown } from "lucide-react";

interface ComponentExampleProps {
  title: string;
  code: string;
  children: ReactNode;
  "data-testid"?: string;
}

export function ComponentExample({ title, code, children, ...rest }: ComponentExampleProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const slug = title.toLowerCase().replace(/\s+/g, "-");
  const testId = rest["data-testid"] ?? `component-example-${slug}`;

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden" data-testid={testId}>
      <div className="grid md:grid-cols-2">
        <div className="p-5 flex flex-wrap items-center gap-3 bg-muted/20 border-b md:border-b-0 md:border-r border-border min-h-[120px]">
          {children}
        </div>
        <div className="flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border">
            <p className="text-xs font-semibold text-foreground">{title}</p>
            <div className="flex items-center gap-1">
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
