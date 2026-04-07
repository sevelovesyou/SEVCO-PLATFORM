import { useQuery } from "@tanstack/react-query";
import { useRef, useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { LiveMarkets } from "@/components/live-markets";
import { articleHasImage, type NewsArticle } from "@/components/news-article-card";
import { resolveImageUrl } from "@/lib/resolve-image-url";

function useIntersectionObserver(options?: IntersectionObserverInit) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.1, ...options });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, isVisible };
}

interface NewsItem {
  title: string;
  link: string;
  source?: string;
  pubDate?: string;
  category?: string;
  description?: string;
  imageUrl?: string | null;
}

function formatRelativeTime(pubDate: string | undefined): string {
  if (!pubDate) return "";
  try {
    const date = new Date(pubDate);
    if (isNaN(date.getTime())) return pubDate;
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return pubDate;
  }
}

function NewsItemWithImage({ item, index }: { item: NewsItem; index: number }) {
  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-start gap-3 py-3 hover:bg-muted/30 rounded-lg px-2 -mx-2 transition-colors"
      data-testid={`card-home-news-img-${index}`}
    >
      <div className="shrink-0 h-16 w-16 rounded overflow-hidden bg-muted">
        <img
          src={resolveImageUrl(item.imageUrl!)}
          alt={item.title}
          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
          {item.title}
        </p>
        <div className="flex items-center gap-1.5 mt-1 text-[11px] text-muted-foreground">
          {item.source && <span className="truncate max-w-[120px] font-medium">{item.source}</span>}
          {item.source && item.pubDate && <span>·</span>}
          {item.pubDate && <span>{formatRelativeTime(item.pubDate)}</span>}
        </div>
      </div>
    </a>
  );
}

function NewsItemTextOnly({ item, index }: { item: NewsItem; index: number }) {
  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-start gap-2 py-3 hover:bg-muted/30 rounded-lg px-2 -mx-2 transition-colors"
      data-testid={`card-home-news-text-${index}`}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
          {item.title}
        </p>
        <div className="flex items-center gap-1.5 mt-1 text-[11px] text-muted-foreground">
          {item.source && <span className="truncate max-w-[120px] font-medium">{item.source}</span>}
          {item.source && item.pubDate && <span>·</span>}
          {item.pubDate && <span>{formatRelativeTime(item.pubDate)}</span>}
        </div>
      </div>
    </a>
  );
}

function NewsSkeleton() {
  return (
    <div className="space-y-0">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-3 py-3 border-b border-border/40 last:border-0">
          <Skeleton className="h-14 w-14 rounded shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface HomeNewsAndMarketsProps {
  showNewsSection?: boolean;
}

export function HomeNewsAndMarkets({ showNewsSection = true }: HomeNewsAndMarketsProps) {
  const { ref, isVisible } = useIntersectionObserver();
  const { data: newsFeed = [], isLoading } = useQuery<NewsItem[]>({
    queryKey: ["/api/news/feed/all"],
    staleTime: 5 * 60 * 1000,
  });

  if (!showNewsSection) return null;

  const topArticles = newsFeed.slice(0, 5);
  const todayDate = format(new Date(), "MMMM d, yyyy");

  return (
    <section
      className="max-w-6xl mx-auto px-4 sm:px-6 py-14 md:py-18"
      data-testid="section-home-news-markets"
    >
      <div
        ref={ref}
        className={`transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="bg-primary/15 text-primary border-primary/20 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5">
              Latest
            </Badge>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground" data-testid="text-news-markets-heading">
              News &amp; Markets
            </h2>
            <span className="text-xs text-muted-foreground hidden sm:inline">{todayDate}</span>
          </div>
          <Link href="/news" data-testid="link-view-all-stories">
            <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer inline-flex items-center gap-1">
              View all stories <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
          <div data-testid="col-news">
            {isLoading ? (
              <NewsSkeleton />
            ) : topArticles.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6">No news available right now.</p>
            ) : (
              <div>
                {topArticles.map((item, i) => {
                  const asArticle: NewsArticle = {
                    title: item.title,
                    link: item.link,
                    description: item.description ?? "",
                    pubDate: item.pubDate ?? "",
                    source: item.source ?? "",
                    imageUrl: item.imageUrl ?? null,
                  };
                  const hasImg = articleHasImage(asArticle);
                  return (
                    <div key={item.link} className={i < topArticles.length - 1 ? "border-b border-border/40" : ""}>
                      {hasImg ? (
                        <NewsItemWithImage item={item} index={i} />
                      ) : (
                        <NewsItemTextOnly item={item} index={i} />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div
            className="rounded-xl border border-border/60 bg-card p-4"
            data-testid="col-markets"
          >
            <LiveMarkets />
          </div>
        </div>
      </div>
    </section>
  );
}
