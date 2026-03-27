import { XMLParser } from "fast-xml-parser";

export type NewsArticle = {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  source: string;
  imageUrl: string | null;
};

const cache = new Map<string, { articles: NewsArticle[]; fetchedAt: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  allowBooleanAttributes: true,
  parseTagValue: true,
  trimValues: true,
});

function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
}

function extractImageUrl(item: Record<string, unknown>): string | null {
  const mediaContent = item["media:content"] as Record<string, unknown> | undefined;
  if (mediaContent && mediaContent["@_url"]) {
    return String(mediaContent["@_url"]);
  }
  const enclosure = item["enclosure"] as Record<string, unknown> | undefined;
  if (enclosure && enclosure["@_url"]) {
    return String(enclosure["@_url"]);
  }
  const mediaThumbnail = item["media:thumbnail"] as Record<string, unknown> | undefined;
  if (mediaThumbnail && mediaThumbnail["@_url"]) {
    return String(mediaThumbnail["@_url"]);
  }
  const description = String(item["description"] ?? "");
  const imgMatch = description.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch) return imgMatch[1];
  return null;
}

export async function fetchGoogleNewsRSS(query: string, limit = 10): Promise<NewsArticle[]> {
  const cacheKey = query.toLowerCase().trim();
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.articles.slice(0, limit);
  }

  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SEVCOBot/1.0)",
        "Accept": "application/rss+xml, application/xml, text/xml, */*",
      },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      console.error(`[news] RSS fetch failed: ${response.status} for query "${query}"`);
      return [];
    }

    const xml = await response.text();
    const parsed = parser.parse(xml);
    const channel = parsed?.rss?.channel;
    if (!channel) return [];

    const rawItems = Array.isArray(channel.item) ? channel.item : channel.item ? [channel.item] : [];

    const articles: NewsArticle[] = rawItems.map((item: Record<string, unknown>) => {
      const title = stripHtml(String(item.title ?? ""));
      const link = String(item.link ?? "");
      const description = stripHtml(String(item.description ?? ""));
      const pubDate = String(item.pubDate ?? "");
      const sourceObj = item.source as Record<string, unknown> | undefined;
      const source = sourceObj ? String(sourceObj["#text"] ?? sourceObj["@_url"] ?? "") : "";
      const imageUrl = extractImageUrl(item);
      return { title, link, description, pubDate, source, imageUrl };
    });

    cache.set(cacheKey, { articles, fetchedAt: Date.now() });
    return articles.slice(0, limit);
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      console.error(`[news] RSS fetch timeout for query "${query}"`);
    } else {
      console.error(`[news] RSS fetch error for query "${query}":`, err);
    }
    return [];
  }
}
