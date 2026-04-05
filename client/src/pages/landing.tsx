import { useState, useEffect, useRef } from "react";
import { StaggerGrid } from "@/components/stagger-grid";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
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
  TrendingUp, ExternalLink, Newspaper, Wrench, MoreHorizontal,
} from "lucide-react";
import { SiDiscord, SiSpotify, SiApplemusic } from "react-icons/si";
import type { Article, Product, FeedPost, Project, ChangelogCategory } from "@shared/schema";
import type { NewsCategory } from "@shared/schema";
import { DEFAULT_SECTION_ORDER } from "@shared/section-order";
import { NewsEditorial } from "@/components/news-editorial";
import { UserSnapshotPanel } from "@/components/user-snapshot-panel";
import { formatDistanceToNow } from "date-fns";
import planetIconWhite from "@assets/SEVCO_App_Icon_-_Artboard_71_1774998179682.png";

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

const DEFAULT_HERO_TEXT = "One platform for all things SEVCO — music, merch, projects, and a community built to last.";
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
                src={product.imageUrl}
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
            ${(product.price / 100).toFixed(2)}
          </p>
        </div>
      </div>
    </Link>
  );
}

function ArticleCard({ article }: { article: Article }) {
  return (
    <Link href={`/wiki/${article.slug}`}>
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

interface NewsItem {
  title: string;
  link: string;
  source?: string;
  pubDate?: string;
  category?: string;
  description?: string;
}

export default function Landing() {
  const { user } = useAuth();

  const { data: articles = [], isLoading: artLoading } = useQuery<Article[]>({
    queryKey: ["/api/articles/recent"],
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

  const { data: newsCategories = [] } = useQuery<NewsCategory[]>({
    queryKey: ["/api/news"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: newsFeed = [] } = useQuery<NewsItem[]>({
    queryKey: ["/api/news/feed/all"],
    staleTime: 5 * 60 * 1000,
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

  interface XStatus { configured: boolean; handle?: string }
  const { data: xStatus } = useQuery<XStatus>({
    queryKey: ["/api/social/x/status"],
  });

  const xHandles = (settings["social.x.handles"] || "sevelovesu")
    .split(",").map((h: string) => h.trim()).filter(Boolean);
  const xMaxTweets = parseInt(settings["social.x.maxTweets"] ?? "12") || 12;

  const pinnedPost = pinnedFeedPosts[0] ?? null;

  const recentArticles = articles.filter((a) => a.status === "published").slice(0, 3);
  const featuredProducts = products.slice(0, 4);
  const featuredProjects = projects.slice(0, 6);

  const heroBgUrl = settings["hero.backgroundImageUrl"] ?? "";
  const heroHeadline = settings["hero.headline"] ?? "";
  const heroText = settings["hero.text"] || DEFAULT_HERO_TEXT;
  const heroOverlayOpacity = settings["hero.overlayOpacity"] ? parseInt(settings["hero.overlayOpacity"]) / 100 : 0.7;

  const btn1Color = settings["hero.button1.color"];
  const btn2Color = settings["hero.button2.color"];
  const btn1IconName = settings["hero.button1.icon"];
  const btn2IconName = settings["hero.button2.icon"];

  const hasCustomBtn1 = !!(settings["hero.button1.label"] || settings["hero.button1.url"]);

  const btn1Label = hasCustomBtn1
    ? (settings["hero.button1.label"] || DEFAULT_BTN1_LABEL)
    : (user ? "Go to Platform" : "Sign Up Free");
  const btn1Url = hasCustomBtn1
    ? (settings["hero.button1.url"] || DEFAULT_BTN1_URL)
    : (user ? "/dashboard" : "/auth");

  const btn2Label = settings["hero.button2.label"] || DEFAULT_BTN2_LABEL;
  const btn2Url = settings["hero.button2.url"] || DEFAULT_BTN2_URL;

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
  const showNewsTeaser = toBool(settings["section.newsTeaser.visible"]);
  const showSignupCta = toBool(settings["section.signupCta.visible"]);
  const showWikiLatest = toBool(settings["section.wikiLatest.visible"]);
  const showCommunityCta = toBool(settings["section.communityCta.visible"]);
  const showBulletin = toBool(settings["section.bulletin.visible"]);
  const showFeedSection = toBool(settings["section.feed.visible"]);
  const showNewsSection = toBool(settings["section.news.visible"]);
  const showXFeedSection = settings["section.xFeed.visible"] !== "false";
  const xEnabled = settings["social.x.enabled"] !== "false";

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
  const newsTeaserRef = useIntersectionObserver();
  const signupCtaRef = useIntersectionObserver();

  const newsTeaserItems = newsFeed.slice(0, 3);

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
          "logo": "https://sevco.us/favicon.png",
          "sameAs": [],
        }}
      />

      {/* ── HERO — glassmorphism + aurora blobs ── */}
      <section
        className="relative overflow-hidden bg-[#07070f] text-white min-h-[90vh] flex items-center"
        style={heroBgUrl ? {
          backgroundImage: `url(${heroBgUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        } : undefined}
        data-testid="section-hero"
      >
        {/* Aurora blobs */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute -top-40 -left-40 w-[700px] h-[700px] rounded-full bg-red-700/25 blur-[140px] motion-safe:animate-[pulse_8s_ease-in-out_infinite]" />
          <div className="absolute -bottom-32 -right-40 w-[600px] h-[600px] rounded-full bg-indigo-600/20 blur-[140px] motion-safe:animate-[pulse_10s_ease-in-out_infinite_2s]" />
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full bg-red-900/15 blur-[100px] motion-safe:animate-[pulse_12s_ease-in-out_infinite_4s]" />
        </div>

        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
          aria-hidden="true"
        />

        {heroBgUrl && <div className="absolute inset-0 bg-[#07070f] pointer-events-none" style={{ opacity: heroOverlayOpacity }} />}

        <div className="relative z-10 max-w-6xl mx-auto px-6 py-20 md:py-32 w-full">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
            {/* Left — headline + CTAs */}
            <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left gap-6">
              <div className="overflow-visible p-1 shrink-0">
                <img
                  src={settings["hero.logoUrl"] || settings["platform.logoUrl"] || planetIconWhite}
                  alt="SEVCO"
                  className="h-20 w-20 md:h-24 md:w-24 object-contain"
                  data-testid="img-planet-hero"
                />
              </div>

              <div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-4 leading-[1.1]">
                  {/* Word-by-word staggered reveal animation */}
                  {heroHeadline
                    ? heroHeadline.split(" ").map((word, i) => {
                        const isAccented = word.startsWith("*") && word.endsWith("*") && word.length > 2;
                        const displayWord = isAccented ? word.slice(1, -1) : word;
                        return (
                          <span
                            key={i}
                            className="inline-block mr-[0.25em]"
                            style={{
                              opacity: 0,
                              animation: `wordReveal 0.5s ease forwards`,
                              animationDelay: `${i * 0.08}s`,
                              ...(isAccented ? {
                                background: "linear-gradient(135deg, #ff3333 0%, #cc0000 50%, #ff6666 100%)",
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                                backgroundClip: "text",
                              } : {
                                color: "rgba(255,255,255,0.92)",
                              }),
                            }}
                          >
                            {displayWord}
                          </span>
                        );
                      })
                    : ["A", "creative", "community", "platform", "built", "by", "creators,", "for", "creators."].map((word, i) => {
                        const isRedWord = i === 0 || i >= 6;
                        const isWhiteWord = i >= 3 && i <= 5;
                        return (
                          <span
                            key={i}
                            className="inline-block mr-[0.25em]"
                            style={{
                              opacity: 0,
                              animation: `wordReveal 0.5s ease forwards`,
                              animationDelay: `${i * 0.08}s`,
                              ...(isRedWord ? {
                                background: "linear-gradient(135deg, #ff3333 0%, #cc0000 50%, #ff6666 100%)",
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                                backgroundClip: "text",
                              } : isWhiteWord ? {
                                color: "rgba(255,255,255,0.92)",
                              } : {
                                color: "rgba(255,255,255,0.92)",
                              }),
                            }}
                          >
                            {word}
                          </span>
                        );
                      })}
                </h1>
                <p className="text-white/50 text-base md:text-lg max-w-lg leading-relaxed">
                  {heroText}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                {/* Button 1 — always shown, defaults to Sign Up / Go to Platform for logged-in users */}
                <Link href={btn1Url}>
                  <Button
                    size="lg"
                    variant="destructive"
                    className={btn1Color ? "hover:opacity-90 text-white font-semibold gap-2 px-7 shadow-lg shadow-red-900/30" : "font-semibold gap-2 px-7 shadow-lg shadow-red-900/30 bg-red-600 hover:bg-red-500 text-white border-0"}
                    style={btn1Color ? { backgroundColor: btn1Color, borderColor: btn1Color, color: "#fff" } : undefined}
                    data-testid="button-hero-primary"
                  >
                    <Btn1Icon className="h-4 w-4" />
                    {btn1Label}
                  </Button>
                </Link>
                {/* Button 2 — always shown */}
                <Link href={btn2Url}>
                  <Button
                    size="lg"
                    variant="outline"
                    className="text-white/70 hover:text-white hover:bg-white/10 border border-white/20 font-semibold gap-2 px-6"
                    style={btn2Color ? { backgroundColor: btn2Color, borderColor: btn2Color, color: "#fff" } : undefined}
                    data-testid="button-hero-secondary"
                  >
                    <Btn2Icon className="h-4 w-4" />
                    {btn2Label}
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right — floating frosted-glass preview card */}
            <div className="hidden lg:flex flex-col gap-3 shrink-0 w-72">
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
                    <p className="text-xs font-bold text-white">SEV Store</p>
                    <p className="text-[11px] text-white/40">Latest drop available</p>
                  </div>
                  <Badge className="ml-auto bg-red-600/20 text-red-300 border-red-500/20 text-[10px]">New</Badge>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[Music, Folder, Briefcase].map((Icon, i) => (
                    <div key={i} className="aspect-square rounded-lg bg-white/[0.04] border border-white/[0.07] flex items-center justify-center">
                      <Icon className="h-5 w-5 text-white/30" />
                    </div>
                  ))}
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
            </div>
          </div>
        </div>

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
                          <Link key={section.path} href={section.path}>
                            <div
                              className="group relative rounded-xl border bg-gradient-to-br p-5 cursor-pointer hover:shadow-md hover:bg-white/[0.03] transition-all duration-200 border-border/30 from-muted/40 to-muted/10"
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
                      <Link key={section.path} href={section.path}>
                        <div
                          className={`group relative rounded-xl border bg-gradient-to-br p-5 cursor-pointer hover:shadow-md hover:bg-white/[0.03] transition-all duration-200 ${section.accent}`}
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
                                <Link href={`/wiki/${entry.slug}`}>
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
                              {post.author?.avatarUrl && <AvatarImage src={post.author.avatarUrl} />}
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
                              <img src={post.mediaUrl} alt="" className="w-full h-40 object-cover" loading="lazy" />
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
          case "xFeed": {
            const newsIdx = sectionOrder.indexOf("news");
            const xFeedIdx = sectionOrder.indexOf("xFeed");
            const bothPresent = newsIdx !== -1 && xFeedIdx !== -1;
            if (bothPresent) {
              const firstKey = newsIdx < xFeedIdx ? "news" : "xFeed";
              if (sectionKey !== firstKey) return null;
            }
            if ((!showNewsSection && !showXFeedSection) || newsCategories.length === 0) return null;
            return (
              <NewsEditorial
                key="news-xfeed"
                newsCategories={newsCategories}
                xHandles={xHandles}
                xMaxTweets={xMaxTweets}
                xEnabled={xEnabled && xStatus?.configured === true}
                condensed
              />
            );
          }

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
                        SEV Store
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
                                <div className="h-9 w-9 rounded-lg bg-green-600/15 flex items-center justify-center shrink-0">
                                  <Folder className="h-4.5 w-4.5 text-green-400" style={{ height: "1.125rem", width: "1.125rem" }} />
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

          case "newsTeaser":
            if (!showNewsTeaser) return null;
            return (
              <section
                key="newsTeaser"
                ref={newsTeaserRef.ref}
                className="relative overflow-hidden bg-[#09090f] border-y border-white/5"
                data-testid="section-news-teaser"
              >
                <div className={`max-w-6xl mx-auto px-6 py-12 transition-all duration-700 ${newsTeaserRef.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                        <Newspaper className="h-4 w-4 text-yellow-400" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-yellow-400/80">Latest News</p>
                        <h2 className="text-lg font-bold text-foreground">From the creator economy.</h2>
                      </div>
                    </div>
                    <Link href="/news">
                      <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" data-testid="link-view-all-news">
                        View All News <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                  <div className="relative overflow-x-auto scrollbar-none" style={{ WebkitOverflowScrolling: "touch" }}>
                    <div className="flex gap-4 pb-2 min-w-min">
                      {newsTeaserItems.length === 0
                        ? Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="flex-shrink-0 w-72 rounded-xl border border-border/40 p-4" data-testid={`card-news-teaser-${i}`}>
                              <Skeleton className="h-3 w-16 mb-3" />
                              <Skeleton className="h-4 w-full mb-1.5" />
                              <Skeleton className="h-4 w-3/4" />
                            </div>
                          ))
                        : newsTeaserItems.map((item, i) => (
                            <a
                              key={i}
                              href={item.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group flex-shrink-0 w-72 rounded-xl border border-border/40 bg-white/[0.02] hover:bg-white/[0.04] hover:border-yellow-500/20 p-4 transition-all duration-200 cursor-pointer block"
                              data-testid={`card-news-teaser-${i}`}
                            >
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                {item.category && (
                                  <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20 text-[10px] font-semibold">
                                    {item.category}
                                  </Badge>
                                )}
                                {item.source && (
                                  <span className="text-[10px] font-semibold uppercase tracking-widest text-yellow-400/60 flex items-center gap-1">
                                    <ExternalLink className="h-3 w-3" />
                                    {item.source}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm font-semibold text-foreground line-clamp-3 group-hover:text-yellow-300/90 transition-colors leading-snug">
                                {item.title}
                              </p>
                              {item.pubDate && (
                                <p className="text-[10px] text-muted-foreground mt-3">
                                  {new Date(item.pubDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                </p>
                              )}
                            </a>
                          ))
                      }
                    </div>
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
                className="relative overflow-hidden bg-[#080810] text-white"
                data-testid="section-signup-cta"
              >
                <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                  <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-red-900/20 blur-[130px] motion-safe:animate-[pulse_9s_ease-in-out_infinite]" />
                  <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-indigo-900/15 blur-[110px] motion-safe:animate-[pulse_11s_ease-in-out_infinite_4s]" />
                </div>
                <div className={`relative z-10 max-w-5xl mx-auto px-6 py-20 md:py-28 transition-all duration-700 ${signupCtaRef.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
                  <div className="grid lg:grid-cols-2 gap-12 items-center">
                    <div>
                      <Badge className="mb-4 bg-red-600/20 text-red-300 border-red-500/20 text-xs font-semibold uppercase tracking-wider">
                        Join SEVCO
                      </Badge>
                      <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4 leading-tight">
                        One account.<br />
                        <span style={{ color: "#ef4444" }}>Everything unlocked.</span>
                      </h2>
                      <p className="text-white/50 text-sm leading-relaxed mb-6">
                        Create a free SEVCO account and get instant access to the full platform — store, music, wiki, news, projects, and more.
                      </p>
                      <Link href="/auth">
                        <Button
                          size="lg"
                          className="bg-red-600 hover:bg-red-500 text-white font-semibold gap-2 shadow-lg shadow-red-900/30"
                          data-testid="button-signup-cta-create-account"
                        >
                          <Star className="h-4 w-4" />
                          Create Free Account
                        </Button>
                      </Link>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { icon: Music, label: "SEVCO RECORDS", desc: "Stream & discover music", color: "#3b82f6" },
                        { icon: ShoppingBag, label: "SEV Store", desc: "Shop exclusive drops", color: "#ef4444" },
                        { icon: Folder, label: "Ventures", desc: "Follow active projects", color: "#22c55e" },
                        { icon: Newspaper, label: "News Feed", desc: "AI-curated creator news", color: "#eab308" },
                        { icon: Users, label: "Community", desc: "Connect with creators", color: "#6366f1" },
                        { icon: BookOpen, label: "Wiki", desc: "Platform knowledge base", color: "#3b82f6" },
                      ].map(({ icon: Icon, label, desc, color }) => (
                        <div
                          key={label}
                          className="rounded-xl border border-white/[0.07] p-4"
                          style={{ background: "rgba(255,255,255,0.03)", backdropFilter: "blur(12px)" }}
                          data-testid={`card-signup-feature-${label.toLowerCase().replace(/\s+/g, "-")}`}
                        >
                          <div
                            className="h-8 w-8 rounded-lg flex items-center justify-center mb-2"
                            style={{ backgroundColor: `${color}20` }}
                          >
                            <Icon className="h-4 w-4" style={{ color }} />
                          </div>
                          <p className="text-xs font-bold text-white mb-0.5">{label}</p>
                          <p className="text-[11px] text-white/40 leading-tight">{desc}</p>
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
              <section key="wikiLatest" className="overflow-hidden bg-muted/40 border-y border-border/60">
                <div className="max-w-6xl mx-auto px-6 py-16 md:py-20">
                  <div className="flex items-end justify-between mb-8">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">SEVCO Wiki</p>
                      <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Latest knowledge.</h2>
                    </div>
                    <Link href="/wiki">
                      <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" data-testid="link-view-all-wiki">
                        View all <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                  {artLoading ? (
                    <div className="flex flex-col gap-3">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-20 w-full rounded-xl" />
                      ))}
                    </div>
                  ) : recentArticles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <BookOpen className="h-12 w-12 text-muted-foreground/20 mb-3" />
                      <p className="text-sm text-muted-foreground">No articles yet.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {recentArticles.map((article) => (
                        <ArticleCard key={article.id} article={article} />
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
                    <a href={DISCORD_INVITE} target="_blank" rel="noopener noreferrer">
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

          default:
            return null;
        }
      })}
    </div>
  );
}
