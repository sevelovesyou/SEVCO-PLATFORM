import { formatDistanceToNow } from "date-fns";
import { BookOpen, ExternalLink, Bookmark, Sparkles, Loader2, ChevronDown, TrendingUp, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { usePermission } from "@/hooks/use-permission";
import { useState } from "react";
import { WikifyDialog } from "@/components/wikify-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
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
};

const PLACEHOLDER_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200' viewBox='0 0 400 200'%3E%3Crect width='400' height='200' fill='%23374151'/%3E%3Ctext x='200' y='105' text-anchor='middle' fill='%236B7280' font-size='14' font-family='sans-serif'%3ESEVCO News%3C/text%3E%3C/svg%3E";

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

function getFaviconUrl(url: string): string | null {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;
  } catch {
    return null;
  }
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
  const faviconUrl = getFaviconUrl(article.link);
  return (
    <span className="flex items-center gap-1 min-w-0">
      {faviconUrl && (
        <img
          src={faviconUrl}
          alt=""
          className="h-3 w-3 rounded-sm shrink-0 object-contain"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
        />
      )}
      <span className="truncate">{article.source}</span>
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
            <Loader2 className="h-3 w-3 animate-spin" />
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

export function NewsArticleCard({ article, variant = "medium", accentColor, categoryLabel, onCardClick }: NewsArticleCardProps) {
  const { role } = usePermission();
  const [wikifyOpen, setWikifyOpen] = useState(false);

  const isStaffPlus = role === "admin" || role === "executive" || role === "staff";
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
              <img
                src={article.aiImageUrl || article.imageUrl || PLACEHOLDER_IMAGE}
                alt={article.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER_IMAGE; }}
              />
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
              <p className="text-xs font-serif font-semibold text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
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
          {isStaffPlus && (
            <div className="mt-1 flex justify-end px-1">
              <WikifyButton onClick={() => setWikifyOpen(true)} testId="button-wikify-compact" />
            </div>
          )}
        </div>
        <WikifyDialog open={wikifyOpen} onClose={() => setWikifyOpen(false)} article={article} />
      </>
    );
  }

  const imageHeightClass = variant === "large" ? "aspect-[16/7]" : variant === "medium" ? "aspect-video" : "aspect-[4/3]";
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
            <img
              src={article.aiImageUrl || article.imageUrl || PLACEHOLDER_IMAGE}
              alt={article.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER_IMAGE; }}
            />
          </a>
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
            {article.aiImageUrl && (
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
            <h3 className={`font-serif font-semibold text-foreground leading-snug group-hover:text-primary transition-colors ${variant === "large" ? "text-base" : variant === "medium" ? "text-sm" : "text-xs"} line-clamp-3`}>
              {article.title}
            </h3>
            {(variant === "large" || variant === "medium") && article.description && (
              <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{article.description}</p>
            )}
          </a>

          {showSummary && <ArticleSummaryPanel articleUrl={article.link} />}

          <div className="flex items-center justify-between mt-2">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1 min-w-0">
              {article.source && <SourceWithFavicon article={article} />}
              {article.source && <span className="shrink-0">·</span>}
              <span className="shrink-0">{formatRelativeTime(article.pubDate)}</span>
            </span>
            <div className="flex items-center gap-1 shrink-0">
              {isStaffPlus && (
                <WikifyButton onClick={() => setWikifyOpen(true)} />
              )}
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
