import { useQuery } from "@tanstack/react-query";
import { useRef, useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { articleHasImage } from "@/components/news-article-card";
import { resolveImageUrl } from "@/lib/resolve-image-url";
import type { MarketData } from "@shared/schema";

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

function formatPrice(price: number): string {
  if (price >= 10000) return price.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (price >= 100) return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

function TickerChip({ item }: { item: MarketData }) {
  const isPositive = item.changePercent > 0;
  return (
    <div
      className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/60 border border-border/40 text-xs"
      data-testid={`market-chip-${item.symbol}`}
    >
      <span className="font-bold text-foreground">{item.symbol.replace("^", "")}</span>
      <span className="text-muted-foreground tabular-nums">${formatPrice(item.price)}</span>
      <span className={isPositive ? "text-emerald-500" : "text-red-500"}>
        {isPositive ? "▲" : "▼"} {Math.abs(item.changePercent).toFixed(2)}%
      </span>
    </div>
  );
}

function TickerSkeletons() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="flex-shrink-0 h-8 w-28 rounded-full" />
      ))}
    </>
  );
}

function FeaturedArticle({ item }: { item: NewsItem }) {
  const hasImg = !!(item.imageUrl);
  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="group block h-full"
      data-testid="card-home-news-featured"
    >
      {hasImg ? (
        <>
          <div className="rounded-xl overflow-hidden aspect-video mb-3">
            <img
              src={resolveImageUrl(item.imageUrl!)}
              alt={item.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
          <h3 className="text-lg font-bold text-foreground line-clamp-2 leading-snug mb-2 group-hover:text-primary transition-colors">
            {item.title}
          </h3>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            {item.source && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-medium">{item.source}</Badge>
            )}
            {item.pubDate && <span>{formatRelativeTime(item.pubDate)}</span>}
          </div>
        </>
      ) : (
        <div className="rounded-xl border-l-4 border-primary bg-muted/40 p-4">
          <h3 className="text-lg font-bold text-foreground line-clamp-2 leading-snug mb-2 group-hover:text-primary transition-colors">
            {item.title}
          </h3>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            {item.source && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-medium">{item.source}</Badge>
            )}
            {item.pubDate && <span>{formatRelativeTime(item.pubDate)}</span>}
          </div>
        </div>
      )}
    </a>
  );
}

function CompactArticleRow({ item, index }: { item: NewsItem; index: number }) {
  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="group block py-3 hover:bg-muted/30 rounded px-1 -mx-1 transition-colors"
      data-testid={`card-home-news-compact-${index}`}
    >
      <p className="text-sm font-bold text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors mb-1">
        {item.title}
      </p>
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        {item.source && <span className="font-medium truncate max-w-[100px]">{item.source}</span>}
        {item.source && item.pubDate && <span>·</span>}
        {item.pubDate && <span>{formatRelativeTime(item.pubDate)}</span>}
      </div>
    </a>
  );
}

function NewsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-6">
      <div>
        <Skeleton className="w-full aspect-video rounded-xl mb-3" />
        <Skeleton className="h-5 w-full mb-2" />
        <Skeleton className="h-5 w-3/4 mb-2" />
        <Skeleton className="h-3.5 w-1/3" />
      </div>
      <div className="space-y-0">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`py-3 ${i < 3 ? "border-b border-border/40" : ""}`}>
            <Skeleton className="h-3.5 w-full mb-1.5" />
            <Skeleton className="h-3.5 w-4/5 mb-1.5" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        ))}
      </div>
    </div>
  );
}

interface HomeNewsAndMarketsProps {
  showNewsSection?: boolean;
}

export function HomeNewsAndMarkets({ showNewsSection = true }: HomeNewsAndMarketsProps) {
  const { ref, isVisible } = useIntersectionObserver();

  const { data: newsFeed = [], isLoading: newsLoading } = useQuery<NewsItem[]>({
    queryKey: ["/api/news/feed/all"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: marketItems, isLoading: marketLoading } = useQuery<MarketData[]>({
    queryKey: ["/api/market-data"],
    staleTime: 5 * 60 * 1000,
    refetchInterval: 7 * 60 * 1000,
  });

  if (!showNewsSection) return null;

  const todayDate = format(new Date(), "MMMM d, yyyy");

  const featuredItem = newsFeed.find((item) => articleHasImage({ title: item.title, link: item.link, description: item.description ?? "", pubDate: item.pubDate ?? "", source: item.source ?? "", imageUrl: item.imageUrl ?? null })) ?? newsFeed[0];
  const featuredIndex = featuredItem ? newsFeed.indexOf(featuredItem) : -1;
  const sideItems = newsFeed.filter((_, i) => i !== featuredIndex).slice(0, 4);

  const allMarketItems = marketItems ?? [];

  return (
    <section
      className="max-w-6xl mx-auto px-4 sm:px-6 py-14 md:py-18"
      data-testid="section-home-news-markets"
    >
      <div
        ref={ref}
        className={`transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
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

        {/* Horizontal stock ticker row */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-2 mb-6" data-testid="market-ticker-row">
          {marketLoading ? (
            <TickerSkeletons />
          ) : allMarketItems.length > 0 ? (
            allMarketItems.map((item) => (
              <TickerChip key={item.symbol} item={item} />
            ))
          ) : null}
        </div>

        {/* News area */}
        {newsLoading ? (
          <NewsSkeleton />
        ) : newsFeed.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6">No news available right now.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-6" data-testid="col-news">
            <div>
              {featuredItem && <FeaturedArticle item={featuredItem} />}
            </div>
            <div className="divide-y divide-border/40" data-testid="col-news-compact">
              {sideItems.map((item, i) => (
                <CompactArticleRow key={item.link} item={item} index={i} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
