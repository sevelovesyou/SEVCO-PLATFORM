import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { PageHead } from "@/components/page-head";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Globe,
  Search,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ShoppingCart,
  Tag,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

const COMMON_TLDS = [".com", ".net", ".org", ".io", ".co", ".app", ".dev"];

interface DomainResult {
  domain: string;
  available: boolean;
  price?: number;
  period?: number;
}

interface AvailabilityResponse {
  data?: DomainResult[];
}

interface CatalogItem {
  name: string;
  unit_price?: number;
  price?: number;
}

interface CatalogResponse {
  data?: CatalogItem[];
}

function sanitizeDomain(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0];
}

function extractSLD(input: string): string {
  const parts = input.split(".");
  return parts.length > 1 ? parts[0] : input;
}

function PriceBadge({ price }: { price?: number }) {
  if (!price) return null;
  return (
    <span className="text-xs font-semibold text-green-700 dark:text-green-400">
      ${(price / 100).toFixed(2)}/yr
    </span>
  );
}

function DomainResultCard({
  result,
  onPurchase,
}: {
  result: DomainResult;
  onPurchase: (domain: string) => void;
}) {
  return (
    <Card
      className={`p-4 overflow-visible flex items-center gap-3 ${
        result.available
          ? "border-green-500/30 dark:border-green-500/20"
          : "opacity-70"
      }`}
      data-testid={`card-domain-${result.domain.replace(/\./g, "-")}`}
    >
      <div className="shrink-0">
        {result.available ? (
          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
        ) : (
          <XCircle className="h-5 w-5 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" data-testid={`text-domain-name-${result.domain.replace(/\./g, "-")}`}>
          {result.domain}
        </p>
        <p className={`text-xs ${result.available ? "text-green-700 dark:text-green-400" : "text-muted-foreground"}`}>
          {result.available ? "Available" : "Taken"}
        </p>
      </div>
      {result.available && (
        <div className="flex items-center gap-2 shrink-0">
          {result.price && <PriceBadge price={result.price} />}
          <Button
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={() => onPurchase(result.domain)}
            data-testid={`button-register-${result.domain.replace(/\./g, "-")}`}
          >
            <ShoppingCart className="h-3 w-3" />
            Register
          </Button>
        </div>
      )}
    </Card>
  );
}

function CatalogSection() {
  const { data, isLoading } = useQuery<CatalogResponse>({
    queryKey: ["/api/hostinger/domains/catalog"],
    staleTime: 5 * 60 * 1000,
  });

  const items: CatalogItem[] = Array.isArray(data)
    ? data
    : (data?.data ?? []);

  const tldItems = items
    .filter((item) => item.name?.startsWith("."))
    .slice(0, 12);

  if (isLoading) {
    return (
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-full" />
        ))}
      </div>
    );
  }

  if (tldItems.length === 0) return null;

  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Popular Extensions & Pricing
      </p>
      <div className="flex flex-wrap gap-2">
        {tldItems.map((item) => {
          const price = item.unit_price ?? item.price;
          return (
            <div
              key={item.name}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-muted/40 text-xs"
              data-testid={`badge-tld-${item.name.replace(/\./g, "")}`}
            >
              <Tag className="h-3 w-3 text-muted-foreground" />
              <span className="font-medium">{item.name}</span>
              {price && (
                <span className="text-muted-foreground">${(price / 100).toFixed(2)}/yr</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function DomainsPage() {
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState(false);

  const availabilityMutation = useMutation({
    mutationFn: async (domain: string) => {
      const sld = extractSLD(domain);
      const tlds = COMMON_TLDS;
      const res = await apiRequest("POST", "/api/hostinger/domains/availability", {
        domain: sld,
        tlds,
      });
      return res.json() as Promise<AvailabilityResponse>;
    },
  });

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const clean = sanitizeDomain(query);
    if (!clean) return;
    setSearched(true);
    availabilityMutation.mutate(clean);
  }

  function handlePurchase(domain: string) {
    const url = `https://www.hostinger.com/domain-name-search?domain=${encodeURIComponent(domain)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  const results: DomainResult[] = Array.isArray(availabilityMutation.data)
    ? availabilityMutation.data
    : (availabilityMutation.data?.data ?? []);

  const availableCount = results.filter((r) => r.available).length;

  return (
    <div className="min-h-screen bg-background">
      <PageHead
        title="Domain Search — SEVCO"
        description="Search for available domain names and register them instantly. Find .com, .net, .io, .app, and more with SEVCO."
        ogUrl="https://sevco.us/domains"
      />
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-4">
            <Globe className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2" data-testid="heading-domains">
            Find Your Domain
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Search for available domain names and register them through SEVCO powered by Hostinger.
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2 mb-8" data-testid="form-domain-search">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              className="pl-9 h-11 text-sm"
              placeholder="Enter a domain name (e.g. mybrand)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              data-testid="input-domain-search"
              autoFocus
            />
          </div>
          <Button
            type="submit"
            className="h-11 px-6 gap-2"
            disabled={!query.trim() || availabilityMutation.isPending}
            data-testid="button-domain-search-submit"
          >
            {availabilityMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            Search
          </Button>
        </form>

        {availabilityMutation.isPending && (
          <div className="flex flex-col gap-2 mb-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        )}

        {availabilityMutation.isError && (
          <Card className="p-5 overflow-visible flex items-start gap-3 border-destructive/30 mb-6">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Search failed</p>
              <p className="text-xs text-muted-foreground mt-0.5" data-testid="text-search-error">
                {(availabilityMutation.error as Error)?.message || "Unable to check availability. Please try again."}
              </p>
            </div>
          </Card>
        )}

        {searched && !availabilityMutation.isPending && !availabilityMutation.isError && results.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Results for "{sanitizeDomain(query)}"
              </p>
              <Badge variant="outline" className="text-xs">
                {availableCount} available
              </Badge>
            </div>
            <div className="flex flex-col gap-2">
              {results
                .sort((a, b) => (b.available ? 1 : 0) - (a.available ? 1 : 0))
                .map((result) => (
                  <DomainResultCard
                    key={result.domain}
                    result={result}
                    onPurchase={handlePurchase}
                  />
                ))}
            </div>
          </div>
        )}

        {searched && !availabilityMutation.isPending && !availabilityMutation.isError && results.length === 0 && (
          <Card className="p-8 text-center overflow-visible mb-8">
            <Globe className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-30" />
            <p className="text-sm font-medium mb-1">No results found</p>
            <p className="text-xs text-muted-foreground">
              Try a different search term.
            </p>
          </Card>
        )}

        <div className="mt-4">
          <CatalogSection />
        </div>

        <div className="mt-10 p-4 rounded-xl border bg-muted/30 text-center">
          <p className="text-xs text-muted-foreground">
            Domain registration is powered by{" "}
            <a
              href="https://www.hostinger.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground transition-colors"
            >
              Hostinger
            </a>
            . Clicking "Register" will open the Hostinger checkout flow.
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 h-7 text-xs gap-1.5 text-muted-foreground"
            asChild
          >
            <a
              href="https://hpanel.hostinger.com"
              target="_blank"
              rel="noopener noreferrer"
              data-testid="link-hpanel-domains"
            >
              <ExternalLink className="h-3 w-3" />
              Manage existing domains in hPanel
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
