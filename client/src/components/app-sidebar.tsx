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
} from "lucide-react";
import type { Category, Article } from "@shared/schema";

import logoImg from "@assets/SEVCO_App_Icon_-_SEVCO_App_Icon_2_(1)_1771523059981.png";

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

  const { data: categories, isLoading: catLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: recentArticles, isLoading: artLoading } = useQuery<Article[]>({
    queryKey: ["/api/articles", "recent"],
  });

  const { data: pendingCount } = useQuery<{ count: number }>({
    queryKey: ["/api/revisions", "pending-count"],
  });

  const navItems = [
    { title: "Home", url: "/", icon: BookOpen },
    { title: "Search", url: "/search", icon: Search },
    { title: "New Article", url: "/new", icon: Plus },
    { title: "Review Queue", url: "/review", icon: Shield },
  ];

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer" data-testid="link-home-logo">
            <div className="h-8 w-8 flex items-center justify-center overflow-hidden rounded-md">
              <img src={logoImg} alt="SEVCO Logo" className="h-full w-full object-cover" />
            </div>
            <div>
              <h1 className="text-sm font-bold leading-tight">SEVCO Wiki</h1>
              <p className="text-[10px] text-muted-foreground leading-tight">sevelovesyou.com</p>
            </div>
          </div>
        </Link>
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
