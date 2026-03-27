import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import type { Components, ExtraProps } from "react-markdown";
import type { JSX } from "react";

type CodeProps = JSX.IntrinsicElements["code"] & ExtraProps;

const components: Components = {
  code({ className, children, ...props }: CodeProps) {
    const match = /language-(\w+)/.exec(className || "");
    const childStr = String(children);
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
    return (
      <SyntaxHighlighter
        style={oneDark}
        language={match ? match[1] : "text"}
        PreTag="div"
        className="rounded-lg text-xs my-2 overflow-x-auto"
        customStyle={{ margin: 0, borderRadius: "0.5rem", fontSize: "0.75rem" }}
      >
        {childStr.replace(/\n$/, "")}
      </SyntaxHighlighter>
    );
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

export function AiMessageRenderer({ content }: { content: string }) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none break-words">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
