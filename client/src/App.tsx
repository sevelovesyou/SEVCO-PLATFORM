import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { PlatformHeader } from "@/components/platform-header";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/components/protected-route";

import Landing from "@/pages/landing";
import Home from "@/pages/home";
import ArticleView from "@/pages/article-view";
import ArticleEditor from "@/pages/article-editor";
import SearchPage from "@/pages/search";
import ReviewQueue from "@/pages/review-queue";
import CategoryView from "@/pages/category-view";
import AuthPage from "@/pages/auth-page";
import AccountPage from "@/pages/account-page";
import MusicPage from "@/pages/music-page";
import StorePage from "@/pages/store-page";
import ProjectsPage from "@/pages/projects-page";
import DashboardPage from "@/pages/dashboard-page";
import NotFound from "@/pages/not-found";

const WIKI_PREFIXES = ["/wiki", "/edit/", "/new", "/search", "/review", "/category/", "/account"];

function isWikiRoute(location: string): boolean {
  return WIKI_PREFIXES.some(
    (prefix) => location === prefix || location.startsWith(prefix)
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/" component={() => <ProtectedRoute><Landing /></ProtectedRoute>} />
      <Route path="/wiki" component={() => <ProtectedRoute><Home /></ProtectedRoute>} />
      <Route path="/wiki/:slug" component={() => <ProtectedRoute><ArticleView /></ProtectedRoute>} />
      <Route path="/edit/:slug" component={() => <ProtectedRoute><ArticleEditor /></ProtectedRoute>} />
      <Route path="/new" component={() => <ProtectedRoute><ArticleEditor /></ProtectedRoute>} />
      <Route path="/search" component={() => <ProtectedRoute><SearchPage /></ProtectedRoute>} />
      <Route path="/review" component={() => <ProtectedRoute><ReviewQueue /></ProtectedRoute>} />
      <Route path="/account" component={() => <ProtectedRoute><AccountPage /></ProtectedRoute>} />
      <Route path="/category/:slug" component={() => <ProtectedRoute><CategoryView /></ProtectedRoute>} />
      <Route path="/music" component={() => <ProtectedRoute><MusicPage /></ProtectedRoute>} />
      <Route path="/store" component={() => <ProtectedRoute><StorePage /></ProtectedRoute>} />
      <Route path="/projects" component={() => <ProtectedRoute><ProjectsPage /></ProtectedRoute>} />
      <Route path="/dashboard" component={() => <ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppShell() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return <Router />;
  }

  const showSidebar = isWikiRoute(location);

  return (
    <SidebarProvider
      style={{ "--sidebar-width": "16rem", "--sidebar-width-icon": "3rem" } as React.CSSProperties}
    >
      <div className="flex flex-col h-screen w-full">
        <PlatformHeader showSidebarTrigger={showSidebar} />
        <div className="flex flex-1 min-h-0">
          {showSidebar && <AppSidebar />}
          <main className="flex-1 overflow-auto">
            <Router />
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
          <TooltipProvider>
            <AppShell />
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
