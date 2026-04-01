import { useState, createContext, useContext } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import type { Components, ExtraProps } from "react-markdown";
import type { JSX } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Copy, Check, Play, X, Download, ChevronDown, ChevronRight } from "lucide-react";

type CodeProps = JSX.IntrinsicElements["code"] & ExtraProps;
type ImgProps = JSX.IntrinsicElements["img"] & ExtraProps;

type PreviewRequest = {
  language: string;
  code: string;
  srcdoc: string;
};

const PreviewContext = createContext<{
  onPreview: (req: PreviewRequest) => void;
}>({ onPreview: () => {} });

function buildSrcdoc(language: string, code: string) {
  if (language === "html") return code;
  if (language === "css") return `<style>${code}</style>`;
  if (language === "js" || language === "javascript") return `<script>${code}<\/script>`;
  return code;
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const { onPreview } = useContext(PreviewContext);
  const canPreview = ["html", "css", "js", "javascript"].includes(language);

  async function handleCopy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="relative my-2 group/code">
      <div className="flex items-center justify-between bg-zinc-800 rounded-t-lg px-3 py-1 text-[10px] text-zinc-400">
        <span>{language || "text"}</span>
        <div className="flex items-center gap-1">
          {canPreview && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-zinc-400 hover:text-white"
              onClick={() => onPreview({ language, code, srcdoc: buildSrcdoc(language, code) })}
              data-testid="button-code-preview"
              title="Preview"
            >
              <Play className="h-3 w-3" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-zinc-400 hover:text-white"
            onClick={handleCopy}
            data-testid="button-code-copy"
            title="Copy code"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          </Button>
        </div>
      </div>
      <SyntaxHighlighter
        style={oneDark}
        language={language || "text"}
        PreTag="div"
        className="!rounded-t-none rounded-b-lg text-xs overflow-x-auto"
        customStyle={{ margin: 0, borderRadius: "0 0 0.5rem 0.5rem", fontSize: "0.75rem" }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

function ImageWithLightbox({ src, alt }: { src?: string; alt?: string }) {
  const [open, setOpen] = useState(false);
  if (!src) return null;

  return (
    <>
      <span className="block my-2">
        <img
          src={src}
          alt={alt || ""}
          className="max-w-full rounded-xl border border-border/40 shadow-sm object-contain cursor-zoom-in hover:opacity-90 transition-opacity"
          style={{ maxWidth: "min(100%, 480px)" }}
          onClick={() => setOpen(true)}
          data-testid="img-ai-generated"
        />
      </span>
      {open && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
          data-testid="lightbox-overlay"
        >
          <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <img
              src={src}
              alt={alt || ""}
              className="max-w-full max-h-[85vh] rounded-lg object-contain"
              data-testid="lightbox-image"
            />
            <div className="absolute top-2 right-2 flex items-center gap-2">
              <a
                href={src}
                download
                className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-full p-2 transition-colors"
                data-testid="button-download-image"
                title="Download"
                onClick={(e) => e.stopPropagation()}
              >
                <Download className="h-4 w-4" />
              </a>
              <button
                className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-full p-2 transition-colors"
                onClick={() => setOpen(false)}
                data-testid="button-close-lightbox"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const components: Components = {
  img({ src, alt }: ImgProps) {
    return <ImageWithLightbox src={src} alt={alt} />;
  },
  code({ className, children, ...props }: CodeProps) {
    const match = /language-(\w+)/.exec(className || "");
    const childStr = String(children).replace(/\n$/, "");
    const isInline = !match && !childStr.includes("\n");
    if (isInline) {
      return (
        <code
          className="bg-black/10 dark:bg-white/10 rounded px-1 py-0.5 text-xs font-mono"
          {...props}
        >
          {children}
        </code>
      );
    }
    return <CodeBlock language={match ? match[1] : "text"} code={childStr} />;
  },
  p({ children }) {
    return <p className="mb-1 last:mb-0 text-sm leading-relaxed">{children}</p>;
  },
  ul({ children }) {
    return <ul className="list-disc list-inside mb-1 space-y-0.5 text-sm">{children}</ul>;
  },
  ol({ children }) {
    return <ol className="list-decimal list-inside mb-1 space-y-0.5 text-sm">{children}</ol>;
  },
  li({ children }) {
    return <li className="text-sm">{children}</li>;
  },
  h1({ children }) {
    return <h1 className="text-base font-bold mb-1 mt-2 first:mt-0">{children}</h1>;
  },
  h2({ children }) {
    return <h2 className="text-sm font-bold mb-1 mt-2 first:mt-0">{children}</h2>;
  },
  h3({ children }) {
    return <h3 className="text-sm font-semibold mb-0.5 mt-1.5 first:mt-0">{children}</h3>;
  },
  strong({ children }) {
    return <strong className="font-semibold">{children}</strong>;
  },
  em({ children }) {
    return <em className="italic">{children}</em>;
  },
  blockquote({ children }) {
    return (
      <blockquote className="border-l-2 border-current/30 pl-2 my-1 italic text-sm opacity-80">
        {children}
      </blockquote>
    );
  },
  hr() {
    return <hr className="my-2 border-current/20" />;
  },
  a({ href, children }) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80">
        {children}
      </a>
    );
  },
  table({ children }) {
    return (
      <div className="overflow-x-auto my-2">
        <table className="text-xs border-collapse w-full">{children}</table>
      </div>
    );
  },
  th({ children }) {
    return <th className="border border-current/20 px-2 py-1 font-semibold text-left bg-current/5">{children}</th>;
  },
  td({ children }) {
    return <td className="border border-current/20 px-2 py-1">{children}</td>;
  },
};

function ReasoningBlock({ reasoning }: { reasoning: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-2">
      <button
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setOpen(!open)}
        data-testid="button-toggle-reasoning"
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <span>Reasoning</span>
      </button>
      {open && (
        <div className="mt-1 p-2 bg-muted/50 rounded-lg text-xs text-muted-foreground whitespace-pre-wrap border">
          {reasoning}
        </div>
      )}
    </div>
  );
}

export function CodePreviewPanel({ preview, onClose }: { preview: PreviewRequest | null; onClose: () => void }) {
  if (!preview) return null;
  return (
    <div className="flex flex-col h-full border-l bg-background" data-testid="code-preview-panel">
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30 shrink-0">
        <span className="text-sm font-medium">Preview — {preview.language}</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose} data-testid="button-close-preview-panel">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <iframe
        sandbox="allow-scripts"
        srcDoc={preview.srcdoc}
        className="flex-1 w-full bg-white"
        title="Code preview"
        data-testid="iframe-code-preview"
      />
    </div>
  );
}

export function CodePreviewDrawer({ preview, onClose }: { preview: PreviewRequest | null; onClose: () => void }) {
  return (
    <Sheet open={!!preview} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="h-[50vh] p-0">
        <SheetHeader className="px-4 py-2 border-b">
          <SheetTitle className="text-sm">Preview — {preview?.language}</SheetTitle>
        </SheetHeader>
        {preview && (
          <iframe
            sandbox="allow-scripts"
            srcDoc={preview.srcdoc}
            className="w-full h-full bg-white"
            title="Code preview"
            data-testid="iframe-code-preview-drawer"
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

export function useCodePreview() {
  const [preview, setPreview] = useState<PreviewRequest | null>(null);
  return { preview, openPreview: setPreview, closePreview: () => setPreview(null) };
}

export function AiMessageRenderer({ content, onPreview }: { content: string; onPreview?: (req: PreviewRequest) => void }) {
  let reasoning = "";
  let cleanContent = content;

  const thinkMatch = content.match(/<think>([\s\S]*?)<\/think>/);
  if (thinkMatch) {
    reasoning = thinkMatch[1].trim();
    cleanContent = content.replace(/<think>[\s\S]*?<\/think>/, "").trim();
  }

  return (
    <PreviewContext.Provider value={{ onPreview: onPreview || (() => {}) }}>
      <div className="prose prose-sm dark:prose-invert max-w-none break-words">
        {reasoning && <ReasoningBlock reasoning={reasoning} />}
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
          {cleanContent}
        </ReactMarkdown>
      </div>
    </PreviewContext.Provider>
  );
}
