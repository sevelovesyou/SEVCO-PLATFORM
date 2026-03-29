import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-20 text-center", className)} data-testid="empty-state">
      <div className="h-14 w-14 rounded-xl bg-muted flex items-center justify-center mb-4">
        <Icon className="h-7 w-7 text-muted-foreground/50" />
      </div>
      <h3 className="font-semibold text-base mb-1" data-testid="text-empty-title">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-4" data-testid="text-empty-description">{description}</p>
      {action && <div data-testid="empty-state-action">{action}</div>}
    </div>
  );
}
