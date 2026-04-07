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
  Archive,
  RotateCcw,
  ScrollText,
  Wand2,
  Scale,
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Category, Article } from "@shared/schema";
import { articleUrl } from "@/lib/wiki-urls";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { usePermission } from "@/hooks/use-permission";

import { SevcoLogo } from "@/components/sevco-logo";

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
  const { canCreateArticle, canAccessReviewQueue, canDeleteArticle, canAccessArchive } = usePermission();
  const { toast } = useToast();

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
    { title: "Home", url: "/wiki", icon: BookOpen, show: true },
    { title: "Search", url: "/search", icon: Search, show: true },
    { title: "Changelog", url: "/changelog", icon: ScrollText, show: true },
    { title: "New Article", url: "/new", icon: Plus, show: canCreateArticle },
    { title: "Wikify", url: "/wikify", icon: Wand2, show: canCreateArticle },
    { title: "Review Queue", url: "/review", icon: Shield, show: canAccessReviewQueue },
    { title: "Archive", url: "/wiki/archive", icon: Archive, show: canAccessArchive },
    { title: "Legal", url: "/legal", icon: Scale, show: true },
  ].filter((item) => item.show);

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
                        tooltip={cat.name}
                        data-active={location === `/wiki/${cat.slug}`}
                      >
                        <Link href={`/wiki/${cat.slug}`} data-testid={`link-category-${cat.slug}`}>
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
        {canAccessArchive && archivedArticles && archivedArticles.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center gap-1.5">
              <Archive className="h-3 w-3" />
              Archived ({archivedArticles.length})
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {archivedArticles.map((article) => (
                  <SidebarMenuItem key={article.id}>
                    <div className="flex items-center gap-1 px-2 py-1 rounded-md text-muted-foreground w-full group hover:bg-[hsl(var(--nav-sub-accent))] hover:text-[hsl(var(--nav-sub-accent-foreground))] transition-colors">
                      <FileText className="h-3.5 w-3.5 shrink-0" />
                      <Link
                        href={articleUrl(article)}
                        className="flex-1 min-w-0 text-xs truncate"
                        data-testid={`link-archived-${article.slug}`}
                      >
                        {article.title}
                      </Link>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => unarchiveMutation.mutate(article.id)}
                            className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                            data-testid={`button-unarchive-${article.id}`}
                          >
                            <RotateCcw className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Unarchive</TooltipContent>
                      </Tooltip>
                    </div>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-3">
        <div className="text-[10px] text-muted-foreground text-center group-data-[collapsible=icon]:hidden">
          Encyclopedia for sevco.us
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
