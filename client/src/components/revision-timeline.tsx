import type { Revision } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  FileEdit,
  Eye,
  RotateCcw,
} from "lucide-react";

interface RevisionTimelineProps {
  revisions: Revision[];
  onApprove?: (id: number) => void;
  onReject?: (id: number) => void;
  onPreview?: (revision: Revision) => void;
  onRestore?: (revision: Revision) => void;
  isAdmin?: boolean;
}

const statusConfig: Record<
  string,
  { icon: typeof Clock; label: string; variant: "secondary" | "destructive" | "default" | "outline" }
> = {
  pending: { icon: Clock, label: "Pending Review", variant: "outline" },
  approved: { icon: CheckCircle, label: "Approved", variant: "default" },
  rejected: { icon: XCircle, label: "Rejected", variant: "destructive" },
  flagged: { icon: AlertTriangle, label: "Flagged", variant: "outline" },
};

export function RevisionTimeline({
  revisions,
  onApprove,
  onReject,
  onPreview,
  onRestore,
  isAdmin = false,
}: RevisionTimelineProps) {
  if (!revisions || revisions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileEdit className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No revisions yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {revisions.map((rev, index) => {
        const config = statusConfig[rev.status] || statusConfig.pending;
        const StatusIcon = config.icon;

        return (
          <Card key={rev.id} className="p-3 overflow-visible" data-testid={`revision-item-${rev.id}`}>
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                    rev.status === "approved"
                      ? "bg-green-500/10 text-green-600 dark:text-green-400"
                      : rev.status === "rejected"
                      ? "bg-destructive/10 text-destructive"
                      : rev.status === "flagged"
                      ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  <StatusIcon className="h-4 w-4" />
                </div>
                {index < revisions.length - 1 && (
                  <div className="w-px h-full min-h-[16px] bg-border mt-1" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">{rev.authorName}</span>
                  <Badge variant={config.variant} className="text-[10px]">
                    {config.label}
                  </Badge>
                </div>
                {rev.editSummary && (
                  <p className="text-xs text-muted-foreground mt-1">{rev.editSummary}</p>
                )}
                {rev.reviewNote && (
                  <p className="text-xs text-muted-foreground mt-1 italic border-l-2 border-primary/20 pl-2">
                    {rev.reviewNote}
                  </p>
                )}
                <span className="text-[10px] text-muted-foreground mt-1 block">
                  {new Date(rev.createdAt).toLocaleString()}
                </span>
                <div className="flex items-center gap-1 mt-2 flex-wrap">
                  {onPreview && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onPreview(rev)}
                      data-testid={`button-preview-revision-${rev.id}`}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Preview
                    </Button>
                  )}
                  {isAdmin && rev.status === "pending" && onApprove && (
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => onApprove(rev.id)}
                      data-testid={`button-approve-revision-${rev.id}`}
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Approve
                    </Button>
                  )}
                  {isAdmin && rev.status === "pending" && onReject && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => onReject(rev.id)}
                      data-testid={`button-reject-revision-${rev.id}`}
                    >
                      <XCircle className="h-3 w-3 mr-1" />
                      Reject
                    </Button>
                  )}
                  {onRestore && rev.status === "approved" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onRestore(rev)}
                      data-testid={`button-restore-revision-${rev.id}`}
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Restore
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
