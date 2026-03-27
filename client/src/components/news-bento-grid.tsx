import { NewsArticleCard, type NewsArticle } from "@/components/news-article-card";

interface NewsBentoGridProps {
  articles: NewsArticle[];
  accentColor?: string;
}

export function NewsBentoGrid({ articles, accentColor }: NewsBentoGridProps) {
  if (!articles.length) return null;

  const [large, med1, small1, small2, med2, ...rest] = articles;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4" data-testid="news-bento-grid">
      {/* Large card — col-span-2 */}
      {large && (
        <div className="md:col-span-2 lg:col-span-2">
          <NewsArticleCard article={large} variant="large" accentColor={accentColor} />
        </div>
      )}

      {/* Right column */}
      <div className="md:col-span-1 lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Medium 1 */}
        {med1 && (
          <div className="md:col-span-1">
            <NewsArticleCard article={med1} variant="medium" accentColor={accentColor} />
          </div>
        )}

        {/* Small cards stacked */}
        <div className="flex flex-col gap-4">
          {small1 && <NewsArticleCard article={small1} variant="small" accentColor={accentColor} />}
          {small2 && <NewsArticleCard article={small2} variant="small" accentColor={accentColor} />}
        </div>

        {/* Medium 2 — spans full width of right column bottom */}
        {med2 && (
          <div className="md:col-span-2">
            <NewsArticleCard article={med2} variant="medium" accentColor={accentColor} />
          </div>
        )}
      </div>

      {/* Extra articles as small cards if any */}
      {rest.slice(0, 2).map((article) => (
        <div key={article.link} className="md:col-span-1 lg:col-span-1">
          <NewsArticleCard article={article} variant="small" accentColor={accentColor} />
        </div>
      ))}
    </div>
  );
}
