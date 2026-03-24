import { Link, useLocation } from "wouter";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { usePermission } from "@/hooks/use-permission";
import { useQuery } from "@tanstack/react-query";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
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
  Briefcase,
  Folder,
  LayoutDashboard,
  LogOut,
  User,
  Menu,
  ChevronDown,
  ArrowRight,
  Circle,
} from "lucide-react";
import wordmarkBlack from "@assets/SEVCO_Logo_Black_1774331197327.png";
import type { Project } from "@shared/schema";

const ROLE_BADGE_VARIANTS: Record<string, string> = {
  admin:     "bg-primary text-primary-foreground",
  executive: "bg-violet-600 text-white dark:bg-violet-500",
  staff:     "bg-green-600 text-white dark:bg-green-500",
  partner:   "bg-orange-500 text-white",
  client:    "bg-yellow-500 text-white dark:bg-yellow-400 dark:text-black",
  user:      "bg-muted text-muted-foreground",
};

const CATEGORY_COLORS: Record<string, string> = {
  Platform: "text-blue-500",
  App:      "text-purple-500",
  Game:     "text-green-500",
  Label:    "text-pink-500",
  Media:    "text-orange-500",
  Other:    "text-muted-foreground",
};

const APP_NAV = [
  { label: "Home",      path: "/",          icon: Home },
  { label: "Wiki",      path: "/wiki",       icon: BookOpen },
  { label: "Music",     path: "/music",      icon: Music },
  { label: "Store",     path: "/store",      icon: ShoppingBag },
  { label: "Services",  path: "/services",   icon: Briefcase },
  { label: "CMD",       path: "/command",    icon: LayoutDashboard },
];

const WIKI_PREFIXES = ["/wiki", "/edit/", "/new", "/search", "/review", "/category/", "/account"];

function getActiveApp(location: string): string {
  if (location === "/") return "/";
  for (const prefix of WIKI_PREFIXES) {
    if (location === prefix || location.startsWith(prefix)) return "/wiki";
  }
  if (location.startsWith("/projects")) return "/projects";
  for (const app of APP_NAV) {
    if (app.path !== "/" && app.path !== "/wiki" && location.startsWith(app.path)) {
      return app.path;
    }
  }
  return "";
}

function ProjectsDropdown({ isActive }: { isActive: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const featuredProjects = (projects ?? [])
    .filter((p) => p.featured && p.status !== "archived")
    .slice(0, 6);

  const activeProjects = featuredProjects.filter((p) => p.status === "active");
  const devProjects = featuredProjects.filter((p) => p.status === "in-development");

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <Button
        variant={isActive ? "secondary" : "ghost"}
        size="sm"
        className={`gap-1.5 h-8 text-xs font-medium ${
          isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
        }`}
        onClick={() => setOpen((o) => !o)}
        data-testid="nav-projects"
      >
        <Folder className="h-3.5 w-3.5" />
        Projects
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </Button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 w-72 rounded-xl border bg-popover shadow-xl z-50 overflow-hidden">
          <div className="p-3">
            {featuredProjects.length === 0 ? (
              <p className="text-xs text-muted-foreground px-2 py-3 text-center">No projects yet</p>
            ) : (
              <>
                {activeProjects.length > 0 && (
                  <div className="mb-2">
                    {activeProjects.map((project) => (
                      <Link key={project.id} href={`/projects/${project.slug}`} onClick={() => setOpen(false)}>
                        <div
                          className="flex items-start gap-3 px-2.5 py-2.5 rounded-lg hover:bg-muted/70 transition-colors cursor-pointer group"
                          data-testid={`dropdown-project-${project.slug}`}
                        >
                          <div className="mt-0.5 shrink-0">
                            {project.logoUrl ? (
                              <img src={project.logoUrl} alt={project.name} className="h-5 w-5 object-contain rounded" />
                            ) : (
                              <Circle className={`h-2.5 w-2.5 fill-current mt-0.5 ${CATEGORY_COLORS[project.category ?? "Other"] ?? "text-muted-foreground"}`} />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-foreground group-hover:text-foreground leading-none">
                                {project.name}
                              </span>
                              <span className={`text-[10px] font-medium ${CATEGORY_COLORS[project.category ?? "Other"] ?? "text-muted-foreground"}`}>
                                {project.category}
                              </span>
                            </div>
                            {project.description && (
                              <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug line-clamp-1">
                                {project.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}

                {devProjects.length > 0 && (
                  <div className="border-t border-border/60 pt-2 mt-1">
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider px-2.5 mb-1.5">In Development</p>
                    {devProjects.map((project) => (
                      <Link key={project.id} href={`/projects/${project.slug}`} onClick={() => setOpen(false)}>
                        <div
                          className="flex items-start gap-3 px-2.5 py-2.5 rounded-lg hover:bg-muted/70 transition-colors cursor-pointer group"
                          data-testid={`dropdown-project-${project.slug}`}
                        >
                          <div className="mt-0.5 shrink-0">
                            {project.logoUrl ? (
                              <img src={project.logoUrl} alt={project.name} className="h-5 w-5 object-contain rounded" />
                            ) : (
                              <Circle className={`h-2.5 w-2.5 fill-current mt-0.5 ${CATEGORY_COLORS[project.category ?? "Other"] ?? "text-muted-foreground"}`} />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-foreground leading-none">
                                {project.name}
                              </span>
                              <span className="text-[10px] text-blue-500 font-medium">
                                Soon
                              </span>
                            </div>
                            {project.description && (
                              <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug line-clamp-1">
                                {project.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="border-t border-border/60 px-3 py-2.5">
            <Link href="/projects" onClick={() => setOpen(false)}>
              <div className="flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer group px-0.5" data-testid="dropdown-view-all-projects">
                <span className="font-medium">View all projects</span>
                <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export function PlatformHeader() {
  const { user, logout } = useAuth();
  const { role } = usePermission();
  const [location] = useLocation();
  const activeApp = getActiveApp(location);
  const roleBadgeClass = ROLE_BADGE_VARIANTS[role ?? "user"] ?? ROLE_BADGE_VARIANTS.user;

  const canAccessCMD = role === "admin" || role === "executive" || role === "staff";

  return (
    <header
      className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur-sm"
      data-testid="platform-header"
    >
      <div className="flex h-12 items-center gap-2 px-3">
        <Link href="/" className="shrink-0">
          <div
            className="flex items-center gap-2 cursor-pointer"
            data-testid="link-platform-home"
          >
            <img
              src={wordmarkBlack}
              alt="SEVCO"
              className="h-6 w-auto object-contain dark:invert"
            />
          </div>
        </Link>

        <div className="w-px h-5 bg-border mx-1 hidden md:block" />

        <nav className="hidden md:flex items-center gap-0.5 flex-1" data-testid="nav-app-switcher">
          {APP_NAV.filter((item) => item.path !== "/command").map((item) => {
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

          <ProjectsDropdown isActive={activeApp === "/projects"} />

          {canAccessCMD && (() => {
            const cmdItem = APP_NAV.find((item) => item.path === "/command")!;
            const isActive = activeApp === "/command";
            return (
              <Link href="/command" key="/command">
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  size="sm"
                  className={`gap-1.5 h-8 text-xs font-medium ${
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  data-testid="nav-cmd"
                >
                  <cmdItem.icon className="h-3.5 w-3.5" />
                  {cmdItem.label}
                </Button>
              </Link>
            );
          })()}
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
                {APP_NAV.filter((item) => {
                  if (item.path === "/command") return canAccessCMD;
                  return true;
                }).map((item) => {
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
                <Link href="/projects">
                  <DropdownMenuItem
                    className={`gap-2 cursor-pointer ${activeApp === "/projects" ? "font-semibold" : ""}`}
                    data-testid="mobile-nav-projects"
                  >
                    <Folder className="h-4 w-4" />
                    Projects
                  </DropdownMenuItem>
                </Link>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {user && (
            <Link href="/account" className="hidden sm:flex items-center gap-1.5 cursor-pointer" data-testid="link-account">
              <span
                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded capitalize ${roleBadgeClass}`}
                data-testid="badge-role"
              >
                {role}
              </span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <User className="h-3 w-3" />
                <span data-testid="text-username">{user.displayName || user.username}</span>
              </span>
            </Link>
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
