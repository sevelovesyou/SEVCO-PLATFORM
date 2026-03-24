import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BookOpen,
  FileText,
  Plus,
  Shield,
  Search,
  FolderOpen,
  Globe,
  Settings,
  Code2,
  Palette,
  TrendingUp,
  LifeBuoy,
  User,
} from "lucide-react";
import type { Category, Article } from "@shared/schema";
import { usePermission } from "@/hooks/use-permission";

import planetBlack from "@assets/SEVCO_planet_icon_black_1774331331137.png";

const categoryIcons: Record<string, typeof Globe> = {
  general:     Globe,
  operations:  Settings,
  engineering: Code2,
  design:      Palette,
  sales:       TrendingUp,
  support:     LifeBuoy,
};

const CATEGORY_ORDER = ["general", "operations", "engineering", "design", "sales", "support"];

export function AppSidebar() {
  const [location] = useLocation();
  const { canCreateArticle, canAccessReviewQueue } = usePermission();

  const { data: categories, isLoading: catLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: recentArticles, isLoading: artLoading } = useQuery<Article[]>({
    queryKey: ["/api/articles", "recent"],
  });

  const { data: pendingCount } = useQuery<{ count: number }>({
    queryKey: ["/api/revisions", "pending-count"],
    enabled: canAccessReviewQueue,
  });

  const { data: latestUpdate } = useQuery<{ updatedAt: string | null }>({
    queryKey: ["/api/articles/latest-update"],
  });

  const lastUpdatedLabel = (() => {
    if (!latestUpdate?.updatedAt) return null;
    const d = new Date(latestUpdate.updatedAt);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  })();

  const navItems = [
    { title: "Home", url: "/wiki", icon: BookOpen, show: true },
    { title: "Search", url: "/search", icon: Search, show: true },
    { title: "New Article", url: "/new", icon: Plus, show: canCreateArticle },
    { title: "Review Queue", url: "/review", icon: Shield, show: canAccessReviewQueue },
    { title: "Account", url: "/account", icon: User, show: true },
  ].filter((item) => item.show);

  return (
    <Sidebar>
      <SidebarHeader className="p-3">
        <div className="flex items-center gap-2">
          <SidebarTrigger data-testid="button-sidebar-toggle" className="-ml-0.5 shrink-0" />
          <Link href="/wiki" className="flex-1 min-w-0">
            <div className="flex items-center gap-2 cursor-pointer" data-testid="link-home-logo">
              <div className="h-7 w-7 flex items-center justify-center shrink-0">
                <img src={planetBlack} alt="SEVCO Planet" className="h-full w-full object-contain dark:invert" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-bold leading-tight truncate">
                  SEVCO WIKI{lastUpdatedLabel ? ` — Updated ${lastUpdatedLabel}` : ""}
                </h1>
              </div>
            </div>
          </Link>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    data-active={location === item.url}
                  >
                    <Link href={item.url} data-testid={`link-nav-${item.title.toLowerCase().replace(" ", "-")}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                      {item.title === "Review Queue" && pendingCount && pendingCount.count > 0 && (
                        <Badge variant="destructive" className="text-[10px] ml-auto">
                          {pendingCount.count}
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Categories</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {catLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <SidebarMenuItem key={i}>
                    <div className="px-2 py-1.5">
                      <Skeleton className="h-5 w-full" />
                    </div>
                  </SidebarMenuItem>
                ))
              ) : (
                [...(categories ?? [])].sort((a, b) => {
                  const ai = CATEGORY_ORDER.indexOf(a.slug);
                  const bi = CATEGORY_ORDER.indexOf(b.slug);
                  return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
                }).map((cat) => {
                  const CatIcon = categoryIcons[cat.slug] || FolderOpen;
                  return (
                    <SidebarMenuItem key={cat.id}>
                      <SidebarMenuButton
                        asChild
                        data-active={location === `/category/${cat.slug}`}
                      >
                        <Link href={`/category/${cat.slug}`} data-testid={`link-category-${cat.slug}`}>
                          <CatIcon className="h-4 w-4" />
                          <span>{cat.name}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Recent Articles</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {artLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <SidebarMenuItem key={i}>
                    <div className="px-2 py-1.5">
                      <Skeleton className="h-5 w-full" />
                    </div>
                  </SidebarMenuItem>
                ))
              ) : (
                recentArticles?.slice(0, 6).map((article) => (
                  <SidebarMenuItem key={article.id}>
                    <SidebarMenuButton
                      asChild
                      data-active={location === `/wiki/${article.slug}`}
                    >
                      <Link href={`/wiki/${article.slug}`} data-testid={`link-recent-${article.slug}`}>
                        <FileText className="h-4 w-4" />
                        <span className="truncate">{article.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        <div className="text-[10px] text-muted-foreground text-center">
          Encyclopedia for sevelovesyou.com
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
