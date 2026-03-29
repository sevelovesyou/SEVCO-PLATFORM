import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="min-h-screen bg-[#0a0a12] flex items-center justify-center px-6"
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
