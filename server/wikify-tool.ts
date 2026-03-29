import type { Express, Request, Response } from "express";
import { z } from "zod";
import { requireAuth, requireRole, CAN_CREATE_ARTICLE } from "./middleware/permissions";
import { getApiConfig } from "./grok-news";
import { storage } from "./storage";
import type { Role } from "@shared/schema";

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

        const data = await aiRes.json() as AiChatResponse;
        const raw = data?.choices?.[0]?.message?.content?.trim() ?? "";

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

        const data = await aiRes.json() as AiChatResponse;
        const text = data?.choices?.[0]?.message?.content?.trim() ?? "";

        return res.json({ text });
      } catch (err: unknown) {
        console.error("[wikify-source] Error:", err);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );
}
