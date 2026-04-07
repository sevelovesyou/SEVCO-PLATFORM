import { useState, useEffect } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { PageHead } from "@/components/page-head";
import { articleUrl } from "@/lib/wiki-urls";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { AttachNotePanel } from "@/components/attach-note-panel";
import { StaffNotes } from "@/components/staff-notes";
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
  Archive,
  RefreshCw,
  Zap,
} from "lucide-react";
import type { Article, Citation, Revision } from "@shared/schema";
import { usePermission } from "@/hooks/use-permission";
import { useAuth } from "@/hooks/use-auth";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


interface ArticleDetail extends Article {
  citations: Citation[];
  revisions: Revision[];
  crosslinks: Array<{
    article: Article;
    relevanceScore: number;
    sharedKeywords: string[] | null;
  }>;
  category?: { name: string; slug: string } | null;
  sparkCount?: number;
  isSparkedByMe?: boolean;
}

export default function ArticleView() {
  const [, paramsTwo] = useRoute("/wiki/:categorySlug/:articleSlug");
  const [, paramsOne] = useRoute("/wiki/:slug");
  const slug = paramsTwo?.articleSlug ?? paramsOne?.slug;
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { canPublishArticles, canAccessArchive } = usePermission();
  const { user } = useAuth();
  const [sparkTooltip, setSparkTooltip] = useState(false);

  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);

  const { data: article, isLoading } = useQuery<ArticleDetail>({
    queryKey: ["/api/articles", slug],
    enabled: !!slug,
  });

  const { data: dailyQuota } = useQuery<{ given: number; limit: number; remaining: number }>({
    queryKey: ["/api/sparks/daily-quota"],
    enabled: !!user,
  });
  const dailyLimitReached = (dailyQuota?.remaining ?? 1) === 0;

  useEffect(() => {
    if (article?.category?.slug && paramsTwo === null && paramsOne !== null) {
      navigate(`/wiki/${article.category.slug}/${article.slug}`, { replace: true });
    }
  }, [article]);

  const { data: platformSettings = {} } = useQuery<Record<string, string>>({
    queryKey: ["/api/platform-settings"],
  });

  const wikiTagHsl = platformSettings["wiki.tagColor"];

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

  const archiveMutation = useMutation({
    mutationFn: (articleId: number) =>
      apiRequest("PATCH", `/api/articles/${articleId}/archive`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/articles"] });
      toast({ title: "Article archived", description: "It will no longer appear in the public wiki." });
      setArchiveDialogOpen(false);
      navigate("/wiki");
    },
    onError: () => {
      toast({ title: "Failed to archive article", variant: "destructive" });
    },
  });

  const republishMutation = useMutation({
    mutationFn: (articleId: number) =>
      apiRequest("PATCH", `/api/articles/${articleId}/republish`),
    onSuccess: async (res) => {
      const result = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/articles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/articles", slug] });
      const statusLabel = result.status === "published" ? "published" : "submitted for review";
      toast({ title: `Article ${statusLabel}` });
    },
    onError: () => {
      toast({ title: "Failed to republish article", variant: "destructive" });
    },
  });

  const sparkMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/articles/${slug}/spark`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/articles", slug] }),
    onError: (err: any) => {
      if (err?.status === 429 || err?.message?.includes("429")) {
        toast({ title: "Daily limit reached", description: "You can give 10 sparks per day." });
      } else if (err?.status === 403 || err?.message?.includes("403")) {
        toast({ title: "Cannot spark your own content", variant: "destructive" });
      }
    },
  });

  function handleSpark() {
    if (!user) return;
    if (article?.isSparkedByMe) {
      setSparkTooltip(true);
      setTimeout(() => setSparkTooltip(false), 2000);
      return;
    }
    sparkMutation.mutate();
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
        <Link href="/wiki">
          <Button variant="outline" data-testid="button-go-home">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Wiki
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
      <PageHead
        title={article.title}
        description={article.summary || `Read the article "${article.title}" on the SEVCO Wiki.`}
        ogType="article"
        ogUrl={`https://sevco.us/wiki/${article.category?.slug ? `${article.category.slug}/` : ""}${article.slug}`}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": article.title,
          "description": article.summary || undefined,
          "url": `https://sevco.us/wiki/${article.category?.slug ? `${article.category.slug}/` : ""}${article.slug}`,
          "dateModified": article.updatedAt,
          "publisher": {
            "@type": "Organization",
            "name": "SEVCO",
            "url": "https://sevco.us",
          },
        }}
      />
      <div className="flex items-center gap-2 mb-4">
        <Link href="/wiki">
          <Button variant="ghost" size="sm" data-testid="button-back">
            <ArrowLeft className="h-3 w-3 mr-1" />
            Wiki
          </Button>
        </Link>
        {article.category && (
          <>
            <span className="text-muted-foreground text-xs">/</span>
            <Link href={`/wiki/${article.category.slug}`}>
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
            {user?.id !== article.authorId && (
            <TooltipProvider>
              <Tooltip open={sparkTooltip}>
                <TooltipTrigger asChild>
                  <button
                    className={`flex items-center gap-1 text-xs transition-colors ${
                      article.isSparkedByMe
                        ? "text-amber-500"
                        : dailyLimitReached && !article.isSparkedByMe
                        ? "text-muted-foreground opacity-40 cursor-not-allowed"
                        : "text-muted-foreground hover:text-amber-500"
                    } ${!user ? "opacity-50 cursor-default" : ""}`}
                    onClick={handleSpark}
                    disabled={sparkMutation.isPending || (dailyLimitReached && !article.isSparkedByMe)}
                    data-testid="button-article-spark"
                  >
                    <Zap className={`h-3.5 w-3.5 ${article.isSparkedByMe ? "fill-amber-500 text-amber-500" : ""}`} />
                    <span data-testid="text-article-spark-count">{article.sparkCount ?? 0}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {article.isSparkedByMe ? "Already sparked!" : dailyLimitReached ? "Daily spark limit reached (10/day)" : "Spark this article"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/edit/${article.slug}`}>
            <Button size="sm" data-testid="button-edit-article">
              <Edit className="h-3 w-3 mr-1" />
              Edit
            </Button>
          </Link>
          {article.status === "archived" && canAccessArchive ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => republishMutation.mutate(article.id)}
              disabled={republishMutation.isPending}
              data-testid="button-republish-article"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              {canPublishArticles ? "Republish" : "Submit for Review"}
            </Button>
          ) : (
            canAccessArchive && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setArchiveDialogOpen(true)}
                data-testid="button-archive-article"
              >
                <Archive className="h-3 w-3 mr-1" />
                Archive
              </Button>
            )
          )}
        </div>
      </div>

      <Separator className="mb-6" />

      {article.status === "archived" && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
          <Archive className="h-4 w-4 shrink-0" />
          <span>This article is archived and not visible in the public wiki. Use the Republish button to restore it.</span>
        </div>
      )}

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
                    <Badge
                      key={tag}
                      variant="outline"
                      className="text-[10px]"
                      style={wikiTagHsl ? {
                        backgroundColor: `hsl(${wikiTagHsl} / 0.12)`,
                        borderColor: `hsl(${wikiTagHsl} / 0.3)`,
                        color: `hsl(${wikiTagHsl})`,
                      } : undefined}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              <CitationList citations={article.citations || []} />
              <CrosslinkPanel relatedArticles={article.crosslinks || []} />
              <StaffNotes resourceType="article" resourceId={article.id} />
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
          {!!(article.infoboxType && article.infoboxData) && (
            <WikiInfobox
              type={article.infoboxType!}
              data={article.infoboxData as Record<string, any>}
              title={article.title}
            />
          )}
          <AttachNotePanel resourceType="article" resourceId={article.id} />
        </div>
      </div>

      <Dialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive Article</DialogTitle>
            <DialogDescription>
              <strong>{article.title}</strong> will be hidden from the public wiki. You can unarchive it later from the archived articles list. No content will be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchiveDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => archiveMutation.mutate(article.id)}
              disabled={archiveMutation.isPending}
              data-testid="button-confirm-archive"
            >
              <Archive className="h-3 w-3 mr-1" />
              Archive Article
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
