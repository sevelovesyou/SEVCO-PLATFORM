import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { PageShader } from "@/components/page-shader";
import { StaggerGrid } from "@/components/stagger-grid";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { SparkButton } from "@/components/spark-button";
import { SparkIcon } from "@/components/spark-icon";
import { useToast } from "@/hooks/use-toast";
import { PageHead } from "@/components/page-head";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import * as LucideIcons from "lucide-react";
import {
  BookOpen, ShoppingBag, Music, Folder, Briefcase,
  ArrowRight, Users, Star, ChevronRight, Pin,
  Zap, Globe, Layers, CheckCircle, Code2,
  Palette, BarChart3, Megaphone, Camera, Building2,
  TrendingUp, Newspaper, Wrench, MoreHorizontal,
  Link2, Download, Images,
} from "lucide-react";
import { SiDiscord, SiSpotify, SiApplemusic } from "react-icons/si";
import type { Article, Product, FeedPost, Project, ChangelogCategory, MusicTrack } from "@shared/schema";
import { useMusicPlayer } from "@/contexts/music-player-context";
import { articleUrl } from "@/lib/wiki-urls";
import { DEFAULT_SECTION_ORDER } from "@shared/section-order";
import { motion } from "framer-motion";
import { trackCtaClick } from "@/lib/analytics-tracker";
import { HomeNewsAndMarkets } from "@/components/home-news-markets";
import { UserSnapshotPanel } from "@/components/user-snapshot-panel";
import { formatDistanceToNow } from "date-fns";
import planetIconWhite from "@assets/SEVCO_App_Icon_-_Artboard_71_1774998179682.png";
import { resolveImageUrl } from "@/lib/resolve-image-url";
import { SevcoLogo } from "@/components/sevco-logo";

function getLucideIcon(name: string | undefined): LucideIcons.LucideIcon | null {
  if (!name) return null;
  const Icon = (LucideIcons as Record<string, unknown>)[name] as LucideIcons.LucideIcon | undefined;
  return Icon || null;
}

const PLATFORM_SECTIONS = [
  {
    label: "Wiki",
    description: "The internal knowledge base — docs, guides, and company knowledge all in one place.",
    path: "/wiki",
    icon: BookOpen,
    accent: "from-blue-500/20 to-blue-600/5 border-blue-500/20",
    iconColor: "text-blue-500",
    iconBg: "bg-blue-500/10",
  },
  {
    label: "Store",
    description: "Merchandise, exclusive drops, and products from the SEVCO universe.",
    path: "/store",
    icon: ShoppingBag,
    accent: "from-red-700/20 to-red-800/5 border-red-700/20",
    iconColor: "text-red-700",
    iconBg: "bg-red-700/10",
  },
  {
    label: "Music",
    description: "SEVCO RECORDS — releases, artists, and a catalog built for independent creators.",
    path: "/music",
    icon: Music,
    accent: "from-blue-600/20 to-blue-700/5 border-blue-600/20",
    iconColor: "text-blue-600",
    iconBg: "bg-blue-600/10",
  },
  {
    label: "Projects",
    description: "SEVCO Ventures — active companies, initiatives, and what's next.",
    path: "/projects",
    icon: Folder,
    accent: "from-green-500/20 to-green-600/5 border-green-500/20",
    iconColor: "text-green-500",
    iconBg: "bg-green-500/10",
  },
  {
    label: "Services",
    description: "Engineering, design, marketing, and more — what we build for partners.",
    path: "/services",
    icon: Briefcase,
    accent: "from-sky-500/20 to-sky-600/5 border-sky-500/20",
    iconColor: "text-sky-500",
    iconBg: "bg-sky-500/10",
  },
  {
    label: "Community",
    description: "Join the Discord, follow along, and be part of everything SEVCO.",
    path: "/contact",
    icon: Users,
    accent: "from-indigo-500/20 to-indigo-600/5 border-indigo-500/20",
    iconColor: "text-indigo-500",
    iconBg: "bg-indigo-500/10",
  },
];

const DEFAULT_WHY_SEVCO_PILLS = [
  { icon: "Music", label: "Music", href: "/music", color: "#BE0000" },
  { icon: "ShoppingBag", label: "Store", href: "/store", color: "#BE0000" },
  { icon: "Folder", label: "Projects", href: "/projects", color: "#BE0000" },
  { icon: "Users", label: "Community", href: "/contact", color: "#BE0000" },
  { icon: "Zap", label: "Fast", href: "/", color: "#BE0000" },
  { icon: "Globe", label: "Global", href: "/", color: "#BE0000" },
  { icon: "Layers", label: "All-in-One", href: "/", color: "#BE0000" },
];

const DISCORD_INVITE = "https://discord.gg/sevco";

const DEFAULT_HERO_TEXT = "By SEVCO, The Inspiration Company";
const DEFAULT_BTN1_LABEL = "Explore the Wiki";
const DEFAULT_BTN1_URL = "/wiki";
const DEFAULT_BTN2_LABEL = "Shop the Store";
const DEFAULT_BTN2_URL = "/store";

function toBool(val: string | undefined): boolean {
  return val !== "false";
}

const CHANGELOG_CATEGORY_META: Record<ChangelogCategory, {
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

function ProductCard({ product }: { product: Product }) {
  const [imgError, setImgError] = useState(false);
  return (
    <Link href={`/store/products/${product.slug}`}>
      <div
        className="group relative rounded-xl border bg-white/[0.04] border-white/10 hover:bg-white/[0.08] hover:border-red-500/40 hover:shadow-[0_0_24px_0_rgba(190,0,0,0.18)] transition-all duration-300 overflow-hidden cursor-pointer"
        data-testid={`card-product-${product.id}`}
        style={{ backdropFilter: "blur(12px)" }}
      >
        <div className="aspect-square overflow-hidden">
          <div className="w-full h-full bg-white/[0.03] p-3">
            {product.imageUrl && !imgError ? (
              <img
                src={resolveImageUrl(product.imageUrl)}
                alt={product.name}
                className="w-full h-full object-cover rounded-md group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center rounded-md">
                <ShoppingBag className="h-10 w-10 text-white/20" />
              </div>
            )}
          </div>
        </div>
        <div className="p-3">
          <p className="text-xs font-semibold text-white truncate">{product.name}</p>
          <p className="text-xs text-white/50 mt-0.5">
            ${product.price.toFixed(2)}
          </p>
        </div>
      </div>
    </Link>
  );
}

function ArticleCard({ article }: { article: Article & { category?: { id: number; name: string; slug: string } | null } }) {
  return (
    <Link href={articleUrl(article)}>
      <div
        className="group flex items-start gap-3 p-3 rounded-xl border bg-white/[0.03] border-white/8 hover:bg-white/[0.06] hover:border-white/15 transition-all duration-200 cursor-pointer"
        data-testid={`card-article-${article.id}`}
      >
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
          <BookOpen className="h-3.5 w-3.5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground line-clamp-1">{article.title}</p>
          {article.summary && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{article.summary}</p>
          )}
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1 group-hover:translate-x-0.5 transition-transform" />
      </div>
    </Link>
  );
}

const SERVICE_ICONS = [
  { icon: Code2, label: "Dev", color: "#3b82f6" },
  { icon: Palette, label: "Design", color: "#6366f1" },
  { icon: Megaphone, label: "Marketing", color: "#3b82f6" },
  { icon: Camera, label: "Media", color: "#0ea5e9" },
  { icon: BarChart3, label: "Analytics", color: "#3b82f6" },
  { icon: Building2, label: "Strategy", color: "#6366f1" },
];

const PROJECT_STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  active:      { bg: "bg-green-500/15",   text: "text-green-400",   dot: "bg-green-400" },
  "in progress": { bg: "bg-yellow-500/15", text: "text-yellow-400",  dot: "bg-yellow-400" },
  planned:     { bg: "bg-blue-500/15",    text: "text-blue-400",    dot: "bg-blue-400" },
  archived:    { bg: "bg-white/10",       text: "text-white/50",    dot: "bg-white/30" },
};

type FeedPostWithAuthor = FeedPost & {
  author: { username: string; displayName: string | null; avatarUrl: string | null } | null;
};


export default function Landing() {
  const { user } = useAuth();
  const { toast } = useToast();

  const mouseRef = useRef<[number, number]>([0, 0]);
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);
  const isMobilePerfMode = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    return (navigator.hardwareConcurrency ?? 8) <= 4;
  }, []);
  const [heroScrollY, setHeroScrollY] = useState(0);

  useEffect(() => {
    const onScroll = () => setHeroScrollY(Math.min(window.scrollY, 500));
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleCopyWallpaperLink = useCallback((url: string) => {
    const absoluteUrl = url.startsWith("http") ? url : `${window.location.origin}${url}`;
    navigator.clipboard.writeText(absoluteUrl).then(() => {
      toast({ title: "Link copied to clipboard" });
    }).catch(() => {
      toast({ title: "Could not copy link", variant: "destructive" });
    });
  }, [toast]);

  const { data: articles = [], isLoading: artLoading } = useQuery<(Article & { category?: { id: number; name: string; slug: string } | null })[]>({
    queryKey: ["/api/articles/recent"],
    refetchInterval: 5 * 60 * 1000,
  });

  const { data: products = [], isLoading: prodLoading } = useQuery<Product[]>({
    queryKey: ["/api/store/products"],
  });

  const { data: settings = {} } = useQuery<Record<string, string>>({
    queryKey: ["/api/platform-settings"],
  });

  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: pinnedFeedPosts = [] } = useQuery<FeedPostWithAuthor[]>({
    queryKey: ["/api/feed?pinned=true&limit=1"],
    queryFn: async () => {
      const res = await fetch("/api/feed?pinned=true&limit=1");
      return res.json();
    },
  });

  const { data: recentFeedPosts = [], isLoading: feedPostsLoading } = useQuery<FeedPostWithAuthor[]>({
    queryKey: ["/api/feed?pinned=false&limit=6"],
    queryFn: async () => {
      const res = await fetch("/api/feed?pinned=false&limit=6");
      return res.json();
    },
  });

  interface PlatformHistoryEntry {
    id: number;
    title: string;
    description: string;
    version: string | null;
    category: string;
    slug: string | null;
    createdAt: string;
  }

  const { data: changelogEntries = [], isLoading: changelogLoading } = useQuery<PlatformHistoryEntry[]>({
    queryKey: ["/api/platform-history"],
  });

  interface GalleryItem {
    id: number;
    title: string;
    imageUrl: string;
    category?: string;
    isPublic?: boolean;
  }

  const { data: wallpaperItems = [], isLoading: wallpaperLoading } = useQuery<GalleryItem[]>({
    queryKey: ["/api/gallery?category=wallpaper&limit=20"],
    queryFn: async () => {
      const res = await fetch("/api/gallery?category=wallpaper&limit=20");
      return res.json();
    },
  });

  const latestWallpaper = wallpaperItems[0] ?? null;
  const wallpaperUrl = latestWallpaper ? resolveImageUrl(latestWallpaper.imageUrl) : null;

  const pinnedPost = pinnedFeedPosts[0] ?? null;

  const recentArticles = articles.filter((a) => a.status === "published").slice(0, 6);
  const featuredProducts = products.slice(0, 4);
  const latestProducts = [...products].sort((a, b) => b.id - a.id).slice(0, 3);
  const featuredProjects = projects.slice(0, 6);

  const heroBgUrl = settings["hero.backgroundImageUrl"] ?? "";
  const heroHeadline = settings["hero.headline"] ?? "";
  const heroText = settings["hero.text"] || DEFAULT_HERO_TEXT;
  const heroOverlayOpacity = settings["hero.overlayOpacity"] ? parseInt(settings["hero.overlayOpacity"]) / 100 : 0.7;

  // Legacy hero.shader.* settings are no longer consulted at runtime — the
  // Shader Studio assignment for `landing` (rendered by <PageShader />) is
  // the single source of truth. Only the visual overlay strength is kept.
  const shaderOverlayStrength = parseFloat(settings["hero.shader.overlayStrength"] ?? "0.45");

  const btn1Color = settings["hero.button1.color"];
  const btn2Color = settings["hero.button2.color"];
  const btn1IconName = settings["hero.button1.icon"];
  const btn2IconName = settings["hero.button2.icon"];

  const hasCustomBtn1 = !!(settings["hero.button1.label"] || settings["hero.button1.url"]);

  const btn1Label = hasCustomBtn1
    ? (settings["hero.button1.label"] || DEFAULT_BTN1_LABEL)
    : (user ? "Open Platform" : "Get Started");
  const btn1Url = hasCustomBtn1
    ? (settings["hero.button1.url"] || DEFAULT_BTN1_URL)
    : (user ? "/dashboard" : "/auth");

  const btn2Label = settings["hero.button2.label"] || DEFAULT_BTN2_LABEL;
  const btn2Url = settings["hero.button2.url"] || DEFAULT_BTN2_URL;

  // Mid-page CTA band (rendered between platformGrid and the next section).
  const showMidCta = settings["section.midCta.visible"] !== "false";
  const midCtaLabel = settings["section.midCta.label"] || "Free to join — start your SEVCO";
  const midCtaUrl = settings["section.midCta.url"] || (user ? "/dashboard" : "/auth");

  let whySevcoPills = DEFAULT_WHY_SEVCO_PILLS;
  if (settings["home.iconPills"]) {
    try {
      const parsed = JSON.parse(settings["home.iconPills"]);
      if (Array.isArray(parsed) && parsed.length > 0) whySevcoPills = parsed;
    } catch {}
  }

  type PlatformSectionData = { label: string; description: string; path: string; iconName: string };
  let platformSectionsData: PlatformSectionData[] | null = null;
  if (settings["home.platformSections"]) {
    try {
      const parsed = JSON.parse(settings["home.platformSections"]);
      if (Array.isArray(parsed) && parsed.length > 0) platformSectionsData = parsed;
    } catch {}
  }

  const Btn1Icon = getLucideIcon(btn1IconName) || BookOpen;
  const Btn2Icon = getLucideIcon(btn2IconName) || ShoppingBag;

  const showPlatformGrid = toBool(settings["section.platformGrid.visible"]);
  const showWhatsNew = toBool(settings["section.whatsNew.visible"]);
  const showRecordsSpotlight = toBool(settings["section.recordsSpotlight.visible"]);
  const showStorePreview = toBool(settings["section.storePreview.visible"]);
  const showServicesShowstopper = toBool(settings["section.servicesShowstopper.visible"]);
  const showProjectsShowstopper = toBool(settings["section.projectsShowstopper.visible"]);
  const showSignupCta = toBool(settings["section.signupCta.visible"]);
  const showWikiLatest = toBool(settings["section.wikiLatest.visible"]);
  const showCommunityCta = toBool(settings["section.communityCta.visible"]);
  const showBulletin = toBool(settings["section.bulletin.visible"]);
  const showFeedSection = toBool(settings["section.feed.visible"]);
  const showNewsSection = toBool(settings["section.news.visible"]);
  const showIconPills = toBool(settings["section.iconPills.visible"]);
  const showWallpaper = toBool(settings["section.wallpaper.visible"]);
  const showSparks = toBool(settings["section.sparks.visible"]);
  const showHero = toBool(settings["section.hero.visible"]);

  const sectionOrder: string[] = (() => {
    try {
      const rawOrder = settings["section.order"];
      const parsed = rawOrder ? JSON.parse(rawOrder) : null;
      if (Array.isArray(parsed) && parsed.length > 0) {
        const deduped = [...new Set(parsed as string[])];
        return [
          ...deduped.filter((k) => DEFAULT_SECTION_ORDER.includes(k)),
          ...DEFAULT_SECTION_ORDER.filter((k) => !deduped.includes(k)),
        ];
      }
    } catch {}
    return DEFAULT_SECTION_ORDER;
  })();

  const storeRef = useIntersectionObserver();
  const servicesRef = useIntersectionObserver();
  const projectsRef = useIntersectionObserver();
  const recordsRef = useIntersectionObserver();

  type SpotlightTrack = MusicTrack & {
    user?: { id: string; username: string; displayName: string | null; avatarUrl: string | null } | null;
  };
  const { data: featuredTracks = [] } = useQuery<SpotlightTrack[]>({
    queryKey: ["/api/music/tracks", "track"],
    queryFn: () => fetch("/api/music/tracks?type=track").then((r) => r.json()),
    enabled: showRecordsSpotlight,
  });
  const { playTrack } = useMusicPlayer();
  const spotlightTracks = useMemo<SpotlightTrack[]>(() => {
    const published = featuredTracks.filter((t) => t.status === "published");
    const staff = published.filter((t) => t.artistId != null);
    const community = published.filter((t) => t.userId != null && t.artistId == null);
    const mix: SpotlightTrack[] = [];
    let i = 0, j = 0;
    while (mix.length < 4 && (i < staff.length || j < community.length)) {
      if (i < staff.length) mix.push(staff[i++]);
      if (mix.length < 4 && j < community.length) mix.push(community[j++]);
    }
    if (mix.length < 4) {
      for (const t of published) {
        if (mix.length >= 4) break;
        if (!mix.find((m) => m.id === t.id)) mix.push(t);
      }
    }
    return mix;
  }, [featuredTracks]);

  const featurePillsRef = useIntersectionObserver();
  const signupCtaRef = useIntersectionObserver();

  return (
    <div className="min-h-screen bg-background overflow-x-hidden" data-page="landing">
      <PageHead
        slug="home"
        title="SEVCO — Music, Merch, Projects & Community"
        description={heroText}
        ogType="website"
        ogUrl="https://sevco.us"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "SEVCO",
          "url": "https://sevco.us",
          "logo": "https://sevco.us/favicon.jpg",
          "sameAs": [],
        }}
      />

      {/* ── HERO ── */}
      {showHero && (
      <section
        className="relative overflow-hidden bg-[#0a0a12] text-white"
        data-testid="section-hero"
        onPointerMove={(e) => {
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          mouseRef.current = [
            ((e.clientX - rect.left) / rect.width) * 2 - 1,
            -(((e.clientY - rect.top) / rect.height) * 2 - 1),
          ];
        }}
      >
        {/* Single subtle radial accent — no shader, no dot grid, no parallax cards. */}
        {heroBgUrl ? (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `url(${resolveImageUrl(heroBgUrl)})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              opacity: 0.55,
            }}
            aria-hidden="true"
          />
        ) : (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 70% 55% at 50% 0%, rgba(190,0,7,0.18) 0%, transparent 65%), radial-gradient(ellipse 50% 40% at 80% 90%, rgba(28,84,224,0.10) 0%, transparent 70%)",
            }}
            aria-hidden="true"
          />
        )}
        <PageShader pageKey="landing" className="absolute inset-0 pointer-events-none opacity-50" />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `rgba(10,10,18,${heroBgUrl ? heroOverlayOpacity : 0.35})` }}
          aria-hidden="true"
        />

        <div className="relative z-10 max-w-3xl mx-auto px-6 pt-32 pb-24 md:pt-44 md:pb-32 text-center">
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center justify-center mb-8"
            data-testid="img-hero-planet"
          >
            <SevcoLogo size={44} invert="none" alt="SEVCO" />
          </motion.div>

          <motion.h1
            initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold tracking-tight leading-[1.05] mb-6 text-white"
            style={{ letterSpacing: "-0.025em" }}
            data-testid="text-hero-headline"
          >
            {heroHeadline || "Music, merch, projects — all under one roof."}
          </motion.h1>

          <motion.p
            initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.18, ease: "easeOut" }}
            className="text-base md:text-lg text-white/55 max-w-xl mx-auto leading-relaxed mb-10"
            data-testid="text-hero-subhead"
          >
            {heroText}
          </motion.p>

          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.28, ease: "easeOut" }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Link href={btn1Url}>
              <Button
                size="lg"
                className="bg-red-600 hover:bg-red-500 text-white font-medium gap-2 shadow-sm shadow-red-900/20"
                data-testid="button-hero-primary"
                onClick={() => trackCtaClick("hero")}
              >
                {btn1Label}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href={btn2Url}>
              <Button
                size="lg"
                variant="ghost"
                className="text-white/85 hover:text-white hover:bg-white/[0.05] font-medium gap-2"
                data-testid="button-hero-secondary"
              >
                {btn2Label}
              </Button>
            </Link>
          </motion.div>

        </div>
      </section>
      )}

      {/* ── USER SNAPSHOT — tasks, inbox, notes (logged-in only) ── */}
      {user && (
        <section className="bg-[#07070f] border-b border-white/[0.06] py-10" data-testid="section-user-snapshot">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex items-center gap-2 mb-5">
              <h2 className="text-base font-semibold text-white">Your Workspace</h2>
            </div>
            <UserSnapshotPanel variant="dark" />
          </div>
        </section>
      )}

      {/* Float animation keyframes */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(-2deg); }
          50% { transform: translateY(-10px) rotate(-2deg); }
        }
        @keyframes float2 {
          0%, 100% { transform: translateY(0px) rotate(1.5deg); }
          50% { transform: translateY(-8px) rotate(1.5deg); }
        }
        @keyframes equalizer1 {
          0%, 100% { height: 10px; }
          50% { height: 28px; }
        }
        @keyframes equalizer2 {
          0%, 100% { height: 24px; }
          50% { height: 12px; }
        }
        @keyframes equalizer3 {
          0%, 100% { height: 16px; }
          33% { height: 30px; }
          66% { height: 8px; }
        }
        @keyframes equalizer4 {
          0%, 100% { height: 20px; }
          40% { height: 10px; }
          70% { height: 28px; }
        }
        @keyframes equalizer5 {
          0%, 100% { height: 14px; }
          30% { height: 26px; }
          60% { height: 8px; }
        }
        @keyframes slide-fade-up {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes wordReveal {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-in-view {
          animation: slide-fade-up 0.6s ease forwards;
        }
      `}</style>

      {/* ── FEATURE PILLS ── */}
      {showIconPills && (
        <section
          ref={featurePillsRef.ref}
          className="relative overflow-hidden bg-[#0a0a14] border-y border-white/5 px-4 py-5"
          data-testid="section-feature-pills"
        >
          <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-center gap-6 md:gap-10">
            {whySevcoPills.map((pill, i) => {
              const PillIcon = getLucideIcon(pill.icon);
              const accentColor = pill.color || "#BE0000";
              const inner = (
                <div
                  className="flex items-center gap-2.5 cursor-pointer group"
                  data-testid={`feature-pill-${pill.label.toLowerCase()}`}
                  style={{
                    opacity: featurePillsRef.isVisible ? 1 : 0,
                    transform: featurePillsRef.isVisible ? "translateY(0)" : "translateY(12px)",
                    transition: `opacity 0.5s ease ${i * 0.07}s, transform 0.5s ease ${i * 0.07}s`,
                  }}
                >
                  <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg group-hover:scale-110 transition-transform" style={{ backgroundColor: `${accentColor}26` }}>
                    {PillIcon ? <PillIcon className="h-4 w-4" style={{ color: accentColor }} /> : null}
                  </div>
                  <p className="text-xs font-semibold text-white/70 group-hover:text-white/90 transition-colors">{pill.label}</p>
                </div>
              );
              const href = pill.href || "/";
              return href && href !== "/" ? (
                <a key={pill.label} href={href}>{inner}</a>
              ) : (
                <div key={pill.label}>{inner}</div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── WALLPAPER OF THE DAY ── */}
      {showWallpaper && (
        wallpaperLoading ? (
          <div className="w-full bg-black/40 animate-pulse" style={{ minHeight: "40vh" }} data-testid="section-wallpaper-loading" />
        ) : wallpaperUrl ? (
          <section className="relative w-full overflow-hidden bg-black min-h-[40vh] sm:min-h-[60vh]" data-testid="section-wallpaper">
            <img
              src={wallpaperUrl}
              alt="Wallpaper of the Day"
              className="w-full h-full object-cover max-h-[80vh] block"
            />
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
            <div className="absolute bottom-0 inset-x-0 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/50 shrink-0">Wallpaper of the Day</p>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="bg-black/40 text-white hover:bg-black/60 backdrop-blur-sm h-8 px-3 text-xs"
                  onClick={() => handleCopyWallpaperLink(wallpaperUrl)}
                  data-testid="button-wallpaper-copy-link"
                >
                  <Link2 className="h-3.5 w-3.5 sm:mr-1.5" />
                  <span className="sr-only sm:not-sr-only">Copy Link</span>
                </Button>
                <a href={wallpaperUrl} download target="_blank" rel="noopener noreferrer">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="bg-black/40 text-white hover:bg-black/60 backdrop-blur-sm h-8 px-3 text-xs"
                    data-testid="button-wallpaper-download"
                  >
                    <Download className="h-3.5 w-3.5 sm:mr-1.5" />
                    <span className="sr-only sm:not-sr-only">Download</span>
                  </Button>
                </a>
                <Link href="/gallery">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="bg-black/40 text-white hover:bg-black/60 backdrop-blur-sm h-8 px-3 text-xs"
                    data-testid="button-wallpaper-gallery"
                  >
                    <Images className="h-3.5 w-3.5 sm:mr-1.5" />
                    <span className="sr-only sm:not-sr-only">Gallery</span>
                  </Button>
                </Link>
              </div>
            </div>
          </section>
        ) : null
      )}

      {/* ── DYNAMIC SECTIONS (ordered) ── */}
      {sectionOrder.map((sectionKey) => {
        switch (sectionKey) {
          case "bulletin":
            if (!showBulletin || !pinnedPost) return null;
            return (
              <section key="bulletin" className="max-w-6xl mx-auto px-6 pt-10 pb-2">
                <div className="rounded-xl border border-border bg-card/60 p-5 flex flex-col sm:flex-row sm:items-start gap-4" data-testid="section-bulletin">
                  <div className="flex items-center gap-2 shrink-0 sm:pt-0.5">
                    <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center">
                      <Pin className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest text-primary">Bulletin</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <Badge variant="secondary" className="text-[10px] capitalize px-1.5 py-0">{pinnedPost.type}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {pinnedPost.author?.displayName || pinnedPost.author?.username || "SEVCO"}
                        {" · "}
                        {(() => {
                          const d = new Date(pinnedPost.createdAt);
                          const now = new Date();
                          const diff = now.getTime() - d.getTime();
                          const mins = Math.floor(diff / 60000);
                          const hours = Math.floor(diff / 3600000);
                          const days = Math.floor(diff / 86400000);
                          if (mins < 1) return "just now";
                          if (mins < 60) return `${mins}m ago`;
                          if (hours < 24) return `${hours}h ago`;
                          if (days < 7) return `${days}d ago`;
                          return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                        })()}
                      </span>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed line-clamp-3">
                      {pinnedPost.content.length > 280 ? pinnedPost.content.slice(0, 280) + "…" : pinnedPost.content}
                    </p>
                  </div>
                  <div className="shrink-0">
                    <Button variant="outline" size="sm" className="gap-1 text-xs whitespace-nowrap" data-testid="link-bulletin-read-more" disabled>
                      Pinned <Pin className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </section>
            );

          case "platformGrid":
            if (!showPlatformGrid) return null;
            return (
              <section key="platformGrid" className="overflow-hidden max-w-6xl mx-auto px-6 py-16 md:py-20">
                <div className="mb-8">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">The Platform</p>
                  <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Everything SEVCO, in one place.</h2>
                </div>
                <StaggerGrid className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(() => {
                    const cardAccentHsl = settings["home.cardAccentColor"];
                    const accentStyle = cardAccentHsl ? {
                      borderColor: `hsl(${cardAccentHsl} / 0.25)`,
                      iconBg: `hsl(${cardAccentHsl} / 0.12)`,
                      iconColor: `hsl(${cardAccentHsl})`,
                    } : null;

                    if (platformSectionsData) {
                      return platformSectionsData.map((section) => {
                        const DynIcon = getLucideIcon(section.iconName);
                        return (
                          <Link key={section.path} href={section.path} className="block h-full">
                            <div
                              className="group relative rounded-xl border bg-gradient-to-br p-5 cursor-pointer hover:shadow-md hover:bg-white/[0.03] transition-all duration-200 border-border/30 from-muted/40 to-muted/10 h-full"
                              data-testid={`card-platform-${section.label.toLowerCase()}`}
                              style={accentStyle ? { borderColor: accentStyle.borderColor } : undefined}
                            >
                              <div
                                className={`h-10 w-10 rounded-xl flex items-center justify-center mb-4 ${accentStyle ? "" : "bg-primary/10"}`}
                                style={accentStyle ? { backgroundColor: accentStyle.iconBg } : undefined}
                              >
                                {DynIcon
                                  ? <DynIcon className={`h-5 w-5 ${accentStyle ? "" : "text-primary"}`} style={accentStyle ? { color: accentStyle.iconColor } : undefined} />
                                  : <Briefcase className={`h-5 w-5 ${accentStyle ? "" : "text-primary"}`} style={accentStyle ? { color: accentStyle.iconColor } : undefined} />}
                              </div>
                              <h3 className="text-sm font-bold text-foreground mb-1">{section.label}</h3>
                              <p className="text-xs text-muted-foreground leading-relaxed">{section.description}</p>
                              <ArrowRight className="absolute bottom-4 right-4 h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all" />
                            </div>
                          </Link>
                        );
                      });
                    }

                    return PLATFORM_SECTIONS.map((section) => (
                      <Link key={section.path} href={section.path} className="block h-full">
                        <div
                          className={`group relative rounded-xl border bg-gradient-to-br p-5 cursor-pointer hover:shadow-md hover:bg-white/[0.03] transition-all duration-200 h-full ${section.accent}`}
                          data-testid={`card-platform-${section.label.toLowerCase()}`}
                          style={accentStyle ? { borderColor: accentStyle.borderColor } : undefined}
                        >
                          <div
                            className={`h-10 w-10 rounded-xl flex items-center justify-center mb-4 ${accentStyle ? "" : section.iconBg}`}
                            style={accentStyle ? { backgroundColor: accentStyle.iconBg } : undefined}
                          >
                            <section.icon
                              className={`h-5 w-5 ${accentStyle ? "" : section.iconColor}`}
                              style={accentStyle ? { color: accentStyle.iconColor } : undefined}
                            />
                          </div>
                          <h3 className="text-sm font-bold text-foreground mb-1">{section.label}</h3>
                          <p className="text-xs text-muted-foreground leading-relaxed">{section.description}</p>
                          <ArrowRight className="absolute bottom-4 right-4 h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </Link>
                    ));
                  })()}
                </StaggerGrid>
              </section>
            );

          case "midCta": {
            // Thin inline CTA band — appears for logged-out visitors only,
            // immediately after the Platform Grid so the next "ask" lands
            // before the visitor has scrolled past the breadth-pitch.
            if (!showMidCta || user) return null;
            return (
              <section
                key="midCta"
                className="bg-[#08080f] border-y border-white/[0.05]"
                data-testid="section-mid-cta"
              >
                <div className="max-w-5xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-sm md:text-base text-white/80 text-center sm:text-left" data-testid="text-mid-cta-label">
                    {midCtaLabel}
                  </p>
                  <Link href={midCtaUrl}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-white/85 hover:text-white hover:bg-white/[0.06] border-white/15 font-medium gap-1.5 shrink-0"
                      data-testid="button-mid-cta"
                      onClick={() => trackCtaClick("mid")}
                    >
                      Sign Up
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </section>
            );
          }

          case "whatsNew":
            if (!showWhatsNew || (!changelogLoading && changelogEntries.length === 0)) return null;
            return (
              <section key="whatsNew" className="border-t border-border bg-muted/20 py-20 md:py-24" data-testid="section-platform-updates">
                <div className="max-w-6xl mx-auto px-6">
                  <div className="flex items-end justify-between mb-10">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                        <LucideIcons.Sparkles className="h-3 w-3" /> Platform updates
                        <span className="inline-flex items-center gap-1 rounded-full border border-green-500/30 bg-green-500/10 px-1.5 py-0.5 text-[9px] font-medium text-green-500 ml-1">
                          <span className="h-1 w-1 rounded-full bg-green-500" /> Live
                        </span>
                      </p>
                      <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground" data-testid="text-platform-updates-heading">What's new</h2>
                    </div>
                    <Link href="/platform" data-testid="link-view-all-updates">
                      <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                        View all →
                      </span>
                    </Link>
                  </div>
                  {changelogLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="bg-card border border-border rounded-xl p-5">
                          <div className="flex items-center gap-2 mb-3">
                            <Skeleton className="h-5 w-20 rounded-full" />
                            <Skeleton className="h-5 w-14 rounded-full" />
                            <Skeleton className="h-4 w-16 ml-auto" />
                          </div>
                          <Skeleton className="h-4 w-full mb-2" />
                          <Skeleton className="h-3 w-full mb-1" />
                          <Skeleton className="h-3 w-4/5" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {changelogEntries.slice(0, 3).map((entry) => {
                        const meta = CHANGELOG_CATEGORY_META[entry.category];
                        const CategoryIcon = meta.icon;
                        const relativeDate = (() => {
                          try {
                            return formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true });
                          } catch {
                            return "";
                          }
                        })();
                        return (
                          <div
                            key={entry.id}
                            className="h-full flex flex-col bg-card border border-border rounded-xl p-5 hover:bg-accent/40 transition-colors"
                            data-testid={`card-whats-new-${entry.id}`}
                          >
                            <div className="flex items-center gap-2 mb-3 flex-wrap">
                              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${meta.bg} ${meta.text} ${meta.border}`}>
                                <CategoryIcon className="h-3 w-3" />
                                {meta.label}
                              </span>
                              {entry.version && (
                                <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-mono text-muted-foreground">
                                  v{entry.version}
                                </span>
                              )}
                              <span className="ml-auto text-[11px] text-muted-foreground whitespace-nowrap">{relativeDate}</span>
                            </div>
                            <p className="text-sm font-semibold text-foreground leading-snug mb-2">{entry.title}</p>
                            <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{entry.description}</p>
                            <div className="mt-auto pt-2">
                              {entry.slug && (
                                <Link href={articleUrl({ slug: entry.slug })}>
                                  <span className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer">Read more →</span>
                                </Link>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {!changelogLoading && (
                    <div className="mt-8 flex justify-center">
                      <Link href="/platform">
                        <Button
                          variant="outline"
                          size="sm"
                          data-testid="button-view-all-platform"
                        >
                          View all {changelogEntries.length > 0 ? changelogEntries.length : ""} platform updates →
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </section>
            );

          case "feed":
            if (!showFeedSection || recentFeedPosts.length === 0) return null;
            return (
              <section key="feed" className="max-w-6xl mx-auto px-6 py-16 md:py-20" data-testid="section-sevco-feed">
                <div className="flex items-end justify-between mb-8">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">SEVCO Feed</p>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Latest from the team.</h2>
                  </div>
                </div>
                {feedPostsLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="rounded-xl border p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <Skeleton className="h-8 w-8 rounded-full" />
                          <div>
                            <Skeleton className="h-3 w-24 mb-1" />
                            <Skeleton className="h-2.5 w-16" />
                          </div>
                        </div>
                        <Skeleton className="h-3 w-full mb-1.5" />
                        <Skeleton className="h-3 w-4/5 mb-1.5" />
                        <Skeleton className="h-3 w-3/5" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {recentFeedPosts.slice(0, 6).map((post) => {
                      const authorName = post.author?.displayName || post.author?.username || "SEVCO";
                      const initials = authorName.charAt(0).toUpperCase();
                      const dateStr = (() => {
                        try {
                          return formatDistanceToNow(new Date(post.createdAt), { addSuffix: true });
                        } catch { return ""; }
                      })();
                      return (
                        <div
                          key={post.id}
                          className="rounded-xl border border-border bg-card p-4 hover:bg-accent/40 transition-colors"
                          data-testid={`card-feed-post-${post.id}`}
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <Avatar className="h-8 w-8 shrink-0">
                              {post.author?.avatarUrl && <AvatarImage src={resolveImageUrl(post.author.avatarUrl)} />}
                              <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">{initials}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-foreground truncate">{authorName}</p>
                              {dateStr && <p className="text-[11px] text-muted-foreground">{dateStr}</p>}
                            </div>
                            {post.type && (
                              <Badge variant="secondary" className="text-[10px] capitalize px-1.5 py-0 shrink-0">{post.type}</Badge>
                            )}
                          </div>
                          <p className="text-sm text-foreground/80 leading-relaxed line-clamp-4">
                            {post.content.length > 280 ? post.content.slice(0, 280) + "…" : post.content}
                          </p>
                          {post.mediaUrl && (
                            <div className="mt-3 rounded-lg overflow-hidden">
                              <img src={resolveImageUrl(post.mediaUrl)} alt="" className="w-full h-40 object-cover" loading="lazy" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            );

          case "news":
            return (
              <HomeNewsAndMarkets key="news" showNewsSection={showNewsSection} />
            );

          case "storePreview":
            if (!showStorePreview) return null;
            return (
              <section
                key="storePreview"
                ref={storeRef.ref}
                className="border-t border-border bg-background"
                data-testid="section-store-showstopper"
              >
                <div className={`max-w-6xl mx-auto px-6 py-20 md:py-24 transition-opacity duration-500 ${storeRef.isVisible ? "opacity-100" : "opacity-0"}`}>
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                        <ShoppingBag className="h-3 w-3" /> SEVCO Store
                      </p>
                      <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground mb-2">
                        Shop the latest drops.
                      </h2>
                      <p className="text-muted-foreground text-sm leading-relaxed max-w-md">
                        Apparel, accessories, and limited-edition items from the SEVCO universe.
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Link href="/store">
                        <Button size="sm" className="bg-red-600 hover:bg-red-500 text-white font-medium gap-1.5" data-testid="button-store-shop-now">
                          Shop now
                        </Button>
                      </Link>
                      <Link href="/wiki/store-shopping-guide">
                        <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-foreground gap-1" data-testid="button-store-learn-more">
                          Learn more <ArrowRight className="h-3 w-3" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                  {prodLoading ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="aspect-square w-full rounded-xl" />
                      ))}
                    </div>
                  ) : featuredProducts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <ShoppingBag className="h-8 w-8 text-muted-foreground/40 mb-3" />
                      <p className="text-sm text-muted-foreground">Products coming soon.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {featuredProducts.map((product) => (
                        <ProductCard key={product.id} product={product} />
                      ))}
                    </div>
                  )}
                </div>
              </section>
            );

          case "servicesShowstopper":
            if (!showServicesShowstopper) return null;
            return (
              <section
                key="servicesShowstopper"
                ref={servicesRef.ref}
                className="border-t border-border bg-muted/20"
                data-testid="section-services-showstopper"
              >
                <div className={`max-w-6xl mx-auto px-6 py-20 md:py-24 transition-opacity duration-500 ${servicesRef.isVisible ? "opacity-100" : "opacity-0"}`}>
                  <div className="grid lg:grid-cols-2 gap-12 items-start">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                        <Briefcase className="h-3 w-3" /> SEVCO Services
                      </p>
                      <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground mb-3 leading-tight">
                        World-class work, built for creators.
                      </h2>
                      <p className="text-muted-foreground text-sm leading-relaxed mb-6 max-w-md">
                        Engineering, design, marketing, and media — SEVCO partners with brands and creators to build the things that matter.
                      </p>
                      <ul className="space-y-2 mb-8">
                        {["Full-Stack Engineering", "Brand & UI Design", "Marketing & Growth", "Media Production"].map((item) => (
                          <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CheckCircle className="h-4 w-4 text-blue-500 shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                      <div className="flex gap-2">
                        <Link href="/services">
                          <Button size="sm" className="bg-red-600 hover:bg-red-500 text-white font-medium gap-1.5" data-testid="button-services-cta">
                            Work with us
                          </Button>
                        </Link>
                        <Link href="/wiki/services-guide">
                          <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-foreground gap-1" data-testid="button-services-learn-more">
                            Learn more <ArrowRight className="h-3 w-3" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {SERVICE_ICONS.map(({ icon: Icon, label, color }) => (
                        <div
                          key={label}
                          className="rounded-xl border border-border bg-card p-4 flex flex-col items-center gap-2.5 hover:bg-accent/40 transition-colors"
                          data-testid={`card-service-icon-${label.toLowerCase()}`}
                        >
                          <div
                            className="h-10 w-10 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: `${color}1f` }}
                          >
                            <Icon className="h-5 w-5" style={{ color }} />
                          </div>
                          <p className="text-[11px] font-medium text-muted-foreground text-center">{label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            );

          case "projectsShowstopper":
            if (!showProjectsShowstopper) return null;
            return (
              <section
                key="projectsShowstopper"
                ref={projectsRef.ref}
                className="border-t border-border bg-background"
                data-testid="section-projects-showstopper"
              >
                <div className={`max-w-6xl mx-auto px-6 py-20 md:py-24 transition-opacity duration-500 ${projectsRef.isVisible ? "opacity-100" : "opacity-0"}`}>
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                        <Folder className="h-3 w-3" /> SEVCO Ventures
                      </p>
                      <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground mb-2">
                        Building the future, one venture at a time.
                      </h2>
                      <p className="text-muted-foreground text-sm leading-relaxed max-w-md">
                        A portfolio of companies, initiatives, and bold ideas — incubated and operated by the SEVCO team.
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Link href="/projects">
                        <Button size="sm" className="bg-red-600 hover:bg-red-500 text-white font-medium gap-1.5" data-testid="button-projects-explore">
                          Explore ventures
                        </Button>
                      </Link>
                      <Link href="/wiki/projects-ventures-guide">
                        <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-foreground gap-1" data-testid="button-projects-learn-more">
                          Learn more <ArrowRight className="h-3 w-3" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                  {projectsLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="h-32 rounded-xl" />
                      ))}
                    </div>
                  ) : featuredProjects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <Folder className="h-8 w-8 text-muted-foreground/40 mb-3" />
                      <p className="text-sm text-muted-foreground">Ventures coming soon.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {featuredProjects.map((project) => {
                        const statusKey = (project.status || "active").toLowerCase();
                        const statusStyle = PROJECT_STATUS_COLORS[statusKey] || PROJECT_STATUS_COLORS["active"];
                        const MenuIcon = getLucideIcon(project.menuIcon ?? undefined) || Folder;
                        return (
                          <Link key={project.id} href={`/projects/${project.slug}`}>
                            <div
                              className="group rounded-xl border border-border bg-card p-5 hover:bg-accent/40 transition-colors cursor-pointer h-full"
                              data-testid={`card-project-${project.id}`}
                            >
                              <div className="flex items-start justify-between gap-2 mb-3">
                                <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                                  {project.appIcon ? (
                                    <img
                                      src={resolveImageUrl(project.appIcon)}
                                      alt={project.name}
                                      className="h-9 w-9 rounded-lg object-cover"
                                    />
                                  ) : (
                                    <MenuIcon className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </div>
                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                                  <span className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot}`} />
                                  {project.status || "Active"}
                                </span>
                              </div>
                              <h3 className="text-sm font-semibold text-foreground mb-1">{project.name}</h3>
                              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{project.description || project.type}</p>
                              <div className="mt-2" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                                <SparkButton
                                  entityType="project"
                                  entityId={project.id}
                                  sparkCount={(project as any).sparkCount ?? 0}
                                  sparkedByCurrentUser={(project as any).sparkedByCurrentUser ?? false}
                                  isOwner={!!user?.id && user.id === (project as any).leadUserId}
                                />
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
            );

          case "recordsSpotlight":
            if (!showRecordsSpotlight) return null;
            return (
              <section
                key="recordsSpotlight"
                ref={recordsRef.ref}
                className="border-t border-border bg-muted/20"
                data-testid="section-records-spotlight"
              >
                <div className={`max-w-6xl mx-auto px-6 py-20 md:py-24 transition-opacity duration-500 ${recordsRef.isVisible ? "opacity-100" : "opacity-0"}`}>
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-10">
                    <div className="max-w-xl">
                      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                        <Music className="h-3 w-3" /> SEVCO Records
                      </p>
                      <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground mb-2">
                        Independent music, built for artists.
                      </h2>
                      <p className="text-muted-foreground text-sm leading-relaxed mb-5">
                        Our label discovers and develops artists across every genre, with distribution, promotion, and creative support from day one.
                      </p>
                      <div className="flex items-center gap-2 mb-6">
                        <a href="https://open.spotify.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border bg-card text-xs text-muted-foreground hover:text-foreground transition-colors">
                          <SiSpotify className="h-3 w-3 text-green-500" /> Spotify
                        </a>
                        <a href="https://music.apple.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border bg-card text-xs text-muted-foreground hover:text-foreground transition-colors">
                          <SiApplemusic className="h-3 w-3 text-pink-500" /> Apple Music
                        </a>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Link href="/music">
                          <Button size="sm" className="bg-red-600 hover:bg-red-500 text-white font-medium gap-1.5" data-testid="button-records-explore">
                            Explore Records
                          </Button>
                        </Link>
                        <Link href="/music/artists">
                          <Button size="sm" variant="outline" className="font-medium" data-testid="button-records-artists">
                            Browse artists
                          </Button>
                        </Link>
                        <Link href="/wiki/records-music-guide">
                          <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-foreground gap-1" data-testid="button-records-learn-more">
                            Learn more <ArrowRight className="h-3 w-3" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                    {spotlightTracks.length > 0 && (
                      <div className="w-full md:max-w-sm" data-testid="records-spotlight-tracks">
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                          Now on SEVCO
                        </p>
                        <div className="space-y-1.5">
                          {spotlightTracks.map((track) => {
                            const uploaderUsername = track.user?.username;
                            const profileHref = track.artistId == null && uploaderUsername
                              ? `/profile/${uploaderUsername}`
                              : null;
                            return (
                              <div
                                key={track.id}
                                className="group flex items-center gap-3 p-2.5 rounded-lg border border-border bg-card hover:bg-muted/40 transition-colors"
                                data-testid={`spotlight-track-${track.id}`}
                              >
                                <button
                                  type="button"
                                  onClick={() => playTrack(track, spotlightTracks.filter((t) => t.id !== track.id))}
                                  className="relative shrink-0 w-10 h-10 rounded-md overflow-hidden bg-primary/10 flex items-center justify-center"
                                  aria-label={`Play ${track.title}`}
                                  data-testid={`button-spotlight-play-${track.id}`}
                                >
                                  {track.coverImageUrl ? (
                                    <img src={resolveImageUrl(track.coverImageUrl)} alt={track.title} className="w-full h-full object-cover" />
                                  ) : (
                                    <Music className="h-4 w-4 text-primary/60" />
                                  )}
                                  <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <ArrowRight className="h-3.5 w-3.5 text-white -rotate-90" />
                                  </span>
                                </button>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate" data-testid={`text-spotlight-title-${track.id}`}>{track.title}</p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {profileHref ? (
                                      <Link href={profileHref} className="hover:text-foreground hover:underline" data-testid={`link-spotlight-uploader-${track.id}`}>
                                        {track.artistName}
                                      </Link>
                                    ) : (
                                      track.artistName
                                    )}
                                  </p>
                                </div>
                                <Badge
                                  variant="outline"
                                  className="text-[9px] px-1.5 py-0 h-4 shrink-0 uppercase tracking-wider"
                                  data-testid={`badge-spotlight-source-${track.id}`}
                                >
                                  {track.artistId != null ? "Artist" : "Community"}
                                </Badge>
                              </div>
                            );
                          })}
                        </div>
                        <Link href="/music/listen">
                          <button
                            type="button"
                            className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                            data-testid="link-spotlight-all-tracks"
                          >
                            Browse all tracks <ArrowRight className="h-3 w-3" />
                          </button>
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            );

          case "signupCta":
            if (!showSignupCta || user) return null;
            return (
              <section
                key="signupCta"
                ref={signupCtaRef.ref}
                className="border-t border-border bg-background"
                data-testid="section-signup-cta"
              >
                <div className={`max-w-5xl mx-auto px-6 py-24 md:py-28 transition-opacity duration-500 ${signupCtaRef.isVisible ? "opacity-100" : "opacity-0"}`}>
                  <div className="grid lg:grid-cols-[1.1fr_1fr] gap-12 items-center">
                    <div>
                      <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-3 leading-tight text-foreground">
                        One account. Everything unlocked.
                      </h2>
                      <p className="text-muted-foreground text-sm leading-relaxed mb-6 max-w-md">
                        Store, music, wiki, news, projects — one free SEVCO account, instant access.
                      </p>
                      <Link href="/auth">
                        <Button
                          size="lg"
                          className="bg-red-600 hover:bg-red-500 text-white font-medium gap-2"
                          data-testid="button-signup-cta-create-account"
                          onClick={() => trackCtaClick("closer")}
                        >
                          Sign Up
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { icon: Music, label: "SEVCO RECORDS", color: "#60a5fa" },
                        { icon: ShoppingBag, label: "Store", color: "#f87171" },
                        { icon: Folder, label: "Ventures", color: "#4ade80" },
                        { icon: Newspaper, label: "News", color: "#facc15" },
                        { icon: Users, label: "Community", color: "#a78bfa" },
                        { icon: BookOpen, label: "Wiki", color: "#38bdf8" },
                      ].map(({ icon: Icon, label, color }) => (
                        <div
                          key={label}
                          className="rounded-lg border border-border bg-card px-3 py-2.5 flex items-center gap-2.5"
                          data-testid={`card-signup-feature-${label.toLowerCase().replace(/\s+/g, "-")}`}
                        >
                          <Icon className="h-4 w-4 shrink-0" style={{ color }} />
                          <p className="text-xs font-medium text-foreground truncate">{label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            );

          case "wikiLatest":
            if (!showWikiLatest) return null;
            return (
              <section key="wikiLatest" className="border-t border-border bg-muted/20" data-testid="section-wiki-latest">
                <div className="max-w-6xl mx-auto px-6 py-20 md:py-24">
                  <div className="flex items-end justify-between mb-10">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                        <BookOpen className="h-3 w-3" /> SEVCO Wiki
                      </p>
                      <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground" data-testid="text-from-the-wiki-heading">From the Wiki</h2>
                    </div>
                    <Link href="/wiki">
                      <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground" data-testid="link-explore-wiki">
                        Explore the Wiki <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                  {artLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="h-36 w-full rounded-xl" />
                      ))}
                    </div>
                  ) : recentArticles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <BookOpen className="h-12 w-12 text-muted-foreground/20 mb-3" />
                      <p className="text-sm text-muted-foreground">No articles yet.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {recentArticles.map((article) => (
                        <Link key={article.id} href={articleUrl(article)}>
                          <div
                            className="group flex flex-col gap-2 p-4 rounded-xl border border-border bg-card hover:bg-accent/40 transition-colors cursor-pointer min-h-[130px]"
                            data-testid={`card-wiki-article-${article.id}`}
                          >
                            <div className="flex items-center gap-2">
                              <BookOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              {article.tags && article.tags.length > 0 && (
                                <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full truncate max-w-[100px]">{article.tags[0]}</span>
                              )}
                            </div>
                            <p className="text-sm font-semibold text-foreground line-clamp-2 leading-snug">{article.title}</p>
                            <p className="text-xs text-muted-foreground mt-auto">
                              {article.createdAt
                                ? formatDistanceToNow(new Date(article.createdAt), { addSuffix: true })
                                : ""}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            );

          case "communityCta":
            if (!showCommunityCta) return null;
            return (
              <section key="communityCta" className="border-t border-border bg-background px-6 py-20 md:py-24 text-center" data-testid="section-community-cta">
                <div className="max-w-xl mx-auto">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 flex items-center justify-center gap-1.5">
                    <SiDiscord className="h-3 w-3" /> Community
                  </p>
                  <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground mb-3">
                    Join the SEVCO community.
                  </h2>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-7">
                    Connect with the team and community on Discord. Get updates, share feedback, and be part of what's next.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                    <a href={DISCORD_INVITE} target="_blank" rel="noopener noreferrer" onClick={() => trackCtaClick("discord")}>
                      <Button size="lg" className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium gap-2" data-testid="button-join-discord">
                        <SiDiscord className="h-4 w-4" />
                        Join Discord
                      </Button>
                    </a>
                    {!user && (
                      <Link href="/auth">
                        <Button size="lg" variant="ghost" className="text-muted-foreground hover:text-foreground font-medium" data-testid="button-community-sign-up">
                          Sign Up
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </section>
            );

          case "sparks":
            if (!showSparks) return null;
            return (
              <section key="sparks" className="border-t border-border bg-muted/20 px-6 py-20 md:py-24 text-center" data-testid="section-sparks">
                <div className="max-w-xl mx-auto">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 flex items-center justify-center gap-1.5">
                    <SparkIcon size="sm" decorative /> Creative Currency
                  </p>
                  <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground mb-3">
                    Sparks — SEVCO's creative currency
                  </h2>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-7">
                    Sparks power your creative journey on SEVCO. Use them to unlock AI tools, access premium music features, and fuel creative boosts across the platform.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                    <Link href="/sparks">
                      <Button size="lg" className="bg-red-600 hover:bg-red-500 text-white font-medium gap-2" data-testid="button-get-sparks">
                        <SparkIcon size="md" decorative /> Get Sparks <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </section>
            );

          default:
            return null;
        }
      })}
    </div>
  );
}
