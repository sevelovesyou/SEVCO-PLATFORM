import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { usePermission } from "@/hooks/use-permission";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Home,
  BookOpen,
  Music,
  ShoppingBag,
  Folder,
  LayoutDashboard,
  LogOut,
  User,
  Menu,
} from "lucide-react";
import wordmarkBlack from "@assets/SEVCO_Logo_Black_1774331197327.png";

const ROLE_BADGE_VARIANTS: Record<string, string> = {
  admin:     "bg-primary text-primary-foreground",
  executive: "bg-violet-600 text-white dark:bg-violet-500",
  staff:     "bg-green-600 text-white dark:bg-green-500",
  partner:   "bg-orange-500 text-white",
  client:    "bg-yellow-500 text-white dark:bg-yellow-400 dark:text-black",
  user:      "bg-muted text-muted-foreground",
};

const APP_NAV = [
  { label: "Home",      path: "/",          icon: Home },
  { label: "Wiki",      path: "/wiki",       icon: BookOpen },
  { label: "Music",     path: "/music",      icon: Music },
  { label: "Store",     path: "/store",      icon: ShoppingBag },
  { label: "Projects",  path: "/projects",   icon: Folder },
  { label: "Dashboard", path: "/dashboard",  icon: LayoutDashboard },
];

const WIKI_PREFIXES = ["/wiki", "/edit/", "/new", "/search", "/review", "/category/", "/account"];

function getActiveApp(location: string): string {
  if (location === "/") return "/";
  for (const prefix of WIKI_PREFIXES) {
    if (location === prefix || location.startsWith(prefix)) return "/wiki";
  }
  for (const app of APP_NAV) {
    if (app.path !== "/" && app.path !== "/wiki" && location.startsWith(app.path)) {
      return app.path;
    }
  }
  return "";
}

interface PlatformHeaderProps {
  showSidebarTrigger?: boolean;
}

export function PlatformHeader({ showSidebarTrigger }: PlatformHeaderProps) {
  const { user, logout } = useAuth();
  const { role } = usePermission();
  const [location] = useLocation();
  const activeApp = getActiveApp(location);
  const roleBadgeClass = ROLE_BADGE_VARIANTS[role ?? "user"] ?? ROLE_BADGE_VARIANTS.user;

  return (
    <header
      className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur-sm"
      data-testid="platform-header"
    >
      <div className="flex h-12 items-center gap-2 px-3">
        {showSidebarTrigger && (
          <SidebarTrigger data-testid="button-sidebar-toggle" className="-ml-1" />
        )}

        <Link href="/">
          <div
            className="flex items-center gap-2 shrink-0 cursor-pointer"
            data-testid="link-platform-home"
          >
            <img
              src={wordmarkBlack}
              alt="SEVCO"
              className="h-6 w-auto dark:invert"
            />
          </div>
        </Link>

        <div className="w-px h-5 bg-border mx-1 hidden md:block" />

        <nav className="hidden md:flex items-center gap-0.5 flex-1" data-testid="nav-app-switcher">
          {APP_NAV.map((item) => {
            const isActive = activeApp === item.path;
            return (
              <Link href={item.path} key={item.path}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  size="sm"
                  className={`gap-1.5 h-8 text-xs font-medium ${
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  data-testid={`nav-${item.label.toLowerCase()}`}
                >
                  <item.icon className="h-3.5 w-3.5" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </nav>

        <div className="md:hidden flex-1" />

        <div className="flex items-center gap-1.5">
          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" data-testid="button-mobile-menu">
                  <Menu className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {APP_NAV.map((item) => {
                  const isActive = activeApp === item.path;
                  return (
                    <Link href={item.path} key={item.path}>
                      <DropdownMenuItem
                        className={`gap-2 cursor-pointer ${isActive ? "font-semibold" : ""}`}
                        data-testid={`mobile-nav-${item.label.toLowerCase()}`}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                      </DropdownMenuItem>
                    </Link>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {user && (
            <>
              <span
                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded capitalize hidden sm:block ${roleBadgeClass}`}
                data-testid="badge-role"
              >
                {role}
              </span>
              <span className="text-xs text-muted-foreground hidden sm:flex items-center gap-1">
                <User className="h-3 w-3" />
                <span data-testid="text-username">{user.displayName || user.username}</span>
              </span>
            </>
          )}

          <ThemeToggle />

          {user && (
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              data-testid="button-logout"
              className="gap-1 h-8 text-xs"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:block">Sign out</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
