import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Archive, FileText, RotateCcw } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type { Article } from "@shared/schema";

export default function WikiArchivePage() {
  const { toast } = useToast();

  const { data: archivedArticles, isLoading } = useQuery<Article[]>({
    queryKey: ["/api/articles/archived"],
  });

  const unarchiveMutation = useMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/articles/${id}/unarchive`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/articles"] });
      toast({ title: "Article unarchived" });
    },
    onError: () => {
      toast({ title: "Failed to unarchive article", variant: "destructive" });
    },
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Archive className="h-6 w-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-archive-title">Archived Articles</h1>
          <p className="text-sm text-muted-foreground">Articles that have been archived and are no longer active</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-4 border rounded-lg">
              <Skeleton className="h-4 w-4 shrink-0" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-8 w-24" />
            </div>
          ))}
        </div>
      ) : !archivedArticles || archivedArticles.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground" data-testid="text-no-archived">
          <Archive className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No archived articles found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {archivedArticles.map((article) => (
            <div
              key={article.id}
              className="flex items-center gap-3 p-4 border rounded-lg hover:bg-muted/40 transition-colors group"
              data-testid={`card-archived-article-${article.id}`}
            >
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <Link
                href={`/wiki/${article.slug}`}
                className="flex-1 min-w-0"
                data-testid={`link-archived-article-${article.slug}`}
              >
                <p className="text-sm font-medium truncate hover:underline">{article.title}</p>
                {article.excerpt && (
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{article.excerpt}</p>
                )}
              </Link>
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 gap-1.5 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => unarchiveMutation.mutate(article.id)}
                disabled={unarchiveMutation.isPending}
                data-testid={`button-unarchive-article-${article.id}`}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Unarchive
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
