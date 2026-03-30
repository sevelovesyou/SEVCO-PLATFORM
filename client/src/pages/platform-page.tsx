import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHead } from "@/components/page-head";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import {
  Zap, Wrench, TrendingUp, MoreHorizontal, ArrowRight,
  Search, X, CheckCircle2, Activity, ChevronDown, Radio,
  Rocket, Settings, Package,
} from "lucide-react";
import { SiX } from "react-icons/si";
import { formatDistanceToNow } from "date-fns";
import type { Changelog, ChangelogCategory } from "@shared/schema";

const CATEGORY_META: Record<ChangelogCategory, {
  label: string;
  bg: string;
  text: string;
  border: string;
  icon: React.ElementType;
}> = {
  feature:     { label: "Feature",     bg: "bg-blue-500/10",   text: "text-blue-400",   border: "border-blue-500/20",   icon: Zap },
  fix:         { label: "Fix",         bg: "bg-red-500/10",    text: "text-red-400",    border: "border-red-500/20",    icon: Wrench },
  improvement: { label: "Improvement", bg: "bg-green-500/10",  text: "text-green-400",  border: "border-green-500/20",  icon: TrendingUp },
  other:       { label: "Other",       bg: "bg-white/5",       text: "text-white/40",   border: "border-white/10",      icon: MoreHorizontal },
};

const CATEGORY_FILTERS: { value: ChangelogCategory | "all"; label: string }[] = [
  { value: "all",         label: "All" },
  { value: "feature",     label: "Features" },
  { value: "fix",         label: "Fixes" },
  { value: "improvement", label: "Improvements" },
  { value: "other",       label: "Other" },
];

function formatDate(dateStr: string | Date) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateFull(dateStr: string | Date) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatRelative(dateStr: string | Date) {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  } catch {
    return formatDate(dateStr);
  }
}

function AnimatedCounter({ target, duration = 1800 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const started = useRef(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (target === 0 || started.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const start = performance.now();
        const step = (now: number) => {
          const t = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - t, 3);
          setCount(Math.floor(eased * target));
          if (t < 1) requestAnimationFrame(step);
          else setCount(target);
        };
        requestAnimationFrame(step);
        observer.disconnect();
      }
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return <span ref={ref}>{count}</span>;
}

function FeatureCard({ entry }: { entry: Changelog }) {
  const meta = CATEGORY_META[entry.category as ChangelogCategory] ?? CATEGORY_META.other;
  const IconComp = meta.icon;
  return (
    <div
      className="flex-shrink-0 w-72 flex flex-col bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5 hover:bg-white/[0.07] hover:border-white/[0.14] hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 cursor-default"
      data-testid={`card-feature-${entry.id}`}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${meta.bg} ${meta.text} ${meta.border}`}>
          <IconComp className="h-2.5 w-2.5" />
          {meta.label}
        </span>
        {entry.version && (
          <span className="inline-block text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border bg-white/5 text-white/40 border-white/10">
            v{entry.version}
          </span>
        )}
      </div>
      <p className="text-sm font-semibold text-white leading-snug mb-1.5" data-testid={`text-feature-title-${entry.id}`}>
        {entry.title}
      </p>
      <p className="text-xs text-white/50 leading-relaxed line-clamp-3 mb-3" data-testid={`text-feature-desc-${entry.id}`}>
        {entry.description}
      </p>
      <div className="mt-auto pt-3 flex items-center justify-between">
        <span className="text-[10px] text-white/30">{formatRelative(entry.createdAt)}</span>
        {entry.wikiSlug && (
          <Link href={`/wiki/${entry.wikiSlug}`}>
            <span className="inline-flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 font-medium transition-colors" data-testid={`link-feature-wiki-${entry.id}`}>
              Read more <ArrowRight className="h-2.5 w-2.5" />
            </span>
          </Link>
        )}
      </div>
    </div>
  );
}

export default function PlatformPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<ChangelogCategory | "all">("all");

  const { data: entries, isLoading } = useQuery<Changelog[]>({
    queryKey: ["/api/changelog"],
  });

  const featureSpotlight = useMemo(() => {
    if (!entries) return [];
    return entries
      .filter((e) => e.category === "feature")
      .slice(0, 5);
  }, [entries]);

  const filteredEntries = useMemo(() => {
    if (!entries) return [];
    return entries.filter((entry) => {
      const matchesFilter = activeFilter === "all" || entry.category === activeFilter;
      const q = search.trim().toLowerCase();
      const matchesSearch = !q
        || entry.title.toLowerCase().includes(q)
        || entry.description.toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [entries, search, activeFilter]);

  const grouped = useMemo(() => {
    return filteredEntries.reduce<Record<string, Changelog[]>>((acc, entry) => {
      const year = new Date(entry.createdAt).getFullYear().toString();
      if (!acc[year]) acc[year] = [];
      acc[year].push(entry);
      return acc;
    }, {});
  }, [filteredEntries]);

  const years = Object.keys(grouped).sort((a, b) => Number(b) - Number(a));

  const totalUpdates = entries?.length ?? 0;
  const totalFeatures = entries?.filter((e) => e.category === "feature").length ?? 0;
  const totalFixes = entries?.filter((e) => e.category === "fix" || e.category === "improvement").length ?? 0;

  const timelineRef = useRef<HTMLDivElement>(null);
  function scrollToTimeline() {
    timelineRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="min-h-screen bg-[#080a0f] text-white">
      <PageHead
        title="Platform Updates — SEVCO"
        description="See every feature, fix, and improvement shipped to the SEVCO Platform. Updated constantly."
        ogUrl="https://sevco.us/platform"
      />

      {/* Aurora blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full bg-red-700/[0.08] blur-[120px]" />
        <div className="absolute top-1/3 right-0 w-[500px] h-[500px] rounded-full bg-indigo-700/[0.07] blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] rounded-full bg-emerald-700/[0.05] blur-[120px]" />
      </div>

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative z-10 px-4 sm:px-6 pt-24 pb-16 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-white/[0.05] border border-white/[0.08] rounded-full px-3.5 py-1.5 mb-6">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
          </span>
          <span className="text-[11px] font-medium text-white/60 tracking-wide uppercase">Live Platform</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight mb-5 leading-[1.05]" data-testid="text-hero-headline">
          SEVCO is always
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-600">
            evolving.
          </span>
        </h1>

        <p className="text-base sm:text-lg text-white/50 max-w-xl mx-auto mb-9 leading-relaxed" data-testid="text-hero-subheadline">
          We ship constantly. Every new feature, fix, and improvement to the SEVCO Platform — documented here.
          {!user && " Join us to use it all."}
        </p>

        {!user && (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-4" data-testid="hero-cta-group">
            <a href="/auth?mode=register" data-testid="button-hero-signup">
              <Button size="lg" variant="destructive" className="font-semibold px-8 h-11">
                Create Free Account
              </Button>
            </a>
            <a href="/api/auth/twitter" data-testid="button-hero-x-signin">
              <Button size="lg" variant="outline" className="font-semibold px-7 h-11 gap-2 bg-transparent border-white/20 text-white hover:bg-white/10 hover:text-white">
                <SiX className="h-4 w-4" />
                Sign in with X
              </Button>
            </a>
          </div>
        )}
        {!user && (
          <p className="text-xs text-white/30 mb-10">
            Already have an account?{" "}
            <Link href="/auth" className="text-white/60 hover:text-white underline underline-offset-2 transition-colors" data-testid="link-signin">
              Sign in →
            </Link>
          </p>
        )}

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto mt-4">
          {[
            { label: "Updates Shipped", value: totalUpdates, suffix: "" },
            { label: "New Features",    value: totalFeatures, suffix: "" },
            { label: "Fixes & Improvements", value: totalFixes, suffix: "" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 text-center"
              data-testid={`stat-${stat.label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <div className="text-2xl font-black text-white mb-0.5">
                {isLoading ? <Skeleton className="h-7 w-10 mx-auto bg-white/10" /> : (
                  <><AnimatedCounter target={stat.value} />{stat.suffix}</>
                )}
              </div>
              <div className="text-[10px] text-white/40 leading-tight">{stat.label}</div>
            </div>
          ))}
          <div
            className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 text-center"
            data-testid="stat-maintained"
          >
            <div className="flex items-center justify-center gap-1.5 mb-0.5">
              <CheckCircle2 className="h-5 w-5 text-green-400" />
            </div>
            <div className="text-[10px] text-white/40 leading-tight">Actively Maintained</div>
          </div>
        </div>
      </section>

      {/* ── WHAT'S NEW SPOTLIGHT ─────────────────────────────── */}
      {(isLoading || featureSpotlight.length > 0) && (
        <section className="relative z-10 px-4 sm:px-6 py-12 max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-white" data-testid="text-whats-new-heading">What&apos;s New</h2>
              <span className="inline-flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-400" />
                </span>
                Live
              </span>
            </div>
            <button
              onClick={scrollToTimeline}
              className="text-xs text-white/40 hover:text-white/70 transition-colors flex items-center gap-1"
              data-testid="button-see-all-updates"
            >
              See all {totalUpdates} updates ↓
            </button>
          </div>

          {isLoading ? (
            <div className="flex gap-4 overflow-hidden">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex-shrink-0 w-72 bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5">
                  <Skeleton className="h-4 w-24 mb-3 bg-white/10" />
                  <Skeleton className="h-4 w-full mb-1 bg-white/10" />
                  <Skeleton className="h-3 w-4/5 bg-white/10" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto py-3 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10 snap-x snap-mandatory">
              {featureSpotlight.map((entry) => (
                <div key={entry.id} className="snap-start">
                  <FeatureCard entry={entry} />
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── TIMELINE ─────────────────────────────────────────── */}
      <section
        ref={timelineRef}
        className="relative z-10 px-4 sm:px-6 py-12 max-w-5xl mx-auto"
        data-testid="section-timeline"
      >
        <h2 className="text-xl font-bold text-white mb-6" data-testid="text-timeline-heading">Full Update History</h2>

        {/* Search + filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search updates…"
              className="pl-9 pr-9 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/30 focus-visible:ring-white/20 h-10"
              data-testid="input-search-updates"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                data-testid="button-clear-search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {CATEGORY_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setActiveFilter(f.value)}
                className={`text-xs font-medium px-3.5 py-1.5 rounded-full border transition-all ${
                  activeFilter === f.value
                    ? "bg-white/10 border-white/20 text-white"
                    : "bg-transparent border-white/[0.08] text-white/40 hover:border-white/20 hover:text-white/70"
                }`}
                data-testid={`filter-${f.value}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-5">
                <div className="flex flex-col items-center pt-1">
                  <Skeleton className="h-3 w-3 rounded-full bg-white/10" />
                  <Skeleton className="w-px flex-1 mt-2 bg-white/10" />
                </div>
                <div className="flex-1 pb-6">
                  <Skeleton className="h-3.5 w-16 mb-2 bg-white/10" />
                  <Skeleton className="h-4 w-2/3 mb-1.5 bg-white/10" />
                  <Skeleton className="h-3 w-full bg-white/10" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="text-center py-20 text-white/30" data-testid="text-no-results">
            <Activity className="h-8 w-8 mx-auto mb-3 opacity-30" />
            <p className="text-sm mb-2">
              {search ? `No updates matching "${search}"` : "No updates in this category."}
            </p>
            {(search || activeFilter !== "all") && (
              <button
                onClick={() => { setSearch(""); setActiveFilter("all"); }}
                className="text-xs text-white/40 hover:text-white/70 underline transition-colors"
                data-testid="button-clear-filters"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-10">
            {years.map((year) => (
              <div key={year} data-testid={`section-year-${year}`}>
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-xs font-bold text-white/30 uppercase tracking-[0.15em]">{year}</span>
                  <div className="flex-1 h-px bg-white/[0.06]" />
                </div>
                <div className="flex flex-col">
                  {grouped[year].map((entry, idx) => {
                    const meta = CATEGORY_META[entry.category as ChangelogCategory] ?? CATEGORY_META.other;
                    const IconComp = meta.icon;
                    const isLast = idx === grouped[year].length - 1;
                    return (
                      <div key={entry.id} className="flex gap-5" data-testid={`row-entry-${entry.id}`}>
                        {/* Timeline line + dot */}
                        <div className="flex flex-col items-center pt-1 shrink-0">
                          <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 border ${meta.bg} ${meta.border}`}>
                            <IconComp className={`h-3 w-3 ${meta.text}`} />
                          </div>
                          {!isLast && <div className="w-px flex-1 bg-white/[0.06] mt-1" />}
                        </div>
                        {/* Content */}
                        <div className={`flex-1 bg-white/[0.02] border border-white/[0.05] rounded-xl px-5 py-4 ${isLast ? "mb-0" : "mb-5"}`}>
                          <div className="flex items-center flex-wrap gap-2 mb-1.5">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${meta.bg} ${meta.text} ${meta.border}`} data-testid={`badge-entry-category-${entry.id}`}>
                              <IconComp className="h-2.5 w-2.5" />
                              {meta.label}
                            </span>
                            {entry.version && (
                              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border bg-white/5 text-white/40 border-white/10" data-testid={`badge-entry-version-${entry.id}`}>
                                v{entry.version}
                              </span>
                            )}
                            <span className="text-[10px] text-white/30">{formatDate(entry.createdAt)}</span>
                          </div>
                          <p className="text-sm font-semibold text-white leading-snug mb-1" data-testid={`text-entry-title-${entry.id}`}>
                            {entry.title}
                          </p>
                          <p className="text-xs text-white/50 leading-relaxed" data-testid={`text-entry-desc-${entry.id}`}>
                            {entry.description}
                          </p>
                          {entry.wikiSlug && (
                            <Link href={`/wiki/${entry.wikiSlug}`}>
                              <span className="inline-flex items-center gap-1 mt-2 text-[11px] text-blue-400 hover:text-blue-300 font-medium transition-colors" data-testid={`link-entry-wiki-${entry.id}`}>
                                Read more <ArrowRight className="h-2.5 w-2.5" />
                              </span>
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── BOTTOM CTA ───────────────────────────────────────── */}
      {!user && (
        <section className="relative z-10 px-4 sm:px-6 py-20" data-testid="section-bottom-cta">
          <div className="max-w-3xl mx-auto text-center bg-white/[0.03] border border-white/[0.07] rounded-3xl p-12">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-4 text-white" data-testid="text-cta-heading">
              Everything above is just<br className="hidden sm:block" /> the beginning.
            </h2>
            <p className="text-white/50 text-base mb-8 max-w-md mx-auto leading-relaxed">
              New features ship every week. Sign up free to use the Wiki, Store, Music, AI Tools, Email — everything. Or jump in instantly with your X account.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-5">
              <a href="/auth?mode=register" data-testid="button-cta-signup">
                <Button size="lg" variant="destructive" className="font-semibold px-8 h-11">
                  Get Started Free
                </Button>
              </a>
              <a href="/api/auth/twitter" data-testid="button-cta-x-signin">
                <Button size="lg" variant="outline" className="font-semibold px-7 h-11 gap-2 bg-transparent border-white/20 text-white hover:bg-white/10 hover:text-white">
                  <SiX className="h-4 w-4" />
                  Continue with X
                </Button>
              </a>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
