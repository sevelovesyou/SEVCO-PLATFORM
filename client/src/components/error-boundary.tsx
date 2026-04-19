import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, ChevronDown, Copy, Check } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  componentStack: string | null;
  detailsOpen: boolean;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      componentStack: null,
      detailsOpen: false,
      copied: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught error:", error, errorInfo);
    this.setState({ componentStack: errorInfo.componentStack ?? null });
  }

  handleReload = () => {
    window.location.reload();
  };

  toggleDetails = () => {
    this.setState((s) => ({ detailsOpen: !s.detailsOpen }));
  };

  handleCopy = async () => {
    const { error, componentStack } = this.state;
    const text = [
      `Message: ${error?.message ?? "(no message)"}`,
      error?.stack ? `\nStack:\n${error.stack}` : "",
      componentStack ? `\nComponent Stack:${componentStack}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 1500);
    } catch {
      // ignore
    }
  };

  render() {
    if (this.state.hasError) {
      const { error, componentStack, detailsOpen, copied } = this.state;
      return (
        <div
          className="min-h-screen bg-[#0a0a12] flex items-center justify-center px-6 py-10"
          data-testid="error-boundary-fallback"
        >
          <div className="max-w-md w-full text-center space-y-6">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-red-900/30 border border-red-800/40 flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Something went wrong
              </h1>
              <p className="text-sm text-white/50 leading-relaxed">
                An unexpected error occurred. Try reloading the page to get back on track.
              </p>
            </div>
            <button
              onClick={this.handleReload}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-white/10 hover:bg-white/15 border border-white/10 text-white text-sm font-medium px-6 py-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a12]"
              data-testid="button-error-reload"
            >
              <RefreshCw className="h-4 w-4" />
              Reload Page
            </button>

            <div className="pt-2 text-left">
              <button
                onClick={this.toggleDetails}
                className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
                data-testid="button-error-details-toggle"
                aria-expanded={detailsOpen}
              >
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${detailsOpen ? "rotate-180" : ""}`}
                />
                {detailsOpen ? "Hide error details" : "Show error details"}
              </button>
              {detailsOpen && (
                <div
                  className="mt-2 rounded-md border border-white/10 bg-black/40 p-3 space-y-2"
                  data-testid="error-details-panel"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className="text-xs font-mono text-red-300 break-words select-text flex-1"
                      data-testid="text-error-message"
                    >
                      {error?.message ?? "(no message)"}
                    </p>
                    <button
                      onClick={this.handleCopy}
                      className="shrink-0 inline-flex items-center gap-1 rounded border border-white/10 bg-white/5 hover:bg-white/10 text-[11px] text-white/70 px-1.5 py-0.5"
                      data-testid="button-error-copy"
                      aria-label="Copy error details"
                    >
                      {copied ? (
                        <>
                          <Check className="h-3 w-3" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" /> Copy
                        </>
                      )}
                    </button>
                  </div>
                  {error?.stack && (
                    <pre
                      className="text-[11px] leading-snug font-mono text-white/50 whitespace-pre-wrap break-words max-h-48 overflow-auto select-text"
                      data-testid="text-error-stack"
                    >
                      {error.stack}
                    </pre>
                  )}
                  {componentStack && (
                    <pre
                      className="text-[11px] leading-snug font-mono text-white/40 whitespace-pre-wrap break-words max-h-48 overflow-auto select-text border-t border-white/5 pt-2"
                      data-testid="text-error-component-stack"
                    >
                      {componentStack}
                    </pre>
                  )}
                </div>
              )}
            </div>

            <p className="text-[11px] text-white/25 uppercase tracking-widest font-semibold">
              SEVCO
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
