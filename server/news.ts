import { XMLParser } from "fast-xml-parser";

export type NewsArticle = {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  source: string;
  imageUrl: string | null;
};

const BLOCKED_SOURCES = new Set([
  "lokmattimes",
  "lokmat",
  "indiaglitz",
  "masala",
  "filmibeat",
  "pinkvilla",
  "dnaindia",
  "india.com",
  "koimoi",
  "bollywoodlife",
  "desimartini",
  "siasat",
  "oneindia",
  "timesnownews",
  "newsbyteshindi",
  "newsbytes",
  "thehindustantimes.in",
  "thestatesman",
  "latestly",
  "boldsky",
  "caravanmagazine",
  "freepressjournal",
  "devdiscourse",
  "republicworld",
  "zee5",
  "zeebiznews",
  "jansatta",
  "punjabkesari",
  "naidunia",
  "patrika",
  "bhaskar",
  "aajtak",
  "ndtv.in",
]);

let _blockedSourcesFromDb: string[] = [];

export function setBlockedSourcesFromDb(sources: string[]) {
  _blockedSourcesFromDb = sources;
}

function isSourceBlocked(source: string): boolean {
  if (!source) return false;
  const lower = source.toLowerCase();
  for (const blocked of BLOCKED_SOURCES) {
    if (lower.includes(blocked)) return true;
  }
  for (const blocked of _blockedSourcesFromDb) {
    if (blocked && lower.includes(blocked.toLowerCase())) return true;
  }
  return false;
}

function filterBlockedSources(articles: NewsArticle[]): NewsArticle[] {
  return articles.filter((a) => !isSourceBlocked(a.source));
}

const cache = new Map<string, { articles: NewsArticle[]; fetchedAt: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000;

const ogImageCache = new Map<string, { url: string | null; fetchedAt: number }>();
const OG_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

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

async function scrapeOgImage(url: string): Promise<string | null> {
  const cached = ogImageCache.get(url);
  if (cached && Date.now() - cached.fetchedAt < OG_CACHE_TTL_MS) {
    return cached.url;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SEVCOBot/1.0; +https://sevco.us)",
        "Accept": "text/html,application/xhtml+xml,*/*",
      },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      ogImageCache.set(url, { url: null, fetchedAt: Date.now() });
      return null;
    }

    const html = await response.text();
    const match = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)
      || html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i);

    const imageUrl = match ? match[1] : null;
    ogImageCache.set(url, { url: imageUrl, fetchedAt: Date.now() });
    return imageUrl;
  } catch {
    ogImageCache.set(url, { url: null, fetchedAt: Date.now() });
    return null;
  }
}

async function enrichWithOgImages(articles: NewsArticle[]): Promise<NewsArticle[]> {
  const needsImage = articles.filter((a) => !a.imageUrl).slice(0, 5);
  if (needsImage.length === 0) return articles;

  const results = await Promise.allSettled(
    needsImage.map((a) => scrapeOgImage(a.link))
  );

  const imageMap = new Map<string, string | null>();
  needsImage.forEach((a, i) => {
    const result = results[i];
    imageMap.set(a.link, result.status === "fulfilled" ? result.value : null);
  });

  return articles.map((a) => {
    if (!a.imageUrl && imageMap.has(a.link)) {
      return { ...a, imageUrl: imageMap.get(a.link) ?? null };
    }
    return a;
  });
}

let _gNewsApiKeyFromDb: string | null = null;
let _gNewsKeyLastFetched = 0;

export function setGNewsApiKeyFromDb(key: string | null) {
  _gNewsApiKeyFromDb = key;
  _gNewsKeyLastFetched = Date.now();
}

function getGNewsApiKey(): string | undefined {
  return process.env.GNEWS_API_KEY || _gNewsApiKeyFromDb || undefined;
}

async function fetchGNewsAPI(query: string, limit: number): Promise<NewsArticle[]> {
  const apiKey = getGNewsApiKey();
  if (!apiKey) return [];

  const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&apikey=${apiKey}&lang=en&max=${Math.min(limit, 10)}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      console.error(`[news] GNews API error: ${response.status}`);
      return [];
    }

    const data = await response.json() as {
      articles?: Array<{
        title: string;
        url: string;
        description: string;
        publishedAt: string;
        source: { name: string; url: string };
        image: string | null;
      }>;
    };

    return (data.articles ?? []).map((item) => ({
      title: item.title ?? "",
      link: item.url ?? "",
      description: item.description ?? "",
      pubDate: item.publishedAt ?? "",
      source: item.source?.name ?? "",
      imageUrl: item.image ?? null,
    }));
  } catch (err: unknown) {
    console.error("[news] GNews API fetch error:", err);
    return [];
  }
}

export async function fetchNewsArticles(query: string, limit = 10): Promise<NewsArticle[]> {
  const apiKey = getGNewsApiKey();
  if (apiKey) {
    const cacheKey = `gnews:${query.toLowerCase().trim()}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      return filterBlockedSources(cached.articles).slice(0, limit);
    }
    const articles = await fetchGNewsAPI(query, limit * 2);
    if (articles.length > 0) {
      cache.set(cacheKey, { articles, fetchedAt: Date.now() });
      return filterBlockedSources(articles).slice(0, limit);
    }
  }
  return fetchGoogleNewsRSS(query, limit);
}

export async function fetchGoogleNewsRSS(query: string, limit = 10): Promise<NewsArticle[]> {
  const cacheKey = query.toLowerCase().trim();
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return filterBlockedSources(cached.articles).slice(0, limit);
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

    const rawArticles: NewsArticle[] = rawItems.map((item: Record<string, unknown>) => {
      const title = stripHtml(String(item.title ?? ""));
      const link = String(item.link ?? "");
      const description = stripHtml(String(item.description ?? ""));
      const pubDate = String(item.pubDate ?? "");
      const sourceObj = item.source as Record<string, unknown> | undefined;
      const source = sourceObj ? String(sourceObj["#text"] ?? sourceObj["@_url"] ?? "") : "";
      const imageUrl = extractImageUrl(item);
      return { title, link, description, pubDate, source, imageUrl };
    });

    const articles = await enrichWithOgImages(rawArticles);

    cache.set(cacheKey, { articles, fetchedAt: Date.now() });
    return filterBlockedSources(articles).slice(0, limit);
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      console.error(`[news] RSS fetch timeout for query "${query}"`);
    } else {
      console.error(`[news] RSS fetch error for query "${query}":`, err);
    }
    return [];
  }
}
