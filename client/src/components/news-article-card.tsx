import { formatDistanceToNow } from "date-fns";
import { BookOpen, ExternalLink, Bookmark, Sparkles, Loader2, ChevronDown, TrendingUp, Eye } from "lucide-react";
import { SiX } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { usePermission } from "@/hooks/use-permission";
import { useState, useEffect, useRef, useCallback } from "react";
import { WikifyDialog } from "@/components/wikify-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { resolveImageUrl } from "@/lib/resolve-image-url";
import { useToast } from "@/hooks/use-toast";
import type { UserNewsBookmark } from "@shared/schema";

export type NewsArticle = {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  source: string;
  imageUrl: string | null;
  aiImageUrl?: string | null;
  aiBlurb?: string;
  aiInsight?: string;
  grokSummary?: string;
  authorHandle?: string;
  likeCount?: number;
  retweetCount?: number;
  replyCount?: number;
  sourceType?: "x";
  category?: string;
};

const MAX_CONCURRENT_AI_IMAGES = 3;
let _concurrentAiImageRequests = 0;
const pendingAiImageLinks = new Set<string>();
type QueueEntry = { prompt: string; cacheKey: string; resolve: (url: string | null) => void };
const aiImageQueue: QueueEntry[] = [];

function isPlaceholderUrl(url: string | null | undefined): boolean {
  if (!url) return true;
  if (url.startsWith("data:image/svg+xml")) return true;
  if (url.includes("SEVCO News") || url.includes("sevco-placeholder")) return true;
  return false;
}

async function processAiImageQueue() {
  while (aiImageQueue.length > 0 && _concurrentAiImageRequests < MAX_CONCURRENT_AI_IMAGES) {
    const entry = aiImageQueue.shift()!;
    if (pendingAiImageLinks.has(entry.cacheKey)) {
      entry.resolve(null);
      continue;
    }
    pendingAiImageLinks.add(entry.cacheKey);
    _concurrentAiImageRequests++;
    (async () => {
      try {
        const res = await fetch("/api/news/grok/image/fallback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: entry.prompt, cacheKey: entry.cacheKey }),
        });
        if (res.ok) {
          const data = await res.json() as { url: string };
          entry.resolve(data.url ?? null);
        } else {
          entry.resolve(null);
        }
      } catch {
        entry.resolve(null);
      } finally {
        _concurrentAiImageRequests--;
        pendingAiImageLinks.delete(entry.cacheKey);
        processAiImageQueue();
      }
    })();
  }
}

function enqueueAiImageRequest(prompt: string, cacheKey: string): Promise<string | null> {
  return new Promise((resolve) => {
    aiImageQueue.push({ prompt, cacheKey, resolve });
    processAiImageQueue();
  });
}

function ImageSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={`w-full h-full bg-muted relative overflow-hidden ${className ?? ""}`}
      data-testid="img-skeleton"
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  );
}

const MAX_IMAGE_ERROR_RETRIES = 2;

function useCardAiImage(article: NewsArticle) {
  const [aiImageUrl, setAiImageUrl] = useState<string | null>(
    isPlaceholderUrl(article.aiImageUrl) ? null : (article.aiImageUrl ?? null)
  );
  const [errorRetries, setErrorRetries] = useState(0);
  const [sourceFailed, setSourceFailed] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const triggered = useRef(false);
  const articleLinkRef = useRef(article.link);

  const sourceImageUrl = isPlaceholderUrl(article.imageUrl) ? null : article.imageUrl;
  const hasNoImage = !sourceImageUrl && isPlaceholderUrl(article.aiImageUrl);

  useEffect(() => {
    if (articleLinkRef.current === article.link) return;
    articleLinkRef.current = article.link;
    triggered.current = false;
    setAiImageUrl(isPlaceholderUrl(article.aiImageUrl) ? null : (article.aiImageUrl ?? null));
    setErrorRetries(0);
    setSourceFailed(false);
  }, [article.link, article.aiImageUrl]);

  const requestAiImage = useCallback(async (prompt: string, cacheKey: string) => {
    setIsGenerating(true);
    try {
      const url = await enqueueAiImageRequest(prompt, cacheKey);
      if (url) setAiImageUrl(url);
    } finally {
      setIsGenerating(false);
    }
  }, []);

  useEffect(() => {
    if (triggered.current) return;
    if (!hasNoImage) return;
    triggered.current = true;
    const prompt = `editorial news thumbnail for: ${article.title}`;
    const timer = setTimeout(() => {
      requestAiImage(prompt, `card-${article.link}`);
    }, 150);
    return () => clearTimeout(timer);
  }, [hasNoImage, article.title, article.link, requestAiImage]);

  const handleImageError = useCallback(() => {
    setSourceFailed(true);
    if (errorRetries >= MAX_IMAGE_ERROR_RETRIES) return;
    const nextRetry = errorRetries + 1;
    setErrorRetries(nextRetry);
    setAiImageUrl(null);
    const prompt = `editorial news thumbnail for: ${article.title}`;
    requestAiImage(prompt, `card-err-${nextRetry}-${article.link}`);
  }, [errorRetries, article.title, article.link, requestAiImage]);

  const displayUrl = aiImageUrl || (sourceFailed ? null : sourceImageUrl);

  return { displayUrl, aiImageUrl, isGenerating, handleImageError };
}

function getGradientPlaceholder(title: string): string {
  const colors = [
    ["#1a1a2e", "#16213e"], ["#0f3460", "#1a1a2e"], ["#16213e", "#0f3460"],
    ["#1b1b2f", "#162447"], ["#2b2d42", "#1a1a2e"],
  ];
  const idx = title.length % colors.length;
  const [c1, c2] = colors[idx];
  const label = title.slice(0, 60).replace(/"/g, "'").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200' viewBox='0 0 400 200'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='${encodeURIComponent(c1)}'/%3E%3Cstop offset='1' stop-color='${encodeURIComponent(c2)}'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='200' fill='url(%23g)'/%3E%3Ctext x='200' y='85' text-anchor='middle' fill='%23ffffff22' font-size='11' font-family='sans-serif' font-weight='bold'%3EX%3C/text%3E%3Ctext x='200' y='115' text-anchor='middle' fill='%23ffffff70' font-size='12' font-family='sans-serif'%3E${encodeURIComponent(label)}%3C/text%3E%3C/svg%3E`;
}

const PLACEHOLDER_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200' viewBox='0 0 400 200'%3E%3Crect width='400' height='200' fill='%231a1a2e'/%3E%3C/svg%3E";

function formatRelativeTime(pubDate: string): string {
  try {
    const date = new Date(pubDate);
    if (isNaN(date.getTime())) return pubDate;
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return pubDate;
  }
}

function estimateReadTime(text: string): number {
  if (!text) return 1;
  const wordCount = text.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(wordCount / 200));
}


type CardVariant = "large" | "medium" | "small" | "compact";

interface NewsArticleCardProps {
  article: NewsArticle;
  variant?: CardVariant;
  accentColor?: string;
  categoryLabel?: string;
  onBookmarkToggle?: (bookmarked: boolean) => void;
  onCardClick?: () => void;
}

function WikifyButton({ onClick, testId }: { onClick: () => void; testId?: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClick(); }}
            data-testid={testId ?? "button-wikify"}
          >
            <BookOpen className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">Wikify 💫</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function BookmarkButton({ article, categoryLabel, size = "sm" }: { article: NewsArticle; categoryLabel?: string; size?: "sm" | "xs" }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { role } = usePermission();
  const isLoggedIn = !!role;
  const { data: bookmarks } = useQuery<UserNewsBookmark[]>({
    queryKey: ["/api/news/bookmarks"],
    enabled: isLoggedIn,
  });

  const existing = bookmarks?.find((b) => b.articleUrl === article.link);
  const isBookmarked = !!existing;

  const addMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/news/bookmarks", {
      articleUrl: article.link,
      articleTitle: article.title,
      articleImage: article.imageUrl,
      articleSource: article.source,
      articleCategory: categoryLabel,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/news/bookmarks"] });
      toast({ title: "Saved", description: "Article bookmarked." });
    },
    onError: () => toast({ title: "Error", description: "Failed to save bookmark.", variant: "destructive" }),
  });

  const removeMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/news/bookmarks/${existing?.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/news/bookmarks"] });
      toast({ title: "Removed", description: "Bookmark removed." });
    },
    onError: () => toast({ title: "Error", description: "Failed to remove bookmark.", variant: "destructive" }),
  });

  const isPending = addMutation.isPending || removeMutation.isPending;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={`${size === "xs" ? "h-5 w-5" : "h-6 w-6"} ${isBookmarked ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
            disabled={isPending}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!isLoggedIn) {
                toast({ title: "Sign in required", description: "Please sign in to save articles." });
                return;
              }
              if (isBookmarked) removeMutation.mutate();
              else addMutation.mutate();
            }}
            data-testid="button-bookmark"
          >
            <Bookmark className={`${size === "xs" ? "h-3 w-3" : "h-3.5 w-3.5"} ${isBookmarked ? "fill-current" : ""}`} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">{isBookmarked ? "Remove bookmark" : "Save for later"}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function SourceWithFavicon({ article }: { article: NewsArticle }) {
  const handle = article.authorHandle;
  return (
    <span className="flex items-center gap-1 min-w-0">
      <SiX className="h-2.5 w-2.5 shrink-0 opacity-60" />
      <span className="truncate">{handle || article.source}</span>
    </span>
  );
}

function ArticleSummaryPanel({ articleUrl }: { articleUrl: string }) {
  const [open, setOpen] = useState(false);

  const { data, isFetching, isError } = useQuery<{ summary: string }>({
    queryKey: ["/api/news/summary", articleUrl],
    queryFn: () => fetch(`/api/news/summary?url=${encodeURIComponent(articleUrl)}`).then((r) => {
      if (!r.ok) throw new Error("Failed to fetch summary");
      return r.json();
    }),
    enabled: open,
    staleTime: 60 * 60 * 1000,
    retry: false,
  });

  return (
    <div className="mt-1.5">
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((v) => !v); }}
        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors group"
        data-testid="button-summary-toggle"
      >
        <Sparkles className="h-2.5 w-2.5 text-primary/70" />
        <span className="font-medium">Summary ✦</span>
        <ChevronDown className={`h-2.5 w-2.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${open ? "max-h-40 opacity-100 mt-1.5" : "max-h-0 opacity-0"}`}
        data-testid="panel-summary"
      >
        {isFetching ? (
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground py-1">
            <Loader2 className="h-3 w-3 motion-safe:animate-spin" />
            <span>Generating summary…</span>
          </div>
        ) : isError ? (
          <p className="text-[10px] text-destructive py-1">Could not generate summary for this article.</p>
        ) : data?.summary ? (
          <div className="rounded-md bg-primary/5 border border-primary/10 px-2.5 py-2">
            <p className="text-[11px] text-foreground leading-relaxed">{data.summary}</p>
            <span className="inline-flex items-center gap-0.5 mt-1 text-[9px] text-primary/60 font-medium">
              <Sparkles className="h-2 w-2" />
              AI
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function GrokSummaryBadge({ summary }: { summary: string }) {
  return (
    <div className="mt-1.5 rounded-md bg-primary/5 border border-primary/10 px-2.5 py-1.5" data-testid="panel-grok-summary">
      <div className="flex items-start gap-1.5">
        <Sparkles className="h-2.5 w-2.5 text-primary/70 mt-0.5 shrink-0" />
        <p className="text-[11px] text-foreground leading-relaxed">{summary}</p>
      </div>
      <span className="inline-flex items-center gap-0.5 mt-0.5 text-[9px] text-primary/60 font-medium">
        Grok AI
      </span>
    </div>
  );
}

function AiInsightPanel({ article }: { article: NewsArticle }) {
  const [open, setOpen] = useState(false);

  if (!article.aiInsight && !article.aiBlurb) return null;

  return (
    <div className="mt-1.5">
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((v) => !v); }}
        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors group"
        data-testid="button-ai-insight-toggle"
      >
        <Sparkles className="h-2.5 w-2.5 text-primary/70" />
        <span className="font-medium">AI Insight</span>
        <ChevronDown className={`h-2.5 w-2.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${open ? "max-h-40 opacity-100 mt-1.5" : "max-h-0 opacity-0"}`}
        data-testid="panel-ai-insight"
      >
        <div className="rounded-md bg-primary/5 border border-primary/10 px-2.5 py-2">
          {article.aiBlurb && (
            <p className="text-[11px] text-foreground leading-relaxed">{article.aiBlurb}</p>
          )}
          {article.aiInsight && (
            <p className="text-[11px] text-primary/80 leading-relaxed mt-1 italic">{article.aiInsight}</p>
          )}
          <span className="inline-flex items-center gap-0.5 mt-1 text-[9px] text-primary/60 font-medium">
            <Sparkles className="h-2 w-2" />
            Grok AI
          </span>
        </div>
      </div>
    </div>
  );
}

export function NewsArticleCard({ article, variant = "medium", accentColor, categoryLabel, onCardClick }: NewsArticleCardProps) {
  const [wikifyOpen, setWikifyOpen] = useState(false);
  const { displayUrl, aiImageUrl: cardAiImageUrl, isGenerating, handleImageError } = useCardAiImage(article);

  const readTime = estimateReadTime((article.description || "") + " " + (article.title || ""));

  if (variant === "compact") {
    const handleCompactClick = (e: React.MouseEvent) => {
      if (onCardClick) { e.preventDefault(); onCardClick(); }
    };
    return (
      <>
        <div className="group flex flex-col relative" data-testid={`card-news-compact-${encodeURIComponent(article.link).slice(0, 30)}`}>
          <a
            href={article.link}
            target={onCardClick ? undefined : "_blank"}
            rel="noopener noreferrer"
            onClick={handleCompactClick}
            className="block rounded-xl border bg-card overflow-hidden hover:shadow-md hover:scale-[1.02] transition-all duration-200 cursor-pointer"
          >
            <div className="relative aspect-video overflow-hidden">
              {displayUrl ? (
                <img
                  src={resolveImageUrl(displayUrl)}
                  alt={article.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                  onError={handleImageError}
                />
              ) : (
                <img
                  src={getGradientPlaceholder(article.title)}
                  alt={article.title}
                  className="w-full h-full object-cover"
                />
              )}
              {isGenerating && !displayUrl && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/50" />
                </div>
              )}
              {(categoryLabel || article.source) && (
                <span
                  className="absolute top-2 left-2 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full truncate max-w-[120px]"
                  style={{ backgroundColor: accentColor ? `${accentColor}dd` : "rgba(0,0,0,0.7)" }}
                >
                  {categoryLabel || article.source}
                </span>
              )}
              <span className="absolute bottom-2 right-2 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded-full backdrop-blur-sm">
                ~{readTime} min
              </span>
            </div>
            <div className="p-2.5">
              <p className="text-sm font-serif font-semibold text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                {article.title}
              </p>
              <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                {article.source && <SourceWithFavicon article={article} />}
                {article.source && <span>·</span>}
                <span>{formatRelativeTime(article.pubDate)}</span>
              </div>
            </div>
          </a>
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <BookmarkButton article={article} categoryLabel={categoryLabel} size="xs" />
          </div>
          <div className="mt-1 flex justify-end px-1">
            <WikifyButton onClick={() => setWikifyOpen(true)} testId="button-wikify-compact" />
          </div>
        </div>
        <WikifyDialog open={wikifyOpen} onClose={() => setWikifyOpen(false)} article={article} />
      </>
    );
  }

  const imageHeightClass = variant === "large" ? "aspect-[16/7]" : "aspect-video";
  const showSummary = variant === "large" || variant === "medium";

  return (
    <>
      <div
        data-testid={`card-news-${variant}-${encodeURIComponent(article.link).slice(0, 30)}`}
        className="group relative rounded-xl border bg-card overflow-hidden hover:shadow-lg hover:scale-[1.01] transition-all duration-200 flex flex-col cursor-pointer"
        onClick={(e) => { if (onCardClick) { e.preventDefault(); onCardClick(); } }}
      >
        <div className={`relative overflow-hidden ${imageHeightClass}`}>
          <a href={article.link} target={onCardClick ? undefined : "_blank"} rel="noopener noreferrer" onClick={(e) => { if (onCardClick) e.preventDefault(); }}>
            {displayUrl ? (
              <img
                src={resolveImageUrl(displayUrl)}
                alt={article.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
                onError={handleImageError}
              />
            ) : (
              <img
                src={getGradientPlaceholder(article.title)}
                alt={article.title}
                className="w-full h-full object-cover"
              />
            )}
          </a>
          {isGenerating && !displayUrl && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/40" />
            </div>
          )}
          {(categoryLabel || accentColor) && (
            <span
              className="absolute top-2 left-2 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: accentColor ? `${accentColor}dd` : "rgba(0,0,0,0.7)" }}
            >
              {categoryLabel || article.source}
            </span>
          )}
          <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
            <span className="bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded-full backdrop-blur-sm flex items-center gap-1">
              <Eye className="h-2.5 w-2.5" />
              ~{readTime} min
            </span>
            {(article.aiImageUrl || cardAiImageUrl) && (
              <span className="bg-primary/80 text-white text-[9px] px-1.5 py-0.5 rounded-full backdrop-blur-sm flex items-center gap-0.5" data-testid="badge-ai-image">
                <Sparkles className="h-2.5 w-2.5" />
                AI
              </span>
            )}
          </div>
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <BookmarkButton article={article} categoryLabel={categoryLabel} />
          </div>
        </div>

        <div className="p-3 flex flex-col flex-1">
          <a href={article.link} target={onCardClick ? undefined : "_blank"} rel="noopener noreferrer" className="flex-1" onClick={(e) => { if (onCardClick) e.preventDefault(); }}>
            <h3 className={`font-serif font-semibold text-foreground leading-snug group-hover:text-primary transition-colors ${variant === "large" ? "text-base" : variant === "medium" ? "text-sm" : "text-sm"} line-clamp-3`}>
              {article.title}
            </h3>
            {(variant === "large" || variant === "medium") && article.description && (
              <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{article.description}</p>
            )}
            {variant === "small" && article.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{article.description}</p>
            )}
          </a>

          {article.grokSummary ? (
            <GrokSummaryBadge summary={article.grokSummary} />
          ) : (
            showSummary && <ArticleSummaryPanel articleUrl={article.link} />
          )}

          <AiInsightPanel article={article} />

          <div className="flex items-center justify-between mt-2">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1 min-w-0">
              {(categoryLabel || article.category) && (
                <>
                  <span className="text-[10px] font-semibold text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded-full shrink-0" data-testid="badge-category">
                    {categoryLabel || article.category}
                  </span>
                  <span className="shrink-0">·</span>
                </>
              )}
              {article.source && <SourceWithFavicon article={article} />}
              {article.source && <span className="shrink-0">·</span>}
              <span className="shrink-0">{formatRelativeTime(article.pubDate)}</span>
            </span>
            <div className="flex items-center gap-1 shrink-0">
              <WikifyButton onClick={() => setWikifyOpen(true)} />
              <a
                href={article.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                data-testid="link-read-more"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
      <WikifyDialog open={wikifyOpen} onClose={() => setWikifyOpen(false)} article={article} />
    </>
  );
}
