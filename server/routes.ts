import type { Express } from "express";
import { createServer, type Server } from "http";
import { readFileSync } from "fs";
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
import { insertArtistSchema, insertAlbumSchema, insertProductSchema, insertProjectSchema, insertChangelogSchema, insertServiceSchema, updateProfileSchema } from "@shared/schema";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
import { sendContactEmail } from "./emailClient";
import bcrypt from "bcryptjs";

const CAN_MANAGE_MUSIC: Role[] = ["admin", "executive", "staff"];
const CAN_MANAGE_STORE: Role[] = ["admin", "executive", "staff"];
const CAN_MANAGE_STORE_PRODUCTS: Role[] = ["admin", "executive"];
const CAN_MANAGE_PROJECTS: Role[] = ["admin", "executive", "staff"];
const CAN_MANAGE_CHANGELOG: Role[] = ["admin", "executive", "staff"];

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

async function seedPolicyArticles() {
  const POLICY_ARTICLES = [
    {
      slug: "privacy-policy",
      title: "Privacy Policy",
      content: `# Privacy Policy\n\nLast updated: March 2026\n\n## Introduction\n\nSEVCO ("we", "us", or "our") is committed to protecting your personal information. This Privacy Policy explains how we collect, use, and safeguard your data when you use the SEVCO Platform.\n\n## Information We Collect\n\nWe may collect information you provide directly, such as account registration details, and information generated automatically through your use of the platform.\n\n## How We Use Your Information\n\nWe use collected information to provide and improve our services, communicate with you, and ensure platform security.\n\n## Contact\n\nIf you have questions about this policy, please visit our [Contact](/wiki/contact) page.`,
      summary: "SEVCO Platform Privacy Policy — how we collect and use your data.",
    },
    {
      slug: "terms-of-service",
      title: "Terms of Service",
      content: `# Terms of Service\n\nLast updated: March 2026\n\n## Acceptance\n\nBy accessing the SEVCO Platform, you agree to these Terms of Service. If you do not agree, please do not use our platform.\n\n## Use of the Platform\n\nYou agree to use the SEVCO Platform only for lawful purposes and in compliance with all applicable laws and regulations.\n\n## Intellectual Property\n\nAll content on the SEVCO Platform, including text, graphics, logos, and images, is the property of SEVCO and protected by applicable intellectual property laws.\n\n## Limitation of Liability\n\nSEVCO shall not be liable for any indirect, incidental, or consequential damages arising from your use of the platform.\n\n## Changes to Terms\n\nWe reserve the right to modify these terms at any time. Continued use of the platform constitutes acceptance of updated terms.`,
      summary: "SEVCO Platform Terms of Service — the rules governing your use of the platform.",
    },
    {
      slug: "contact",
      title: "Contact",
      content: `# Contact SEVCO\n\n## Get in Touch\n\nWe'd love to hear from you. Whether you have a question, feedback, or a business inquiry, reach out through one of the channels below.\n\n## Social Media\n\nThe fastest way to reach us is through our social channels:\n\n- **Instagram**: [@sevelovesyou](https://instagram.com/sevelovesyou)\n- **X / Twitter**: [@sevelovesu](https://x.com/sevelovesu)\n- **TikTok**: [@sevelovesu](https://www.tiktok.com/@sevelovesu)\n\n## Business Inquiries\n\nFor partnerships, press, and business inquiries, please reach out via our official social channels or through your designated SEVCO contact if you are an existing partner or client.\n\n## Platform Support\n\nFor issues related to your SEVCO Platform account, please use the account settings page or reach out via social media.`,
      summary: "How to get in touch with SEVCO.",
    },
    {
      slug: "refund-policy",
      title: "Refund Policy",
      content: `# Refund Policy\n\nLast updated: March 2026\n\n## Overview\n\nSEVCO is committed to your satisfaction. This Refund Policy outlines the conditions under which refunds are available for purchases made through the SEVCO Platform.\n\n## Physical Products\n\nPhysical merchandise purchased through the SEVCO Store may be returned within 30 days of receipt if the item is unused, in its original packaging, and in the same condition you received it.\n\n## Digital Products\n\nDue to the nature of digital goods, all sales of digital products and downloads are final and non-refundable unless the product is defective or not as described.\n\n## How to Request a Refund\n\nTo initiate a refund, please contact us through our [Contact](/wiki/contact) page with your order details.\n\n## Processing Time\n\nApproved refunds are processed within 5–10 business days and returned to your original payment method.`,
      summary: "SEVCO Store Refund Policy — returns, exchanges, and refund eligibility.",
    },
  ];

  const generalCategory = await storage.getCategoryBySlug("general");
  if (!generalCategory) return;

  for (const article of POLICY_ARTICLES) {
    const existing = await storage.getArticleBySlug(article.slug);
    if (!existing) {
      await storage.createArticle({
        title: article.title,
        slug: article.slug,
        content: article.content,
        summary: article.summary,
        categoryId: generalCategory.id,
        status: "published",
      });
    }
  }
}

async function seedChangelog() {
  const existing = await storage.getChangelog();
  if (existing.length > 0) return;

  const INITIAL_ENTRIES = [
    {
      title: "Role-Based Access Control (RBAC)",
      description: "Implemented a full RBAC system with six roles: Admin, Executive, Staff, Partner, Client, and User. Each role has tailored permissions across the platform.",
      category: "feature" as const,
    },
    {
      title: "Platform Shell & Navigation",
      description: "Built the global platform shell including the persistent header with app switcher, wiki sidebar, and platform footer with social links and site map.",
      category: "feature" as const,
    },
    {
      title: "Landing Page & Dashboard",
      description: "Launched the landing page with platform overview and role-adaptive dashboard showing stats, contributions, user management, and quick access links.",
      category: "feature" as const,
    },
    {
      title: "SEVCO Music (SEVCO RECORDS)",
      description: "Added the Music section featuring artist profiles, album listings with track lists, and management tools for staff and above.",
      category: "feature" as const,
    },
    {
      title: "SEVCO Store",
      description: "Launched the Store section with product catalog, category filtering, stock status display, and admin product management.",
      category: "feature" as const,
    },
    {
      title: "SEVCO Projects (Ventures)",
      description: "Introduced the Projects section showcasing SEVCO Ventures with status tracking, team leads, website links, and wiki cross-references.",
      category: "feature" as const,
    },
    {
      title: "Logo & Favicon Polish",
      description: "Updated the platform to use the official SEVCO wordmark and planet icon across the header, footer, wiki sidebar, and browser tab favicon.",
      category: "improvement" as const,
    },
    {
      title: "Platform Polish & Dashboard Changelog",
      description: "Fixed content clipping across store and project cards. Added wiki sidebar last-updated date, relocated sidebar toggle, updated footer to use wordmark, linked policy pages to internal wiki articles, and introduced this changelog feed.",
      category: "improvement" as const,
    },
  ];

  for (const entry of INITIAL_ENTRIES) {
    await storage.createChangelogEntry(entry);
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  seedPolicyArticles().catch(console.error);
  seedChangelog().catch(console.error);

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

  app.get("/api/articles/latest-update", async (_req, res) => {
    try {
      const date = await storage.getLatestArticleUpdatedAt();
      res.json({ updatedAt: date });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
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

  app.get("/api/music/artists", async (_req, res) => {
    try {
      const all = await storage.getArtists();
      res.json(all);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/music/artists/:slug", async (req, res) => {
    try {
      const artist = await storage.getArtistBySlug(req.params.slug);
      if (!artist) return res.status(404).json({ message: "Artist not found" });
      const artistAlbums = await storage.getAlbumsByArtist(artist.id);
      res.json({ ...artist, albums: artistAlbums });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/music/artists", requireAuth, requireRole(...CAN_MANAGE_MUSIC), async (req, res) => {
    try {
      const data = insertArtistSchema.parse(req.body);
      const artist = await storage.createArtist(data);
      res.json(artist);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.get("/api/music/albums", async (_req, res) => {
    try {
      const all = await storage.getAlbums();
      res.json(all);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/music/albums/:slug", async (req, res) => {
    try {
      const album = await storage.getAlbumBySlug(req.params.slug);
      if (!album) return res.status(404).json({ message: "Album not found" });
      res.json(album);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/music/albums", requireAuth, requireRole(...CAN_MANAGE_MUSIC), async (req, res) => {
    try {
      const data = insertAlbumSchema.parse(req.body);
      const allArtists = await storage.getArtists();
      const artistExists = allArtists.some((a) => a.id === data.artistId);
      if (!artistExists) return res.status(400).json({ message: "Artist not found" });
      const album = await storage.createAlbum(data);
      res.json(album);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.get("/api/store/products", async (_req, res) => {
    try {
      const all = await storage.getProducts();
      res.json(all);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/store/products/new", (_req, res) => {
    res.status(400).json({ message: "Use POST to create a product" });
  });

  app.get("/api/store/products/:slug", async (req, res) => {
    try {
      const product = await storage.getProductBySlug(req.params.slug);
      if (!product) return res.status(404).json({ message: "Product not found" });
      res.json(product);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/store/products", requireAuth, requireRole(...CAN_MANAGE_STORE_PRODUCTS), async (req, res) => {
    try {
      const data = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(data);

      try {
        const stripe = await getUncachableStripeClient();
        const stripeProduct = await stripe.products.create({
          name: product.name,
          description: product.description || undefined,
          images: product.imageUrl ? [product.imageUrl] : undefined,
          metadata: {
            internalId: String(product.id),
            category: product.categoryName,
            slug: product.slug,
          },
        });
        const stripePrice = await stripe.prices.create({
          product: stripeProduct.id,
          unit_amount: Math.round(product.price * 100),
          currency: 'usd',
        });
        const updated = await storage.updateProduct(product.id, {
          stripeProductId: stripeProduct.id,
          stripePriceId: stripePrice.id,
        });
        res.json(updated);
      } catch (stripeErr: any) {
        console.error('Stripe sync error for product:', stripeErr.message);
        res.json(product);
      }
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/store/products/:id", requireAuth, requireRole(...CAN_MANAGE_STORE_PRODUCTS), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid product id" });
      const { stockStatus } = req.body;
      if (!stockStatus || typeof stockStatus !== "string") return res.status(400).json({ message: "stockStatus required" });
      const product = await storage.updateProductStockStatus(id, stockStatus);
      res.json(product);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/stripe/publishable-key", async (_req, res) => {
    try {
      const key = await getStripePublishableKey();
      res.json({ publishableKey: key });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/store/products/:id", requireAuth, requireRole(...CAN_MANAGE_STORE_PRODUCTS), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid product id" });
      await storage.deleteProduct(id);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/store/stats", requireAuth, requireRole(...CAN_MANAGE_STORE), async (_req, res) => {
    try {
      const stats = await storage.getStoreStats();
      res.json(stats);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/checkout", requireAuth, async (req, res) => {
    try {
      const { items } = req.body as {
        items: Array<{ productId: number; name: string; price: number; quantity: number; stripePriceId: string | null }>;
      };

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "Cart is empty" });
      }

      const lineItems: any[] = [];
      for (const item of items) {
        if (item.stripePriceId) {
          lineItems.push({ price: item.stripePriceId, quantity: item.quantity });
        } else {
          lineItems.push({
            price_data: {
              currency: 'usd',
              product_data: { name: item.name },
              unit_amount: Math.round(item.price * 100),
            },
            quantity: item.quantity,
          });
        }
      }

      const host = req.get('host');
      const proto = req.headers['x-forwarded-proto'] || req.protocol;
      const baseUrl = `${proto}://${host}`;

      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: `${baseUrl}/store/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/store/cancel`,
        metadata: {
          userId: (req.user as any)?.id || '',
        },
      });

      res.json({ url: session.url });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/checkout/session/:sessionId", requireAuth, async (req, res) => {
    try {
      const { sessionId } = req.params;
      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['line_items'],
      });

      if (session.payment_status !== 'paid') {
        return res.json({ paid: false, session });
      }

      const existing = await storage.getOrderBySessionId(sessionId);
      if (existing) {
        return res.json({ paid: true, order: existing });
      }

      const order = await storage.createOrder({
        userId: (req.user as any)?.id || null,
        stripeSessionId: sessionId,
        stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : null,
        total: session.amount_total || 0,
        status: 'paid',
        items: (session.line_items?.data || []).map((li: any) => ({
          description: li.description,
          quantity: li.quantity,
          amount_total: li.amount_total,
        })),
      });

      res.json({ paid: true, order });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/orders", requireAuth, requireRole("admin", "executive"), async (_req, res) => {
    try {
      const allOrders = await storage.getOrders();
      res.json(allOrders);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/projects", async (_req, res) => {
    try {
      const all = await storage.getProjects();
      res.json(all);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/projects/new", (_req, res) => {
    res.status(400).json({ message: "Use POST to create a project" });
  });

  app.get("/api/projects/:slug", async (req, res) => {
    try {
      const project = await storage.getProjectBySlug(req.params.slug);
      if (!project) return res.status(404).json({ message: "Project not found" });
      res.json(project);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/projects", requireAuth, requireRole(...CAN_MANAGE_PROJECTS), async (req, res) => {
    try {
      const data = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(data);
      res.json(project);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/projects/:id", requireAuth, requireRole(...CAN_MANAGE_PROJECTS), async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid project id" });
      const data = insertProjectSchema.partial().parse(req.body);
      const project = await storage.updateProject(id, data);
      res.json(project);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.get("/api/changelog", requireAuth, requireRole(...CAN_MANAGE_CHANGELOG), async (_req, res) => {
    try {
      const entries = await storage.getChangelog();
      res.json(entries);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/changelog", requireAuth, requireRole(...CAN_MANAGE_CHANGELOG), async (req, res) => {
    try {
      const data = insertChangelogSchema.parse(req.body);
      const entry = await storage.createChangelogEntry(data);
      res.json(entry);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.get("/api/users", requireAuth, requireRole("admin"), async (_req, res) => {
    const allUsers = await storage.getAllUsers();
    res.json(allUsers.map(({ password: _, ...u }) => u));
  });

  app.get("/api/dashboard", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const role = user.role as Role;
      const isPrivileged = ["admin", "executive", "staff", "partner"].includes(role);

      const result: Record<string, unknown> = {};

      if (isPrivileged) {
        const stats = await storage.getStats();
        const userCount = await storage.getUserCount();
        result.stats = { ...stats, totalUsers: userCount };
      } else {
        result.stats = {};
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

      if (isPrivileged) {
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
      }

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  const CAN_MANAGE_SERVICES: Role[] = ["admin", "executive"];

  app.get("/api/services", async (req, res) => {
    try {
      const all = await storage.getServices();
      const showAll = req.query.all === "true" && req.isAuthenticated() &&
        ["admin", "executive", "staff"].includes((req.user as any)?.role ?? "");
      const result = showAll ? all : all.filter((s) => s.status === "active");
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/services/:slug", async (req, res) => {
    try {
      const service = await storage.getServiceBySlug(req.params.slug);
      if (!service) return res.status(404).json({ message: "Service not found" });
      res.json(service);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/services", requireAuth, requireRole(...CAN_MANAGE_SERVICES), async (req, res) => {
    try {
      const data = insertServiceSchema.parse(req.body);
      const service = await storage.createService(data);
      res.json(service);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/services/:id", requireAuth, requireRole(...CAN_MANAGE_SERVICES), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid service id" });
      const data = insertServiceSchema.partial().parse(req.body);
      const service = await storage.updateService(id, data);
      res.json(service);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/services/:id", requireAuth, requireRole(...CAN_MANAGE_SERVICES), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid service id" });
      await storage.deleteService(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/internal/wiki-article", async (req, res) => {
    try {
      const secret = process.env.WIKI_AUTO_ARTICLE_SECRET;
      if (!secret) {
        return res.status(503).json({ message: "Internal endpoint not configured" });
      }
      const provided = req.headers["x-internal-secret"];
      if (provided !== secret) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { title, slug, summary, content, tags } = req.body;
      if (!title || !slug || !content) {
        return res.status(400).json({ message: "title, slug, and content are required" });
      }

      const engineeringCat = await storage.getCategoryBySlug("engineering");
      if (!engineeringCat) {
        return res.status(500).json({ message: "Engineering category not found" });
      }

      let peter = await storage.getUserByUsername("Peter");
      if (!peter) {
        const hashed = await bcrypt.hash(Math.random().toString(36), 10);
        peter = await storage.createUser({ username: "Peter", password: hashed });
        await storage.updateUserRole(peter.id, "admin");
      }

      const existing = await storage.getArticleBySlug(slug);
      if (existing) {
        const updated = await storage.updateArticle(existing.id, {
          title,
          summary: summary || existing.summary,
          content,
          tags: tags || existing.tags,
          status: "published",
        });
        await storage.createRevision({
          articleId: updated.id,
          content: updated.content,
          summary: updated.summary,
          editSummary: "Auto-updated by wiki article generator on merge",
          status: "approved",
          authorName: "Peter",
        });
        await generateCrosslinks(updated.id);
        return res.json({ action: "updated", article: updated });
      }

      const article = await storage.createArticle({
        title,
        slug,
        content,
        summary: summary || null,
        categoryId: engineeringCat.id,
        status: "published",
        tags: tags || [],
      });

      await storage.createRevision({
        articleId: article.id,
        content: article.content,
        summary: article.summary,
        editSummary: "Auto-created by wiki article generator on merge",
        status: "approved",
        authorName: "Peter",
      });

      await generateCrosslinks(article.id);

      res.json({ action: "created", article });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Profile routes
  app.get("/api/profile/:username", async (req, res) => {
    try {
      const user = await storage.getUserByUsername(req.params.username);
      if (!user) return res.status(404).json({ message: "User not found" });
      const { password, emailVerificationToken, emailVerificationExpires, ...publicUser } = user;
      res.json(publicUser);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/profile", requireAuth, async (req: any, res) => {
    try {
      const parsed = updateProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid input" });
      }
      const updated = await storage.updateUserProfile(req.user.id, parsed.data);
      const { password, emailVerificationToken, emailVerificationExpires, ...publicUser } = updated;
      res.json(publicUser);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Contact form rate limiting: max 3 per IP per hour
  const contactRateMap = new Map<string, { count: number; resetAt: number }>();

  app.post("/api/contact", async (req, res) => {
    try {
      const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.socket.remoteAddress ?? "unknown";
      const now = Date.now();
      const entry = contactRateMap.get(ip);

      if (entry && now < entry.resetAt) {
        if (entry.count >= 3) {
          return res.status(429).json({ message: "Too many submissions. Please try again later." });
        }
        entry.count += 1;
      } else {
        contactRateMap.set(ip, { count: 1, resetAt: now + 60 * 60 * 1000 });
      }

      const { z } = await import("zod");
      const schema = z.object({
        name: z.string().min(1, "Name is required"),
        email: z.string().email("Valid email required"),
        subject: z.enum(["Support", "Business Inquiry", "Press", "Other"]),
        message: z.string().min(10, "Message must be at least 10 characters"),
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid input" });
      }

      const { name, email, subject, message } = parsed.data;

      try {
        await sendContactEmail(name, email, subject, message);
      } catch (emailErr: any) {
        console.error("[contact] Email send failed:", emailErr.message);
        return res.status(502).json({ message: "Failed to send message. Please try again." });
      }

      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  return httpServer;
}
