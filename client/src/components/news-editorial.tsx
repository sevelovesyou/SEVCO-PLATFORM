import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  ExternalLink, Heart, Repeat2, Clock, Zap, TrendingUp,
} from "lucide-react";
import { SiX } from "react-icons/si";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import type { NewsCategory } from "@shared/schema";

export type EditorialArticle = {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  source: string;
  imageUrl: string | null;
  sourceType?: "x" | "rss";
  authorHandle?: string;
  likeCount?: number;
  retweetCount?: number;
};

interface Tweet {
  id: string;
  text: string;
  authorId: string;
  authorName: string;
  authorHandle: string;
  authorAvatarUrl: string | null;
  likeCount: number;
  retweetCount: number;
  createdAt: string;
  url: string;
}

const PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200' viewBox='0 0 400 200'%3E%3Crect width='400' height='200' fill='%231a1a2e'/%3E%3Ctext x='200' y='105' text-anchor='middle' fill='%23374151' font-size='13' font-family='sans-serif'%3ENo Image%3C/text%3E%3C/svg%3E";

function formatTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return dateStr;
  }
}

function SourceBadge({ article, accentColor }: { article: EditorialArticle; accentColor?: string }) {
  if (article.sourceType === "x") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-white/90 border border-white/15">
        <SiX className="h-2.5 w-2.5" />
        X Post
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white/90 border border-white/10"
      style={{ backgroundColor: accentColor ? `${accentColor}33` : "rgba(255,255,255,0.08)" }}
    >
      {article.source || "News"}
    </span>
  );
}

function BreakingTicker({ articles }: { articles: EditorialArticle[] }) {
  const tickerRef = useRef<HTMLDivElement>(null);
  const items = articles.slice(0, 8);
  if (items.length === 0) return null;
  return (
    <div
      className="relative flex items-center overflow-hidden bg-red-700/90 text-white h-9"
      data-testid="news-breaking-ticker"
    >
      <div className="shrink-0 flex items-center gap-1.5 px-3 py-1 bg-red-800 h-full z-10 border-r border-red-500/50">
        <Zap className="h-3.5 w-3.5" />
        <span className="text-[11px] font-black uppercase tracking-widest whitespace-nowrap">Breaking</span>
      </div>
      <div className="flex-1 overflow-hidden">
        <div
          ref={tickerRef}
          className="flex gap-10 whitespace-nowrap animate-marquee"
          style={{ animationDuration: `${Math.max(30, items.length * 8)}s` }}
        >
          {[...items, ...items].map((article, i) => (
            <a
              key={`${article.link}-${i}`}
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[12px] font-medium hover:text-red-100 transition-colors"
              data-testid={`ticker-item-${i}`}
            >
              <span className="text-red-300/70">•</span>
              {article.title.length > 90 ? article.title.slice(0, 90) + "…" : article.title}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

function HeroCard({ article, accentColor }: { article: EditorialArticle; accentColor?: string }) {
  const [imgError, setImgError] = useState(false);
  return (
    <a
      href={article.link}
      target="_blank"
      rel="noopener noreferrer"
      className="group block relative overflow-hidden rounded-2xl border border-white/10 bg-[#111120] col-span-2 row-span-2 min-h-[320px]"
      data-testid="news-hero-card"
    >
      <div className="absolute inset-0">
        <img
          src={(!imgError && article.imageUrl) ? article.imageUrl : PLACEHOLDER}
          alt={article.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          onError={() => setImgError(true)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a15] via-[#0a0a15]/60 to-transparent" />
      </div>
      <div className="relative h-full flex flex-col justify-end p-5 md:p-7">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <SourceBadge article={article} accentColor={accentColor} />
          {article.sourceType === "x" && article.authorHandle && (
            <span className="text-[10px] text-white/50 font-mono">{article.authorHandle}</span>
          )}
        </div>
        <h2 className="text-lg md:text-2xl font-black text-white leading-tight group-hover:text-red-300 transition-colors line-clamp-3 mb-3">
          {article.title}
        </h2>
        {article.description && article.sourceType !== "x" && (
          <p className="text-sm text-white/60 line-clamp-2 mb-3 leading-relaxed">{article.description}</p>
        )}
        <div className="flex items-center gap-4 text-[11px] text-white/40">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatTime(article.pubDate)}
          </span>
          {article.sourceType === "x" && article.likeCount !== undefined && (
            <>
              <span className="flex items-center gap-1">
                <Heart className="h-3 w-3 text-rose-400/70" />
                {article.likeCount.toLocaleString()}
              </span>
              {article.retweetCount !== undefined && (
                <span className="flex items-center gap-1">
                  <Repeat2 className="h-3 w-3 text-green-400/70" />
                  {article.retweetCount.toLocaleString()}
                </span>
              )}
            </>
          )}
          <ExternalLink className="h-3 w-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    </a>
  );
}

function SecondaryCard({ article, accentColor }: { article: EditorialArticle; accentColor?: string }) {
  const [imgError, setImgError] = useState(false);
  return (
    <a
      href={article.link}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/10 transition-all duration-200 overflow-hidden p-3"
      data-testid={`news-secondary-card-${encodeURIComponent(article.link).slice(0, 20)}`}
    >
      <div className="shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-white/5">
        <img
          src={(!imgError && article.imageUrl) ? article.imageUrl : PLACEHOLDER}
          alt={article.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={() => setImgError(true)}
        />
      </div>
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <p className="text-xs font-semibold text-white/90 line-clamp-3 leading-snug group-hover:text-red-300 transition-colors">
          {article.title}
        </p>
        <div className="flex items-center gap-2 mt-1.5">
          <SourceBadge article={article} accentColor={accentColor} />
          <span className="text-[10px] text-white/30 ml-auto">{formatTime(article.pubDate)}</span>
        </div>
      </div>
    </a>
  );
}

function GridCard({ article, accentColor }: { article: EditorialArticle; accentColor?: string }) {
  const [imgError, setImgError] = useState(false);
  return (
    <a
      href={article.link}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-xl border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/10 transition-all duration-200 overflow-hidden"
      data-testid={`news-grid-card-${encodeURIComponent(article.link).slice(0, 20)}`}
    >
      <div className="relative aspect-video overflow-hidden bg-white/5">
        <img
          src={(!imgError && article.imageUrl) ? article.imageUrl : PLACEHOLDER}
          alt={article.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={() => setImgError(true)}
        />
        <div className="absolute top-2 left-2">
          <SourceBadge article={article} accentColor={accentColor} />
        </div>
      </div>
      <div className="p-3">
        <p className="text-xs font-semibold text-white/90 line-clamp-2 leading-snug group-hover:text-red-300 transition-colors mb-1.5">
          {article.title}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-white/30">{article.source}</span>
          <span className="text-[10px] text-white/30">{formatTime(article.pubDate)}</span>
        </div>
        {article.sourceType === "x" && article.likeCount !== undefined && (
          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-white/30">
            <span className="flex items-center gap-1">
              <Heart className="h-2.5 w-2.5 text-rose-400/60" />
              {article.likeCount.toLocaleString()}
            </span>
            {article.retweetCount !== undefined && (
              <span className="flex items-center gap-1">
                <Repeat2 className="h-2.5 w-2.5 text-green-400/60" />
                {article.retweetCount.toLocaleString()}
              </span>
            )}
          </div>
        )}
      </div>
    </a>
  );
}

function LiveXTweet({ tweet }: { tweet: Tweet }) {
  return (
    <a
      href={tweet.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-xl border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/10 transition-all p-3"
      data-testid={`live-x-tweet-${tweet.id}`}
    >
      <div className="flex items-start gap-2 mb-2">
        <Avatar className="h-7 w-7 shrink-0">
          {tweet.authorAvatarUrl && <AvatarImage src={tweet.authorAvatarUrl} />}
          <AvatarFallback className="text-[10px] font-bold bg-white/10 text-white/80">
            {tweet.authorName.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-white/90 truncate">{tweet.authorName}</p>
          <p className="text-[10px] text-white/40 truncate">{tweet.authorHandle}</p>
        </div>
        <SiX className="h-3 w-3 text-white/20 shrink-0" />
      </div>
      <p className="text-[11px] text-white/70 leading-relaxed line-clamp-4">
        {tweet.text.length > 240 ? tweet.text.slice(0, 240) + "…" : tweet.text}
      </p>
      <div className="flex items-center gap-3 mt-2 text-[10px] text-white/30">
        <span className="flex items-center gap-1">
          <Heart className="h-2.5 w-2.5 text-rose-400/50" />
          {tweet.likeCount.toLocaleString()}
        </span>
        <span className="flex items-center gap-1">
          <Repeat2 className="h-2.5 w-2.5 text-green-400/50" />
          {tweet.retweetCount.toLocaleString()}
        </span>
        <span className="ml-auto">{formatTime(tweet.createdAt)}</span>
      </div>
    </a>
  );
}

function CategoryTabBar({
  categories,
  activeId,
  onSelect,
}: {
  categories: NewsCategory[];
  activeId: number;
  onSelect: (id: number) => void;
}) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-0.5 flex-wrap" data-testid="news-category-tabs">
      {categories.map((cat) => {
        const isActive = cat.id === activeId;
        return (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            className="shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 border"
            style={
              isActive
                ? {
                    backgroundColor: cat.accentColor ? `${cat.accentColor}22` : "rgba(249,115,22,0.15)",
                    borderColor: cat.accentColor ? `${cat.accentColor}55` : "rgba(249,115,22,0.4)",
                    color: cat.accentColor || "#BE0000",
                  }
                : {
                    backgroundColor: "transparent",
                    borderColor: "rgba(255,255,255,0.08)",
                    color: "rgba(255,255,255,0.45)",
                  }
            }
            data-testid={`tab-category-${cat.id}`}
          >
            {cat.name}
          </button>
        );
      })}
    </div>
  );
}

function NewsEditorialSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-9 w-full rounded-none" />
      <div className="px-4 md:px-6 max-w-7xl mx-auto space-y-4">
        <div className="flex gap-2 flex-wrap">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-20 rounded-full" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <Skeleton className="md:col-span-2 md:row-span-2 h-80 rounded-2xl" />
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      </div>
    </div>
  );
}

interface NewsEditorialProps {
  newsCategories: NewsCategory[];
  xHandles?: string[];
  xMaxTweets?: number;
  xEnabled?: boolean;
}

export function NewsEditorial({
  newsCategories,
  xHandles = [],
  xMaxTweets = 8,
  xEnabled = false,
}: NewsEditorialProps) {
  const [activeCatId, setActiveCatId] = useState<number | null>(null);

  const activeCategory =
    newsCategories.find((c) => c.id === activeCatId) ?? newsCategories[0] ?? null;

  useEffect(() => {
    if (newsCategories.length > 0 && activeCatId === null) {
      setActiveCatId(newsCategories[0].id);
    }
  }, [newsCategories, activeCatId]);

  const { data: articles = [], isLoading: articlesLoading } = useQuery<EditorialArticle[]>({
    queryKey: ["/api/news/x-feed", activeCategory?.name, 15],
    queryFn: () =>
      fetch(
        `/api/news/x-feed?category=${encodeURIComponent(activeCategory?.name ?? "")}&limit=15`
      ).then((r) => r.json()),
    enabled: !!activeCategory,
    staleTime: 10 * 60 * 1000,
  });

  const { data: tweets = [], isLoading: tweetsLoading } = useQuery<Tweet[]>({
    queryKey: ["/api/social/x/feed", { limit: xMaxTweets }],
    queryFn: async () => {
      const res = await fetch(`/api/social/x/feed?limit=${xMaxTweets}`);
      if (!res.ok) throw new Error("Failed to fetch X feed");
      return res.json();
    },
    enabled: xEnabled && xHandles.length > 0,
    staleTime: 10 * 60 * 1000,
  });

  if (newsCategories.length === 0) return null;

  if (articlesLoading && !articles.length) {
    return <NewsEditorialSkeleton />;
  }

  const accentColor = activeCategory?.accentColor ?? undefined;
  const heroArticle = articles[0] ?? null;
  const secondaryArticles = articles.slice(1, 4);
  const gridArticles = articles.slice(4, 13);

  return (
    <div
      className="bg-[#08080f] text-white border-y border-white/[0.06]"
      data-testid="section-news-editorial"
    >
      {/* Breaking ticker */}
      {articles.length > 0 && <BreakingTicker articles={articles} />}

      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-6 pb-4">
        <div className="flex items-end justify-between mb-4 flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-red-500" />
              <span className="text-[11px] font-black uppercase tracking-widest text-red-500">News & Now</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white leading-tight">
              What's happening.
            </h2>
          </div>
          <Badge
            variant="outline"
            className="border-white/10 text-white/40 text-[10px] font-semibold hidden sm:inline-flex items-center gap-1"
          >
            <SiX className="h-2.5 w-2.5" />
            Powered by X
          </Badge>
        </div>

        {/* Category tabs */}
        {newsCategories.length > 1 && (
          <CategoryTabBar
            categories={newsCategories}
            activeId={activeCatId ?? newsCategories[0].id}
            onSelect={(id) => setActiveCatId(id)}
          />
        )}
      </div>

      {/* Main grid */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 pb-8">
        {articlesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <Skeleton className="md:col-span-2 md:row-span-2 h-72 rounded-2xl" />
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
        ) : articles.length === 0 ? (
          <p className="text-sm text-white/40 py-10 text-center">No articles available right now.</p>
        ) : (
          <div className="flex gap-5 flex-col lg:flex-row">
            {/* Left: editorial grid */}
            <div className="flex-1 min-w-0">
              {/* Hero + secondary 3-up */}
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-4 mb-4">
                {heroArticle && (
                  <div className="md:col-span-2 md:row-span-2">
                    <HeroCard article={heroArticle} accentColor={accentColor} />
                  </div>
                )}
                <div className="flex flex-col gap-3">
                  {secondaryArticles.map((a) => (
                    <SecondaryCard key={a.link} article={a} accentColor={accentColor} />
                  ))}
                </div>
              </div>

              {/* Secondary grid */}
              {gridArticles.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {gridArticles.map((a) => (
                    <GridCard key={a.link} article={a} accentColor={accentColor} />
                  ))}
                </div>
              )}
            </div>

            {/* Right: Live from X column */}
            {xEnabled && (tweetsLoading || tweets.length > 0) && (
              <div className="lg:w-72 xl:w-80 shrink-0" data-testid="live-x-sidebar">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-6 w-6 rounded-md bg-white/10 flex items-center justify-center">
                    <SiX className="h-3.5 w-3.5 text-white/80" />
                  </div>
                  <span className="text-xs font-bold text-white/60 uppercase tracking-widest">Live from X</span>
                  <span className="ml-auto flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-[10px] text-white/30 font-medium">Live</span>
                  </span>
                </div>
                {xHandles.length > 0 && (
                  <div className="flex gap-1.5 mb-3 flex-wrap">
                    {xHandles.map((h) => (
                      <span
                        key={h}
                        className="text-[10px] font-mono text-white/40 border border-white/[0.07] px-2 py-0.5 rounded-full"
                      >
                        @{h}
                      </span>
                    ))}
                  </div>
                )}
                <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
                  {tweetsLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-24 rounded-xl" />
                    ))
                  ) : (
                    tweets.slice(0, xMaxTweets).map((tweet) => (
                      <LiveXTweet key={tweet.id} tweet={tweet} />
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee linear infinite;
        }
      `}</style>
    </div>
  );
}
