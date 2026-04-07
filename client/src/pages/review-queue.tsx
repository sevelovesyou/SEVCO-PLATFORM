import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import DOMPurify from "dompurify";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { usePermission } from "@/hooks/use-permission";
import {
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Eye,
  Lock,
} from "lucide-react";
import type { Revision, Article } from "@shared/schema";
import { articleUrl } from "@/lib/wiki-urls";

interface RevisionWithArticle extends Revision {
  article: Article & { category?: { id: number; name: string; slug: string } | null };
}

function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["a", "b", "i", "em", "strong", "p", "br", "ul", "ol", "li", "h2", "h3", "blockquote", "span"],
    ALLOWED_ATTR: ["href", "class"],
    ALLOW_DATA_ATTR: false,
  });
}

function renderMarkdown(content: string): JSX.Element[] {
  const lines = content.split("\n");
  const elements: JSX.Element[] = [];

  lines.forEach((line, i) => {
    if (line.startsWith("## ")) {
      elements.push(
        <h2 key={i} className="text-base font-bold mt-3 mb-1">
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith("### ")) {
      elements.push(
        <h3 key={i} className="text-sm font-semibold mt-2 mb-0.5">
          {line.slice(4)}
        </h3>
      );
    } else if (line.startsWith("> ")) {
      elements.push(
        <blockquote
          key={i}
          className="border-l-2 border-primary/30 pl-2 italic text-muted-foreground my-1 text-xs"
        >
          {line.slice(2)}
        </blockquote>
      );
    } else if (line.startsWith("- ")) {
      elements.push(
        <ul key={i} className="list-disc list-inside text-xs my-0.5">
          <li>{line.slice(2)}</li>
        </ul>
      );
    } else if (line.trim() === "") {
      elements.push(<br key={i} />);
    } else {
      const withLinks = line.replace(
        /\[\[([^\]]+)\]\]/g,
        '<a href="/wiki/$1" class="text-primary underline decoration-primary/30 hover:decoration-primary/60">$1</a>'
      );
      const safe = sanitizeHtml(withLinks);
      elements.push(
        <p
          key={i}
          className="text-xs leading-relaxed"
          dangerouslySetInnerHTML={{ __html: safe }}
        />
      );
    }
  });

  return elements;
}

export default function ReviewQueue() {
  const { toast } = useToast();
  const { canAccessReviewQueue } = usePermission();

  const { data: pendingRevisions, isLoading: pendingLoading } = useQuery<RevisionWithArticle[]>({
    queryKey: ["/api/revisions", "pending"],
    enabled: canAccessReviewQueue,
  });

  const { data: allRevisions, isLoading: allLoading } = useQuery<RevisionWithArticle[]>({
    queryKey: ["/api/revisions"],
    enabled: canAccessReviewQueue,
  });

  const approveMutation = useMutation({
    mutationFn: async (id: number) =>
      apiRequest("PATCH", `/api/revisions/${id}`, { status: "approved" }),

    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: ["/api/revisions", "pending"] });
      await queryClient.cancelQueries({ queryKey: ["/api/revisions", "pending-count"] });
      const previousPending = queryClient.getQueryData<RevisionWithArticle[]>(["/api/revisions", "pending"]);
      const previousCount = queryClient.getQueryData<{ count: number }>(["/api/revisions", "pending-count"]);
      queryClient.setQueryData<RevisionWithArticle[]>(
        ["/api/revisions", "pending"],
        (old) => (old ?? []).filter((r) => r.id !== id)
      );
      queryClient.setQueryData<{ count: number }>(
        ["/api/revisions", "pending-count"],
        (old) => ({ count: Math.max(0, (old?.count ?? 1) - 1) })
      );
      return { previousPending, previousCount };
    },

    onError: (_err: unknown, _id: number, context: { previousPending?: RevisionWithArticle[]; previousCount?: { count: number } } | undefined) => {
      if (context?.previousPending) {
        queryClient.setQueryData(["/api/revisions", "pending"], context.previousPending);
      }
      if (context?.previousCount) {
        queryClient.setQueryData(["/api/revisions", "pending-count"], context.previousCount);
      }
      toast({ title: "Failed to approve", variant: "destructive" });
    },

    onSuccess: () => {
      toast({ title: "Revision approved and published" });
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/revisions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/revisions", "pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/revisions", "pending-count"] });
      queryClient.invalidateQueries({ queryKey: ["/api/articles"] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: number) =>
      apiRequest("PATCH", `/api/revisions/${id}`, { status: "rejected" }),

    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: ["/api/revisions", "pending"] });
      await queryClient.cancelQueries({ queryKey: ["/api/revisions", "pending-count"] });
      const previousPending = queryClient.getQueryData<RevisionWithArticle[]>(["/api/revisions", "pending"]);
      const previousCount = queryClient.getQueryData<{ count: number }>(["/api/revisions", "pending-count"]);
      queryClient.setQueryData<RevisionWithArticle[]>(
        ["/api/revisions", "pending"],
        (old) => (old ?? []).filter((r) => r.id !== id)
      );
      queryClient.setQueryData<{ count: number }>(
        ["/api/revisions", "pending-count"],
        (old) => ({ count: Math.max(0, (old?.count ?? 1) - 1) })
      );
      return { previousPending, previousCount };
    },

    onError: (_err: unknown, _id: number, context: { previousPending?: RevisionWithArticle[]; previousCount?: { count: number } } | undefined) => {
      if (context?.previousPending) {
        queryClient.setQueryData(["/api/revisions", "pending"], context.previousPending);
      }
      if (context?.previousCount) {
        queryClient.setQueryData(["/api/revisions", "pending-count"], context.previousCount);
      }
      toast({ title: "Failed to reject", variant: "destructive" });
    },

    onSuccess: () => {
      toast({ title: "Revision rejected" });
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/revisions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/revisions", "pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/revisions", "pending-count"] });
    },
  });

  if (!canAccessReviewQueue) {
    return (
      <div className="max-w-sm mx-auto p-4 md:p-6 mt-16">
        <div className="text-center mb-6">
          <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-3">
            <Lock className="h-6 w-6 text-destructive" />
          </div>
          <h1 className="text-xl font-bold mb-1">Access Restricted</h1>
          <p className="text-sm text-muted-foreground">
            The review queue is only accessible to Admin and Executive roles.
          </p>
        </div>
      </div>
    );
  }

  function RevisionCard({
    revision,
    showDiff = false,
  }: {
    revision: RevisionWithArticle;
    showDiff?: boolean;
  }) {
    const statusConfig: Record<string, { icon: typeof Clock; color: string; label: string }> = {
      pending: { icon: Clock, color: "text-yellow-600 dark:text-yellow-400", label: "Pending" },
      approved: { icon: CheckCircle, color: "text-green-600 dark:text-green-400", label: "Approved" },
      rejected: { icon: XCircle, color: "text-destructive", label: "Rejected" },
      flagged: { icon: AlertTriangle, color: "text-red-600", label: "Flagged" },
    };

    const config = statusConfig[revision.status] || statusConfig.pending;
    const StatusIcon = config.icon;

    const currentContent = revision.article?.content;
    const proposedContent = revision.content;
    const contentUnchanged =
      currentContent !== undefined && currentContent === proposedContent;
    const articleDeleted = !revision.article;

    return (
      <Card className="overflow-visible" data-testid={`card-revision-${revision.id}`}>
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div
              className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${
                revision.status === "pending"
                  ? "bg-yellow-500/10"
                  : revision.status === "approved"
                  ? "bg-green-500/10"
                  : "bg-destructive/10"
              }`}
            >
              <StatusIcon className={`h-4 w-4 ${config.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Link href={revision.article ? articleUrl(revision.article) : "/wiki"}>
                  <span
                    className="text-sm font-semibold text-primary hover:underline cursor-pointer"
                    data-testid={`link-revision-article-${revision.id}`}
                  >
                    {revision.article?.title || "Unknown Article"}
                  </span>
                </Link>
                <Badge
                  variant={
                    revision.status === "approved"
                      ? "default"
                      : revision.status === "rejected"
                      ? "destructive"
                      : "outline"
                  }
                  className="text-[10px]"
                >
                  {config.label}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                by <span className="font-medium">{revision.authorName}</span>
                {" · "}
                {new Date(revision.createdAt).toLocaleString()}
              </p>
              {revision.editSummary && (
                <p className="text-xs mt-1">{revision.editSummary}</p>
              )}
              {revision.reviewNote && (
                <p className="text-xs mt-1 italic text-muted-foreground border-l-2 border-primary/20 pl-2">
                  {revision.reviewNote}
                </p>
              )}
            </div>
          </div>
        </div>

        {showDiff && (
          <div className="border-t border-border" data-testid={`diff-panel-${revision.id}`}>
            {articleDeleted ? (
              <div className="px-4 py-3 text-xs text-muted-foreground italic">
                Original article no longer available.
              </div>
            ) : contentUnchanged ? (
              <div className="px-4 py-3 text-xs text-muted-foreground italic">
                No content changes — only metadata or infobox was modified.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
                <div className="p-4" data-testid={`panel-current-${revision.id}`}>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    Current Version
                  </p>
                  <div className="max-h-96 overflow-y-auto text-xs leading-relaxed space-y-1 prose prose-sm dark:prose-invert max-w-none">
                    {currentContent
                      ? currentContent.trimStart().startsWith("<")
                        ? (
                          <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(currentContent) }} />
                        )
                        : renderMarkdown(currentContent)
                      : <span className="italic text-muted-foreground">No existing content.</span>
                    }
                  </div>
                </div>
                <div className="p-4 bg-green-500/5 dark:bg-green-900/10" data-testid={`panel-proposed-${revision.id}`}>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    Proposed Version
                  </p>
                  <div className="max-h-96 overflow-y-auto text-xs leading-relaxed space-y-1 prose prose-sm dark:prose-invert max-w-none">
                    {proposedContent
                      ? proposedContent.trimStart().startsWith("<")
                        ? (
                          <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(proposedContent) }} />
                        )
                        : renderMarkdown(proposedContent)
                      : <span className="italic text-muted-foreground">No proposed content.</span>
                    }
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="px-4 pb-4 pt-2 flex items-center gap-1 flex-wrap border-t border-border mt-0">
          <Link href={revision.article ? articleUrl(revision.article) : "/wiki"}>
            <Button variant="ghost" size="sm" data-testid={`button-view-article-${revision.id}`}>
              <Eye className="h-3 w-3 mr-1" />
              View Article
            </Button>
          </Link>
          {revision.status === "pending" && (
            <>
              <Button
                size="sm"
                onClick={() => approveMutation.mutate(revision.id)}
                disabled={approveMutation.isPending}
                data-testid={`button-approve-${revision.id}`}
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => rejectMutation.mutate(revision.id)}
                disabled={rejectMutation.isPending}
                data-testid={`button-reject-${revision.id}`}
              >
                <XCircle className="h-3 w-3 mr-1" />
                Reject
              </Button>
            </>
          )}
        </div>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold">Review Queue</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Review and approve article revisions before they are published.
      </p>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending" data-testid="tab-pending">
            <Clock className="h-3 w-3 mr-1" />
            Pending ({pendingRevisions?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="all" data-testid="tab-all">
            <FileText className="h-3 w-3 mr-1" />
            All Revisions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4 flex flex-col gap-3">
          {pendingLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="p-4 overflow-visible">
                  <div className="flex items-start gap-3">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-5 w-1/2 mb-2" />
                      <Skeleton className="h-3 w-3/4" />
                    </div>
                  </div>
                </Card>
              ))
            : pendingRevisions?.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-10 w-10 mx-auto mb-3 text-green-500 opacity-50" />
                  <h3 className="text-sm font-medium mb-1">All caught up</h3>
                  <p className="text-xs text-muted-foreground">No pending revisions to review</p>
                </div>
              ) : (
                pendingRevisions?.map((rev) => (
                  <RevisionCard key={rev.id} revision={rev} showDiff={true} />
                ))
              )}
        </TabsContent>

        <TabsContent value="all" className="mt-4 flex flex-col gap-3">
          {allLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="p-4 overflow-visible">
                  <div className="flex items-start gap-3">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-5 w-1/2 mb-2" />
                      <Skeleton className="h-3 w-3/4" />
                    </div>
                  </div>
                </Card>
              ))
            : allRevisions?.map((rev) => (
                <RevisionCard key={rev.id} revision={rev} showDiff={false} />
              ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
