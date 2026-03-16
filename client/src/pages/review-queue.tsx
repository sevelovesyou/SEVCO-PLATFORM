import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
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

const STAFF_PASSCODE = "4434";

interface RevisionWithArticle extends Revision {
  article: Article;
}

export default function ReviewQueue() {
  const { toast } = useToast();
  const [authenticated, setAuthenticated] = useState(false);
  const [passcodeInput, setPasscodeInput] = useState("");
  const [passcodeError, setPasscodeError] = useState(false);

  const { data: pendingRevisions, isLoading: pendingLoading } = useQuery<RevisionWithArticle[]>({
    queryKey: ["/api/revisions", "pending"],
    enabled: authenticated,
  });

  const { data: allRevisions, isLoading: allLoading } = useQuery<RevisionWithArticle[]>({
    queryKey: ["/api/revisions"],
    enabled: authenticated,
  });

  const approveMutation = useMutation({
    mutationFn: (revisionId: number) =>
      apiRequest("PATCH", `/api/revisions/${revisionId}`, { status: "approved" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/revisions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/revisions", "pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/revisions", "pending-count"] });
      queryClient.invalidateQueries({ queryKey: ["/api/articles"] });
      toast({ title: "Revision approved and published" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (revisionId: number) =>
      apiRequest("PATCH", `/api/revisions/${revisionId}`, { status: "rejected" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/revisions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/revisions", "pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/revisions", "pending-count"] });
      toast({ title: "Revision rejected" });
    },
  });

  function handlePasscodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (passcodeInput === STAFF_PASSCODE) {
      setAuthenticated(true);
      setPasscodeError(false);
    } else {
      setPasscodeError(true);
      setPasscodeInput("");
    }
  }

  if (!authenticated) {
    return (
      <div className="max-w-sm mx-auto p-4 md:p-6 mt-16">
        <div className="text-center mb-6">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-xl font-bold mb-1">Staff Access Required</h1>
          <p className="text-sm text-muted-foreground">Enter your staff passcode to access the review queue.</p>
        </div>
        <form onSubmit={handlePasscodeSubmit} className="space-y-3">
          <Input
            type="password"
            placeholder="Enter passcode"
            value={passcodeInput}
            onChange={(e) => { setPasscodeInput(e.target.value); setPasscodeError(false); }}
            className={passcodeError ? "border-destructive" : ""}
            data-testid="input-passcode"
            autoFocus
          />
          {passcodeError && (
            <p className="text-xs text-destructive">Incorrect passcode. Please try again.</p>
          )}
          <Button type="submit" className="w-full" data-testid="button-passcode-submit">
            <Shield className="h-4 w-4 mr-2" />
            Access Review Queue
          </Button>
        </form>
      </div>
    );
  }

  function RevisionCard({ revision }: { revision: RevisionWithArticle }) {
    const statusConfig: Record<string, { icon: typeof Clock; color: string; label: string }> = {
      pending: { icon: Clock, color: "text-yellow-600 dark:text-yellow-400", label: "Pending" },
      approved: { icon: CheckCircle, color: "text-green-600 dark:text-green-400", label: "Approved" },
      rejected: { icon: XCircle, color: "text-destructive", label: "Rejected" },
      flagged: { icon: AlertTriangle, color: "text-orange-500", label: "Flagged" },
    };

    const config = statusConfig[revision.status] || statusConfig.pending;
    const StatusIcon = config.icon;

    return (
      <Card className="p-4 overflow-visible" data-testid={`card-revision-${revision.id}`}>
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
              <Link href={`/wiki/${revision.article?.slug}`}>
                <span className="text-sm font-semibold text-primary hover:underline cursor-pointer" data-testid={`link-revision-article-${revision.id}`}>
                  {revision.article?.title || "Unknown Article"}
                </span>
              </Link>
              <Badge
                variant={revision.status === "approved" ? "default" : revision.status === "rejected" ? "destructive" : "outline"}
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
            <div className="flex items-center gap-1 mt-2 flex-wrap">
              <Link href={`/wiki/${revision.article?.slug}`}>
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
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">Review Queue</h1>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setAuthenticated(false)}
          data-testid="button-lock-queue"
        >
          <Lock className="h-3 w-3 mr-1" />
          Lock
        </Button>
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

        <TabsContent value="pending" className="mt-4 space-y-3">
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
                pendingRevisions?.map((rev) => <RevisionCard key={rev.id} revision={rev} />)
              )}
        </TabsContent>

        <TabsContent value="all" className="mt-4 space-y-3">
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
            : allRevisions?.map((rev) => <RevisionCard key={rev.id} revision={rev} />)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
