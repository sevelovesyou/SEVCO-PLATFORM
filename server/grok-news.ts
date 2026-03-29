import { storage } from "./storage";
import type { Response as ExpressResponse } from "express";

interface ChatCompletionResponse {
  choices: Array<{
    message: { content: string; role: string };
    delta?: { content?: string };
  }>;
  citations?: Array<{ url: string; title?: string; snippet?: string }>;
}

interface StreamChunk {
  choices: Array<{
    delta: { content?: string };
  }>;
}

interface ImageGenerationResponse {
  data: Array<{ url: string }>;
}

export interface GrokNewsSettings {
  summariesEnabled: boolean;
  imagesEnabled: boolean;
  chatEnabled: boolean;
  briefingEnabled: boolean;
  searchEnabled: boolean;
  trendingEnabled: boolean;
}

const DEFAULT_SETTINGS: GrokNewsSettings = {
  summariesEnabled: false,
  imagesEnabled: false,
  chatEnabled: false,
  briefingEnabled: false,
  searchEnabled: false,
  trendingEnabled: false,
};

export async function getNewsAiSettings(): Promise<GrokNewsSettings> {
  try {
    const settings = await storage.getPlatformSettings();
    return {
      summariesEnabled: settings["news.ai.summariesEnabled"] === "true",
      imagesEnabled: settings["news.ai.imageGenEnabled"] === "true",
      chatEnabled: settings["news.ai.askGrokEnabled"] === "true",
      briefingEnabled: settings["news.ai.dailyBriefingEnabled"] === "true",
      searchEnabled: settings["news.ai.searchEnabled"] === "true",
      trendingEnabled: settings["news.ai.trendingEnabled"] === "true",
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function getMaxRequestsPerHour(): Promise<number> {
  try {
    const settings = await storage.getPlatformSettings();
    return parseInt(settings["news.ai.maxRequestsPerHour"] || "60") || 60;
  } catch {
    return 60;
  }
}

export function getApiConfig(): { apiUrl: string; apiKey: string; modelName: string; headers: Record<string, string> } | null {
  if (process.env.XAI_API_KEY) {
    return {
      apiUrl: "https://api.x.ai/v1/chat/completions",
      apiKey: process.env.XAI_API_KEY,
      modelName: "grok-3-mini",
      headers: {
        "Authorization": `Bearer ${process.env.XAI_API_KEY}`,
        "Content-Type": "application/json",
      },
    };
  }
  if (process.env.OPENROUTER_API_KEY) {
    return {
      apiUrl: "https://openrouter.ai/api/v1/chat/completions",
      apiKey: process.env.OPENROUTER_API_KEY,
      modelName: "x-ai/grok-3-mini",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://sevco.us",
        "X-Title": "SEVCO Platform",
      },
    };
  }
  return null;
}

function isPrivateIp(ip: string): boolean {
  if (ip.startsWith("127.") || ip === "0.0.0.0" || ip === "::1" || ip === "::") return true;
  if (ip.startsWith("10.")) return true;
  if (ip.startsWith("192.168.")) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return true;
  if (ip.startsWith("169.254.")) return true;
  if (ip.startsWith("fc") || ip.startsWith("fd")) return true;
  if (ip.toLowerCase().startsWith("fe80")) return true;
  if (ip.startsWith("100.") && /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(ip)) return true;
  if (ip === "0:0:0:0:0:0:0:1" || ip === "0:0:0:0:0:0:0:0") return true;
  return false;
}

async function isUrlSafe(url: string): Promise<boolean> {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    if (hostname === "localhost" || hostname.endsWith(".local") || hostname.endsWith(".internal")) return false;
    if (isPrivateIp(hostname)) return false;

    const dns = await import("dns");
    const { resolve4, resolve6 } = dns.promises;
    try {
      const ipv4s = await resolve4(hostname).catch(() => [] as string[]);
      const ipv6s = await resolve6(hostname).catch(() => [] as string[]);
      const allIps = [...ipv4s, ...ipv6s];
      if (allIps.length === 0) return true;
      for (const ip of allIps) {
        if (isPrivateIp(ip)) return false;
      }
    } catch {}
    return true;
  } catch {
    return false;
  }
}

async function fetchArticleText(url: string): Promise<string> {
  if (!(await isUrlSafe(url))) return "";
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const pageRes = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "SEVCO-News-Bot/1.0" },
      redirect: "follow",
    });
    clearTimeout(timeout);
    if (!pageRes.ok) return "";
    const finalUrl = pageRes.url;
    if (!(await isUrlSafe(finalUrl))) return "";
    const html = await pageRes.text();
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 4000);
  } catch {
    return "";
  }
}

interface SummaryCacheEntry { summary: string; keyInsights: string[]; category: string }
const summaryCache = new Map<string, { result: SummaryCacheEntry; cachedAt: number }>();
const SUMMARY_CACHE_TTL = 60 * 60 * 1000;

export async function summarizeArticle(articleUrl: string, articleTitle: string): Promise<{
  summary: string;
  keyInsights: string[];
  category: string;
}> {
  const settings = await getNewsAiSettings();
  if (!settings.summariesEnabled) throw new Error("AI summaries are disabled");

  const cached = summaryCache.get(articleUrl);
  if (cached && Date.now() - cached.cachedAt < SUMMARY_CACHE_TTL) return cached.result;

  const config = getApiConfig();
  if (!config) throw new Error("AI service not configured");

  const articleText = await fetchArticleText(articleUrl);
  const contextText = articleText || articleTitle;

  const res = await fetch(config.apiUrl, {
    method: "POST",
    headers: config.headers,
    body: JSON.stringify({
      model: config.modelName,
      messages: [
        {
          role: "system",
          content: "You are a news analyst. Respond ONLY with valid JSON, no markdown fences.",
        },
        {
          role: "user",
          content: `Analyze this article and respond with JSON: {"summary": "3-4 sentence deep summary", "keyInsights": ["insight 1", "insight 2", "insight 3", "insight 4"], "category": "one word category"}\n\nTitle: ${articleTitle}\n\nContent: ${contextText}`,
        },
      ],
      max_tokens: 500,
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`AI error: ${errText.slice(0, 200)}`);
  }

  const data = await res.json() as ChatCompletionResponse;
  const content = data?.choices?.[0]?.message?.content?.trim() ?? "";

  try {
    const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned) as { summary?: string; keyInsights?: string[]; category?: string };
    const result = {
      summary: parsed.summary || "",
      keyInsights: Array.isArray(parsed.keyInsights) ? parsed.keyInsights : [],
      category: parsed.category || "General",
    };
    summaryCache.set(articleUrl, { result, cachedAt: Date.now() });
    return result;
  } catch {
    const result = { summary: content, keyInsights: [] as string[], category: "General" };
    summaryCache.set(articleUrl, { result, cachedAt: Date.now() });
    return result;
  }
}

export async function streamSummarizeArticle(articleUrl: string, articleTitle: string, res: ExpressResponse): Promise<void> {
  const settings = await getNewsAiSettings();
  if (!settings.summariesEnabled) {
    res.write(`data: ${JSON.stringify({ error: "AI summaries are disabled" })}\n\n`);
    res.end();
    return;
  }

  const cached = summaryCache.get(articleUrl);
  if (cached && Date.now() - cached.cachedAt < SUMMARY_CACHE_TTL) {
    res.write(`data: ${JSON.stringify({ type: "complete", ...cached.result })}\n\n`);
    res.end();
    return;
  }

  const config = getApiConfig();
  if (!config) {
    res.write(`data: ${JSON.stringify({ error: "AI service not configured" })}\n\n`);
    res.end();
    return;
  }

  const articleText = await fetchArticleText(articleUrl);
  const contextText = articleText || articleTitle;

  const apiRes = await fetch(config.apiUrl, {
    method: "POST",
    headers: config.headers,
    body: JSON.stringify({
      model: config.modelName,
      messages: [
        { role: "system", content: "You are a news analyst. Respond ONLY with valid JSON, no markdown fences." },
        { role: "user", content: `Analyze this article and respond with JSON: {"summary": "3-4 sentence deep summary", "keyInsights": ["insight 1", "insight 2", "insight 3", "insight 4"], "category": "one word category"}\n\nTitle: ${articleTitle}\n\nContent: ${contextText}` },
      ],
      max_tokens: 500,
      temperature: 0.3,
      stream: true,
    }),
  });

  if (!apiRes.ok || !apiRes.body) {
    res.write(`data: ${JSON.stringify({ error: "AI request failed" })}\n\n`);
    res.end();
    return;
  }

  let fullContent = "";
  const reader = apiRes.body.getReader();
  const decoder = new TextDecoder();
  let sseBuffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      sseBuffer += decoder.decode(value, { stream: true });
      const frameEnd = sseBuffer.lastIndexOf("\n\n");
      if (frameEnd === -1) continue;

      const complete = sseBuffer.slice(0, frameEnd);
      sseBuffer = sseBuffer.slice(frameEnd + 2);

      const lines = complete.split("\n").filter((l) => l.startsWith("data: "));

      for (const line of lines) {
        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const delta = parsed?.choices?.[0]?.delta?.content ?? "";
          if (delta) {
            fullContent += delta;
            res.write(`data: ${JSON.stringify({ type: "chunk", content: delta })}\n\n`);
          }
        } catch (parseErr) {
          console.warn("[grok-news] SSE chunk parse error:", parseErr);
        }
      }
    }
  } catch (streamErr) {
    console.error("[grok-news] Stream read error during summarize:", streamErr);
    res.write(`data: ${JSON.stringify({ error: "Stream interrupted" })}\n\n`);
  }

  try {
    const cleaned = fullContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);
    const result = {
      summary: parsed.summary || "",
      keyInsights: Array.isArray(parsed.keyInsights) ? parsed.keyInsights : [],
      category: parsed.category || "General",
    };
    summaryCache.set(articleUrl, { result, cachedAt: Date.now() });
    res.write(`data: ${JSON.stringify({ type: "complete", ...result })}\n\n`);
  } catch {
    res.write(`data: ${JSON.stringify({ type: "complete", summary: fullContent, keyInsights: [], category: "General" })}\n\n`);
  }
  res.end();
}

export async function streamAskGrok(articleTitle: string, articleUrl: string, question: string, res: ExpressResponse): Promise<void> {
  const settings = await getNewsAiSettings();
  if (!settings.chatEnabled) {
    res.write(`data: ${JSON.stringify({ error: "AI chat is disabled" })}\n\n`);
    res.end();
    return;
  }

  const config = getApiConfig();
  if (!config) {
    res.write(`data: ${JSON.stringify({ error: "AI service not configured" })}\n\n`);
    res.end();
    return;
  }

  const articleText = await fetchArticleText(articleUrl);

  const apiRes = await fetch(config.apiUrl, {
    method: "POST",
    headers: config.headers,
    body: JSON.stringify({
      model: config.modelName,
      messages: [
        { role: "system", content: "You are Grok, an AI news analyst for SEVCO. Answer questions about articles concisely and informatively. Use markdown for formatting." },
        { role: "user", content: `Article: "${articleTitle}"\nURL: ${articleUrl}\n${articleText ? `Content: ${articleText}\n` : ""}\nQuestion: ${question}` },
      ],
      max_tokens: 600,
      temperature: 0.5,
      stream: true,
    }),
  });

  if (!apiRes.ok || !apiRes.body) {
    res.write(`data: ${JSON.stringify({ error: "AI request failed" })}\n\n`);
    res.end();
    return;
  }

  const reader = apiRes.body.getReader();
  const decoder = new TextDecoder();
  let fullContent = "";
  let sseBuffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      sseBuffer += decoder.decode(value, { stream: true });
      const frameEnd = sseBuffer.lastIndexOf("\n\n");
      if (frameEnd === -1) continue;

      const complete = sseBuffer.slice(0, frameEnd);
      sseBuffer = sseBuffer.slice(frameEnd + 2);

      const lines = complete.split("\n").filter((l) => l.startsWith("data: "));

      for (const line of lines) {
        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const delta = parsed?.choices?.[0]?.delta?.content ?? "";
          if (delta) {
            fullContent += delta;
            res.write(`data: ${JSON.stringify({ type: "chunk", content: delta })}\n\n`);
          }
        } catch (parseErr) {
          console.warn("[grok-news] SSE chunk parse error in ask:", parseErr);
        }
      }
    }
  } catch (streamErr) {
    console.error("[grok-news] Stream read error during ask:", streamErr);
    res.write(`data: ${JSON.stringify({ error: "Stream interrupted" })}\n\n`);
  }

  res.write(`data: ${JSON.stringify({ type: "done", fullContent })}\n\n`);
  res.end();
}

const imageCache = new Map<string, { url: string; cachedAt: number }>();
const IMAGE_CACHE_TTL = 6 * 60 * 60 * 1000;

export async function generateNewsImage(prompt: string, cacheKey: string): Promise<string | null> {
  const settings = await getNewsAiSettings();
  if (!settings.imagesEnabled) return null;

  const cached = imageCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < IMAGE_CACHE_TTL) return cached.url;

  const imagePrompt = `Professional editorial news illustration: ${prompt.slice(0, 300)}. Photorealistic, high quality, dramatic lighting.`;

  if (process.env.XAI_API_KEY) {
    try {
      const res = await fetch("https://api.x.ai/v1/images/generations", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.XAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "grok-2-image-1212",
          prompt: imagePrompt,
          n: 1,
          response_format: "url",
        }),
      });
      if (res.ok) {
        const data = await res.json() as ImageGenerationResponse;
        const url = data?.data?.[0]?.url;
        if (url) {
          imageCache.set(cacheKey, { url, cachedAt: Date.now() });
          return url;
        }
      }
    } catch {}
  }

  if (process.env.OPENROUTER_API_KEY) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/images/generations", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "black-forest-labs/FLUX-1-schnell:free",
          prompt: imagePrompt,
          n: 1,
        }),
      });
      if (res.ok) {
        const data = await res.json() as ImageGenerationResponse;
        const url = data?.data?.[0]?.url;
        if (url) {
          imageCache.set(cacheKey, { url, cachedAt: Date.now() });
          return url;
        }
      }
    } catch {}
  }

  return null;
}

export async function askGrokAboutArticle(
  articleTitle: string,
  articleUrl: string,
  question: string
): Promise<string> {
  const settings = await getNewsAiSettings();
  if (!settings.chatEnabled) throw new Error("AI chat is disabled");

  const config = getApiConfig();
  if (!config) throw new Error("AI service not configured");

  const articleText = await fetchArticleText(articleUrl);

  const res = await fetch(config.apiUrl, {
    method: "POST",
    headers: config.headers,
    body: JSON.stringify({
      model: config.modelName,
      messages: [
        {
          role: "system",
          content: "You are Grok, an AI news analyst for SEVCO. Answer questions about articles concisely and informatively. Use markdown for formatting.",
        },
        {
          role: "user",
          content: `Article: "${articleTitle}"\nURL: ${articleUrl}\n${articleText ? `Content: ${articleText}\n` : ""}\nQuestion: ${question}`,
        },
      ],
      max_tokens: 600,
      temperature: 0.5,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`AI error: ${errText.slice(0, 200)}`);
  }

  const data = await res.json() as ChatCompletionResponse;
  return data?.choices?.[0]?.message?.content?.trim() ?? "I couldn't generate a response.";
}

export interface GrokSearchResult {
  interpretation: string;
  suggestedQueries: string[];
  liveResults: Array<{ title: string; url: string; snippet: string }>;
}

export async function searchNewsWithGrok(query: string): Promise<GrokSearchResult> {
  const settings = await getNewsAiSettings();
  if (!settings.searchEnabled) throw new Error("AI search is disabled");

  const config = getApiConfig();
  if (!config) throw new Error("AI service not configured");

  if (process.env.XAI_API_KEY) {
    try {
      const searchRes = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.XAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "grok-3-mini",
          messages: [
            {
              role: "system",
              content: "You are a news search assistant. Find and analyze the latest news related to the user's query. Provide a brief interpretation and key findings. Respond ONLY with valid JSON, no markdown fences: {\"interpretation\": \"what the user is looking for\", \"suggestedQueries\": [\"term1\", \"term2\"], \"findings\": [{\"title\": \"headline\", \"snippet\": \"brief description\"}]}",
            },
            { role: "user", content: query },
          ],
          max_tokens: 800,
          temperature: 0.3,
          search_parameters: {
            mode: "auto",
            max_search_results: 10,
            sources: [
              { type: "web" },
              { type: "x", country: "US", lang: "en" },
            ],
          },
        }),
      });

      if (searchRes.ok) {
        const searchData = await searchRes.json() as ChatCompletionResponse;
        const content = searchData?.choices?.[0]?.message?.content?.trim() ?? "";
        const citations = searchData?.citations ?? [];

        const liveResults: Array<{ title: string; url: string; snippet: string }> = citations.map((c) => ({
          title: c.title || new URL(c.url).hostname,
          url: c.url,
          snippet: c.snippet || "",
        }));

        try {
          const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
          const parsed = JSON.parse(cleaned) as { interpretation?: string; suggestedQueries?: string[]; findings?: Array<{ title: string; snippet: string }> };
          return {
            interpretation: parsed.interpretation || content,
            suggestedQueries: parsed.suggestedQueries || [query],
            liveResults,
          };
        } catch {
          return { interpretation: content, suggestedQueries: [query], liveResults };
        }
      }
    } catch (err) {
      console.warn("[grok-news] xAI search with tool-calling failed, falling back:", err);
    }
  }

  const res = await fetch(config.apiUrl, {
    method: "POST",
    headers: config.headers,
    body: JSON.stringify({
      model: config.modelName,
      messages: [
        {
          role: "system",
          content: "You are a news search assistant. Given a natural language query, respond with JSON: {\"interpretation\": \"brief interpretation of what the user is looking for\", \"suggestedQueries\": [\"search term 1\", \"search term 2\", \"search term 3\"]}. No markdown fences.",
        },
        { role: "user", content: query },
      ],
      max_tokens: 200,
      temperature: 0.3,
    }),
  });

  if (!res.ok) throw new Error("AI search failed");

  const data = await res.json() as ChatCompletionResponse;
  const content = data?.choices?.[0]?.message?.content?.trim() ?? "";

  try {
    const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned) as { interpretation?: string; suggestedQueries?: string[] };
    return { interpretation: parsed.interpretation || content, suggestedQueries: parsed.suggestedQueries || [query], liveResults: [] };
  } catch {
    return { interpretation: content, suggestedQueries: [query], liveResults: [] };
  }
}

interface BriefingData { greeting: string; sections: Array<{ category: string; summary: string; highlights: string[] }>; closingThought: string }
const briefingCache = new Map<string, { briefing: BriefingData; cachedAt: number }>();
const BRIEFING_CACHE_TTL = 30 * 60 * 1000;

export async function generateDailyBriefing(topHeadlines: Array<{ title: string; source: string; category?: string }>): Promise<{
  greeting: string;
  sections: Array<{ category: string; summary: string; highlights: string[] }>;
  closingThought: string;
}> {
  const settings = await getNewsAiSettings();
  if (!settings.briefingEnabled) throw new Error("AI briefing is disabled");

  const cacheKey = "daily-briefing";
  const cached = briefingCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < BRIEFING_CACHE_TTL) return cached.briefing;

  const config = getApiConfig();
  if (!config) throw new Error("AI service not configured");

  const headlineList = topHeadlines.slice(0, 20).map((h, i) => `${i + 1}. [${h.category || "General"}] ${h.title} (${h.source})`).join("\n");

  const res = await fetch(config.apiUrl, {
    method: "POST",
    headers: config.headers,
    body: JSON.stringify({
      model: config.modelName,
      messages: [
        {
          role: "system",
          content: "You are Grok, an AI news briefing host. Create a structured daily briefing. Respond ONLY with valid JSON, no markdown fences.",
        },
        {
          role: "user",
          content: `Create a daily news briefing from these headlines. Respond with JSON:\n{"greeting": "brief engaging greeting", "sections": [{"category": "category name", "summary": "2-3 sentence category summary", "highlights": ["key point 1", "key point 2"]}], "closingThought": "brief closing insight"}\n\nHeadlines:\n${headlineList}`,
        },
      ],
      max_tokens: 1000,
      temperature: 0.6,
    }),
  });

  if (!res.ok) throw new Error("Failed to generate briefing");

  const data = await res.json() as ChatCompletionResponse;
  const content = data?.choices?.[0]?.message?.content?.trim() ?? "";

  try {
    const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const briefing = JSON.parse(cleaned) as { greeting: string; sections: Array<{ category: string; summary: string; highlights: string[] }>; closingThought: string };
    briefingCache.set(cacheKey, { briefing, cachedAt: Date.now() });
    return briefing;
  } catch {
    const briefing = {
      greeting: "Here's your daily briefing.",
      sections: [{ category: "Top Stories", summary: content, highlights: [] }],
      closingThought: "Stay informed.",
    };
    briefingCache.set(cacheKey, { briefing, cachedAt: Date.now() });
    return briefing;
  }
}

export async function generateTrendingCommentary(topics: string[]): Promise<Array<{ topic: string; commentary: string }>> {
  const settings = await getNewsAiSettings();
  if (!settings.trendingEnabled) return topics.map((t) => ({ topic: t, commentary: "" }));

  const config = getApiConfig();
  if (!config) return topics.map((t) => ({ topic: t, commentary: "" }));

  try {
    const res = await fetch(config.apiUrl, {
      method: "POST",
      headers: config.headers,
      body: JSON.stringify({
        model: config.modelName,
        messages: [
          {
            role: "system",
            content: "You analyze trending topics. Respond ONLY with valid JSON array, no markdown fences.",
          },
          {
            role: "user",
            content: `Give brief 1-sentence commentary for each trending topic. Respond with JSON array: [{"topic": "topic", "commentary": "brief insight"}]\n\nTopics: ${topics.join(", ")}`,
          },
        ],
        max_tokens: 400,
        temperature: 0.5,
      }),
    });

    if (!res.ok) return topics.map((t) => ({ topic: t, commentary: "" }));

    const data = await res.json() as ChatCompletionResponse;
    const content = data?.choices?.[0]?.message?.content?.trim() ?? "";
    const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned) as Array<{ topic: string; commentary: string }>;
  } catch {
    return topics.map((t) => ({ topic: t, commentary: "" }));
  }
}
