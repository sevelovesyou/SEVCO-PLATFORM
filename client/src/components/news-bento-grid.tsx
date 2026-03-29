import { NewsArticleCard, type NewsArticle } from "@/components/news-article-card";

interface NewsBentoGridProps {
  articles: NewsArticle[];
  accentColor?: string;
  categoryLabel?: string;
  onArticleClick?: (article: NewsArticle) => void;
}

export function NewsBentoGrid({ articles, accentColor, categoryLabel, onArticleClick }: NewsBentoGridProps) {
  if (!articles.length) return null;

  const [card1, card2, card3, card4, card5, card6, card7, card8] = articles;

  const cardClick = (article: NewsArticle) => onArticleClick ? () => onArticleClick(article) : undefined;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-auto" data-testid="news-bento-grid">
      {card1 && (
        <div className="md:col-span-2 md:row-span-2 lg:col-span-2 lg:row-span-2">
          <div className="h-full">
            <NewsArticleCard article={card1} variant="large" accentColor={accentColor} categoryLabel={categoryLabel} onCardClick={cardClick(card1)} />
          </div>
        </div>
      )}

      {card2 && (
        <div className="md:col-span-1 lg:col-span-1">
          <NewsArticleCard article={card2} variant="medium" accentColor={accentColor} categoryLabel={categoryLabel} onCardClick={cardClick(card2)} />
        </div>
      )}
      {card3 && (
        <div className="md:col-span-1 lg:col-span-1">
          <NewsArticleCard article={card3} variant="medium" accentColor={accentColor} categoryLabel={categoryLabel} onCardClick={cardClick(card3)} />
        </div>
      )}

      {card4 && (
        <div className="md:col-span-1 lg:col-span-1">
          <NewsArticleCard article={card4} variant="small" accentColor={accentColor} categoryLabel={categoryLabel} onCardClick={cardClick(card4)} />
        </div>
      )}
      {card5 && (
        <div className="md:col-span-1 lg:col-span-1">
          <NewsArticleCard article={card5} variant="small" accentColor={accentColor} categoryLabel={categoryLabel} onCardClick={cardClick(card5)} />
        </div>
      )}

      {card6 && (
        <div className="md:col-span-1 lg:col-span-1">
          <NewsArticleCard article={card6} variant="small" accentColor={accentColor} categoryLabel={categoryLabel} onCardClick={cardClick(card6)} />
        </div>
      )}
      {card7 && (
        <div className="md:col-span-1 lg:col-span-1">
          <NewsArticleCard article={card7} variant="small" accentColor={accentColor} categoryLabel={categoryLabel} onCardClick={cardClick(card7)} />
        </div>
      )}
      {card8 && (
        <div className="md:col-span-1 lg:col-span-1">
          <NewsArticleCard article={card8} variant="small" accentColor={accentColor} categoryLabel={categoryLabel} onCardClick={cardClick(card8)} />
        </div>
      )}
    </div>
  );
}
