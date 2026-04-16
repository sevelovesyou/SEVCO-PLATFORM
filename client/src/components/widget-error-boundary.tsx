import { Component, type ReactNode } from "react";
import { AlertCircle } from "lucide-react";

interface Props {
  children: ReactNode;
  label?: string;
}

interface State {
  hasError: boolean;
  message: string;
}

export class WidgetErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message ?? "Unknown error" };
  }

  componentDidCatch(error: Error) {
    console.error(`[WidgetErrorBoundary${this.props.label ? ` – ${this.props.label}` : ""}]`, error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-destructive/20 bg-destructive/5 text-sm text-destructive/80" data-testid="widget-error-fallback">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="text-xs">
            {this.props.label ? `${this.props.label} failed to load.` : "Widget failed to load."}
          </span>
        </div>
      );
    }
    return this.props.children;
  }
}
