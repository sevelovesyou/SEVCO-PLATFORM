import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { resolveImageUrl } from "@/lib/resolve-image-url";
import { ExternalLink, Newspaper, RefreshCw, ChevronRight, ArrowLeft, Search, X, Zap, BookmarkCheck, Sparkles, Loader2 } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { NewsBentoGrid } from "@/components/news-bento-grid";
import { NewsArticleCard, type NewsArticle } from "@/components/news-article-card";
import { useEffect, useRef, useState, useCallback } from "react";
import type { NewsCategory, UserNewsBookmark } from "@shared/schema";
import type { EditorialArticle } from "@/components/news-editorial";
import { formatDistanceToNow } from "date-fns";
import { Link, useLocation } from "wouter";
import { SiX } from "react-icons/si";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePermission } from "@/hooks/use-permission";
import { useNewsAiSettings, useGrokSearch, useGrokImage, type NewsAiSettings } from "@/hooks/use-news-ai";
import { ArticleDetailModal } from "@/components/news-article-modal";
import { NewsAiSidebar } from "@/components/news-ai-sidebar";
import { DailyBriefingFab } from "@/components/news-daily-briefing";
import { TrendingUp as TrendingUpIcon, Hash } from "lucide-react";
import { LiveMarkets } from "@/components/live-markets";

interface TrendingTopic {
  rank: number;
  name: string;
  tweetCount: number | null;
}

interface TrendingNewsItem {
  id: string;
  headline: string;
  hook: string;
  summary: string;
  aiBlurb: string;
  aiInsight: string;
  timestamp: string;
  category: string;
  thumbnail: string | null;
  link: string;
  source: string;
}

function TrendingTopicsSidebar({ onTopicClick }: { onTopicClick: (topic: string) => void }) {
  const { data: trendingData, isLoading } = useQuery<{ topics: TrendingTopic[]; source: string }>({
    queryKey: ["/api/trending-topics"],
    staleTime: 5 * 60 * 1000,
  });

  const topics = trendingData?.topics ?? [];

  if (isLoading) {
    return (
      <div className="w-full lg:w-64 xl:w-72 shrink-0" data-testid="trending-topics-sidebar">
        <div className="sticky top-24 space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <SiX className="h-4 w-4" />
            <h3 className="text-sm font-bold">Trending on X</h3>
          </div>
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-8 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!topics.length) return null;

  return (
    <div className="w-full lg:w-64 xl:w-72 shrink-0" data-testid="trending-topics-sidebar">
      <div className="sticky top-24">
        <div className="flex items-center gap-2 mb-3">
          <SiX className="h-4 w-4" />
          <h3 className="text-sm font-bold">Trending on X</h3>
        </div>
        <div className="space-y-1 border rounded-xl p-2 bg-card">
          {topics.map((topic) => (
            <button
              key={topic.rank}
              onClick={() => onTopicClick(topic.name)}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors group flex items-start gap-2"
              data-testid={`trending-topic-${topic.rank}`}
            >
              <span className="text-[10px] text-muted-foreground font-mono mt-0.5 shrink-0">{topic.rank}</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors truncate flex items-center gap-1">
                  <Hash className="h-3 w-3 shrink-0 text-muted-foreground" />
                  {topic.name.replace(/^#/, "")}
                </p>
                {topic.tweetCount && (
                  <p className="text-[10px] text-muted-foreground">{topic.tweetCount.toLocaleString()} posts</p>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ArticleSkeleton() {
  return <Skeleton className="w-full h-48 rounded-xl" />;
}

function HeroSection({ article, aiSettings, onImageGenerated }: { article: NewsArticle; aiSettings?: NewsAiSettings; onImageGenerated?: (url: string) => void }) {
  const [aiImageUrl, setAiImageUrl] = useState<string | null>(null);
  const [heroSummary, setHeroSummary] = useState<{ summary: string; category: string } | null>(null);
  const [heroImgError, setHeroImgError] = useState(false);
  const imageMutation = useGrokImage();

  const imageTriggered = useRef(false);
  const summaryTriggered = useRef(false);

  useEffect(() => {
    imageTriggered.current = false;
    summaryTriggered.current = false;
    setAiImageUrl(null);
    setHeroSummary(null);
    setHeroImgError(false);
  }, [article.link]);

  const triggerHeroAiImage = useCallback((cacheKey: string) => {
    if (imageMutation.isPending) return;
    imageMutation.mutate(
      { prompt: `News illustration: ${article.title}`, cacheKey },
      {
        onSuccess: (data) => {
          setAiImageUrl(data.url);
          setHeroImgError(false);
          if (onImageGenerated) onImageGenerated(data.url);
        },
      }
    );
  }, [article.title, imageMutation, onImageGenerated]);

  useEffect(() => {
    if (imageTriggered.current) return;
    if (!aiSettings?.aiAvailable || !aiSettings?.imagesEnabled) return;
    if (article.imageUrl) return;
    if (aiImageUrl || imageMutation.isPending) return;
    imageTriggered.current = true;
    triggerHeroAiImage(`hero-${article.link}`);
  }, [article.link, article.imageUrl, aiSettings?.aiAvailable, aiSettings?.imagesEnabled, aiImageUrl, imageMutation.isPending, triggerHeroAiImage]);

  useEffect(() => {
    if (summaryTriggered.current) return;
    if (!aiSettings?.aiAvailable || !aiSettings?.summariesEnabled) return;
    summaryTriggered.current = true;
    fetch("/api/news/grok/summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: article.link, title: article.title }),
    })
      .then((r) => r.json())
      .then((data: { summary: string; category: string }) => {
        if (data.summary) setHeroSummary({ summary: data.summary, category: data.category || "" });
      })
      .catch(() => {});
  }, [article.link, aiSettings?.aiAvailable, aiSettings?.summariesEnabled]);

  let relativeTime = "";
  try {
    const d = new Date(article.pubDate);
    if (!isNaN(d.getTime())) relativeTime = formatDistanceToNow(d, { addSuffix: true });
  } catch {}

  const PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='400' viewBox='0 0 1200 400'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%231a1a2e'/%3E%3Cstop offset='1' stop-color='%230f3460'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='1200' height='400' fill='url(%23g)'/%3E%3C/svg%3E";
  const displayImage = aiImageUrl || article.imageUrl || PLACEHOLDER;

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border bg-card group" data-testid="news-hero">
      <div className="relative aspect-[21/7] md:aspect-[21/6] overflow-hidden">
        {displayImage && !heroImgError ? (
          <img
            src={resolveImageUrl(displayImage)}
            alt={article.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            onError={() => {
              setHeroImgError(true);
              if (aiSettings?.aiAvailable && aiSettings?.imagesEnabled && !imageMutation.isPending) {
                triggerHeroAiImage(`hero-err-${article.link}`);
              }
            }}
          />
        ) : (
          <div className="w-full h-full bg-muted relative overflow-hidden">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        {aiImageUrl && (
          <Badge className="absolute top-3 right-3 bg-primary/80 text-[10px] backdrop-blur-sm">
            <Sparkles className="h-2.5 w-2.5 mr-1" />AI Image
          </Badge>
        )}
        {(heroSummary?.category || article.category) && (
          <Badge className="absolute top-3 left-3 bg-white/20 text-white text-[10px] backdrop-blur-sm">
            {heroSummary?.category || article.category}
          </Badge>
        )}
        {article.aiInsight && (
          <Badge className="absolute top-12 left-3 bg-primary/80 text-white text-[10px] backdrop-blur-sm" data-testid="badge-ai-insight-hero">
            <Sparkles className="h-2.5 w-2.5 mr-1" />AI Insight
          </Badge>
        )}
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
          {article.source && (
            <span className="inline-block bg-white/20 backdrop-blur-sm text-white text-xs font-medium px-3 py-1 rounded-full mb-3">
              {article.source}
            </span>
          )}
          <h1 className="text-xl md:text-3xl font-serif font-bold text-white leading-tight line-clamp-3 mb-2">
            {article.title}
          </h1>
          {heroSummary?.summary ? (
            <p className="text-sm text-white/90 line-clamp-2 mb-3 max-w-3xl flex items-start gap-1.5">
              <Sparkles className="h-3.5 w-3.5 mt-0.5 shrink-0 text-white/70" />
              {heroSummary.summary}
            </p>
          ) : article.description ? (
            <p className="text-sm text-white/80 line-clamp-2 mb-3 max-w-3xl">{article.description}</p>
          ) : null}
          {article.aiInsight && (
            <p className="text-xs text-white/70 italic line-clamp-1 mb-2 max-w-2xl flex items-start gap-1.5">
              <Sparkles className="h-3 w-3 mt-0.5 shrink-0 text-white/50" />
              {article.aiInsight}
            </p>
          )}
          <div className="flex items-center gap-4">
            {relativeTime && <span className="text-xs text-white/60">{relativeTime}</span>}
            <a
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-white hover:text-white/80 transition-colors"
              data-testid="link-hero-read-more"
              onClick={(e) => e.stopPropagation()}
            >
              Read more <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function BreakingBanner() {
  const { data: breaking, isLoading } = useQuery<NewsArticle | null>({
    queryKey: ["/api/news/breaking"],
    staleTime: 5 * 60 * 1000,
    queryFn: () => fetch("/api/news/breaking").then((r) => r.json()),
  });

  if (isLoading || !breaking) return null;

  return (
    <div className="w-full bg-red-600 text-white px-4 py-2.5 flex items-center gap-3 rounded-xl" data-testid="breaking-news-banner">
      <Zap className="h-4 w-4 shrink-0 motion-safe:animate-pulse" />
      <Badge className="bg-white text-red-600 text-[10px] font-bold px-2 py-0.5 shrink-0 hover:bg-white">BREAKING</Badge>
      {breaking.source && <span className="text-xs font-semibold shrink-0 opacity-90">{breaking.source}</span>}
      <p className="text-sm font-medium line-clamp-1 flex-1">{breaking.title}</p>
      <a
        href={breaking.link}
        target="_blank"
        rel="noopener noreferrer"
        className="text-white hover:text-white/80 shrink-0 transition-colors"
        data-testid="link-breaking-news"
      >
        <ChevronRight className="h-4 w-4" />
      </a>
    </div>
  );
}

function TrendingHashtags({ primaryCategoryName, onHashtagClick, currentSearch }: { primaryCategoryName?: string; onHashtagClick: (tag: string) => void; currentSearch: string }) {
  const { data: xFeedData } = useQuery<NewsArticle[]>({
    queryKey: ["/api/news/x-feed", primaryCategoryName],
    queryFn: () => fetch(`/api/news/x-feed?category=${encodeURIComponent(primaryCategoryName ?? "")}&limit=20`).then((r) => r.json()),
    enabled: !!primaryCategoryName,
    staleTime: 10 * 60 * 1000,
  });

  const tags = useCallback(() => {
    if (!xFeedData) return [];
    const allText = xFeedData.map((a) => (a.description || "") + " " + (a.title || "")).join(" ");
    const matches = allText.match(/#\w+/g) ?? [];
    const freq: Record<string, number> = {};
    matches.forEach((tag) => {
      const t = tag.toLowerCase();
      freq[t] = (freq[t] || 0) + 1;
    });
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([tag]) => tag);
  }, [xFeedData]);

  const hashtags = tags();
  if (!hashtags.length) return null;

  const handleClick = (tag: string) => {
    const current = currentSearch.trim();
    const next = current ? `${current} ${tag}` : tag;
    onHashtagClick(next);
  };

  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1" data-testid="trending-hashtags">
      <span className="text-xs font-semibold text-muted-foreground shrink-0">Trending:</span>
      {hashtags.map((tag) => (
        <Badge
          key={tag}
          variant="secondary"
          className="shrink-0 cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-xs"
          onClick={() => handleClick(tag)}
          data-testid={`badge-hashtag-${tag.replace("#", "")}`}
        >
          {tag}
        </Badge>
      ))}
    </div>
  );
}

function AiSearchResults({ query, aiSettings }: { query: string; aiSettings: NewsAiSettings }) {
  const grokSearch = useGrokSearch();
  const lastQueryRef = useRef("");

  useEffect(() => {
    if (!aiSettings?.aiAvailable || !aiSettings?.searchEnabled) return;
    if (query.length <= 5) return;
    if (query === lastQueryRef.current) return;
    lastQueryRef.current = query;
    grokSearch.mutate({ query });
  }, [query, aiSettings?.aiAvailable, aiSettings?.searchEnabled]);

  if (!aiSettings?.aiAvailable || !aiSettings?.searchEnabled) return null;

  if (grokSearch.isPending) {
    return (
      <div className="border rounded-xl p-4 bg-primary/5 mb-4">
        <div className="flex items-center gap-2 text-sm text-primary">
          <Loader2 className="h-4 w-4 motion-safe:animate-spin" />
          <Sparkles className="h-3.5 w-3.5" />
          <span>Grok is analyzing your query…</span>
        </div>
      </div>
    );
  }

  if (!grokSearch.data) return null;

  return (
    <div className="border rounded-xl p-4 bg-primary/5 mb-4" data-testid="ai-search-results">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-semibold text-primary">Grok AI Interpretation</span>
      </div>
      <p className="text-sm text-foreground mb-3">{grokSearch.data.interpretation}</p>
      {grokSearch.data.liveResults && grokSearch.data.liveResults.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
            <Search className="h-2.5 w-2.5" />
            Live Search Results
          </p>
          <div className="space-y-1.5">
            {grokSearch.data.liveResults.slice(0, 5).map((result, i) => (
              <a
                key={i}
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-2 rounded-lg border bg-background hover:bg-muted/50 transition-colors"
                data-testid={`live-result-${i}`}
              >
                <p className="text-xs font-medium text-foreground line-clamp-1">{result.title}</p>
                {result.snippet && (
                  <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{result.snippet}</p>
                )}
              </a>
            ))}
          </div>
        </div>
      )}
      {grokSearch.data.articles.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {grokSearch.data.articles.map((article) => (
            <NewsArticleCard key={article.link} article={article} variant="compact" />
          ))}
        </div>
      )}
    </div>
  );
}

function GlobalSearchResults({ query, aiSettings }: { query: string; aiSettings?: NewsAiSettings }) {
  const { data: results, isLoading } = useQuery<NewsArticle[]>({
    queryKey: ["/api/news/feed", "search", query],
    queryFn: () => fetch(`/api/news/feed?query=${encodeURIComponent(query)}&limit=20`).then((r) => r.json()),
    enabled: query.length > 2,
    staleTime: 5 * 60 * 1000,
  });

  if (query.length <= 2) return (
    <p className="text-sm text-muted-foreground py-4 text-center">Type at least 3 characters to search…</p>
  );

  return (
    <div className="space-y-4">
      {aiSettings && <AiSearchResults query={query} aiSettings={aiSettings} />}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <ArticleSkeleton key={i} />)}
        </div>
      ) : !results?.length ? (
        <p className="text-sm text-muted-foreground py-4 text-center">No results found for "{query}"</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3" data-testid="search-results">
          {results.map((article) => (
            <NewsArticleCard key={article.link} article={article} variant="compact" />
          ))}
        </div>
      )}
    </div>
  );
}

function SavedArticlesView() {
  const { data: bookmarks, isLoading } = useQuery<UserNewsBookmark[]>({
    queryKey: ["/api/news/bookmarks"],
  });

  if (isLoading) return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {[1, 2, 3, 4].map((i) => <ArticleSkeleton key={i} />)}
    </div>
  );

  if (!bookmarks?.length) return (
    <EmptyState
      icon={BookmarkCheck}
      title="No saved articles"
      description="Bookmark articles to read later."
    />
  );

  const articles: NewsArticle[] = bookmarks.map((b) => ({
    title: b.articleTitle,
    link: b.articleUrl,
    description: "",
    pubDate: b.createdAt.toString(),
    source: b.articleSource ?? "",
    imageUrl: b.articleImage ?? null,
  }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3" data-testid="saved-articles">
      {articles.map((article, i) => (
        <NewsArticleCard key={`${article.link}-${i}`} article={article} variant="compact" categoryLabel={bookmarks[i]?.articleCategory ?? undefined} />
      ))}
    </div>
  );
}

interface CategorySwimLaneProps {
  category: NewsCategory;
  isFollowed: boolean;
  onFollowToggle: (categoryId: number) => void;
  onArticleClick?: (article: NewsArticle) => void;
}

function CategorySwimLane({ category, isFollowed, onFollowToggle, onArticleClick }: CategorySwimLaneProps) {
  const [displayCount, setDisplayCount] = useState(10);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [allArticles, setAllArticles] = useState<NewsArticle[]>([]);

  const { data: articles, isLoading, isFetching } = useQuery<NewsArticle[]>({
    queryKey: ["/api/news/feed", category.query, 20],
    queryFn: () =>
      fetch(`/api/news/feed?query=${encodeURIComponent(category.query)}&limit=20`).then((r) => r.json()),
    staleTime: 2 * 60 * 1000,
    refetchInterval: (query) => {
      const data = query.state.data as NewsArticle[] | undefined;
      return (!data || data.length === 0) ? 10000 : false;
    },
  });

  useEffect(() => {
    if (articles) setAllArticles(articles);
  }, [articles]);

  const loadMore = useCallback(() => {
    setDisplayCount((prev) => Math.min(prev + 6, allArticles.length));
  }, [allArticles.length]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && displayCount < (allArticles.length)) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [displayCount, allArticles.length, loadMore]);

  const visibleArticles = allArticles.slice(0, displayCount);
  const hasMore = displayCount < allArticles.length;

  return (
    <section data-testid={`swimlane-${category.id}`}>
      <div className="flex items-center gap-3 mb-4 border-t pt-6">
        <span
          className="w-3 h-3 rounded-full shrink-0"
          style={{ backgroundColor: category.accentColor || "#6b7280" }}
        />
        <h2 className="text-base font-bold text-foreground">{category.name}</h2>
        {isFollowed && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Following</Badge>
        )}
        <div className="flex-1 h-px bg-border" />
        <Button
          variant={isFollowed ? "secondary" : "ghost"}
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={() => onFollowToggle(category.id)}
          data-testid={`button-follow-${category.id}`}
        >
          {isFollowed ? "Following" : "Follow"}
        </Button>
        <Link href={`/news?category=${category.id}`}>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground" data-testid={`link-viewall-${category.id}`}>
            View all <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <ArticleSkeleton key={i} />)}
        </div>
      ) : !visibleArticles.length ? (
        <p className="text-sm text-muted-foreground py-4">No articles available right now.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 justify-start">
            {visibleArticles.map((article) => (
              <NewsArticleCard
                key={article.link}
                article={article}
                variant="compact"
                accentColor={category.accentColor || undefined}
                categoryLabel={category.name}
                onCardClick={onArticleClick ? () => onArticleClick(article) : undefined}
              />
            ))}
          </div>
          <div ref={sentinelRef} className="h-1 mt-2" />
          {hasMore && (
            <div className="mt-4 flex justify-center">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={loadMore}
                disabled={isFetching}
                data-testid={`button-loadmore-${category.id}`}
              >
                {isFetching ? "Loading…" : "Load more"}
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function CategoryFilteredView({ categoryId, categories }: { categoryId: string; categories: NewsCategory[] }) {
  const category = categories.find((c) => String(c.id) === categoryId);
  const [selectedHandle, setSelectedHandle] = useState<string | null>(null);

  useEffect(() => {
    setSelectedHandle(null);
  }, [categoryId]);

  const { data: xFeedArticles, isLoading } = useQuery<EditorialArticle[]>({
    queryKey: ["/api/news/x-feed", category?.name, 20],
    queryFn: () =>
      fetch(`/api/news/x-feed?category=${encodeURIComponent(category!.name)}&limit=20`).then((r) => r.json()),
    enabled: !!category,
    staleTime: 5 * 60 * 1000,
  });

  if (!category) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-sm">Category not found.</p>
      </div>
    );
  }

  const allArticles = xFeedArticles ?? [];
  const uniqueXHandles = Array.from(
    new Set(allArticles.map((a) => a.authorHandle).filter((h): h is string => !!h))
  );

  const filteredArticles = selectedHandle
    ? allArticles.filter((a) => a.authorHandle === selectedHandle)
    : allArticles;

  const heroArticle = filteredArticles[0];
  const restArticles = filteredArticles.slice(1);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/news">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" data-testid="link-back-to-news">
            <ArrowLeft className="h-3.5 w-3.5" />
            All News
          </Button>
        </Link>
        <span className="text-muted-foreground">/</span>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: category.accentColor || "#6b7280" }} />
          <span className="font-semibold text-sm">{category.name}</span>
        </div>
      </div>

      {uniqueXHandles.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap" data-testid="news-page-handle-chips">
          <span className="text-xs text-muted-foreground flex items-center gap-1 mr-1">
            <SiX className="h-3 w-3" /> Sources:
          </span>
          <button
            onClick={() => setSelectedHandle(null)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all border ${
              selectedHandle === null
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-transparent border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
            }`}
            data-testid="chip-handle-all"
          >
            All
          </button>
          {uniqueXHandles.map((handle) => (
            <button
              key={handle}
              onClick={() => setSelectedHandle(selectedHandle === handle ? null : handle)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-mono transition-all border ${
                selectedHandle === handle
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-transparent border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
              }`}
              data-testid={`chip-handle-${handle}`}
            >
              {handle}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <Skeleton className="w-full h-72 rounded-2xl" />
      ) : heroArticle ? (
        <HeroSection article={{ ...heroArticle, imageUrl: heroArticle.imageUrl ?? null }} />
      ) : null}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <ArticleSkeleton key={i} />)}
        </div>
      ) : restArticles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {restArticles.map((article) => (
            <NewsArticleCard
              key={article.link}
              article={{ ...article, imageUrl: article.imageUrl ?? null }}
              variant="medium"
              accentColor={category.accentColor || undefined}
              categoryLabel={category.name}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function NewsPage() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(location.includes("?") ? location.split("?")[1] : "");
  const categoryParam = searchParams.get("category");
  const { role } = usePermission();
  const isLoggedIn = !!role;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"all" | "saved">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);

  const { data: aiSettings } = useNewsAiSettings();

  useEffect(() => {
    document.title = "News — SEVCO";
    const desc = document.querySelector("meta[name='description']");
    if (desc) desc.setAttribute("content", "Stay up to date with the latest news in music, technology, and business — curated for the SEVCO community, powered by Grok AI.");

    let ogTitle = document.querySelector("meta[property='og:title']");
    if (!ogTitle) {
      ogTitle = document.createElement("meta");
      ogTitle.setAttribute("property", "og:title");
      document.head.appendChild(ogTitle);
    }
    ogTitle.setAttribute("content", "News — SEVCO");

    let ogDesc = document.querySelector("meta[property='og:description']");
    if (!ogDesc) {
      ogDesc = document.createElement("meta");
      ogDesc.setAttribute("property", "og:description");
      document.head.appendChild(ogDesc);
    }
    ogDesc.setAttribute("content", "AI-powered news curated for the SEVCO community. Summaries, trending topics, and daily briefings powered by Grok.");
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: categories, isLoading: catsLoading } = useQuery<NewsCategory[]>({
    queryKey: ["/api/news"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: preferences } = useQuery<{ followedCategoryIds: number[] }>({
    queryKey: ["/api/news/preferences"],
    enabled: isLoggedIn,
    staleTime: 5 * 60 * 1000,
  });

  const followedCategoryIds = preferences?.followedCategoryIds ?? [];

  const prefMutation = useMutation({
    mutationFn: (ids: number[]) => apiRequest("PUT", "/api/news/preferences", { followedCategoryIds: ids }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/news/preferences"] }),
    onError: () => toast({ title: "Error", description: "Failed to update preferences.", variant: "destructive" }),
  });

  const handleFollowToggle = (categoryId: number) => {
    if (!isLoggedIn) {
      toast({ title: "Sign in required", description: "Please sign in to follow categories." });
      return;
    }
    const current = followedCategoryIds;
    const next = current.includes(categoryId)
      ? current.filter((id) => id !== categoryId)
      : [...current, categoryId];
    prefMutation.mutate(next);
  };

  const sortedCategories = (() => {
    if (!categories) return [];
    const followed = categories.filter((c) => followedCategoryIds.includes(c.id));
    const unfollowed = categories.filter((c) => !followedCategoryIds.includes(c.id));
    return [...followed, ...unfollowed];
  })();

  const primaryCategory = sortedCategories[0];
  const otherCategories = sortedCategories.slice(1);

  const { data: primaryArticles, isLoading: primaryLoading, isFetching: primaryFetching, refetch: refetchPrimary } = useQuery<NewsArticle[]>({
    queryKey: ["/api/news/feed", primaryCategory?.query, 11],
    queryFn: () =>
      fetch(`/api/news/feed?query=${encodeURIComponent(primaryCategory!.query)}&limit=11`).then((r) => r.json()),
    enabled: !!primaryCategory,
    staleTime: 2 * 60 * 1000,
    refetchInterval: (query) => {
      const data = query.state.data as NewsArticle[] | undefined;
      return (!data || data.length === 0) ? 10000 : false;
    },
  });

  const { data: trendingNews } = useQuery<TrendingNewsItem[]>({
    queryKey: ["/api/trending-news"],
    staleTime: 5 * 60 * 1000,
  });

  const trendingHero = trendingNews?.[0];
  const heroArticle = trendingHero
    ? {
        title: trendingHero.headline,
        link: trendingHero.link,
        description: trendingHero.aiBlurb || trendingHero.summary,
        pubDate: trendingHero.timestamp,
        source: trendingHero.source,
        imageUrl: trendingHero.thumbnail,
        aiBlurb: trendingHero.aiBlurb,
        aiInsight: trendingHero.aiInsight,
        category: trendingHero.category,
      } as NewsArticle
    : primaryArticles?.[0];
  const bentoArticles = primaryArticles?.slice(trendingHero ? 0 : 1, trendingHero ? 10 : 11) ?? [];

  const isSearchActive = debouncedSearch.length > 0;

  const handleArticleClick = (article: NewsArticle) => {
    setSelectedArticle(article);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6" data-testid="news-page" data-page="news">
      {!categoryParam && <BreakingBanner />}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Newspaper className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">News</h1>
            <p className="text-sm text-muted-foreground">
              {aiSettings?.aiAvailable ? (
                <span className="flex items-center gap-1">
                  AI-powered headlines curated for you
                  <Sparkles className="h-3 w-3 text-primary inline" />
                </span>
              ) : (
                "Curated headlines from across the web"
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!categoryParam && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetchPrimary()}
              data-testid="button-refresh-news"
              className="gap-1.5 text-muted-foreground"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
          )}
        </div>
      </div>

      {categoryParam && categories && !catsLoading ? (
        <CategoryFilteredView categoryId={categoryParam} categories={categories} />
      ) : (
        <div className="flex gap-6 flex-col lg:flex-row">
          <div className="flex-1 min-w-0 space-y-6">

            <div className="flex items-center gap-2">
              <div className="relative flex-1 max-w-lg">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={aiSettings?.searchEnabled ? "Ask anything about the news…" : "Search all news…"}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-9"
                  data-testid="input-news-search"
                />
                {searchQuery && (
                  <button
                    onClick={() => { setSearchQuery(""); setDebouncedSearch(""); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    data-testid="button-clear-search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              {aiSettings?.searchEnabled && aiSettings?.aiAvailable && (
                <Badge variant="outline" className="text-[10px] shrink-0 hidden sm:flex items-center gap-1">
                  <Sparkles className="h-2.5 w-2.5 text-primary" />
                  Grok Search
                </Badge>
              )}
              {isLoggedIn && (
                <div className="flex items-center border rounded-lg overflow-hidden">
                  <button
                    onClick={() => setActiveTab("all")}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${activeTab === "all" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    data-testid="tab-all-news"
                  >
                    All
                  </button>
                  <button
                    onClick={() => setActiveTab("saved")}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1 ${activeTab === "saved" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    data-testid="tab-saved-news"
                  >
                    <BookmarkCheck className="h-3 w-3" />
                    Saved
                  </button>
                </div>
              )}
            </div>

            {!isSearchActive && activeTab === "all" && (
              <TrendingHashtags
                primaryCategoryName={primaryCategory?.name}
                onHashtagClick={(val) => setSearchQuery(val)}
                currentSearch={searchQuery}
              />
            )}

            {activeTab === "saved" && isLoggedIn ? (
              <SavedArticlesView />
            ) : isSearchActive ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Results for "{debouncedSearch}"</p>
                  <Button variant="ghost" size="sm" onClick={() => { setSearchQuery(""); setDebouncedSearch(""); }} className="text-xs" data-testid="button-clear-search-inline">
                    Clear search
                  </Button>
                </div>
                <GlobalSearchResults query={debouncedSearch} aiSettings={aiSettings} />
              </div>
            ) : (
              <>
                {catsLoading || primaryLoading ? (
                  <Skeleton className="w-full h-72 rounded-2xl" />
                ) : heroArticle ? (
                  <div className="cursor-pointer" onClick={() => handleArticleClick(heroArticle)} data-testid="hero-clickable">
                    <HeroSection article={heroArticle} aiSettings={aiSettings} />
                  </div>
                ) : (
                  <div className="rounded-2xl border bg-muted/30 flex flex-col items-center justify-center h-48 gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {primaryFetching ? "Fetching latest headlines…" : "Warming up the news feed…"}
                    </p>
                    <Button size="sm" variant="ghost" onClick={() => refetchPrimary()} data-testid="button-retry-news">
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                      Refresh now
                    </Button>
                  </div>
                )}

                {primaryCategory && (
                  <section>
                    <div className="flex items-center gap-3 mb-4 border-t pt-6">
                      {primaryCategory.accentColor && (
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: primaryCategory.accentColor }} />
                      )}
                      <h2 className="text-base font-bold text-foreground">{primaryCategory.name}</h2>
                      {followedCategoryIds.includes(primaryCategory.id) && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Following</Badge>
                      )}
                      <div className="flex-1 h-px bg-border" />
                      <Button
                        variant={followedCategoryIds.includes(primaryCategory.id) ? "secondary" : "ghost"}
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handleFollowToggle(primaryCategory.id)}
                        data-testid={`button-follow-${primaryCategory.id}`}
                      >
                        {followedCategoryIds.includes(primaryCategory.id) ? "Following" : "Follow"}
                      </Button>
                      <Link href={`/news?category=${primaryCategory.id}`}>
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground" data-testid={`link-viewall-${primaryCategory.id}`}>
                          View all <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </div>
                    {primaryLoading ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <ArticleSkeleton key={i} />)}
                      </div>
                    ) : (
                      <NewsBentoGrid
                        articles={bentoArticles}
                        accentColor={primaryCategory.accentColor || undefined}
                        categoryLabel={primaryCategory.name}
                        onArticleClick={handleArticleClick}
                      />
                    )}
                  </section>
                )}

                {otherCategories.map((cat) => (
                  <CategorySwimLane
                    key={cat.id}
                    category={cat}
                    isFollowed={followedCategoryIds.includes(cat.id)}
                    onFollowToggle={handleFollowToggle}
                    onArticleClick={handleArticleClick}
                  />
                ))}

                {!catsLoading && !categories?.length && (
                  <div className="text-center py-16 text-muted-foreground">
                    <Newspaper className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No news categories configured yet.</p>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="hidden lg:block space-y-6">
            <LiveMarkets />
            <TrendingTopicsSidebar onTopicClick={(topic) => { setSearchQuery(topic); setDebouncedSearch(topic); }} />
            {!categoryParam && aiSettings && (aiSettings.trendingEnabled || aiSettings.chatEnabled) && (
              <NewsAiSidebar
                aiSettings={aiSettings}
                categoryName={primaryCategory?.name}
                categories={categories?.map((c) => ({ id: c.id, name: c.name, accentColor: c.accentColor }))}
                onCategoryFilter={(name) => { setSearchQuery(name); setDebouncedSearch(name); }}
              />
            )}
          </div>
        </div>
      )}

      {aiSettings && <DailyBriefingFab aiSettings={aiSettings} />}

      {selectedArticle && aiSettings && (
        <ArticleDetailModal
          article={selectedArticle}
          onClose={() => setSelectedArticle(null)}
          aiSettings={aiSettings}
        />
      )}
    </div>
  );
}
