import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Link2, Sparkles } from "lucide-react";
import type { Article } from "@shared/schema";
import { articleUrl } from "@/lib/wiki-urls";

interface CrosslinkPanelProps {
  relatedArticles: Array<{
    article: Article;
    relevanceScore: number;
    sharedKeywords: string[] | null;
  }>;
}

export function CrosslinkPanel({ relatedArticles }: CrosslinkPanelProps) {
  if (!relatedArticles || relatedArticles.length === 0) return null;

  return (
    <div className="mt-6 border-t pt-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Related Articles</h3>
        <Badge variant="secondary" className="text-[10px]">Auto-generated</Badge>
      </div>
      <div className="space-y-2">
        {relatedArticles.map(({ article, relevanceScore, sharedKeywords }) => (
          <Link key={article.id} href={articleUrl(article)}>
            <Card className="p-3 hover-elevate active-elevate-2 cursor-pointer overflow-visible">
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link2 className="h-3 w-3 text-primary shrink-0" />
                    <span className="text-sm font-medium truncate" data-testid={`crosslink-title-${article.id}`}>
                      {article.title}
                    </span>
                  </div>
                  {sharedKeywords && sharedKeywords.length > 0 && (
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      {sharedKeywords.slice(0, 4).map((keyword) => (
                        <Badge key={keyword} variant="outline" className="text-[9px]">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${Math.min(relevanceScore * 100, 100)}%` }}
                    />
                  </div>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
