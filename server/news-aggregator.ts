import { XMLParser } from "fast-xml-parser";
import { db } from "./db";
import { newsItems } from "@shared/schema";
import { lt } from "drizzle-orm";
import { storage } from "./storage";

const RSS_FEEDS_BY_KEYWORD: Record<string, string[]> = {
  tech:          ["https://techcrunch.com/feed/", "https://www.theverge.com/rss/index.xml", "https://www.wired.com/feed/rss", "https://feeds.arstechnica.com/arstechnica/index", "https://feeds.bbci.co.uk/news/technology/rss.xml", "https://www.theguardian.com/technology/rss"],
  world:         ["https://feeds.reuters.com/reuters/topNews", "https://feeds.bbci.co.uk/news/world/rss.xml", "http://rss.cnn.com/rss/cnn_topstories.rss", "https://feeds.npr.org/1001/rss.xml", "https://www.theguardian.com/world/rss"],
  business:      ["https://feeds.reuters.com/reuters/businessNews", "https://feeds.bbci.co.uk/news/business/rss.xml", "https://feeds.npr.org/1006/rss.xml"],
  science:       ["https://feeds.arstechnica.com/arstechnica/science", "https://www.theguardian.com/science/rss", "https://feeds.npr.org/1007/rss.xml"],
  politics:      ["https://feeds.npr.org/1014/rss.xml", "https://www.theguardian.com/politics/rss", "https://rss.nytimes.com/services/xml/rss/nyt/Politics.xml"],
  entertainment: ["https://deadline.com/feed/", "https://www.theguardian.com/culture/rss"],
  sports:        ["https://feeds.bbci.co.uk/sport/rss.xml", "https://www.theguardian.com/sport/rss"],
  music:         ["https://www.theguardian.com/music/rss", "https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml"],
  general:       ["https://feeds.reuters.com/reuters/topNews", "https://feeds.bbci.co.uk/news/rss.xml", "http://rss.cnn.com/rss/cnn_topstories.rss", "https://feeds.npr.org/1001/rss.xml", "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml"],
};

function getFeedsForQuery(query: string): string[] {
  const q = query.toLowerCase();
  const selected = new Set<string>();
  for (const [kw, urls] of Object.entries(RSS_FEEDS_BY_KEYWORD)) {
    if (q.includes(kw)) urls.forEach(u => selected.add(u));
  }
  if (selected.size === 0) {
    RSS_FEEDS_BY_KEYWORD.general.forEach(u => selected.add(u));
  }
  return [...selected].slice(0, 4);
}

const xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

interface ParsedArticle {
  title: string;
  link: string;
  description: string | null;
  pubDate: Date | null;
  source: string;
  imageUrl: string | null;
  sourceType: "rss" | "tavily";
}

function toText(val: unknown): string {
  if (val == null) return "";
  if (typeof val === "string") return val;
  if (typeof val === "number") return String(val);
  if (typeof val === "object") {
    const obj = val as Record<string, unknown>;
    if ("#text" in obj) return String(obj["#text"]);
    if ("_" in obj) return String(obj["_"]);
  }
  return "";
}

function stripHtml(str: string): string {
  return str
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function extractImage(item: any): string | null {
  const mc = item["media:content"];
  if (mc?.["@_url"] && mc?.["@_medium"] === "image") return mc["@_url"];
  if (Array.isArray(mc)) {
    const img = mc.find((m: any) => m["@_medium"] === "image" || m["@_type"]?.startsWith("image"));
    if (img?.["@_url"]) return img["@_url"];
  }
  const mt = item["media:thumbnail"];
  if (mt?.["@_url"]) return mt["@_url"];
  const enc = item.enclosure;
  if (enc?.["@_type"]?.startsWith("image")) return enc["@_url"];
  const htmlDesc = item.description ?? item["content:encoded"] ?? "";
  const imgMatch = typeof htmlDesc === "string" ? htmlDesc.match(/<img[^>]+src="([^"]+)"/) : null;
  if (imgMatch) return imgMatch[1];
  return null;
}

function parseRssItems(xml: string, sourceName: string): ParsedArticle[] {
  try {
    const parsed = xmlParser.parse(xml);
    const channel = parsed?.rss?.channel || parsed?.feed;
    if (!channel) return [];
    const rawItems = channel?.item ?? channel?.entry ?? [];
    const items = Array.isArray(rawItems) ? rawItems : [rawItems];

    return items.slice(0, 15).map((item: any) => {
      const title = stripHtml(toText(item.title));
      const linkRaw = item.link;
      const link = typeof linkRaw === "object"
        ? (linkRaw?.["@_href"] ?? toText(item.guid) ?? "")
        : (linkRaw ?? toText(item.guid) ?? "");
      const description = stripHtml(
        toText(item.description) || toText(item.summary) || toText(item["content:encoded"])
      ).slice(0, 500);
      const pubDateRaw = item.pubDate ?? item.published ?? item.updated ?? null;
      const pubDate = pubDateRaw ? new Date(String(pubDateRaw)) : null;
      const imageUrl = extractImage(item);
      return { title, link: String(link), description: description || null, pubDate, source: sourceName, imageUrl, sourceType: "rss" as const };
    }).filter(a => a.title && a.link && !a.title.includes("[object Object]"));
  } catch {
    return [];
  }
}

let tavilyCallsToday = 0;
let tavilyLastResetDate = "";

async function fetchTavilyArticles(query: string): Promise<ParsedArticle[]> {
  if (!process.env.TAVILY_API_KEY) return [];
  const today = new Date().toISOString().slice(0, 10);
  if (tavilyLastResetDate !== today) { tavilyCallsToday = 0; tavilyLastResetDate = today; }
  if (tavilyCallsToday >= 3) return [];
  tavilyCallsToday++;

  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query,
        search_depth: "basic",
        max_results: 10,
        include_images: true,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const data: any = await res.json();
    return (data.results ?? []).map((r: any) => {
      let hostname = r.url ?? "";
      try { hostname = new URL(r.url).hostname.replace("www.", ""); } catch {}
      return {
        title: r.title ?? "",
        link: r.url ?? "",
        description: r.content?.slice(0, 500) ?? null,
        pubDate: r.published_date ? new Date(r.published_date) : null,
        source: hostname,
        imageUrl: r.image ?? null,
        sourceType: "tavily" as const,
      };
    }).filter((a: ParsedArticle) => a.title && a.link);
  } catch {
    return [];
  }
}

const REFRESH_INTERVAL_MS = 18 * 60 * 1000;
const ARTICLE_TTL_HOURS = 6;

async function refreshNewsCache(): Promise<void> {
  console.log("[news-aggregator] Starting refresh…");
  try {
    const categories = await storage.getNewsCategories(true);
    if (categories.length === 0) {
      console.log("[news-aggregator] No enabled categories, skipping.");
      return;
    }

    await db.delete(newsItems).where(
      lt(newsItems.fetchedAt, new Date(Date.now() - ARTICLE_TTL_HOURS * 60 * 60 * 1000))
    );

    const tavilyCategories = categories.slice(0, 3);

    for (const cat of categories) {
      const feedUrls = getFeedsForQuery(cat.query);
      const allArticles: ParsedArticle[] = [];

      await Promise.allSettled(feedUrls.map(async (url) => {
        try {
          const res = await fetch(url, {
            signal: AbortSignal.timeout(8000),
            headers: { "User-Agent": "News Aggregator/1.0" },
          });
          if (!res.ok) return;
          const xml = await res.text();
          let hostname = url;
          try { hostname = new URL(url).hostname.replace("www.", ""); } catch {}
          allArticles.push(...parseRssItems(xml, hostname));
        } catch { }
      }));

      if (tavilyCategories.some(c => c.id === cat.id)) {
        const tavilyArticles = await fetchTavilyArticles(cat.query).catch(() => []);
        allArticles.push(...tavilyArticles);
      }

      const seen = new Set<string>();
      const unique = allArticles.filter(a => {
        if (!a.link || seen.has(a.link)) return false;
        seen.add(a.link);
        return true;
      });

      let inserted = 0;
      const batch = unique.slice(0, 40);
      for (const article of batch) {
        const now = new Date();
        const ok = await db.insert(newsItems).values({
          title: article.title,
          link: article.link,
          description: article.description ?? null,
          pubDate: article.pubDate,
          source: article.source,
          imageUrl: article.imageUrl ?? null,
          categoryId: cat.id,
          categoryQuery: cat.query,
          sourceType: article.sourceType,
          fetchedAt: now,
        }).onConflictDoUpdate({
          target: newsItems.link,
          set: {
            title: article.title,
            description: article.description ?? null,
            pubDate: article.pubDate,
            source: article.source,
            imageUrl: article.imageUrl ?? null,
            categoryId: cat.id,
            categoryQuery: cat.query,
            sourceType: article.sourceType,
            fetchedAt: now,
          },
        }).catch(() => null);
        if (ok) inserted++;
      }
      const rssCount = batch.filter(a => a.sourceType === "rss").length;
      const tavilyCount = batch.filter(a => a.sourceType === "tavily").length;
      console.log(`[news-aggregator] "${cat.name}" — ${inserted} upserted (${rssCount} rss, ${tavilyCount} tavily) from ${feedUrls.length} feeds`);
    }
    console.log("[news-aggregator] Refresh complete.");
  } catch (err) {
    console.error("[news-aggregator] Refresh failed:", err);
  }
}

export function startNewsAggregator(): void {
  refreshNewsCache().catch(e => console.error("[news-aggregator] Initial refresh error:", e));
  setInterval(
    () => refreshNewsCache().catch(e => console.error("[news-aggregator] Refresh error:", e)),
    REFRESH_INTERVAL_MS
  );
}
