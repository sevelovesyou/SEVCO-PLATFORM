import type { Express, Request, Response } from "express";
import { z } from "zod";
import { requireAuth, requireRole, CAN_CREATE_ARTICLE } from "./middleware/permissions";
import { getApiConfig } from "./grok-news";
import { storage } from "./storage";
import { logWikiLlmUsage } from "./wiki-llm-cost";
import type { Role } from "@shared/schema";
import multer from "multer";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import dns from "dns/promises";
import net from "net";
import { XMLParser } from "fast-xml-parser";
import { createRequire } from "module";
const pdfParse = createRequire(process.cwd() + "/index.js")("pdf-parse") as (
  buf: Buffer
) => Promise<{ text: string; numpages: number }>;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const PRIVATE_RANGES = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,
  /^::1$/,
  /^fc/i,
  /^fd/i,
  /^fe80/i,
];

function isPrivateIp(ip: string): boolean {
  return PRIVATE_RANGES.some((re) => re.test(ip));
}

async function validateSafeUrl(rawUrl: string): Promise<{ safe: boolean; message?: string }> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { safe: false, message: "Invalid URL format" };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { safe: false, message: "Only http and https URLs are allowed" };
  }

  const hostname = parsed.hostname.toLowerCase();

  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") {
    return { safe: false, message: "Local URLs are not allowed" };
  }

  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      return { safe: false, message: "Private IP addresses are not allowed" };
    }
    return { safe: true };
  }

  try {
    const addrs = await dns.resolve4(hostname).catch(() => [] as string[]);
    const addrs6 = await dns.resolve6(hostname).catch(() => [] as string[]);
    const allAddrs = [...addrs, ...addrs6];
    for (const addr of allAddrs) {
      if (isPrivateIp(addr)) {
        return { safe: false, message: "URL resolves to a private/internal IP address" };
      }
    }
  } catch {
    return { safe: false, message: "Could not resolve hostname" };
  }

  return { safe: true };
}

interface CrossRefWork {
  title?: string[];
  author?: Array<{ family?: string; given?: string }>;
  published?: { "date-parts"?: number[][] };
  "container-title"?: string[];
  abstract?: string;
}

interface CrossRefResponse {
  message?: CrossRefWork;
}

interface PubMedAuthor {
  name?: string;
}

interface PubMedRecord {
  title?: string;
  authors?: PubMedAuthor[];
  pubdate?: string;
  source?: string;
}

interface PubMedSummaryResponse {
  result?: Record<string, PubMedRecord>;
}

interface PdfParseTextResult {
  text: string;
}

async function notifyAdmins(type: string, title: string, body?: string, link?: string) {
  try {
    const admins = await storage.getUsersByRole(["admin", "executive", "staff"]);
    await Promise.all(
      admins.map((u) =>
        storage.createNotification({ userId: u.id, type, title, body, link, isRead: false })
      )
    );
  } catch { /* non-blocking */ }
}

const analyzeSchema = z.object({
  text: z.string().min(1).max(50000),
  count: z.number().int().min(1).max(25),
  detailLevel: z.enum(["brief", "standard", "detailed"]),
  categoryIds: z.array(z.number()).optional(),
});

const generateSourceSchema = z.object({
  prompt: z.string().min(1).max(1000),
});

const DETAIL_SPECS: Record<string, string> = {
  brief: "150-250 words per article",
  standard: "350-500 words per article",
  detailed: "600-900 words per article",
};

interface AiArticleSuggestion {
  title?: unknown;
  slug?: unknown;
  category?: unknown;
  content?: unknown;
  seoDescription?: unknown;
  aeoKeywords?: unknown;
  confidence?: unknown;
}

interface AiChatResponse {
  choices: Array<{ message: { content: string } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}

interface GapAnalysisTopic {
  topic?: unknown;
  category?: unknown;
  reason?: unknown;
  priority?: unknown;
}

function buildAnalyzePrompt(
  text: string,
  count: number,
  detailLevel: string,
  categoryNames: string[]
): string {
  const wordSpec = DETAIL_SPECS[detailLevel] ?? DETAIL_SPECS.standard;
  const catInstruction =
    categoryNames.length > 0
      ? `Assign each article to one of these categories: ${categoryNames.join(", ")}. If no category fits, use the closest one.`
      : "Auto-assign the most fitting category for each article based on content.";

  return `You are a technical wiki writer for SEVCO, a technology and entertainment company. Your task is to analyze source material and generate exactly ${count} distinct wiki article suggestions.

CONTENT LENGTH REQUIREMENT: ${wordSpec}

CATEGORY INSTRUCTION: ${catInstruction}

SEO REQUIREMENTS for each article:
- Title: keyword-rich, 60 chars max, H1 matches title
- H2 headings as questions: "What is...?", "How does...?", "Why does...?"
- Natural keyword density, no stuffing
- Internal link placeholders using format [See: Topic Name]
- Meta description: complete sentence with primary keyword, 120-160 chars

AEO (Answer Engine Optimization) REQUIREMENTS:
- Opening paragraph directly answers "what is X" in 2 sentences
- FAQ section at end: ### Frequently Asked Questions with 3-5 Q&A pairs
- Structured data-friendly headings
- Factual, authoritative tone
- Only use information from the provided source text — no hallucinations

MARKDOWN STRUCTURE for each article:
- # Title (H1)
- Brief 2-sentence definition paragraph
- ## What is [Topic]? (H2)
- ## How does [Topic] work? (H2) — if applicable
- ## Why does [Topic] matter? (H2) — if applicable
- ### Frequently Asked Questions (H3)
- Q: [question]\\nA: [answer] pairs

CONFIDENCE SCORING:
- "strong": topic is well-covered in source, 80%+ content derived from source
- "good": topic is reasonably covered, 50-80% derived from source
- "review": topic is only briefly mentioned, needs additional research

Respond ONLY with a valid JSON array. No markdown fences, no extra text. Example structure:
[
  {
    "title": "Article Title Here",
    "slug": "article-title-here",
    "category": "engineering",
    "content": "# Article Title Here\\n\\n...",
    "seoDescription": "A complete sentence describing the article with the primary keyword. 120-160 chars.",
    "aeoKeywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
    "confidence": "strong"
  }
]

SOURCE MATERIAL TO ANALYZE:
${text.slice(0, 15000)}`;
}

function buildGapAnalysisPrompt(existingTitles: string[], categoryNames: string[]): string {
  const categoryList = categoryNames.length > 0 ? categoryNames.join(", ") : "General, Engineering, Operations, Marketing";
  return `You are a knowledge architect for SEVCO, a technology and entertainment company building a comprehensive internal wiki. Your job is to identify MISSING topics that are not yet documented.

EXISTING WIKI ARTICLES (already documented — do NOT suggest these):
${existingTitles.map((t) => `- ${t}`).join("\n")}

AVAILABLE CATEGORIES: ${categoryList}

SEVCO CONTEXT: SEVCO is a multi-division technology and entertainment company that operates:
- SEVCO Records (music label, artist management, streaming)
- SEVCO Store (e-commerce, merchandise)
- SEVCO Minecraft (game servers, community)
- SEVCO Engineering (platform development, infrastructure)
- SEVCO Services (professional services, partnerships)
- Platform features (wiki, chat, social feed, profiles, finance tools, news aggregator)

TASK: Identify 25 specific missing topics that would make this wiki more comprehensive. Focus on:
1. Operational processes and workflows
2. Technical systems and architecture
3. Business policies and guidelines
4. Team structures and responsibilities
5. Product features and capabilities

For each missing topic, assign a priority: "high" (core business/operations), "medium" (important but not critical), "low" (nice to have).

Respond ONLY with a valid JSON array. No markdown, no extra text:
[
  {
    "topic": "Specific Topic Title",
    "category": "one of the available categories",
    "reason": "One sentence explaining why this topic is important and missing.",
    "priority": "high"
  }
]`;
}

function buildRewikifyPrompt(title: string, currentContent: string): string {
  return `You are a technical wiki editor for SEVCO, a technology and entertainment company. Your task is to refresh and improve an existing wiki article.

TASK: Refresh, update, and expand any thin sections while preserving the overall structure and intent of the article.

GUIDELINES:
- Keep the same title and core topic focus
- Improve clarity and completeness
- Expand any sections that are too brief (under 2 sentences)
- Ensure the article has proper markdown structure with H1, H2, H3 headings
- Include or improve the FAQ section at the end (3-5 Q&A pairs)
- Maintain factual, authoritative tone
- Preserve any specific SEVCO-relevant facts and context
- Do NOT add hallucinated specifics — keep it general/accurate

CONFIDENCE SCORING (return one):
- "strong": article is comprehensive, well-structured, 80%+ confident in quality
- "good": article is solid but has minor gaps
- "review": article needs significant additional research

Respond ONLY with a valid JSON object. No markdown fences:
{
  "content": "# ${title}\\n\\n...",
  "confidence": "strong"
}

CURRENT ARTICLE CONTENT TO REFRESH:
Title: ${title}

${currentContent.slice(0, 10000)}`;
}

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 60 * 1000 });
    return true;
  }
  if (entry.count >= 3) return false;
  entry.count++;
  return true;
}

function normalizeString(val: unknown): string {
  return typeof val === "string" ? val : "";
}

function normalizeStringArray(val: unknown): string[] {
  return Array.isArray(val) ? val.filter((x): x is string => typeof x === "string") : [];
}

function normalizeConfidence(val: unknown): "strong" | "good" | "review" {
  if (val === "strong" || val === "good" || val === "review") return val;
  return "good";
}

function normalizePriority(val: unknown): "high" | "medium" | "low" {
  if (val === "high" || val === "medium" || val === "low") return val;
  return "medium";
}

async function callAi(config: ReturnType<typeof getApiConfig>, messages: { role: string; content: string }[], maxTokens = 8000): Promise<AiChatResponse> {
  if (!config) throw new Error("AI service not configured");
  const res = await fetch(config.apiUrl, {
    method: "POST",
    headers: config.headers,
    body: JSON.stringify({
      model: config.modelName,
      messages,
      max_tokens: maxTokens,
      temperature: 0.4,
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`AI error: ${errText.slice(0, 200)}`);
  }
  return res.json() as Promise<AiChatResponse>;
}

export function registerWikifyToolRoutes(app: Express) {
  app.post(
    "/api/tools/wikify/analyze",
    requireAuth,
    requireRole(...CAN_CREATE_ARTICLE),
    async (req: Request, res: Response) => {
      const userId = req.user?.id ?? "unknown";

      if (!checkRateLimit(userId)) {
        return res.status(429).json({ message: "Rate limit: max 3 requests per minute" });
      }

      const parsed = analyzeSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid request", errors: parsed.error.flatten() });
      }

      const { text, count, detailLevel, categoryIds } = parsed.data;

      const config = getApiConfig();
      if (!config) {
        return res.status(503).json({ message: "AI service not configured. Please set XAI_API_KEY or OPENROUTER_API_KEY." });
      }

      let categoryNames: string[] = [];
      try {
        const categories = await storage.getCategories();
        if (categoryIds && categoryIds.length > 0) {
          categoryNames = categories
            .filter((c) => categoryIds.includes(c.id))
            .map((c) => c.name);
        } else {
          categoryNames = categories.map((c) => c.name);
        }
      } catch {}

      const prompt = buildAnalyzePrompt(text, count, detailLevel, categoryNames);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5 * 60 * 1000);

      try {
        const aiRes = await fetch(config.apiUrl, {
          method: "POST",
          headers: config.headers,
          signal: controller.signal,
          body: JSON.stringify({
            model: config.modelName === "grok-3-mini" ? "grok-3-mini" : config.modelName,
            messages: [
              { role: "system", content: "You are a technical wiki writer. Respond ONLY with valid JSON arrays. No markdown fences, no explanation, no extra text." },
              { role: "user", content: prompt },
            ],
            max_tokens: 12000,
            temperature: 0.4,
          }),
        });

        clearTimeout(timeout);

        if (!aiRes.ok) {
          const errText = await aiRes.text();
          console.error("[wikify] AI error:", errText.slice(0, 500));
          return res.status(502).json({ message: "AI generation failed", detail: errText.slice(0, 200) });
        }

        const data = await aiRes.json() as AiChatResponse & { usage?: { prompt_tokens?: number; completion_tokens?: number } };
        const raw = data?.choices?.[0]?.message?.content?.trim() ?? "";

        logWikiLlmUsage({
          operation: "wikify",
          model: config.modelName,
          inputTokens: data?.usage?.prompt_tokens ?? 0,
          outputTokens: data?.usage?.completion_tokens ?? 0,
          userId: req.user?.id,
        }).catch(() => {});

        const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        let rawArticles: unknown[];
        try {
          const parsed2 = JSON.parse(cleaned) as unknown;
          if (!Array.isArray(parsed2)) throw new Error("Not an array");
          rawArticles = parsed2;
        } catch {
          return res.status(502).json({ message: "AI returned malformed JSON", raw: raw.slice(0, 500) });
        }

        const normalizedCategories = await storage.getCategories();
        const articles = rawArticles.slice(0, count).map((item: unknown) => {
          const a = (typeof item === "object" && item !== null ? item : {}) as AiArticleSuggestion;
          const category = normalizeString(a.category);
          const catMatch = normalizedCategories.find(
            (c) => c.name.toLowerCase() === category.toLowerCase() ||
                   c.slug.toLowerCase() === category.toLowerCase()
          );
          const title = normalizeString(a.title) || "Untitled";
          return {
            title,
            slug: normalizeString(a.slug) || title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "article",
            category: catMatch?.name ?? (category || "General"),
            categoryId: catMatch?.id ?? null,
            content: normalizeString(a.content),
            seoDescription: normalizeString(a.seoDescription),
            aeoKeywords: normalizeStringArray(a.aeoKeywords),
            confidence: normalizeConfidence(a.confidence),
          };
        });

        return res.json({ articles });
      } catch (err: unknown) {
        clearTimeout(timeout);
        if (err instanceof Error && err.name === "AbortError") {
          return res.status(504).json({ message: "AI generation timed out after 5 minutes" });
        }
        console.error("[wikify] Error:", err);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  app.post(
    "/api/tools/wikify/generate-source",
    requireAuth,
    requireRole(...CAN_CREATE_ARTICLE),
    async (req: Request, res: Response) => {
      const parsedBody = generateSourceSchema.safeParse(req.body);
      if (!parsedBody.success) {
        return res.status(400).json({ message: "Invalid request" });
      }

      const { prompt } = parsedBody.data;

      const config = getApiConfig();
      if (!config) {
        return res.status(503).json({ message: "AI service not configured" });
      }

      try {
        const aiRes = await fetch(config.apiUrl, {
          method: "POST",
          headers: config.headers,
          body: JSON.stringify({
            model: config.modelName,
            messages: [
              {
                role: "system",
                content: "You are a professional technical writer. Generate clear, factual, informative source material that can be used as the basis for wiki articles. Write in a neutral, encyclopedic style. No markdown headers — just flowing paragraphs of informational text.",
              },
              {
                role: "user",
                content: `Write 800-1200 words of informational source text about the following topic. Write in clear paragraphs. Cover the topic comprehensively including what it is, how it works, why it matters, and key related concepts.\n\nTopic: ${prompt}`,
              },
            ],
            max_tokens: 2000,
            temperature: 0.5,
          }),
        });

        if (!aiRes.ok) {
          const errText = await aiRes.text();
          return res.status(502).json({ message: "AI generation failed", detail: errText.slice(0, 200) });
        }

        const data = await aiRes.json() as AiChatResponse & { usage?: { prompt_tokens?: number; completion_tokens?: number } };
        const text = data?.choices?.[0]?.message?.content?.trim() ?? "";

        logWikiLlmUsage({
          operation: "rewikify",
          model: config.modelName,
          inputTokens: data?.usage?.prompt_tokens ?? 0,
          outputTokens: data?.usage?.completion_tokens ?? 0,
          userId: req.user?.id,
        }).catch(() => {});

        return res.json({ text });
      } catch (err: unknown) {
        console.error("[wikify-source] Error:", err);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  app.post(
    "/api/tools/wiki/gap-analysis",
    requireAuth,
    requireRole(...CAN_CREATE_ARTICLE),
    async (req: Request, res: Response) => {
      const config = getApiConfig();
      if (!config) {
        return res.status(503).json({ message: "AI service not configured. Please set XAI_API_KEY or OPENROUTER_API_KEY." });
      }

      try {
        const [allArticles, categories] = await Promise.all([
          storage.getArticles(),
          storage.getCategories(),
        ]);

        const existingTitles = allArticles.map((a) => a.title);
        const categoryNames = categories.map((c) => c.name);

        const prompt = buildGapAnalysisPrompt(existingTitles, categoryNames);

        const data = await callAi(config, [
          { role: "system", content: "You are a knowledge architect. Respond ONLY with valid JSON arrays. No markdown fences, no explanation." },
          { role: "user", content: prompt },
        ], 6000);

        if (data.usage) {
          console.log(`[wiki/gap-analysis] tokens: prompt=${data.usage.prompt_tokens} completion=${data.usage.completion_tokens} total=${data.usage.total_tokens}`);
        }

        const raw = data?.choices?.[0]?.message?.content?.trim() ?? "";
        const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

        let rawTopics: unknown[];
        try {
          const parsed = JSON.parse(cleaned) as unknown;
          if (!Array.isArray(parsed)) throw new Error("Not an array");
          rawTopics = parsed;
        } catch {
          return res.status(502).json({ message: "AI returned malformed JSON", raw: raw.slice(0, 500) });
        }

        const topics = rawTopics.map((item: unknown) => {
          const t = (typeof item === "object" && item !== null ? item : {}) as GapAnalysisTopic;
          return {
            topic: normalizeString(t.topic) || "Unknown Topic",
            category: normalizeString(t.category) || "General",
            reason: normalizeString(t.reason) || "",
            priority: normalizePriority(t.priority),
          };
        });

        const priorityOrder = { high: 0, medium: 1, low: 2 };
        topics.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

        return res.json({ topics, existingCount: existingTitles.length });
      } catch (err: unknown) {
        console.error("[wiki/gap-analysis] Error:", err);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  const citationItemSchema = z.object({
    url: z.string().optional(),
    title: z.string().optional(),
    format: z.string(),
    text: z.string(),
  });

  const saveArticleSchema = z.object({
    title: z.string().min(1),
    slug: z.string().min(1),
    content: z.string().min(1),
    summary: z.string().optional(),
    categoryId: z.number().nullable().optional(),
    confidence: z.enum(["strong", "good", "review"]),
    citations: z.array(citationItemSchema).optional(),
  });

  app.post(
    "/api/tools/wiki/save-article",
    requireAuth,
    requireRole(...CAN_CREATE_ARTICLE),
    async (req: Request, res: Response) => {
      const parsed = saveArticleSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid request", errors: parsed.error.flatten() });
      }

      const { confidence, citations, ...articleData } = parsed.data;

      // Append citations as a References section if provided (Task #317)
      if (citations && citations.length > 0) {
        const refLines = citations.map((c, i) => {
          const label = c.title ?? c.text.slice(0, 60);
          return c.url ? `${i + 1}. [${label}](${c.url})` : `${i + 1}. ${label}`;
        });
        articleData.content = articleData.content.trimEnd() + "\n\n## References\n\n" + refLines.join("\n");
      }

      const settings = await storage.getPlatformSettings();
      const autoPublishStrong = settings["wiki.autoPublishStrongConfidence"] === "true";

      let articleStatus: string;
      let revisionStatus: string;
      let action: string;
      let message: string;

      if (confidence === "strong" && autoPublishStrong) {
        // Strong confidence + toggle on → auto-publish
        articleStatus = "published";
        revisionStatus = "approved";
        action = "published";
        message = "Article auto-published (strong confidence)";
      } else if (confidence === "good") {
        // Good confidence → draft + notify admins/staff to review
        articleStatus = "draft";
        revisionStatus = "pending";
        action = "draft_notified";
        message = "Article saved as draft — staff notified for review (good confidence)";
      } else {
        // review confidence (or strong with toggle off) → draft + review queue
        articleStatus = "draft";
        revisionStatus = "pending";
        action = confidence === "strong" ? "draft_strong_disabled" : "draft_review_queue";
        message = confidence === "strong"
          ? "Article saved as draft (auto-publish disabled)"
          : "Article saved as draft — queued for manual review (review confidence)";
      }

      const article = await storage.createArticle({
        ...articleData,
        status: articleStatus,
        authorId: (req.user as any)?.id ?? null,
        lastAiReviewedAt: new Date(),
      });

      await storage.createRevision({
        articleId: article.id,
        content: article.content,
        summary: article.summary,
        editSummary: `AI-generated article (${confidence} confidence)`,
        status: revisionStatus,
        authorName: req.user?.username ?? "AI Wikify",
      });

      if (confidence === "good") {
        notifyAdmins(
          "wiki_review",
          "Wiki article ready for review",
          `"${article.title}" was AI-generated with good confidence and is awaiting review.`,
          `/wiki/${article.slug}`
        );
      }

      return res.status(201).json({
        article,
        confidence,
        action,
        message,
      });
    }
  );

  app.post(
    "/api/tools/wiki/rewikify/:articleId",
    requireAuth,
    requireRole(...CAN_CREATE_ARTICLE),
    async (req: Request, res: Response) => {
      const articleId = parseInt(req.params.articleId, 10);
      if (isNaN(articleId)) {
        return res.status(400).json({ message: "Invalid article ID" });
      }

      const config = getApiConfig();
      if (!config) {
        return res.status(503).json({ message: "AI service not configured." });
      }

      try {
        const article = await storage.getArticleById(articleId);
        if (!article) {
          return res.status(404).json({ message: "Article not found" });
        }

        const prompt = buildRewikifyPrompt(article.title, article.content);

        const data = await callAi(config, [
          { role: "system", content: "You are a technical wiki editor. Respond ONLY with valid JSON. No markdown fences." },
          { role: "user", content: prompt },
        ], 6000);

        if (data.usage) {
          console.log(`[wiki/rewikify/${articleId}] tokens: prompt=${data.usage.prompt_tokens} completion=${data.usage.completion_tokens} total=${data.usage.total_tokens}`);
        }

        const raw = data?.choices?.[0]?.message?.content?.trim() ?? "";
        const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

        let result: { content?: unknown; confidence?: unknown };
        try {
          result = JSON.parse(cleaned) as { content?: unknown; confidence?: unknown };
        } catch {
          return res.status(502).json({ message: "AI returned malformed JSON", raw: raw.slice(0, 500) });
        }

        const newContent = normalizeString(result.content);
        const confidence = normalizeConfidence(result.confidence);

        if (!newContent) {
          return res.status(502).json({ message: "AI returned empty content" });
        }

        const settings = await storage.getPlatformSettings();
        const autoPublishStrong = settings["wiki.autoPublishStrongConfidence"] === "true";
        const authorName = req.user?.username ?? "AI Re-wikify";

        const now = new Date();
        const autoApprove = confidence === "strong" && autoPublishStrong;

        const revision = await storage.createRevision({
          articleId,
          content: newContent,
          authorName,
          editSummary: `Re-wikified by AI (${confidence} confidence)`,
          status: autoApprove ? "approved" : "pending",
        });

        if (autoApprove) {
          await storage.updateArticle(articleId, {
            content: newContent,
            status: "published",
            lastAiReviewedAt: now,
          });
          return res.json({ confidence, action: "published", revisionId: revision.id, message: "Revision created and auto-approved (strong confidence)" });
        } else {
          await storage.updateArticle(articleId, {
            lastAiReviewedAt: now,
          });
          return res.json({ confidence, action: "revision", revisionId: revision.id, message: `Revision created (${confidence} confidence) — pending review` });
        }
      } catch (err: unknown) {
        console.error("[wiki/rewikify] Error:", err);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  // ── Task #317: Source Ingestion Routes ────────────────────────────────────

  const ingestUrlSchema = z.object({
    url: z.string().url(),
  });

  app.post(
    "/api/tools/wiki/ingest-url",
    requireAuth,
    requireRole(...CAN_CREATE_ARTICLE),
    async (req: Request, res: Response) => {
      const parsed = ingestUrlSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid URL" });
      }

      const { url } = parsed.data;

      try {
        const safeCheck = await validateSafeUrl(url);
        if (!safeCheck.safe) {
          return res.status(400).json({ message: safeCheck.message ?? "URL is not allowed" });
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const htmlRes = await fetch(url, {
          signal: controller.signal,
          redirect: "manual",
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; SEVE-Wiki-Bot/1.0)",
            "Accept": "text/html,application/xhtml+xml",
          },
        });
        clearTimeout(timeout);

        if (htmlRes.status >= 300 && htmlRes.status < 400) {
          const location = htmlRes.headers.get("location");
          if (!location) {
            return res.status(502).json({ message: "Received redirect with no Location header" });
          }
          const redirectCheck = await validateSafeUrl(new URL(location, url).href);
          if (!redirectCheck.safe) {
            return res.status(400).json({ message: `Redirect blocked: ${redirectCheck.message}` });
          }
          return res.status(400).json({ message: "Redirected URLs are not followed for security. Please provide the final destination URL." });
        }

        if (!htmlRes.ok) {
          return res.status(502).json({ message: `Failed to fetch URL: HTTP ${htmlRes.status}` });
        }

        const contentType = htmlRes.headers.get("content-type") ?? "";
        if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
          return res.status(400).json({ message: "URL does not point to an HTML page" });
        }

        const html = await htmlRes.text();
        const dom = new JSDOM(html, { url });
        const reader = new Readability(dom.window.document);
        const article = reader.parse();

        if (!article || !article.textContent?.trim()) {
          return res.status(422).json({ message: "Could not extract readable content from this URL" });
        }

        const text = article.textContent.trim().slice(0, 15000);
        const title = article.title ?? url;

        const source = await storage.createWikiSource({
          type: "url",
          identifier: url,
          title,
          articleCount: 0,
        });

        return res.json({
          text,
          title,
          sourceId: source.id,
          citation: url,
          citationFormat: "URL",
        });
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          return res.status(504).json({ message: "Request timed out fetching URL" });
        }
        console.error("[ingest-url] Error:", err);
        return res.status(500).json({ message: "Failed to fetch or parse URL" });
      }
    }
  );

  const ingestAcademicSchema = z.object({
    type: z.enum(["doi", "pubmed", "arxiv"]),
    id: z.string().min(1).max(200),
  });

  app.post(
    "/api/tools/wiki/ingest-academic",
    requireAuth,
    requireRole(...CAN_CREATE_ARTICLE),
    async (req: Request, res: Response) => {
      const parsed = ingestAcademicSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid request", errors: parsed.error.flatten() });
      }

      const { type, id } = parsed.data;
      let text = "";
      let title = "";
      let citation = "";

      try {
        if (type === "doi") {
          const crossrefUrl = `https://api.crossref.org/works/${encodeURIComponent(id)}`;
          const crossrefRes = await fetch(crossrefUrl, {
            headers: { "User-Agent": "SEVE-Wiki-Bot/1.0 (mailto:wiki@sevco.us)" },
          });
          if (!crossrefRes.ok) {
            return res.status(404).json({ message: `DOI not found: ${id}` });
          }
          const crossrefData = await crossrefRes.json() as CrossRefResponse;
          const work = crossrefData?.message;
          if (!work) return res.status(404).json({ message: "DOI metadata not found" });

          const authors = (work.author ?? []).map((a) =>
            [a.family, a.given].filter(Boolean).join(", ")
          ).join("; ");
          const year = work.published?.["date-parts"]?.[0]?.[0] ?? "";
          const journal = work["container-title"]?.[0] ?? "";
          title = work.title?.[0] ?? id;
          const abstractText = (work.abstract ?? "").replace(/<[^>]+>/g, "").trim();

          text = `Title: ${title}\nAuthors: ${authors}\nYear: ${year}\nJournal: ${journal}\nDOI: ${id}\n\nAbstract:\n${abstractText}`;
          citation = `${authors} (${year}). ${title}. ${journal}. https://doi.org/${id}`;
        } else if (type === "pubmed") {
          const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${encodeURIComponent(id)}&retmode=json`;
          const summaryRes = await fetch(summaryUrl, {
            headers: { "User-Agent": "SEVE-Wiki-Bot/1.0" },
          });
          if (!summaryRes.ok) {
            return res.status(404).json({ message: `PubMed ID not found: ${id}` });
          }
          const summaryData = await summaryRes.json() as PubMedSummaryResponse;
          const record = summaryData?.result?.[id];
          if (!record) return res.status(404).json({ message: "PubMed record not found" });

          title = record.title ?? id;
          const authors = (record.authors ?? []).map((a) => a.name ?? "").filter(Boolean).join(", ");
          const year = record.pubdate?.split(" ")?.[0] ?? "";
          const journal = record.source ?? "";

          const abstractUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${encodeURIComponent(id)}&retmode=text&rettype=abstract`;
          const abstractRes = await fetch(abstractUrl, { headers: { "User-Agent": "SEVE-Wiki-Bot/1.0" } });
          const abstractText = abstractRes.ok ? (await abstractRes.text()).trim() : "";

          text = `Title: ${title}\nAuthors: ${authors}\nYear: ${year}\nJournal: ${journal}\nPubMed ID: ${id}\n\nAbstract:\n${abstractText}`;
          citation = `${authors} (${year}). ${title}. ${journal}. PubMed ID: ${id}. https://pubmed.ncbi.nlm.nih.gov/${id}/`;
        } else if (type === "arxiv") {
          const cleanId = id.replace(/^arxiv:/i, "");
          const arxivUrl = `https://export.arxiv.org/abs/${encodeURIComponent(cleanId)}`;
          const apiUrl = `https://export.arxiv.org/api/query?id_list=${encodeURIComponent(cleanId)}`;
          const apiRes = await fetch(apiUrl, { headers: { "User-Agent": "SEVE-Wiki-Bot/1.0" } });
          if (!apiRes.ok) {
            return res.status(404).json({ message: `arXiv ID not found: ${cleanId}` });
          }
          const xmlText = await apiRes.text();

          const xmlParser = new XMLParser({ ignoreAttributes: false, isArray: (name) => name === "author" });
          const parsed2 = xmlParser.parse(xmlText) as {
            feed?: {
              entry?: {
                title?: string;
                summary?: string;
                published?: string;
                author?: Array<{ name?: string }> | { name?: string };
              };
            };
          };
          const entry = parsed2?.feed?.entry;

          title = (typeof entry?.title === "string" ? entry.title : cleanId).trim().replace(/\s+/g, " ");
          const abstractText = (typeof entry?.summary === "string" ? entry.summary : "").trim().replace(/\s+/g, " ");
          const authorList = Array.isArray(entry?.author)
            ? entry.author.map((a) => a.name ?? "").filter(Boolean)
            : entry?.author?.name
              ? [entry.author.name]
              : [];
          const authors = authorList.join(", ");
          const publishedStr = typeof entry?.published === "string" ? entry.published : "";
          const year = publishedStr.slice(0, 4) || "";

          text = `Title: ${title}\nAuthors: ${authors}\nYear: ${year}\narXiv ID: ${cleanId}\narXiv URL: ${arxivUrl}\n\nAbstract:\n${abstractText}`;
          citation = `${authors} (${year}). ${title}. arXiv:${cleanId}. ${arxivUrl}`;
        }

        if (!text.trim()) {
          return res.status(422).json({ message: "Could not extract content for this academic ID" });
        }

        const identifier = type === "arxiv" ? id.replace(/^arxiv:/i, "") : id;
        const source = await storage.createWikiSource({
          type,
          identifier,
          title,
          articleCount: 0,
        });

        return res.json({
          text: text.slice(0, 15000),
          title,
          sourceId: source.id,
          citation,
          citationFormat: "APA",
        });
      } catch (err: unknown) {
        console.error("[ingest-academic] Error:", err);
        return res.status(500).json({ message: "Failed to fetch academic metadata" });
      }
    }
  );

  app.post(
    "/api/tools/wiki/ingest-pdf",
    requireAuth,
    requireRole(...CAN_CREATE_ARTICLE),
    upload.single("file"),
    async (req: Request, res: Response) => {
      if (!req.file) {
        return res.status(400).json({ message: "No PDF file uploaded" });
      }

      if (req.file.mimetype !== "application/pdf" && !req.file.originalname.toLowerCase().endsWith(".pdf")) {
        return res.status(400).json({ message: "Only PDF files are accepted" });
      }

      try {
        const pdfData = await pdfParse(req.file.buffer);
        const rawText = pdfData.text?.trim() ?? "";

        if (!rawText) {
          return res.status(422).json({ message: "Could not extract text from this PDF" });
        }

        const LIMIT = 15000;
        const text = rawText.length > LIMIT
          ? rawText.slice(0, LIMIT) + "\n\n[Content truncated — PDF exceeded 15,000 character limit]"
          : rawText;

        const title = req.file.originalname.replace(/\.pdf$/i, "");

        const source = await storage.createWikiSource({
          type: "pdf",
          identifier: req.file.originalname,
          title,
          articleCount: 0,
        });

        return res.json({
          text,
          title,
          sourceId: source.id,
          citation: `${title} [PDF document]`,
          citationFormat: "URL",
        });
      } catch (err: unknown) {
        console.error("[ingest-pdf] Error:", err);
        return res.status(500).json({ message: "Failed to parse PDF" });
      }
    }
  );

  app.get(
    "/api/tools/wiki/sources",
    requireAuth,
    requireRole(...CAN_CREATE_ARTICLE),
    async (_req: Request, res: Response) => {
      try {
        const sources = await storage.getWikiSources();
        return res.json(sources);
      } catch (err) {
        console.error("[wiki-sources] Error:", err);
        return res.status(500).json({ message: "Failed to fetch sources" });
      }
    }
  );

  app.patch(
    "/api/tools/wiki/sources/:id/increment",
    requireAuth,
    requireRole(...CAN_CREATE_ARTICLE),
    async (req: Request, res: Response) => {
      const id = parseInt(req.params.id, 10);
      const { count } = req.body as { count?: number };
      if (isNaN(id) || typeof count !== "number" || count < 1) {
        return res.status(400).json({ message: "Invalid request" });
      }
      try {
        await storage.incrementWikiSourceArticleCount(id, count);
        return res.json({ ok: true });
      } catch (err) {
        console.error("[wiki-sources-increment] Error:", err);
        return res.status(500).json({ message: "Failed to increment source article count" });
      }
    }
  );

  app.delete(
    "/api/tools/wiki/sources/:id",
    requireAuth,
    requireRole(...CAN_CREATE_ARTICLE),
    async (req: Request, res: Response) => {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
      try {
        await storage.deleteWikiSource(id);
        return res.json({ ok: true });
      } catch (err) {
        console.error("[wiki-sources-delete] Error:", err);
        return res.status(500).json({ message: "Failed to delete source" });
      }
    }
  );
}
