import { Link } from "wouter";
import { PageHead } from "@/components/page-head";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  FileText,
  Clock,
  ArrowRight,
  Sparkles,
  Shield,
  FolderOpen,
  TrendingUp,
  Layers,
  Palette,
  Music,
  Bot,
  Settings,
  Code2,
  LifeBuoy,
} from "lucide-react";
import type { Article, Category } from "@shared/schema";
import { articleUrl } from "@/lib/wiki-urls";
import { SparkButton } from "@/components/spark-button";
import { SparkIcon } from "@/components/spark-icon";
import { useAuth } from "@/hooks/use-auth";

type ArticleWithSparks = Article & {
  category?: { id: number; name: string; slug: string } | null;
  sparkCount?: number;
  sparkedByCurrentUser?: boolean;
};

export default function Home() {
  const { user } = useAuth();
  const { data: articles, isLoading: artLoading } = useQuery<ArticleWithSparks[]>({
    queryKey: ["/api/articles", "recent"],
  });

  const { data: categories, isLoading: catLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: platformSettings = {} } = useQuery<Record<string, string>>({
    queryKey: ["/api/platform-settings"],
  });

  const wikiTagHsl = platformSettings["wiki.tagColor"];

  const { data: stats } = useQuery<{
    totalArticles: number;
    totalRevisions: number;
    pendingReviews: number;
    totalCitations: number;
  }>({
    queryKey: ["/api/stats"],
  });

  const publishedArticles = articles?.filter((a) => a.status === "published") || [];
  const featuredArticle = publishedArticles[0];

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 flex flex-col gap-6">
      <PageHead
        slug="wiki"
        title="Wiki — SEVCO"
        description="Explore the SEVCO knowledge base — articles, guides, and documentation across engineering, design, operations, and more."
        ogUrl="https://sevco.us/wiki"
      />
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Wiki</h1>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Articles", value: stats?.totalArticles ?? 0, icon: FileText },
          { label: "Revisions", value: stats?.totalRevisions ?? 0, icon: Clock },
          { label: "Pending Reviews", value: stats?.pendingReviews ?? 0, icon: Shield },
          { label: "Citations", value: stats?.totalCitations ?? 0, icon: TrendingUp },
        ].map((stat) => (
          <Card key={stat.label} className="p-3 overflow-visible">
            <div className="flex items-center gap-2 mb-1">
              <stat.icon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </div>
            <p className="text-xl font-bold" data-testid={`stat-${stat.label.toLowerCase().replace(" ", "-")}`}>
              {stat.value}
            </p>
          </Card>
        ))}
      </div>

      {featuredArticle && (
        <Link href={articleUrl(featuredArticle)}>
          <Card className="p-4 hover-elevate active-elevate-2 cursor-pointer overflow-visible">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-primary">Featured Article</span>
            </div>
            <h2 className="text-lg font-bold mb-1" data-testid="text-featured-title">
              {featuredArticle.title}
            </h2>
            {featuredArticle.summary && (
              <p className="text-sm text-muted-foreground line-clamp-2">{featuredArticle.summary}</p>
            )}
            <div className="flex items-center gap-2 mt-3">
              {featuredArticle.tags?.slice(0, 3).map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-[10px]"
                  style={wikiTagHsl ? {
                    backgroundColor: `hsl(${wikiTagHsl} / 0.12)`,
                    borderColor: `hsl(${wikiTagHsl} / 0.3)`,
                    color: `hsl(${wikiTagHsl})`,
                  } : undefined}
                >
                  {tag}
                </Badge>
              ))}
              <div className="ml-auto flex items-center gap-2">
                <SparkButton
                  entityType="article"
                  entityId={featuredArticle.slug}
                  sparkCount={featuredArticle.sparkCount ?? 0}
                  sparkedByCurrentUser={featuredArticle.sparkedByCurrentUser ?? false}
                  isOwner={!!user && user.id === featuredArticle.authorId}
                  showCountWhenOwner
                  size="sm"
                />
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
              </div>
            </div>
          </Card>
        </Link>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Recent Articles
            </h2>
            <Link href="/search">
              <Button variant="ghost" size="sm" data-testid="button-view-all">
                View all
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            {artLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="p-3 overflow-visible">
                    <Skeleton className="h-5 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-full" />
                  </Card>
                ))
              : publishedArticles.slice(0, 5).map((article) => (
                  <Link key={article.id} href={articleUrl(article)}>
                    <Card
                      className="p-3 hover-elevate active-elevate-2 cursor-pointer overflow-visible"
                      data-testid={`card-article-${article.id}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium truncate">{article.title}</h3>
                          {article.summary && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                              {article.summary}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <SparkButton
                            entityType="article"
                            entityId={article.slug}
                            sparkCount={article.sparkCount ?? 0}
                            sparkedByCurrentUser={article.sparkedByCurrentUser ?? false}
                            isOwner={!!user && user.id === article.authorId}
                            showCountWhenOwner
                            size="sm"
                          />
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
            Categories
          </h2>
          <div className="flex flex-col gap-3">
            {[
              { slug: "general",     name: "General",     icon: Layers,     href: "/wiki/general",     description: "Projects, services, legal, and general resources." },
              { slug: "operations",  name: "Operations",  icon: Settings,   href: "/wiki/operations",   description: "Processes, suppliers, compliance, onboarding, and finance." },
              { slug: "engineering", name: "Engineering", icon: Code2,      href: "/wiki/engineering",  description: "Platform development, projects, and technical docs." },
              { slug: "design",      name: "Design",      icon: Palette,    href: "/wiki/design",       description: "Brand guidelines, UI/UX, and design resources." },
              { slug: "sales",       name: "Sales",       icon: TrendingUp, href: "/wiki/sales",        description: "Sales processes, client onboarding, and market research." },
              { slug: "support",     name: "Support",     icon: LifeBuoy,   href: "/wiki/support",      description: "How-to guides, escalation processes, and FAQ." },
            ].map((cat) => (
              <Link key={cat.slug} href={cat.href}>
                <Card
                  className={`p-3 hover-elevate active-elevate-2 cursor-pointer overflow-visible${cat.slug === "engineering" ? " border-primary/20 bg-primary/5" : ""}`}
                  data-testid={`card-category-${cat.slug}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <cat.icon className={`h-4 w-4 shrink-0${cat.slug === "engineering" ? " text-primary" : " text-muted-foreground"}`} />
                      <div>
                        <h3 className="text-sm font-medium">{cat.name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{cat.description}</p>
                      </div>
                    </div>
                    <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Sparks marketing section */}
      <div
        className="rounded-xl border border-yellow-400/30 bg-gradient-to-br from-yellow-400/5 via-yellow-400/10 to-transparent p-5"
        data-testid="section-sparks-marketing"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <SparkIcon size="lg" decorative />
              <span className="text-sm font-bold text-yellow-500 uppercase tracking-wider">Sparks</span>
            </div>
            <p className="text-base font-semibold leading-snug">
              The SEVCO creative currency — buy once, use anywhere.
            </p>
            <p className="text-sm text-muted-foreground max-w-lg">
              Power AI tools, generate visuals, access beats and premium features, and boost your visibility — all with Sparks. No subscription required.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              {[
                { icon: Palette, label: "AI Art" },
                { icon: Music, label: "Music Tools" },
                { icon: Bot, label: "AI Chat" },
                { icon: Sparkles, label: "Creative Features" },
              ].map(({ icon: Icon, label }) => (
                <span key={label} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Icon className="h-3.5 w-3.5 text-yellow-500" />
                  {label}
                </span>
              ))}
            </div>
          </div>
          <div className="shrink-0">
            <Link href="/pricing">
              <Button
                className="bg-[#0037ff] text-white hover:bg-[#0037ff]/90 font-bold gap-2"
                data-testid="button-sparks-cta"
              >
                <SparkIcon size="md" decorative />
                Get Sparks
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
