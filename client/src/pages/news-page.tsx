import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Newspaper, RefreshCw, ChevronRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { NewsBentoGrid } from "@/components/news-bento-grid";
import { NewsArticleCard, type NewsArticle } from "@/components/news-article-card";
import { useEffect, useState } from "react";
import type { NewsCategory } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { Link, useLocation } from "wouter";

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

interface CategorySwimLaneProps {
  category: NewsCategory;
}

function CategorySwimLane({ category }: CategorySwimLaneProps) {
  const [expanded, setExpanded] = useState(false);
  const limit = expanded ? 12 : 6;

  const { data: articles, isLoading, isFetching } = useQuery<NewsArticle[]>({
    queryKey: ["/api/news/feed", category.query, limit],
    queryFn: () =>
      fetch(`/api/news/feed?query=${encodeURIComponent(category.query)}&limit=${limit}`).then((r) => r.json()),
    staleTime: 15 * 60 * 1000,
  });

  return (
    <section data-testid={`swimlane-${category.id}`}>
      <div className="flex items-center gap-3 mb-4 border-t pt-6">
        <span
          className="w-3 h-3 rounded-full shrink-0"
          style={{ backgroundColor: category.accentColor || "#6b7280" }}
        />
        <h2 className="text-base font-bold text-foreground">{category.name}</h2>
        <div className="flex-1 h-px bg-border" />
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
      ) : !articles?.length ? (
        <p className="text-sm text-muted-foreground py-4">No articles available right now.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {articles.slice(0, limit).map((article) => (
              <NewsArticleCard
                key={article.link}
                article={article}
                variant="compact"
                accentColor={category.accentColor || undefined}
                categoryLabel={category.name}
              />
            ))}
          </div>
          {!expanded && (
            <div className="mt-4 flex justify-center">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => setExpanded(true)}
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

  const { data: articles, isLoading } = useQuery<NewsArticle[]>({
    queryKey: ["/api/news/feed", category?.query, 20],
    queryFn: () =>
      fetch(`/api/news/feed?query=${encodeURIComponent(category!.query)}&limit=20`).then((r) => r.json()),
    enabled: !!category,
    staleTime: 15 * 60 * 1000,
  });

  if (!category) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-sm">Category not found.</p>
      </div>
    );
  }

  const heroArticle = articles?.[0];
  const restArticles = articles?.slice(1) ?? [];

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

      {isLoading ? (
        <Skeleton className="w-full h-72 rounded-2xl" />
      ) : heroArticle ? (
        <HeroSection article={heroArticle} />
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
              article={article}
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

  useEffect(() => {
    document.title = "News — SEVCO";
    const desc = document.querySelector("meta[name='description']");
    if (desc) desc.setAttribute("content", "Stay up to date with the latest news in music, technology, and business — curated for the SEVCO community.");
  }, []);

  const { data: categories, isLoading: catsLoading } = useQuery<NewsCategory[]>({
    queryKey: ["/api/news"],
    staleTime: 5 * 60 * 1000,
  });

  const primaryCategory = categories?.[0];
  const otherCategories = categories?.slice(1) ?? [];

  const { data: primaryArticles, isLoading: primaryLoading, refetch: refetchPrimary } = useQuery<NewsArticle[]>({
    queryKey: ["/api/news/feed", primaryCategory?.query, 10],
    queryFn: () =>
      fetch(`/api/news/feed?query=${encodeURIComponent(primaryCategory!.query)}&limit=10`).then((r) => r.json()),
    enabled: !!primaryCategory,
    staleTime: 15 * 60 * 1000,
  });

  const heroArticle = primaryArticles?.[0];
  const bentoArticles = primaryArticles?.slice(1, 9) ?? [];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-10" data-testid="news-page">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Newspaper className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">News</h1>
            <p className="text-sm text-muted-foreground">Curated headlines from across the web</p>
          </div>
        </div>
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

      {/* Category filtered view */}
      {categoryParam && categories && !catsLoading ? (
        <CategoryFilteredView categoryId={categoryParam} categories={categories} />
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
                <div className="flex-1 h-px bg-border" />
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
            <CategorySwimLane key={cat.id} category={cat} />
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
  );
}
