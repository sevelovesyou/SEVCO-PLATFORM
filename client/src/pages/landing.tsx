import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { PageShader } from "@/components/page-shader";
import { StaggerGrid } from "@/components/stagger-grid";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
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
import type { Article, Product, FeedPost, Project, ChangelogCategory } from "@shared/schema";
import { articleUrl } from "@/lib/wiki-urls";
import { DEFAULT_SECTION_ORDER } from "@shared/section-order";
import { motion } from "framer-motion";
import { trackCtaClick } from "@/lib/analytics-tracker";
import { HomeNewsAndMarkets } from "@/components/home-news-markets";
import { UserSnapshotPanel } from "@/components/user-snapshot-panel";
import { formatDistanceToNow } from "date-fns";
import planetIconWhite from "@assets/SEVCO_App_Icon_-_Artboard_71_1774998179682.png";
import { resolveImageUrl } from "@/lib/resolve-image-url";

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
    slug: string;
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

  // Layout version gate. Defaults to v2 (the modernized layout). Either an
  // admin setting (landing.layout) or a `?layout=v1` URL override flips the
  // page back to the pre-redesign behavior in a single switch — this is the
  // rollback gate for Task #450 so we can revert without a code deploy.
  const useV2Layout = useMemo(() => {
    if (typeof window !== "undefined") {
      const override = new URLSearchParams(window.location.search).get("layout");
      if (override === "v1") return false;
      if (override === "v2") return true;
    }
    return (settings["landing.layout"] || "v2") !== "v1";
  }, [settings]);

  // Modernized hero controls (added Task #450). All effectively disabled in v1.
  const heroMotionEnabled = useV2Layout && settings["hero.motion.enabled"] !== "false";
  const heroMotionIntensity =
    (settings["hero.motion.intensity"] as "subtle" | "standard" | "rich" | undefined) || "standard";
  const heroPrimarySlot: "button1" | "button2" = useV2Layout
    ? ((settings["hero.cta.primarySlot"] as "button1" | "button2" | undefined) || "button1")
    : "button1";
  const heroScrollCueVisible = useV2Layout && settings["hero.scrollCue.visible"] !== "false";

  // Mid-page CTA band (rendered between platformGrid and the next section). v2 only.
  const showMidCta = useV2Layout && settings["section.midCta.visible"] !== "false";
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

      {/* ── HERO — GLSL shader background ── */}
      <section
        className="relative overflow-hidden bg-[#07070f] text-white flex items-center"
        style={{ height: "100dvh", minHeight: "600px" }}
        data-testid="section-hero"
        onPointerMove={(e) => {
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          mouseRef.current = [
            ((e.clientX - rect.left) / rect.width) * 2 - 1,
            -(((e.clientY - rect.top) / rect.height) * 2 - 1),
          ];
        }}
      >
        {/* Static gradient (or hero image) is rendered first so it's always
            visible as the base layer. The Shader Studio assignment for this
            page is layered on top via <PageShader /> below; when no preset is
            assigned, when the user prefers reduced motion, or when the preset
            opts into mobileFallback on small screens, PageShader simply
            renders nothing and the gradient/image remains visible.

            The legacy ShaderBackground / hero.shader.* settings are no longer
            consulted at runtime — assignment via the Shader Studio is now
            the single source of truth for hero visuals. */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={heroBgUrl ? {
            backgroundImage: `url(${resolveImageUrl(heroBgUrl)})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          } : {
            background: "radial-gradient(ellipse 80% 60% at 20% 30%, rgba(190,0,7,0.32) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 70%, rgba(28,84,224,0.28) 0%, transparent 55%), linear-gradient(160deg, #0b0830 0%, #07071a 50%, #100510 100%)",
          }}
          aria-hidden="true"
        />
        <PageShader pageKey="landing" className="absolute inset-0 pointer-events-none" />

        {/* Directional overlay — transparent center-top, stronger at edges/bottom */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: heroBgUrl
              ? `rgba(7,7,15,${heroOverlayOpacity})`
              : `rgba(7,7,15,${shaderOverlayStrength})`,
          }}
          aria-hidden="true"
        />

        {/* Subtle dot-grid texture */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.055) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
            maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%)",
          }}
          aria-hidden="true"
        />

        {/* Content — fades + rises gently on scroll */}
        <div
          className="relative z-10 max-w-6xl mx-auto px-6 py-24 md:py-36 w-full"
          style={{
            opacity: Math.max(0, 1 - heroScrollY / 380),
            transform: `translateY(${heroScrollY * 0.12}px)`,
            willChange: "opacity, transform",
          }}
        >
          {(() => {
            // Resolve which CTA is dominant. Default = button1 = primary.
            const button1IsPrimary = heroPrimarySlot !== "button2";
            const intensityMul =
              heroMotionIntensity === "rich" ? 1.3
              : heroMotionIntensity === "subtle" ? 0.55
              : 1;
            // motionOn = master switch: respects user setting + OS reduced-motion.
            const motionOn = heroMotionEnabled && !prefersReducedMotion;
            const wordRiseY = 24 * intensityMul;
            const wordStagger = 0.07;

            const renderHeadlineWord = (word: string, i: number, isAccented: boolean) => (
              <motion.span
                key={i}
                className="inline-block mr-[0.25em]"
                initial={motionOn ? { opacity: 0, y: wordRiseY } : false}
                animate={motionOn ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
                transition={motionOn ? { delay: i * wordStagger, duration: 0.55, ease: [0.22, 1, 0.36, 1] } : { duration: 0 }}
                style={isAccented ? {
                  background: "linear-gradient(135deg, #ff3333 0%, #cc0000 50%, #ff6666 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                } : {
                  color: "rgba(255,255,255,0.92)",
                }}
              >
                {word}
              </motion.span>
            );

            const headlineWords = heroHeadline
              ? heroHeadline.split(" ").map((word, i) => {
                  const isAccented = word.startsWith("*") && word.endsWith("*") && word.length > 2;
                  return renderHeadlineWord(isAccented ? word.slice(1, -1) : word, i, isAccented);
                })
              : ["A", "Creative", "Platform"].map((word, i) => renderHeadlineWord(word, i, i === 0));

            // Trailing-stagger delays so subhead + CTAs come in after the headline.
            const subheadDelay = motionOn ? Math.max(0.15, headlineWords.length * wordStagger) : 0;
            const ctaDelay = motionOn ? subheadDelay + 0.18 : 0;
            const previewDelay = motionOn ? subheadDelay + 0.32 : 0;

            return (
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
            {/* Left — headline + CTAs */}
            <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left gap-6">
              <motion.div
                className="overflow-visible p-1 shrink-0"
                initial={motionOn ? { opacity: 0, scale: 0.85 } : false}
                animate={motionOn ? { opacity: 1, scale: 1 } : { opacity: 1, scale: 1 }}
                transition={motionOn ? { duration: 0.7, ease: [0.22, 1, 0.36, 1] } : { duration: 0 }}
              >
                <img
                  src={resolveImageUrl(settings["hero.logoUrl"] || settings["platform.logoUrl"]) || planetIconWhite}
                  alt="SEVCO"
                  className="h-20 w-20 md:h-24 md:w-24 object-contain"
                  data-testid="img-planet-hero"
                />
              </motion.div>

              <div>
                <h1
                  className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-extrabold mb-4 leading-[1.05]"
                  style={{
                    letterSpacing: "-0.03em",
                    textShadow: "0 0 40px rgba(190,0,7,0.35), 0 2px 24px rgba(0,0,0,0.6)",
                  }}
                >
                  {headlineWords}
                </h1>
                <motion.p
                  className="text-white/80 text-base md:text-lg max-w-lg leading-relaxed"
                  initial={motionOn ? { opacity: 0, y: 12 } : false}
                  animate={motionOn ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
                  transition={motionOn ? { delay: subheadDelay, duration: 0.55, ease: "easeOut" } : { duration: 0 }}
                >
                  {heroText}
                </motion.p>
              </div>

              <motion.div
                className="flex flex-col sm:flex-row items-center gap-3"
                initial={motionOn ? { opacity: 0, y: 16 } : false}
                animate={motionOn ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
                transition={motionOn ? { delay: ctaDelay, duration: 0.5, ease: "easeOut" } : { duration: 0 }}
              >
                {/* Button 1 */}
                <Link href={btn1Url}>
                  <Button
                    size="lg"
                    variant={button1IsPrimary ? "destructive" : "outline"}
                    className={
                      button1IsPrimary
                        ? (btn1Color
                            ? "hover:opacity-90 text-white font-medium gap-2"
                            : "font-medium gap-2 bg-red-600 hover:bg-red-500 text-white border-0 shadow-md shadow-red-900/20")
                        : "text-white/85 hover:text-white hover:bg-white/[0.06] border-white/15 font-medium gap-2"
                    }
                    style={
                      button1IsPrimary && btn1Color
                        ? { backgroundColor: btn1Color, borderColor: btn1Color, color: "#fff" }
                        : (!button1IsPrimary && btn1Color
                            ? { backgroundColor: btn1Color, borderColor: btn1Color, color: "#fff" }
                            : undefined)
                    }
                    data-testid="button-hero-primary"
                    onClick={button1IsPrimary ? () => trackCtaClick("hero") : undefined}
                  >
                    <Btn1Icon className="h-4 w-4" />
                    {btn1Label}
                  </Button>
                </Link>
                {/* Button 2 */}
                <Link href={btn2Url}>
                  <Button
                    size="lg"
                    variant={button1IsPrimary ? "outline" : "destructive"}
                    className={
                      button1IsPrimary
                        ? "text-white/85 hover:text-white hover:bg-white/[0.06] border-white/15 font-medium gap-2"
                        : (btn2Color
                            ? "hover:opacity-90 text-white font-medium gap-2"
                            : "font-medium gap-2 bg-red-600 hover:bg-red-500 text-white border-0 shadow-md shadow-red-900/20")
                    }
                    style={btn2Color ? { backgroundColor: btn2Color, borderColor: btn2Color, color: "#fff" } : undefined}
                    data-testid="button-hero-secondary"
                    onClick={!button1IsPrimary ? () => trackCtaClick("hero") : undefined}
                  >
                    <Btn2Icon className="h-4 w-4" />
                    {btn2Label}
                  </Button>
                </Link>
              </motion.div>

            </div>

            {/* Right — floating frosted-glass preview cards (with subtle scroll parallax) */}
            <motion.div
              className="hidden lg:flex flex-col gap-3 shrink-0 w-72"
              initial={motionOn ? { opacity: 0, x: 30 } : false}
              animate={motionOn ? { opacity: 1, x: 0 } : { opacity: 1, x: 0 }}
              transition={motionOn ? { delay: previewDelay, duration: 0.7, ease: [0.22, 1, 0.36, 1] } : { duration: 0 }}
              style={motionOn ? { transform: `translateY(${heroScrollY * -0.08 * intensityMul}px)` } : undefined}
            >
              {/* Tilted frosted card */}
              <div
                className="rounded-2xl border border-white/10 p-5 motion-safe:animate-[float_6s_ease-in-out_infinite]"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  transform: "rotate(-2deg)",
                  boxShadow: "0 24px 48px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06)",
                }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-xl bg-red-600/20 flex items-center justify-center">
                    <ShoppingBag className="h-5 w-5 text-red-400" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Store</p>
                    <p className="text-[11px] text-white/40">Latest drop available</p>
                  </div>
                  <Badge className="ml-auto bg-red-600/20 text-red-300 border-red-500/20 text-[10px]">New</Badge>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({ length: 3 }).map((_, i) => {
                    const p = latestProducts[i];
                    const imgSrc = p ? resolveImageUrl(p.imageUrls?.[0] ?? p.imageUrl ?? null) : null;
                    return (
                      <div key={i} className="aspect-square rounded-lg bg-white/[0.04] border border-white/[0.07] overflow-hidden flex items-center justify-center">
                        {imgSrc ? (
                          <img src={imgSrc} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <ShoppingBag className="h-5 w-5 text-white/30" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div
                className="rounded-2xl border border-white/10 p-4 motion-safe:animate-[float_6s_ease-in-out_infinite_1.5s]"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  transform: "rotate(1.5deg)",
                  boxShadow: "0 16px 32px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.05)",
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-7 w-7 rounded-lg bg-blue-600/20 flex items-center justify-center">
                    <Music className="h-3.5 w-3.5 text-blue-400" />
                  </div>
                  <p className="text-xs font-semibold text-white">SEVCO RECORDS</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-400 motion-safe:animate-pulse" />
                  <p className="text-[11px] text-white/50">Streaming now</p>
                </div>
              </div>
            </motion.div>
          </div>
            );
          })()}
        </div>

        {/* Scroll cue — gentle bounce inviting the visitor to keep going. */}
        {heroScrollCueVisible && heroMotionEnabled && !prefersReducedMotion && heroScrollY < 60 && (
          <motion.div
            className="absolute bottom-6 left-0 right-0 z-10 flex flex-col items-center gap-1 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, y: [0, 6, 0] }}
            transition={{
              opacity: { delay: 1.2, duration: 0.8 },
              y: { delay: 1.2, duration: 1.8, repeat: Infinity, ease: "easeInOut" },
            }}
            aria-hidden="true"
            data-testid="hero-scroll-cue"
          >
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">Scroll</span>
            <ChevronRight className="h-3.5 w-3.5 text-white/40 rotate-90" />
          </motion.div>
        )}

        {/* Bottom fade to next section */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#07070f] to-transparent pointer-events-none" />
      </section>

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
              <section key="bulletin" className="max-w-6xl mx-auto px-6 py-8">
                <div className="rounded-xl border bg-muted/30 border-border/60 p-5 flex flex-col sm:flex-row sm:items-start gap-4" data-testid="section-bulletin">
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
                      {btn1Label}
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
              <section key="whatsNew" className="bg-[#07070f] py-14 sm:py-16" data-testid="section-platform-updates">
                <div className="max-w-6xl mx-auto px-4 sm:px-6">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-bold text-white" data-testid="text-platform-updates-heading">Platform Updates</h2>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-green-500/30 bg-green-500/10 px-2.5 py-0.5 text-[11px] font-medium text-green-400">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-400" />
                        </span>
                        Live
                      </span>
                    </div>
                    <Link href="/platform" data-testid="link-view-all-updates">
                      <span className="text-sm text-white/40 hover:text-white/70 transition-colors cursor-pointer">
                        View all {changelogEntries.length > 0 ? changelogEntries.length : ""} updates →
                      </span>
                    </Link>
                  </div>
                  {changelogLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-5">
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-3">
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
                            className="h-full flex flex-col bg-white/[0.04] border border-white/[0.07] rounded-2xl p-5 hover:bg-white/[0.06] hover:border-white/[0.12] hover:-translate-y-0.5 hover:shadow-xl transition-all duration-200"
                            data-testid={`card-whats-new-${entry.id}`}
                          >
                            <div className="flex items-center gap-2 mb-3 flex-wrap">
                              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${meta.bg} ${meta.text} ${meta.border}`}>
                                <CategoryIcon className="h-3 w-3" />
                                {meta.label}
                              </span>
                              {entry.version && (
                                <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-mono text-white/50">
                                  v{entry.version}
                                </span>
                              )}
                              <span className="ml-auto text-[11px] text-white/30 whitespace-nowrap">{relativeDate}</span>
                            </div>
                            <p className="text-sm font-semibold text-white leading-snug mb-2">{entry.title}</p>
                            <p className="text-xs text-white/50 line-clamp-2 mb-3">{entry.description}</p>
                            <div className="mt-auto pt-2">
                              {entry.slug && (
                                <Link href={articleUrl({ slug: entry.slug })}>
                                  <span className="text-xs text-white/40 hover:text-white/70 transition-colors cursor-pointer">Read more →</span>
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
                          className="border-white/10 text-white/60 hover:text-white hover:border-white/20 bg-transparent"
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
                          className="rounded-xl border bg-white/[0.02] border-border/60 p-4 hover:bg-white/[0.04] transition-colors"
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
                className="relative overflow-hidden bg-[#0d0407] text-white"
                data-testid="section-store-showstopper"
              >
                <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                  <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full bg-red-900/30 blur-[130px] motion-safe:animate-[pulse_9s_ease-in-out_infinite]" />
                  <div className="absolute -bottom-32 right-0 w-[500px] h-[500px] rounded-full bg-red-800/20 blur-[120px] motion-safe:animate-[pulse_11s_ease-in-out_infinite_3s]" />
                </div>
                <div className={`relative z-10 max-w-6xl mx-auto px-6 py-20 md:py-28 transition-all duration-700 ${storeRef.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                    <div>
                      <Badge className="mb-4 bg-red-600/20 text-red-300 border-red-500/20 text-xs font-semibold uppercase tracking-wider">
                        SEVCO Store
                      </Badge>
                      <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">
                        Shop the latest drops.
                      </h2>
                      <p className="text-white/50 text-sm leading-relaxed max-w-md">
                        Exclusive SEVCO merchandise — apparel, accessories, and limited-edition items from the universe.
                      </p>
                    </div>
                    <div className="flex gap-3 shrink-0">
                      <Link href="/store">
                        <Button
                          size="sm"
                          className="bg-red-600 hover:bg-red-500 text-white font-semibold gap-2"
                          data-testid="button-store-shop-now"
                        >
                          <ShoppingBag className="h-3.5 w-3.5" />
                          Shop Now
                        </Button>
                      </Link>
                      <Link href="/wiki/store-shopping-guide">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-white/60 hover:text-white hover:bg-white/10 border border-white/10 gap-1"
                          data-testid="button-store-learn-more"
                        >
                          Learn More <ArrowRight className="h-3 w-3" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                  {prodLoading ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="aspect-square w-full rounded-xl bg-white/5" />
                      ))}
                    </div>
                  ) : featuredProducts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="h-16 w-16 rounded-2xl bg-red-600/10 flex items-center justify-center mb-4">
                        <ShoppingBag className="h-8 w-8 text-red-400/50" />
                      </div>
                      <p className="text-sm text-white/30">Products coming soon.</p>
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
                className="relative overflow-hidden bg-[#040810] text-white"
                data-testid="section-services-showstopper"
              >
                <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                  <div className="absolute -top-40 right-0 w-[700px] h-[700px] rounded-full bg-blue-900/25 blur-[140px] motion-safe:animate-[pulse_10s_ease-in-out_infinite]" />
                  <div className="absolute bottom-0 -left-32 w-[500px] h-[500px] rounded-full bg-indigo-900/20 blur-[120px] motion-safe:animate-[pulse_8s_ease-in-out_infinite_2s]" />
                </div>
                <div className={`relative z-10 max-w-6xl mx-auto px-6 py-20 md:py-28 transition-all duration-700 ${servicesRef.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
                  <div className="grid lg:grid-cols-2 gap-14 items-center">
                    <div>
                      <Badge className="mb-4 bg-blue-600/20 text-blue-300 border-blue-500/20 text-xs font-semibold uppercase tracking-wider">
                        SEVCO Services
                      </Badge>
                      <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4 leading-tight">
                        World-class work,<br />
                        <span style={{ color: "#3b82f6" }}>built for creators.</span>
                      </h2>
                      <p className="text-white/50 text-sm leading-relaxed mb-6 max-w-md">
                        Engineering, design, marketing, and media — SEVCO partners with brands and creators to build the things that matter.
                      </p>
                      <ul className="space-y-2 mb-8">
                        {["Full-Stack Engineering", "Brand & UI Design", "Marketing & Growth", "Media Production"].map((item) => (
                          <li key={item} className="flex items-center gap-2 text-sm text-white/60">
                            <CheckCircle className="h-4 w-4 text-blue-400 shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                      <div className="flex gap-3">
                        <Link href="/services">
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold gap-2"
                            data-testid="button-services-cta"
                          >
                            <Briefcase className="h-3.5 w-3.5" />
                            Work with us
                          </Button>
                        </Link>
                        <Link href="/wiki/services-guide">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-white/60 hover:text-white hover:bg-white/10 border border-white/10 gap-1"
                            data-testid="button-services-learn-more"
                          >
                            Learn More <ArrowRight className="h-3 w-3" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      {SERVICE_ICONS.map(({ icon: Icon, label, color }, i) => (
                        <div
                          key={label}
                          className="rounded-2xl border border-white/[0.08] p-5 flex flex-col items-center gap-3 hover:border-blue-500/30 hover:shadow-[0_0_20px_0_rgba(59,130,246,0.12)] transition-all duration-300 group"
                          style={{ background: "rgba(255,255,255,0.03)", backdropFilter: "blur(12px)", animationDelay: `${i * 0.1}s` }}
                          data-testid={`card-service-icon-${label.toLowerCase()}`}
                        >
                          <div
                            className="h-12 w-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300"
                            style={{ backgroundColor: `${color}20` }}
                          >
                            <Icon className="h-6 w-6" style={{ color }} />
                          </div>
                          <p className="text-xs font-semibold text-white/60 group-hover:text-white/80 transition-colors">{label}</p>
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
                className="relative overflow-hidden bg-[#040c06] text-white"
                data-testid="section-projects-showstopper"
              >
                <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                  <div className="absolute -top-40 left-0 w-[700px] h-[700px] rounded-full bg-green-900/20 blur-[140px] motion-safe:animate-[pulse_11s_ease-in-out_infinite]" />
                  <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full bg-emerald-900/15 blur-[120px] motion-safe:animate-[pulse_9s_ease-in-out_infinite_3s]" />
                </div>
                <div className={`relative z-10 max-w-6xl mx-auto px-6 py-20 md:py-28 transition-all duration-700 ${projectsRef.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                    <div>
                      <Badge className="mb-4 bg-green-600/20 text-green-300 border-green-500/20 text-xs font-semibold uppercase tracking-wider">
                        SEVCO Ventures
                      </Badge>
                      <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">
                        Building the future,<br />
                        <span style={{ color: "#22c55e" }}>one venture at a time.</span>
                      </h2>
                      <p className="text-white/50 text-sm leading-relaxed max-w-md">
                        A portfolio of companies, initiatives, and bold ideas — incubated and operated by the SEVCO team.
                      </p>
                    </div>
                    <div className="flex gap-3 shrink-0">
                      <Link href="/projects">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-500 text-white font-semibold gap-2"
                          data-testid="button-projects-explore"
                        >
                          <TrendingUp className="h-3.5 w-3.5" />
                          Explore Ventures
                        </Button>
                      </Link>
                      <Link href="/wiki/projects-ventures-guide">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-white/60 hover:text-white hover:bg-white/10 border border-white/10 gap-1"
                          data-testid="button-projects-learn-more"
                        >
                          Learn More <ArrowRight className="h-3 w-3" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                  {projectsLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="h-32 rounded-xl bg-white/5" />
                      ))}
                    </div>
                  ) : featuredProjects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="h-16 w-16 rounded-2xl bg-green-600/10 flex items-center justify-center mb-4">
                        <Folder className="h-8 w-8 text-green-400/50" />
                      </div>
                      <p className="text-sm text-white/30">Ventures coming soon.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {featuredProjects.map((project) => {
                        const statusKey = (project.status || "active").toLowerCase();
                        const statusStyle = PROJECT_STATUS_COLORS[statusKey] || PROJECT_STATUS_COLORS["active"];
                        return (
                          <Link key={project.id} href={`/projects/${project.slug}`}>
                            <div
                              className="group rounded-xl border border-white/[0.08] p-5 hover:border-green-500/30 hover:shadow-[0_0_24px_0_rgba(34,197,94,0.1)] transition-all duration-300 cursor-pointer h-full"
                              style={{ background: "rgba(255,255,255,0.03)", backdropFilter: "blur(12px)" }}
                              data-testid={`card-project-${project.id}`}
                            >
                              <div className="flex items-start justify-between gap-2 mb-3">
                                <div className="h-9 w-9 rounded-lg bg-green-600/15 flex items-center justify-center shrink-0 overflow-hidden">
                                  {project.appIcon ? (
                                    <img
                                      src={resolveImageUrl(project.appIcon)}
                                      alt={project.name}
                                      className="h-9 w-9 rounded-lg object-cover"
                                    />
                                  ) : (
                                    <Folder className="h-4.5 w-4.5 text-green-400" style={{ height: "1.125rem", width: "1.125rem" }} />
                                  )}
                                </div>
                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusStyle.bg} ${statusStyle.text}`}>
                                  <span className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot}`} />
                                  {project.status || "Active"}
                                </span>
                              </div>
                              <h3 className="text-sm font-bold text-white mb-1 group-hover:text-green-300 transition-colors">{project.name}</h3>
                              <p className="text-xs text-white/40 line-clamp-2 leading-relaxed">{project.description || project.type}</p>
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
                className="relative overflow-hidden bg-gradient-to-br from-blue-950 via-[#040815] to-blue-950"
                data-testid="section-records-spotlight"
              >
                <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                  <div className="absolute -bottom-16 -left-20 w-[400px] h-[400px] rounded-full bg-blue-600/15 blur-[100px] motion-safe:animate-[pulse_9s_ease-in-out_infinite]" />
                  <div className="absolute top-0 right-0 w-[300px] h-[300px] rounded-full bg-indigo-500/10 blur-[80px] motion-safe:animate-[pulse_11s_ease-in-out_infinite_3s]" />
                </div>
                <div className={`relative max-w-6xl mx-auto px-6 py-14 md:py-20 flex flex-col md:flex-row md:items-center gap-8 transition-all duration-700 ${recordsRef.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-4">
                      <Badge className="bg-blue-600/30 text-blue-200 border-blue-400/30 text-xs font-semibold uppercase tracking-wider">
                        SEVCO RECORDS
                      </Badge>
                      <Badge className="bg-yellow-500/15 text-yellow-300 border-yellow-400/20 text-xs font-semibold">
                        ✦ Spotlight
                      </Badge>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 tracking-tight">
                      Independent music, built for artists.
                    </h2>
                    <p className="text-blue-200/70 text-sm leading-relaxed max-w-lg mb-5">
                      SEVCO RECORDS is our label — discovering and developing artists across every genre, with distribution, promotion, and creative support from day one.
                    </p>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-600/10 border border-green-500/20">
                        <SiSpotify className="h-3.5 w-3.5 text-green-400" />
                        <span className="text-[11px] font-semibold text-green-300">Spotify</span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                        <SiApplemusic className="h-3.5 w-3.5 text-pink-400" />
                        <span className="text-[11px] font-semibold text-white/60">Apple Music</span>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Link href="/music">
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-500 text-white font-semibold gap-2"
                          data-testid="button-records-explore"
                        >
                          <Music className="h-3.5 w-3.5" />
                          Explore RECORDS
                        </Button>
                      </Link>
                      <Link href="/music/artists">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-blue-400/40 text-blue-200 hover:bg-blue-800/50 gap-2"
                          data-testid="button-records-artists"
                        >
                          Browse Artists
                        </Button>
                      </Link>
                      <Link href="/wiki/records-music-guide">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-white/50 hover:text-white hover:bg-white/10 gap-1"
                          data-testid="button-records-learn-more"
                        >
                          Learn More <ArrowRight className="h-3 w-3" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                  <div className="hidden md:flex items-end justify-center gap-1.5 h-36 shrink-0 pr-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className="w-4 rounded-t-sm bg-gradient-to-t from-blue-600 to-blue-300"
                        style={{
                          animation: `equalizer${i} ${0.6 + i * 0.1}s ease-in-out infinite alternate`,
                          height: `${[10, 24, 16, 20, 14][i - 1]}px`,
                        }}
                      />
                    ))}
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
                className="relative overflow-hidden bg-[#0a0a12] text-white border-t border-white/[0.04]"
                data-testid="section-signup-cta"
              >
                <div className={`relative z-10 max-w-5xl mx-auto px-6 py-24 md:py-32 transition-all duration-700 ${signupCtaRef.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
                  <div className="grid lg:grid-cols-[1.1fr_1fr] gap-16 items-center">
                    <div>
                      <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4 leading-[1.1] text-white">
                        One account. Everything unlocked.
                      </h2>
                      <p className="text-white/55 text-base leading-relaxed mb-8 max-w-md">
                        Store, music, wiki, news, projects — one free SEVCO account, instant access.
                      </p>
                      <Link href="/auth">
                        <Button
                          size="lg"
                          className="bg-red-600 hover:bg-red-500 text-white font-medium gap-2 shadow-md shadow-red-900/20"
                          data-testid="button-signup-cta-create-account"
                          onClick={() => trackCtaClick("closer")}
                        >
                          {btn1Label}
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
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
                          className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-3 flex items-center gap-2.5"
                          data-testid={`card-signup-feature-${label.toLowerCase().replace(/\s+/g, "-")}`}
                        >
                          <Icon className="h-4 w-4 shrink-0" style={{ color }} />
                          <p className="text-xs font-medium text-white/85 truncate">{label}</p>
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
              <section key="wikiLatest" className="overflow-hidden bg-muted/40 border-y border-border/60" data-testid="section-wiki-latest">
                <div className="max-w-6xl mx-auto px-6 py-16 md:py-20">
                  <div className="flex items-end justify-between mb-8">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">SEVCO Wiki</p>
                      <h2 className="text-2xl md:text-3xl font-bold tracking-tight" data-testid="text-from-the-wiki-heading">From the Wiki</h2>
                    </div>
                    <Link href="/wiki">
                      <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" data-testid="link-explore-wiki">
                        Explore the Wiki → 
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
                            className="group flex flex-col gap-2 p-4 rounded-xl border bg-background border-border/60 hover:bg-muted/60 hover:border-primary/30 transition-all duration-200 cursor-pointer min-h-[130px]"
                            data-testid={`card-wiki-article-${article.id}`}
                          >
                            <div className="flex items-center gap-2">
                              <BookOpen className="h-3.5 w-3.5 text-primary shrink-0" />
                              {article.tags && article.tags.length > 0 && (
                                <span className="text-[10px] font-medium text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-full truncate max-w-[100px]">{article.tags[0]}</span>
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
              <section key="communityCta" className="relative overflow-hidden bg-gradient-to-br from-blue-900/60 via-background to-blue-900/30 border-t border-white/5 px-6 py-20 md:py-28 text-center">
                <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                  <div className="absolute top-0 left-1/4 w-[400px] h-[400px] rounded-full bg-indigo-600/10 blur-[100px] motion-safe:animate-[pulse_10s_ease-in-out_infinite]" />
                  <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] rounded-full bg-blue-700/10 blur-[80px] motion-safe:animate-[pulse_8s_ease-in-out_infinite_3s]" />
                </div>
                <div className="relative z-10 max-w-xl mx-auto">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <div
                      className="h-10 w-10 rounded-xl flex items-center justify-center"
                      style={{ background: "rgba(99,102,241,0.15)", backdropFilter: "blur(8px)" }}
                    >
                      <SiDiscord className="h-5 w-5 text-indigo-400" />
                    </div>
                    <Badge className="bg-indigo-500/15 text-indigo-400 border-indigo-500/20 text-xs font-semibold">
                      Community
                    </Badge>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">
                    <span className="bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 bg-clip-text text-transparent">
                      Join the SEVCO community.
                    </span>
                  </h2>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-8">
                    Connect with the team and community on Discord. Get updates, share feedback, and be part of what's next.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <a
                      href={DISCORD_INVITE}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackCtaClick("discord")}
                    >
                      <Button
                        size="lg"
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold gap-2"
                        data-testid="button-join-discord"
                      >
                        <SiDiscord className="h-4 w-4" />
                        Join Discord
                      </Button>
                    </a>
                    {!user && (
                      <Link href="/auth">
                        <Button
                          size="lg"
                          variant="ghost"
                          className="text-white/70 hover:text-white hover:bg-white/10 border border-white/10 font-semibold gap-2"
                          data-testid="button-community-sign-up"
                        >
                          <Star className="h-4 w-4" />
                          Create Account
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
              <section key="sparks" className="relative overflow-hidden bg-gradient-to-br from-amber-900/60 via-background to-yellow-900/30 border-t border-white/5 px-6 py-20 md:py-28 text-center">
                <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                  <div className="absolute top-0 left-1/3 w-[400px] h-[400px] rounded-full bg-amber-500/10 blur-[100px] motion-safe:animate-[pulse_10s_ease-in-out_infinite]" />
                  <div className="absolute bottom-0 right-1/3 w-[300px] h-[300px] rounded-full bg-yellow-600/10 blur-[80px] motion-safe:animate-[pulse_8s_ease-in-out_infinite_3s]" />
                </div>
                <div className="relative z-10 max-w-xl mx-auto">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <div
                      className="h-10 w-10 rounded-xl flex items-center justify-center"
                      style={{ background: "rgba(245,158,11,0.15)", backdropFilter: "blur(8px)" }}
                    >
                      <span className="text-xl">⚡️</span>
                    </div>
                    <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/20 text-xs font-semibold">
                      Creative Currency
                    </Badge>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">
                    <span className="bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
                      ⚡️ Sparks — SEVCO's creative currency
                    </span>
                  </h2>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-8">
                    Sparks power your creative journey on SEVCO. Use them to unlock AI tools, access premium music features, and fuel creative boosts across the platform.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <Link href="/sparks">
                      <Button
                        size="lg"
                        className="bg-[#0037ff] hover:bg-[#0037ff]/90 text-white font-semibold gap-2"
                        data-testid="button-get-sparks"
                      >
                        <span>⚡️</span>
                        Get Sparks →
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
