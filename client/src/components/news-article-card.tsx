import { formatDistanceToNow } from "date-fns";
import { BookOpen, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { usePermission } from "@/hooks/use-permission";
import { useState } from "react";
import { WikifyDialog } from "@/components/wikify-dialog";

export type NewsArticle = {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  source: string;
  imageUrl: string | null;
};

const PLACEHOLDER_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200' viewBox='0 0 400 200'%3E%3Crect width='400' height='200' fill='%23374151'/%3E%3Ctext x='200' y='105' text-anchor='middle' fill='%236B7280' font-size='14' font-family='sans-serif'%3ESEVCO News%3C/text%3E%3C/svg%3E";

function formatRelativeTime(pubDate: string): string {
  try {
    const date = new Date(pubDate);
    if (isNaN(date.getTime())) return pubDate;
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return pubDate;
  }
}

type CardVariant = "large" | "medium" | "small" | "compact";

interface NewsArticleCardProps {
  article: NewsArticle;
  variant?: CardVariant;
  accentColor?: string;
  categoryLabel?: string;
}

function WikifyButton({ onClick, testId }: { onClick: () => void; testId?: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClick(); }}
            data-testid={testId ?? "button-wikify"}
          >
            <BookOpen className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">Wikify 💫</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function NewsArticleCard({ article, variant = "medium", accentColor, categoryLabel }: NewsArticleCardProps) {
  const { role } = usePermission();
  const [wikifyOpen, setWikifyOpen] = useState(false);

  const isStaffPlus = role === "admin" || role === "executive" || role === "staff";

  if (variant === "compact") {
    return (
      <>
        <div className="group flex flex-col" data-testid={`card-news-compact-${encodeURIComponent(article.link).slice(0, 30)}`}>
          <a
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-xl border bg-card overflow-hidden hover:shadow-md hover:scale-[1.02] transition-all duration-200"
          >
            <div className="relative aspect-video overflow-hidden">
              <img
                src={article.imageUrl || PLACEHOLDER_IMAGE}
                alt={article.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER_IMAGE; }}
              />
              {(categoryLabel || article.source) && (
                <span
                  className="absolute top-2 left-2 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full truncate max-w-[120px]"
                  style={{ backgroundColor: accentColor ? `${accentColor}dd` : "rgba(0,0,0,0.7)" }}
                >
                  {categoryLabel || article.source}
                </span>
              )}
            </div>
            <div className="p-2.5">
              <p className="text-xs font-serif font-semibold text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                {article.title}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {article.source && <span>{article.source} · </span>}
                {formatRelativeTime(article.pubDate)}
              </p>
            </div>
          </a>
          {isStaffPlus && (
            <div className="mt-1 flex justify-end px-1">
              <WikifyButton onClick={() => setWikifyOpen(true)} testId="button-wikify-compact" />
            </div>
          )}
        </div>
        <WikifyDialog open={wikifyOpen} onClose={() => setWikifyOpen(false)} article={article} />
      </>
    );
  }

  const imageHeightClass = variant === "large" ? "aspect-[16/7]" : variant === "medium" ? "aspect-video" : "aspect-[4/3]";

  return (
    <>
      <div
        data-testid={`card-news-${variant}-${encodeURIComponent(article.link).slice(0, 30)}`}
        className="group relative rounded-xl border bg-card overflow-hidden hover:shadow-lg hover:scale-[1.01] transition-all duration-200 flex flex-col"
      >
        <div className={`relative overflow-hidden ${imageHeightClass}`}>
          <a href={article.link} target="_blank" rel="noopener noreferrer">
            <img
              src={article.imageUrl || PLACEHOLDER_IMAGE}
              alt={article.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER_IMAGE; }}
            />
          </a>
          {(categoryLabel || accentColor) && (
            <span
              className="absolute top-2 left-2 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: accentColor ? `${accentColor}dd` : "rgba(0,0,0,0.7)" }}
            >
              {categoryLabel || article.source}
            </span>
          )}
        </div>

        <div className="p-3 flex flex-col flex-1">
          <a href={article.link} target="_blank" rel="noopener noreferrer" className="flex-1">
            <h3 className={`font-serif font-semibold text-foreground leading-snug group-hover:text-primary transition-colors ${variant === "large" ? "text-base" : variant === "medium" ? "text-sm" : "text-xs"} line-clamp-3`}>
              {article.title}
            </h3>
            {(variant === "large" || variant === "medium") && article.description && (
              <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{article.description}</p>
            )}
          </a>

          <div className="flex items-center justify-between mt-2">
            <span className="text-[11px] text-muted-foreground">
              {article.source && <span>{article.source} · </span>}
              {formatRelativeTime(article.pubDate)}
            </span>
            <div className="flex items-center gap-1">
              {isStaffPlus && (
                <WikifyButton onClick={() => setWikifyOpen(true)} />
              )}
              <a
                href={article.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                data-testid="link-read-more"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
      <WikifyDialog open={wikifyOpen} onClose={() => setWikifyOpen(false)} article={article} />
    </>
  );
}
