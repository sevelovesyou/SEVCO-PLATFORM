import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { usePermission } from "@/hooks/use-permission";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BookOpen,
  Music,
  ShoppingBag,
  Folder,
  LayoutDashboard,
  User,
  ArrowRight,
  Clock,
  FileText,
} from "lucide-react";
import type { Article } from "@shared/schema";

const PLATFORM_SECTIONS = [
  {
    label: "Wiki",
    description: "Encyclopedic knowledge base for SEVCO",
    path: "/wiki",
    icon: BookOpen,
    color: "text-primary",
    bg: "bg-primary/10",
    restrictedTo: null,
  },
  {
    label: "Music",
    description: "SEVCO RECORDS — releases, artists, and catalog",
    path: "/music",
    icon: Music,
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-500/10",
    restrictedTo: null,
  },
  {
    label: "Store",
    description: "Merchandise, products, and exclusive drops",
    path: "/store",
    icon: ShoppingBag,
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-500/10",
    restrictedTo: null,
  },
  {
    label: "Projects",
    description: "SEVCO Ventures — ongoing projects and initiatives",
    path: "/projects",
    icon: Folder,
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-500/10",
    restrictedTo: null,
  },
  {
    label: "Dashboard",
    description: "Platform analytics, management, and admin tools",
    path: "/dashboard",
    icon: LayoutDashboard,
    color: "text-sky-600 dark:text-sky-400",
    bg: "bg-sky-500/10",
    restrictedTo: null,
  },
  {
    label: "Account",
    description: "Your profile, settings, and preferences",
    path: "/account",
    icon: User,
    color: "text-muted-foreground",
    bg: "bg-muted",
    restrictedTo: null,
  },
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function Landing() {
  const { user } = useAuth();
  const { role } = usePermission();

  const { data: articles, isLoading: artLoading } = useQuery<Article[]>({
    queryKey: ["/api/articles", "recent"],
  });

  const publishedArticles = articles?.filter((a) => a.status === "published").slice(0, 5) || [];
  const displayName = user?.displayName || user?.username || "there";
  const greeting = getGreeting();

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 flex flex-col gap-8">
      <div className="pt-2">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          {greeting}, <span className="text-primary">{displayName}</span>
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Welcome to the SEVCO Platform. What would you like to explore today?
        </p>
      </div>

      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Platform
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {PLATFORM_SECTIONS.map((section) => {
            const isRestricted =
              section.restrictedTo !== null && !section.restrictedTo.includes(role ?? "user");
            const inner = (
              <Card
                className={`p-4 overflow-visible group transition-all ${
                  isRestricted
                    ? "opacity-50 cursor-not-allowed"
                    : "cursor-pointer hover-elevate active-elevate-2"
                }`}
                data-testid={`card-section-${section.label.toLowerCase()}`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`h-9 w-9 rounded-lg ${section.bg} flex items-center justify-center shrink-0`}
                  >
                    <section.icon className={`h-4 w-4 ${section.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold">{section.label}</h3>
                      {!isRestricted && (
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {isRestricted ? "Access restricted for your role" : section.description}
                    </p>
                  </div>
                </div>
              </Card>
            );

            return isRestricted ? (
              <div key={section.path}>{inner}</div>
            ) : (
              <Link href={section.path} key={section.path}>
                {inner}
              </Link>
            );
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Clock className="h-3.5 w-3.5" />
            Recent Wiki Activity
          </h2>
          <Link href="/wiki">
            <span className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              View all →
            </span>
          </Link>
        </div>

        <div className="flex flex-col gap-2">
          {artLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="p-3 overflow-visible">
                  <Skeleton className="h-4 w-3/4 mb-1.5" />
                  <Skeleton className="h-3 w-full" />
                </Card>
              ))
            : publishedArticles.length === 0
            ? (
                <Card className="p-4 overflow-visible text-center">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-40" />
                  <p className="text-sm text-muted-foreground">No published articles yet.</p>
                </Card>
              )
            : publishedArticles.map((article) => (
                <Link key={article.id} href={`/wiki/${article.slug}`}>
                  <Card
                    className="p-3 hover-elevate active-elevate-2 cursor-pointer overflow-visible"
                    data-testid={`card-recent-${article.id}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{article.title}</p>
                        {article.summary && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                            {article.summary}
                          </p>
                        )}
                      </div>
                      <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                    </div>
                  </Card>
                </Link>
              ))}
        </div>
      </div>

      <div className="text-center text-xs text-muted-foreground pb-2">
        sevelovesyou.com · SEVCO Platform
      </div>
    </div>
  );
}
