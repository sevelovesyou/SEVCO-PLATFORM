import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import * as LucideIcons from "lucide-react";
import {
  BookOpen, ShoppingBag, Music, Folder, Briefcase,
  ArrowRight, Users, Star, ChevronRight,
} from "lucide-react";
import { SiDiscord } from "react-icons/si";
import type { Article, Product } from "@shared/schema";
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
        className="group rounded-xl border bg-card hover:border-foreground/20 transition-all duration-200 overflow-hidden cursor-pointer"
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
        className="group flex items-start gap-3 p-3 rounded-xl border bg-card hover:border-foreground/20 transition-all duration-200 cursor-pointer"
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

  const Btn1Icon = getLucideIcon(btn1IconName) || BookOpen;
  const Btn2Icon = getLucideIcon(btn2IconName) || ShoppingBag;

  const showPlatformGrid = toBool(settings["section.platformGrid.visible"]);
  const showRecordsSpotlight = toBool(settings["section.recordsSpotlight.visible"]);
  const showStorePreview = toBool(settings["section.storePreview.visible"]);
  const showWikiLatest = toBool(settings["section.wikiLatest.visible"]);
  const showCommunityCta = toBool(settings["section.communityCta.visible"]);

  return (
    <div className="min-h-screen bg-background">
      {/* ── HERO ── */}
      <section
        className="relative overflow-hidden bg-foreground text-background"
        style={heroBgUrl ? {
          backgroundImage: `url(${heroBgUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        } : undefined}
      >
        <div className="absolute inset-0 opacity-5 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none" />
        {heroBgUrl && <div className="absolute inset-0 bg-foreground/70 pointer-events-none" />}
        <div className="relative max-w-6xl mx-auto px-6 py-24 md:py-32 flex flex-col items-center text-center gap-6">
          <div className="flex items-center gap-4">
            <img
              src={planetIcon}
              alt="SEVCO Planet"
              className="h-28 w-28 md:h-36 md:w-36 object-contain invert dark:invert-0"
              data-testid="img-planet-hero"
            />
          </div>
          <div>
            <p className="text-background/60 text-base md:text-lg max-w-xl mx-auto leading-relaxed">
              {heroText}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
            <Link href={btn1Url}>
              <Button
                size="lg"
                variant="secondary"
                className="bg-background text-foreground hover:bg-background/90 font-semibold gap-2 px-6"
                data-testid="button-hero-primary"
              >
                <Btn1Icon className="h-4 w-4" />
                {btn1Label}
              </Button>
            </Link>
            <Link href={btn2Url}>
              <Button
                size="lg"
                variant="outline"
                className="border-background/30 text-background hover:bg-background/10 font-semibold gap-2 px-6"
                data-testid="button-hero-secondary"
              >
                <Btn2Icon className="h-4 w-4" />
                {btn2Label}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── PLATFORM GRID ── */}
      {showPlatformGrid && (
        <section className="max-w-6xl mx-auto px-6 py-16 md:py-20">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">The Platform</p>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Everything SEVCO, in one place.</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PLATFORM_SECTIONS.map((section) => (
              <Link key={section.path} href={section.path}>
                <div
                  className={`group relative rounded-2xl border bg-gradient-to-br p-5 cursor-pointer hover:shadow-md transition-all duration-200 ${section.accent}`}
                  data-testid={`card-platform-${section.label.toLowerCase()}`}
                >
                  <div className={`h-10 w-10 rounded-xl ${section.iconBg} flex items-center justify-center mb-4`}>
                    <section.icon className={`h-5 w-5 ${section.iconColor}`} />
                  </div>
                  <h3 className="text-sm font-bold text-foreground mb-1">{section.label}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{section.description}</p>
                  <ArrowRight className="absolute bottom-4 right-4 h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── SEVCO RECORDS SPOTLIGHT ── */}
      {showRecordsSpotlight && (
        <section className="relative overflow-hidden bg-gradient-to-br from-violet-950 via-violet-900 to-indigo-900">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-violet-400 via-transparent to-transparent pointer-events-none" />
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
              <div className="h-40 w-40 rounded-3xl bg-gradient-to-br from-violet-500/30 to-indigo-600/30 border border-violet-400/20 flex items-center justify-center">
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
        <section className="max-w-6xl mx-auto px-6 py-16 md:py-24">
          <div className="rounded-3xl border bg-gradient-to-br from-indigo-500/10 via-background to-violet-500/5 border-indigo-500/20 p-8 md:p-12 flex flex-col md:flex-row md:items-center gap-8">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                  <SiDiscord className="h-5 w-5 text-indigo-500" />
                </div>
                <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 text-xs font-semibold">
                  Community
                </Badge>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-3">Join the SEVCO community.</h2>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-md">
                Connect with the team and community on Discord. Get updates, share feedback, and be part of what's next.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0">
              <a href={DISCORD_INVITE} target="_blank" rel="noopener noreferrer">
                <Button
                  size="lg"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold gap-2 w-full sm:w-auto md:w-full"
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
                    variant="outline"
                    className="font-semibold gap-2 w-full sm:w-auto md:w-full"
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
