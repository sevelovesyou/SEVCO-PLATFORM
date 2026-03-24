import { useState } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { WikiInfobox } from "@/components/wiki-infobox";
import { CitationList } from "@/components/citation-badge";
import { CrosslinkPanel } from "@/components/crosslink-panel";
import { RevisionTimeline } from "@/components/revision-timeline";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Edit,
  Clock,
  FolderOpen,
  Tag,
  FileText,
  ArrowLeft,
  CheckCircle,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import type { Article, Citation, Revision } from "@shared/schema";

const STAFF_PASSCODE = "4434";

interface ArticleDetail extends Article {
  citations: Citation[];
  revisions: Revision[];
  crosslinks: Array<{
    article: Article;
    relevanceScore: number;
    sharedKeywords: string[] | null;
  }>;
  category?: { name: string; slug: string } | null;
}

export default function ArticleView() {
  const [, params] = useRoute("/wiki/:slug");
  const slug = params?.slug;
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletePasscode, setDeletePasscode] = useState("");
  const [deletePasscodeError, setDeletePasscodeError] = useState(false);

  const { data: article, isLoading } = useQuery<ArticleDetail>({
    queryKey: ["/api/articles", slug],
    enabled: !!slug,
  });

  const approveMutation = useMutation({
    mutationFn: (revisionId: number) =>
      apiRequest("PATCH", `/api/revisions/${revisionId}`, { status: "approved" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/articles", slug] });
      queryClient.invalidateQueries({ queryKey: ["/api/revisions", "pending-count"] });
      toast({ title: "Revision approved and published" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (revisionId: number) =>
      apiRequest("PATCH", `/api/revisions/${revisionId}`, { status: "rejected" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/articles", slug] });
      queryClient.invalidateQueries({ queryKey: ["/api/revisions", "pending-count"] });
      toast({ title: "Revision rejected" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (articleId: number) =>
      apiRequest("DELETE", `/api/articles/${articleId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/articles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Article deleted" });
      navigate("/");
    },
    onError: () => {
      toast({ title: "Failed to delete article", variant: "destructive" });
    },
  });

  function handleDeleteConfirm() {
    if (deletePasscode !== STAFF_PASSCODE) {
      setDeletePasscodeError(true);
      setDeletePasscode("");
      return;
    }
    if (article) {
      deleteMutation.mutate(article.id);
      setDeleteDialogOpen(false);
      setDeletePasscode("");
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-4">
        <Skeleton className="h-8 w-3/4" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-20" />
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-6 text-center py-12">
        <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h2 className="text-lg font-semibold mb-1">Article not found</h2>
        <p className="text-sm text-muted-foreground mb-4">
          The article you're looking for doesn't exist or has been removed.
        </p>
        <Link href="/">
          <Button variant="outline" data-testid="button-go-home">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Home
          </Button>
        </Link>
      </div>
    );
  }

  const statusBadgeVariant =
    article.status === "published" ? "default" : article.status === "draft" ? "secondary" : "outline";

  function renderContent(content: string) {
    const lines = content.split("\n");
    const elements: JSX.Element[] = [];

    lines.forEach((line, i) => {
      if (line.startsWith("## ")) {
        elements.push(<h2 key={i}>{line.slice(3)}</h2>);
      } else if (line.startsWith("### ")) {
        elements.push(<h3 key={i}>{line.slice(4)}</h3>);
      } else if (line.startsWith("> ")) {
        elements.push(<blockquote key={i}>{line.slice(2)}</blockquote>);
      } else if (line.startsWith("- ")) {
        elements.push(
          <ul key={i}>
            <li>{line.slice(2)}</li>
          </ul>
        );
      } else if (line.trim() === "") {
        elements.push(<br key={i} />);
      } else {
        const processed = line.replace(
          /\[\[([^\]]+)\]\]/g,
          '<a href="/wiki/$1" class="text-primary underline decoration-primary/30 hover:decoration-primary/60">$1</a>'
        );
        elements.push(<p key={i} dangerouslySetInnerHTML={{ __html: processed }} />);
      }
    });

    return elements;
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/">
          <Button variant="ghost" size="sm" data-testid="button-back">
            <ArrowLeft className="h-3 w-3 mr-1" />
            Home
          </Button>
        </Link>
        {article.category && (
          <>
            <span className="text-muted-foreground text-xs">/</span>
            <Link href={`/category/${article.category.slug}`}>
              <Button variant="ghost" size="sm" data-testid="button-category-breadcrumb">
                {article.category.name}
              </Button>
            </Link>
          </>
        )}
      </div>

      <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight mb-2" data-testid="text-article-title">
            {article.title}
          </h1>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={statusBadgeVariant} className="text-[10px]" data-testid="badge-status">
              {article.status === "published" && <CheckCircle className="h-3 w-3 mr-1" />}
              {article.status}
            </Badge>
            {article.category && (
              <Badge variant="secondary" className="text-[10px]">
                <FolderOpen className="h-3 w-3 mr-1" />
                {article.category.name}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {new Date(article.updatedAt).toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/edit/${article.slug}`}>
            <Button size="sm" data-testid="button-edit-article">
              <Edit className="h-3 w-3 mr-1" />
              Edit
            </Button>
          </Link>
          <Button
            size="sm"
            variant="outline"
            onClick={() => { setDeleteDialogOpen(true); setDeletePasscode(""); setDeletePasscodeError(false); }}
            data-testid="button-delete-article"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Delete
          </Button>
        </div>
      </div>

      <Separator className="mb-6" />

      <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-6">
        <div>
          <Tabs defaultValue="article" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="article" data-testid="tab-article">
                <FileText className="h-3 w-3 mr-1" />
                Article
              </TabsTrigger>
              <TabsTrigger value="revisions" data-testid="tab-revisions">
                <Clock className="h-3 w-3 mr-1" />
                History ({article.revisions?.length || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="article">
              {article.summary && (
                <Card className="p-3 mb-4 bg-muted/30 overflow-visible">
                  <p className="text-sm italic text-muted-foreground" data-testid="text-summary">
                    {article.summary}
                  </p>
                </Card>
              )}

              <div className="wiki-content" data-testid="text-article-content">
                {article.content.trimStart().startsWith("<") ? (
                  <div
                    className="prose prose-sm dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: article.content }}
                  />
                ) : (
                  renderContent(article.content)
                )}
              </div>

              {article.tags && article.tags.length > 0 && (
                <div className="flex items-center gap-2 mt-6 pt-4 border-t flex-wrap">
                  <Tag className="h-3 w-3 text-muted-foreground" />
                  {article.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-[10px]">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              <CitationList citations={article.citations || []} />
              <CrosslinkPanel relatedArticles={article.crosslinks || []} />
            </TabsContent>

            <TabsContent value="revisions">
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold">Version History</h2>
              </div>
              <RevisionTimeline
                revisions={article.revisions || []}
                isAdmin={true}
                onApprove={(id) => approveMutation.mutate(id)}
                onReject={(id) => rejectMutation.mutate(id)}
              />
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-3">
          {article.infoboxType && article.infoboxData && (
            <WikiInfobox
              type={article.infoboxType}
              data={article.infoboxData as Record<string, any>}
              title={article.title}
            />
          )}
        </div>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={(open) => { setDeleteDialogOpen(open); if (!open) { setDeletePasscode(""); setDeletePasscodeError(false); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Article</DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>{article.title}</strong> and all its revisions, citations, and crosslinks. Enter the staff passcode to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Input
              type="password"
              placeholder="Enter staff passcode"
              value={deletePasscode}
              onChange={(e) => { setDeletePasscode(e.target.value); setDeletePasscodeError(false); }}
              className={deletePasscodeError ? "border-destructive" : ""}
              data-testid="input-delete-passcode"
              onKeyDown={(e) => { if (e.key === "Enter") handleDeleteConfirm(); }}
            />
            {deletePasscodeError && (
              <p className="text-xs text-destructive">Incorrect passcode. Please try again.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} data-testid="button-cancel-delete">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending || !deletePasscode}
              data-testid="button-confirm-delete"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Delete Article
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
