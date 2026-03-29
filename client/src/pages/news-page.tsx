import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Newspaper, RefreshCw, ChevronRight, ArrowLeft, Search, X, Zap, BookmarkCheck } from "lucide-react";
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

function ArticleSkeleton() {
  return <Skeleton className="w-full h-48 rounded-xl" />;
}

function HeroSection({ article }: { article: NewsArticle }) {
  let relativeTime = "";
  try {
    const d = new Date(article.pubDate);
    if (!isNaN(d.getTime())) relativeTime = formatDistanceToNow(d, { addSuffix: true });
  } catch {}

  const PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='400' viewBox='0 0 1200 400'%3E%3Crect width='1200' height='400' fill='%23374151'/%3E%3Ctext x='600' y='210' text-anchor='middle' fill='%236B7280' font-size='24' font-family='sans-serif'%3ESEVCO News%3C/text%3E%3C/svg%3E";

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border bg-card group" data-testid="news-hero">
      <div className="relative aspect-[21/7] md:aspect-[21/6] overflow-hidden">
        <img
          src={article.imageUrl || PLACEHOLDER}
          alt={article.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
          {article.source && (
            <span className="inline-block bg-white/20 backdrop-blur-sm text-white text-xs font-medium px-3 py-1 rounded-full mb-3">
              {article.source}
            </span>
          )}
          <h1 className="text-xl md:text-3xl font-serif font-bold text-white leading-tight line-clamp-3 mb-2">
            {article.title}
          </h1>
          {article.description && (
            <p className="text-sm text-white/80 line-clamp-2 mb-3 max-w-3xl">{article.description}</p>
          )}
          <div className="flex items-center gap-4">
            {relativeTime && <span className="text-xs text-white/60">{relativeTime}</span>}
            <a
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-white hover:text-white/80 transition-colors"
              data-testid="link-hero-read-more"
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
      <Zap className="h-4 w-4 shrink-0 animate-pulse" />
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

function GlobalSearchResults({ query }: { query: string }) {
  const { data: results, isLoading } = useQuery<NewsArticle[]>({
    queryKey: ["/api/news/feed", "search", query],
    queryFn: () => fetch(`/api/news/feed?query=${encodeURIComponent(query)}&limit=20`).then((r) => r.json()),
    enabled: query.length > 2,
    staleTime: 5 * 60 * 1000,
  });

  if (query.length <= 2) return (
    <p className="text-sm text-muted-foreground py-4 text-center">Type at least 3 characters to search…</p>
  );

  if (isLoading) return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {[1, 2, 3, 4].map((i) => <ArticleSkeleton key={i} />)}
    </div>
  );

  if (!results?.length) return (
    <p className="text-sm text-muted-foreground py-4 text-center">No results found for "{query}"</p>
  );

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3" data-testid="search-results">
      {results.map((article) => (
        <NewsArticleCard key={article.link} article={article} variant="compact" />
      ))}
    </div>
  );
}

function SavedArticlesView() {
  const { data: bookmarks, isLoading } = useQuery<UserNewsBookmark[]>({
    queryKey: ["/api/news/bookmarks"],
  });

  if (isLoading) return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {[1, 2, 3, 4].map((i) => <ArticleSkeleton key={i} />)}
    </div>
  );

  if (!bookmarks?.length) return (
    <div className="text-center py-16 text-muted-foreground">
      <BookmarkCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
      <p className="text-sm">No saved articles yet. Bookmark articles to read later.</p>
    </div>
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
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3" data-testid="saved-articles">
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
}

function CategorySwimLane({ category, isFollowed, onFollowToggle }: CategorySwimLaneProps) {
  const [displayCount, setDisplayCount] = useState(10);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [allArticles, setAllArticles] = useState<NewsArticle[]>([]);

  const { data: articles, isLoading, isFetching } = useQuery<NewsArticle[]>({
    queryKey: ["/api/news/feed", category.query, 20],
    queryFn: () =>
      fetch(`/api/news/feed?query=${encodeURIComponent(category.query)}&limit=20`).then((r) => r.json()),
    staleTime: 15 * 60 * 1000,
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => <ArticleSkeleton key={i} />)}
        </div>
      ) : !visibleArticles.length ? (
        <p className="text-sm text-muted-foreground py-4">No articles available right now.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {visibleArticles.map((article) => (
              <NewsArticleCard
                key={article.link}
                article={article}
                variant="compact"
                accentColor={category.accentColor || undefined}
                categoryLabel={category.name}
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
  const xOnlyArticles = allArticles.filter((a) => a.sourceType === "x");
  const uniqueXHandles = Array.from(
    new Set(xOnlyArticles.map((a) => a.authorHandle).filter((h): h is string => !!h))
  );

  const filteredArticles = selectedHandle
    ? allArticles.filter((a) => a.sourceType !== "x" || a.authorHandle === selectedHandle)
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

      {/* X handle filter chips */}
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <ArticleSkeleton key={i} />)}
        </div>
      ) : restArticles.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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

  useEffect(() => {
    document.title = "News — SEVCO";
    const desc = document.querySelector("meta[name='description']");
    if (desc) desc.setAttribute("content", "Stay up to date with the latest news in music, technology, and business — curated for the SEVCO community.");
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

  const { data: primaryArticles, isLoading: primaryLoading, refetch: refetchPrimary } = useQuery<NewsArticle[]>({
    queryKey: ["/api/news/feed", primaryCategory?.query, 11],
    queryFn: () =>
      fetch(`/api/news/feed?query=${encodeURIComponent(primaryCategory!.query)}&limit=11`).then((r) => r.json()),
    enabled: !!primaryCategory,
    staleTime: 15 * 60 * 1000,
  });

  const heroArticle = primaryArticles?.[0];
  const bentoArticles = primaryArticles?.slice(1, 11) ?? [];

  const isSearchActive = debouncedSearch.length > 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6" data-testid="news-page" data-page="news">
      {/* Breaking banner */}
      {!categoryParam && <BreakingBanner />}

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Newspaper className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">News</h1>
            <p className="text-sm text-muted-foreground">Curated headlines from across the web</p>
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

      {/* Category filtered view */}
      {categoryParam && categories && !catsLoading ? (
        <CategoryFilteredView categoryId={categoryParam} categories={categories} />
      ) : (
        <>
          {/* Search bar */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-lg">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search all news…"
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

          {/* Trending hashtags */}
          {!isSearchActive && activeTab === "all" && (
            <TrendingHashtags
              primaryCategoryName={primaryCategory?.name}
              onHashtagClick={(val) => setSearchQuery(val)}
              currentSearch={searchQuery}
            />
          )}

          {/* Saved tab */}
          {activeTab === "saved" && isLoggedIn ? (
            <SavedArticlesView />
          ) : isSearchActive ? (
            /* Search results */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Results for "{debouncedSearch}"</p>
                <Button variant="ghost" size="sm" onClick={() => { setSearchQuery(""); setDebouncedSearch(""); }} className="text-xs" data-testid="button-clear-search-inline">
                  Clear search
                </Button>
              </div>
              <GlobalSearchResults query={debouncedSearch} />
            </div>
          ) : (
            <>
              {/* Hero */}
              {catsLoading || primaryLoading ? (
                <Skeleton className="w-full h-72 rounded-2xl" />
              ) : heroArticle ? (
                <HeroSection article={heroArticle} />
              ) : (
                <div className="rounded-2xl border bg-muted/30 flex items-center justify-center h-48">
                  <p className="text-sm text-muted-foreground">No headlines available right now. Check back soon.</p>
                </div>
              )}

              {/* Bento Grid */}
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
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <ArticleSkeleton key={i} />)}
                    </div>
                  ) : (
                    <NewsBentoGrid
                      articles={bentoArticles}
                      accentColor={primaryCategory.accentColor || undefined}
                      categoryLabel={primaryCategory.name}
                    />
                  )}
                </section>
              )}

              {/* Category swimlanes */}
              {otherCategories.map((cat) => (
                <CategorySwimLane
                  key={cat.id}
                  category={cat}
                  isFollowed={followedCategoryIds.includes(cat.id)}
                  onFollowToggle={handleFollowToggle}
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
        </>
      )}
    </div>
  );
}
