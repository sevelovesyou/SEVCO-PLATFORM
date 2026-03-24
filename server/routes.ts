import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  requireAuth,
  requireRole,
  CAN_CREATE_ARTICLE,
  CAN_PUBLISH_ARTICLES,
  CAN_ACCESS_REVIEW_QUEUE,
  CAN_DELETE_ARTICLE,
} from "./middleware/permissions";
import type { Role } from "@shared/schema";

function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "is", "was", "are", "were", "be", "been",
    "being", "have", "has", "had", "do", "does", "did", "will", "would",
    "could", "should", "may", "might", "shall", "can", "need", "dare",
    "ought", "used", "it", "its", "this", "that", "these", "those", "he",
    "she", "they", "we", "you", "i", "me", "him", "her", "us", "them",
    "my", "your", "his", "our", "their", "what", "which", "who", "whom",
    "not", "no", "nor", "as", "if", "then", "than", "so", "also", "just",
    "about", "up", "out", "into", "over", "after", "before", "between",
  ]);

  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));

  const freq: Record<string, number> = {};
  words.forEach((w) => { freq[w] = (freq[w] || 0) + 1; });

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word]) => word);
}

async function generateCrosslinks(articleId: number) {
  const allArticles = await storage.getArticles();
  const sourceArticle = allArticles.find((a) => a.id === articleId);
  if (!sourceArticle) return;

  await storage.deleteCrosslinksBySource(articleId);

  const sourceText = `${sourceArticle.title} ${sourceArticle.content} ${sourceArticle.summary || ""} ${(sourceArticle.tags || []).join(" ")}`;
  const sourceKeywords = extractKeywords(sourceText);

  for (const target of allArticles) {
    if (target.id === articleId) continue;
    if (target.status !== "published") continue;

    const targetText = `${target.title} ${target.content} ${target.summary || ""} ${(target.tags || []).join(" ")}`;
    const targetKeywords = extractKeywords(targetText);

    const shared = sourceKeywords.filter((k) => targetKeywords.includes(k));
    if (shared.length >= 2) {
      const score = Math.min(shared.length / 10, 1);
      await storage.createCrosslink({
        sourceArticleId: articleId,
        targetArticleId: target.id,
        relevanceScore: score,
        sharedKeywords: shared.slice(0, 6),
      });
    }
  }
}

async function validateCitationUrl(url: string): Promise<{ isValid: boolean; errorMessage?: string }> {
  if (!url) return { isValid: true };
  try {
    new URL(url);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      headers: { "User-Agent": "SEVE-Wiki-Bot/1.0" },
    }).catch(async () => {
      return fetch(url, {
        method: "GET",
        signal: controller.signal,
        headers: { "User-Agent": "SEVE-Wiki-Bot/1.0" },
      });
    });
    clearTimeout(timeout);
    if (response.ok || response.status === 301 || response.status === 302) {
      return { isValid: true };
    }
    return { isValid: false, errorMessage: `HTTP ${response.status}` };
  } catch (err: any) {
    if (err.name === "AbortError") {
      return { isValid: false, errorMessage: "Request timeout" };
    }
    return { isValid: false, errorMessage: err.message || "Invalid URL" };
  }
}

function validateCitationFormat(text: string, format: string): { isValid: boolean; errorMessage?: string } {
  if (!text.trim()) return { isValid: false, errorMessage: "Citation text is empty" };

  switch (format) {
    case "APA":
      if (!text.includes("(") || !text.includes(")")) {
        return { isValid: false, errorMessage: "APA format requires parenthetical year e.g. (2024)" };
      }
      if (!text.includes(".")) {
        return { isValid: false, errorMessage: "APA format requires periods between elements" };
      }
      return { isValid: true };
    case "MLA":
      if (!text.includes(".")) {
        return { isValid: false, errorMessage: "MLA format requires periods between elements" };
      }
      return { isValid: true };
    case "Chicago":
      if (!text.includes(".")) {
        return { isValid: false, errorMessage: "Chicago format requires periods between elements" };
      }
      return { isValid: true };
    default:
      return { isValid: true };
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/categories", async (_req, res) => {
    const cats = await storage.getCategories();
    res.json(cats);
  });

  app.get("/api/categories/:slug", async (req, res) => {
    const cat = await storage.getCategoryBySlug(req.params.slug);
    if (!cat) return res.status(404).json({ message: "Category not found" });
    const catArticles = await storage.getArticlesByCategory(cat.id);
    res.json({ ...cat, articles: catArticles });
  });

  app.get("/api/articles/recent", async (_req, res) => {
    const arts = await storage.getArticles();
    res.json(arts);
  });

  app.get("/api/articles/search", async (req, res) => {
    const query = (req.query.q as string) || "";
    const categoryFilter = (req.query.category as string) || "all";
    const statusFilter = (req.query.status as string) || "all";

    let arts: any[];
    if (query) {
      arts = await storage.searchArticles(query);
    } else {
      arts = await storage.getArticles();
    }

    if (categoryFilter !== "all") {
      const catId = parseInt(categoryFilter);
      if (!isNaN(catId)) {
        arts = arts.filter((a: any) => a.categoryId === catId);
      }
    }

    if (statusFilter !== "all") {
      arts = arts.filter((a: any) => a.status === statusFilter);
    }

    res.json(arts);
  });

  app.get("/api/articles/:slug", async (req, res) => {
    const article = await storage.getArticleBySlug(req.params.slug);
    if (!article) return res.status(404).json({ message: "Article not found" });

    const articleCitations = await storage.getCitations(article.id);
    const articleRevisions = await storage.getRevisions(article.id);
    const articleCrosslinks = await storage.getCrosslinks(article.id);

    const category = article.categoryId
      ? (await storage.getCategories()).find((c) => c.id === article.categoryId) || null
      : null;

    res.json({
      ...article,
      citations: articleCitations,
      revisions: articleRevisions,
      crosslinks: articleCrosslinks.map((cl) => ({
        article: cl.targetArticle,
        relevanceScore: cl.relevanceScore,
        sharedKeywords: cl.sharedKeywords,
      })),
      category: category ? { name: category.name, slug: category.slug } : null,
    });
  });

  app.post("/api/articles", requireAuth, requireRole(...CAN_CREATE_ARTICLE), async (req, res) => {
    try {
      const { citations: citationsData, editSummary, ...articleData } = req.body;

      const userRole = req.user?.role as Role | undefined;
      const canPublish = !!userRole && (CAN_PUBLISH_ARTICLES as string[]).includes(userRole);
      const articleStatus = canPublish ? "published" : "draft";
      const revisionStatus = canPublish ? "approved" : "pending";

      const article = await storage.createArticle({
        ...articleData,
        status: articleStatus,
      });

      await storage.createRevision({
        articleId: article.id,
        content: article.content,
        infoboxData: article.infoboxData,
        summary: article.summary,
        editSummary: editSummary || "Initial article creation",
        status: revisionStatus,
        authorName: req.user?.username ?? "Editor",
      });

      if (citationsData && Array.isArray(citationsData)) {
        for (const cit of citationsData) {
          const urlValidation = cit.url ? await validateCitationUrl(cit.url) : { isValid: true };
          const formatValidation = validateCitationFormat(cit.text, cit.format);
          const isValid = urlValidation.isValid && formatValidation.isValid;
          const errorMessage = !urlValidation.isValid
            ? urlValidation.errorMessage
            : !formatValidation.isValid
            ? formatValidation.errorMessage
            : null;

          await storage.createCitation({
            articleId: article.id,
            url: cit.url || null,
            title: cit.title,
            format: cit.format || "APA",
            text: cit.text,
            isValid,
            errorMessage,
          });
        }
      }

      await generateCrosslinks(article.id);

      res.json(article);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/articles/:slug", requireAuth, requireRole(...CAN_CREATE_ARTICLE), async (req, res) => {
    try {
      const article = await storage.getArticleBySlug(req.params.slug as string);
      if (!article) return res.status(404).json({ message: "Article not found" });

      const { citations: citationsData, editSummary, ...updateData } = req.body;

      const revision = await storage.createRevision({
        articleId: article.id,
        content: updateData.content || article.content,
        infoboxData: updateData.infoboxData || article.infoboxData,
        summary: updateData.summary || article.summary,
        editSummary: editSummary || "Article updated",
        status: "pending",
        authorName: req.user?.username ?? "Editor",
      });

      if (citationsData && Array.isArray(citationsData)) {
        await storage.deleteCitationsByArticle(article.id);
        for (const cit of citationsData) {
          const urlValidation = cit.url ? await validateCitationUrl(cit.url) : { isValid: true };
          const formatValidation = validateCitationFormat(cit.text, cit.format);
          const isValid = urlValidation.isValid && formatValidation.isValid;
          const errorMessage = !urlValidation.isValid
            ? urlValidation.errorMessage
            : !formatValidation.isValid
            ? formatValidation.errorMessage
            : null;

          await storage.createCitation({
            articleId: article.id,
            url: cit.url || null,
            title: cit.title,
            format: cit.format || "APA",
            text: cit.text,
            isValid,
            errorMessage,
          });
        }
      }

      res.json(article);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/articles/:id", requireAuth, requireRole(...CAN_DELETE_ARTICLE), async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid article id" });
      await storage.deleteArticle(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.get("/api/revisions/pending-count", requireAuth, requireRole(...CAN_ACCESS_REVIEW_QUEUE), async (_req, res) => {
    const count = await storage.getPendingRevisionCount();
    res.json({ count });
  });

  app.get("/api/revisions/pending", requireAuth, requireRole(...CAN_ACCESS_REVIEW_QUEUE), async (_req, res) => {
    const pending = await storage.getPendingRevisions();
    res.json(pending);
  });

  app.get("/api/revisions", requireAuth, requireRole(...CAN_ACCESS_REVIEW_QUEUE), async (_req, res) => {
    const all = await storage.getAllRevisions();
    res.json(all);
  });

  app.patch("/api/revisions/:id", requireAuth, requireRole(...CAN_ACCESS_REVIEW_QUEUE), async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const { status, reviewNote } = req.body;

      const updated = await storage.updateRevisionStatus(id, status, reviewNote);

      if (status === "approved") {
        await storage.updateArticle(updated.articleId, {
          content: updated.content,
          infoboxData: updated.infoboxData,
          summary: updated.summary,
          status: "published",
        });
        await generateCrosslinks(updated.articleId);
      }

      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.post("/api/citations/validate", async (req, res) => {
    const { url, text, format } = req.body;
    const urlResult = url ? await validateCitationUrl(url) : { isValid: true };
    const formatResult = validateCitationFormat(text || "", format || "APA");
    res.json({
      urlValid: urlResult.isValid,
      urlError: urlResult.errorMessage,
      formatValid: formatResult.isValid,
      formatError: formatResult.errorMessage,
    });
  });

  app.get("/api/stats", async (_req, res) => {
    const stats = await storage.getStats();
    res.json(stats);
  });

  app.get("/api/users", requireAuth, requireRole("admin"), async (_req, res) => {
    const allUsers = await storage.getAllUsers();
    res.json(allUsers.map(({ password: _, ...u }) => u));
  });

  app.get("/api/dashboard", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const role = user.role as Role;

      const stats = await storage.getStats();
      const result: Record<string, unknown> = { stats };

      if (["admin", "executive", "staff", "partner"].includes(role)) {
        const userCount = await storage.getUserCount();
        (result.stats as Record<string, unknown>).totalUsers = userCount;
      }

      if (role === "admin") {
        const allUsers = await storage.getAllUsers();
        const usersByRole: Record<string, number> = {};
        for (const u of allUsers) {
          usersByRole[u.role] = (usersByRole[u.role] || 0) + 1;
        }
        result.usersByRole = usersByRole;
        result.users = allUsers.map(({ password: _, ...u }) => u);
      }

      const contributions = await storage.getRevisionsByAuthor(user.username);
      result.myContributions = contributions.map((r) => ({
        id: r.id,
        articleId: r.articleId,
        articleTitle: r.article.title,
        articleSlug: r.article.slug,
        editSummary: r.editSummary,
        status: r.status,
        createdAt: r.createdAt,
      }));

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  return httpServer;
}
