import { useState, useEffect } from "react";
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
  Settings,
  Code2,
  Palette,
  TrendingUp,
  LifeBuoy,
  Archive,
  RotateCcw,
  Wand2,
  ChevronDown,
  ChevronRight,
  Layers,
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Category, Article } from "@shared/schema";
import { articleUrl } from "@/lib/wiki-urls";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { usePermission } from "@/hooks/use-permission";
import { SevcoLogo } from "@/components/sevco-logo";

const categoryIcons: Record<string, typeof BookOpen> = {
  general:     Layers,
  operations:  Settings,
  engineering: Code2,
  design:      Palette,
  sales:       TrendingUp,
  support:     LifeBuoy,
};

const CATEGORY_ORDER = ["general", "operations", "engineering", "design", "sales", "support"];

const COLLAPSED_KEY = "wiki-sidebar-collapsed";

function loadCollapsedState(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(COLLAPSED_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCollapsedState(state: Record<string, boolean>) {
  try {
    localStorage.setItem(COLLAPSED_KEY, JSON.stringify(state));
  } catch {}
}

export function AppSidebar() {
  const [location] = useLocation();
  const { canCreateArticle, canAccessReviewQueue, canDeleteArticle, canAccessArchive } = usePermission();
  const { toast } = useToast();

  const [collapsedState, setCollapsedState] = useState<Record<string, boolean>>(() => loadCollapsedState());

  const toggleCategory = (slug: string) => {
    setCollapsedState((prev) => {
      const next = { ...prev, [slug]: !prev[slug] };
      saveCollapsedState(next);
      return next;
    });
  };

  const isCategoryOpen = (slug: string) => !collapsedState[slug];

  const { data: categories, isLoading: catLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: recentArticles, isLoading: artLoading } = useQuery<(Article & { category?: { id: number; name: string; slug: string } | null })[]>({
    queryKey: ["/api/articles", "recent"],
  });

  const { data: pendingCount } = useQuery<{ count: number }>({
    queryKey: ["/api/revisions", "pending-count"],
    enabled: canAccessReviewQueue,
  });

  const { data: archivedArticles } = useQuery<Article[]>({
    queryKey: ["/api/articles/archived"],
    enabled: canAccessArchive,
  });

  const unarchiveMutation = useMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/articles/${id}/unarchive`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/articles"] });
      toast({ title: "Article unarchived" });
    },
    onError: () => {
      toast({ title: "Failed to unarchive article", variant: "destructive" });
    },
  });

  const navItems = [
    { title: "Main", url: "/wiki", icon: BookOpen, show: true },
    { title: "Search", url: "/search", icon: Search, show: true },
    { title: "New Article", url: "/wiki/new", icon: Plus, show: canCreateArticle },
    { title: "Wikify", url: "/wikify", icon: Wand2, show: canCreateArticle },
    { title: "Review Queue", url: "/wiki/review", icon: Shield, show: canAccessReviewQueue },
  ].filter((item) => item.show);

  const mainCategories = [...(categories ?? [])]
    .filter((c) => !c.parentId)
    .sort((a, b) => {
      const ai = CATEGORY_ORDER.indexOf(a.slug);
      const bi = CATEGORY_ORDER.indexOf(b.slug);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });

  const subcategoriesByParent = (categories ?? []).reduce<Record<number, Category[]>>((acc, cat) => {
    if (cat.parentId) {
      if (!acc[cat.parentId]) acc[cat.parentId] = [];
      acc[cat.parentId].push(cat);
    }
    return acc;
  }, {});

  const recentMostArchived = archivedArticles?.[0];

  return (
    <Sidebar collapsible="icon" className="top-12 h-[calc(100svh-3rem)] wiki-sidebar">
      <SidebarHeader className="p-3 pt-4">
        <div className="flex items-center gap-2">
          <SidebarTrigger data-testid="button-sidebar-toggle" className="-ml-0.5 shrink-0" />
          <Link href="/wiki" className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden overflow-hidden">
            <div className="flex items-center gap-2 cursor-pointer" data-testid="link-home-logo">
              <SevcoLogo size={28} />
              <div className="min-w-0">
                <h1 className="text-sm font-bold leading-tight truncate">
                  Wiki
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
                    tooltip={item.title}
                    data-active={location === item.url}
                  >
                    <Link href={item.url} data-testid={`link-nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
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
                mainCategories.map((cat) => {
                  const CatIcon = categoryIcons[cat.slug] || FolderOpen;
                  const subs = subcategoriesByParent[cat.id] ?? [];
                  const isOpen = isCategoryOpen(cat.slug);

                  return (
                    <SidebarMenuItem key={cat.id}>
                      <div className="w-full">
                        <div className="flex items-center w-full group-data-[collapsible=icon]:justify-center">
                          <SidebarMenuButton
                            asChild
                            tooltip={cat.name}
                            data-active={location === `/wiki/${cat.slug}`}
                            className="flex-1"
                          >
                            <Link href={`/wiki/${cat.slug}`} data-testid={`link-category-${cat.slug}`}>
                              <CatIcon className="h-4 w-4" />
                              <span>{cat.name}</span>
                            </Link>
                          </SidebarMenuButton>
                          {subs.length > 0 && (
                            <button
                              onClick={() => toggleCategory(cat.slug)}
                              className="shrink-0 p-1 rounded hover:bg-[hsl(var(--nav-sub-accent))] text-muted-foreground group-data-[collapsible=icon]:hidden"
                              data-testid={`button-toggle-category-${cat.slug}`}
                            >
                              {isOpen ? (
                                <ChevronDown className="h-3.5 w-3.5" />
                              ) : (
                                <ChevronRight className="h-3.5 w-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                        {subs.length > 0 && isOpen && (
                          <div className="ml-5 mt-0.5 space-y-0.5 group-data-[collapsible=icon]:hidden">
                            {subs.map((sub) => (
                              <SidebarMenuButton
                                key={sub.id}
                                asChild
                                tooltip={sub.name}
                                data-active={location === `/wiki/${cat.slug}/${sub.slug}`}
                                className="text-xs h-7"
                              >
                                <Link
                                  href={`/wiki/${cat.slug}/${sub.slug}`}
                                  data-testid={`link-subcategory-${sub.slug}`}
                                >
                                  <span className="truncate">{sub.name}</span>
                                </Link>
                              </SidebarMenuButton>
                            ))}
                          </div>
                        )}
                      </div>
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
                recentArticles?.slice(0, 3).map((article) => (
                  <SidebarMenuItem key={article.id}>
                    <SidebarMenuButton
                      asChild
                      tooltip={article.title}
                      data-active={location === articleUrl(article)}
                    >
                      <Link href={articleUrl(article)} data-testid={`link-recent-${article.slug}`}>
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

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="Archive"
                  data-active={location === "/wiki/archive"}
                >
                  <Link href="/wiki/archive" data-testid="link-nav-archive">
                    <Archive className="h-4 w-4" />
                    <span>View Archive</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {recentMostArchived && (
                <SidebarMenuItem>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-md text-muted-foreground w-full group hover:bg-[hsl(var(--nav-sub-accent))] hover:text-[hsl(var(--nav-sub-accent-foreground))] transition-colors">
                    <FileText className="h-3.5 w-3.5 shrink-0" />
                    <Link
                      href={articleUrl(recentMostArchived)}
                      className="flex-1 min-w-0 text-xs truncate"
                      data-testid={`link-archived-${recentMostArchived.slug}`}
                    >
                      {recentMostArchived.title}
                    </Link>
                    {canAccessArchive && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => unarchiveMutation.mutate(recentMostArchived.id)}
                            className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                            data-testid={`button-unarchive-${recentMostArchived.id}`}
                          >
                            <RotateCcw className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Unarchive</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        <div className="text-[10px] text-muted-foreground text-center group-data-[collapsible=icon]:hidden">
          Encyclopedia for sevco.us
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
