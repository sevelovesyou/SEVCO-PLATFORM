import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { Link } from "wouter";
import { usePermission } from "@/hooks/use-permission";
import { useAuth } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const ROLE_COLORS: Record<string, string> = {
  admin:     "bg-primary/10 text-primary border-primary/20",
  executive: "bg-blue-600/10 text-blue-700 dark:text-blue-400 border-blue-600/20",
  staff:     "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  partner:   "bg-red-700/10 text-red-800 dark:text-red-500 border-red-700/20",
  client:    "bg-yellow-500/10 text-yellow-700 dark:text-yellow-500 border-yellow-500/20",
  user:      "bg-muted text-muted-foreground border-border",
};

const SEGMENT_LABELS: Record<string, string> = {
  command: "CMD",
  store: "Store",
  users: "Users",
  changelog: "Changelog",
  services: "Services",
  jobs: "Jobs",
  music: "Music",
  playlists: "Playlists",
  resources: "Resources",
  settings: "Settings",
  gallery: "Gallery",
  media: "Media Library",
  support: "Support",
  staff: "Staff",
  "chat-log": "Chat Log",
  minecraft: "Minecraft",
  "ai-agents": "AI Agents",
  finance: "Finance",
  traffic: "Traffic",
  news: "News",
  hosting: "Hosting",
  display: "Display",
  "social-links": "Social Links",
};

function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 10) return "just now";
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

interface CommandPageProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export function CommandPageLayout({ children, title, subtitle }: CommandPageProps) {
  const { role } = usePermission();
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (role === "partner" || role === "client" || role === "user") {
      setLocation("/");
    }
  }, [role, setLocation]);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 15000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/store/stats"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/hostinger/vps"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/resources"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] }),
    ]);
    setLastRefreshed(new Date());
    setTimeout(() => setIsRefreshing(false), 600);
  }, [queryClient]);

  const defaultTitle = title ?? "Command";
  const defaultSubtitle = subtitle ?? (() => {
    if (role === "admin") return "Platform-wide management and analytics";
    if (role === "executive") return "Business overview and key metrics";
    if (role === "staff") return "Your activity and wiki overview";
    return "Platform overview and quick access";
  })();

  const segments = location
    .split("/")
    .filter(Boolean);

  const breadcrumbItems: Array<{ label: string; href: string; isCurrent: boolean }> = [];
  let accPath = "";
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    accPath += `/${seg}`;
    const label = SEGMENT_LABELS[seg] ?? seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " ");
    breadcrumbItems.push({
      label,
      href: accPath,
      isCurrent: i === segments.length - 1,
    });
  }

  const showBreadcrumbs = breadcrumbItems.length > 1;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 flex flex-col gap-6">
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold tracking-tight">{defaultTitle}</h1>
            {role && (
              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded capitalize border ${ROLE_COLORS[role] ?? ""}`}>
                {role}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:inline" data-testid="text-last-updated">
              Updated {formatRelativeTime(lastRefreshed)}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-7 w-7"
              data-testid="button-refresh-dashboard"
              title="Refresh data"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{defaultSubtitle}</p>
      </div>

      {showBreadcrumbs && (
        <Breadcrumb data-testid="breadcrumb-nav">
          <BreadcrumbList>
            {breadcrumbItems.map((item, idx) => {
              const elements = [];
              if (idx > 0) {
                elements.push(<BreadcrumbSeparator key={`sep-${item.href}`} />);
              }
              elements.push(
                <BreadcrumbItem key={item.href}>
                  {item.isCurrent ? (
                    <BreadcrumbPage data-testid={`breadcrumb-current-${item.label.toLowerCase().replace(/\s+/g, "-")}`}>
                      {item.label}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link href={item.href} data-testid={`breadcrumb-link-${item.label.toLowerCase().replace(/\s+/g, "-")}`}>
                        {item.label}
                      </Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              );
              return elements;
            })}
          </BreadcrumbList>
        </Breadcrumb>
      )}

      {children}
    </div>
  );
}
