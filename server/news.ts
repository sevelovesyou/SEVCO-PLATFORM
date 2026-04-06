import { searchTweets, isXConfigured } from "./x-api";
import { getNewsAiSettings, getApiConfig, generateNewsImage as grokImage } from "./grok-news";

export type NewsArticle = {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  source: string;
  imageUrl: string | null;
  grokSummary?: string;
  aiInsight?: string;
  authorHandle?: string;
  likeCount?: number;
  retweetCount?: number;
  sourceType?: "rss" | "tavily" | "x";
  category?: string;
};

const cache = new Map<string, { articles: NewsArticle[]; fetchedAt: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000;

const grokSummaryCache = new Map<string, { summary: string; cachedAt: number }>();
const GROK_SUMMARY_TTL_MS = 60 * 60 * 1000;

export async function generateGrokSummaryForTweet(tweetText: string, cacheKey: string): Promise<string | null> {
  const cached = grokSummaryCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < GROK_SUMMARY_TTL_MS) return cached.summary;

  const config = getApiConfig();
  if (!config) return null;

  try {
    const res = await fetch(config.apiUrl, {
      method: "POST",
      headers: config.headers,
      body: JSON.stringify({
        model: config.modelName,
        messages: [
          {
            role: "system",
            content: "You are a concise news editor. Write a 1-2 sentence editorial summary of this X post's news angle. Be factual and direct. No quotes, no hashtags.",
          },
          { role: "user", content: tweetText.slice(0, 500) },
        ],
        max_tokens: 100,
        temperature: 0.3,
      }),
    });

    if (!res.ok) return null;

    const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    const summary = data?.choices?.[0]?.message?.content?.trim() ?? null;
    if (summary) grokSummaryCache.set(cacheKey, { summary, cachedAt: Date.now() });
    return summary;
  } catch {
    return null;
  }
}

export async function fetchNewsArticles(query: string, limit = 10): Promise<NewsArticle[]> {
  const cacheKey = `x:${query.toLowerCase().trim()}:${limit}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.articles.slice(0, limit);
  }

  if (!isXConfigured()) {
    return [];
  }

  try {
    const xQuery = `${query} -is:retweet lang:en`;
    const tweets = await searchTweets(xQuery, limit);

    const aiSettings = await getNewsAiSettings().catch(() => null);
    const summariesEnabled = aiSettings?.summariesEnabled ?? false;
    const imagesEnabled = aiSettings?.imagesEnabled ?? false;

    const articles: NewsArticle[] = await Promise.all(
      tweets.map(async (t) => {
        const article: NewsArticle = {
          title: t.text.slice(0, 140),
          link: t.url,
          description: t.text,
          pubDate: t.createdAt,
          source: t.authorName,
          imageUrl: t.mediaUrl,
          authorHandle: t.authorHandle,
          likeCount: t.likeCount,
          retweetCount: t.retweetCount,
          sourceType: "x",
        };

        if (summariesEnabled) {
          const summaryKey = `summary:${t.url}`;
          const summary = await generateGrokSummaryForTweet(t.text, summaryKey).catch(() => null);
          if (summary) article.grokSummary = summary;
        }

        if (imagesEnabled && !article.imageUrl) {
          const imageKey = `img:${t.url}`;
          const imgUrl = await grokImage(t.text.slice(0, 200), imageKey).catch(() => null);
          if (imgUrl) article.imageUrl = imgUrl;
        }

        return article;
      })
    );

    cache.set(cacheKey, { articles, fetchedAt: Date.now() });
    return articles.slice(0, limit);
  } catch (err: unknown) {
    console.error("[news] X API fetch error:", err);
    return [];
  }
}
