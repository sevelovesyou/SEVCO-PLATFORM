import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import * as LucideIcons from "lucide-react";
import {
  BookOpen, ShoppingBag, Music, Folder, Briefcase,
  ArrowRight, Users, Star, ChevronRight, Pin,
  Zap, Globe, Layers,
} from "lucide-react";
import { SiDiscord } from "react-icons/si";
import type { Article, Product, FeedPost } from "@shared/schema";
import planetIcon from "@assets/SEVCO_planet_icon_black_1774331331137.png";

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
    accent: "from-orange-500/20 to-orange-600/5 border-orange-500/20",
    iconColor: "text-orange-500",
    iconBg: "bg-orange-500/10",
  },
  {
    label: "Music",
    description: "SEVCO RECORDS — releases, artists, and a catalog built for independent creators.",
    path: "/music",
    icon: Music,
    accent: "from-violet-500/20 to-violet-600/5 border-violet-500/20",
    iconColor: "text-violet-500",
    iconBg: "bg-violet-500/10",
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
  { icon: "Music", label: "Music", href: "/music", color: "#f97316" },
  { icon: "ShoppingBag", label: "Store", href: "/store", color: "#f97316" },
  { icon: "Folder", label: "Projects", href: "/projects", color: "#f97316" },
  { icon: "Users", label: "Community", href: "/contact", color: "#f97316" },
  { icon: "Zap", label: "Fast", href: "/", color: "#f97316" },
  { icon: "Globe", label: "Global", href: "/", color: "#f97316" },
  { icon: "Layers", label: "All-in-One", href: "/", color: "#f97316" },
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

function ProductCard({ product }: { product: Product }) {
  const [imgError, setImgError] = useState(false);
  return (
    <Link href={`/store/products/${product.slug}`}>
      <div
        className="group rounded-xl border bg-white/[0.03] border-white/8 hover:bg-white/[0.06] hover:border-white/15 transition-all duration-200 overflow-hidden cursor-pointer"
        data-testid={`card-product-${product.id}`}
      >
        <div className="aspect-square bg-muted/40 overflow-hidden">
          {product.imageUrl && !imgError ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ShoppingBag className="h-10 w-10 text-muted-foreground/30" />
            </div>
          )}
        </div>
        <div className="p-3">
          <p className="text-xs font-semibold text-foreground truncate">{product.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
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

import { useState } from "react";

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

  type FeedPostWithAuthor = FeedPost & {
    author: { username: string; displayName: string | null; avatarUrl: string | null } | null;
  };

  const { data: pinnedFeedPosts = [] } = useQuery<FeedPostWithAuthor[]>({
    queryKey: ["/api/feed?pinned=true&limit=1"],
    queryFn: async () => {
      const res = await fetch("/api/feed?pinned=true&limit=1");
      return res.json();
    },
  });

  const pinnedPost = pinnedFeedPosts[0] ?? null;

  const recentArticles = articles.filter((a) => a.status === "published").slice(0, 3);
  const featuredProducts = products.slice(0, 4);

  const heroBgUrl = settings["hero.backgroundImageUrl"] ?? "";
  const heroText = settings["hero.text"] || DEFAULT_HERO_TEXT;
  const btn1Label = settings["hero.button1.label"] || DEFAULT_BTN1_LABEL;
  const btn1Url = settings["hero.button1.url"] || DEFAULT_BTN1_URL;
  const btn1IconName = settings["hero.button1.icon"];
  const btn2Label = settings["hero.button2.label"] || DEFAULT_BTN2_LABEL;
  const btn2Url = settings["hero.button2.url"] || DEFAULT_BTN2_URL;
  const btn2IconName = settings["hero.button2.icon"];
  const heroOverlayOpacity = settings["hero.overlayOpacity"] ? parseInt(settings["hero.overlayOpacity"]) / 100 : 0.7;

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
  const showRecordsSpotlight = toBool(settings["section.recordsSpotlight.visible"]);
  const showStorePreview = toBool(settings["section.storePreview.visible"]);
  const showWikiLatest = toBool(settings["section.wikiLatest.visible"]);
  const showCommunityCta = toBool(settings["section.communityCta.visible"]);
  const showBulletin = toBool(settings["section.bulletin.visible"]);

  return (
    <div className="min-h-screen bg-background">
      {/* ── HERO ── */}
      <section
        className="relative overflow-hidden bg-[#0a0a12] text-white"
        style={heroBgUrl ? {
          backgroundImage: `url(${heroBgUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        } : undefined}
        data-testid="section-hero"
      >
        {/* Animated gradient blobs */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute -top-28 -left-36 w-[600px] h-[600px] rounded-full bg-orange-600/20 blur-[120px] animate-[pulse_8s_ease-in-out_infinite]" />
          <div className="absolute -bottom-28 -right-36 w-[500px] h-[500px] rounded-full bg-green-600/15 blur-[120px] animate-[pulse_10s_ease-in-out_infinite_2s]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[300px] rounded-full bg-amber-600/10 blur-[100px] animate-[pulse_12s_ease-in-out_infinite_4s]" />
        </div>

        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
          aria-hidden="true"
        />

        {heroBgUrl && <div className="absolute inset-0 bg-[#0a0a12] pointer-events-none" style={{ opacity: heroOverlayOpacity }} />}

        <div className="relative z-10 max-w-6xl mx-auto px-6 py-24 md:py-36 flex flex-col items-center text-center gap-6">
          <div className="flex items-center gap-4">
            <img
              src={settings["hero.logoUrl"] || settings["platform.logoUrl"] || planetIcon}
              alt="SEVCO"
              className="h-28 w-28 md:h-36 md:w-36 object-contain dark:invert-0 invert"
              data-testid="img-planet-hero"
            />
          </div>
          <div>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-3 leading-tight">
              <span className="bg-gradient-to-r from-orange-400 via-amber-300 to-green-400 bg-clip-text text-transparent">
                Everything SEVCO.
              </span>
            </h1>
            <p className="text-white/60 text-base md:text-lg max-w-xl mx-auto leading-relaxed">
              {heroText}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
            <Link href={btn1Url}>
              <Button
                size="lg"
                className="bg-orange-500 hover:bg-orange-400 text-white font-semibold gap-2 px-6 shadow-lg"
                data-testid="button-hero-primary"
              >
                <Btn1Icon className="h-4 w-4" />
                {btn1Label}
              </Button>
            </Link>
            <Link href={btn2Url}>
              <Button
                size="lg"
                variant="ghost"
                className="text-white/70 hover:text-white hover:bg-white/10 border border-white/10 font-semibold gap-2 px-6"
                data-testid="button-hero-secondary"
              >
                <Btn2Icon className="h-4 w-4" />
                {btn2Label}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── WHY SEVCO — FEATURE PILLS ── */}
      <section
        className="bg-[#0f0f1a] border-y border-white/5 px-4 py-5"
        data-testid="section-feature-pills"
      >
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-center gap-6 md:gap-10">
          {whySevcoPills.map((pill) => {
            const PillIcon = getLucideIcon(pill.icon);
            const accentColor = pill.color || "#f97316";
            const inner = (
              <div
                className="flex items-center gap-2.5 cursor-pointer"
                data-testid={`feature-pill-${pill.label.toLowerCase()}`}
              >
                <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg" style={{ backgroundColor: `${accentColor}26` }}>
                  {PillIcon ? <PillIcon className="h-4 w-4" style={{ color: accentColor }} /> : null}
                </div>
                <p className="text-xs font-semibold text-white/80">{pill.label}</p>
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

      {/* ── BULLETIN ── */}
      {showBulletin && pinnedPost && (
        <section className="max-w-6xl mx-auto px-6 py-8">
          <div className="rounded-2xl border bg-muted/30 border-border/60 p-5 flex flex-col sm:flex-row sm:items-start gap-4" data-testid="section-bulletin">
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
            <Link href="/feed" className="shrink-0">
              <Button variant="outline" size="sm" className="gap-1 text-xs whitespace-nowrap" data-testid="link-bulletin-read-more">
                Read more <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </section>
      )}

      {/* ── PLATFORM GRID ── */}
      {showPlatformGrid && (
        <section className="max-w-6xl mx-auto px-6 py-16 md:py-20">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">The Platform</p>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Everything SEVCO, in one place.</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                        className="group relative rounded-2xl border bg-gradient-to-br p-5 cursor-pointer hover:shadow-md hover:bg-white/[0.03] transition-all duration-200 border-border/30 from-muted/40 to-muted/10"
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
                    className={`group relative rounded-2xl border bg-gradient-to-br p-5 cursor-pointer hover:shadow-md hover:bg-white/[0.03] transition-all duration-200 ${section.accent}`}
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
          </div>
        </section>
      )}

      {/* ── SEVCO RECORDS SPOTLIGHT ── */}
      {showRecordsSpotlight && (
        <section className="relative overflow-hidden bg-gradient-to-br from-violet-950 via-violet-900 to-indigo-900">
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <div className="absolute -bottom-16 -left-20 w-[400px] h-[400px] rounded-full bg-violet-500/15 blur-[100px] animate-[pulse_9s_ease-in-out_infinite]" />
            <div className="absolute top-0 right-0 w-[300px] h-[300px] rounded-full bg-indigo-500/10 blur-[80px] animate-[pulse_11s_ease-in-out_infinite_3s]" />
          </div>
          <div className="relative max-w-6xl mx-auto px-6 py-14 md:py-20 flex flex-col md:flex-row md:items-center gap-8">
            <div className="flex-1">
              <Badge className="mb-4 bg-violet-500/30 text-violet-200 border-violet-400/30 text-xs font-semibold uppercase tracking-wider">
                SEVCO RECORDS
              </Badge>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 tracking-tight">
                Independent music, built for artists.
              </h2>
              <p className="text-violet-200/80 text-sm leading-relaxed max-w-lg">
                SEVCO RECORDS is our label — discovering and developing artists across every genre, with distribution, promotion, and creative support from day one.
              </p>
              <div className="flex gap-3 mt-6">
                <Link href="/music">
                  <Button
                    size="sm"
                    className="bg-violet-500 hover:bg-violet-400 text-white font-semibold gap-2"
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
                    className="border-violet-400/40 text-violet-200 hover:bg-violet-800/50 gap-2"
                    data-testid="button-records-artists"
                  >
                    Browse Artists
                  </Button>
                </Link>
              </div>
            </div>
            <div className="hidden md:flex items-center justify-center">
              <div className="h-40 w-40 rounded-3xl bg-white/[0.03] border border-violet-400/20 flex items-center justify-center">
                <Music className="h-20 w-20 text-violet-300/60" />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── STORE PREVIEW ── */}
      {showStorePreview && (
        <section className="max-w-6xl mx-auto px-6 py-16 md:py-20">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">SEV Store</p>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Shop the latest.</h2>
            </div>
            <Link href="/store">
              <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" data-testid="link-view-all-products">
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
          {prodLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl overflow-hidden">
                  <Skeleton className="aspect-square w-full" />
                  <div className="p-3">
                    <Skeleton className="h-3 w-3/4 mb-1.5" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : featuredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ShoppingBag className="h-12 w-12 text-muted-foreground/20 mb-3" />
              <p className="text-sm text-muted-foreground">Products coming soon.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── LATEST FROM WIKI ── */}
      {showWikiLatest && (
        <section className="bg-muted/40 border-y border-border/60">
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
      )}

      {/* ── COMMUNITY CTA ── */}
      {showCommunityCta && (
        <section className="relative overflow-hidden bg-gradient-to-br from-indigo-900/60 via-background to-violet-900/30 border-t border-white/5 px-6 py-20 md:py-28 text-center">
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <div className="absolute top-0 left-1/4 w-[400px] h-[400px] rounded-full bg-indigo-600/10 blur-[100px] animate-[pulse_10s_ease-in-out_infinite]" />
            <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] rounded-full bg-violet-600/10 blur-[80px] animate-[pulse_8s_ease-in-out_infinite_3s]" />
          </div>
          <div className="relative z-10 max-w-xl mx-auto">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-indigo-500/15 flex items-center justify-center">
                <SiDiscord className="h-5 w-5 text-indigo-400" />
              </div>
              <Badge className="bg-indigo-500/15 text-indigo-400 border-indigo-500/20 text-xs font-semibold">
                Community
              </Badge>
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">
              <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
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
                    data-testid="button-sign-up"
                  >
                    <Star className="h-4 w-4" />
                    Create Account
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
