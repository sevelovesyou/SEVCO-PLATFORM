import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollText, Zap, Wrench, TrendingUp, MoreHorizontal, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import type { Changelog, ChangelogCategory } from "@shared/schema";

const CATEGORY_META: Record<ChangelogCategory, { label: string; color: string; icon: React.ElementType }> = {
  feature:     { label: "Feature",     color: "bg-primary/10 text-primary border-primary/20",                                                  icon: Zap },
  fix:         { label: "Fix",         color: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",                                icon: Wrench },
  improvement: { label: "Improvement", color: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",                        icon: TrendingUp },
  other:       { label: "Other",       color: "bg-muted text-muted-foreground border-border",                                                   icon: MoreHorizontal },
};

function formatDate(dateStr: string | Date) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default function ChangelogPage() {
  const { data: entries, isLoading } = useQuery<Changelog[]>({
    queryKey: ["/api/changelog"],
  });

  const grouped = entries
    ? entries.reduce<Record<string, Changelog[]>>((acc, entry) => {
        const year = new Date(entry.createdAt).getFullYear().toString();
        if (!acc[year]) acc[year] = [];
        acc[year].push(entry);
        return acc;
      }, {})
    : {};

  const years = Object.keys(grouped).sort((a, b) => Number(b) - Number(a));

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <ScrollText className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-changelog-title">Changelog</h1>
        </div>
        <p className="text-muted-foreground text-base">
          A running log of features, fixes, and improvements to the SEVCO Platform.
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className="flex flex-col items-center">
                <Skeleton className="h-3 w-3 rounded-full mt-1" />
                <Skeleton className="w-px flex-1 mt-2" />
              </div>
              <div className="flex-1 pb-6">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-5 w-2/3 mb-1" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : entries && entries.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <ScrollText className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No changelog entries yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          {years.map((year) => (
            <div key={year}>
              <div className="flex items-center gap-3 mb-6">
                <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">{year}</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              <div className="flex flex-col gap-0">
                {grouped[year].map((entry, idx) => {
                  const meta = CATEGORY_META[entry.category as ChangelogCategory] ?? CATEGORY_META.other;
                  const IconComp = meta.icon;
                  const isLast = idx === grouped[year].length - 1;
                  return (
                    <div key={entry.id} className="flex gap-4" data-testid={`row-changelog-${entry.id}`}>
                      <div className="flex flex-col items-center">
                        <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 border ${meta.color}`}>
                          <IconComp className="h-3.5 w-3.5" />
                        </div>
                        {!isLast && <div className="w-px flex-1 bg-border mt-1" />}
                      </div>
                      <div className={`flex-1 ${isLast ? "pb-0" : "pb-7"}`}>
                        <div className="flex items-center flex-wrap gap-2 mb-1.5">
                          <span
                            className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize ${meta.color}`}
                            data-testid={`badge-changelog-type-${entry.id}`}
                          >
                            {meta.label}
                          </span>
                          {entry.version && (
                            <span
                              className="inline-block text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border bg-muted text-muted-foreground border-border"
                              data-testid={`badge-changelog-version-${entry.id}`}
                            >
                              v{entry.version}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">{formatDate(entry.createdAt)}</span>
                        </div>
                        <p className="text-sm font-semibold leading-snug mb-0.5" data-testid={`text-changelog-entry-title-${entry.id}`}>
                          {entry.title}
                        </p>
                        <p className="text-sm text-muted-foreground leading-relaxed" data-testid={`text-changelog-entry-desc-${entry.id}`}>
                          {entry.description}
                        </p>
                        {entry.wikiSlug && (
                          <Link
                            href={`/wiki/${entry.wikiSlug}`}
                            className="inline-flex items-center gap-1 mt-1.5 text-xs text-primary hover:underline font-medium"
                            data-testid={`link-wiki-article-${entry.id}`}
                          >
                            Read more <ArrowRight className="h-3 w-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
