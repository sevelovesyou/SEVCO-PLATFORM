import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Search, X, BookOpen, Folder, ShoppingBag, Music, Users, Briefcase, Globe, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
  { key: "wiki" as const,     label: "Wiki",     icon: BookOpen,    color: "text-blue-500" },
  { key: "projects" as const, label: "Projects", icon: Folder,      color: "text-blue-600" },
  { key: "store" as const,    label: "Store",    icon: ShoppingBag, color: "text-red-600" },
  { key: "music" as const,    label: "Music",    icon: Music,       color: "text-pink-500" },
  { key: "jobs" as const,     label: "Jobs",     icon: Users,       color: "text-green-500" },
  { key: "services" as const, label: "Services", icon: Briefcase,   color: "text-yellow-500" },
];

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

interface SearchOverlayProps {
  open: boolean;
  onClose: () => void;
}

export function SearchOverlay({ open, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const inputRef = useRef<HTMLInputElement>(null);
  const [, navigate] = useLocation();

  useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const { data: results, isLoading } = useQuery<SearchResults>({
    queryKey: ["/api/search", debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) {
        return { wiki: [], projects: [], store: [], music: [], jobs: [], services: [], total: 0 };
      }
      const res = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}&limit=4`, { credentials: "include" });
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
    enabled: open,
  });

  const handleNavigate = useCallback((href: string) => {
    navigate(href);
    onClose();
  }, [navigate, onClose]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      onClose();
    }
  }, [query, navigate, onClose]);

  const googleSearch = useCallback(() => {
    if (query.trim()) {
      window.open(`https://www.google.com/search?q=${encodeURIComponent(query.trim())}`, "_blank");
    }
  }, [query]);

  const hasResults = results && results.total > 0;
  const showResults = debouncedQuery.length >= 2;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex flex-col items-center pt-16 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      data-testid="search-overlay"
    >
      <div className="w-full max-w-2xl bg-background border border-border rounded-2xl shadow-2xl overflow-hidden">
        <form onSubmit={handleSubmit}>
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <Search className="h-5 w-5 text-muted-foreground shrink-0" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search everything..."
              className="flex-1 border-0 bg-transparent p-0 text-base shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/60"
              data-testid="input-search-overlay"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="text-muted-foreground hover:text-foreground transition-colors"
                data-testid="button-clear-search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors text-xs px-2 py-1 rounded border border-border hidden sm:block"
              data-testid="button-close-search"
            >
              esc
            </button>
          </div>
        </form>

        {showResults && (
          <div className="max-h-[60vh] overflow-y-auto">
            {isLoading && (
              <div className="py-8 text-center text-sm text-muted-foreground">Searching...</div>
            )}

            {!isLoading && !hasResults && (
              <div className="py-10 text-center">
                <Search className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-30" />
                <p className="text-sm text-muted-foreground">No results for "{debouncedQuery}"</p>
              </div>
            )}

            {!isLoading && hasResults && (
              <div className="py-2">
                {SECTION_CONFIG.map(({ key, label, icon: Icon, color }) => {
                  const items = results[key];
                  if (!items || items.length === 0) return null;
                  return (
                    <div key={key} className="mb-1">
                      <div className="flex items-center gap-2 px-4 py-1.5">
                        <Icon className={`h-3.5 w-3.5 ${color}`} />
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
                      </div>
                      {items.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleNavigate(item.href)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/60 transition-colors text-left group"
                          data-testid={`search-result-${key}-${item.id}`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                            {item.description && (
                              <p className="text-xs text-muted-foreground truncate mt-0.5">{item.description}</p>
                            )}
                          </div>
                          {item.meta && (
                            <Badge variant="outline" className="text-[10px] shrink-0">{item.meta}</Badge>
                          )}
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors shrink-0" />
                        </button>
                      ))}
                    </div>
                  );
                })}

                <div className="border-t border-border mt-1 pt-1 px-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigate(`/search?q=${encodeURIComponent(debouncedQuery)}`);
                      onClose();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-muted/60 transition-colors text-left text-sm text-muted-foreground hover:text-foreground"
                    data-testid="button-see-all-results"
                  >
                    <ArrowRight className="h-4 w-4" />
                    See all results for "{debouncedQuery}"
                  </button>
                </div>
              </div>
            )}

            {showResults && (
              <div className="border-t border-border px-4 py-3">
                <button
                  type="button"
                  onClick={googleSearch}
                  className="w-full flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="button-google-search"
                >
                  <Globe className="h-4 w-4 shrink-0" />
                  Search Google for "{query || debouncedQuery}"
                </button>
              </div>
            )}
          </div>
        )}

        {!showResults && (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Type to search across wiki, projects, store, music, jobs & services
          </div>
        )}
      </div>
    </div>
  );
}
