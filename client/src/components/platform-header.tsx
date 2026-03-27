import { Link, useLocation } from "wouter";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { usePermission } from "@/hooks/use-permission";
import { useCart } from "@/hooks/use-cart";
import { useQuery } from "@tanstack/react-query";
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
} from "lucide-react";
import wordmarkBlack from "@assets/SEVCO_Logo_Black_1774331197327.png";
import { ChatSheet } from "@/components/chat-sheet";
import type { Project, Service } from "@shared/schema";

function resolveLucideIcon(name: string | null | undefined): React.ElementType | null {
  if (!name) return null;
  const icons = LucideIcons as unknown as Record<string, React.ElementType>;
  return icons[name] ?? null;
}

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

const WIKI_PREFIXES = ["/wiki", "/edit/", "/new", "/search", "/review", "/category/"];

function getActiveApp(location: string): string {
  if (location === "/") return "/";
  for (const prefix of WIKI_PREFIXES) {
    if (location === prefix || location.startsWith(prefix)) return "/wiki";
  }
  if (location.startsWith("/projects")) return "/projects";
  if (location.startsWith("/services")) return "/services";
  if (location.startsWith("/domains")) return "/services";
  if (location.startsWith("/store")) return "/store";
  if (location.startsWith("/music")) return "/music";
  if (location.startsWith("/command")) return "/command";
  if (location.startsWith("/notes")) return "/notes";
  if (location.startsWith("/gallery")) return "/gallery";
  if (location.startsWith("/news")) return "/news";
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

  return { open, setOpen, ref };
}

function NavButton({
  label,
  isActive,
  onClick,
  open,
  "data-testid": testId,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
  open: boolean;
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
      {label}
      <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
    </Button>
  );
}

function DropdownPanel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`absolute top-full left-0 mt-1.5 rounded-xl border bg-popover shadow-xl z-50 overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

function HomeDropdown({ isActive }: { isActive: boolean }) {
  const { open, setOpen, ref } = useDropdown();
  const { user } = useAuth();

  const items = [
    { label: "Home",       href: "/",        icon: Home,        desc: "Go to landing page",             authRequired: false },
    { label: "About",      href: "/about",   icon: BookOpen,    desc: "Learn about SEVCO",              authRequired: false },
    { label: "Wiki",       href: "/wiki",    icon: BookOpen,    desc: "Internal knowledge base",        authRequired: false },
    { label: "News",       href: "/news",    icon: Rss,         desc: "Curated headlines from the web", authRequired: false },
    ...(user ? [
      { label: "Feed",     href: "/feed",    icon: Rss,         desc: "Posts from people you follow",   authRequired: true },
    ] : []),
    { label: "Contact",    href: "/contact", icon: Mail,        desc: "Get in touch",                   authRequired: false },
    { label: "Jobs",       href: "/jobs",    icon: Users,       desc: "Open positions",                 authRequired: false },
    { label: "Account",    href: "/account", icon: User,        desc: "Manage your profile",            authRequired: false },
  ];

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
                  <item.icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">{item.label}</p>
                    <p className="text-[11px] text-muted-foreground">{item.desc}</p>
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
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[hsl(var(--nav-sub-accent))] hover:text-[hsl(var(--nav-sub-accent-foreground))] transition-colors cursor-pointer"
                data-testid="dropdown-store-all"
              >
                <ShoppingBag className="h-4 w-4 text-muted-foreground shrink-0" />
                <p className="text-xs font-semibold text-foreground">All Products</p>
              </div>
            </Link>
            <div className="border-t border-border/60 mt-1 pt-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-1.5">
                Collections
              </p>
              {categories.map((cat) => (
                <Link key={cat.value} href={`/store?category=${cat.value}`} onClick={() => setOpen(false)}>
                  <div
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[hsl(var(--nav-sub-accent))] hover:text-[hsl(var(--nav-sub-accent-foreground))] transition-colors cursor-pointer"
                    data-testid={`dropdown-store-${cat.label.toLowerCase()}`}
                  >
                    <Tag className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <p className="text-xs text-foreground">{cat.label}</p>
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
                <HardDrive className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground leading-none">Hosting</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">Websites, game servers, VPS & more</p>
                </div>
              </div>
            </Link>
            <Link href="/domains" onClick={() => setOpen(false)}>
              <div className="flex items-start gap-2.5 rounded-lg px-2 py-2 hover:bg-[hsl(var(--nav-sub-accent))] hover:text-[hsl(var(--nav-sub-accent-foreground))] transition-colors cursor-pointer group" data-testid="dropdown-services-domains">
                <Globe className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground leading-none">Domains</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">Search & register domain names</p>
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
                                <IconComp className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-foreground leading-none">{service.name}</p>
                                  {service.tagline && (
                                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{service.tagline}</p>
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
                  className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-[hsl(var(--nav-sub-accent))] hover:text-[hsl(var(--nav-sub-accent-foreground))] transition-colors cursor-pointer"
                  data-testid={`dropdown-music-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <item.icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">{item.label}</p>
                    <p className="text-[11px] text-muted-foreground">{item.desc}</p>
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
                            <MenuIconComp className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-foreground leading-none">{project.name}</p>
                              {project.description && (
                                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{project.description}</p>
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
                            <MenuIconComp className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-xs font-semibold text-foreground leading-none">{project.name}</p>
                                <span className="text-[10px] text-blue-500 font-medium">Soon</span>
                              </div>
                              {project.description && (
                                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{project.description}</p>
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

  const items = [
    ...(user ? [
      { label: "Notes",   href: "/notes",   icon: StickyNote, desc: "Personal & shared notes" },
      { label: "Gallery", href: "/gallery", icon: Images,     desc: "Quick-copy images for your profile" },
    ] : []),
  ];

  return (
    <div className="relative" ref={ref}>
      <NavButton
        label="Tools"
        isActive={isActive}
        onClick={() => setOpen((o) => !o)}
        open={open}
        data-testid="nav-tools"
      />
      {open && (
        <DropdownPanel className="w-64">
          <div className="p-2">
            {items.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>
                <div
                  className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-[hsl(var(--nav-sub-accent))] hover:text-[hsl(var(--nav-sub-accent-foreground))] transition-colors cursor-pointer"
                  data-testid={`dropdown-tools-${item.label.toLowerCase()}`}
                >
                  <item.icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">{item.label}</p>
                    <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              </Link>
            ))}
            <div className="mt-1 pt-1.5 border-t border-border/60 px-3 pb-1">
              <p className="text-[10px] text-muted-foreground/60 italic">More tools coming soon</p>
            </div>
          </div>
        </DropdownPanel>
      )}
    </div>
  );
}

export function PlatformHeader() {
  const { user, logout } = useAuth();
  const { role } = usePermission();
  const { openCart, itemCount } = useCart();
  const [location] = useLocation();
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
    { label: "Artists",       href: "/music/artists" },
    { label: "Playlists",     href: "/music/playlists" },
    { label: "Submit",        href: "/music/submit" },
  ];
  const homeItems = [
    { label: "Home",      href: "/" },
    { label: "About",     href: "/about" },
    { label: "Wiki",      href: "/wiki" },
    { label: "News",      href: "/news" },
    ...(user ? [{ label: "Feed", href: "/feed" }, { label: "Notes", href: "/notes" }] : []),
    { label: "Contact",   href: "/contact" },
    { label: "Jobs",      href: "/jobs" },
    { label: "Account",   href: "/account" },
  ];

  return (
    <>
    <header
      className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur-sm"
      data-testid="platform-header"
    >
      <div className="flex h-12 items-center gap-2 px-3">
        <Link href="/" className="shrink-0">
          <div className="flex items-center gap-2 cursor-pointer" data-testid="link-platform-home">
            <img
              src={platformLogoUrl || wordmarkBlack}
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

        <div className="w-px h-5 bg-border mx-1 hidden md:block" />

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-0.5 flex-1" data-testid="nav-app-switcher">
          <HomeDropdown isActive={activeApp === "/"} />
          <StoreDropdown isActive={activeApp === "/store"} />
          <ServicesDropdown isActive={activeApp === "/services"} platformSettings={platformSettings} />
          <MusicDropdown isActive={activeApp === "/music"} />
          <ProjectsDropdown isActive={activeApp === "/projects"} />
          <ToolsDropdown isActive={activeApp === "/notes" || activeApp === "/gallery"} />

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

        <div className="md:hidden flex-1" />

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
                  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center" data-testid="cart-badge">
                    {itemCount > 9 ? "9+" : itemCount}
                  </span>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Cart{itemCount > 0 ? ` (${itemCount})` : ""}</TooltipContent>
          </Tooltip>
          </TooltipProvider>

          {/* Mobile hamburger */}
          <div className="md:hidden">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => { setMobileOpen((o) => !o); setMobileSection(null); }}
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
                  <DropdownMenuItem asChild>
                    <Link href="/notes" data-testid="link-notes">
                      <StickyNote className="h-3.5 w-3.5 mr-2" />
                      Notes
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} data-testid="button-logout" className="text-destructive focus:text-destructive">
                    <LogOut className="h-3.5 w-3.5 mr-2" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <ThemeToggle />
            </>
          ) : (
            <>
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

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t bg-popover px-3 py-2 space-y-0.5" data-testid="mobile-nav-drawer">
          {/* Home section */}
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

          {/* Store section */}
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

          {/* Services */}
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
                <Link href="/domains" onClick={() => setMobileOpen(false)}>
                  <div className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-colors cursor-pointer" data-testid="mobile-nav-services-domains">Domains</div>
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

          {/* Music section */}
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

          {/* Projects */}
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
                {user && (
                  <>
                    <Link href="/notes" onClick={() => setMobileOpen(false)}>
                      <div className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-colors cursor-pointer" data-testid="mobile-nav-tools-notes">
                        Notes
                      </div>
                    </Link>
                    <Link href="/gallery" onClick={() => setMobileOpen(false)}>
                      <div className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-colors cursor-pointer" data-testid="mobile-nav-tools-gallery">
                        Gallery
                      </div>
                    </Link>
                  </>
                )}
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
        </div>
      )}
    </header>

    <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    <ChatSheet open={chatOpen} onClose={() => setChatOpen(false)} />
    </>
  );
}
