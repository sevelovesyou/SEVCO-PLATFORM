import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { CommandSidebar } from "@/components/command-sidebar";
import { SocialSidebar } from "@/components/social-sidebar";
import { PlatformHeader } from "@/components/platform-header";
import { PlatformFooter } from "@/components/platform-footer";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/components/protected-route";
import { CartProvider } from "@/hooks/use-cart";
import { SpotifyPlayerProvider, useSpotifyPlayer } from "@/hooks/use-spotify-player";
import { SpotifyPlayerBar } from "@/components/spotify-player-bar";
import { CartDrawer } from "@/components/cart-drawer";
import { useEffect, useRef } from "react";
import { hexToHsl } from "@/lib/colorUtils";
import { derivedDarkSurfacesAsCssVars, derivedLightSurfacesAsCssVars, DEFAULT_DARK_VALUES, DEFAULT_LIGHT_VALUES } from "@/lib/derive-dark-surfaces";
import { isClientPlus } from "@/lib/permissions";
import { useToast } from "@/hooks/use-toast";
import { ErrorBoundary } from "@/components/error-boundary";
import { AnimatedPage } from "@/components/animated-page";
import { useAnalyticsTracker } from "@/lib/analytics-tracker";

import Landing from "@/pages/landing";
import Home from "@/pages/home";
import ArticleView from "@/pages/article-view";
import ArticleEditor from "@/pages/article-editor";
import SearchPage from "@/pages/search";
import ReviewQueue from "@/pages/review-queue";
import CategoryView, { type CategoryWithArticles } from "@/pages/category-view";
import type { Category } from "@shared/schema";
import AuthPage from "@/pages/auth-page";
import VerifyEmailPage from "@/pages/verify-email-page";
import AccountPage from "@/pages/account-page";
import MusicPage from "@/pages/music-page";
import MusicArtistsPage from "@/pages/music-artists-page";
import MusicArtistDetail from "@/pages/music-artist-detail";
import MusicAlbumDetail from "@/pages/music-album-detail";
import MusicArtistForm from "@/pages/music-artist-form";
import MusicAlbumForm from "@/pages/music-album-form";
import StorePage from "@/pages/store-page";
import StoreProductDetail from "@/pages/store-product-detail";
import StoreProductForm from "@/pages/store-product-form";
import StoreSuccessPage from "@/pages/store-success-page";
import StoreCancelPage from "@/pages/store-cancel-page";
import ProjectsPage from "@/pages/projects-page";
import ProjectDetail from "@/pages/project-detail";
import { ProjectCreatePage, ProjectEditPage } from "@/pages/project-form";
import ContactPage from "@/pages/contact-page";
import ProfilePage from "@/pages/profile-page";
import JobsPage from "@/pages/jobs-page";
import JobsDetailPage from "@/pages/jobs-detail-page";
import MusicSubmitPage from "@/pages/music-submit-page";
import MusicListenPage from "@/pages/music-listen-page";
import MusicPlaylistsPage from "@/pages/music-playlists-page";
import MusicBeatsPage from "@/pages/music-beats-page";
import NotFound from "@/pages/not-found";
import FeedPage from "@/pages/feed-page";
import DiscoverPage from "@/pages/discover-page";
import PricingPage from "@/pages/pricing-page";
import SparksSuccessPage from "@/pages/sparks-success-page";
import SparksPage from "@/pages/sparks-page";
import SparksLeaderboard from "@/pages/sparks-leaderboard";

import { CommandPageLayout } from "@/pages/command-page";
import CommandOverview from "@/pages/command-overview";
import CommandUsers from "@/pages/command-users";
import CommandChangelog from "@/pages/command-changelog";
import CommandStore from "@/pages/command-store";
import CommandShaderStudio from "@/pages/command-shader-studio";
import CommandServices from "@/pages/command-services";
import CommandJobs from "@/pages/command-jobs";
import CommandMusic from "@/pages/command-music";
import CommandPlaylists from "@/pages/command-playlists";
import CommandSocialLinks from "@/pages/command-social-links";
import CommandResources from "@/pages/command-resources";
import CommandHosting from "@/pages/command-hosting";
import CommandDisplay from "@/pages/command-display";
import CommandSettings from "@/pages/command-settings";
import DomainsPage from "@/pages/domains-page";
import NotesPage from "@/pages/notes-page";
import TasksPage from "@/pages/tasks-page";
import ServiceDetailPage from "@/pages/service-detail-page";
import ServicesListingPage from "@/pages/services-listing";
import ServiceCategoryPage from "@/pages/service-category-page";
import WikiArchivePage from "@/pages/wiki-archive-page";
import AboutPage from "@/pages/about-page";
import BrandPage from "@/pages/brand-page";
import LegalPage from "@/pages/legal-page";
import HostingPage from "@/pages/hosting-page";
import SecurityPage from "@/pages/security-page";
import MinecraftPage from "@/pages/minecraft-page";
import GalleryPage from "@/pages/gallery-page";
import CommandGallery from "@/pages/command-gallery";
import CommandMedia from "@/pages/command-media";
import CommandSupport from "@/pages/command-support";
import CommandStaff from "@/pages/command-staff";
import CommandChatLog from "@/pages/command-chat-log";
import CommandFinance from "@/pages/command-finance";
import CommandMinecraft from "@/pages/command-minecraft";
import CommandAiAgents from "@/pages/command-ai-agents";
import CommandTraffic from "@/pages/command-traffic";
import CommandNews from "@/pages/command-news";
import CommandProjects from "@/pages/command-projects";
import CommandDomains from "@/pages/command-domains";
import CommandSparksPage from "@/pages/command-sparks";
import CommandWiki from "@/pages/command-wiki";
import NewsPage from "@/pages/news-page";
import WikifyToolPage from "@/pages/wikify-tool-page";
import ToolsPage from "@/pages/tools-page";
import FreeballPage from "@/pages/freeball";
import FreeBallLandingPage from "@/pages/freeball-landing";
import FreeBallHelpPage from "@/pages/freeball-help";
import SitesPage from "@/pages/sites-page";
import SitesBuilderPage from "@/pages/sites-builder";
import CanvasPage from "@/pages/canvas-page";
import PlatformPage from "@/pages/platform-page";
import MessagesPage from "@/pages/messages-page";
import FullscreenChatPage from "@/pages/fullscreen-chat-page";
import { FloatingChatProvider } from "@/contexts/floating-chat-context";
import { FloatingChatWindows } from "@/components/floating-chat-window";
import { LensProvider } from "@/contexts/lens-context";
import { FloatingBrowser } from "@/components/floating-browser";
import { MusicPlayerProvider } from "@/contexts/music-player-context";
import { FloatingMusicPlayer } from "@/components/floating-music-player";
import { VoiceProvider } from "@/contexts/voice-context";
import { VoiceFloatingIndicator } from "@/components/voice-floating-indicator";
import { AnnouncementBanner } from "@/components/announcement-banner";

function WikiSlugView({ params }: { params?: { slug?: string } }) {
  const slug = params?.slug;
  const [, navigate] = useLocation();

  const { data: category, isLoading, isError } = useQuery<CategoryWithArticles | null>({
    queryKey: ["/api/categories", slug],
    enabled: !!slug,
    retry: false,
  });

  const allCatsQuery = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    enabled: !!category?.parentId,
  });

  useEffect(() => {
    if (category?.parentId && allCatsQuery.data) {
      const parent = allCatsQuery.data.find((c) => c.id === category.parentId);
      if (parent) {
        navigate(`/wiki/${parent.slug}/${category.slug}`, { replace: true });
      }
    }
  }, [category, allCatsQuery.data]);

  if (isLoading) return null;
  if (!isError && category && !category.parentId) return <CategoryView />;
  if (!isError && category?.parentId) {
    if (allCatsQuery.isError || (allCatsQuery.data && !allCatsQuery.data.find((c) => c.id === category.parentId))) {
      return <CategoryView />;
    }
    return null;
  }
  return <ArticleView />;
}

function WikiDoubleSlugView({ params }: { params?: { categorySlug?: string; articleSlug?: string } }) {
  const parentSlug = params?.categorySlug;
  const childSlug = params?.articleSlug;

  const { data: subcatData, isLoading } = useQuery<CategoryWithArticles | null>({
    queryKey: ["/api/categories", parentSlug, childSlug],
    queryFn: () =>
      fetch(`/api/categories/${parentSlug}/${childSlug}`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    enabled: !!parentSlug && !!childSlug,
    retry: false,
    staleTime: 60_000,
  });

  if (isLoading) return null;
  if (subcatData) return <CategoryView overrideData={subcatData} />;
  return <ArticleView />;
}

const WIKI_PREFIXES = ["/wiki", "/edit/", "/search", "/wikify"];
const COMMAND_PREFIXES = ["/command"];
const SOCIAL_PREFIXES = ["/feed", "/account", "/profile", "/discover"];

function isWikiRoute(location: string): boolean {
  return WIKI_PREFIXES.some(
    (prefix) => location === prefix || location.startsWith(prefix)
  );
}

function isCommandRoute(location: string): boolean {
  return COMMAND_PREFIXES.some(
    (prefix) => location === prefix || location.startsWith(prefix + "/")
  );
}

function isSocialRoute(location: string): boolean {
  return SOCIAL_PREFIXES.some(
    (prefix) => location === prefix || location.startsWith(prefix + "/") || location.startsWith(prefix + "?")
  );
}

function ClientPlusRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoading && user && !isClientPlus(user.role)) {
      toast({ title: "Access denied", description: "Email is available for Client and above.", variant: "destructive" });
      setLocation("/");
    } else if (!isLoading && !user) {
      setLocation("/auth");
    }
  }, [isLoading, user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px]">
        <div className="motion-safe:animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user || !isClientPlus(user.role)) return null;

  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/verify-email" component={VerifyEmailPage} />

      {/* Public routes — no ProtectedRoute */}
      <Route path="/" component={Landing} />
      <Route path="/wiki" component={Home} />
      <Route path="/wiki/archive" component={() => <ProtectedRoute><WikiArchivePage /></ProtectedRoute>} />
      <Route path="/wiki/new" component={() => <ProtectedRoute><ArticleEditor /></ProtectedRoute>} />
      <Route path="/wiki/review" component={() => <ProtectedRoute><ReviewQueue /></ProtectedRoute>} />
      <Route path="/wiki/engineering/platform" component={() => <Redirect to="/wiki/engineering/sevco-platform" />} />
      <Route path="/category/:slug">
        {(params: { slug: string }) => <Redirect to={`/wiki/${params.slug}`} />}
      </Route>
      <Route path="/wiki/:categorySlug/:articleSlug" component={WikiDoubleSlugView} />
      <Route path="/wiki/:slug" component={WikiSlugView} />
      <Route path="/search" component={SearchPage} />
      <Route path="/music" component={MusicPage} />
      <Route path="/music/submit" component={MusicSubmitPage} />
      <Route path="/music/playlists" component={MusicPlaylistsPage} />
      <Route path="/listen" component={MusicListenPage} />
      <Route path="/music/listen" component={MusicListenPage} />
      <Route path="/music/beats" component={MusicBeatsPage} />
      <Route path="/music/artists" component={MusicArtistsPage} />
      <Route path="/music/artists/new" component={() => <ProtectedRoute><MusicArtistForm /></ProtectedRoute>} />
      <Route path="/music/artists/:slug" component={MusicArtistDetail} />
      <Route path="/music/albums/new" component={() => <ProtectedRoute><MusicAlbumForm /></ProtectedRoute>} />
      <Route path="/music/albums/:slug" component={MusicAlbumDetail} />
      <Route path="/sites" component={() => <ProtectedRoute><SitesPage /></ProtectedRoute>} />
      <Route path="/sites/:slug/edit" component={() => <ProtectedRoute><SitesBuilderPage /></ProtectedRoute>} />
      <Route path="/canvas" component={() => <ProtectedRoute><CanvasPage /></ProtectedRoute>} />
      <Route path="/store" component={StorePage} />
      <Route path="/store/products/:slug" component={StoreProductDetail} />
      <Route path="/services" component={ServicesListingPage} />
      <Route path="/services/creative" component={ServiceCategoryPage} />
      <Route path="/services/technology" component={ServiceCategoryPage} />
      <Route path="/services/marketing" component={ServiceCategoryPage} />
      <Route path="/services/teams" component={ServiceCategoryPage} />
      <Route path="/services/infrastructure" component={ServiceCategoryPage} />
      <Route path="/services/security" component={ServiceCategoryPage} />
      <Route path="/services/:slug" component={ServiceDetailPage} />
      <Route path="/projects" component={ProjectsPage} />
      <Route path="/projects/new" component={() => <ProtectedRoute><ProjectCreatePage /></ProtectedRoute>} />
      <Route path="/projects/:slug" component={ProjectDetail} />
      <Route path="/about" component={AboutPage} />
      <Route path="/brand" component={BrandPage} />
      <Route path="/legal" component={LegalPage} />
      <Route path="/hosting" component={HostingPage} />
      <Route path="/security" component={SecurityPage} />
      <Route path="/minecraft" component={MinecraftPage} />
      <Route path="/contact" component={ContactPage} />
      <Route path="/feed" component={FeedPage} />
      <Route path="/discover" component={DiscoverPage} />
      <Route path="/pricing" component={PricingPage} />
      <Route path="/sparks/success" component={SparksSuccessPage} />
      <Route path="/sparks/leaderboard" component={SparksLeaderboard} />
      <Route path="/sparks" component={SparksPage} />
      <Route path="/changelog" component={() => <Redirect to="/platform" />} />
      <Route path="/platform" component={PlatformPage} />
      <Route path="/jobs" component={JobsPage} />
      <Route path="/jobs/:slug" component={JobsDetailPage} />
      <Route path="/news" component={NewsPage} />
      <Route path="/profile/:username" component={ProfilePage} />
      <Route path="/messages" component={() => <ClientPlusRoute><MessagesPage /></ClientPlusRoute>} />
      <Route path="/chat" component={() => <ProtectedRoute><FullscreenChatPage /></ProtectedRoute>} />

      {/* Protected write/manage routes */}
      <Route path="/profile" component={ProfilePage} />
      <Route path="/edit/:slug" component={() => <ProtectedRoute><ArticleEditor /></ProtectedRoute>} />
      <Route path="/account" component={() => <ProtectedRoute><AccountPage /></ProtectedRoute>} />
      <Route path="/store/success" component={() => <ProtectedRoute><StoreSuccessPage /></ProtectedRoute>} />
      <Route path="/store/cancel" component={() => <ProtectedRoute><StoreCancelPage /></ProtectedRoute>} />
      <Route path="/store/products/new" component={() => <ProtectedRoute><StoreProductForm /></ProtectedRoute>} />
      <Route path="/store/products/:slug/edit" component={() => <ProtectedRoute><StoreProductForm /></ProtectedRoute>} />
      <Route path="/projects/:slug/edit" component={() => <ProtectedRoute><ProjectEditPage /></ProtectedRoute>} />

      <Route path="/dashboard" component={() => <Redirect to="/command" />} />
      <Route path="/command" component={() => (
        <ProtectedRoute>
          <CommandPageLayout>
            <CommandOverview />
          </CommandPageLayout>
        </ProtectedRoute>
      )} />
      <Route path="/command/store" component={() => (
        <ProtectedRoute>
          <CommandPageLayout title="Store Management" subtitle="Manage your product catalog">
            <CommandStore />
          </CommandPageLayout>
        </ProtectedRoute>
      )} />
      <Route path="/command/users" component={() => (
        <ProtectedRoute>
          <CommandPageLayout title="User Management" subtitle="Manage user roles and access">
            <CommandUsers />
          </CommandPageLayout>
        </ProtectedRoute>
      )} />
      <Route path="/command/changelog" component={() => (
        <ProtectedRoute>
          <CommandPageLayout title="Changelog" subtitle="Platform update history">
            <CommandChangelog />
          </CommandPageLayout>
        </ProtectedRoute>
      )} />
      <Route path="/command/services" component={() => (
        <ProtectedRoute>
          <CommandPageLayout title="Services" subtitle="Manage SEVCO service offerings">
            <CommandServices />
          </CommandPageLayout>
        </ProtectedRoute>
      )} />
      <Route path="/command/jobs" component={() => (
        <ProtectedRoute>
          <CommandPageLayout title="Jobs" subtitle="Manage job postings and applications">
            <CommandJobs />
          </CommandPageLayout>
        </ProtectedRoute>
      )} />
      <Route path="/command/music" component={() => (
        <ProtectedRoute>
          <CommandPageLayout title="Music" subtitle="Manage submissions, A&R demos, and playlists">
            <CommandMusic />
          </CommandPageLayout>
        </ProtectedRoute>
      )} />
      <Route path="/command/playlists" component={() => <Redirect to="/command/music" />} />
      <Route path="/command/social-links" component={() => <Redirect to="/command/settings" />} />
      <Route path="/command/hosting" component={() => <Redirect to="/command/settings" />} />
      <Route path="/command/display" component={() => <Redirect to="/command/settings" />} />
      <Route path="/command/resources" component={() => (
        <ProtectedRoute requiredRole="admin">
          <CommandPageLayout title="Resources" subtitle="Manage quick links and platform resources">
            <CommandResources />
          </CommandPageLayout>
        </ProtectedRoute>
      )} />
      <Route path="/command/settings" component={() => (
        <ProtectedRoute requiredRole="admin">
          <CommandPageLayout title="Settings" subtitle="Platform configuration — display, colors, social links, hosting, icons, and footer">
            <CommandSettings />
          </CommandPageLayout>
        </ProtectedRoute>
      )} />
      <Route path="/command/shaders" component={() => (
        <ProtectedRoute requiredRole="admin">
          <CommandPageLayout title="Shader Studio" subtitle="Author and assign animated background shaders to platform pages">
            <CommandShaderStudio />
          </CommandPageLayout>
        </ProtectedRoute>
      )} />
      <Route path="/tools/domains" component={DomainsPage} />
      <Route path="/domains" component={() => <Redirect to="/tools/domains" />} />
      <Route path="/notes" component={NotesPage} />
      <Route path="/tools/tasks" component={() => <ProtectedRoute><TasksPage /></ProtectedRoute>} />
      <Route path="/wikify" component={() => <ProtectedRoute requiredRole={["partner", "staff", "executive", "admin"]}><WikifyToolPage /></ProtectedRoute>} />
      <Route path="/tools" component={ToolsPage} />
      <Route path="/freeball" component={FreeBallLandingPage} />
      <Route path="/freeball/help" component={FreeBallHelpPage} />
      <Route path="/freeball/play" component={() => <ProtectedRoute><FreeballPage /></ProtectedRoute>} />
      <Route path="/gallery" component={GalleryPage} />
      <Route path="/command/gallery" component={() => (
        <ProtectedRoute requiredRole="admin">
          <CommandPageLayout title="Gallery" subtitle="Manage gallery images for the platform">
            <CommandGallery />
          </CommandPageLayout>
        </ProtectedRoute>
      )} />
      <Route path="/command/media" component={() => (
        <ProtectedRoute requiredRole="admin">
          <CommandPageLayout title="Media Library" subtitle="Browse and manage files across Supabase storage buckets">
            <CommandMedia />
          </CommandPageLayout>
        </ProtectedRoute>
      )} />
      <Route path="/command/support" component={() => (
        <ProtectedRoute>
          <CommandPageLayout title="Support" subtitle="Manage contact form submissions">
            <CommandSupport />
          </CommandPageLayout>
        </ProtectedRoute>
      )} />
      <Route path="/command/staff" component={() => (
        <ProtectedRoute requiredRole="admin">
          <CommandPageLayout title="Staff" subtitle="Staff directory and org chart">
            <CommandStaff />
          </CommandPageLayout>
        </ProtectedRoute>
      )} />
      <Route path="/command/chat-log" component={() => (
        <ProtectedRoute requiredRole="admin">
          <CommandPageLayout title="Chat Log" subtitle="Full moderation log of all messages across channels and DMs">
            <CommandChatLog />
          </CommandPageLayout>
        </ProtectedRoute>
      )} />
      <Route path="/command/minecraft" component={() => (
        <ProtectedRoute requiredRole="admin">
          <CommandMinecraft />
        </ProtectedRoute>
      )} />
      <Route path="/command/ai-agents" component={() => (
        <ProtectedRoute requiredRole="admin">
          <CommandAiAgents />
        </ProtectedRoute>
      )} />
      <Route path="/command/finance" component={() => (
        <ProtectedRoute>
          <CommandPageLayout title="Finance" subtitle="Accounting, invoices, budgets, and calculator">
            <CommandFinance />
          </CommandPageLayout>
        </ProtectedRoute>
      )} />
      <Route path="/command/traffic" component={() => (
        <ProtectedRoute requiredRole="admin">
          <CommandPageLayout title="Traffic" subtitle="Monitor platform and website analytics">
            <CommandTraffic />
          </CommandPageLayout>
        </ProtectedRoute>
      )} />
      <Route path="/command/news" component={() => (
        <ProtectedRoute requiredRole="admin">
          <CommandPageLayout title="News" subtitle="Manage news feed categories and RSS queries">
            <CommandNews />
          </CommandPageLayout>
        </ProtectedRoute>
      )} />
      <Route path="/command/projects" component={() => (
        <ProtectedRoute>
          <CommandPageLayout title="Projects" subtitle="Manage SEVCO projects and ventures">
            <CommandProjects />
          </CommandPageLayout>
        </ProtectedRoute>
      )} />
      <Route path="/command/domains" component={() => (
        <ProtectedRoute requiredRole={["admin", "executive"]}>
          <CommandPageLayout title="Domains" subtitle="All SEVCO domains and their status">
            <CommandDomains />
          </CommandPageLayout>
        </ProtectedRoute>
      )} />
      <Route path="/command/sparks" component={() => (
        <ProtectedRoute requiredRole="admin">
          <CommandSparksPage />
        </ProtectedRoute>
      )} />
      <Route path="/command/wiki" component={() => (
        <ProtectedRoute>
          <CommandPageLayout title="Wiki" subtitle="Manage wiki subcategories">
            <CommandWiki />
          </CommandPageLayout>
        </ProtectedRoute>
      )} />
      <Route component={NotFound} />
    </Switch>
  );
}

function DynamicHead() {
  const { data: meta } = useQuery<{ faviconUrl: string | null; ogImageUrl: string | null }>({
    queryKey: ["/api/meta"],
  });

  useEffect(() => {
    if (!meta) return;
    const el = document.getElementById("dynamic-favicon") as HTMLLinkElement | null;
    if (el) {
      el.href = meta.faviconUrl || "/favicon.jpg";
    }
    const ogMeta = document.getElementById("og-image") as HTMLMetaElement | null;
    if (ogMeta) {
      ogMeta.content = meta.ogImageUrl || "";
    }
  }, [meta]);

  return null;
}

const COLOR_KEYS_LIGHT = [
  "color.light.primary", "color.light.background", "color.light.foreground", "color.light.accent",
  "color.light.primaryFg", "color.light.accentFg", "color.light.secondary", "color.light.secondaryFg",
  "color.light.card", "color.light.cardFg", "color.light.muted", "color.light.mutedFg",
  "color.light.border", "color.light.destructive",
];
const COLOR_KEYS_DARK = [
  "color.dark.primary", "color.dark.background", "color.dark.foreground", "color.dark.accent",
];
const CSS_VAR_MAP_LIGHT: Record<string, string> = {
  "color.light.primary": "--primary",
  "color.light.background": "--background",
  "color.light.foreground": "--foreground",
  "color.light.accent": "--accent",
  "color.light.primaryFg": "--primary-foreground",
  "color.light.accentFg": "--accent-foreground",
  "color.light.secondary": "--secondary",
  "color.light.secondaryFg": "--secondary-foreground",
  "color.light.card": "--card",
  "color.light.cardFg": "--card-foreground",
  "color.light.muted": "--muted",
  "color.light.mutedFg": "--muted-foreground",
  "color.light.border": "--border",
  "color.light.destructive": "--destructive",
};
const CSS_VAR_MAP_DARK: Record<string, string> = {
  "color.dark.primary": "--primary",
  "color.dark.background": "--background",
  "color.dark.foreground": "--foreground",
  "color.dark.accent": "--accent",
};


function toHsl(val: string): string | null {
  if (!val) return null;
  if (/^#[0-9a-fA-F]{6}$/.test(val)) {
    return hexToHsl(val);
  }
  const parts = val.trim().split(/\s+/);
  if (parts.length === 3) return val;
  return null;
}

function PlatformColorInjector() {
  const { data: settings } = useQuery<Record<string, string>>({
    queryKey: ["/api/platform-settings"],
  });
  const styleRef = useRef<HTMLStyleElement | null>(null);

  useEffect(() => {
    if (!settings) return;

    const brandMain = toHsl(settings["color.brand.main"] ?? "");
    const brandSecondary = toHsl(settings["color.brand.secondary"] ?? "");
    const brandAccent = toHsl(settings["color.brand.accent"] ?? "");
    const brandHighlight = toHsl(settings["color.brand.highlight"] ?? "");

    const navMainBg = toHsl(settings["color.nav.main.bg"] ?? "");
    const navMainText = toHsl(settings["color.nav.main.text"] ?? "");
    const navSubBg = toHsl(settings["color.nav.sub.bg"] ?? "");
    const navSubText = toHsl(settings["color.nav.sub.text"] ?? "");

    const lightRules: string[] = [];

    if (navMainBg) {
      lightRules.push(`  --sidebar-primary: ${navMainBg};`);
      lightRules.push(`  --sidebar-accent: ${navMainBg};`);
      lightRules.push(`  --sidebar-ring: ${navMainBg};`);
      const parts = navMainBg.trim().split(/\s+/);
      const l = parts.length === 3 ? parseFloat(parts[2]) : 50;
      const fg = navMainText ?? (l < 50 ? "0 0% 100%" : "224 71% 4%");
      lightRules.push(`  --sidebar-accent-foreground: ${fg};`);
    } else if (navMainText) {
      lightRules.push(`  --sidebar-accent-foreground: ${navMainText};`);
    }
    if (navSubBg) {
      lightRules.push(`  --nav-sub-accent: ${navSubBg};`);
    }
    if (navSubText) {
      lightRules.push(`  --nav-sub-accent-foreground: ${navSubText};`);
    }
    if (brandMain) lightRules.push(`  --brand-main: ${brandMain};`);
    if (brandSecondary) lightRules.push(`  --brand-secondary: ${brandSecondary};`);
    if (brandAccent) lightRules.push(`  --brand-accent: ${brandAccent};`);
    if (brandHighlight) lightRules.push(`  --brand-highlight: ${brandHighlight};`);

    const lightBgHsl = toHsl(settings["color.light.background"] ?? "");
    const lightBgIsCustom = !!lightBgHsl && lightBgHsl.trim() !== DEFAULT_LIGHT_VALUES["color.light.background"];
    if (lightBgIsCustom && lightBgHsl) {
      const derived = derivedLightSurfacesAsCssVars(lightBgHsl);
      for (const [k, v] of Object.entries(derived)) {
        lightRules.push(`  ${k}: ${v};`);
      }
    }

    for (const key of COLOR_KEYS_LIGHT) {
      const val = settings[key];
      if (!val) continue;
      // When a custom light background is in use, skip explicit overrides that
      // still match the built-in defaults so the derived surface values can
      // take effect (handles legacy data saved before isolated-edit save).
      if (lightBgIsCustom && key !== "color.light.background" && val.trim() === DEFAULT_LIGHT_VALUES[key]) {
        continue;
      }
      const cssVar = CSS_VAR_MAP_LIGHT[key];
      lightRules.push(`  ${cssVar}: ${val};`);
    }

    const homeCardAccent = toHsl(settings["home.cardAccentColor"] ?? "");
    const storeAccent = toHsl(settings["store.accentColor"] ?? "");
    const servicesAccent = toHsl(settings["services.accentColor"] ?? "");
    const musicAccent = toHsl(settings["music.accentColor"] ?? "");
    const wikiTagColor = toHsl(settings["wiki.tagColor"] ?? "");

    if (homeCardAccent) lightRules.push(`  --home-card-accent: ${homeCardAccent};`);
    if (storeAccent) lightRules.push(`  --store-accent: ${storeAccent};`);
    if (servicesAccent) lightRules.push(`  --services-accent: ${servicesAccent};`);
    if (musicAccent) lightRules.push(`  --music-accent: ${musicAccent};`);
    if (wikiTagColor) lightRules.push(`  --wiki-tag-color: ${wikiTagColor};`);

    const PAGE_SCOPES = ["landing", "store", "services", "projects", "music", "news"] as const;
    const pageScopeRules: string[] = [];
    for (const p of PAGE_SCOPES) {
      const pb = toHsl(settings[`color.${p}.primaryBtn`] ?? "");
      const pbt = toHsl(settings[`color.${p}.primaryBtnText`] ?? "");
      const sb = toHsl(settings[`color.${p}.secondaryBtn`] ?? "");
      const sbt = toHsl(settings[`color.${p}.secondaryBtnText`] ?? "");
      if (pb || pbt || sb || sbt) {
        pageScopeRules.push(`[data-page="${p}"] {`);
        if (pb) { pageScopeRules.push(`  --primary: ${pb};`); pageScopeRules.push(`  --ring: ${pb};`); }
        if (pbt) pageScopeRules.push(`  --primary-foreground: ${pbt};`);
        if (sb) pageScopeRules.push(`  --secondary: ${sb};`);
        if (sbt) pageScopeRules.push(`  --secondary-foreground: ${sbt};`);
        pageScopeRules.push(`}`);
      }
    }

    const darkRules: string[] = [];

    if (navMainBg) {
      darkRules.push(`  --sidebar-primary: ${navMainBg};`);
      darkRules.push(`  --sidebar-accent: ${navMainBg};`);
      darkRules.push(`  --sidebar-ring: ${navMainBg};`);
      const parts = navMainBg.trim().split(/\s+/);
      const l = parts.length === 3 ? parseFloat(parts[2]) : 50;
      const fg = navMainText ?? (l < 50 ? "0 0% 100%" : "224 71% 4%");
      darkRules.push(`  --sidebar-accent-foreground: ${fg};`);
    } else if (navMainText) {
      darkRules.push(`  --sidebar-accent-foreground: ${navMainText};`);
    }
    if (navSubBg) {
      darkRules.push(`  --nav-sub-accent: ${navSubBg};`);
    }
    if (navSubText) {
      darkRules.push(`  --nav-sub-accent-foreground: ${navSubText};`);
    }
    if (brandMain) darkRules.push(`  --brand-main: ${brandMain};`);
    if (brandSecondary) darkRules.push(`  --brand-secondary: ${brandSecondary};`);
    if (brandAccent) darkRules.push(`  --brand-accent: ${brandAccent};`);
    if (brandHighlight) darkRules.push(`  --brand-highlight: ${brandHighlight};`);

    const darkBgHsl = toHsl(settings["color.dark.background"] ?? "");
    const darkBgIsCustom = !!darkBgHsl && darkBgHsl.trim() !== DEFAULT_DARK_VALUES["color.dark.background"];
    if (darkBgIsCustom && darkBgHsl) {
      const derived = derivedDarkSurfacesAsCssVars(darkBgHsl);
      for (const [k, v] of Object.entries(derived)) {
        darkRules.push(`  ${k}: ${v};`);
      }
    }

    for (const key of COLOR_KEYS_DARK) {
      const val = settings[key];
      if (!val) continue;
      // When a custom dark background is in use, skip explicit overrides that
      // still match the built-in defaults so the derived surface values can
      // take effect. This handles the case where settings are saved as a
      // batch but the user only intentionally changed the background.
      if (darkBgIsCustom && key !== "color.dark.background" && val.trim() === DEFAULT_DARK_VALUES[key]) {
        continue;
      }
      const cssVar = CSS_VAR_MAP_DARK[key];
      darkRules.push(`  ${cssVar}: ${val};`);
    }

    if (homeCardAccent) darkRules.push(`  --home-card-accent: ${homeCardAccent};`);
    if (storeAccent) darkRules.push(`  --store-accent: ${storeAccent};`);
    if (servicesAccent) darkRules.push(`  --services-accent: ${servicesAccent};`);
    if (musicAccent) darkRules.push(`  --music-accent: ${musicAccent};`);
    if (wikiTagColor) darkRules.push(`  --wiki-tag-color: ${wikiTagColor};`)

    // theme.cssVars is the single canonical source: a JSON object { "--var": "value", ... }
    // Legacy theme.customCssVars (plain CSS text) is no longer read — admins must migrate to theme.cssVars.
    let cssVarsEntries: [string, string][] = [];
    const rawCssVarsJson = settings["theme.cssVars"];
    if (rawCssVarsJson) {
      try {
        const parsed = JSON.parse(rawCssVarsJson);
        if (parsed && typeof parsed === "object") {
          cssVarsEntries = Object.entries(parsed) as [string, string][];
        }
      } catch {
        // malformed JSON — skip silently
      }
    }
    // Inject into both light and dark
    for (const [k, v] of cssVarsEntries) {
      lightRules.push(`  ${k}: ${v};`);
      darkRules.push(`  ${k}: ${v};`);
    }

    // Typography font injection
    const headingFont = settings["theme.font.heading"];
    const bodyFont = settings["theme.font.body"];
    const baseFontSize = settings["theme.font.baseSize"];
    if (headingFont && headingFont !== "Inter" && headingFont !== "System UI") {
      lightRules.push(`  --font-heading: '${headingFont}', sans-serif;`);
      darkRules.push(`  --font-heading: '${headingFont}', sans-serif;`);
    }
    if (bodyFont && bodyFont !== "Inter" && bodyFont !== "System UI") {
      lightRules.push(`  --font-sans: '${bodyFont}', sans-serif;`);
      darkRules.push(`  --font-sans: '${bodyFont}', sans-serif;`);
    }
    if (baseFontSize) {
      lightRules.push(`  --font-size-base: ${baseFontSize}px;`);
      darkRules.push(`  --font-size-base: ${baseFontSize}px;`);
    }

    const hasOverrides = lightRules.length > 0 || darkRules.length > 0 || pageScopeRules.length > 0;

    if (!hasOverrides) {
      if (styleRef.current) {
        styleRef.current.remove();
        styleRef.current = null;
      }
      return;
    }

    let css = "";
    if (lightRules.length > 0) css += `:root {\n${lightRules.join("\n")}\n}\n`;
    if (darkRules.length > 0) css += `.dark {\n${darkRules.join("\n")}\n}\n`;
    if (pageScopeRules.length > 0) css += pageScopeRules.join("\n") + "\n";

    if (!styleRef.current) {
      const style = document.createElement("style");
      style.id = "platform-color-overrides";
      document.head.appendChild(style);
      styleRef.current = style;
    }
    styleRef.current.textContent = css;

    // Inject Google Font link tag if a URL is set
    const googleFontUrl = settings["theme.font.googleUrl"];
    const existingLink = document.getElementById("platform-google-font") as HTMLLinkElement | null;
    if (googleFontUrl) {
      if (existingLink) {
        existingLink.href = googleFontUrl;
      } else {
        const link = document.createElement("link");
        link.id = "platform-google-font";
        link.rel = "stylesheet";
        link.href = googleFontUrl;
        document.head.appendChild(link);
      }
    } else if (existingLink) {
      existingLink.remove();
    }
  }, [settings]);

  return null;
}

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    if (window.location.hash) return;
    window.scrollTo(0, 0);
    const main = document.getElementById("main-content");
    if (main) main.scrollTop = 0;
  }, [location]);
  return null;
}

function AppShell() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();
  const { activePlaylist } = useSpotifyPlayer();
  useAnalyticsTracker();

  const isAuthPage = location === "/auth" || location === "/verify-email";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="motion-safe:animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (isAuthPage) {
    return (
      <>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:text-sm focus:font-medium focus:shadow-lg"
          data-testid="link-skip-to-content"
        >
          Skip to content
        </a>
        <main id="main-content">
          <Router />
        </main>
      </>
    );
  }

  const showWikiSidebar = !!user && isWikiRoute(location);
  const showCommandSidebar = !!user && isCommandRoute(location);
  const showSocialSidebar = isSocialRoute(location);

  return (
    <SidebarProvider
      style={{ "--sidebar-width": "16rem", "--sidebar-width-icon": "3rem" } as React.CSSProperties}
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:text-sm focus:font-semibold focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        data-testid="link-skip-to-content"
      >
        Skip to main content
      </a>
      <ScrollToTop />
      <div className="flex flex-col min-h-screen w-full overflow-x-clip">
        <div className="nav-spacer" aria-hidden="true" />
        <PlatformHeader />
        <div className="flex flex-1 min-w-0 overflow-hidden">
          {showWikiSidebar && <AppSidebar />}
          {showCommandSidebar && <CommandSidebar />}
          {showSocialSidebar && !showWikiSidebar && !showCommandSidebar && <SocialSidebar />}
          <main
            id="main-content"
            className="flex-1 min-w-0 flex flex-col"
            style={{ paddingBottom: activePlaylist ? "220px" : undefined }}
          >
            <div className="flex-1">
              {location === '/canvas' ? (
                <Router />
              ) : (
                <AnimatedPage key={location}>
                  <Router />
                </AnimatedPage>
              )}
            </div>
            <PlatformFooter />
          </main>
        </div>
      </div>
      <SpotifyPlayerBar />
      <CartDrawer />
    </SidebarProvider>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <CartProvider>
              <SpotifyPlayerProvider>
                <LensProvider>
                  <FloatingChatProvider>
                    <MusicPlayerProvider>
                      <VoiceProvider>
                        <TooltipProvider>
                          <DynamicHead />
                          <PlatformColorInjector />
                          <AnnouncementBanner />
                          <AppShell />
                          <FloatingChatWindows />
                          <FloatingBrowser />
                          <FloatingMusicPlayer />
                          <VoiceFloatingIndicator />
                          <Toaster />
                        </TooltipProvider>
                      </VoiceProvider>
                    </MusicPlayerProvider>
                  </FloatingChatProvider>
                </LensProvider>
              </SpotifyPlayerProvider>
            </CartProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
