import { useEffect, useState } from "react";
import { PageHead } from "@/components/page-head";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Search as SearchIcon,
  BookOpen,
  Folder,
  ShoppingBag,
  Music,
  Users,
  Briefcase,
  Globe,
  ArrowRight,
  X,
} from "lucide-react";
import { EmptyState } from "@/components/empty-state";

type XPost = {
  url: string;
  title: string;
  text: string;
  handle: string;
};

type XSearchResult = {
  posts: XPost[];
  query: string;
  error?: string;
};

type SearchResultItem = {
  id: number;
  title: string;
  description?: string | null;
  href: string;
  meta?: string | null;
};

type SearchResults = {
  wiki: SearchResultItem[];
  projects: SearchResultItem[];
  store: SearchResultItem[];
  music: SearchResultItem[];
  jobs: SearchResultItem[];
  services: SearchResultItem[];
  total: number;
};

const SECTION_CONFIG = [
  { key: "wiki" as const,     label: "Wiki",     icon: BookOpen,    color: "text-blue-500",   emptyMsg: "No wiki articles found" },
  { key: "projects" as const, label: "Projects", icon: Folder,      color: "text-blue-600", emptyMsg: "No projects found" },
  { key: "store" as const,    label: "Store",    icon: ShoppingBag, color: "text-red-600", emptyMsg: "No products found" },
  { key: "music" as const,    label: "Music",    icon: Music,       color: "text-pink-500",   emptyMsg: "No artists or albums found" },
  { key: "jobs" as const,     label: "Jobs",     icon: Users,       color: "text-green-500",  emptyMsg: "No jobs found" },
  { key: "services" as const, label: "Services", icon: Briefcase,   color: "text-yellow-500", emptyMsg: "No services found" },
];

function getQueryFromUrl(): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("q") || "";
}

export default function SearchPage() {
  const [location, navigate] = useLocation();
  const [inputValue, setInputValue] = useState(getQueryFromUrl);
  const [query, setQuery] = useState(getQueryFromUrl);

  useEffect(() => {
    const q = getQueryFromUrl();
    setInputValue(q);
    setQuery(q);
  }, [location]);

  const { data: xResults, isLoading: xLoading } = useQuery<XSearchResult>({
    queryKey: ["/api/search/x-social", query],
    queryFn: async () => {
      if (!query || query.length < 2) return { posts: [], query };
      const res = await fetch(`/api/search/x-social?q=${encodeURIComponent(query)}`, {
        credentials: "include",
      });
      if (!res.ok) return { posts: [], query };
      return res.json();
    },
    enabled: query.length >= 2,
  });

  const { data: results, isLoading } = useQuery<SearchResults>({
    queryKey: ["/api/search", query, "full"],
    queryFn: async () => {
      if (!query || query.length < 2) {
        return { wiki: [], projects: [], store: [], music: [], jobs: [], services: [], total: 0 };
      }
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=10`, { credentials: "include" });
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
    enabled: query.length >= 2,
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (inputValue.trim()) {
      navigate(`/search?q=${encodeURIComponent(inputValue.trim())}`);
      setQuery(inputValue.trim());
    }
  }

  const googleSearch = () => {
    if (query) {
      window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, "_blank");
    }
  };

  const hasResults = results && results.total > 0;
  const showContent = query.length >= 2;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
      <PageHead
        title={query ? `Search: "${query}" — SEVCO` : "Search — SEVCO"}
        description={query ? `Search results for "${query}" across SEVCO wiki, store, projects, services, and more.` : "Search across SEVCO — wiki articles, store products, projects, services, music, and jobs."}
        ogUrl="https://sevco.us/search"
        noIndex={true}
      />
      <div>
        <h1 className="text-2xl font-bold mb-1">Search</h1>
        <p className="text-sm text-muted-foreground">Search across wiki, projects, store, music, jobs & services</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="flex items-center gap-2 border border-border rounded-xl bg-muted/30 px-4 py-2.5 focus-within:ring-2 focus-within:ring-ring transition-shadow">
          <SearchIcon className="h-5 w-5 text-muted-foreground shrink-0" />
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Search everything..."
            className="flex-1 bg-transparent outline-none text-base placeholder:text-muted-foreground/60"
            data-testid="input-search-page"
            autoFocus
          />
          {inputValue && (
            <button
              type="button"
              onClick={() => { setInputValue(""); navigate("/search"); setQuery(""); }}
              className="text-muted-foreground hover:text-foreground transition-colors"
              data-testid="button-clear-search-page"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <Button type="submit" size="sm" className="h-7 text-xs px-3" data-testid="button-search-submit">
            Search
          </Button>
        </div>
      </form>

      {showContent && (
        <>
          {isLoading && (
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-5 w-24" />
                  {[1, 2, 3].map((j) => (
                    <Skeleton key={j} className="h-14 w-full rounded-xl" />
                  ))}
                </div>
              ))}
            </div>
          )}

          {!isLoading && !hasResults && (
            <EmptyState
              icon={SearchIcon}
              title={`No results for "${query}"`}
              description="Try different keywords or search on Google."
              action={
                <Button variant="outline" onClick={googleSearch} className="gap-2" data-testid="button-google-search-empty">
                  <Globe className="h-4 w-4" />
                  Search Google for "{query}"
                </Button>
              }
            />
          )}

          {!isLoading && hasResults && (
            <>
              <div className="text-sm text-muted-foreground" data-testid="text-results-count">
                {results.total} result{results.total !== 1 ? "s" : ""} for "{query}"
              </div>

              <div className="space-y-8">
                {SECTION_CONFIG.map(({ key, label, icon: Icon, color }) => {
                  const items = results[key];
                  if (!items || items.length === 0) return null;
                  return (
                    <section key={key} data-testid={`section-search-${key}`}>
                      <div className="flex items-center gap-2 mb-3">
                        <Icon className={`h-4 w-4 ${color}`} />
                        <h2 className="text-sm font-semibold text-foreground">{label}</h2>
                        <span className="text-xs text-muted-foreground">({items.length})</span>
                      </div>
                      <div className="space-y-1.5">
                        {items.map((item) => (
                          <Link key={item.id} href={item.href}>
                            <div
                              className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border hover:bg-muted/50 hover:border-border/80 transition-all cursor-pointer group"
                              data-testid={`search-result-${key}-${item.id}`}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                                {item.description && (
                                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{item.description}</p>
                                )}
                              </div>
                              {item.meta && (
                                <Badge variant="outline" className="text-[10px] shrink-0 capitalize">{item.meta}</Badge>
                              )}
                              <ArrowRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors shrink-0" />
                            </div>
                          </Link>
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>

              {/* X Social Results — shown after platform sections, before Google link */}
              {(xLoading || (xResults?.posts && xResults.posts.length > 0)) && (
                <section data-testid="section-search-x-social">
                  <div className="flex items-center gap-2 mb-3">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-foreground shrink-0">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    <h2 className="text-sm font-semibold text-foreground">On X</h2>
                    {xLoading && <span className="text-xs text-muted-foreground">Searching X…</span>}
                    {!xLoading && xResults?.posts?.length ? (
                      <span className="text-xs text-muted-foreground">({xResults.posts.length})</span>
                    ) : null}
                  </div>
                  {xLoading && (
                    <div className="space-y-1.5">
                      {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
                    </div>
                  )}
                  {!xLoading && xResults?.posts && xResults.posts.length > 0 && (
                    <div className="space-y-1.5">
                      {xResults.posts.map((post, i) => (
                        <a
                          key={i}
                          href={post.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-start gap-3 px-4 py-3 rounded-xl border border-border hover:bg-muted/50 hover:border-border/80 transition-all cursor-pointer group"
                          data-testid={`search-result-x-${i}`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-muted-foreground mb-0.5">{post.handle}</p>
                            <p className="text-sm text-foreground line-clamp-2">{post.text}</p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors shrink-0 mt-1" />
                        </a>
                      ))}
                    </div>
                  )}
                </section>
              )}

              <div className="border-t border-border pt-6">
                <button
                  onClick={googleSearch}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="button-google-search"
                >
                  <Globe className="h-4 w-4" />
                  Search Google for "{query}"
                </button>
              </div>
            </>
          )}
        </>
      )}

      {!showContent && (
        <div className="text-center py-16">
          <SearchIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-20" />
          <p className="text-sm text-muted-foreground">Enter at least 2 characters to search</p>
        </div>
      )}
    </div>
  );
}
