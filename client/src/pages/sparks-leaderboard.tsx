import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Trophy, ArrowLeft, User, FileText, Images, Music, ShoppingBag, FolderKanban, Wrench, Sparkles, type LucideIcon } from "lucide-react";
import { SparkIcon } from "@/components/spark-icon";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { resolveImageUrl } from "@/lib/resolve-image-url";

type LeaderboardData = {
  topCreators: {
    userId: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    sparksReceived: number;
  }[];
  topPosts: {
    id: number;
    content: string;
    authorUsername: string;
    authorDisplayName: string | null;
    sparksReceived: number;
  }[];
  topContent: {
    id: number;
    title: string;
    contentType: "article" | "gallery" | "track" | "product" | "project" | "service";
    slug?: string | null;
    sparksReceived: number;
  }[];
};

type ContentTypeMeta = {
  label: string;
  icon: LucideIcon;
  badgeClass: string;
  href: (item: { id: number; slug?: string | null }) => string;
};

const CONTENT_TYPE_META: Record<LeaderboardData["topContent"][0]["contentType"], ContentTypeMeta> = {
  article: {
    label: "Article",
    icon: FileText,
    badgeClass: "bg-blue-400/10 text-blue-500",
    href: ({ id, slug }) => (slug ? `/wiki/${slug}` : `/wiki/${id}`),
  },
  gallery: {
    label: "Gallery",
    icon: Images,
    badgeClass: "bg-purple-400/10 text-purple-500",
    href: () => `/gallery`,
  },
  track: {
    label: "Track",
    icon: Music,
    badgeClass: "bg-red-400/10 text-red-500",
    href: ({ id }) => `/music/listen#track-${id}`,
  },
  product: {
    label: "Product",
    icon: ShoppingBag,
    badgeClass: "bg-green-400/10 text-green-500",
    href: ({ id, slug }) => (slug ? `/store/products/${slug}` : `/store`),
  },
  project: {
    label: "Project",
    icon: FolderKanban,
    badgeClass: "bg-indigo-400/10 text-indigo-500",
    href: ({ id, slug }) => (slug ? `/projects/${slug}` : `/projects`),
  },
  service: {
    label: "Service",
    icon: Wrench,
    badgeClass: "bg-cyan-400/10 text-cyan-500",
    href: ({ id, slug }) => (slug ? `/services/${slug}` : `/services`),
  },
};

const FALLBACK_CONTENT_META: ContentTypeMeta = {
  label: "Content",
  icon: Sparkles,
  badgeClass: "bg-muted text-muted-foreground",
  href: () => `/`,
};

function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    startTimeRef.current = null;
    const animate = (ts: number) => {
      if (startTimeRef.current === null) startTimeRef.current = ts;
      const elapsed = ts - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration]);

  return value;
}

const RANK_STYLES: Record<number, { badge: string; label: string; shimmer: boolean }> = {
  1: { badge: "bg-gradient-to-r from-yellow-400 to-amber-500 text-yellow-900", label: "Gold", shimmer: true },
  2: { badge: "bg-gradient-to-r from-slate-300 to-slate-400 text-slate-800", label: "Silver", shimmer: true },
  3: { badge: "bg-gradient-to-r from-amber-600 to-amber-700 text-amber-100", label: "Bronze", shimmer: true },
};

function RankBadge({ rank }: { rank: number }) {
  const style = RANK_STYLES[rank];
  if (!style) {
    return (
      <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-muted text-muted-foreground text-xs font-bold shrink-0">
        {rank}
      </span>
    );
  }
  return (
    <span
      className={`relative inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-black shrink-0 overflow-hidden ${style.badge}`}
    >
      {style.shimmer && (
        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2s_ease-in-out_infinite] translate-x-[-100%]" />
      )}
      <span className="relative z-10">{rank}</span>
    </span>
  );
}

function AnimatedCount({ value }: { value: number }) {
  const display = useCountUp(value);
  return <span>{display.toLocaleString()}</span>;
}

function CreatorCard({ creator, rank }: { creator: LeaderboardData["topCreators"][0]; rank: number }) {
  const isTop3 = rank <= 3;
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
        isTop3 ? "border-yellow-400/30 bg-yellow-400/5" : "border-border bg-card"
      }`}
      data-testid={`leaderboard-creator-${creator.userId}`}
    >
      <RankBadge rank={rank} />
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={resolveImageUrl(creator.avatarUrl)} />
        <AvatarFallback className="text-xs">
          {(creator.displayName || creator.username).charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold truncate">{creator.displayName || creator.username}</p>
        <p className="text-xs text-muted-foreground truncate">@{creator.username}</p>
      </div>
      <div className="flex items-center gap-1 text-yellow-500 font-bold text-sm shrink-0">
        <SparkIcon size="md" decorative />
        <AnimatedCount value={creator.sparksReceived} />
      </div>
    </div>
  );
}

function PostCard({ post, rank }: { post: LeaderboardData["topPosts"][0]; rank: number }) {
  const isTop3 = rank <= 3;
  return (
    <Link href="/social">
      <div
        className={`flex items-start gap-3 px-4 py-3 rounded-xl border cursor-pointer hover:bg-muted/30 transition-colors ${
          isTop3 ? "border-yellow-400/30 bg-yellow-400/5" : "border-border bg-card"
        }`}
        data-testid={`leaderboard-post-${post.id}`}
      >
        <RankBadge rank={rank} />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-foreground line-clamp-2">{post.content}</p>
          <p className="text-xs text-muted-foreground mt-1">
            by @{post.authorUsername}
          </p>
        </div>
        <div className="flex items-center gap-1 text-yellow-500 font-bold text-sm shrink-0">
          <SparkIcon size="md" decorative />
          <AnimatedCount value={post.sparksReceived} />
        </div>
      </div>
    </Link>
  );
}

function ContentCard({ item, rank }: { item: LeaderboardData["topContent"][0]; rank: number }) {
  const isTop3 = rank <= 3;
  const meta = CONTENT_TYPE_META[item.contentType] ?? FALLBACK_CONTENT_META;
  const Icon = meta.icon;
  const href = meta.href({ id: item.id, slug: item.slug });
  return (
    <Link href={href}>
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer hover:bg-muted/30 transition-colors ${
          isTop3 ? "border-yellow-400/30 bg-yellow-400/5" : "border-border bg-card"
        }`}
        data-testid={`leaderboard-content-${item.contentType}-${item.id}`}
      >
        <RankBadge rank={rank} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{item.title}</p>
          <Badge
            variant="secondary"
            className={`mt-1 text-[10px] px-1.5 py-0 h-4 ${meta.badgeClass}`}
          >
            <Icon className="h-2.5 w-2.5 mr-0.5" />
            {meta.label}
          </Badge>
        </div>
        <div className="flex items-center gap-1 text-yellow-500 font-bold text-sm shrink-0">
          <SparkIcon size="md" decorative />
          <AnimatedCount value={item.sparksReceived} />
        </div>
      </div>
    </Link>
  );
}

function SectionSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-xl" />
      ))}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="text-center py-10 text-muted-foreground text-sm">
      No {label} sparked yet. Be the first!
    </div>
  );
}

export default function SparksLeaderboard() {
  const [period, setPeriod] = useState<"month" | "all">("month");

  const { data, isLoading } = useQuery<LeaderboardData>({
    queryKey: ["/api/sparks/leaderboard", period],
    queryFn: async () => {
      const res = await fetch(`/api/sparks/leaderboard?period=${period}`);
      if (!res.ok) throw new Error("Failed to fetch leaderboard");
      return res.json();
    },
    staleTime: 60_000,
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-8" data-testid="sparks-leaderboard-page">
      <div>
        <Link href="/sparks">
          <Button variant="ghost" size="sm" className="gap-1.5 mb-4 -ml-2 text-muted-foreground hover:text-foreground" data-testid="link-back-to-sparks">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Sparks
          </Button>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-end gap-4 justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="h-7 w-7 text-yellow-400" />
              <h1 className="text-2xl font-black tracking-tight">Sparks Leaderboard</h1>
            </div>
            <p className="text-sm text-muted-foreground">Top creators and most-sparked content on the platform.</p>
          </div>

          <div className="flex items-center gap-1 bg-muted rounded-lg p-1 self-start sm:self-auto shrink-0" data-testid="period-switcher">
            <button
              onClick={() => setPeriod("month")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                period === "month" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid="button-period-month"
            >
              This Month
            </button>
            <button
              onClick={() => setPeriod("all")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                period === "all" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid="button-period-all"
            >
              All Time
            </button>
          </div>
        </div>
      </div>

      <section>
        <div className="flex items-center gap-2 mb-3">
          <User className="h-4 w-4 text-yellow-400" />
          <h2 className="text-base font-bold">Top Creators</h2>
          <span className="text-xs text-muted-foreground">by sparks received</span>
        </div>
        {isLoading ? (
          <SectionSkeleton />
        ) : !data?.topCreators.length ? (
          <EmptyState label="creators" />
        ) : (
          <div className="flex flex-col gap-2">
            {data.topCreators.map((creator, i) => (
              <CreatorCard key={creator.userId} creator={creator} rank={i + 1} />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center gap-2 mb-3">
          <SparkIcon size="lg" decorative />
          <h2 className="text-base font-bold">Top Posts</h2>
          <span className="text-xs text-muted-foreground">most sparked</span>
        </div>
        {isLoading ? (
          <SectionSkeleton />
        ) : !data?.topPosts.length ? (
          <EmptyState label="posts" />
        ) : (
          <div className="flex flex-col gap-2">
            {data.topPosts.map((post, i) => (
              <PostCard key={post.id} post={post} rank={i + 1} />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center gap-2 mb-3">
          <FileText className="h-4 w-4 text-blue-400" />
          <h2 className="text-base font-bold">Top Content</h2>
          <span className="text-xs text-muted-foreground">most sparked</span>
        </div>
        {isLoading ? (
          <SectionSkeleton />
        ) : !data?.topContent.length ? (
          <EmptyState label="content" />
        ) : (
          <div className="flex flex-col gap-2">
            {data.topContent.map((item, i) => (
              <ContentCard key={`${item.contentType}-${item.id}`} item={item} rank={i + 1} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
