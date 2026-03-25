import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
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
import StoreStatsPage from "@/pages/store-stats-page";
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
import ServiceDetailPage from "@/pages/service-detail-page";
import ServicesListingPage from "@/pages/services-listing";

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
      <Route path="/contact" component={ContactPage} />
      <Route path="/jobs" component={JobsPage} />
      <Route path="/jobs/:slug" component={JobsDetailPage} />
      <Route path="/profile/:username" component={ProfilePage} />

      {/* Protected write/manage routes */}
      <Route path="/profile" component={ProfilePage} />
      <Route path="/edit/:slug" component={() => <ProtectedRoute><ArticleEditor /></ProtectedRoute>} />
      <Route path="/new" component={() => <ProtectedRoute><ArticleEditor /></ProtectedRoute>} />
      <Route path="/review" component={() => <ProtectedRoute><ReviewQueue /></ProtectedRoute>} />
      <Route path="/account" component={() => <ProtectedRoute><AccountPage /></ProtectedRoute>} />
      <Route path="/store/stats" component={() => <ProtectedRoute><StoreStatsPage /></ProtectedRoute>} />
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
          <CommandPageLayout title="Music Submissions" subtitle="Review A&R demos and playlist pitches">
            <CommandMusic />
          </CommandPageLayout>
        </ProtectedRoute>
      )} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppShell() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

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
          <main className="flex-1 flex flex-col">
            <div className="flex-1">
              <Router />
            </div>
            <PlatformFooter />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="light">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <CartProvider>
            <TooltipProvider>
              <AppShell />
              <Toaster />
            </TooltipProvider>
          </CartProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
