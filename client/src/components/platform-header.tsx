import { Link, useLocation } from "wouter";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { usePermission } from "@/hooks/use-permission";
import { useCart } from "@/hooks/use-cart";
import { useQuery } from "@tanstack/react-query";
import { resolveImageUrl } from "@/lib/resolve-image-url";
import { ThemeToggle } from "@/components/theme-toggle";
import { SearchOverlay } from "@/components/search-overlay";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import * as LucideIcons from "lucide-react";
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
  Mail,
  Users,
  Music2,
  Headphones,
  ListMusic,
  Send,
  Tag,
  Package,
  Code2,
  Palette,
  TrendingUp,
  Settings2,
  Handshake,
  HeadphonesIcon,
  Plug,
  Lightbulb,
  MousePointer2,
  Sparkles,
  FileText,
  Share2,
  ClipboardList,
  Target,
  StickyNote,
  Rss,
  ScrollText,
  Globe,
  Search,
  HardDrive,
  Wrench,
  Images,
  MessageCircle,
  Megaphone,
  CheckSquare,
  Wand2,
  Lock,
  Drum,
} from "lucide-react";
import wordmarkBlack from "@assets/SEVCO_Logo_Black_1774331197327.png";
import { ChatSheet } from "@/components/chat-sheet";
import { useSounds } from "@/hooks/use-sounds";
import { useMusicPlayer } from "@/contexts/music-player-context";
import { Volume2, VolumeX, Bell } from "lucide-react";
import type { Project, Service } from "@shared/schema";
import { NotificationDropdown } from "@/components/notification-dropdown";

function resolveLucideIcon(name: string | null | undefined): React.ElementType | null {
  if (!name) return null;
  const icons = LucideIcons as unknown as Record<string, React.ElementType>;
  return icons[name] ?? null;
}

const ROLE_BADGE_VARIANTS: Record<string, string> = {
  admin:     "bg-primary text-primary-foreground",
  executive: "bg-blue-600 text-white dark:bg-blue-600",
  staff:     "bg-green-600 text-white dark:bg-green-500",
  partner:   "bg-red-700 text-white",
  client:    "bg-yellow-500 text-white dark:bg-yellow-400 dark:text-black",
  user:      "bg-muted text-muted-foreground",
};

const CATEGORY_COLORS: Record<string, string> = {
  Platform: "text-blue-500",
  App:      "text-blue-600",
  Game:     "text-green-500",
  Label:    "text-pink-500",
  Media:    "text-red-600",
  Other:    "text-muted-foreground",
};

const CATEGORY_ICON_MAP: Record<string, React.ElementType> = {
  Platform: Code2,
  App:      Code2,
  Game:     Folder,
  Label:    Music,
  Media:    TrendingUp,
  Other:    Folder,
};

const SERVICE_ICON_MAP: Record<string, React.ElementType> = {
  Code2, Plug, Lightbulb, Palette, MousePointer2, Sparkles,
  FileText, Share2, TrendingUp, ClipboardList, Settings2,
  Handshake, Target, HeadphonesIcon, BookOpen, Briefcase,
  Creative: Sparkles, Technology: Code2, Marketing: Megaphone,
  Business: Briefcase, Media: Music, Support: HeadphonesIcon,
};

function buildServiceColumnGroups(services: Service[], categoryOrder?: string[]): string[][] {
  const rawCats = [...new Set(services.map((s) => s.category).filter(Boolean))];
  let cats: string[];
  if (categoryOrder && categoryOrder.length > 0) {
    const inOrder = categoryOrder.filter((c) => rawCats.includes(c));
    const rest = rawCats.filter((c) => !categoryOrder.includes(c)).sort();
    cats = [...inOrder, ...rest];
  } else {
    cats = rawCats.sort();
  }
  const groups: string[][] = [];
  for (let i = 0; i < cats.length; i += 2) {
    groups.push(cats.slice(i, i + 2));
  }
  return groups;
}

const WIKI_PREFIXES = ["/wiki", "/edit/", "/new", "/search", "/review", "/category/", "/wikify"];

function getActiveApp(location: string): string {
  if (location === "/") return "/";
  for (const prefix of WIKI_PREFIXES) {
    if (location === prefix || location.startsWith(prefix)) return "/wiki";
  }
  if (location.startsWith("/projects")) return "/projects";
  if (location.startsWith("/services")) return "/services";
  if (location.startsWith("/store")) return "/store";
  if (location.startsWith("/music")) return "/music";
  if (location.startsWith("/command")) return "/command";
  if (location.startsWith("/notes")) return "/notes";
  if (location.startsWith("/gallery")) return "/gallery";
  if (location.startsWith("/messages")) return "/messages";
  if (location.startsWith("/tools")) return "/tools";
  return "";
}

function useDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open || !ref.current) return;
    const container = ref.current;
    function handleKeyDown(e: KeyboardEvent) {
      if (!container.contains(document.activeElement)) return;
      const panel = container.querySelector("[data-dropdown-panel]");
      if (!panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), [role='menuitem'], [tabindex]:not([tabindex='-1'])"));
      if (items.length === 0) return;
      const current = document.activeElement as HTMLElement;
      const idx = items.indexOf(current);
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = idx < items.length - 1 ? idx + 1 : 0;
        items[next].focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prev = idx > 0 ? idx - 1 : items.length - 1;
        items[prev].focus();
      } else if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        const trigger = container.querySelector<HTMLElement>("button");
        trigger?.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return { open, setOpen, ref };
}

function NavButton({
  label,
  isActive,
  onClick,
  open,
  icon: Icon,
  "data-testid": testId,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
  open: boolean;
  icon?: React.ElementType;
  "data-testid"?: string;
}) {
  return (
    <Button
      variant={isActive ? "secondary" : "ghost"}
      size="sm"
      className={`gap-1 h-8 text-xs font-medium pr-2 ${
        isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
      onClick={onClick}
      data-testid={testId}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {label}
      <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
    </Button>
  );
}

function DropdownPanel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div data-dropdown-panel className={`absolute top-full left-0 mt-1.5 rounded-xl border bg-popover shadow-xl z-50 overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

function HomeDropdown({ isActive }: { isActive: boolean }) {
  const { open, setOpen, ref } = useDropdown();
  const { user } = useAuth();
  const { canCreateArticle } = usePermission();

  const items = [
    { label: "Home",         href: "/",        icon: Home,                    desc: "Go to landing page",             show: true },
    { label: "About",          href: "/about",    icon: BookOpen,               desc: "Learn about SEVCO",              show: true },
    { label: "Wiki",           href: "/wiki",     icon: BookOpen,               desc: "Internal knowledge base",        show: true },
    { label: "What's New",     href: "/platform", icon: LucideIcons.Rocket,     desc: "Platform updates & changelog",   show: true },
    { label: "Contact",        href: "/contact",  icon: Mail,                   desc: "Get in touch",                   show: true },
    { label: "Jobs",           href: "/jobs",     icon: Users,                  desc: "Open positions",                 show: true },
    { label: "News",           href: "/news",     icon: LucideIcons.Newspaper,  desc: "Latest news & trends",           show: true },
    { label: "Account",        href: "/account",  icon: User,                   desc: "Manage your profile",            show: true },
  ].filter((item) => item.show);

  return (
    <div className="relative" ref={ref}>
      <NavButton
        label="SEVCO"
        isActive={isActive}
        onClick={() => setOpen((o) => !o)}
        open={open}
        data-testid="nav-home"
      />
      {open && (
        <DropdownPanel className="w-64">
          <div className="p-2">
            {items.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>
                <div
                  className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-[hsl(var(--nav-sub-accent))] hover:text-[hsl(var(--nav-sub-accent-foreground))] transition-colors cursor-pointer group"
                  data-testid={`dropdown-home-${item.label.toLowerCase()}`}
                >
                  <item.icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0 group-hover:text-[hsl(var(--nav-sub-accent-foreground))]" />
                  <div>
                    <p className="text-xs font-semibold text-foreground group-hover:text-[hsl(var(--nav-sub-accent-foreground))]">{item.label}</p>
                    <p className="text-[11px] text-muted-foreground group-hover:text-[hsl(var(--nav-sub-accent-foreground))]/80">{item.desc}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </DropdownPanel>
      )}
    </div>
  );
}

function StoreDropdown({ isActive }: { isActive: boolean }) {
  const { open, setOpen, ref } = useDropdown();

  const categories = [
    { label: "Apparel",  value: "Apparel" },
    { label: "Games",    value: "Games" },
    { label: "Grocery",  value: "Grocery" },
    { label: "Health",   value: "Health" },
    { label: "Music",    value: "Music" },
    { label: "Books",    value: "Books" },
  ];

  return (
    <div className="relative" ref={ref}>
      <NavButton
        label="Store"
        isActive={isActive}
        onClick={() => setOpen((o) => !o)}
        open={open}
        data-testid="nav-store"
      />
      {open && (
        <DropdownPanel className="w-52">
          <div className="p-2">
            <Link href="/store" onClick={() => setOpen(false)}>
              <div
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[hsl(var(--nav-sub-accent))] hover:text-[hsl(var(--nav-sub-accent-foreground))] transition-colors cursor-pointer group"
                data-testid="dropdown-store-all"
              >
                <ShoppingBag className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-[hsl(var(--nav-sub-accent-foreground))]" />
                <p className="text-xs font-semibold text-foreground group-hover:text-[hsl(var(--nav-sub-accent-foreground))]">All Products</p>
              </div>
            </Link>
            <div className="border-t border-border/60 mt-1 pt-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-1.5">
                Collections
              </p>
              {categories.map((cat) => (
                <Link key={cat.value} href={`/store?category=${cat.value}`} onClick={() => setOpen(false)}>
                  <div
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[hsl(var(--nav-sub-accent))] hover:text-[hsl(var(--nav-sub-accent-foreground))] transition-colors cursor-pointer group"
                    data-testid={`dropdown-store-${cat.label.toLowerCase()}`}
                  >
                    <Tag className="h-3.5 w-3.5 text-muted-foreground shrink-0 group-hover:text-[hsl(var(--nav-sub-accent-foreground))]" />
                    <p className="text-xs text-foreground group-hover:text-[hsl(var(--nav-sub-accent-foreground))]">{cat.label}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </DropdownPanel>
      )}
    </div>
  );
}

function ServicesDropdown({ isActive, platformSettings }: { isActive: boolean; platformSettings?: Record<string, string> }) {
  const { open, setOpen, ref } = useDropdown();

  const { data: services } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const navTitle = platformSettings?.["nav.services.title"] || "Services";
  const navIconName = platformSettings?.["nav.services.icon"] || null;
  const NavIcon = resolveLucideIcon(navIconName);

  let categoryOrder: string[] = [];
  try {
    const raw = platformSettings?.["nav.services.categoryOrder"];
    if (raw) categoryOrder = JSON.parse(raw);
  } catch {}

  const serviceColumnGroups = buildServiceColumnGroups(services ?? [], categoryOrder);

  const byCategory = (cat: string) =>
    (services ?? []).filter((s) => s.category === cat).slice(0, 3);

  return (
    <div className="relative" ref={ref}>
      <Button
        variant={isActive ? "secondary" : "ghost"}
        size="sm"
        className={`gap-1 h-8 text-xs font-medium pr-2 ${
          isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
        }`}
        onClick={() => setOpen((o) => !o)}
        data-testid="nav-services"
      >
        {NavIcon && <NavIcon className="h-3.5 w-3.5 shrink-0" />}
        {navTitle}
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </Button>
      {open && (
        <DropdownPanel className="w-[640px]">
          {/* Featured platform offerings */}
          <div className="p-3 grid grid-cols-3 gap-2 border-b border-border/60">
            <Link href="/hosting" onClick={() => setOpen(false)}>
              <div className="flex items-start gap-2.5 rounded-lg px-2 py-2 hover:bg-[hsl(var(--nav-sub-accent))] hover:text-[hsl(var(--nav-sub-accent-foreground))] transition-colors cursor-pointer group" data-testid="dropdown-services-hosting">
                <HardDrive className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5 group-hover:text-[hsl(var(--nav-sub-accent-foreground))]" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground leading-none group-hover:text-[hsl(var(--nav-sub-accent-foreground))]">Hosting</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 group-hover:text-[hsl(var(--nav-sub-accent-foreground))]/80">Websites, game servers, VPS & more</p>
                </div>
              </div>
            </Link>
          </div>

          {/* Professional services by category */}
          <div className="p-3 grid grid-cols-3 gap-2">
            {serviceColumnGroups.map((pair) => (
              <div key={pair.join("-")} className="space-y-3">
                {pair.map((cat) => {
                  const items = byCategory(cat);
                  const CatIcon = SERVICE_ICON_MAP[cat] ?? Briefcase;
                  return (
                    <div key={cat}>
                      <div className="flex items-center gap-1.5 px-2 mb-1">
                        <CatIcon className="h-3 w-3 text-muted-foreground/60" />
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{cat}</p>
                      </div>
                      {items.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground/50 px-2 py-1 italic">No services in this category yet</p>
                      ) : (
                        items.map((service) => {
                          const IconComp = resolveLucideIcon(service.iconName) ?? Briefcase;
                          return (
                            <Link key={service.id} href={`/services/${service.slug}`} onClick={() => setOpen(false)}>
                              <div
                                className="flex items-start gap-2.5 px-2 py-2 rounded-lg hover:bg-[hsl(var(--nav-sub-accent))] hover:text-[hsl(var(--nav-sub-accent-foreground))] transition-colors cursor-pointer group"
                                data-testid={`dropdown-service-${service.slug}`}
                              >
                                <IconComp className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0 group-hover:text-[hsl(var(--nav-sub-accent-foreground))]" />
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-foreground leading-none group-hover:text-[hsl(var(--nav-sub-accent-foreground))]">{service.name}</p>
                                  {service.tagline && (
                                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1 group-hover:text-[hsl(var(--nav-sub-accent-foreground))]/80">{service.tagline}</p>
                                  )}
                                </div>
                              </div>
                            </Link>
                          );
                        })
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="border-t border-border/60 px-4 py-2.5">
            <Link href="/services" onClick={() => setOpen(false)}>
              <div className="flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer group" data-testid="dropdown-services-all">
                <span className="font-medium">View all services</span>
                <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          </div>
        </DropdownPanel>
      )}
    </div>
  );
}

function MusicDropdown({ isActive }: { isActive: boolean }) {
  const { open, setOpen, ref } = useDropdown();

  const items = [
    { label: "SEVCO RECORDS", href: "/music",             icon: Music,        desc: "The label" },
    { label: "Listen",        href: "/listen",            icon: Headphones,   desc: "Stream music" },
    { label: "Beats",         href: "/music/beats",       icon: Drum,         desc: "Instrumental beats" },
    { label: "Artists",       href: "/music/artists",     icon: Music2,       desc: "Browse artists" },
    { label: "Playlists",     href: "/music/playlists",   icon: ListMusic,    desc: "Curated playlists" },
    { label: "Submit",        href: "/music/submit",      icon: Send,         desc: "Submit your music" },
  ];

  return (
    <div className="relative" ref={ref}>
      <NavButton
        label="Music"
        isActive={isActive}
        onClick={() => setOpen((o) => !o)}
        open={open}
        data-testid="nav-music"
      />
      {open && (
        <DropdownPanel className="w-64">
          <div className="p-2">
            {items.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>
                <div
                  className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-[hsl(var(--nav-sub-accent))] hover:text-[hsl(var(--nav-sub-accent-foreground))] transition-colors cursor-pointer group"
                  data-testid={`dropdown-music-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <item.icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0 group-hover:text-[hsl(var(--nav-sub-accent-foreground))]" />
                  <div>
                    <p className="text-xs font-semibold text-foreground group-hover:text-[hsl(var(--nav-sub-accent-foreground))]">{item.label}</p>
                    <p className="text-[11px] text-muted-foreground group-hover:text-[hsl(var(--nav-sub-accent-foreground))]/80">{item.desc}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </DropdownPanel>
      )}
    </div>
  );
}

function ProjectsDropdown({ isActive }: { isActive: boolean }) {
  const { open, setOpen, ref } = useDropdown();

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const featuredProjects = (projects ?? [])
    .filter((p) => p.featured && p.status !== "archived")
    .slice(0, 6);

  const activeProjects = featuredProjects.filter((p) => p.status === "active");
  const devProjects = featuredProjects.filter((p) => p.status === "in-development");

  return (
    <div className="relative" ref={ref}>
      <NavButton
        label="Projects"
        isActive={isActive}
        onClick={() => setOpen((o) => !o)}
        open={open}
        data-testid="nav-projects"
      />

      {open && (
        <DropdownPanel className="w-72">
          <div className="p-2">
            {featuredProjects.length === 0 ? (
              <p className="text-xs text-muted-foreground px-2 py-3 text-center">No projects yet</p>
            ) : (
              <>
                {activeProjects.length > 0 && (
                  <div className="mb-1">
                    {activeProjects.map((project) => {
                      const MenuIconComp = resolveLucideIcon(project.menuIcon) ?? CATEGORY_ICON_MAP[project.category ?? "Other"] ?? Folder;
                      return (
                        <Link key={project.id} href={`/projects/${project.slug}`} onClick={() => setOpen(false)}>
                          <div
                            className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-[hsl(var(--nav-sub-accent))] hover:text-[hsl(var(--nav-sub-accent-foreground))] transition-colors cursor-pointer group"
                            data-testid={`dropdown-project-${project.slug}`}
                          >
                            <MenuIconComp className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0 group-hover:text-[hsl(var(--nav-sub-accent-foreground))]" />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-foreground leading-none group-hover:text-[hsl(var(--nav-sub-accent-foreground))]">{project.name}</p>
                              {project.description && (
                                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1 group-hover:text-[hsl(var(--nav-sub-accent-foreground))]/80">{project.description}</p>
                              )}
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}

                {devProjects.length > 0 && (
                  <div className="border-t border-border/60 pt-2 mt-1">
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider px-3 mb-1">In Development</p>
                    {devProjects.map((project) => {
                      const MenuIconComp = resolveLucideIcon(project.menuIcon) ?? CATEGORY_ICON_MAP[project.category ?? "Other"] ?? Folder;
                      return (
                        <Link key={project.id} href={`/projects/${project.slug}`} onClick={() => setOpen(false)}>
                          <div
                            className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-[hsl(var(--nav-sub-accent))] hover:text-[hsl(var(--nav-sub-accent-foreground))] transition-colors cursor-pointer group"
                            data-testid={`dropdown-project-${project.slug}`}
                          >
                            <MenuIconComp className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0 group-hover:text-[hsl(var(--nav-sub-accent-foreground))]" />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-xs font-semibold text-foreground leading-none group-hover:text-[hsl(var(--nav-sub-accent-foreground))]">{project.name}</p>
                                <span className="text-[10px] text-blue-500 font-medium">Soon</span>
                              </div>
                              {project.description && (
                                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1 group-hover:text-[hsl(var(--nav-sub-accent-foreground))]/80">{project.description}</p>
                              )}
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="border-t border-border/60 px-4 py-2.5">
            <Link href="/projects" onClick={() => setOpen(false)}>
              <div className="flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer group" data-testid="dropdown-view-all-projects">
                <span className="font-medium">View all projects</span>
                <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          </div>
        </DropdownPanel>
      )}
    </div>
  );
}

function ToolsDropdown({ isActive }: { isActive: boolean }) {
  const { open, setOpen, ref } = useDropdown();
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const allItems = [
    { label: "Notes",   href: "/notes",        icon: StickyNote,   desc: "Personal & shared notes",               requiredRoles: ["user","client","partner","staff","executive","admin"] },
    { label: "Tasks",   href: "/tools/tasks",    icon: CheckSquare,  desc: "Personal to-do list & staff board",     requiredRoles: ["user","client","partner","staff","executive","admin"] },
    { label: "Domains", href: "/tools/domains", icon: Globe,        desc: "Search & register domain names",        requiredRoles: ["user","client","partner","staff","executive","admin"] },
    { label: "Gallery", href: "/gallery",        icon: Images,       desc: "Quick-copy images for your profile",    requiredRoles: ["user","client","partner","staff","executive","admin"] },
    { label: "Email",   href: "/messages",       icon: Mail,         desc: `${user?.username ?? "your"}@sevco.us`,  requiredRoles: ["client","partner","staff","executive","admin"] },
    { label: "Wikify",  href: "/wikify",         icon: Wand2,        desc: "Bulk AI wiki article generator",        requiredRoles: ["partner","staff","executive","admin"] },
  ];

  const handleClick = (item: typeof allItems[number]) => {
    setOpen(false);
    if (!user) { navigate("/auth"); return; }
    if (!item.requiredRoles.includes(user.role)) {
      toast({ title: "Upgrade required", description: "This tool requires a higher account tier.", variant: "destructive" });
      return;
    }
    navigate(item.href);
  };

  return (
    <div className="relative" ref={ref}>
      <div className="relative inline-flex">
        <NavButton
          label="Tools"
          isActive={isActive}
          onClick={() => setOpen((o) => !o)}
          open={open}
          icon={Wrench}
          data-testid="nav-tools"
        />
      </div>
      {open && (
        <DropdownPanel className="w-64">
          <div className="p-2">
            {allItems.map((item) => {
              const locked = !!(user && !item.requiredRoles.includes(user.role));
              return (
                <button
                  key={item.href}
                  className="w-full text-left flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-[hsl(var(--nav-sub-accent))] hover:text-[hsl(var(--nav-sub-accent-foreground))] transition-colors cursor-pointer group"
                  data-testid={`dropdown-tools-${item.label.toLowerCase()}`}
                  onClick={() => handleClick(item)}
                >
                  <item.icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0 group-hover:text-[hsl(var(--nav-sub-accent-foreground))]" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-foreground group-hover:text-[hsl(var(--nav-sub-accent-foreground))]">{item.label}</p>
                      {locked && <Lock className="h-3 w-3 text-muted-foreground/60 ml-auto" />}
                    </div>
                    <p className="text-[11px] text-muted-foreground group-hover:text-[hsl(var(--nav-sub-accent-foreground))]/80">{item.desc}</p>
                  </div>
                </button>
              );
            })}
            <div className="mt-1 pt-1.5 border-t border-border/60 px-3 pb-1">
              <Link href="/tools" onClick={() => setOpen(false)} data-testid="dropdown-tools-view-all">
                <p className="text-[10px] text-muted-foreground/60 italic hover:text-muted-foreground transition-colors">View all tools →</p>
              </Link>
            </div>
          </div>
        </DropdownPanel>
      )}
    </div>
  );
}

export function PlatformHeader() {
  const { user, logout } = useAuth();
  const { role, canCreateArticle: canWikify } = usePermission();
  const { openCart, itemCount } = useCart();
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  const { data: platformSettings } = useQuery<Record<string, string>>({
    queryKey: ["/api/platform-settings"],
    staleTime: 300000,
  });
  const platformLogoUrl = platformSettings?.["platform.logoUrl"] || null;
  const activeApp = getActiveApp(location);
  const roleBadgeClass = ROLE_BADGE_VARIANTS[role ?? "user"] ?? ROLE_BADGE_VARIANTS.user;
  const canAccessCMD = role === "admin" || role === "executive" || role === "staff";
  const showSidebar = !!user && (
    WIKI_PREFIXES.some((p) => location === p || location.startsWith(p)) ||
    location === "/command" || location.startsWith("/command/")
  );

  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSection, setMobileSection] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifTriggerRef = useRef<HTMLDivElement>(null);
  const { soundEnabled, toggleSound, playClick, playNotification } = useSounds();
  const { volume, setVolume } = useMusicPlayer();
  const prevMusicVolumeRef = useRef(0.8);

  useEffect(() => {
    if (!soundEnabled) {
      setVolume(0);
    }
  }, []);

  const { data: notifCount } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/count"],
    refetchInterval: 30000,
    enabled: !!user,
  });
  const unreadNotifCount = notifCount?.count ?? 0;
  const prevCountRef = useRef(-1);
  useEffect(() => {
    if (prevCountRef.current === -1) {
      prevCountRef.current = unreadNotifCount;
      return;
    }
    if (unreadNotifCount > prevCountRef.current) {
      playNotification();
    }
    prevCountRef.current = unreadNotifCount;
  }, [unreadNotifCount, playNotification]);

  const { data: allServices = [] } = useQuery<Service[]>({
    queryKey: ["/api/services"],
    staleTime: 60000,
  });
  const mobileServiceCategoryOrder: string[] = (() => {
    const raw = platformSettings?.["nav.services.categoryOrder"];
    if (raw) { try { return JSON.parse(raw) as string[]; } catch { /* ignore */ } }
    return [];
  })();
  const mobileServiceCategories = (() => {
    const cats = [...new Set(allServices.map((s) => s.category).filter(Boolean))] as string[];
    if (mobileServiceCategoryOrder.length) {
      return [
        ...mobileServiceCategoryOrder.filter((c) => cats.includes(c)),
        ...cats.filter((c) => !mobileServiceCategoryOrder.includes(c)).sort(),
      ];
    }
    return cats.sort();
  })();

  const storeCategories = ["Apparel", "Games", "Grocery", "Health", "Music", "Books"];
  const musicItems = [
    { label: "SEVCO RECORDS", href: "/music" },
    { label: "Listen",        href: "/listen" },
    { label: "Beats",         href: "/music/beats" },
    { label: "Artists",       href: "/music/artists" },
    { label: "Playlists",     href: "/music/playlists" },
    { label: "Submit",        href: "/music/submit" },
  ];
  const homeItems = [
    { label: "Home",         href: "/" },
    { label: "About",        href: "/about" },
    { label: "Wiki",         href: "/wiki" },
    ...(user ? [{ label: "Notes", href: "/notes" }] : []),
    { label: "Contact",      href: "/contact" },
    { label: "Jobs",         href: "/jobs" },
    { label: "Account",      href: "/account" },
  ];

  return (
    <>
    <header
      className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur-sm"
      data-testid="platform-header"
      role="banner"
    >
      <div className="flex h-12 items-center gap-2 px-3">
        <Link href="/" className="shrink-0">
          <div className="flex items-center gap-2 cursor-pointer" data-testid="link-platform-home">
            <img
              src={resolveImageUrl(platformLogoUrl) || wordmarkBlack}
              alt="SEVCO"
              className="h-6 w-auto object-contain dark:invert"
            />
          </div>
        </Link>

        {showSidebar && (
          <SidebarTrigger
            className="md:hidden shrink-0 h-8 w-8"
            data-testid="button-mobile-sidebar-toggle"
          />
        )}

        <div className="w-px h-5 bg-border mx-1 hidden lg:block" />

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-0.5 flex-1" aria-label="Main navigation" data-testid="nav-app-switcher">
          <HomeDropdown isActive={activeApp === "/"} />
          <StoreDropdown isActive={activeApp === "/store"} />
          <ServicesDropdown isActive={activeApp === "/services"} platformSettings={platformSettings} />
          <MusicDropdown isActive={activeApp === "/music"} />
          <ProjectsDropdown isActive={activeApp === "/projects"} />
          <ToolsDropdown isActive={activeApp === "/notes" || activeApp === "/gallery" || activeApp === "/messages" || activeApp === "/tools"} />

          {canAccessCMD && (
            <Link href="/command">
              <Button
                variant={activeApp === "/command" ? "secondary" : "ghost"}
                size="sm"
                className={`gap-1.5 h-8 text-xs font-medium ${
                  activeApp === "/command"
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid="nav-cmd"
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                CMD
              </Button>
            </Link>
          )}
        </nav>

        {canAccessCMD && (
          <Link href="/command" className="hidden md:inline-flex lg:hidden">
            <Button
              variant={activeApp === "/command" ? "secondary" : "ghost"}
              size="sm"
              className={`gap-1.5 h-8 text-xs font-medium ${
                activeApp === "/command"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid="nav-cmd-tablet"
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              CMD
            </Button>
          </Link>
        )}

        <div className="lg:hidden flex-1" />

        {/* Right side actions */}
        <div className="flex items-center gap-1.5">
          <TooltipProvider delayDuration={400}>
          {/* Search button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setSearchOpen(true)}
                data-testid="button-open-search"
                aria-label="Open search"
              >
                <Search className="h-4 w-4" aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Search</TooltipContent>
          </Tooltip>

          {/* Chat button — logged-in only */}
          {user && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setChatOpen(true)}
                  data-testid="button-open-chat"
                  aria-label="Open chat"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Open Chat</TooltipContent>
            </Tooltip>
          )}

          {/* Notification bell — logged-in only */}
          {user && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="relative" ref={notifTriggerRef}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setNotifOpen((o) => !o)}
                    data-testid="button-notifications"
                    aria-label="Notifications"
                  >
                    <Bell className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  {unreadNotifCount > 0 && (
                    <span
                      className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center pointer-events-none"
                      data-testid="badge-notif-count"
                    >
                      {unreadNotifCount > 99 ? "99+" : unreadNotifCount}
                    </span>
                  )}
                  <NotificationDropdown open={notifOpen} onClose={() => setNotifOpen(false)} triggerRef={notifTriggerRef} />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">Notifications{unreadNotifCount > 0 ? ` (${unreadNotifCount})` : ""}</TooltipContent>
            </Tooltip>
          )}

          {/* Cart button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative h-8 w-8"
                onClick={openCart}
                data-testid="button-open-cart"
                aria-label="Open cart"
              >
                <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                {itemCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-700 text-white text-[10px] font-bold flex items-center justify-center" data-testid="cart-badge">
                    {itemCount > 9 ? "9+" : itemCount}
                  </span>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Cart{itemCount > 0 ? ` (${itemCount})` : ""}</TooltipContent>
          </Tooltip>
          </TooltipProvider>

          {/* Mobile/tablet hamburger */}
          <div className="lg:hidden">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => { setMobileOpen(true); setMobileSection(null); }}
                  data-testid="button-mobile-menu"
                  aria-label="Open menu"
                  aria-expanded={mobileOpen}
                >
                  <Menu className="h-4 w-4" aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Menu</TooltipContent>
            </Tooltip>
          </div>

          {user ? (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="hidden sm:flex items-center gap-1.5 cursor-pointer rounded-md px-1.5 py-1 hover:bg-muted/70 transition-colors"
                    data-testid="button-user-menu"
                  >
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
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem asChild>
                    <Link href={`/profile/${user.username}`} data-testid="link-my-profile">
                      <User className="h-3.5 w-3.5 mr-2" />
                      My Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/account" data-testid="link-account">
                      <Settings2 className="h-3.5 w-3.5 mr-2" />
                      Account
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} data-testid="button-logout" className="text-destructive focus:text-destructive">
                    <LogOut className="h-3.5 w-3.5 mr-2" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  if (soundEnabled) {
                    prevMusicVolumeRef.current = volume || 0.8;
                    setVolume(0);
                  } else {
                    setVolume(prevMusicVolumeRef.current);
                  }
                  toggleSound();
                  playClick();
                }}
                aria-label={soundEnabled ? "Mute sounds" : "Unmute sounds"}
                data-testid="button-sound-toggle"
              >
                {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>
              <ThemeToggle />
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  if (soundEnabled) {
                    prevMusicVolumeRef.current = volume || 0.8;
                    setVolume(0);
                  } else {
                    setVolume(prevMusicVolumeRef.current);
                  }
                  toggleSound();
                  playClick();
                }}
                aria-label={soundEnabled ? "Mute sounds" : "Unmute sounds"}
                data-testid="button-sound-toggle-guest"
              >
                {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>
              <ThemeToggle />
              <Link href="/auth">
                <Button size="sm" className="h-8 text-xs" data-testid="button-sign-in">
                  Sign in
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      <Sheet open={mobileOpen} onOpenChange={(o) => { setMobileOpen(o); if (!o) setMobileSection(null); }}>
        <SheetContent side="right" className="w-80 p-0 overflow-y-auto" data-testid="mobile-nav-drawer">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
            <SheetDescription>Site navigation menu</SheetDescription>
          </SheetHeader>
          <nav className="px-3 py-4 space-y-0.5" aria-label="Mobile navigation">
          <Collapsible open={mobileSection === "home"} onOpenChange={(o) => setMobileSection(o ? "home" : null)}>
            <CollapsibleTrigger asChild>
              <button className="flex items-center justify-between w-full text-left px-3 py-2 text-sm font-medium rounded-lg hover:bg-[hsl(var(--nav-sub-accent))] hover:text-[hsl(var(--nav-sub-accent-foreground))] transition-colors" data-testid="mobile-nav-home">
                SEVCO
                <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${mobileSection === "home" ? "rotate-180" : ""}`} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="pl-4 space-y-0.5 py-1">
                {homeItems.map((item) => (
                  <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}>
                    <div className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-colors cursor-pointer" data-testid={`mobile-nav-${item.label.toLowerCase()}`}>
                      {item.label}
                    </div>
                  </Link>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={mobileSection === "store"} onOpenChange={(o) => setMobileSection(o ? "store" : null)}>
            <CollapsibleTrigger asChild>
              <button className="flex items-center justify-between w-full text-left px-3 py-2 text-sm font-medium rounded-lg hover:bg-[hsl(var(--nav-sub-accent))] hover:text-[hsl(var(--nav-sub-accent-foreground))] transition-colors" data-testid="mobile-nav-store">
                Store
                <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${mobileSection === "store" ? "rotate-180" : ""}`} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="pl-4 space-y-0.5 py-1">
                <Link href="/store" onClick={() => setMobileOpen(false)}>
                  <div className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">All Products</div>
                </Link>
                {storeCategories.map((cat) => (
                  <Link key={cat} href={`/store?category=${cat}`} onClick={() => setMobileOpen(false)}>
                    <div className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-colors cursor-pointer" data-testid={`mobile-nav-store-${cat.toLowerCase()}`}>{cat}</div>
                  </Link>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={mobileSection === "services"} onOpenChange={(o) => setMobileSection(o ? "services" : null)}>
            <CollapsibleTrigger asChild>
              <button className="flex items-center justify-between w-full text-left px-3 py-2 text-sm font-medium rounded-lg hover:bg-[hsl(var(--nav-sub-accent))] hover:text-[hsl(var(--nav-sub-accent-foreground))] transition-colors" data-testid="mobile-nav-services">
                {platformSettings?.["nav.services.title"] || "Services"}
                <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${mobileSection === "services" ? "rotate-180" : ""}`} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="pl-4 space-y-0.5 py-1">
                <Link href="/services" onClick={() => setMobileOpen(false)}>
                  <div className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-colors cursor-pointer" data-testid="mobile-nav-services-all">All Services</div>
                </Link>
                <Link href="/hosting" onClick={() => setMobileOpen(false)}>
                  <div className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-colors cursor-pointer" data-testid="mobile-nav-services-hosting">Hosting</div>
                </Link>
                <div className="border-t border-border/40 my-1" />
                {mobileServiceCategories.map((cat) => (
                  <Link key={cat} href={`/services?category=${cat}`} onClick={() => setMobileOpen(false)}>
                    <div
                      className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                      data-testid={`mobile-nav-services-${cat.toLowerCase()}`}
                    >
                      {(() => {
                        const Icon = SERVICE_ICON_MAP[cat];
                        return Icon ? <Icon className="h-3.5 w-3.5 shrink-0" /> : null;
                      })()}
                      {cat}
                    </div>
                  </Link>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={mobileSection === "music"} onOpenChange={(o) => setMobileSection(o ? "music" : null)}>
            <CollapsibleTrigger asChild>
              <button className="flex items-center justify-between w-full text-left px-3 py-2 text-sm font-medium rounded-lg hover:bg-[hsl(var(--nav-sub-accent))] hover:text-[hsl(var(--nav-sub-accent-foreground))] transition-colors" data-testid="mobile-nav-music">
                Music
                <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${mobileSection === "music" ? "rotate-180" : ""}`} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="pl-4 space-y-0.5 py-1">
                {musicItems.map((item) => (
                  <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}>
                    <div className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-colors cursor-pointer" data-testid={`mobile-nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}>
                      {item.label}
                    </div>
                  </Link>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Link href="/projects" onClick={() => setMobileOpen(false)}>
            <div className="px-3 py-2 text-sm font-medium rounded-lg hover:bg-[hsl(var(--nav-sub-accent))] hover:text-[hsl(var(--nav-sub-accent-foreground))] transition-colors cursor-pointer" data-testid="mobile-nav-projects">
              Projects
            </div>
          </Link>

          <Collapsible open={mobileSection === "tools"} onOpenChange={(o) => setMobileSection(o ? "tools" : null)}>
            <CollapsibleTrigger asChild>
              <button className="flex items-center justify-between w-full text-left px-3 py-2 text-sm font-medium rounded-lg hover:bg-[hsl(var(--nav-sub-accent))] hover:text-[hsl(var(--nav-sub-accent-foreground))] transition-colors" data-testid="mobile-nav-tools">
                Tools
                <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${mobileSection === "tools" ? "rotate-180" : ""}`} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="pl-4 space-y-0.5 py-1">
                {[
                  { label: "Notes",   href: "/notes",          testId: "mobile-nav-tools-notes",   requiredRoles: ["user","client","partner","staff","executive","admin"] },
                  { label: "Tasks",   href: "/tools/tasks",   testId: "mobile-nav-tools-tasks",   requiredRoles: ["user","client","partner","staff","executive","admin"] },
                  { label: "Domains", href: "/tools/domains", testId: "mobile-nav-tools-domains", requiredRoles: ["user","client","partner","staff","executive","admin"] },
                  { label: "Gallery", href: "/gallery",        testId: "mobile-nav-tools-gallery", requiredRoles: ["user","client","partner","staff","executive","admin"] },
                  { label: "Email",   href: "/messages",       testId: "mobile-nav-tools-email",   requiredRoles: ["client","partner","staff","executive","admin"] },
                  { label: "Wikify",  href: "/wikify",         testId: "mobile-nav-tools-wikify",  requiredRoles: ["partner","staff","executive","admin"] },
                ].map((item) => (
                  <button
                    key={item.href}
                    className="w-full text-left px-3 py-2 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-colors cursor-pointer flex items-center justify-between"
                    data-testid={item.testId}
                    onClick={() => {
                      setMobileOpen(false);
                      if (!user) { navigate("/auth"); return; }
                      if (!item.requiredRoles.includes(user.role)) {
                        toast({ title: "Upgrade required", description: "This tool requires a higher account tier.", variant: "destructive" });
                        return;
                      }
                      navigate(item.href);
                    }}
                  >
                    {item.label}
                    {user && !item.requiredRoles.includes(user.role) && <Lock className="h-3 w-3 text-muted-foreground/50" />}
                  </button>
                ))}
                <Link href="/tools" onClick={() => setMobileOpen(false)}>
                  <div className="px-3 py-2 text-[11px] text-muted-foreground/60 italic hover:text-muted-foreground transition-colors cursor-pointer" data-testid="mobile-nav-tools-view-all">
                    View all tools →
                  </div>
                </Link>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {canAccessCMD && (
            <Link href="/command" onClick={() => setMobileOpen(false)}>
              <div className="px-3 py-2 text-sm font-medium rounded-lg hover:bg-[hsl(var(--nav-sub-accent))] hover:text-[hsl(var(--nav-sub-accent-foreground))] transition-colors cursor-pointer" data-testid="mobile-nav-cmd">
                CMD
              </div>
            </Link>
          )}

          {!user && (
            <div className="pt-2 border-t border-border mt-2">
              <Link href="/auth" onClick={() => setMobileOpen(false)}>
                <Button size="sm" className="w-full h-9 text-sm" data-testid="mobile-button-sign-in">
                  Sign in
                </Button>
              </Link>
            </div>
          )}

          {user && (
            <div className="pt-2 border-t border-border mt-2">
              <div className="flex items-center gap-2 px-3 py-2 mb-1" data-testid="mobile-user-info">
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded capitalize ${roleBadgeClass}`}
                  data-testid="mobile-badge-role"
                >
                  {role}
                </span>
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  <span data-testid="mobile-text-username">{user.displayName || user.username}</span>
                </span>
              </div>
              <Link href={`/profile/${user.username}`} onClick={() => setMobileOpen(false)}>
                <div className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg hover:bg-[hsl(var(--nav-sub-accent))] hover:text-[hsl(var(--nav-sub-accent-foreground))] transition-colors cursor-pointer" data-testid="mobile-link-my-profile">
                  <User className="h-4 w-4" />
                  My Profile
                </div>
              </Link>
              <Link href="/account" onClick={() => setMobileOpen(false)}>
                <div className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg hover:bg-[hsl(var(--nav-sub-accent))] hover:text-[hsl(var(--nav-sub-accent-foreground))] transition-colors cursor-pointer" data-testid="mobile-link-account">
                  <Settings2 className="h-4 w-4" />
                  Account
                </div>
              </Link>
              <Link href="/notes" onClick={() => setMobileOpen(false)}>
                <div className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg hover:bg-[hsl(var(--nav-sub-accent))] hover:text-[hsl(var(--nav-sub-accent-foreground))] transition-colors cursor-pointer" data-testid="mobile-link-notes">
                  <StickyNote className="h-4 w-4" />
                  Notes
                </div>
              </Link>
              <button
                onClick={() => { setMobileOpen(false); logout(); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                data-testid="mobile-button-logout"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          )}
          </nav>
        </SheetContent>
      </Sheet>
    </header>

    <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    <ChatSheet open={chatOpen} onClose={() => setChatOpen(false)} />
    </>
  );
}
