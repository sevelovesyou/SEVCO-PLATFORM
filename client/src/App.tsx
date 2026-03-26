import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { CommandSidebar } from "@/components/command-sidebar";
import { PlatformHeader } from "@/components/platform-header";
import { PlatformFooter } from "@/components/platform-footer";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/components/protected-route";
import { CartProvider } from "@/hooks/use-cart";
import { SpotifyPlayerProvider, useSpotifyPlayer } from "@/hooks/use-spotify-player";
import { SpotifyPlayerBar } from "@/components/spotify-player-bar";
import { CartDrawer } from "@/components/cart-drawer";
import { useEffect, useRef } from "react";

import Landing from "@/pages/landing";
import Home from "@/pages/home";
import ArticleView from "@/pages/article-view";
import ArticleEditor from "@/pages/article-editor";
import SearchPage from "@/pages/search";
import ReviewQueue from "@/pages/review-queue";
import CategoryView from "@/pages/category-view";
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
import NotFound from "@/pages/not-found";

import { CommandPageLayout } from "@/pages/command-page";
import CommandOverview from "@/pages/command-overview";
import CommandUsers from "@/pages/command-users";
import CommandChangelog from "@/pages/command-changelog";
import CommandStore from "@/pages/command-store";
import CommandServices from "@/pages/command-services";
import CommandJobs from "@/pages/command-jobs";
import CommandMusic from "@/pages/command-music";
import CommandPlaylists from "@/pages/command-playlists";
import CommandSocialLinks from "@/pages/command-social-links";
import CommandResources from "@/pages/command-resources";
import CommandHosting from "@/pages/command-hosting";
import CommandDisplay from "@/pages/command-display";
import DomainsPage from "@/pages/domains-page";
import NotesPage from "@/pages/notes-page";
import FeedPage from "@/pages/feed-page";
import ChangelogPage from "@/pages/changelog-page";
import ServiceDetailPage from "@/pages/service-detail-page";
import ServicesListingPage from "@/pages/services-listing";
import WikiArchivePage from "@/pages/wiki-archive-page";
import AboutPage from "@/pages/about-page";
import HostingPage from "@/pages/hosting-page";
import MinecraftPage from "@/pages/minecraft-page";
import GalleryPage from "@/pages/gallery-page";
import CommandGallery from "@/pages/command-gallery";
import CommandMedia from "@/pages/command-media";
import CommandSupport from "@/pages/command-support";
import CommandStaff from "@/pages/command-staff";
import CommandChatLog from "@/pages/command-chat-log";
import CommandFinance from "@/pages/command-finance";

const WIKI_PREFIXES = ["/wiki", "/edit/", "/new", "/search", "/review", "/category/"];
const COMMAND_PREFIXES = ["/command"];

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

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/verify-email" component={VerifyEmailPage} />

      {/* Public routes — no ProtectedRoute */}
      <Route path="/" component={Landing} />
      <Route path="/wiki" component={Home} />
      <Route path="/wiki/archive" component={() => <ProtectedRoute><WikiArchivePage /></ProtectedRoute>} />
      <Route path="/wiki/:slug" component={ArticleView} />
      <Route path="/search" component={SearchPage} />
      <Route path="/category/:slug" component={CategoryView} />
      <Route path="/music" component={MusicPage} />
      <Route path="/music/submit" component={MusicSubmitPage} />
      <Route path="/music/playlists" component={MusicPlaylistsPage} />
      <Route path="/listen" component={MusicListenPage} />
      <Route path="/music/artists" component={MusicArtistsPage} />
      <Route path="/music/artists/:slug" component={MusicArtistDetail} />
      <Route path="/music/albums/:slug" component={MusicAlbumDetail} />
      <Route path="/store" component={StorePage} />
      <Route path="/store/products/:slug" component={StoreProductDetail} />
      <Route path="/services" component={ServicesListingPage} />
      <Route path="/services/:slug" component={ServiceDetailPage} />
      <Route path="/projects" component={ProjectsPage} />
      <Route path="/projects/:slug" component={ProjectDetail} />
      <Route path="/about" component={AboutPage} />
      <Route path="/hosting" component={HostingPage} />
      <Route path="/minecraft" component={MinecraftPage} />
      <Route path="/contact" component={ContactPage} />
      <Route path="/feed" component={FeedPage} />
      <Route path="/changelog" component={ChangelogPage} />
      <Route path="/jobs" component={JobsPage} />
      <Route path="/jobs/:slug" component={JobsDetailPage} />
      <Route path="/profile/:username" component={ProfilePage} />

      {/* Protected write/manage routes */}
      <Route path="/profile" component={ProfilePage} />
      <Route path="/edit/:slug" component={() => <ProtectedRoute><ArticleEditor /></ProtectedRoute>} />
      <Route path="/new" component={() => <ProtectedRoute><ArticleEditor /></ProtectedRoute>} />
      <Route path="/review" component={() => <ProtectedRoute><ReviewQueue /></ProtectedRoute>} />
      <Route path="/account" component={() => <ProtectedRoute><AccountPage /></ProtectedRoute>} />
      <Route path="/store/success" component={() => <ProtectedRoute><StoreSuccessPage /></ProtectedRoute>} />
      <Route path="/store/cancel" component={() => <ProtectedRoute><StoreCancelPage /></ProtectedRoute>} />
      <Route path="/store/products/new" component={() => <ProtectedRoute><StoreProductForm /></ProtectedRoute>} />
      <Route path="/music/artists/new" component={() => <ProtectedRoute><MusicArtistForm /></ProtectedRoute>} />
      <Route path="/music/albums/new" component={() => <ProtectedRoute><MusicAlbumForm /></ProtectedRoute>} />
      <Route path="/projects/new" component={() => <ProtectedRoute><ProjectCreatePage /></ProtectedRoute>} />
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
      <Route path="/command/social-links" component={() => (
        <ProtectedRoute>
          <CommandPageLayout title="Social Links" subtitle="Manage platform social media presence">
            <CommandSocialLinks />
          </CommandPageLayout>
        </ProtectedRoute>
      )} />
      <Route path="/command/resources" component={() => (
        <ProtectedRoute requiredRole="admin">
          <CommandPageLayout title="Resources" subtitle="Manage quick links and platform resources">
            <CommandResources />
          </CommandPageLayout>
        </ProtectedRoute>
      )} />
      <Route path="/command/hosting" component={() => (
        <ProtectedRoute>
          <CommandPageLayout title="Hosting" subtitle="Hostinger VPS management">
            <CommandHosting />
          </CommandPageLayout>
        </ProtectedRoute>
      )} />
      <Route path="/command/display" component={() => (
        <ProtectedRoute requiredRole="admin">
          <CommandPageLayout title="Display" subtitle="Control the visual presentation of the platform">
            <CommandDisplay />
          </CommandPageLayout>
        </ProtectedRoute>
      )} />
      <Route path="/domains" component={DomainsPage} />
      <Route path="/notes" component={NotesPage} />
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
      <Route path="/command/finance" component={() => (
        <ProtectedRoute>
          <CommandPageLayout title="Finance" subtitle="Accounting, invoices, budgets, and calculator">
            <CommandFinance />
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

const COLOR_KEYS_LIGHT = ["color.light.primary", "color.light.background", "color.light.foreground", "color.light.accent"];
const COLOR_KEYS_DARK = ["color.dark.primary", "color.dark.background", "color.dark.foreground", "color.dark.accent"];
const CSS_VAR_MAP_LIGHT: Record<string, string> = {
  "color.light.primary": "--primary",
  "color.light.background": "--background",
  "color.light.foreground": "--foreground",
  "color.light.accent": "--accent",
};
const CSS_VAR_MAP_DARK: Record<string, string> = {
  "color.dark.primary": "--primary",
  "color.dark.background": "--background",
  "color.dark.foreground": "--foreground",
  "color.dark.accent": "--accent",
};

function PlatformColorInjector() {
  const { data: settings } = useQuery<Record<string, string>>({
    queryKey: ["/api/platform-settings"],
  });
  const styleRef = useRef<HTMLStyleElement | null>(null);

  useEffect(() => {
    if (!settings) return;

    const lightRules: string[] = [];
    for (const key of COLOR_KEYS_LIGHT) {
      const val = settings[key];
      if (val) {
        const cssVar = CSS_VAR_MAP_LIGHT[key];
        lightRules.push(`  ${cssVar}: ${val};`);
      }
    }
    const brandMain = settings["color.brand.main"];
    const brandSecondary = settings["color.brand.secondary"];
    const brandAccent = settings["color.brand.accent"];
    const brandHighlight = settings["color.brand.highlight"];
    if (brandMain) lightRules.push(`  --brand-main: ${brandMain};`);
    if (brandSecondary) lightRules.push(`  --brand-secondary: ${brandSecondary};`);
    if (brandAccent) lightRules.push(`  --brand-accent: ${brandAccent};`);
    if (brandHighlight) lightRules.push(`  --brand-highlight: ${brandHighlight};`);

    const darkRules: string[] = [];
    for (const key of COLOR_KEYS_DARK) {
      const val = settings[key];
      if (val) {
        const cssVar = CSS_VAR_MAP_DARK[key];
        darkRules.push(`  ${cssVar}: ${val};`);
      }
    }
    if (brandMain) darkRules.push(`  --brand-main: ${brandMain};`);
    if (brandSecondary) darkRules.push(`  --brand-secondary: ${brandSecondary};`);
    if (brandAccent) darkRules.push(`  --brand-accent: ${brandAccent};`);
    if (brandHighlight) darkRules.push(`  --brand-highlight: ${brandHighlight};`);

    const hasOverrides = lightRules.length > 0 || darkRules.length > 0;

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

    if (!styleRef.current) {
      const style = document.createElement("style");
      style.id = "platform-color-overrides";
      document.head.appendChild(style);
      styleRef.current = style;
    }
    styleRef.current.textContent = css;
  }, [settings]);

  return null;
}

function AppShell() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();
  const { activePlaylist } = useSpotifyPlayer();

  const isAuthPage = location === "/auth" || location === "/verify-email";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (isAuthPage) {
    return <Router />;
  }

  const showWikiSidebar = !!user && isWikiRoute(location);
  const showCommandSidebar = !!user && isCommandRoute(location);

  return (
    <SidebarProvider
      style={{ "--sidebar-width": "16rem", "--sidebar-width-icon": "3rem" } as React.CSSProperties}
    >
      <div className="flex flex-col min-h-screen w-full">
        <PlatformHeader />
        <div className="flex flex-1">
          {showWikiSidebar && <AppSidebar />}
          {showCommandSidebar && <CommandSidebar />}
          <main
            className="flex-1 flex flex-col"
            style={{ paddingBottom: activePlaylist ? "220px" : undefined }}
          >
            <div className="flex-1">
              <Router />
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
    <ThemeProvider defaultTheme="light">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <CartProvider>
            <SpotifyPlayerProvider>
              <TooltipProvider>
                <DynamicHead />
                <PlatformColorInjector />
                <AppShell />
                <Toaster />
              </TooltipProvider>
            </SpotifyPlayerProvider>
          </CartProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
