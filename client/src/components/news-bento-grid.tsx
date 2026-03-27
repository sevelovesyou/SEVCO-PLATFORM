import { NewsArticleCard, type NewsArticle } from "@/components/news-article-card";

interface NewsBentoGridProps {
  articles: NewsArticle[];
  accentColor?: string;
  categoryLabel?: string;
}

export function NewsBentoGrid({ articles, accentColor, categoryLabel }: NewsBentoGridProps) {
  if (!articles.length) return null;

  const [card1, card2, card3, card4, card5, card6, card7, card8] = articles;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-auto" data-testid="news-bento-grid">
      {/* Hero card — col-span-2, row-span-2 */}
      {card1 && (
        <div className="md:col-span-2 md:row-span-2 lg:col-span-2 lg:row-span-2">
          <div className="h-full">
            <NewsArticleCard article={card1} variant="large" accentColor={accentColor} categoryLabel={categoryLabel} />
          </div>
        </div>
      )}

      {/* Top right column: cards 2 & 3 stacked */}
      {card2 && (
        <div className="md:col-span-1 lg:col-span-1">
          <NewsArticleCard article={card2} variant="medium" accentColor={accentColor} categoryLabel={categoryLabel} />
        </div>
      )}
      {card3 && (
        <div className="md:col-span-1 lg:col-span-1">
          <NewsArticleCard article={card3} variant="medium" accentColor={accentColor} categoryLabel={categoryLabel} />
        </div>
      )}

      {/* Bottom row: cards 4, 5, 6 — under the hero */}
      {card4 && (
        <div className="md:col-span-1 lg:col-span-1">
          <NewsArticleCard article={card4} variant="small" accentColor={accentColor} categoryLabel={categoryLabel} />
        </div>
      )}
      {card5 && (
        <div className="md:col-span-1 lg:col-span-1">
          <NewsArticleCard article={card5} variant="small" accentColor={accentColor} categoryLabel={categoryLabel} />
        </div>
      )}

      {/* 4-col layout: cards 7 & 8 span the right col beneath cards 2+3 */}
      {card6 && (
        <div className="md:col-span-1 lg:col-span-1">
          <NewsArticleCard article={card6} variant="small" accentColor={accentColor} categoryLabel={categoryLabel} />
        </div>
      )}
      {card7 && (
        <div className="md:col-span-1 lg:col-span-1">
          <NewsArticleCard article={card7} variant="small" accentColor={accentColor} categoryLabel={categoryLabel} />
        </div>
      )}
      {card8 && (
        <div className="md:col-span-1 lg:col-span-1">
          <NewsArticleCard article={card8} variant="small" accentColor={accentColor} categoryLabel={categoryLabel} />
        </div>
      )}
    </div>
  );
}
