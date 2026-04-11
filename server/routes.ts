import type { Express } from "express";
import { createServer, type Server } from "http";
import { readFileSync, existsSync, statSync, readdirSync } from "fs";
import { z } from "zod";
import { storage } from "./storage";
import {
  requireAuth,
  requireRole,
  CAN_CREATE_ARTICLE,
  CAN_PUBLISH_ARTICLES,
  CAN_ACCESS_REVIEW_QUEUE,
  CAN_DELETE_ARTICLE,
  CAN_ACCESS_ARCHIVE,
} from "./middleware/permissions";
import type { Role, InsertJob, InsertArticle, InsertCategory, Email, NewsItem } from "@shared/schema";
import { insertArtistSchema, insertAlbumSchema, insertProductSchema, insertStoreCategorySchema, insertCategorySchema, insertProjectSchema, insertChangelogSchema, insertServiceSchema, updateProfileSchema, insertJobSchema, insertJobApplicationSchema, insertPlaylistSchema, insertMusicSubmissionSchema, insertNoteSchema, insertFeedPostSchema, insertPostSchema, insertPostReplySchema, insertResourceSchema, insertGalleryImageSchema, insertStaffOrgNodeSchema, insertChatChannelSchema, insertChatMessageSchema, insertFinanceProjectSchema, insertFinanceTransactionSchema, insertFinanceInvoiceSchema, insertSubscriptionSchema, insertMinecraftServerSchema, insertAiAgentSchema, insertNewsCategorySchema, updateUserTaskSchema, updateStaffTaskSchema, insertUserTaskSchema, insertStaffTaskSchema, insertDomainSchema, insertMusicTrackSchema, adminCreateUserSchema } from "@shared/schema";
import { InsufficientSparksError } from "./storage";
import { fetchNewsArticles, generateGrokSummaryForTweet } from "./news";
import { getAggregatorStatus, forceRefresh as forceAggregatorRefresh } from "./news-aggregator";
import { getNewsAiSettings, getMaxRequestsPerHour, getApiConfig, summarizeArticle as grokSummarize, generateNewsImage as grokImage, askGrokAboutArticle, searchNewsWithGrok, generateDailyBriefing, generateTrendingCommentary, streamSummarizeArticle, streamAskGrok } from "./grok-news";
import { fetchUserTweets, searchTweets, isXConfigured, fetchCategoryNewsFromX } from "./x-api";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
import { sendContactEmail, sendContactReplyEmail, sendInvoiceEmail, sendTestEmail } from "./emailClient";
import { getEmailAddress, isClientPlus, sendEmail, processInboundEmail, verifyResendWebhookSignature, type ResendSendFn } from "./email";
import { Resend } from "resend";
import bcrypt from "bcryptjs";
import * as hostinger from "./hostinger";
import { registerSpotifyRoutes } from "./spotify";
import { registerWikifyToolRoutes } from "./wikify-tool";
import { logWikiLlmUsage } from "./wiki-llm-cost";
import { resolveArticleLinks, resolveLinksInContent } from "./wiki-link-resolver";
import { registerLensProxy } from "./lens-proxy";
import { freeballRouter } from "./freeball-routes";
import { sitesRouter } from "./sites-routes";
import { canvasRouter } from "./canvas-routes";
import {
  getGA4Status,
  getRealtimeActiveUsers,
  getSummary,
  getSessionsOverTime,
  getTopPages,
  getTrafficSources,
  getCountryBreakdown,
  getDeviceSplit,
} from "./analytics";
import { isUsernameReserved } from "./usernameUtils";
import { db } from "./db";
import { sql, eq, and, desc } from "drizzle-orm";
import { posts, revisions, galleryImages, articles as articlesSchema, categories as categoriesSchema } from "@shared/schema";

const CAN_MANAGE_MUSIC: Role[] = ["admin", "executive"];
const CAN_MANAGE_STORE: Role[] = ["admin", "executive", "staff"];
const CAN_MANAGE_JOBS: Role[] = ["admin", "executive"];
const CAN_MANAGE_STORE_PRODUCTS: Role[] = ["admin", "executive", "staff"];
const CAN_MANAGE_PROJECTS: Role[] = ["admin", "executive", "staff"];
const CAN_MANAGE_CHANGELOG: Role[] = ["admin", "executive", "staff"];
const CAN_MANAGE_WIKI_SUBCATEGORIES: Role[] = ["admin", "executive", "staff"];
const CAN_DELETE_WIKI_SUBCATEGORIES: Role[] = ["admin", "executive"];

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

async function generateSemanticLinks(articleId: number): Promise<void> {
  try {
    const config = getApiConfig();
    if (!config) return;

    const allArticles = await storage.getArticles();
    const sourceArticle = allArticles.find((a) => a.id === articleId);
    if (!sourceArticle) return;

    const otherArticles = allArticles.filter((a) => a.id !== articleId && a.status === "published");
    if (otherArticles.length === 0) return;

    const contentSnippet = (sourceArticle.content || "").slice(0, 1500);
    const articleListText = otherArticles
      .map((a) => `- id:${a.id} | "${a.title}"`)
      .join("\n");

    const prompt = `You are a wiki editor assistant. Given the source article below, identify the 5-8 most semantically relevant other articles to cross-link from it.

SOURCE ARTICLE:
Title: ${sourceArticle.title}
Summary: ${sourceArticle.summary || "(none)"}
Content excerpt: ${contentSnippet}

OTHER PUBLISHED ARTICLES (id | title):
${articleListText}

Respond ONLY with a JSON array (no markdown fences) of objects. Each object must have:
- "targetArticleId": number (the id from the list above)
- "suggestedAnchorText": string (2-5 word phrase from the source article content that would serve as the link anchor)
- "suggestedContext": string (the sentence or phrase from the source content where the link would appear, max 150 chars)

Example: [{"targetArticleId": 42, "suggestedAnchorText": "music streaming platform", "suggestedContext": "The music streaming platform supports multiple formats."}]

Return an empty array [] if no strong semantic connections exist. Do not include articles that are already obviously linked or barely related.`;

    const startTime = Date.now();
    const res = await fetch(config.apiUrl, {
      method: "POST",
      headers: config.headers,
      body: JSON.stringify({
        model: config.modelName,
        messages: [
          { role: "system", content: "You are a wiki editor assistant. Respond ONLY with valid JSON." },
          { role: "user", content: prompt },
        ],
        max_tokens: 800,
        temperature: 0.2,
      }),
    });

    if (!res.ok) return;

    const data = await res.json() as { choices?: Array<{ message?: { content?: string } }>; usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } };
    const rawContent = data?.choices?.[0]?.message?.content?.trim() ?? "";
    const inputTokens = data?.usage?.prompt_tokens ?? 0;
    const outputTokens = data?.usage?.completion_tokens ?? 0;
    const tokenUsage = data?.usage?.total_tokens ?? (inputTokens + outputTokens);
    const elapsed = Date.now() - startTime;

    console.log(`[wiki-relink] article=${articleId} tokens=${tokenUsage} ms=${elapsed}`);

    logWikiLlmUsage({
      operation: "semantic_relink",
      model: config.modelName,
      inputTokens,
      outputTokens,
      articleId,
    }).catch(() => {});

    let parsed: Array<{ targetArticleId: number; suggestedAnchorText: string; suggestedContext: string }> = [];
    try {
      const cleaned = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
      if (!Array.isArray(parsed)) parsed = [];
    } catch {
      return;
    }

    const validTargetIds = new Set(otherArticles.map((a) => a.id));
    const suggestions = parsed
      .filter((s) => s && typeof s.targetArticleId === "number" && validTargetIds.has(s.targetArticleId))
      .slice(0, 8)
      .map((s) => ({
        sourceArticleId: articleId,
        targetArticleId: s.targetArticleId,
        suggestedAnchorText: String(s.suggestedAnchorText || "").slice(0, 120),
        suggestedContext: String(s.suggestedContext || "").slice(0, 200),
        status: "pending" as const,
      }));

    await storage.upsertWikiLinkSuggestions(articleId, suggestions);
  } catch (err) {
    console.error("[wiki-relink] error:", err);
  }
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

  type SeededEntry = { title: string; description: string; category: "feature" | "fix" | "improvement" | "other"; version: string; date: string };
  const INITIAL_ENTRIES: SeededEntry[] = [
    {
      title: "Wiki MVP & Platform Shell",
      description: "Launched the internal wiki with article creation, categorization, revision history, and citation support. Built the global platform shell including persistent header, app switcher, wiki sidebar, and platform footer with social links.",
      category: "feature",
      version: "0.1.0",
      date: "2026-02-15",
    },
    {
      title: "Platform Auth & RBAC",
      description: "Added full user authentication with six role tiers: Admin, Executive, Staff, Partner, Client, and User. Each role has tailored permissions across the platform. Added role-adaptive dashboard with stats and contributor views.",
      category: "feature",
      version: "0.2.0",
      date: "2026-02-22",
    },
    {
      title: "Landing Page, Store & Projects",
      description: "Launched the home landing page with platform overview. Launched the SEVCO Store with product catalog, category filtering, stock status, and Stripe-powered checkout. Introduced the Projects section showcasing SEVCO Ventures with status tracking.",
      category: "feature",
      version: "0.3.0",
      date: "2026-03-01",
    },
    {
      title: "Home Page, Mega-Menu, Contact & Music",
      description: "Introduced mega-menu navigation with per-section dropdowns. Added Contact page with Resend email integration. Added Profile, Jobs listing, and policy wiki pages. Added SEVCO Music with artist profiles, album listings, and management tools for staff and above.",
      category: "feature",
      version: "1.0.0",
      date: "2026-03-10",
    },
    {
      title: "Services & SEVCO Records Expansion",
      description: "Added the Services page with filterable categories and admin CRUD. Expanded SEVCO Records with playlist management, music submissions, and a global Spotify player bar. Admin social link management added to Command Center footer settings.",
      category: "feature",
      version: "1.1.0",
      date: "2026-03-20",
    },
    {
      title: "Wiki Archive System & Version Changelog",
      description: "Replaced wiki article deletion with an archive workflow. Archived articles are hidden from the public and accessible only to staff+. Staff can edit and submit archived articles for republication; admins can publish directly. Added semantic versioning to changelog entries. Footer now displays the current platform version pulled live from the latest changelog entry.",
      category: "feature",
      version: "1.2.0",
      date: "2026-03-25",
    },
  ];

  for (const entry of INITIAL_ENTRIES) {
    await storage.createChangelogEntryWithDate({
      title: entry.title,
      description: entry.description,
      category: entry.category,
      version: entry.version,
    }, new Date(entry.date));
  }
}

async function seedMinecraftServers() {
  const existing = await storage.getAllMinecraftServers();
  if (existing.length > 0) return;
  await storage.createMinecraftServer({
    name: "SEVCO SMP",
    host: "smp.sevco.us",
    description: "The classic SEVCO survival experience. Build, explore, and thrive with the community.",
    gameMode: "survival",
    colorTheme: "emerald",
    voteLinks: [
      { name: "Planet Minecraft", url: "https://www.planetminecraft.com" },
      { name: "Minecraft Server List", url: "https://minecraft-server-list.com" },
      { name: "TopG", url: "https://topg.org" },
    ],
    isActive: true,
    displayOrder: 0,
  });
  await storage.createMinecraftServer({
    name: "SEVCO Creative",
    host: "creative.sevco.us",
    description: "Unlimited plots, world-edit access, and a community of builders pushing the limits.",
    gameMode: "creative",
    colorTheme: "green",
    voteLinks: [
      { name: "Planet Minecraft", url: "https://www.planetminecraft.com" },
      { name: "Minecraft Server List", url: "https://minecraft-server-list.com" },
    ],
    isActive: true,
    displayOrder: 1,
  });
}

async function seedMinecraftProject() {
  const existing = await storage.getProjectBySlug("minecraft");
  if (existing) {
    const needsUpdate =
      existing.type !== "Game Server" ||
      existing.websiteUrl !== "/minecraft" ||
      existing.name !== "Minecraft" ||
      existing.status !== "active" ||
      existing.featured !== true;
    if (needsUpdate) {
      await storage.updateProject(existing.id, {
        name: "Minecraft",
        type: "Game Server",
        websiteUrl: "/minecraft",
        status: "active",
        featured: true,
        menuIcon: existing.menuIcon || "Server",
      });
    }
    return;
  }
  await storage.createProject({
    name: "Minecraft",
    slug: "minecraft",
    description: "Play on the official SEVCO Minecraft servers — survival, creative, and more. Join the community and start building.",
    longDescription: "SEVCO hosts community Minecraft servers for players of all styles. Join the SMP for a classic survival experience or hop on the Creative server to build without limits. Both servers are community-managed with active staff and regular events.",
    status: "active",
    type: "Game Server",
    category: "Gaming",
    websiteUrl: "/minecraft",
    featured: true,
    tags: ["minecraft", "gaming", "community", "multiplayer"],
    menuIcon: "Server",
  });
}

async function seedRecordsProject() {
  const existing = await storage.getProjectBySlug("sevco-records");
  if (existing) {
    if (existing.linkUrl !== "/music") {
      await storage.updateProject(existing.id, { linkUrl: "/music" });
    }
    return;
  }
  await storage.createProject({
    name: "SEVCO RECORDS",
    slug: "sevco-records",
    description: "The official SEVCO record label — music, artists, and releases.",
    status: "active",
    type: "Record Label",
    linkUrl: "/music",
    featured: true,
    tags: ["music", "records", "label"],
    menuIcon: "Music",
  });
}

async function seedChangelogV13() {
  const existing = await storage.getChangelog();
  const alreadySeeded = existing.some((e) => e.version === "1.3.0");
  if (alreadySeeded) return;
  await storage.createChangelogEntryWithDate({
    title: "Platform Expansion: Minecraft, Chat, Finance, Staff, Support, Media",
    description: "Added Minecraft server hub with live status, game modes, and a CMD admin tab for server management. Launched platform-wide real-time chat with channels, DMs, and role-gated AI agents. Finance CMD gained a Subscriptions tab. Invoice and support emails now send via Resend. Brand asset logo preview and hero logo upload added to Command Center. Services mega-menu reorganized with new categories. Platform-wide hover tooltips added to all icon buttons.",
    category: "feature",
    version: "1.3.0",
  }, new Date("2026-03-26"));
}

async function seedChangelogV181() {
  const existing = await storage.getChangelog();
  const alreadySeeded = existing.some((e) => e.version === "1.8.1");
  if (alreadySeeded) return;
  await storage.createChangelogEntryWithDate({
    title: "Subscriptions Tab, Email Fixes & AI Chat Agents",
    description: "CMD Finance now includes a full Subscriptions tab for managing recurring billing plans, subscriber records, and billing overrides. Fixed transactional email delivery for invoice, support, and notification emails via Resend. AI chat agents are now fully role-gated: admins can configure agent personas and system prompts per channel, and users interact with context-aware assistants in real time.",
    category: "feature",
    version: "1.8.1",
  }, new Date("2026-03-26"));
}

async function seedJobs() {
  const existing = await storage.getJobs(true);
  if (existing.length > 0) return;
  const JOB_SEED: InsertJob[] = [
    {
      title: "Frontend Engineer",
      slug: "frontend-engineer",
      department: "Engineering",
      type: "full-time",
      location: "Remote",
      remote: true,
      description: "We're looking for a skilled Frontend Engineer to help build and maintain the SEVCO Platform. You'll work closely with design and backend teams to deliver fast, accessible, and beautiful web experiences.\n\n## What You'll Do\n- Build new features across the SEVCO Platform\n- Collaborate on design implementation with the design team\n- Write clean, maintainable TypeScript and React code\n- Participate in code reviews and architectural decisions\n\n## What We Offer\n- Fully remote, flexible hours\n- Competitive compensation\n- Direct access to leadership\n- A creative, fast-moving environment",
      requirements: "- 2+ years of React experience\n- Strong TypeScript skills\n- Experience with REST APIs\n- Eye for design and detail\n- Bonus: Tailwind CSS, shadcn/ui",
      salaryMin: 80000,
      salaryMax: 120000,
      status: "open",
      featured: true,
    },
    {
      title: "A&R Coordinator",
      slug: "ar-coordinator",
      department: "SEVCO Records",
      type: "part-time",
      location: "Remote",
      remote: true,
      description: "SEVCO Records is growing and we need an A&R Coordinator to help us find and develop new talent. You'll be the bridge between emerging artists and our label infrastructure.\n\n## What You'll Do\n- Source and evaluate artist submissions\n- Conduct outreach to promising talent\n- Support artists through the onboarding process\n- Help coordinate release planning and promotion\n\n## What We Offer\n- Flexible, part-time role\n- Opportunity to shape SEVCO's artist roster\n- Creative, music-first environment",
      requirements: "- Passion for music and artist development\n- Strong communication skills\n- Experience in the music industry preferred\n- Familiarity with streaming platforms and social media trends",
      salaryMin: null,
      salaryMax: null,
      status: "open",
      featured: true,
    },
    {
      title: "Community Manager",
      slug: "community-manager",
      department: "Operations",
      type: "full-time",
      location: "Remote",
      remote: true,
      description: "We're looking for an enthusiastic Community Manager to grow and support the SEVCO community across Discord, social media, and the platform itself.\n\n## What You'll Do\n- Moderate and grow the SEVCO Discord server\n- Create and schedule social media content\n- Engage with community members and surface feedback\n- Plan and run community events and campaigns\n\n## What We Offer\n- Fully remote, flexible hours\n- Creative freedom\n- Be part of a growing platform from the ground floor",
      requirements: "- Experience managing online communities\n- Strong writing and communication skills\n- Familiarity with Discord, Instagram, TikTok, and X\n- Passion for building communities",
      salaryMin: 50000,
      salaryMax: 70000,
      status: "open",
      featured: false,
    },
    {
      title: "Brand Designer",
      slug: "brand-designer",
      department: "Design",
      type: "contract",
      location: "Remote",
      remote: true,
      description: "We need a talented Brand Designer to help define and expand the visual identity of the SEVCO Platform and its sub-brands including SEVCO Records and the SEV Store.\n\n## What You'll Do\n- Develop brand assets for campaigns and launches\n- Collaborate on product design and UI improvements\n- Create social graphics, merch designs, and marketing materials\n- Maintain and evolve the SEVCO design system\n\n## What We Offer\n- Contract-to-hire opportunity\n- Creative ownership over brand evolution\n- Collaborative, design-forward team",
      requirements: "- Strong portfolio of brand and visual design work\n- Proficiency in Figma\n- Experience with motion design a plus\n- Understanding of digital-first brand systems",
      salaryMin: null,
      salaryMax: null,
      status: "open",
      featured: false,
    },
  ];
  for (const job of JOB_SEED) {
    await storage.createJob(job);
  }
}

type EngineeringTask = {
  taskNum: number;
  slug: string;
  title: string;
  summary: string;
  content: string;
  version: string | null;
};

const ENGINEERING_TASKS: EngineeringTask[] = [
  {
    taskNum: 1,
    slug: "eng-task-1-rbac-role-permission-system",
    title: "Task #1 — RBAC & Role Permission System",
    summary: "Add a role-based access control system with six role tiers that control what each user can see and do across the platform.",
    content: `# Task #1 — RBAC & Role Permission System\n\n## Summary\nAdded a role-based access control system to the SEVCO Platform. Every user gets one of six roles: Admin, Executive, Staff, Partner, Client, or User. Roles control what each person can see and do across the platform.\n\n## What Was Built\n- Added a \`role\` field to the users table with an enum of: admin, executive, staff, partner, client, user (default: user)\n- Built backend middleware to enforce role requirements on protected API routes\n- Created a \`usePermission\` hook on the frontend that returns whether the current user can perform a given action\n- Wiki UI hides or disables "New Article" for Client and User roles, and hides "Review Queue" for everyone except Admin and Executive\n- Admins can update any user's role via the account management API (PATCH /api/users/:id/role)\n- Role is included in the session/user object returned by GET /api/user\n\n## Technical Notes\n- Uses a PostgreSQL enum for role values\n- Role checks are enforced server-side via \`requireRole\` middleware\n- Frontend \`usePermission\` hook derives permissions from the current user's role`,
    version: "0.2.0",
  },
  {
    taskNum: 2,
    slug: "eng-task-2-platform-shell-global-navigation",
    title: "Task #2 — Platform Shell & Global Navigation",
    summary: "Built a persistent global header bar wrapping all platform apps, with app switcher, branding, and user menu.",
    content: `# Task #2 — Platform Shell & Global Navigation\n\n## Summary\nWrapped the wiki and all platform apps inside a top-level SEVCO Platform shell with persistent global navigation.\n\n## What Was Built\n- Global header visible on all authenticated platform pages\n- Header shows: SEVCO wordmark/logo, app-switcher navigation, user avatar + role badge + sign-out\n- App switcher routes to: / (Home), /wiki, /music, /store, /projects, /dashboard\n- Wiki section retains its collapsible sidebar under /wiki\n- Non-wiki sections render without the wiki sidebar\n- Active app is visually highlighted in the global nav\n- Responsive layout — app-switcher collapses on mobile\n- Stub pages created for Music, Store, Projects, and Dashboard\n\n## Technical Notes\n- Uses wouter for routing\n- SidebarProvider and AppSidebar components power the wiki sidebar\n- PlatformHeader component handles global nav rendering`,
    version: "0.1.0",
  },
  {
    taskNum: 3,
    slug: "eng-task-3-landing-page-dashboard",
    title: "Task #3 — Landing Page & Dashboard",
    summary: "Built the main platform landing page and a role-aware dashboard with analytics and management views.",
    content: `# Task #3 — Landing Page & Dashboard\n\n## Summary\nBuilt the platform landing page and a role-aware dashboard.\n\n## What Was Built\n- The / landing page greets users by name, shows platform app cards, and displays recent wiki activity\n- The /dashboard provides role-adaptive views: Admins see user stats and all activity; Executives see business KPIs; Staff and Partners see their own contributions\n- Placeholder pages converted to proper content-bearing pages\n- Dashboard stats include article counts, user counts, pending review counts, and recent revision activity\n\n## Technical Notes\n- Role-based rendering uses the usePermission hook\n- Stats are fetched from the /api/stats endpoint\n- Fully integrated with platform header and no wiki sidebar`,
    version: "0.3.0",
  },
  {
    taskNum: 4,
    slug: "eng-task-4-music-page-sevco-records",
    title: "Task #4 — Music Page — SEVCO RECORDS",
    summary: "Built the Music section (/music) for SEVCO RECORDS with artist profiles, album listings, and staff management tools.",
    content: `# Task #4 — Music Page — SEVCO RECORDS\n\n## Summary\nBuilt the Music section of the SEVCO Platform for SEVCO RECORDS.\n\n## What Was Built\n- /music hub page with artist and album highlights\n- /music/artists lists all artists with their genres and bios\n- /music/artists/:slug shows artist detail with bio and album list\n- /music/albums/:slug shows album detail with title, artist, release year, and track listing\n- Admin/Executive/Staff see "Add Artist" and "Add Album" buttons\n- Create forms for artists (name, slug, bio, genres) and albums (title, slug, release year, track list)\n\n## Technical Notes\n- Artists and albums stored in dedicated database tables\n- Track lists stored as JSONB\n- All pages use the global platform header with no wiki sidebar`,
    version: "1.0.0",
  },
  {
    taskNum: 5,
    slug: "eng-task-5-store-marketplace-section",
    title: "Task #5 — Store / Marketplace Section",
    summary: "Launched the SEVCO Store with product catalog, category filtering, stock status, and Stripe-powered checkout.",
    content: `# Task #5 — Store / Marketplace Section\n\n## Summary\nBuilt the Store section for SEVCO merchandise and offerings.\n\n## What Was Built\n- /store shows a catalog grid organized by category\n- /store/products/:slug shows product detail with title, description, price, category, and image\n- Category filtering via tabs\n- Admin/Executive/Staff can add products\n- Create product form: name, slug, description, price, category, stock status\n- Stripe integration for checkout\n- Stock status: available / sold out\n\n## Technical Notes\n- Products stored in the products table\n- Stripe product and price IDs stored on product records\n- Cart powered by CartProvider context`,
    version: "0.3.0",
  },
  {
    taskNum: 6,
    slug: "eng-task-6-projects-page-sevco-ventures",
    title: "Task #6 — Projects Page — SEVCO Ventures",
    summary: "Built the Projects section to showcase SEVCO's active companies, businesses, and ventures with status tracking.",
    content: `# Task #6 — Projects Page — SEVCO Ventures\n\n## Summary\nBuilt the Projects section to showcase SEVCO's portfolio of companies and ventures.\n\n## What Was Built\n- /projects shows a grid of all SEVCO projects with name, description, status badge (Active, In Development, Archived), and category/type tag\n- /projects/:slug shows project detail: full description, status, website link, team lead, related wiki articles, and key info\n- Project filtering by status\n- Admin/Executive/Staff can add and edit projects\n- Create/edit form captures: name, slug, description, status, type, website URL, team lead, and related wiki article slugs\n\n## Technical Notes\n- Projects stored in the projects table\n- Related wiki article slugs stored as a text array\n- Status and type are free-text with suggested values`,
    version: "0.3.0",
  },
  {
    taskNum: 7,
    slug: "eng-task-7-logo-favicon-update",
    title: "Task #7 — Logo & Favicon Update",
    summary: "Replaced placeholder logos, icons, and the favicon with real SEVCO brand assets across the platform.",
    content: `# Task #7 — Logo & Favicon Update\n\n## Summary\nReplaced all placeholder brand assets with real SEVCO logos and icons.\n\n## What Was Built\n- Replaced old elephant placeholder icon with real SEVCO wordmark and planet icon\n- Updated favicon to SEVCO brand asset\n- Auth and landing pages now display the real SEVCO logo\n- Five brand assets deployed: SEVCO wordmark (black + white), planet icon (black + white), elephant app icon\n\n## Technical Notes\n- Logo images placed in attached_assets and referenced via @assets/ import paths\n- Multiple logo variants for light/dark mode`,
    version: null,
  },
  {
    taskNum: 8,
    slug: "eng-task-8-logo-display-fix",
    title: "Task #8 — Logo Display Fix",
    summary: "Fixed broken logo assets from the background removal pass using CSS blend-mode techniques instead of processed images.",
    content: `# Task #8 — Logo Display Fix\n\n## Summary\nFixed broken logo display issues caused by the image processing in Task #7.\n\n## What Was Fixed\n- Background-removed files that had missing chunks were replaced\n- Black box artifacts in light mode wordmark images resolved\n- Dropped background-removed files; now uses original PNGs with CSS blend-mode techniques\n- Blend-mode naturally hides logo background color based on placement context\n\n## Technical Notes\n- CSS mix-blend-mode: multiply in light mode, screen in dark mode\n- No image processing required — pure CSS solution`,
    version: null,
  },
  {
    taskNum: 9,
    slug: "eng-task-9-logo-no-skew",
    title: "Task #9 — Prevent Logo Skewing on Resize",
    summary: "Fixed logo images from stretching or skewing when the browser window is resized to narrow widths.",
    content: `# Task #9 — Prevent Logo Skewing on Resize\n\n## Summary\nEnsured all logo/wordmark images preserve their aspect ratio at any window size.\n\n## What Was Fixed\n- Logo images now use fixed height with auto width, or max-width constraints\n- object-fit: contain applied where images are in flex containers\n- Tested across narrow, medium, and wide viewport widths\n\n## Technical Notes\n- Applied to PlatformHeader and AppSidebar logo components\n- No layout changes — purely aspect ratio preservation`,
    version: null,
  },
  {
    taskNum: 10,
    slug: "eng-task-10-platform-footer",
    title: "Task #10 — Platform Footer",
    summary: "Added a platform-level footer with social media links, sitemap, copyright notice, and policy links.",
    content: `# Task #10 — Platform Footer\n\n## Summary\nAdded a comprehensive platform footer to the SEVCO Platform.\n\n## What Was Built\n- PlatformFooter component with SEVCO branding\n- All social media links matching sevelovesyou.com\n- Internal sitemap linking key platform sections\n- Policy links (Privacy Policy, Terms of Service, Refund Policy)\n- Copyright notice\n- Footer appears on all non-auth pages\n\n## Technical Notes\n- Footer is part of the AppShell layout\n- Social links are hardcoded initially; later made admin-configurable (Task #32)`,
    version: "0.1.0",
  },
  {
    taskNum: 11,
    slug: "eng-task-11-pre-publish-fixes",
    title: "Task #11 — Pre-Publish Fixes",
    summary: "Fixed critical issues before public launch: product edit permissions, partner access restrictions, cart fixes, and stats preview.",
    content: `# Task #11 — Pre-Publish Fixes\n\n## Summary\nFixed critical issues identified before the platform's first public deployment.\n\n## What Was Fixed\n- Only admins and executives can edit products (enforced server-side)\n- Command Center hidden from Partner role\n- Cart edge cases resolved\n- Store stats preview page fixed\n- Various permission enforcement gaps closed\n\n## Technical Notes\n- Permission checks tightened across product edit routes\n- Role checks added to Command Center navigation guard`,
    version: null,
  },
  {
    taskNum: 12,
    slug: "eng-task-12-stripe-checkout-cart",
    title: "Task #12 — Stripe Checkout & Cart",
    summary: "Added a shopping cart and Stripe-powered checkout to the SEVCO Store with session-based order tracking.",
    content: `# Task #12 — Stripe Checkout & Cart\n\n## Summary\nImplemented full Stripe checkout flow with a persistent shopping cart.\n\n## What Was Built\n- Shopping cart with add/remove/quantity controls\n- Stripe Checkout Session creation via /api/store/checkout\n- Order tracking via Stripe session ID\n- Success and cancel redirect pages\n- Orders stored in the orders table with status tracking\n- Stripe webhook integration for payment confirmation\n\n## Technical Notes\n- CartProvider context manages cart state\n- Orders linked to users (optional) and Stripe session IDs\n- Webhook at /api/stripe/webhook processes payment_intent.succeeded events`,
    version: "0.3.0",
  },
  {
    taskNum: 13,
    slug: "eng-task-13-platform-polish-changelog",
    title: "Task #13 — Platform Polish & Dashboard Changelog",
    summary: "Applied UI polish fixes and added a Dashboard changelog feed for staff to track platform improvements.",
    content: `# Task #13 — Platform Polish & Dashboard Changelog\n\n## Summary\nA polish and quality sprint that also introduced the changelog feature.\n\n## What Was Built\n- Dashboard changelog feed showing recent platform updates\n- Staff+ can add changelog entries from the dashboard\n- Multiple UI polish fixes: redundant content removed, wiki presentation cleaned up, footer improvements\n- Visible UI issues identified and corrected across multiple pages\n\n## Technical Notes\n- Changelog entries stored in the changelog table\n- Initial changelog management UI lives in the dashboard before being moved to Command Center`,
    version: null,
  },
  {
    taskNum: 14,
    slug: "eng-task-14-fix-production-auth",
    title: "Task #14 — Fix Production Authentication",
    summary: "Fixed 401 errors on POST requests in production by adding trust proxy configuration for Replit's reverse proxy.",
    content: `# Task #14 — Fix Production Authentication\n\n## Summary\nFixed session cookie issues causing authentication to fail in the deployed environment.\n\n## Root Cause\nExpress was missing \`app.set('trust proxy', 1)\` — required for session cookies to work behind Replit's reverse proxy. Without it, Express sees connections as plain HTTP, so express-session never writes Set-Cookie when secure: true is set.\n\n## What Was Fixed\n- Added \`app.set('trust proxy', 1)\` to the Express app configuration\n- Session cookies now correctly written in the production environment\n- All authenticated API calls (POST, PATCH, DELETE) work correctly after login\n\n## Technical Notes\n- Single-line fix with significant production impact\n- Only affects deployments behind a reverse proxy (Replit production)`,
    version: null,
  },
  {
    taskNum: 15,
    slug: "eng-task-15-sidebar-account-cleanup",
    title: "Task #15 — Sidebar & Account Cleanup",
    summary: "Cleaned up the wiki sidebar and account page, removing redundant items and improving navigation clarity.",
    content: `# Task #15 — Sidebar & Account Cleanup\n\n## Summary\nCleaned up the wiki sidebar navigation and the account/profile pages.\n\n## What Was Done\n- Removed redundant sidebar items\n- Improved sidebar navigation hierarchy\n- Account page cleaned up and streamlined\n- Consistent spacing and visual treatment applied throughout\n- Minor navigation UX improvements\n\n## Technical Notes\n- Changes to AppSidebar component\n- AccountPage layout improvements`,
    version: null,
  },
  {
    taskNum: 16,
    slug: "eng-task-16-auth-copy-tweak",
    title: "Task #16 — Auth Copy Tweak",
    summary: "Adjusted authentication page copy and messaging for clarity and brand voice.",
    content: `# Task #16 — Auth Copy Tweak\n\n## Summary\nUpdated the authentication page text for clarity and brand alignment.\n\n## What Was Changed\n- Login and registration page copy updated to match SEVCO brand voice\n- Error messages improved for clarity\n- Placeholder text updated\n- Form labels refined\n\n## Technical Notes\n- Copy-only changes to AuthPage component`,
    version: null,
  },
  {
    taskNum: 17,
    slug: "eng-task-17-auto-wiki-engineering-articles",
    title: "Task #17 — Auto Wiki Engineering Articles",
    summary: "Added automatic generation of Engineering category wiki articles for completed platform tasks.",
    content: `# Task #17 — Auto Wiki Engineering Articles\n\n## Summary\nAdded automatic wiki article generation for completed engineering tasks.\n\n## What Was Built\n- Seeding function that creates Engineering category wiki articles for each completed task\n- Each article includes the task title, summary, and a General infobox with Tool=Replit and Task=#N\n- Engineering category created automatically if it doesn't exist\n- Articles are published and tagged with "engineering" and "auto-generated"\n\n## Technical Notes\n- Seeding runs on server start if articles don't already exist\n- Uses the same article creation infrastructure as manual articles`,
    version: null,
  },
  {
    taskNum: 18,
    slug: "eng-task-18-store-analytics",
    title: "Task #18 — Store Analytics",
    summary: "Added a store analytics and stats page with inventory metrics, category breakdowns, and price range analysis.",
    content: `# Task #18 — Store Analytics\n\n## Summary\nAdded analytics and stats to the SEVCO Store management tools.\n\n## What Was Built\n- /store/stats page with inventory analytics\n- Total products, in-stock, out-of-stock counts\n- Catalog value and average price metrics\n- Breakdown by category and stock status\n- Price range distribution chart\n- Accessible to admin/executive/staff roles\n\n## Technical Notes\n- Stats computed server-side via getStoreStats() storage method\n- Endpoint at GET /api/store/stats\n- Charts rendered using recharts or similar`,
    version: null,
  },
  {
    taskNum: 19,
    slug: "eng-task-19-projects-dropdown-style-fix",
    title: "Task #19 — Projects Dropdown Style Fix",
    summary: "Aligned the Projects mega-menu dropdown with the visual style of other navigation dropdowns.",
    content: `# Task #19 — Projects Dropdown Style Fix\n\n## Summary\nFixed visual inconsistency in the Projects navigation dropdown.\n\n## What Was Fixed\n- Projects dropdown now uses the same icon + title + description row pattern as other dropdowns\n- Wrapped in the DropdownPanel component for consistency\n- Replaced project logo images/colored circles with the standard pattern\n- Visual alignment now matches Home, Music, Store, and Services dropdowns\n\n## Technical Notes\n- Changes to PlatformHeader navigation components\n- No functional changes — UI/visual alignment only`,
    version: null,
  },
  {
    taskNum: 20,
    slug: "eng-task-20-command-center",
    title: "Task #20 — Command Center: Sidebar + Store Management",
    summary: "Renamed Dashboard to Command Center, added a persistent CMD sidebar, and built the store management back-office view.",
    content: `# Task #20 — Command Center: Sidebar + Store Management\n\n## Summary\nRenamed the Dashboard to Command Center and built out the internal management tools.\n\n## What Was Built\n- Renamed "Dashboard" to "Command" (CMD in compact spaces) across the platform\n- Persistent left sidebar on Command pages, mirroring the wiki sidebar pattern\n- CommandSidebar component with navigation between CMD sections\n- Store management section with Shopify-like product back-office view\n- Admin/exec can view product inventory and manage listings from the CMD panel\n\n## Technical Notes\n- CommandPageLayout component wraps all command pages\n- CommandSidebar lists available management sections\n- /command route replaces /dashboard`,
    version: null,
  },
  {
    taskNum: 21,
    slug: "eng-task-21-email-verification",
    title: "Task #21 — Email Verification",
    summary: "Added email verification to the authentication flow, requiring users to confirm their email address after registration.",
    content: `# Task #21 — Email Verification\n\n## Summary\nAdded email verification to the SEVCO Platform authentication system.\n\n## What Was Built\n- After registration, users receive a verification email with a confirmation link\n- Unverified users see a prompt to verify their email\n- Email verification token and expiry stored on the user record\n- GET /verify-email route handles confirmation\n- Resend integration used to send verification emails\n- Admins can see verification status in the Command Center user management\n\n## Technical Notes\n- emailVerified, emailVerificationToken, emailVerificationExpires fields on users table\n- Verification emails sent via Resend\n- Tokens expire after a configurable window`,
    version: null,
  },
  {
    taskNum: 22,
    slug: "eng-task-22-public-access-mega-menu",
    title: "Task #22 — Public Access + Mega-Menu Navigation",
    summary: "Opened key sections to unauthenticated users and added a mega-menu navigation system with per-section dropdowns.",
    content: `# Task #22 — Public Access + Mega-Menu Navigation\n\n## Summary\nOpened the platform to the public and introduced mega-menu navigation.\n\n## What Was Built\n- Selected pages (store, projects, music, services, jobs, changelog) are accessible without login\n- Global header redesigned with a mega-menu for large dropdowns per section\n- Each section's mega-menu shows sub-pages and featured content\n- Auth-gated pages still redirect to /auth when visited unauthenticated\n- Public landing page updated to work for logged-out users\n\n## Technical Notes\n- Uses wouter for routing; public routes are unwrapped from ProtectedRoute\n- Mega-menu built as a custom dropdown component in PlatformHeader`,
    version: "1.0.0",
  },
  {
    taskNum: 23,
    slug: "eng-task-23-home-page-contact-page",
    title: "Task #23 — Home Page Redesign + Contact Page",
    summary: "Redesigned the home/landing page and added a Contact page with Resend email integration.",
    content: `# Task #23 — Home Page Redesign + Contact Page\n\n## Summary\nRedesigned the main landing page and added a contact form.\n\n## What Was Built\n- Redesigned home landing page with hero section, platform overview, and featured content\n- /contact page with a contact form that sends emails via Resend\n- Form captures name, email, subject, and message\n- Success/error states handled gracefully\n- Policy wiki pages (Privacy Policy, Terms of Service, Refund Policy, Contact) seeded automatically\n\n## Technical Notes\n- Resend integration for transactional email\n- Contact form endpoint at POST /api/contact\n- Policy articles seeded via seedPolicyArticles() on server start`,
    version: "1.0.0",
  },
  {
    taskNum: 24,
    slug: "eng-task-24-profile-page",
    title: "Task #24 — Profile Page with MySpace-Style Customization",
    summary: "Built user profile pages with customizable background color, accent color, background image, bio, avatar, and social links.",
    content: `# Task #24 — Profile Page with MySpace-Style Customization\n\n## Summary\nAdded public and private user profile pages with visual customization options.\n\n## What Was Built\n- /profile/:username shows a public profile page\n- /profile (authenticated) shows the logged-in user's own profile with edit capability\n- Customization options: background color, accent color, background image URL, avatar URL, display name, bio, social links\n- Social links: Instagram, Twitter/X, TikTok, Discord, website\n- Account settings page at /account\n\n## Technical Notes\n- Profile data stored on the users table\n- updateProfileSchema validates profile updates\n- Background and accent colors stored as hex values`,
    version: "1.0.0",
  },
  {
    taskNum: 25,
    slug: "eng-task-25-jobs-board",
    title: "Task #25 — Jobs Board — Listings, Details & Applications",
    summary: "Built a jobs board with listings, detail pages, and an application system for authenticated users.",
    content: `# Task #25 — Jobs Board — Listings, Details & Applications\n\n## Summary\nBuilt the jobs board for SEVCO open positions.\n\n## What Was Built\n- /jobs shows a listing of open roles with department, type, location, and salary range\n- /jobs/:slug shows full job detail with description, requirements, and apply button\n- Authenticated users can apply to jobs via an application form\n- Applications capture: name, email, phone, resume URL, cover letter\n- Admin/Executive can manage job postings (create, edit, close)\n- Jobs can be filtered by department and type\n\n## Technical Notes\n- Jobs and job_applications stored in dedicated tables\n- Unique constraint prevents duplicate applications per user per job\n- Applications are visible to admins in the Command Center`,
    version: "1.0.0",
  },
  {
    taskNum: 26,
    slug: "eng-task-26-services-page",
    title: "Task #26 — Services Page + Mega-Menu",
    summary: "Added the Services page with filterable service categories and admin CRUD, plus mega-menu integration.",
    content: `# Task #26 — Services Page + Mega-Menu\n\n## Summary\nAdded the Services section to showcase SEVCO service offerings.\n\n## What Was Built\n- /services shows all SEVCO services organized by category\n- /services/:slug shows a service detail page\n- Services can be filtered by category\n- Admin/Executive/Staff can create, edit, and delete services\n- Services added to the mega-menu navigation\n- Command Center services management page\n\n## Technical Notes\n- Services stored in the services table\n- iconName field maps to lucide-react icon names\n- Featured services can be highlighted on the listing page`,
    version: "1.1.0",
  },
  {
    taskNum: 27,
    slug: "eng-task-27-music-expansion",
    title: "Task #27 — Music Expansion — SEVCO RECORDS, Listen, Playlists, Submit",
    summary: "Expanded SEVCO Records with playlist management, music submissions, and a global Spotify player bar.",
    content: `# Task #27 — Music Expansion — SEVCO RECORDS, Listen, Playlists, Submit\n\n## Summary\nMajor expansion of the Music section with new features for playlists, submissions, and playback.\n\n## What Was Built\n- /music/playlists — lists official and community playlists\n- /music/submit — public form for artists to submit music for A&R review\n- /listen — dedicated listening page with embedded Spotify player\n- Global Spotify player bar that persists across navigation\n- Admin/Executive can manage playlists (add, edit, delete)\n- Command Center music submissions review page\n- Admin social link management in Command Center footer settings\n\n## Technical Notes\n- Playlists stored in the playlists table\n- Music submissions stored in the music_submissions table\n- Spotify playback managed via SpotifyPlayerProvider context\n- Global player bar stacks above the footer`,
    version: "1.1.0",
  },
  {
    taskNum: 28,
    slug: "eng-task-28-projects-megamenu-marketing",
    title: "Task #28 — Projects Mega-Menu + Project & Service Marketing Pages",
    summary: "Enhanced project and service detail pages with richer marketing content and integrated them into the mega-menu.",
    content: `# Task #28 — Projects Mega-Menu + Project & Service Marketing Pages\n\n## Summary\nEnhanced Projects and Services with richer marketing pages and mega-menu integration.\n\n## What Was Built\n- Project detail pages now include: hero image, logo, gallery, long description, tags, and launch date\n- Service detail pages expanded with richer content and iconography\n- Projects and Services added to the mega-menu with featured items highlighted\n- Featured projects can be pinned to appear in the mega-menu\n- Project create/edit form updated with new fields\n\n## Technical Notes\n- New fields added to projects table: heroImageUrl, logoUrl, longDescription, tags, launchDate, galleryUrls\n- featured flag controls mega-menu inclusion`,
    version: "0.3.0",
  },
  // Note: Task #29 does not exist in the project task history. The task numbering
  // jumps from #28 to #30. There is no task-29.md file in .local/tasks/.
  {
    taskNum: 30,
    slug: "eng-task-30-bug-fixes-quick-wins",
    title: "Task #30 — Bug Fixes & Quick UI Wins",
    summary: "Addressed accumulated bug fixes and quick UI improvements across the platform.",
    content: `# Task #30 — Bug Fixes & Quick UI Wins\n\n## Summary\nA focused sprint to resolve accumulated bugs and improve platform polish.\n\n## What Was Fixed\n- Various routing and navigation edge cases\n- Form validation improvements\n- UI consistency fixes across components\n- Accessibility and keyboard navigation improvements\n- Responsive layout corrections on mobile\n- Minor data display bugs\n\n## Technical Notes\n- No new features; focused on stability and quality\n- Addressed issues surfaced from earlier releases`,
    version: null,
  },
  {
    taskNum: 31,
    slug: "eng-task-31-profile-user-enhancements",
    title: "Task #31 — Profile & User Admin Enhancements",
    summary: "Enhanced user profile pages and admin user management capabilities in the Command Center.",
    content: `# Task #31 — Profile & User Admin Enhancements\n\n## Summary\nImproved user profiles and admin tools for managing users.\n\n## What Was Built\n- Enhanced profile page with richer display of social links, bio, and custom background\n- Admin Command Center user management page with role editing\n- Admins can change any user's role from the Command Center\n- Username editing by admins\n- Email verification status visible to admins\n\n## Technical Notes\n- User management at /command/users\n- Role changes via PATCH /api/users/:id/role\n- Username changes via PATCH /api/users/:id/username`,
    version: null,
  },
  {
    taskNum: 32,
    slug: "eng-task-32-footer-social-links-admin",
    title: "Task #32 — Footer Redesign & Social Links Admin",
    summary: "Redesigned the platform footer and added an admin interface to manage social media links.",
    content: `# Task #32 — Footer Redesign & Social Links Admin\n\n## Summary\nRedesigned the platform footer and added admin management of social links.\n\n## What Was Built\n- New PlatformFooter component with cleaner layout and social link display\n- Admin/Executive Command Center page for managing platform social links\n- Social links include: platform name, URL, icon name, and display order\n- Links can be shown in footer and/or on the contact page\n- Footer displays current platform version from latest changelog entry\n\n## Technical Notes\n- platform_social_links table stores all social link data\n- Seeded with default social links on first run\n- CRUD via /api/social-links endpoints`,
    version: null,
  },
  {
    taskNum: 33,
    slug: "eng-task-33-store-cmd-product-creation",
    title: "Task #33 — Store CMD — Product Creation",
    summary: "Added product creation and management capabilities to the Command Center store management page.",
    content: `# Task #33 — Store CMD — Product Creation\n\n## Summary\nAdded Command Center store management with product creation.\n\n## What Was Built\n- Command Center store management page at /command/store\n- Admins/staff can create new products directly from the Command Center\n- Product creation form in the CMD panel with validation\n- Product list with stock status management\n- Stripe product/price creation triggered automatically on product add\n\n## Technical Notes\n- Product creation calls /api/products which creates Stripe product and price\n- Store stats page at /store/stats shows inventory analytics`,
    version: null,
  },
  {
    taskNum: 34,
    slug: "eng-task-34-music-player-playlist-cmd",
    title: "Task #34 — Music Player & Playlist CMD Editing",
    summary: "Added Command Center playlist management and improved the global Spotify player bar.",
    content: `# Task #34 — Music Player & Playlist CMD Editing\n\n## Summary\nAdded Command Center controls for playlist management and improved the player bar.\n\n## What Was Built\n- Command Center playlists page at /command/playlists\n- Admins can create, edit, and delete playlists from the CMD panel\n- Playlist create/edit form with platform, URL, cover image, and official flag\n- Global Spotify player bar improvements: better controls, queue display\n- Player persists across page navigation\n\n## Technical Notes\n- Playlists CRUD via /api/playlists endpoints\n- Player state managed via SpotifyPlayerProvider and useSpotifyPlayer hook`,
    version: null,
  },
  {
    taskNum: 35,
    slug: "eng-task-35-wiki-archive-system",
    title: "Task #35 — Wiki Article Archive System",
    summary: "Replaced wiki article deletion with an archive workflow. Archived articles are hidden from public but accessible to staff+.",
    content: `# Task #35 — Wiki Article Archive System\n\n## Summary\nReplaced hard deletion of wiki articles with a soft archive system.\n\n## What Was Built\n- Articles now have an "archived" status in addition to draft/published\n- Archived articles are hidden from public wiki and search results\n- Staff+ users can view archived articles via the Command Center\n- Archived articles can be edited and submitted for republication\n- Admins can publish archived articles directly\n- Archive action replaces the delete button in the article editor\n\n## Technical Notes\n- Article status enum extended with "archived"\n- Archived article routes check user role before serving content\n- /api/articles/archived endpoint requires staff+ role\n- Archive is reversible via republication workflow`,
    version: "1.2.0",
  },
  {
    taskNum: 36,
    slug: "eng-task-36-version-system-changelog",
    title: "Task #36 — Version System & Changelog",
    summary: "Added semantic versioning to changelog entries and a footer version display pulled live from the latest changelog.",
    content: `# Task #36 — Version System & Changelog\n\n## Summary\nAdded a versioned changelog system and public changelog page.\n\n## What Was Built\n- Changelog entries now include a version field using semantic versioning (MAJOR.MINOR.PATCH)\n- Public changelog page at /changelog with timeline view grouped by year\n- Command Center changelog management at /command/changelog\n- Suggested next version auto-computed from latest entry\n- Platform footer displays the current version from the latest changelog entry\n- Changelog entries seeded with historical version data\n\n## Technical Notes\n- Changelog stored in the changelog table\n- Version validated with MAJOR.MINOR.PATCH regex\n- Footer version pulled from GET /api/changelog/latest`,
    version: "1.2.0",
  },
  {
    taskNum: 37,
    slug: "eng-task-37-social-feed",
    title: "Task #37 — Social Feed — Posts, Follows & Timelines",
    summary: "Built a social feed with posts, likes, replies, user following, and personalized timelines.",
    content: `# Task #37 — Social Feed — Posts, Follows & Timelines\n\n## Summary\nAdded a full social feed system to the SEVCO Platform.\n\n## What Was Built\n- /feed — social feed page showing posts from followed users and global posts\n- Users can create text posts with optional image URLs\n- Posts can be liked and replied to\n- Users can follow/unfollow other users\n- Profile pages show follow/follower counts and follow button\n- Timeline shows posts sorted by recency\n\n## Technical Notes\n- Posts, post_likes, post_replies, and user_follows tables\n- Feed endpoint supports followedByUserId filter for personalized timelines\n- Like and follow counts computed at query time`,
    version: null,
  },
  {
    taskNum: 38,
    slug: "eng-task-38-notes-tool",
    title: "Task #38 — Notes Tool — Personal & Collaborative",
    summary: "Added a personal and collaborative notes system with pinning, color coding, sharing, and wiki/project attachments.",
    content: `# Task #38 — Notes Tool — Personal & Collaborative\n\n## Summary\nAdded a notes tool for personal and team use.\n\n## What Was Built\n- /notes — personal notes page with create, edit, delete\n- Notes can be pinned and color-coded\n- Shared notes are visible to all platform users\n- Collaborators can be added to notes for joint editing\n- Notes can be attached to wiki articles or projects as resource links\n- Notes appear as a related section on wiki articles and project detail pages\n\n## Technical Notes\n- notes, note_collaborators, and note_attachments tables\n- Note attachment supports "project" and "article" resource types\n- Shared notes are fetched via /api/notes/public/:type/:id endpoints`,
    version: null,
  },
  {
    taskNum: 39,
    slug: "eng-task-39-nav-platform-housekeeping",
    title: "Task #39 — Nav & Platform Housekeeping",
    summary: "Navigation improvements: renamed Home dropdown to SEVCO, moved Changelog to wiki sidebar, fixed nav overlap, added iPhone app icon, replaced sevelovesyou.com with sevco.us, and added an Archive tab to the wiki sidebar.",
    content: `# Task #39 — Nav & Platform Housekeeping\n\n## Summary\nA collection of navigation improvements, bug fixes, and platform-wide text corrections.\n\n## What Was Built\n- Top-level "Home" dropdown renamed to "SEVCO" with a "Home" link at the top navigating to /\n- Changelog link moved from the SEVCO dropdown to a dedicated tab in the wiki sidebar (AppSidebar), visible to all users\n- Fixed nav bar overlap that was hiding the wiki sidebar toggle button (z-index / layout fix)\n- Added apple-touch-icon link to index.html pointing to the correct square PNG asset for iPhone homescreen\n- Replaced all instances of "sevelovesyou.com" in UI labels with "sevco.us"\n- Added an "Archive" tab to the wiki sidebar visible only to staff/executive/admin roles, linking to archived articles view\n\n## Files Changed\n- client/src/components/platform-header.tsx\n- client/src/components/app-sidebar.tsx\n- client/index.html\n- client/src/components/platform-footer.tsx`,
    version: null,
  },
  {
    taskNum: 40,
    slug: "eng-task-40-cmd-restructure",
    title: "Task #40 — CMD Restructure, Fixes & Overview Refresh",
    summary: "Merged redundant CMD music tabs, surfaced job applicants, moved store analytics to the Store CMD page, fixed admin timeline post bug, and refreshed the CMD Overview layout.",
    content: `# Task #40 — CMD Restructure, Fixes & Overview Refresh\n\n## Summary\nSeveral Command Center improvements focused on consolidation and bug fixes.\n\n## What Was Built\n- CMD sidebar Music tab merged into a single /command/music page with Submissions and Playlists as sub-tabs\n- CMD Jobs tab now shows open positions and a list of applicants with status management\n- Store Analytics moved into the Store CMD page as a tab; standalone /command/store/stats route retired\n- Fixed admin account bug preventing post creation on the social timeline\n- CMD Overview refreshed with cleaner widget layout and better at-a-glance information\n\n## Files Changed\n- client/src/pages/command-music.tsx\n- client/src/pages/command-jobs.tsx\n- client/src/pages/command-store.tsx\n- client/src/pages/command-overview.tsx\n- client/src/components/command-sidebar.tsx\n- client/src/pages/feed-page.tsx`,
    version: null,
  },
  {
    taskNum: 41,
    slug: "eng-task-41-hostinger-domains",
    title: "Task #41 — Hostinger API Integration & Domains Page",
    summary: "Integrated the Hostinger API for VPS status monitoring and domain availability search, with a CMD Hosting tab and a public Domains page.",
    content: `# Task #41 — Hostinger API Integration & Domains Page\n\n## Summary\nIntegrated the Hostinger API to expose VPS status and domain availability search.\n\n## What Was Built\n- server/hostinger.ts proxy module wrapping Hostinger API endpoints (VPS status, domain availability)\n- Admin-only CMD Hosting tab at /command/hosting showing VPS state, hostname, and uptime\n- Compact VPS status card added to CMD Overview (admin-only)\n- /domains page with a domain name search input, availability results (available/taken), and pricing display\n- Domains link added to the Services mega-menu in PlatformHeader\n- Graceful error state when HOSTINGER_API_KEY is missing\n\n## Files Changed\n- server/hostinger.ts\n- server/routes.ts\n- client/src/pages/command-hosting.tsx\n- client/src/pages/domains-page.tsx\n- client/src/pages/command-overview.tsx\n- client/src/components/platform-header.tsx\n- client/src/App.tsx`,
    version: null,
  },
  {
    taskNum: 42,
    slug: "eng-task-42-engineering-articles-changelog",
    title: "Task #42 — Engineering Wiki Articles & Changelog Update",
    summary: "Back-filled individual wiki articles for every completed task (#1–#38), added wikiSlug linking to changelog entries, and made the public changelog page render article links as 'Read more →'.",
    content: `# Task #42 — Engineering Wiki Articles & Changelog Update\n\n## Summary\nDocumented the full engineering history by back-filling wiki articles and linking changelog entries.\n\n## What Was Built\n- Published wiki articles in the Engineering category for each completed task (#1–#38)\n- Each article has a General infobox: Tool = Replit, Version = corresponding changelog version, Task = #N\n- wikiSlug column added to the changelog table to link entries to their wiki articles\n- CMD changelog management page shows a "Link article" inline editor per entry\n- Public changelog page (/changelog) renders wikiSlug links as "Read more →" navigation\n- Automatic linkChangelogToWikiArticles() seeding maps existing version tags to article slugs\n\n## Files Changed\n- shared/schema.ts\n- server/storage.ts\n- server/routes.ts\n- client/src/pages/command-changelog.tsx\n- client/src/pages/changelog-page.tsx`,
    version: "1.2.0",
  },
  {
    taskNum: 43,
    slug: "eng-task-43-bug-fixes-nav-polish",
    title: "Task #43 — Bug Fixes & Navigation Polish",
    summary: "Fixed wiki sidebar collapse to icon-only rail, domain search API parsing, CMD Overview latest release card ordering, and added a back-to-wiki link on the Changelog page.",
    content: `# Task #43 — Bug Fixes & Navigation Polish\n\n## Summary\nResolved reported issues and small navigation gaps from the recent feature push.\n\n## What Was Fixed\n- Wiki sidebar now collapses to a narrow icon-only rail instead of fully disappearing; icons remain visible when collapsed with tooltip labels\n- Domain search on /domains correctly shows available and taken domains (Hostinger API response parsing fixed; graceful fallback shown when API key is missing)\n- CMD Overview shows the "Latest Release" changelog card as the topmost widget for admin/executive views\n- Changelog page (/changelog) has a "← Wiki" back-link so it feels connected to the wiki section\n\n## Files Changed\n- client/src/components/app-sidebar.tsx\n- client/src/pages/domains-page.tsx\n- server/hostinger.ts\n- client/src/pages/command-overview.tsx\n- client/src/pages/changelog-page.tsx`,
    version: "1.2.1",
  },
  {
    taskNum: 44,
    slug: "eng-task-44-project-social-links-about-page",
    title: "Task #44 — Project Social Links + About Page",
    summary: "Added social link fields to projects (X, Instagram, YouTube, Discord, GitHub, Other), displayed them on project detail pages, and built a dedicated /about page linked from the SEVCO mega-menu.",
    content: `# Task #44 — Project Social Links + About Page\n\n## Summary\nAdded per-project social links and launched a dedicated About page for SEVCO.\n\n## What Was Built\n- socialLinks JSONB column added to the projects table\n- Project create/edit forms include optional social link fields: X/Twitter, Instagram, YouTube, Discord, GitHub, Other\n- Project detail page shows social link icon buttons below the project title (conditional on data)\n- /about — a dedicated page with SEVCO's story, mission, and contact links (not a wiki article)\n- "About" link added to the SEVCO mega-menu dropdown in PlatformHeader\n\n## Files Changed\n- shared/schema.ts\n- server/storage.ts\n- server/routes.ts\n- client/src/pages/project-detail.tsx\n- client/src/pages/project-create-page.tsx\n- client/src/pages/project-edit-page.tsx\n- client/src/pages/about-page.tsx\n- client/src/components/platform-header.tsx\n- client/src/App.tsx`,
    version: "1.3.0",
  },
  {
    taskNum: 45,
    slug: "eng-task-45-listen-page-social-links-cmd",
    title: "Task #45 — Listen Page Social Links in CMD",
    summary: "Moved hardcoded social/streaming links on the Music Listen page into the database, managed via the CMD Social Links page with a new 'Listen Page' toggle column.",
    content: `# Task #45 — Listen Page Social Links in CMD\n\n## Summary\nMade the Music Listen page social links database-driven and manageable from CMD.\n\n## What Was Built\n- showOnListen boolean column added to platform_social_links table\n- CMD Social Links page (/command/social-links) gains a "Listen" toggle column alongside existing Footer and Contact toggles\n- /music/listen page fetches links from GET /api/social-links filtered by showOnListen: true\n- Hardcoded SOCIAL_LINKS and STREAMING_LINKS constants removed from music-listen-page.tsx\n- Seed defaults set showOnListen = true for streaming platforms (Spotify, Apple Music, YouTube Music, SoundCloud, etc.)\n\n## Files Changed\n- shared/schema.ts\n- server/storage.ts\n- server/routes.ts\n- client/src/pages/command-social-links.tsx\n- client/src/pages/music-listen-page.tsx`,
    version: "1.3.1",
  },
  {
    taskNum: 46,
    slug: "eng-task-46-cmd-display-tab",
    title: "Task #46 — CMD Display Tab — Platform Presentation Controls",
    summary: "Added a CMD Display tab with a Hero Editor, Section Visibility toggles, and Platform Assets controls (favicon, OG image). Landing page reads settings from the API with hardcoded defaults as fallback.",
    content: `# Task #46 — CMD Display Tab — Platform Presentation Controls\n\n## Summary\nBuilt a CMD Display tab to control the visual presentation of the platform without touching code.\n\n## What Was Built\n- platform_settings table (key text PK, value text) for key-value configuration storage\n- GET /api/platform-settings (public) and PUT /api/platform-settings (admin-only) routes\n- /command/display page with three sections:\n  - Hero Editor: background image URL, hero text, two button editors (label + URL + icon)\n  - Section Visibility: toggles for Platform Grid, RECORDS Spotlight, Store Preview, Wiki Latest, Community CTA\n  - Platform Assets: favicon URL and OG image URL inputs\n- Landing page (/) fetches platform settings and renders hero background, text, button labels, and section visibility with hardcoded defaults as fallback\n- App root dynamically updates favicon and og:image meta tags via useEffect\n- "Display" item added to CMD sidebar (admin-only)\n\n## Files Changed\n- shared/schema.ts\n- server/storage.ts\n- server/routes.ts\n- client/src/pages/command-display.tsx\n- client/src/pages/landing.tsx\n- client/src/components/command-sidebar.tsx\n- client/src/App.tsx\n- client/index.html`,
    version: "1.4.0",
  },
  {
    taskNum: 47,
    slug: "eng-task-47-platform-search",
    title: "Task #47 — Platform-Wide Search",
    summary: "Added a platform-wide search with a full-width overlay modal in the nav, live grouped results by content type (Wiki, Projects, Store, Music, Jobs, Services), a /search results page, and a Google fallback.",
    content: `# Task #47 — Platform-Wide Search\n\n## Summary\nBuilt a global search experience that spans all platform content sections.\n\n## What Was Built\n- Search icon added to PlatformHeader (desktop and mobile) toggling a full-width SearchOverlay modal\n- SearchOverlay: auto-focused input, live grouped results as user types (debounced 300ms), keyboard navigation (Escape to close), "Search Google" fallback button\n- Results grouped by type: Wiki, Projects, Store, Music/Artists, Jobs, Services\n- Results respect user permission level (archived articles only for staff+)\n- /search full results page with up to 10 results per group, total count header, and Google fallback link\n- GET /api/search?q=&limit= queries across all content types via Postgres ILIKE\n\n## Files Changed\n- client/src/components/platform-header.tsx\n- client/src/components/search-overlay.tsx\n- client/src/pages/search-page.tsx\n- server/routes.ts\n- server/storage.ts\n- client/src/App.tsx`,
    version: "1.5.0",
  },
  {
    taskNum: 48,
    slug: "eng-task-48-bug-fixes",
    title: "Task #48 — Bug Fixes: Hostinger API, CMD Nav Title, Global Cart Drawer",
    summary: "Fixed Hostinger API error handling, resolved CMD page header being hidden by the sticky nav bar, and moved the cart drawer to mount globally in App.tsx so it works from any page.",
    content: `# Task #48 — Bug Fixes: Hostinger API, CMD Nav Title, Global Cart Drawer\n\n## Summary\nThree targeted bug fixes addressing Hostinger API errors, CMD layout overlap, and global cart access.\n\n## What Was Fixed\n- Hostinger API: VPS status widget and Domain tool returning errors — fixed response parsing, added defensive error logging, shows clear "Not configured" state when API key is missing\n- CMD nav title/controls hidden by sticky PlatformHeader — audited CommandPageLayout for z-index/padding-top conflicts and fixed the overlap\n- Cart drawer moved from store-page.tsx and store-product-detail.tsx into App.tsx so it mounts globally; clicking the nav cart icon from any page now opens the drawer correctly\n\n## Files Changed\n- server/hostinger.ts\n- server/routes.ts\n- client/src/pages/command-overview.tsx\n- client/src/components/platform-header.tsx\n- client/src/components/cart-drawer.tsx\n- client/src/pages/store-page.tsx\n- client/src/pages/store-product-detail.tsx\n- client/src/App.tsx`,
    version: "1.5.1",
  },
  {
    taskNum: 49,
    slug: "eng-task-49-cmd-enhancements",
    title: "Task #49 — CMD Enhancements: Edit Social Links, Resources Tab, Recent Notes Widget",
    summary: "Added social link editing in CMD, a new Resources tab with a Quick Links widget in CMD Overview, and a Recent Notes widget in CMD Overview.",
    content: `# Task #49 — CMD Enhancements: Edit Social Links, Resources Tab, Recent Notes Widget\n\n## Summary\nThree CMD enhancements improving admin workflows and at-a-glance information.\n\n## What Was Built\n- Social Links CMD: each row now has an "Edit" button opening a pre-filled dialog for name, URL, and icon\n- resources table: id, title, url, description, category, displayOrder, showOnOverview, createdAt\n- GET/POST/PATCH/DELETE /api/resources endpoints (admin-only)\n- /command/resources page: table of resources with add/edit/delete and a showOnOverview toggle\n- "Resources" item added to CMD sidebar (admin-only)\n- Quick Links widget in CMD Overview: shows resources where showOnOverview = true, sorted by displayOrder\n- Recent Notes widget in CMD Overview: shows 5 most recently updated notes for the logged-in user\n\n## Files Changed\n- shared/schema.ts\n- server/storage.ts\n- server/routes.ts\n- client/src/components/command-sidebar.tsx\n- client/src/pages/command-overview.tsx\n- client/src/pages/command-social-links.tsx\n- client/src/pages/command-resources.tsx\n- client/src/App.tsx`,
    version: "1.5.2",
  },
  {
    taskNum: 50,
    slug: "eng-task-50-home-bulletin-footer-store-cleanup",
    title: "Task #50 — Home Bulletin, Footer Sitemap, Profile/Account Cross-Links, Store Stats Cleanup",
    summary: "Added a Bulletin section on the home page showing pinned feed posts, expanded the footer into a comprehensive multi-column sitemap, added profile/account cross-links, and removed the redundant /store/stats page.",
    content: `# Task #50 — Home Bulletin, Footer Sitemap, Profile/Account Cross-Links, Store Stats Cleanup\n\n## Summary\nFour improvements to the home page, footer, user navigation, and store.\n\n## What Was Built\n- Bulletin section on landing page: fetches pinned Official Posts from the feed, shows a styled card with truncated content and "Read more" link; hidden if no pinned post exists\n- Footer expanded to a comprehensive multi-column sitemap: Platform, Music, Commerce, Community, Legal & Info columns\n- Account page gains a "View Profile" link to the user's public profile; profile page (own view) gains an "Account Settings" link\n- /store/stats page and store-stats-page.tsx removed; CMD Overview Store Analytics link updated to /command/store\n\n## Files Changed\n- client/src/pages/landing.tsx\n- client/src/components/platform-footer.tsx\n- client/src/pages/account-page.tsx\n- client/src/pages/profile-page.tsx\n- client/src/pages/command-overview.tsx\n- client/src/App.tsx\n- server/routes.ts`,
    version: "1.5.3",
  },
  {
    taskNum: 51,
    slug: "eng-task-51-gallery-tools-dropdown",
    title: "Task #51 — Gallery Page + Tools Dropdown in Nav",
    summary: "Built an admin-managed image gallery with file upload, a /gallery page with category filtering and copy-link functionality, and a 'Tools' mega-menu dropdown in the nav for authenticated users.",
    content: `# Task #51 — Gallery Page + Tools Dropdown in Nav\n\n## Summary\nAdded an image gallery system and a Tools nav dropdown for logged-in users.\n\n## What Was Built\n- gallery_images table: id, title, imageUrl, category (profile/banner/wallpaper/logo/other), altText, displayOrder, isPublic, createdAt\n- GET/POST/PATCH/DELETE /api/gallery endpoints\n- /gallery page: category filter tabs, image grid with thumbnail, title, category badge, and "Copy Link" button; unauthenticated users see only public images\n- /command/gallery CMD page: table of images with add/edit/delete, isPublic toggle, and file upload via Supabase Storage\n- "Gallery" item added to CMD sidebar (admin-only)\n- "Tools" mega-menu dropdown added to PlatformHeader for authenticated users (Notes, Gallery, with "more coming soon" hint)\n\n## Files Changed\n- shared/schema.ts\n- server/storage.ts\n- server/routes.ts\n- client/src/components/platform-header.tsx\n- client/src/components/command-sidebar.tsx\n- client/src/pages/gallery-page.tsx\n- client/src/pages/command-gallery.tsx\n- client/src/App.tsx`,
    version: "1.6.0",
  },
  {
    taskNum: 52,
    slug: "eng-task-52-brand-section-about",
    title: "Task #52 — Brand Section on About Page + CMD Brand Assets Management",
    summary: "Added a Brand & Assets section to the About page for downloading official SEVCO brand assets, with an admin management interface in the CMD Display tab using Supabase Storage for file uploads.",
    content: `# Task #52 — Brand Section on About Page + CMD Brand Assets Management\n\n## Summary\nBuilt a public brand assets section and an admin management interface.\n\n## What Was Built\n- brand_assets table: id, name, description, assetType (logo/color_palette/font/banner/icon/other), downloadUrl, previewUrl, fileFormat, displayOrder, isPublic, createdAt\n- GET /api/brand-assets (public, returns isPublic=true for guests), POST/PATCH/DELETE (admin-only)\n- About page (/about) gains a "Brand & Assets" section with asset cards grouped by type, each with a preview thumbnail and "Download" button\n- CMD Display tab (/command/display) gets a "Brand Assets" sub-section: table with add/edit/delete, file upload via Supabase Storage, and isPublic toggle\n\n## Files Changed\n- shared/schema.ts\n- server/storage.ts\n- server/routes.ts\n- client/src/pages/about-page.tsx\n- client/src/pages/command-display.tsx\n- client/src/App.tsx`,
    version: "1.6.1",
  },
  {
    taskNum: 53,
    slug: "eng-task-53-hosting-landing-page",
    title: "Task #53 — SEVCO Hosting Landing Page",
    summary: "Built a modern public landing page for SEVCO Hosting at /hosting with a hero, service cards (Website Hosting, Minecraft/Game Servers, VPS, Custom Hosting), feature highlights, and CTAs.",
    content: `# Task #53 — SEVCO Hosting Landing Page\n\n## Summary\nBuilt a complete marketing landing page for SEVCO Hosting.\n\n## What Was Built\n- /hosting public landing page (hosting-page.tsx) with:\n  - Full-width dark/gradient hero with SEVCO wordmark + "Hosting" label and tagline\n  - Two CTAs: "Get Started" → /contact, "Learn More" → scrolls down\n  - Services grid: Website Hosting, Minecraft & Game Servers, VPS, Custom Hosting — each with icon, description, and price hint\n  - Feature highlights: 99.9% uptime, DDoS protection, 24/7 support, instant provisioning\n  - "Why SEVCO Hosting" section with platform ecosystem nod\n  - CTA section at bottom linking to /contact\n- Page metadata: title, meta description, og:title, og:description\n- "Hosting" link added to the Services dropdown in PlatformHeader mega-menu and mobile drawer\n\n## Files Changed\n- client/src/pages/hosting-page.tsx\n- client/src/components/platform-header.tsx\n- client/src/App.tsx`,
    version: "1.7.0",
  },
  {
    taskNum: 54,
    slug: "eng-task-54-project-service-icons-placeholder-products",
    title: "Task #54 — Project/Service Icon Editing + Placeholder Store Products",
    summary: "Added menuIcon and appIcon fields to projects, icon editing to services, and seeded 6–8 placeholder store products with images so the store is previewable.",
    content: `# Task #54 — Project/Service Icon Editing + Placeholder Store Products\n\n## Summary\nAdded icon customization to projects and services, and seeded the store with placeholder products.\n\n## What Was Built\n- menuIcon text column added to projects table (lucide icon name)\n- appIcon text column added to projects table (image URL for project header icon)\n- Project form: "Menu Icon" field with live lucide icon preview, "App Icon URL" field with image preview; both Executive+ only\n- Project detail page: shows appIcon in the header if set; uses menuIcon in navigation contexts\n- Services: menuIcon field added if not already present; CMD Services page create/edit dialog gets icon field with lucide preview; mega-menu resolves icon dynamically with Briefcase as fallback\n- Placeholder store products seeded (runs only if fewer than 3 products exist): SEVCO Classic Tee, SEVCO Hoodie, Sticker Pack, Snapback Cap, Digital Album Vol. 1, Tote Bag — with Unsplash image URLs\n\n## Files Changed\n- shared/schema.ts\n- server/storage.ts\n- server/routes.ts\n- client/src/pages/project-form.tsx\n- client/src/pages/project-detail.tsx\n- client/src/pages/command-services.tsx\n- client/src/components/platform-header.tsx\n- client/src/App.tsx`,
    version: "1.7.1",
  },
  {
    taskNum: 55,
    slug: "eng-task-55-spotify-integration",
    title: "Task #55 — Spotify Integration in CMD Music Tab",
    summary: "Integrated the Spotify Web API with server-side Authorization Code flow, artist stats tracking, and playlist management — all accessible from a new Spotify tab in the CMD Music page.",
    content: `# Task #55 — Spotify Integration in CMD Music Tab\n\n## Summary\nBuilt a full Spotify integration for admins to track artist stats and manage playlists.\n\n## What Was Built\n- Server-side Spotify OAuth (Authorization Code flow): GET /api/spotify/auth and GET /api/spotify/callback; tokens stored in platform_settings\n- Token refresh middleware with exponential backoff on 429 responses\n- spotify_artists table: id, spotifyArtistId, displayName, displayOrder, createdAt\n- API endpoints: GET/POST/DELETE /api/spotify/artists, GET /api/spotify/artists/:id/stats, GET/POST /api/spotify/playlists, GET/POST/DELETE /api/spotify/playlists/:id/tracks\n- CMD Music page gains a third "Spotify" tab:\n  - "Connect Spotify" panel when not authenticated\n  - Artist Stats: grid of managed artist cards with follower count, monthly listeners (fetched live), add/remove\n  - Playlist Manager: list of connected account playlists with track view, add/remove track, create playlist\n- Spotify logo / "Data from Spotify" attribution on all displayed data\n- All Spotify API errors shown as user-facing toasts\n\n## Files Changed\n- shared/schema.ts\n- server/storage.ts\n- server/routes.ts\n- client/src/pages/command-music.tsx\n- client/src/App.tsx`,
    version: "1.8.0",
  },
];

async function seedSevcoplatformParentId() {
  await db.execute(sql`ALTER TABLE categories ADD COLUMN IF NOT EXISTS parent_id integer`);
  const engCat = await storage.getCategoryBySlug("engineering");
  const platformCat = await storage.getCategoryBySlug("sevco-platform");
  if (engCat && platformCat && !platformCat.parentId) {
    await storage.updateCategoryParent(platformCat.id, engCat.id);
  }
}

async function seedEngineeringWikiArticles() {
  let engCategory = await storage.getCategoryBySlug("engineering");
  if (!engCategory) {
    engCategory = await storage.createCategory({
      name: "Engineering",
      slug: "engineering",
      description: "Internal engineering task documentation and platform development history.",
      icon: "Code2",
    });
  }

  for (const task of ENGINEERING_TASKS) {
    const existing = await storage.getArticleBySlug(task.slug);
    if (!existing) {
      await storage.createArticle({
        title: task.title,
        slug: task.slug,
        content: task.content,
        summary: task.summary,
        categoryId: engCategory.id,
        status: "published",
        infoboxType: "General",
        infoboxData: {
          Tool: "Replit",
          Version: task.version ?? "—",
          Task: `#${task.taskNum}`,
        },
        tags: ["engineering", "task", `task-${task.taskNum}`],
      });
    }
  }
}

async function linkChangelogToWikiArticles() {
  const entries = await storage.getChangelog();
  const versionToSlug: Record<string, string> = {
    "0.1.0": "eng-task-2-platform-shell-global-navigation",
    "0.2.0": "eng-task-1-rbac-role-permission-system",
    "0.3.0": "eng-task-3-landing-page-dashboard",
    "1.0.0": "eng-task-23-home-page-contact-page",
    "1.1.0": "eng-task-27-music-expansion",
    "1.2.0": "eng-task-36-version-system-changelog",
  };

  let updated = 0;
  for (const entry of entries) {
    // Fix Task #N entries that have wrong (non-platform-task-*) wiki slugs
    if (entry.title.startsWith("Task #") && entry.wikiSlug && !entry.wikiSlug.startsWith("platform-task-")) {
      const match = entry.title.match(/^Task #(\d+)/);
      if (match) {
        const num = parseInt(match[1]);
        if (num >= 1 && num <= 191) {
          const correctSlug = `platform-task-${String(num).padStart(3, "0")}`;
          await storage.updateChangelogEntry(entry.id, { wikiSlug: correctSlug });
          updated++;
        }
      }
      continue;
    }
    // Set slug for milestone entries that don't have one yet
    if (entry.wikiSlug) continue;
    if (!entry.version) continue;
    const slug = versionToSlug[entry.version];
    if (slug) {
      await storage.updateChangelogEntry(entry.id, { wikiSlug: slug });
      updated++;
    }
  }
  if (updated > 0) {
    console.log(`Changelog — Updated ${updated} entries with wikiSlug links`);
  }
}

type TaskChangelogEntry = {
  title: string;
  description: string;
  category: "feature" | "fix" | "improvement" | "other";
  version: string;
  date: string;
  wikiSlug: string;
};

const TASK_CHANGELOG_ENTRIES: TaskChangelogEntry[] = [
  {
    title: "Bug Fixes & Navigation Polish",
    description: "Fixed wiki sidebar collapse to icon-only rail, corrected Hostinger domain search API parsing, reordered CMD Overview latest release card, and added back-to-wiki link on the Changelog page.",
    category: "fix",
    version: "1.2.1",
    date: "2026-03-25",
    wikiSlug: "eng-task-43-bug-fixes-nav-polish",
  },
  {
    title: "Project Social Links + About Page",
    description: "Added social link fields (X, Instagram, YouTube, Discord, GitHub) to projects with display on detail pages. Launched a dedicated /about page for SEVCO linked from the main nav.",
    category: "feature",
    version: "1.3.0",
    date: "2026-03-25",
    wikiSlug: "eng-task-44-project-social-links-about-page",
  },
  {
    title: "Listen Page Social Links in CMD",
    description: "Moved hardcoded streaming and social links on the Music Listen page into the database. Admins can now toggle which links appear on the Listen page from the CMD Social Links management page.",
    category: "improvement",
    version: "1.3.1",
    date: "2026-03-25",
    wikiSlug: "eng-task-45-listen-page-social-links-cmd",
  },
  {
    title: "CMD Display Tab — Platform Presentation Controls",
    description: "New CMD Display tab for admins to control hero image, text, buttons, section visibility, favicon, and OG image without touching code. Landing page reads all settings from the API.",
    category: "feature",
    version: "1.4.0",
    date: "2026-03-25",
    wikiSlug: "eng-task-46-cmd-display-tab",
  },
  {
    title: "Platform-Wide Search",
    description: "Added a full-width search overlay in the nav bar with live grouped results across Wiki, Projects, Store, Music, Jobs, and Services. Includes a dedicated /search results page and Google fallback.",
    category: "feature",
    version: "1.5.0",
    date: "2026-03-25",
    wikiSlug: "eng-task-47-platform-search",
  },
  {
    title: "Bug Fixes: Hostinger API, CMD Nav Title, Global Cart Drawer",
    description: "Fixed Hostinger API response parsing errors, resolved CMD page headers being hidden by the sticky nav bar, and moved the cart drawer to mount globally so it works from any page.",
    category: "fix",
    version: "1.5.1",
    date: "2026-03-25",
    wikiSlug: "eng-task-48-bug-fixes",
  },
  {
    title: "CMD Enhancements: Edit Social Links, Resources Tab, Recent Notes Widget",
    description: "Social links in CMD are now editable inline. Added a Resources tab for quick links management with an Overview widget. CMD Overview now shows a Recent Notes widget for admins.",
    category: "improvement",
    version: "1.5.2",
    date: "2026-03-25",
    wikiSlug: "eng-task-49-cmd-enhancements",
  },
  {
    title: "Home Bulletin, Footer Sitemap, Profile/Account Cross-Links, Store Stats Cleanup",
    description: "Added a Bulletin section on the home page for pinned feed posts. Expanded the footer into a full multi-column sitemap. Added profile/account cross-links and removed the redundant /store/stats page.",
    category: "improvement",
    version: "1.5.3",
    date: "2026-03-25",
    wikiSlug: "eng-task-50-home-bulletin-footer-store-cleanup",
  },
  {
    title: "Gallery Page + Tools Dropdown in Nav",
    description: "Built an admin-managed image gallery with category filtering and copy-link functionality. Added a Tools mega-menu item in the nav for authenticated users linking to Notes and Gallery.",
    category: "feature",
    version: "1.6.0",
    date: "2026-03-25",
    wikiSlug: "eng-task-51-gallery-tools-dropdown",
  },
  {
    title: "Brand Section on About Page + CMD Brand Assets Management",
    description: "Added a Brand & Assets section to the About page for downloading official SEVCO logos and brand files. Admins can upload and manage brand assets from the CMD Display tab.",
    category: "feature",
    version: "1.6.1",
    date: "2026-03-25",
    wikiSlug: "eng-task-52-brand-section-about",
  },
  {
    title: "SEVCO Hosting Landing Page",
    description: "Launched a full marketing landing page at /hosting for SEVCO Hosting, covering Website Hosting, Minecraft & Game Servers, VPS, and Custom Hosting with feature highlights and CTAs.",
    category: "feature",
    version: "1.7.0",
    date: "2026-03-25",
    wikiSlug: "eng-task-53-hosting-landing-page",
  },
  {
    title: "Project/Service Icon Editing + Placeholder Store Products",
    description: "Added menuIcon and appIcon fields to projects with live icon previews in forms. Services got editable icons in CMD. Seeded the store with 6 representative placeholder products and images.",
    category: "improvement",
    version: "1.7.1",
    date: "2026-03-25",
    wikiSlug: "eng-task-54-project-service-icons-placeholder-products",
  },
  {
    title: "Spotify Integration in CMD Music Tab",
    description: "Full Spotify Web API integration via server-side OAuth. Admins can track artist follower counts and monthly listeners, and manage playlists (create, add/remove tracks) from a new Spotify tab in CMD Music.",
    category: "feature",
    version: "1.8.0",
    date: "2026-03-25",
    wikiSlug: "eng-task-55-spotify-integration",
  },
];

async function updateEngineeringArticleVersions() {
  for (const task of ENGINEERING_TASKS) {
    if (!task.version) continue;
    const article = await storage.getArticleBySlug(task.slug);
    if (!article) continue;
    const infobox = article.infoboxData as Record<string, string> | null;
    if (infobox?.Version === task.version) continue;
    await storage.updateArticle(article.id, {
      infoboxData: {
        Tool: "Replit",
        Version: task.version,
        Task: `#${task.taskNum}`,
      },
    });
  }
}

async function seedTaskChangelogEntries() {
  const existing = await storage.getChangelog();
  const existingByTitle = new Map(existing.map((e) => [e.title, e]));

  for (const entry of TASK_CHANGELOG_ENTRIES) {
    const found = existingByTitle.get(entry.title);
    if (!found) {
      await storage.createChangelogEntryWithDate(
        {
          title: entry.title,
          description: entry.description,
          category: entry.category,
          version: entry.version,
          wikiSlug: entry.wikiSlug,
        },
        new Date(entry.date),
      );
    } else if (!found.wikiSlug) {
      await storage.updateChangelogEntry(found.id, { wikiSlug: entry.wikiSlug });
    }
  }
}

const PLATFORM_ORDERED_FILES = [
  "rbac-role-system.md",
  "platform-shell.md",
  "landing-and-dashboard.md",
  "music-page.md",
  "store-page.md",
  "projects-page.md",
  "logo-favicon-update.md",
  "logo-display-fix.md",
  "logo-no-skew.md",
  "platform-footer.md",
  "platform-polish-and-changelog.md",
  "fix-production-auth.md",
  "stripe-checkout-cart.md",
  "command-center.md",
  "store-analytics.md",
  "store-redesign.md",
  "auto-wiki-engineering-articles.md",
  "sidebar-account-cleanup.md",
  "auth-copy-tweak.md",
  "pre-publish-fixes.md",
  "email-verification.md",
  "public-access-mega-menu.md",
  "home-contact-pages.md",
  "profile-page.md",
  "jobs-page.md",
  "services-page.md",
  "music-expansion.md",
  "projects-megamenu-marketing.md",
  "projects-dropdown-style-fix.md",
  "t28-bug-fixes-quick-wins.md",
  "t29-profile-user-enhancements.md",
  "t30-footer-social-links-admin.md",
  "t31-store-cmd-product-creation.md",
  "t32-music-player-playlist-cmd.md",
  "t33-wiki-archive.md",
  "t34-version-system-changelog.md",
  "t35-social-feed.md",
  "t36-notes-tool.md",
  "t39-nav-platform-housekeeping.md",
  "t40-cmd-restructure.md",
  "t41-hostinger-domains.md",
  "t42-engineering-articles-changelog.md",
  "t43-bug-fixes-nav-polish.md",
  "t44-project-social-links-about-page.md",
  "t45-listen-page-social-links-cmd.md",
  "t46-cmd-display-tab.md",
  "t47-platform-search.md",
  "t48-bug-fixes.md",
  "t49-cmd-enhancements.md",
  "t50-home-bulletin-footer-store-cleanup.md",
  "t51-gallery-tools-dropdown.md",
  "t52-brand-section-about.md",
  "t53-hosting-landing-page.md",
  "t54-project-service-icons-placeholder-products.md",
  "t55-spotify-integration.md",
  "t56-wiki-articles-changelog.md",
  "t57-supabase-storage.md",
  "t58-bug-fixes-2.md",
  "t59-display-tab-uploads-services.md",
  "t60-platform-colors.md",
  "t61-notes-export.md",
  "t62-bugs-polish.md",
  "t63-brand-colors-media-cdn.md",
  "t64-marketing-pages.md",
  "t65-support-tab-cmd.md",
  "t66-members-chat.md",
  "t67-minecraft-page.md",
  "t68-finance-tab-cmd.md",
  "t69-staff-tab-cmd.md",
  "t70-bugs-polish2.md",
  "t71-minecraft-project-cmd.md",
  "t72-hover-tooltips.md",
  "t73-hero-logo-brand-assets.md",
  "t74-services-menu-reorganization.md",
  "t75-finance-subscriptions.md",
  "t76-email-fix.md",
  "t77-ai-chat-agents.md",
  "t78-cmd-settings-tab.md",
  "t79-brand-color-theming.md",
  "t80-traffic-tab-cmd.md",
  "t81-bug-fixes-4.md",
  "t82-bug-fixes-5.md",
  "t83-extended-color-settings.md",
  "t84-admin-content-management.md",
  "t85-site-audit.md",
  "t86-google-analytics.md",
  "t87-registration-email-fix.md",
  "t88-bug-fixes-6.md",
  "t89-news-page.md",
  "t90-wiki-changelog-comprehensive.md",
  "t91-bug-fixes-7.md",
  "t92-news-improvements.md",
  "t93-nav-and-button-colors.md",
  "t94-bug-fixes-8.md",
  "t95-services-notes-display.md",
  "t96-settings-redesign.md",
  "t97-email-client.md",
  "t98-notes-fixes.md",
  "t99-notes-editor-final-fix.md",
  "t100-x-oauth-signin.md",
  "t101-home-consolidation-x-api.md",
  "t103-grok-agent-models.md",
  "t104-production-db-migration.md",
  "t105-x-secrets-setup.md",
  "t106-fix-x-oauth-callback-url.md",
  "t107-link-x-account.md",
  "t108-bug-fixes-11.md",
  "t109-x-feed-improvements.md",
  "t110-profile-overhaul.md",
  "t111-notes-save-x-post.md",
  "t112-grok-models-imagine.md",
  "t113-fullscreen-floating-chat.md",
  "t114-protect-planet-logo.md",
  "t116-chat-conflict-hero-button-color.md",
  "t117-brand-color-palette-replacement.md",
  "task-118.md",
  "task-119.md",
  "task-120.md",
  "task-121.md",
  "t132-grok-imagine-error-image-rendering.md",
  "sidebar-cleanup.md",
  "news-x-only-migration.md",
  "beautiful-news-images.md",
  "cmd-news-controls.md",
  "home-page-redesign-wiki-docs.md",
  "wikify-tool-page.md",
  "tools-marketing-page.md",
  "compile-update-log.md",
];

function taskNumToVersion(taskNum: number): string {
  if (taskNum <= 29)  return `0.${taskNum}.0`;
  if (taskNum <= 100) return `1.${taskNum - 29}.0`;
  if (taskNum <= 160) return `2.${taskNum - 100}.0`;
  return `3.${taskNum - 160}.0`;
}

function detectPlatformCategory(text: string): "feature" | "fix" | "improvement" | "other" {
  const lower = text.toLowerCase();
  if (/\bfix\b|\bbug\b|\bcrash\b|\berror\b/.test(lower)) return "fix";
  if (/\bnew\b|\badd(ed)?\b|\bcreate\b|\bbuild|\bredesign\b|\boverhaul\b/.test(lower)) return "feature";
  if (/\bimprov|\benhance|\bupdat|\bpolish|\brefine\b/.test(lower)) return "improvement";
  return "other";
}

function extractPlatformTitle(content: string, fallback: string): string {
  const fm = content.match(/^---[\s\S]*?title:\s*(.+?)[\s\S]*?---/m);
  if (fm) return fm[1].trim().replace(/^['"]|['"]$/g, "");
  for (const line of content.split("\n")) {
    const m = line.match(/^#\s+(.+)/);
    if (m) return m[1].trim();
  }
  return fallback;
}

function extractPlatformSummary(content: string): string {
  const whyMatch = content.match(/##\s+What\s*&\s*Why\s*\n+([\s\S]*?)(?:\n##|\n---|\z)/);
  if (whyMatch) {
    const lines = whyMatch[1].split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length > 0) return lines[0].replace(/^[-*]\s*/, "").slice(0, 300);
  }
  const lines = content.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#") && !l.startsWith("---") && !l.startsWith(">"));
  return (lines[0] || "").slice(0, 300);
}

// Static appendix: files not in PLATFORM_ORDERED_FILES, sorted alphabetically, excluding meta files
// This list is deterministic — it is the canonical corpus of platform task history as of task #163
const PLATFORM_APPENDIX_FILES = [
  "accessibility-error-handling.md",
  "animation-motion-system.md",
  "chat-overlap-fix.md",
  "cmd-dashboard-polish.md",
  "dark-mode-default.md",
  "design-audit-report.md",
  "design-system-consistency.md",
  "email-body-fix.md",
  "email-fetch-body-via-receiving-api.md",
  "fix-x-feed-errors.md",
  "grok-news-page.md",
  "hide-tools-dropdown-signed-out.md",
  "inbound-email-diagnostics.md",
  "inbox-fix-and-refresh.md",
  "marketing-page-upgrades.md",
  "navigation-sidebar-enhancements.md",
  "news-ai-summaries-wikify.md",
  "news-feed-fix.md",
  "news-fixes-home-sources.md",
  "news-page-enhancements.md",
  "news-page-ux-overhaul.md",
  "news-x-fix.md",
  "news-x-per-category-handles.md",
  "t100-bug-fixes-10.md",
  "t119-mobile-badge-email-inbox-fixes.md",
  "task-1.md",
  "task-2.md",
  "task-22.md",
  "task-23.md",
  "task-24.md",
  "task-25.md",
  "task-26.md",
  "task-27.md",
  "task-28.md",
  "task-3.md",
  "task-30.md",
  "task-31.md",
  "task-32.md",
  "task-33.md",
  "task-34.md",
  "task-35.md",
  "task-36.md",
  "task-37.md",
  "task-38.md",
  "task-4.md",
  "task-5.md",
  "task-6.md",
  "task-70.md",
  "task-71.md",
  "task-72.md",
  "task-73.md",
  "task-74.md",
  "task-75.md",
  "task-76.md",
  "task-email-fix.md",
  "task-finance-projects-sync.md",
  "task-nav-hover-text-fix.md",
  "task-quick-fixes.md",
  "task-seo-settings.md",
  "task-tasks-tool.md",
  "ui-sound-system.md",
  "whats-new-home-section.md",
  "x-news-editorial-redesign.md",
];

// Canonical 191-task corpus: 128 ordered + 63 appendix
const ALL_PLATFORM_FILES_191 = [...PLATFORM_ORDERED_FILES, ...PLATFORM_APPENDIX_FILES];

async function seedAllTasksToChangelog() {
  try {
    const TASKS_DIR = ".local/tasks";
    const ALL_PLATFORM_FILES = ALL_PLATFORM_FILES_191;

    // Startup guard: skip if 191+ Task # changelog entries already exist.
    // Wiki articles are no longer created here — the wiki uses feature-area articles instead.
    const existingAll = await storage.getChangelog();
    const platformTaskEntries = existingAll.filter(
      (e) => e.title.startsWith("Task #")
    );
    if (platformTaskEntries.length >= 191) {
      console.log(
        `[seedAllTasksToChangelog] Skipped — ${platformTaskEntries.length} task changelog entries already exist`
      );
      return;
    }
    // Log what's missing to aid debugging when seeder needs to run
    const linkedNums = new Set(platformTaskEntries.map((e) => {
      const m = e.title.match(/^Task #(\d+)/); return m ? parseInt(m[1]) : null;
    }).filter(Boolean));
    const missing = Array.from({ length: 191 }, (_, i) => i + 1).filter((n) => !linkedNums.has(n));
    if (missing.length > 0) {
      console.log(`[seedAllTasksToChangelog] Missing ${missing.length} changelog entries: tasks #${missing.slice(0, 10).join(", ")}${missing.length > 10 ? "..." : ""}`);
    }
    const existing = existingAll;

    let platformCat = await storage.getCategoryBySlug("sevco-platform");
    if (!platformCat) {
      platformCat = await storage.createCategory({
        name: "SEVCO Platform",
        slug: "sevco-platform",
        description: "Complete SEVCO Platform development history — every task plan, every feature, every fix, in chronological order.",
        icon: "layers",
      });
    }

    const existingTitles = new Set(existing.map((e) => e.title));

    for (let idx = 0; idx < ALL_PLATFORM_FILES.length; idx++) {
      try {
        const filename = ALL_PLATFORM_FILES[idx];
        const taskNum = idx + 1;
        const filePath = `${TASKS_DIR}/${filename}`;

        if (!existsSync(filePath)) continue;

        const content = readFileSync(filePath, "utf8");
        const title = extractPlatformTitle(content, filename.replace(".md", "").replace(/-/g, " "));
        const fullTitle = `Task #${taskNum} — ${title}`;
        const summary = extractPlatformSummary(content);
        const category = detectPlatformCategory(content);
        const version = taskNumToVersion(taskNum);
        const wikiSlug = `platform-task-${String(taskNum).padStart(3, "0")}`;

        const mtime = statSync(filePath).mtime;

        let changelogEntry = existing.find((e) => e.title === fullTitle);
        if (!changelogEntry && !existingTitles.has(fullTitle)) {
          changelogEntry = await storage.createChangelogEntryWithDate(
            { title: fullTitle, description: summary.slice(0, 500) || `Platform task #${taskNum}`, category, version, wikiSlug: null },
            mtime,
          );
          existingTitles.add(fullTitle);
        }

        // Wiki article creation removed — SEVCO Platform now uses 25 feature-area articles.
        // Changelog entries only (no per-task wiki articles).
      } catch (err: any) {
        console.warn(`[seedAllTasksToChangelog] Error processing task #${idx + 1}: ${err.message}`);
      }
    }

    console.log(`[seedAllTasksToChangelog] Done — processed ${ALL_PLATFORM_FILES.length} tasks (${PLATFORM_ORDERED_FILES.length} ordered + ${PLATFORM_APPENDIX_FILES.length} appendix)`);
  } catch (err: any) {
    console.warn(`[seedAllTasksToChangelog] Fatal error: ${err.message}`);
  }
}

async function seedWikiCategories() {
  const MAIN_CATEGORIES = [
    { name: "General",     slug: "general",     icon: "Layers",     description: "General knowledge base articles covering projects, services, legal, and resources." },
    { name: "Operations",  slug: "operations",  icon: "Settings",   description: "Operational processes, supplier relations, compliance, onboarding, and finance." },
    { name: "Engineering", slug: "engineering", icon: "Code2",      description: "Internal engineering task documentation and platform development history." },
    { name: "Design",      slug: "design",      icon: "Palette",    description: "Design resources, brand guidelines, and UI/UX documentation." },
    { name: "Sales",       slug: "sales",       icon: "TrendingUp", description: "Sales processes, client onboarding, and market research." },
    { name: "Support",     slug: "support",     icon: "LifeBuoy",   description: "How-to guides, escalation processes, and frequently asked questions." },
  ];

  const SUBCATEGORIES: { name: string; slug: string; parentSlug: string }[] = [
    { name: "Projects",           slug: "general-projects",        parentSlug: "general" },
    { name: "Services",           slug: "general-services",        parentSlug: "general" },
    { name: "Legal",              slug: "legal",                   parentSlug: "general" },
    { name: "Resources",          slug: "general-resources",       parentSlug: "general" },
    { name: "Processes & Workflows", slug: "operations-processes", parentSlug: "operations" },
    { name: "Suppliers & Partners",  slug: "operations-suppliers", parentSlug: "operations" },
    { name: "Compliance",         slug: "operations-compliance",   parentSlug: "operations" },
    { name: "Onboarding",         slug: "operations-onboarding",   parentSlug: "operations" },
    { name: "Finance",            slug: "operations-finance",      parentSlug: "operations" },
    { name: "Resources",          slug: "operations-resources",    parentSlug: "operations" },
    { name: "SEVCO Platform",     slug: "sevco-platform",          parentSlug: "engineering" },
    { name: "XWEET",              slug: "engineering-xweet",       parentSlug: "engineering" },
    { name: "SEVBOOKS",           slug: "engineering-sevbooks",    parentSlug: "engineering" },
    { name: "Directr",            slug: "engineering-directr",     parentSlug: "engineering" },
    { name: "Arc",                slug: "engineering-arc",         parentSlug: "engineering" },
    { name: "SEVCO SPHERE",       slug: "engineering-sevco-sphere",parentSlug: "engineering" },
    { name: "Resources",          slug: "engineering-resources",   parentSlug: "engineering" },
    { name: "SEVCO",              slug: "design-sevco",            parentSlug: "design" },
    { name: "Brands",             slug: "design-brands",           parentSlug: "design" },
    { name: "UI/UX",              slug: "design-uiux",             parentSlug: "design" },
    { name: "Resources",          slug: "design-resources",        parentSlug: "design" },
    { name: "Processes",          slug: "sales-processes",         parentSlug: "sales" },
    { name: "Client Onboarding",  slug: "sales-onboarding",        parentSlug: "sales" },
    { name: "Market Research",    slug: "sales-research",          parentSlug: "sales" },
    { name: "Resources",          slug: "sales-resources",         parentSlug: "sales" },
    { name: "How To",             slug: "support-howto",           parentSlug: "support" },
    { name: "Escalation Process", slug: "support-escalation",     parentSlug: "support" },
    { name: "FAQ",                slug: "support-faq",             parentSlug: "support" },
    { name: "Resources",          slug: "support-resources",       parentSlug: "support" },
  ];

  await db.execute(sql`ALTER TABLE categories ADD COLUMN IF NOT EXISTS parent_id integer`);
  await db.execute(sql`ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_name_unique`);

  for (const cat of MAIN_CATEGORIES) {
    await db.execute(sql`
      INSERT INTO categories (name, slug, icon, description)
      VALUES (${cat.name}, ${cat.slug}, ${cat.icon}, ${cat.description})
      ON CONFLICT (slug) DO NOTHING
    `);
  }

  for (const sub of SUBCATEGORIES) {
    const parent = await storage.getCategoryBySlug(sub.parentSlug);
    if (!parent) continue;
    await db.execute(sql`
      INSERT INTO categories (name, slug, parent_id)
      VALUES (${sub.name}, ${sub.slug}, ${parent.id})
      ON CONFLICT (slug) DO NOTHING
    `);
    const existing = await storage.getCategoryBySlug(sub.slug);
    if (existing && existing.parentId !== parent.id) {
      await storage.updateCategoryParent(existing.id, parent.id);
    }
  }

  const legalSubcat = await storage.getCategoryBySlug("legal");
  if (legalSubcat) {
    await db.execute(sql`
      UPDATE articles
      SET category_id = ${legalSubcat.id}
      WHERE category_id IN (
        SELECT id FROM categories WHERE slug = 'legal' AND parent_id IS NOT NULL
      )
    `);
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  seedPolicyArticles().catch(console.error);
  seedChangelog()
    .then(() => seedChangelogV13())
    .then(() => seedChangelogV181())
    .then(() => linkChangelogToWikiArticles())
    .catch(console.error);
  seedJobs().catch(console.error);
  // seedEngineeringWikiArticles/updateEngineeringArticleVersions disabled — wiki now uses
  // 25 feature-area articles in SEVCO Platform (cat 12) seeded via scripts/seed-feature-articles.js
  seedSevcoplatformParentId()
    .then(() => seedWikiCategories())
    .catch(console.error);
  // seedTaskChangelogEntries adds milestone-style entries (tasks 43–55) with eng-task-* slugs.
  // seedAllTasksToChangelog is the canonical seeder for all 191 platform tasks with platform-task-* slugs.
  // Both run idempotently (dedupe by exact title), so milestone entries and task entries coexist
  // as complementary representations: milestones are brief summaries; task entries are full docs.
  seedTaskChangelogEntries().catch(console.error);
  seedAllTasksToChangelog().catch(console.error);
  seedMinecraftServers().catch(console.error);
  seedMinecraftProject().catch(console.error);
  seedRecordsProject().catch(console.error);
  storage.seedNewsCategoriesIfEmpty().catch(console.error);

  // Initialize Supabase storage buckets
  import("./supabase").then(({ ensureBucketsExist }) => ensureBucketsExist().catch(console.error));

  // Image proxy — serves Supabase public-bucket files via /images/:bucket/*
  // Buckets that require a signed URL redirect instead of direct proxying.
  const SIGNED_URL_BUCKETS = new Set(["tracks"]);

  app.get("/images/:bucket/*filePath", async (req, res) => {
    const { bucket } = req.params;
    const rawPath = req.params.filePath;
    const filePath = Array.isArray(rawPath) ? rawPath.join("/") : rawPath;

    if (SIGNED_URL_BUCKETS.has(bucket)) {
      const { getSignedUrl } = await import("./supabase");
      const download = req.query.download === "1" ? (filePath.split("/").pop() ?? true) : undefined;
      const signedUrl = await getSignedUrl(bucket, filePath, 3600, download);
      if (!signedUrl) {
        return res.status(503).json({ message: "Could not generate signed URL for track." });
      }
      return res.redirect(302, signedUrl);
    }

    const { supabase: supabaseAdmin } = await import("./supabase");
    if (!supabaseAdmin) {
      return res.status(503).json({ message: "Storage not configured." });
    }

    try {
      const { data: urlData } = supabaseAdmin.storage.from(bucket).getPublicUrl(filePath);
      const upstream = await fetch(urlData.publicUrl);
      if (!upstream.ok) {
        return res.status(upstream.status).json({ message: "File not found." });
      }
      const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      res.setHeader("X-Content-Type-Options", "nosniff");
      const body: ReadableStream<Uint8Array> | null = upstream.body;
      if (body) {
        const { Readable } = await import("stream");
        Readable.fromWeb(body).pipe(res);
      } else {
        res.end();
      }
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // robots.txt — allow all crawlers
  app.get("/robots.txt", (_req, res) => {
    res.type("text/plain").send(
      "User-agent: *\nAllow: /\nDisallow: /command\nDisallow: /account\nDisallow: /edit/\nDisallow: /new\nDisallow: /review\n\nSitemap: https://sevco.us/sitemap.xml\n"
    );
  });

  // sitemap.xml — dynamic sitemap listing all public pages
  app.get("/sitemap.xml", async (_req, res) => {
    try {
      const BASE_URL = "https://sevco.us";
      const now = new Date().toISOString().split("T")[0];

      const staticPages = [
        { url: "/", priority: "1.0", changefreq: "weekly" },
        { url: "/wiki", priority: "0.9", changefreq: "daily" },
        { url: "/store", priority: "0.8", changefreq: "weekly" },
        { url: "/music", priority: "0.8", changefreq: "weekly" },
        { url: "/music/artists", priority: "0.7", changefreq: "weekly" },
        { url: "/music/playlists", priority: "0.6", changefreq: "weekly" },
        { url: "/listen", priority: "0.6", changefreq: "weekly" },
        { url: "/projects", priority: "0.7", changefreq: "weekly" },
        { url: "/services", priority: "0.7", changefreq: "weekly" },
        { url: "/about", priority: "0.6", changefreq: "monthly" },
        { url: "/contact", priority: "0.5", changefreq: "monthly" },
        { url: "/changelog", priority: "0.5", changefreq: "weekly" },
        { url: "/jobs", priority: "0.6", changefreq: "weekly" },
        { url: "/gallery", priority: "0.5", changefreq: "weekly" },
        { url: "/hosting", priority: "0.5", changefreq: "monthly" },
        { url: "/minecraft", priority: "0.5", changefreq: "monthly" },
      ];

      const urlEntries: string[] = staticPages.map(
        (p) =>
          `  <url>\n    <loc>${BASE_URL}${p.url}</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>`
      );

      try {
        const articles = await storage.getArticles();
        const publishedArticles = articles.filter((a) => a.status === "published");
        for (const a of publishedArticles) {
          const lastmod = a.updatedAt ? new Date(a.updatedAt).toISOString() : now;
          const categorySlug = a.category?.slug;
          const wikiPath = categorySlug ? `/wiki/${categorySlug}/${a.slug}` : `/wiki/${a.slug}`;
          urlEntries.push(`  <url>\n    <loc>${BASE_URL}${wikiPath}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>`);
        }
      } catch {}

      try {
        const products = await storage.getProducts();
        for (const p of products) {
          const lastmod = p.createdAt ? new Date(p.createdAt).toISOString().split("T")[0] : now;
          urlEntries.push(`  <url>\n    <loc>${BASE_URL}/store/products/${p.slug}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.6</priority>\n  </url>`);
        }
      } catch {}

      try {
        const services = await storage.getServices();
        for (const s of services) {
          const lastmod = s.createdAt ? new Date(s.createdAt).toISOString().split("T")[0] : now;
          urlEntries.push(`  <url>\n    <loc>${BASE_URL}/services/${s.slug}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>`);
        }
      } catch {}

      try {
        const projects = await storage.getProjects();
        for (const proj of projects.filter((pr) => pr.status !== "archived")) {
          const lastmod = proj.createdAt ? new Date(proj.createdAt).toISOString().split("T")[0] : now;
          urlEntries.push(`  <url>\n    <loc>${BASE_URL}/projects/${proj.slug}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>`);
        }
      } catch {}

      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlEntries.join("\n")}\n</urlset>`;
      res.type("application/xml").send(xml);
    } catch (err: any) {
      res.status(500).send("<?xml version=\"1.0\"?><urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\"></urlset>");
    }
  });

  // Public Supabase config endpoint — anon key is safe to expose
  app.get("/api/config/supabase", async (_req, res) => {
    try {
      const { getSupabaseUrl } = await import("./supabase");
      const url = getSupabaseUrl();
      const anonKey = process.env.SUPABASE_ANON_KEY?.trim() || null;
      res.json({ url, anonKey });
    } catch {
      res.json({ url: null, anonKey: null });
    }
  });

  app.get("/api/categories", async (_req, res) => {
    const cats = await storage.getCategories();
    res.json(cats);
  });

  app.post("/api/categories", requireAuth, requireRole(...CAN_MANAGE_WIKI_SUBCATEGORIES), async (req, res) => {
    try {
      const body = insertCategorySchema.omit({ slug: true }).extend({ name: z.string().min(1), parentId: z.number().int().positive() }).safeParse(req.body);
      if (!body.success) return res.status(400).json({ message: "Invalid request", errors: body.error.flatten() });
      const { name, parentId, description, icon } = body.data;
      const allCats = await storage.getCategories();
      const parent = allCats.find((c) => c.id === parentId && c.parentId === null);
      if (!parent) return res.status(400).json({ message: "parentId must reference an existing top-level category" });
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      const existing = allCats.find((c) => c.slug === slug);
      const finalSlug = existing ? `${slug}-${Date.now()}` : slug;
      const cat = await storage.createCategory({ name, slug: finalSlug, parentId, description: description ?? null, icon: icon ?? null });
      res.status(201).json(cat);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/categories/:id", requireAuth, requireRole(...CAN_MANAGE_WIKI_SUBCATEGORIES), async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
      const allCats = await storage.getCategories();
      const cat = allCats.find((c) => c.id === id);
      if (!cat) return res.status(404).json({ message: "Category not found" });
      if (cat.parentId === null) return res.status(400).json({ message: "Cannot modify a top-level category" });
      const body = z.object({ name: z.string().min(1).optional(), description: z.string().optional().nullable(), icon: z.string().optional().nullable() }).safeParse(req.body);
      if (!body.success) return res.status(400).json({ message: "Invalid request", errors: body.error.flatten() });
      const updates: Partial<InsertCategory> = {};
      if (body.data.name !== undefined) {
        updates.name = body.data.name;
        const newSlug = body.data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
        const slugConflict = allCats.find((c) => c.slug === newSlug && c.id !== id);
        updates.slug = slugConflict ? `${newSlug}-${Date.now()}` : newSlug;
      }
      if (body.data.description !== undefined) updates.description = body.data.description;
      if (body.data.icon !== undefined) updates.icon = body.data.icon;
      const updated = await storage.updateCategory(id, updates);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/categories/:id", requireAuth, requireRole(...CAN_DELETE_WIKI_SUBCATEGORIES), async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
      const allCats = await storage.getCategories();
      const cat = allCats.find((c) => c.id === id);
      if (!cat) return res.status(404).json({ message: "Category not found" });
      if (cat.parentId === null) return res.status(400).json({ message: "Cannot delete a top-level category" });
      const articles = await storage.getArticlesByCategory(id);
      if (articles.length > 0) return res.status(400).json({ message: "Cannot delete a subcategory that has articles. Move or delete the articles first." });
      await storage.deleteCategory(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/categories/:parentSlug/:childSlug", async (req, res) => {
    const parent = await storage.getCategoryBySlug(req.params.parentSlug);
    if (!parent) return res.status(404).json({ message: "Parent category not found" });
    const allCats = await storage.getCategories();
    const child = allCats.find((c) => c.slug === req.params.childSlug && c.parentId === parent.id);
    if (!child) return res.status(404).json({ message: "Subcategory not found" });
    const catArticles = await storage.getArticlesByCategory(child.id);
    const subchildren = allCats.filter((c) => c.parentId === child.id);
    res.json({ ...child, articles: catArticles.filter((a) => a.status !== "archived"), subcategories: subchildren });
  });

  app.get("/api/categories/:slug", async (req, res) => {
    const cat = await storage.getCategoryBySlug(req.params.slug);
    if (!cat) return res.status(404).json({ message: "Category not found" });
    const catArticles = await storage.getArticlesByCategory(cat.id);
    const allCats = await storage.getCategories();
    const subcategories = allCats.filter((c) => c.parentId === cat.id);
    res.json({ ...cat, articles: catArticles.filter((a) => a.status !== "archived"), subcategories });
  });

  app.get("/api/articles", requireAuth, requireRole(...CAN_ACCESS_ARCHIVE), async (_req, res) => {
    try {
      const all = await storage.getArticles();
      res.json(all);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/articles/archived", requireAuth, requireRole(...CAN_ACCESS_ARCHIVE), async (_req, res) => {
    try {
      const all = await storage.getArticles();
      res.json(all.filter((a) => a.status === "archived"));
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/articles/recent", async (_req, res) => {
    const arts = await storage.getArticles();
    res.json(arts.filter((a) => a.status !== "archived"));
  });

  app.get("/api/articles/latest-update", async (_req, res) => {
    try {
      const date = await storage.getLatestArticleUpdatedAt();
      res.json({ updatedAt: date });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/search/x-social", async (req, res) => {
    const query = ((req.query.q as string) || "").trim();
    if (!query || query.length < 2) return res.json({ posts: [], query });

    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return res.json({ posts: [], query, error: "XAI_API_KEY not configured" });

    const makeXSearchRequest = async (model: string) => {
      return fetch("https://api.x.ai/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          input: [{ role: "user", content: `Search X (Twitter) for recent posts about: ${query}` }],
          tools: [{ type: "x_search" }],
        }),
      });
    };

    try {
      let xaiRes = await makeXSearchRequest("grok-4.20-reasoning");

      // If model not found, fall back to grok-4
      if (!xaiRes.ok) {
        const errText = await xaiRes.text();
        console.warn("[x-search] grok-4.20-reasoning not available, falling back to grok-4");
        xaiRes = await makeXSearchRequest("grok-4");
        if (!xaiRes.ok) {
          const fallbackErr = await xaiRes.text().catch(() => errText);
          console.error("[x-search] API error:", xaiRes.status, fallbackErr);
          return res.json({ posts: [], query, error: "X Search unavailable" });
        }
      }

      const data = await xaiRes.json() as any;
      const msgOutput = data?.output?.find((o: any) => o.type === "message");
      const msgContent = msgOutput?.content?.[0];
      const msgText: string = msgContent?.text ?? "";
      const annotations: any[] = msgContent?.annotations ?? [];

      const seenUrls = new Set<string>();
      const posts: Array<{ url: string; title: string; text: string; handle: string }> = [];
      for (const ann of annotations) {
        if (ann.type !== "url_citation") continue;
        const url: string = ann.url ?? "";
        if (!url || seenUrls.has(url)) continue;
        const urlMatch = url.match(/x\.com\/([^/]+)\/status/);
        if (!urlMatch) continue;
        seenUrls.add(url);
        const handle = `@${urlMatch[1]}`;
        const handleRegex = new RegExp(`@${urlMatch[1]}[^:]*:\\s*[""]?([^\\n"]{10,}?)[""]?(?:\\n|$)`, "i");
        const m = msgText.match(handleRegex);
        const snippet = m ? m[1].trim() : "";
        posts.push({ url, title: handle, text: snippet || `Post from ${handle}`, handle });
        if (posts.length >= 8) break;
      }

      res.json({ posts, query });
    } catch (err: any) {
      console.error("[x-search] Error:", err.message);
      res.json({ posts: [], query, error: "X Search failed" });
    }
  });

  app.get("/api/search", async (req, res) => {
    const query = ((req.query.q as string) || "").trim();
    const limit = Math.min(parseInt((req.query.limit as string) || "5"), 20);

    if (!query || query.length < 2) {
      return res.json({ wiki: [], projects: [], store: [], music: [], jobs: [], services: [], total: 0 });
    }

    const userRole = req.user?.role as Role | undefined;
    const isStaff = !!userRole && (["admin", "executive", "staff"] as Role[]).includes(userRole);

    const results = await storage.searchAll(query, isStaff, limit);
    res.json(results);
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
    } else {
      arts = arts.filter((a: any) => a.status !== "archived");
    }

    res.json(arts);
  });

  app.get("/api/articles/:slug", async (req: any, res) => {
    const article = await storage.getArticleBySlug(req.params.slug);
    if (!article) return res.status(404).json({ message: "Article not found" });

    if (article.status === "archived") {
      const userRole = (req.user as any)?.role as Role | undefined;
      const canAccess = !!userRole && (CAN_ACCESS_ARCHIVE as string[]).includes(userRole);
      if (!canAccess) return res.status(404).json({ message: "Article not found" });
    }

    const articleCitations = await storage.getCitations(article.id);
    const articleRevisions = await storage.getRevisions(article.id);
    const articleCrosslinks = await storage.getCrosslinks(article.id);

    const category = article.categoryId
      ? (await storage.getCategories()).find((c) => c.id === article.categoryId) || null
      : null;

    const currentUserId = req.user?.id as string | undefined;
    const { sparkCount, isSparkedByMe } = await storage.getArticleSparkInfo(article.id, currentUserId);

    let author: { username: string; displayName: string | null } | null = null;
    if (article.authorId) {
      try {
        const authorUser = await storage.getUser(article.authorId);
        if (authorUser) author = { username: authorUser.username, displayName: authorUser.displayName };
      } catch {
        // ignore
      }
    }

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
      sparkCount,
      isSparkedByMe,
      author,
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
        authorId: (req.user as any)?.id ?? null,
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
      resolveArticleLinks(article.id).catch((e) => console.error("[link-resolver] POST error:", e));
      generateSemanticLinks(article.id).catch(() => {});

      const category = article.categoryId
        ? (await storage.getCategories()).find((c) => c.id === article.categoryId) || null
        : null;
      res.json({ ...article, category: category ? { name: category.name, slug: category.slug } : null });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/articles/:slug", requireAuth, requireRole(...CAN_CREATE_ARTICLE), async (req, res) => {
    try {
      const article = await storage.getArticleBySlug(req.params.slug as string);
      if (!article) return res.status(404).json({ message: "Article not found" });

      const { citations: citationsData, editSummary, ...updateData } = req.body;
      const userRole = (req.user as any)?.role as Role | undefined;
      const isArchived = article.status === "archived";

      if (isArchived) {
        const canArchive = !!userRole && (CAN_ACCESS_ARCHIVE as string[]).includes(userRole);
        if (!canArchive) return res.status(403).json({ message: "Insufficient permissions to edit archived articles" });

        const archivedUpdate: Partial<InsertArticle> = {};
        if (updateData.title !== undefined) archivedUpdate.title = updateData.title;
        if (updateData.slug !== undefined) archivedUpdate.slug = updateData.slug;
        if (updateData.content !== undefined) archivedUpdate.content = updateData.content;
        if (updateData.summary !== undefined) archivedUpdate.summary = updateData.summary;
        if (updateData.categoryId !== undefined) archivedUpdate.categoryId = updateData.categoryId;
        if (updateData.tags !== undefined) archivedUpdate.tags = updateData.tags;
        if (updateData.infoboxType !== undefined) archivedUpdate.infoboxType = updateData.infoboxType;
        if (updateData.infoboxData !== undefined) archivedUpdate.infoboxData = updateData.infoboxData;
        const updated = await storage.updateArticle(article.id, archivedUpdate);
        if (citationsData && Array.isArray(citationsData)) {
          await storage.deleteCitationsByArticle(article.id);
          for (const cit of citationsData) {
            await storage.createCitation({
              articleId: article.id,
              url: cit.url || null,
              title: cit.title,
              format: cit.format || "APA",
              text: cit.text,
              isValid: true,
              errorMessage: null,
            });
          }
        }
        const archivedCategory = updated?.categoryId
          ? (await storage.getCategories()).find((c) => c.id === updated.categoryId) || null
          : null;
        return res.json({ ...updated, category: archivedCategory ? { name: archivedCategory.name, slug: archivedCategory.slug } : null });
      }

      const canPublish = !!userRole && (CAN_PUBLISH_ARTICLES as string[]).includes(userRole);

      const metadataUpdate: Partial<InsertArticle> = {};
      if (updateData.categoryId !== undefined) metadataUpdate.categoryId = updateData.categoryId;
      if (updateData.title !== undefined) metadataUpdate.title = updateData.title;
      if (updateData.tags !== undefined) metadataUpdate.tags = updateData.tags;
      if (updateData.infoboxType !== undefined) metadataUpdate.infoboxType = updateData.infoboxType;
      if (updateData.summary !== undefined) metadataUpdate.summary = updateData.summary;

      let updatedArticle = article;
      if (Object.keys(metadataUpdate).length > 0) {
        updatedArticle = await storage.updateArticle(article.id, metadataUpdate);
      }

      const editedContent = updateData.content || article.content;

      // Resolve [See: X] placeholders in the pending content before storing in revision.
      // writeBack=false preserves the review gate: live article.content stays unchanged until approval.
      const allRows = await db
        .select({ article: articlesSchema, categorySlug: categoriesSchema.slug })
        .from(articlesSchema)
        .leftJoin(categoriesSchema, eq(articlesSchema.categoryId, categoriesSchema.id));
      const articleRefs = allRows
        .filter((r) => r.article.id !== article.id)
        .map((r) => ({
          id: r.article.id,
          title: r.article.title,
          slug: r.article.slug,
          status: r.article.status,
          categorySlug: r.categorySlug ?? null,
        }));
      const resolveResult = await resolveLinksInContent(editedContent, articleRefs);
      const resolvedContent = resolveResult.updatedContent;

      await storage.createRevision({
        articleId: article.id,
        content: resolvedContent,
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

      // Update crosslinks and stubs to reflect resolved draft content (writeBack=false keeps live content unchanged)
      resolveArticleLinks(article.id, { content: resolvedContent, writeBack: false }).catch((e) =>
        console.error("[link-resolver] PATCH error:", e)
      );

      const updatedCategory = updatedArticle.categoryId
        ? (await storage.getCategories()).find((c) => c.id === updatedArticle.categoryId) || null
        : null;
      generateSemanticLinks(updatedArticle.id).catch(() => {});
      res.json({ ...updatedArticle, category: updatedCategory ? { name: updatedCategory.name, slug: updatedCategory.slug } : null });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/articles/:id", requireAuth, requireRole(...CAN_ACCESS_ARCHIVE), async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid article id" });
      const updated = await storage.updateArticle(id, { status: "archived" });
      res.json(updated);
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
        resolveArticleLinks(updated.articleId).catch((e) => console.error("[link-resolver] revision approval error:", e));
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
      const users = await storage.getUsersWithLinkedArtist();
      const linkedMap = new Map(users.map((u) => [u.linkedArtistId!, u.username]));
      const result = all.map((a) => ({ ...a, linkedUsername: linkedMap.get(a.id) ?? null }));
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/music/artists/:slug", async (req, res) => {
    try {
      const artist = await storage.getArtistBySlug(req.params.slug);
      if (!artist) return res.status(404).json({ message: "Artist not found" });
      const artistAlbums = await storage.getAlbumsByArtist(artist.id);
      const linkedUser = await storage.getUserByLinkedArtistId(artist.id);
      res.json({ ...artist, albums: artistAlbums, linkedUsername: linkedUser?.username ?? null });
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

  app.get("/api/music/albums", async (req, res) => {
    try {
      const artistIdRaw = req.query.artistId;
      const artistId = typeof artistIdRaw === "string" && artistIdRaw ? parseInt(artistIdRaw) : undefined;
      if (artistId !== undefined && !isNaN(artistId)) {
        const albums = await storage.getAlbumsByArtist(artistId);
        return res.json(albums);
      }
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

  app.get("/api/store/categories", async (_req, res) => {
    try {
      const cats = await storage.getStoreCategories();
      res.json(cats);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/store/categories", requireAuth, requireRole(...CAN_MANAGE_STORE_PRODUCTS), async (req, res) => {
    try {
      const data = insertStoreCategorySchema.parse(req.body);
      const cat = await storage.createStoreCategory(data);
      res.json(cat);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/store/categories/:id", requireAuth, requireRole(...CAN_MANAGE_STORE_PRODUCTS), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid category id" });
      const data = insertStoreCategorySchema.partial().parse(req.body);
      const cat = await storage.updateStoreCategory(id, data);
      if (!cat) return res.status(404).json({ message: "Category not found" });
      res.json(cat);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/store/categories/:id", requireAuth, requireRole(...CAN_MANAGE_STORE_PRODUCTS), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid category id" });
      await storage.deleteStoreCategory(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
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
      const body = { ...req.body };
      if (Array.isArray(body.imageUrls) && body.imageUrls.length > 0 && !body.imageUrl) {
        body.imageUrl = body.imageUrls[0];
      }
      if (Array.isArray(body.imageUrls) && body.imageUrls.length > 5) {
        return res.status(400).json({ message: "imageUrls must have at most 5 items" });
      }
      const data = insertProductSchema.parse(body);
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

  const patchProductSchema = z.object({
    stockStatus: z.string().optional(),
    imageUrl: z.string().nullable().optional(),
    imageUrls: z.array(z.string()).max(5).nullable().optional(),
    name: z.string().min(1).max(200).optional(),
    slug: z.string().min(1).max(200).optional(),
    description: z.string().nullable().optional(),
    price: z.number().positive().optional(),
    categoryName: z.string().min(1).max(100).optional(),
  });

  app.patch("/api/store/products/:id", requireAuth, requireRole(...CAN_MANAGE_STORE_PRODUCTS), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid product id" });
      const parsed = patchProductSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Invalid input" });
      const { imageUrls, ...rest } = parsed.data;
      const updateData: Partial<typeof parsed.data> & { imageUrl?: string | null } = { ...rest };
      if (imageUrls !== undefined) {
        updateData.imageUrls = imageUrls;
        updateData.imageUrl = Array.isArray(imageUrls) && imageUrls.length > 0 ? imageUrls[0] : null;
      }
      if (Object.keys(updateData).length === 0) return res.status(400).json({ message: "No valid fields to update" });
      const product = await storage.updateProduct(id, updateData);
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

  app.get("/api/orders", requireAuth, requireRole("admin", "executive", "staff"), async (_req, res) => {
    try {
      const allOrders = await storage.getOrders();
      res.json(allOrders);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/orders/:id/status", requireAuth, requireRole("admin", "executive", "staff"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid order id" });
      const { status } = req.body;
      if (!status || typeof status !== "string") return res.status(400).json({ message: "status required" });
      const validStatuses = ["pending", "processing", "fulfilled", "shipped", "cancelled"];
      if (!validStatuses.includes(status)) return res.status(400).json({ message: "Invalid status" });
      const order = await storage.updateOrderStatus(id, status);
      res.json(order);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/projects", async (req, res) => {
    try {
      const all = await storage.getProjects();
      const isStaff = req.isAuthenticated() && ["admin", "executive", "staff"].includes((req.user as any)?.role ?? "");
      const projects = isStaff
        ? all
        : all.map(({ budget, financialStatus, isPublicBudget, ...rest }) =>
            isPublicBudget ? { ...rest, budget, financialStatus, isPublicBudget } : rest
          );
      res.json(projects);
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
      const isStaff = req.isAuthenticated() && ["admin", "executive", "staff"].includes((req.user as any)?.role ?? "");
      if (!isStaff && !project.isPublicBudget) {
        const { budget, financialStatus, isPublicBudget, ...rest } = project;
        return res.json(rest);
      }
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

  app.delete("/api/projects/:id", requireAuth, requireRole(...CAN_MANAGE_PROJECTS), async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid project id" });
      await storage.deleteProject(id);
      res.status(204).end();
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/projects/:id/financial-summary", async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid project id" });
      const isStaff = req.isAuthenticated() && ["admin", "executive", "staff"].includes((req.user as any)?.role ?? "");
      if (!isStaff) {
        const project = await storage.getProjectById(id);
        if (!project || !project.isPublicBudget) {
          return res.status(403).json({ message: "Financial data is not public for this project" });
        }
      }
      const summary = await storage.getProjectFinancialSummary(id);
      res.json(summary);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/platform-history", async (req, res) => {
    try {
      const cat = await storage.getCategoryBySlug("sevco-platform");
      if (!cat) return res.json([]);
      const articles = await storage.getArticlesByCategory(cat.id);
      const limitParam = req.query.limit ? parseInt(req.query.limit as string) : null;

      const detectCategory = (title: string): string => {
        const t = title.toLowerCase();
        if (t.includes("fix") || t.includes("patch") || t.includes("hotfix") || t.includes("bug")) return "fix";
        if (t.includes("improv") || t.includes("update") || t.includes("optim") || t.includes("refactor")) return "improvement";
        return "feature";
      };

      let results = articles
        .filter((a) => a.status === "published")
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .map((a) => ({
          id: a.id,
          title: a.title,
          description: a.summary ?? "",
          version: (a.infoboxData as any)?.Version ?? null,
          category: detectCategory(a.title),
          slug: a.slug,
          createdAt: a.createdAt,
        }));

      if (limitParam && !isNaN(limitParam) && limitParam > 0) {
        results = results.slice(0, limitParam);
      }

      res.json(results);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/changelog", async (_req, res) => {
    try {
      const entries = await storage.getChangelog();
      res.json(entries);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/changelog/latest", async (_req, res) => {
    try {
      const entry = await storage.getLatestChangelogEntry();
      if (!entry) return res.json(null);
      res.json(entry);
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

  app.patch("/api/changelog/:id", requireAuth, requireRole(...CAN_MANAGE_CHANGELOG), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
      const data = insertChangelogSchema.partial().parse(req.body);
      const entry = await storage.updateChangelogEntry(id, data);
      res.json(entry);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.get("/api/users", requireAuth, requireRole("admin"), async (_req, res) => {
    const allUsers = await storage.getAllUsers();
    res.json(allUsers.map(({ password: _, ...u }) => u));
  });

  app.patch("/api/users/:id/username", requireAuth, requireRole("admin"), async (req: any, res) => {
    try {
      const { username } = req.body;
      if (!username || typeof username !== "string" || username.trim().length < 2) {
        return res.status(400).json({ message: "Username must be at least 2 characters" });
      }
      const trimmed = username.trim().toLowerCase().replace(/\s+/g, "_");
      const existing = await storage.getUserByUsername(trimmed);
      if (existing && existing.id !== req.params.id) {
        return res.status(409).json({ message: "Username already taken" });
      }
      if (await isUsernameReserved(trimmed)) {
        return res.status(400).json({ message: "This username is reserved." });
      }
      const updated = await storage.updateUsername(req.params.id, trimmed);
      const { password: _, ...safe } = updated;
      res.json(safe);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/users", requireAuth, requireRole("admin"), async (req: any, res) => {
    try {
      const parsed = adminCreateUserSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Invalid input" });
      }

      const { username, displayName, email, password, role } = parsed.data;

      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        return res.status(409).json({ message: "Username already taken" });
      }

      if (email) {
        const existingEmail = await storage.getUserByEmail(email);
        if (existingEmail) {
          return res.status(409).json({ message: "Email already in use" });
        }
      }

      const hashed = await bcrypt.hash(password, 10);
      const user = await storage.createUser({
        username,
        password: hashed,
        email: email || undefined,
      });

      if (role !== "user") await storage.updateUserRole(user.id, role);
      if (displayName) await storage.updateUser(user.id, { displayName });

      await storage.updateEmailVerification(user.id, { emailVerified: true });

      const fresh = await storage.getUser(user.id);
      if (!fresh) return res.status(500).json({ message: "Failed to retrieve created user" });
      const { password: _, ...safe } = fresh;
      return res.status(201).json(safe);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/users/:id/profile", requireAuth, requireRole("admin"), async (req: any, res) => {
    try {
      const { displayName, email, username } = req.body;
      if (username !== undefined) {
        if (typeof username !== "string" || username.trim().length < 2) {
          return res.status(400).json({ message: "Username must be at least 2 characters" });
        }
        const trimmed = username.trim().toLowerCase().replace(/\s+/g, "_");
        const existing = await storage.getUserByUsername(trimmed);
        if (existing && existing.id !== req.params.id) {
          return res.status(409).json({ message: "Username already taken" });
        }
        if (await isUsernameReserved(trimmed)) {
          return res.status(400).json({ message: "This username is reserved." });
        }
        await storage.updateUsername(req.params.id, trimmed);
      }
      const profileData: { displayName?: string; email?: string } = {};
      if (displayName !== undefined) profileData.displayName = displayName;
      if (email !== undefined) profileData.email = email;
      let result;
      if (Object.keys(profileData).length > 0) {
        result = await storage.updateUser(req.params.id, profileData);
      } else {
        result = await storage.getUser(req.params.id);
      }
      if (!result) return res.status(404).json({ message: "User not found" });
      const { password: _, ...safe } = result;
      res.json(safe);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/users/:id", requireAuth, requireRole("admin"), async (req: any, res) => {
    try {
      if (req.params.id === req.user.id) {
        return res.status(403).json({ message: "You cannot delete your own account" });
      }
      await storage.deleteUser(req.params.id);
      res.status(204).send();
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/dashboard/summary", requireAuth, requireRole("admin", "executive", "staff"), async (req, res) => {
    try {
      const [
        latestChangelog,
        applications,
        submissions,
        allPosts,
        allUsers,
      ] = await Promise.all([
        storage.getLatestChangelogEntry(),
        storage.getJobApplications(),
        storage.getMusicSubmissions(),
        storage.getPosts({}),
        storage.getAllUsers(),
      ]);
      const recentApplicants = [...applications]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);
      const recentSubmissions = [...submissions]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);

      const allJobs = await storage.getJobs(true);
      const jobMap: Record<number, string> = {};
      for (const job of allJobs) {
        jobMap[job.id] = job.title;
      }

      const usersByRole: Record<string, number> = {};
      for (const u of allUsers) {
        usersByRole[u.role] = (usersByRole[u.role] || 0) + 1;
      }

      res.json({
        latestChangelog: latestChangelog ?? null,
        recentApplicants: recentApplicants.map((a) => ({
          id: a.id,
          name: a.name,
          email: a.email,
          jobId: a.jobId,
          jobTitle: jobMap[a.jobId] ?? "Unknown",
          status: a.status,
          createdAt: a.createdAt,
        })),
        recentSubmissions: recentSubmissions.map((s) => ({
          id: s.id,
          artistName: s.artistName,
          trackTitle: s.trackTitle,
          submitterName: s.submitterName,
          type: s.type,
          status: s.status,
          createdAt: s.createdAt,
        })),
        counts: {
          feedPosts: allPosts.length,
          totalUsers: allUsers.length,
          usersByRole,
        },
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
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

  const CAN_MANAGE_SERVICES: Role[] = ["admin", "executive", "staff"];

  app.get("/api/services/categories", async (req, res) => {
    try {
      const allServices = await storage.getServices();
      const fromServices = [...new Set(allServices.map((s) => s.category).filter(Boolean))];
      const platformSettings = await storage.getPlatformSettings();
      let storedCategories: string[] = [];
      if (platformSettings["services.categories"]) {
        try {
          const parsed = JSON.parse(platformSettings["services.categories"]);
          if (Array.isArray(parsed)) storedCategories = parsed;
        } catch {}
      }
      const merged = [...new Set([...fromServices, ...storedCategories])].sort();
      res.json(merged);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/services/categories/rename", requireAuth, requireRole(...CAN_MANAGE_SERVICES), async (req, res) => {
    try {
      const { oldName, newName } = req.body;
      if (!oldName || !newName || typeof oldName !== "string" || typeof newName !== "string") {
        return res.status(400).json({ message: "oldName and newName are required strings" });
      }
      const allServices = await storage.getServices();
      const toUpdate = allServices.filter((s) => s.category === oldName);
      for (const s of toUpdate) {
        await storage.updateService(s.id, { category: newName });
      }
      const platformSettings = await storage.getPlatformSettings();
      let storedCategories: string[] = [];
      if (platformSettings["services.categories"]) {
        try {
          const parsed = JSON.parse(platformSettings["services.categories"]);
          if (Array.isArray(parsed)) storedCategories = parsed;
        } catch {}
      }
      const updated = storedCategories.map((c) => (c === oldName ? newName : c));
      if (!updated.includes(newName) && !updated.includes(oldName)) updated.push(newName);
      await storage.setPlatformSettings({ "services.categories": JSON.stringify(updated) });
      res.json({ success: true, updated: toUpdate.length });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/services/categories/:name", requireAuth, requireRole(...CAN_MANAGE_SERVICES), async (req, res) => {
    try {
      const name = req.params.name;
      const platformSettings = await storage.getPlatformSettings();
      let storedCategories: string[] = [];
      if (platformSettings["services.categories"]) {
        try {
          const parsed = JSON.parse(platformSettings["services.categories"]);
          if (Array.isArray(parsed)) storedCategories = parsed;
        } catch {}
      }
      const updated = storedCategories.filter((c) => c !== name);
      await storage.setPlatformSettings({ "services.categories": JSON.stringify(updated) });
      const allServices = await storage.getServices();
      const toUpdate = allServices.filter((s) => s.category === name);
      for (const s of toUpdate) {
        await storage.updateService(s.id, { category: "" });
      }
      res.json({ success: true, cleared: toUpdate.length });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

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

  app.post("/api/internal/changelog-entry", async (req, res) => {
    try {
      const secret = process.env.WIKI_AUTO_ARTICLE_SECRET;
      if (!secret) {
        return res.status(503).json({ message: "Internal endpoint not configured" });
      }
      const provided = req.headers["x-internal-secret"];
      if (provided !== secret) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { title, description, category, version, wikiSlug } = req.body;
      if (!title || !description || !category || !version) {
        return res.status(400).json({ message: "title, description, category, and version are required" });
      }

      const validCategories = ["feature", "fix", "improvement", "other"];
      const safeCategory = validCategories.includes(category) ? category : "other";

      const existing = await storage.getChangelog();
      const existingEntry = existing.find((e) => e.title === title);
      if (existingEntry) {
        if (wikiSlug && !existingEntry.wikiSlug) {
          const updated = await storage.updateChangelogEntry(existingEntry.id, { wikiSlug });
          return res.json({ action: "linked", entry: updated });
        }
        return res.json({ action: "skipped", message: "Entry with this title already exists" });
      }

      const entry = await storage.createChangelogEntry({
        title,
        description: description.slice(0, 500),
        category: safeCategory,
        version,
        wikiSlug: wikiSlug || null,
      });

      return res.json({ action: "created", entry });
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

      const { title, slug, summary, content, tags, categorySlug } = req.body;
      if (!title || !slug || !content) {
        return res.status(400).json({ message: "title, slug, and content are required" });
      }

      const targetCategorySlug = categorySlug || "engineering";
      const engineeringCat = await storage.getCategoryBySlug(targetCategorySlug);
      if (!engineeringCat) {
        return res.status(500).json({ message: `Category '${targetCategorySlug}' not found` });
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

  // Append a section to an existing feature wiki article (called by post-merge script)
  app.post("/api/internal/wiki-article/append", async (req, res) => {
    try {
      const secret = process.env.WIKI_AUTO_ARTICLE_SECRET;
      if (!secret) {
        return res.status(503).json({ message: "Internal endpoint not configured" });
      }
      const provided = req.headers["x-internal-secret"];
      if (provided !== secret) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { featureSlug, appendSection } = req.body;
      if (!featureSlug || !appendSection) {
        return res.status(400).json({ message: "featureSlug and appendSection are required" });
      }

      const existing = await storage.getArticleBySlug(featureSlug);
      if (!existing) {
        return res.status(404).json({ message: `Feature article not found: ${featureSlug}` });
      }

      const newContent = (existing.content || "") + appendSection;
      const updated = await storage.updateArticle(existing.id, {
        content: newContent,
      });

      return res.json({ action: "appended", article: { id: updated.id, slug: updated.slug } });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Profile routes
  app.get("/api/profile/:username", async (req, res) => {
    try {
      const user = await storage.getUserByUsername(req.params.username);
      if (!user) return res.status(404).json({ message: "User not found" });
      const publicProfile = {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        bio: user.bio,
        role: user.role,
        avatarUrl: user.avatarUrl,
        profileBgColor: user.profileBgColor,
        profileAccentColor: user.profileAccentColor,
        profileBgImageUrl: user.profileBgImageUrl,
        socialLinks: user.socialLinks,
        emailVerified: user.emailVerified,
        bannerUrl: user.bannerUrl,
        profileBgOpacity: user.profileBgOpacity,
        profileStatus: user.profileStatus,
        profileFeaturedType: user.profileFeaturedType,
        profileFeaturedId: user.profileFeaturedId,
        profileLayout: user.profileLayout,
        profileFont: user.profileFont,
        profilePronouns: user.profilePronouns,
        profileAccentGradient: user.profileAccentGradient,
        profileShowFollowers: user.profileShowFollowers,
        linkedArtistId: user.linkedArtistId ?? null,
      };
      res.json(publicProfile);
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
      const publicProfile = {
        id: updated.id,
        username: updated.username,
        displayName: updated.displayName,
        bio: updated.bio,
        role: updated.role,
        avatarUrl: updated.avatarUrl,
        profileBgColor: updated.profileBgColor,
        profileAccentColor: updated.profileAccentColor,
        profileBgImageUrl: updated.profileBgImageUrl,
        socialLinks: updated.socialLinks,
        emailVerified: updated.emailVerified,
        bannerUrl: updated.bannerUrl,
        profileBgOpacity: updated.profileBgOpacity,
        profileStatus: updated.profileStatus,
        profileFeaturedType: updated.profileFeaturedType,
        profileFeaturedId: updated.profileFeaturedId,
        profileLayout: updated.profileLayout,
        profileFont: updated.profileFont,
        profilePronouns: updated.profilePronouns,
        profileAccentGradient: updated.profileAccentGradient,
        profileShowFollowers: updated.profileShowFollowers,
      };
      res.json(publicProfile);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/profile/:username/articles", async (req, res) => {
    try {
      const arts = await storage.getArticlesByAuthor(req.params.username);
      res.json(arts.filter((a) => a.status === "published"));
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Jobs routes
  app.get("/api/jobs", async (req: any, res) => {
    try {
      const includeAll = req.query.all === "true";
      if (includeAll) {
        if (!req.isAuthenticated || !req.isAuthenticated()) {
          return res.status(401).json({ message: "Unauthorized" });
        }
        if (!CAN_MANAGE_JOBS.includes(req.user?.role)) {
          return res.status(403).json({ message: "Forbidden" });
        }
      }
      const jobList = await storage.getJobs(includeAll);
      res.json(jobList);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/jobs/:slug", async (req, res) => {
    try {
      const job = await storage.getJobBySlug(req.params.slug);
      if (!job) return res.status(404).json({ message: "Job not found" });
      res.json(job);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/jobs", requireAuth, requireRole(CAN_MANAGE_JOBS), async (req: any, res) => {
    try {
      const parsed = insertJobSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
      const job = await storage.createJob(parsed.data);
      res.status(201).json(job);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/jobs/:id", requireAuth, requireRole(...CAN_MANAGE_JOBS), async (req: any, res) => {
    try {
      const job = await storage.updateJob(Number(req.params.id), req.body);
      res.json(job);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/jobs/:id", requireAuth, requireRole(...CAN_MANAGE_JOBS), async (req: any, res) => {
    try {
      await storage.deleteJob(Number(req.params.id));
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/jobs/:id/apply", requireAuth, async (req: any, res) => {
    try {
      const userId: string = req.user.id;
      const job = await storage.getJobBySlug(req.params.id);
      if (!job) return res.status(404).json({ message: "Job not found" });
      const jobId = job.id;
      const existing = await storage.getUserJobApplication(userId, jobId);
      if (existing) {
        return res.status(409).json({ message: "You have already applied for this job." });
      }
      const parsed = insertJobApplicationSchema.safeParse({ ...req.body, jobId });
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
      const app2 = await storage.createJobApplication({ ...parsed.data, userId });
      res.status(201).json(app2);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/jobs/:id/my-application", requireAuth, async (req: any, res) => {
    try {
      const userId: string = req.user.id;
      const job = await storage.getJobBySlug(req.params.id);
      if (!job) return res.status(404).json({ message: "Job not found" });
      const app2 = await storage.getUserJobApplication(userId, job.id);
      res.json(app2 ?? null);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/job-applications", requireAuth, requireRole(CAN_MANAGE_JOBS), async (req: any, res) => {
    try {
      const jobId = req.query.jobId ? Number(req.query.jobId) : undefined;
      const apps = await storage.getJobApplications(jobId);
      res.json(apps);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/job-applications/:id", requireAuth, requireRole(CAN_MANAGE_JOBS), async (req: any, res) => {
    try {
      const { status } = req.body;
      if (!status || !["pending", "reviewing", "accepted", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      const app2 = await storage.updateJobApplicationStatus(Number(req.params.id), status);
      res.json(app2);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Playlist routes
  app.get("/api/music/playlists", async (_req, res) => {
    try {
      const items = await storage.getPlaylists(true);
      res.json(items);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/music/playlists", requireAuth, requireRole(...CAN_MANAGE_MUSIC), async (req, res) => {
    try {
      const parsed = insertPlaylistSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
      const playlist = await storage.createPlaylist(parsed.data);
      res.status(201).json(playlist);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/music/playlists/:id", requireAuth, requireRole(...CAN_MANAGE_MUSIC), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const parsed = insertPlaylistSchema.partial().safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
      const playlist = await storage.updatePlaylist(id, parsed.data);
      res.json(playlist);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/music/playlists/:id", requireAuth, requireRole(...CAN_MANAGE_MUSIC), async (req, res) => {
    try {
      await storage.deletePlaylist(parseInt(req.params.id));
      res.status(204).end();
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Music submission routes
  app.post("/api/music/submissions", async (req: any, res) => {
    try {
      const parsed = insertMusicSubmissionSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
      const type = req.body.type ?? "label";
      if (type === "label" && !req.isAuthenticated()) {
        return res.status(401).json({ message: "Sign in to submit to SEVCO RECORDS" });
      }
      const userId = req.user?.id ?? null;
      const sub = await storage.createMusicSubmission({ ...parsed.data, userId });
      res.status(201).json(sub);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/music/submissions", requireAuth, requireRole(...CAN_MANAGE_MUSIC), async (_req, res) => {
    try {
      const subs = await storage.getMusicSubmissions();
      res.json(subs);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/music/submissions/:id/status", requireAuth, requireRole(...CAN_MANAGE_MUSIC), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      if (!status) return res.status(400).json({ message: "status is required" });
      const sub = await storage.updateMusicSubmissionStatus(id, status);
      res.json(sub);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/music/submissions/:id/track-file", requireAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const { trackFileUrl } = req.body;
      if (!trackFileUrl) return res.status(400).json({ message: "trackFileUrl is required" });
      const sub = await storage.getMusicSubmissionById(id);
      if (!sub) return res.status(404).json({ message: "Submission not found" });
      if (sub.userId !== req.user?.id && !["admin", "executive"].includes(req.user?.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const updated = await storage.updateMusicSubmissionTrackFile(id, trackFileUrl);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/music/submissions/:id/track-url", requireAuth, requireRole(...CAN_MANAGE_MUSIC), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const sub = await storage.getMusicSubmissionById(id);
      if (!sub) return res.status(404).json({ message: "Submission not found" });
      if (!sub.trackFileUrl) return res.status(404).json({ message: "No uploaded track file" });
      const { getSignedUrl } = await import("./supabase");
      const signedUrl = await getSignedUrl("tracks", sub.trackFileUrl);
      if (!signedUrl) return res.status(503).json({ message: "Could not generate signed URL" });
      res.json({ signedUrl });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/music/tracks/:id/signed-url", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const track = await storage.getMusicTrackById(id);
      if (!track) return res.status(404).json({ message: "Track not found" });
      if (!track.fileUrl) return res.status(404).json({ message: "No file URL for track" });
      const { getSignedUrl } = await import("./supabase");
      const signedUrl = await getSignedUrl("tracks", track.fileUrl);
      if (!signedUrl) return res.status(503).json({ message: "Could not generate signed URL" });
      res.json({ signedUrl });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ── Music Tracks CRUD ──────────────────────────────────────────────────
  const CAN_MANAGE_TRACKS: Role[] = ["admin", "executive", "staff"];
  const CAN_DELETE_TRACKS: Role[] = ["admin", "executive"];

  app.get("/api/music/tracks", async (req, res) => {
    try {
      const rawType = req.query.type;
      const typeParam: string | undefined = typeof rawType === "string" ? rawType : undefined;
      if (typeParam !== undefined && typeParam !== "track" && typeParam !== "instrumental") {
        return res.status(400).json({ message: "Invalid type parameter. Must be 'track' or 'instrumental'." });
      }
      
      const user = (req as any).user;
      const isStaffRole = user && ["admin", "executive", "staff"].includes(user.role);
      const publishedOnly = !isStaffRole;

      const artistIdRaw = req.query.artist_id;
      const artistId = typeof artistIdRaw === "string" && artistIdRaw ? parseInt(artistIdRaw) : undefined;
      const albumNameRaw = req.query.album_name;
      const albumName = typeof albumNameRaw === "string" && albumNameRaw ? albumNameRaw : undefined;
      const tracks = await storage.getMusicTracks({
        type: typeParam,
        publishedOnly,
        artistId: artistId !== undefined && !isNaN(artistId) ? artistId : undefined,
        albumName,
      });
      res.json(tracks);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/music/tracks/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const track = await storage.getMusicTrackById(id);
      if (!track) return res.status(404).json({ message: "Track not found" });
      res.json(track);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/music/tracks", requireAuth, requireRole(...CAN_MANAGE_TRACKS), async (req, res) => {
    try {
      const parsed = insertMusicTrackSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.flatten() });
      const track = await storage.createMusicTrack(parsed.data);
      res.status(201).json(track);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/music/tracks/:id", requireAuth, requireRole(...CAN_MANAGE_TRACKS), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existing = await storage.getMusicTrackById(id);
      if (!existing) return res.status(404).json({ message: "Track not found" });
      const parsed = insertMusicTrackSchema.partial().safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.flatten() });
      const track = await storage.updateMusicTrack(id, parsed.data);
      res.json(track);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/music/tracks/:id", requireAuth, requireRole(...CAN_DELETE_TRACKS), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existing = await storage.getMusicTrackById(id);
      if (!existing) return res.status(404).json({ message: "Track not found" });
      await storage.deleteMusicTrack(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/music/tracks/:id/stream", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const track = await storage.getMusicTrackById(id);
      if (!track) return res.status(404).json({ message: "Track not found" });
      const updated = await storage.incrementMusicTrackStream(id);
      res.json(updated);
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

      await storage.createContactSubmission({ name, email, subject, message });

      try {
        await sendContactEmail(name, email, subject, message);
      } catch (emailErr: any) {
        console.error("[contact] Email send failed:", emailErr.message);
      }

      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  const CAN_VIEW_SUPPORT: Role[] = ["admin", "executive", "staff"];

  app.get("/api/contact-submissions", requireAuth, requireRole(...CAN_VIEW_SUPPORT), async (req, res) => {
    try {
      const { subject, status } = req.query as { subject?: string; status?: string };
      const submissions = await storage.getContactSubmissions({
        subject: subject || undefined,
        status: status || undefined,
      });
      res.json(submissions);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/contact-submissions/:id", requireAuth, requireRole(...CAN_VIEW_SUPPORT), async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
      const { z } = await import("zod");
      const schema = z.object({
        status: z.enum(["open", "in_progress", "resolved", "closed"]).optional(),
        staffNote: z.string().optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid input" });
      const updated = await storage.updateContactSubmission(id, parsed.data);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/contact-submissions/:id/reply", requireAuth, requireRole(...CAN_VIEW_SUPPORT), async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
      const submission = await storage.getContactSubmissionById(id);
      if (!submission) return res.status(404).json({ message: "Submission not found" });
      const { z } = await import("zod");
      const schema = z.object({
        body: z.string().min(1, "Reply body is required"),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid input" });
      await sendContactReplyEmail(submission.email, submission.name, submission.subject, parsed.data.body);
      const updated = await storage.updateContactSubmission(id, { repliedAt: new Date() });
      res.json(updated);
    } catch (err: any) {
      const isConfigError = err.message?.includes('API key not found') || err.message?.includes('not configured');
      res.status(isConfigError ? 503 : 500).json({ message: err.message });
    }
  });

  app.patch("/api/articles/:id/archive", requireAuth, requireRole(...CAN_ACCESS_ARCHIVE), async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid article id" });
      const updated = await storage.updateArticle(id, { status: "archived" });
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/articles/:id/unarchive", requireAuth, requireRole(...CAN_ACCESS_ARCHIVE), async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid article id" });
      const updated = await storage.updateArticle(id, { status: "draft" });
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/articles/:id/republish", requireAuth, requireRole(...CAN_ACCESS_ARCHIVE), async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid article id" });
      const userRole = (req.user as any)?.role as Role | undefined;
      const canPublish = !!userRole && (CAN_PUBLISH_ARTICLES as string[]).includes(userRole);
      if (canPublish) {
        const updated = await storage.updateArticle(id, { status: "published" });
        return res.json(updated);
      }
      const article = await storage.getArticleById(id);
      if (!article) return res.status(404).json({ message: "Article not found" });
      await storage.createRevision({
        articleId: id,
        content: article.content,
        infoboxData: article.infoboxData,
        summary: article.summary,
        editSummary: "Submitted for republication",
        status: "pending",
        authorName: req.user?.username ?? "Editor",
      });
      const updated = await storage.updateArticle(id, { status: "draft" });
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.get("/api/social-links", async (_req, res) => {
    try {
      const links = await storage.getSocialLinks();
      res.json(links);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/social-links", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const link = await storage.createSocialLink(req.body);
      res.status(201).json(link);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/social-links/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
      const updated = await storage.updateSocialLink(id, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/social-links/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
      await storage.deleteSocialLink(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // Notes routes
  app.get("/api/public-notes/:resourceType/:resourceId", async (req, res) => {
    try {
      const { resourceType, resourceId } = req.params;
      if (!["project", "article"].includes(resourceType)) return res.status(400).json({ message: "Invalid resourceType" });
      const notesList = await storage.getPublicResourceNotes(resourceType as "project" | "article", parseInt(resourceId));
      res.json(notesList);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/notes", requireAuth, async (req: any, res) => {
    try {
      const notesList = await storage.getNotes(req.user.id);
      res.json(notesList);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/notes/:id", requireAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const note = await storage.getNoteById(id);
      if (!note) return res.status(404).json({ message: "Note not found" });
      if (note.authorId !== req.user.id) {
        const collaborators = await storage.getNoteCollaborators(id);
        const isCollaborator = collaborators.some((c) => c.userId === req.user.id);
        if (!isCollaborator) return res.status(403).json({ message: "Access denied" });
      }
      res.json(note);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/notes", requireAuth, async (req: any, res) => {
    try {
      const parsed = insertNoteSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
      const note = await storage.createNote({ ...parsed.data, authorId: req.user.id });
      res.status(201).json(note);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/notes/:id", requireAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const existingNote = await storage.getNoteById(id);
      if (!existingNote) return res.status(404).json({ message: "Note not found" });
      const isOwner = existingNote.authorId === req.user.id;
      const collaborators = await storage.getNoteCollaborators(id);
      const isCollaborator = collaborators.some((c) => c.userId === req.user.id);
      if (!isOwner && !isCollaborator) return res.status(403).json({ message: "Access denied" });
      const safeSchema = insertNoteSchema.partial().pick({ title: true, content: true, color: true, pinned: true });
      const ownerSchema = insertNoteSchema.partial().pick({ title: true, content: true, color: true, pinned: true, isShared: true });
      const parsed = (isOwner ? ownerSchema : safeSchema).safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
      const note = await storage.updateNote(id, req.user.id, parsed.data);
      if (!note) return res.status(404).json({ message: "Note not found" });
      res.json(note);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/notes/:id", requireAuth, async (req: any, res) => {
    try {
      await storage.deleteNote(parseInt(req.params.id), req.user.id);
      res.status(204).end();
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Note collaborator routes
  app.get("/api/notes/:id/collaborators", requireAuth, async (req: any, res) => {
    try {
      const noteId = parseInt(req.params.id);
      const note = await storage.getNoteById(noteId);
      if (!note) return res.status(404).json({ message: "Note not found" });
      const isAuthor = note.authorId === req.user.id;
      const allNotes = await storage.getNotes(req.user.id);
      const canAccess = isAuthor || allNotes.some((n) => n.id === noteId);
      if (!canAccess) return res.status(403).json({ message: "Access denied" });
      const collaborators = await storage.getNoteCollaborators(noteId);
      res.json(collaborators);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/notes/:id/collaborators", requireAuth, async (req: any, res) => {
    try {
      const noteId = parseInt(req.params.id);
      const note = await storage.getNoteById(noteId);
      if (!note) return res.status(404).json({ message: "Note not found" });
      if (note.authorId !== req.user.id) return res.status(403).json({ message: "Only the author can add collaborators" });
      const { username } = req.body;
      if (!username) return res.status(400).json({ message: "Username is required" });
      const targetUser = await storage.getUserByUsername(username);
      if (!targetUser) return res.status(404).json({ message: "User not found" });
      if (targetUser.id === req.user.id) return res.status(400).json({ message: "Cannot add yourself as collaborator" });
      const collab = await storage.addNoteCollaborator(noteId, targetUser.id);
      res.status(201).json(collab);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/notes/:id/collaborators/:userId", requireAuth, async (req: any, res) => {
    try {
      const noteId = parseInt(req.params.id);
      const note = await storage.getNoteById(noteId);
      if (!note) return res.status(404).json({ message: "Note not found" });
      if (note.authorId !== req.user.id) return res.status(403).json({ message: "Only the author can remove collaborators" });
      await storage.removeNoteCollaborator(noteId, req.params.userId);
      res.status(204).end();
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Note attachment routes
  app.get("/api/notes/:id/attachments", requireAuth, async (req: any, res) => {
    try {
      const noteId = parseInt(req.params.id);
      const note = await storage.getNoteById(noteId);
      if (!note) return res.status(404).json({ message: "Note not found" });
      const allNotes = await storage.getNotes(req.user.id);
      const canAccess = note.authorId === req.user.id || allNotes.some((n) => n.id === noteId);
      if (!canAccess) return res.status(403).json({ message: "Access denied" });
      const attachments = await storage.getNoteAttachments(noteId);
      res.json(attachments);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/notes/:id/attachments", requireAuth, async (req: any, res) => {
    try {
      const noteId = parseInt(req.params.id);
      const note = await storage.getNoteById(noteId);
      if (!note) return res.status(404).json({ message: "Note not found" });
      const allNotes = await storage.getNotes(req.user.id);
      const canAccess = note.authorId === req.user.id || allNotes.some((n) => n.id === noteId);
      if (!canAccess) return res.status(403).json({ message: "Access denied" });
      const { resourceType, resourceId } = req.body;
      if (!resourceType || !resourceId) return res.status(400).json({ message: "resourceType and resourceId are required" });
      if (!["project", "article"].includes(resourceType)) return res.status(400).json({ message: "resourceType must be 'project' or 'article'" });
      const attachment = await storage.addNoteAttachment(noteId, resourceType, parseInt(resourceId));
      res.status(201).json(attachment);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/notes/attachments/:attachmentId", requireAuth, async (req: any, res) => {
    try {
      const attachmentId = parseInt(req.params.attachmentId);
      const attachment = await storage.getNoteAttachmentById(attachmentId);
      if (!attachment) return res.status(404).json({ message: "Attachment not found" });
      const note = await storage.getNoteById(attachment.noteId);
      if (!note) return res.status(404).json({ message: "Note not found" });
      const accessibleNotes = await storage.getNotes(req.user.id);
      const canAccess = accessibleNotes.some((n) => n.id === attachment.noteId);
      if (!canAccess) return res.status(403).json({ message: "Access denied" });
      await storage.removeNoteAttachment(attachmentId);
      res.status(204).end();
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Feed routes
  const CAN_MANAGE_FEED: Role[] = ["admin", "executive"];

  app.get("/api/feed", async (req, res) => {
    try {
      const limit = Math.min(parseInt((req.query.limit as string) || "50"), 100);
      const pinned = req.query.pinned === "true";
      const posts = await storage.getFeedPosts(limit);
      if (pinned) {
        const pinnedPost = posts.find((p) => p.pinned);
        return res.json(pinnedPost ? [pinnedPost] : []);
      }
      res.json(posts);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/feed", requireAuth, requireRole(...CAN_MANAGE_FEED), async (req: any, res) => {
    try {
      const parsed = insertFeedPostSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
      const post = await storage.createFeedPost({ ...parsed.data, authorId: req.user.id });
      res.status(201).json(post);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/feed/:id", requireAuth, requireRole(...CAN_MANAGE_FEED), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
      const parsed = insertFeedPostSchema.partial().safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
      const post = await storage.updateFeedPost(id, parsed.data);
      res.json(post);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/feed/:id", requireAuth, requireRole(...CAN_MANAGE_FEED), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
      await storage.deleteFeedPost(id);
      res.status(204).end();
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Social posts
  app.get("/api/posts", async (req: any, res) => {
    try {
      const userId = (req.query.userId as string) || undefined;
      const currentUserId = req.user?.id;
      const limit = Math.min(parseInt((req.query.limit as string) || "50"), 100);
      const followingOnly = req.query.followingOnly === "true";
      let result;
      if (followingOnly) {
        if (!currentUserId) return res.status(401).json({ message: "Login required" });
        result = await storage.getPosts({ followedByUserId: currentUserId, limit });
      } else {
        result = await storage.getPosts({ userId, currentUserId, limit });
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/me/onboarding", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      const hasAvatar = !!(user.avatarUrl && user.avatarUrl.trim().length > 0);
      const hasBio = !!(user.bio && user.bio.trim().length > 0);
      const userPosts = await storage.getPosts({ userId, limit: 1 });
      const hasPost = userPosts.length > 0;
      const followingCount = await storage.getFollowingCount(userId);
      const hasFollow = followingCount > 0;
      const socialLinks = user.socialLinks as Record<string, string | null> | null;
      const hasSocialLink = !!(socialLinks && Object.values(socialLinks).some((v) => v && v.trim().length > 0));
      res.json({ hasAvatar, hasBio, hasPost, hasFollow, hasSocialLink });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/posts", requireAuth, async (req: any, res) => {
    try {
      const parsed = insertPostSchema.extend({ content: z.string().min(1).max(500) }).safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
      const post = await storage.createPost({ ...parsed.data, authorId: req.user.id });
      res.status(201).json(post);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/posts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
      const post = await storage.getPostById(id);
      if (!post) return res.status(404).json({ message: "Post not found" });
      res.json(post);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/posts/:id", requireAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
      const post = await storage.getPostById(id);
      if (!post) return res.status(404).json({ message: "Post not found" });
      const userRole = req.user?.role as Role;
      const isOwner = post.authorId === req.user.id;
      const canDelete = isOwner || ["admin", "executive"].includes(userRole);
      if (!canDelete) return res.status(403).json({ message: "Not authorized" });
      await storage.deletePost(id, post.authorId);
      res.status(204).end();
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/posts/:id/like", requireAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
      await storage.likePost(id, req.user.id);
      res.status(204).end();
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/posts/:id/like", requireAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
      await storage.unlikePost(id, req.user.id);
      res.status(204).end();
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/posts/:id/replies", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
      const replies = await storage.getReplies(id);
      res.json(replies);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/posts/:id/replies", requireAuth, async (req: any, res) => {
    try {
      const postId = parseInt(req.params.id);
      if (isNaN(postId)) return res.status(400).json({ message: "Invalid id" });
      const parsed = insertPostReplySchema.extend({ content: z.string().min(1).max(500) }).safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
      const reply = await storage.createReply({ ...parsed.data, postId, authorId: req.user.id });
      res.status(201).json(reply);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Repost routes
  app.post("/api/posts/:id/repost", requireAuth, async (req: any, res) => {
    try {
      const postId = parseInt(req.params.id);
      if (isNaN(postId)) return res.status(400).json({ message: "Invalid id" });
      const repost = await storage.repostPost(postId, req.user.id);
      res.status(201).json(repost);
    } catch (err: any) {
      if (err.message === "Already reposted") return res.status(409).json({ message: err.message });
      if (err.message === "Post not found") return res.status(404).json({ message: err.message });
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/posts/:id/repost", requireAuth, async (req: any, res) => {
    try {
      const postId = parseInt(req.params.id);
      if (isNaN(postId)) return res.status(400).json({ message: "Invalid id" });
      await storage.unrepostPost(postId, req.user.id);
      res.status(204).end();
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Social spark routes
  app.post("/api/posts/:id/spark", requireAuth, async (req: any, res) => {
    try {
      const postId = parseInt(req.params.id);
      if (isNaN(postId)) return res.status(400).json({ message: "Invalid id" });
      const result = await storage.sparkPost(postId, req.user.id);
      if (result.selfSpark) return res.status(403).json({ message: "Cannot spark your own content" });
      if (result.rateLimited) return res.status(429).json({ message: "Daily spark limit reached (10 per day)" });
      if (result.alreadySparked) return res.status(409).json({ message: "Already sparked" });
      res.status(204).end();
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/articles/:slug/spark", requireAuth, async (req: any, res) => {
    try {
      const article = await storage.getArticleBySlug(req.params.slug);
      if (!article) return res.status(404).json({ message: "Article not found" });
      const result = await storage.sparkArticle(article.id, req.user.id);
      if (result.selfSpark) return res.status(403).json({ message: "Cannot spark your own content" });
      if (result.rateLimited) return res.status(429).json({ message: "Daily spark limit reached (10 per day)" });
      if (result.alreadySparked) return res.status(409).json({ message: "Already sparked" });
      res.status(204).end();
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/gallery/:id/spark", requireAuth, async (req: any, res) => {
    try {
      const imageId = parseInt(req.params.id);
      if (isNaN(imageId)) return res.status(400).json({ message: "Invalid id" });
      const result = await storage.sparkGalleryImage(imageId, req.user.id);
      if (result.selfSpark) return res.status(403).json({ message: "Cannot spark your own content" });
      if (result.rateLimited) return res.status(429).json({ message: "Daily spark limit reached (10 per day)" });
      if (result.alreadySparked) return res.status(409).json({ message: "Already sparked" });
      res.status(204).end();
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Discover / user search routes
  app.get("/api/users/top", async (req: any, res) => {
    try {
      const currentUserId = req.user?.id;
      const topUsers = await storage.getTopFollowedUsers(10, currentUserId);
      res.json(topUsers);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/users/search", async (req: any, res) => {
    try {
      const q = (req.query.q as string) || "";
      if (!q.trim()) return res.json([]);
      const currentUserId = req.user?.id;
      const results = await storage.searchUsers(q, currentUserId);
      res.json(results);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // User follow routes
  app.get("/api/users/:username/profile", async (req, res) => {
    try {
      const profile = await storage.getUserByUsername(req.params.username);
      if (!profile) return res.status(404).json({ message: "User not found" });
      const followerCount = await storage.getFollowerCount(profile.id);
      const followingCount = await storage.getFollowingCount(profile.id);
      const currentUserId = (req.user as any)?.id;
      const isFollowing = currentUserId ? await storage.isFollowing(currentUserId, profile.id) : false;
      res.json({
        id: profile.id,
        username: profile.username,
        displayName: profile.displayName,
        bio: profile.bio,
        avatarUrl: profile.avatarUrl,
        role: profile.role,
        emailVerified: profile.emailVerified,
        profileBgColor: profile.profileBgColor,
        profileAccentColor: profile.profileAccentColor,
        profileBgImageUrl: profile.profileBgImageUrl,
        socialLinks: profile.socialLinks,
        followerCount,
        followingCount,
        isFollowing,
        bannerUrl: profile.bannerUrl,
        profileBgOpacity: profile.profileBgOpacity,
        profileStatus: profile.profileStatus,
        profileFeaturedType: profile.profileFeaturedType,
        profileFeaturedId: profile.profileFeaturedId,
        profileLayout: profile.profileLayout,
        profileFont: profile.profileFont,
        profilePronouns: profile.profilePronouns,
        profileAccentGradient: profile.profileAccentGradient,
        profileShowFollowers: profile.profileShowFollowers,
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/users/:username/follow", requireAuth, async (req: any, res) => {
    try {
      const target = await storage.getUserByUsername(req.params.username);
      if (!target) return res.status(404).json({ message: "User not found" });
      if (target.id === req.user.id) return res.status(400).json({ message: "Cannot follow yourself" });
      await storage.followUser(req.user.id, target.id);
      res.status(204).end();
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/users/:username/follow", requireAuth, async (req: any, res) => {
    try {
      const target = await storage.getUserByUsername(req.params.username);
      if (!target) return res.status(404).json({ message: "User not found" });
      await storage.unfollowUser(req.user.id, target.id);
      res.status(204).end();
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/users/:username/followers", async (req, res) => {
    try {
      const profile = await storage.getUserByUsername(req.params.username);
      if (!profile) return res.status(404).json({ message: "User not found" });
      const followers = await storage.getFollowers(profile.id);
      res.json(followers);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/users/:username/following", async (req, res) => {
    try {
      const profile = await storage.getUserByUsername(req.params.username);
      if (!profile) return res.status(404).json({ message: "User not found" });
      const following = await storage.getFollowing(profile.id);
      res.json(following);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/users/:username/posts", async (req: any, res) => {
    try {
      const profile = await storage.getUserByUsername(req.params.username);
      if (!profile) return res.status(404).json({ message: "User not found" });
      const currentUserId = req.user?.id;
      const userPosts = await storage.getPosts({ userId: profile.id, currentUserId });
      res.json(userPosts);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/users/:username/top-sparked-posts", async (req: any, res) => {
    try {
      const profile = await storage.getUserByUsername(req.params.username);
      if (!profile) return res.status(404).json({ message: "User not found" });
      const posts = await storage.getTopSparkedPostsByUser(profile.id, 3);
      res.json(posts);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  const CAN_MANAGE_RESOURCES: Role[] = ["admin", "executive"];

  app.get("/api/resources", requireAuth, requireRole(...CAN_MANAGE_RESOURCES), async (_req, res) => {
    try {
      const list = await storage.getResources();
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/resources", requireAuth, requireRole(...CAN_MANAGE_RESOURCES), async (req, res) => {
    try {
      const parsed = insertResourceSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
      const resource = await storage.createResource(parsed.data);
      res.status(201).json(resource);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/resources/:id", requireAuth, requireRole(...CAN_MANAGE_RESOURCES), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
      const parsed = insertResourceSchema.partial().safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
      const updated = await storage.updateResource(id, parsed.data);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/resources/:id", requireAuth, requireRole(...CAN_MANAGE_RESOURCES), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
      await storage.deleteResource(id);
      res.status(204).end();
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  const CAN_MANAGE_HOSTING: Role[] = ["admin"];

  app.get("/api/hostinger/vps", requireAuth, requireRole(...CAN_MANAGE_HOSTING), async (_req, res) => {
    if (!hostinger.isHostingerConfigured()) {
      return res.status(503).json({ message: "Hostinger API is not configured. HOSTINGER_API_KEY is missing." });
    }
    try {
      const data = await hostinger.getVirtualMachines();
      const vms: any[] = Array.isArray(data) ? data : ((data as any)?.data ?? []);
      console.log(`[Hostinger] VPS list returned ${vms.length} machine(s)`);
      res.json(data);
    } catch (err: any) {
      console.error("[Hostinger] VPS list error:", err.message);
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/hostinger/vps/:id", requireAuth, requireRole(...CAN_MANAGE_HOSTING), async (req, res) => {
    if (!hostinger.isHostingerConfigured()) {
      return res.status(503).json({ message: "Hostinger API is not configured. HOSTINGER_API_KEY is missing." });
    }
    try {
      const data = await hostinger.getVirtualMachine(req.params.id);
      res.json(data);
    } catch (err: any) {
      console.error("[Hostinger] VPS detail error:", err.message);
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/hostinger/domains/availability", async (req, res) => {
    if (!process.env.HOSTINGER_API_KEY) {
      return res.status(503).json({ message: "Domain search is not configured. HOSTINGER_API_KEY is missing." });
    }
    try {
      const { domain, tlds } = req.body;
      if (!domain || typeof domain !== "string") {
        return res.status(400).json({ message: "domain is required" });
      }
      const data = await hostinger.checkDomainAvailability(domain, tlds ?? []);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/hostinger/domains/catalog", async (req, res) => {
    try {
      const data = await hostinger.getBillingCatalog();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/hostinger/domains/portfolio", requireAuth, requireRole(...CAN_MANAGE_HOSTING), async (_req, res) => {
    try {
      const data = await hostinger.getDomainPortfolio();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/hostinger/whois", requireAuth, requireRole(...CAN_MANAGE_HOSTING), async (_req, res) => {
    try {
      const data = await hostinger.getWhoisProfiles();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/hostinger/domains/purchase", requireAuth, requireRole(...CAN_MANAGE_HOSTING), async (req, res) => {
    try {
      const { domain, whoisId, paymentMethodId } = req.body;
      if (!domain || !whoisId) {
        return res.status(400).json({ message: "domain and whoisId are required" });
      }
      const data = await hostinger.purchaseDomain({ domain, whoisId, paymentMethodId });
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  registerSpotifyRoutes(app);
  registerWikifyToolRoutes(app);

  app.get("/api/tools/wiki/stubs", requireAuth, requireRole("admin", "executive", "staff"), async (_req, res) => {
    try {
      const summary = await storage.getWikiLinkStubSummary();
      const unresolvedCount = summary.length;
      const totalOccurrences = summary.reduce((sum, s) => sum + s.totalOccurrences, 0);
      const resolvedCount = await storage.getResolvedLinksCount();
      res.json({ stubs: summary, unresolvedCount, totalOccurrences, resolvedCount });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/tools/wiki/resolve-links", requireAuth, requireRole("admin", "executive"), async (_req, res) => {
    try {
      const allArticles = await storage.getArticles();
      const published = allArticles.filter((a) => a.status === "published");
      const BATCH_SIZE = 10;
      let processed = 0;
      let totalResolved = 0;
      let totalUnresolved = 0;

      for (let i = 0; i < published.length; i += BATCH_SIZE) {
        const batch = published.slice(i, i + BATCH_SIZE);
        await Promise.allSettled(
          batch.map(async (article) => {
            try {
              const result = await resolveArticleLinks(article.id);
              totalResolved += result.resolved.length;
              totalUnresolved += result.unresolved.length;
              processed++;
            } catch (e) {
              console.error(`[backfill] Error processing article ${article.id}:`, e);
            }
          })
        );
      }

      res.json({ processed, totalResolved, totalUnresolved });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });
  registerLensProxy(app);

  // ── Wiki Semantic Re-linking Routes (Task #318) ─────────────────────────────

  app.get("/api/tools/wiki/link-suggestions/:articleId", requireAuth, requireRole(...CAN_CREATE_ARTICLE), async (req, res) => {
    try {
      const articleId = parseInt(req.params.articleId as string);
      if (isNaN(articleId)) return res.status(400).json({ message: "Invalid article id" });
      const suggestions = await storage.getWikiLinkSuggestions(articleId, "pending");
      const allArticles = await storage.getArticles();
      const enriched = suggestions.map((s) => {
        const targetArticle = allArticles.find((a) => a.id === s.targetArticleId);
        return { ...s, targetArticle: targetArticle ? { id: targetArticle.id, title: targetArticle.title, slug: targetArticle.slug, categoryId: targetArticle.categoryId } : null };
      });
      res.json(enriched);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/tools/wiki/suggest-links/:articleId", requireAuth, requireRole(...CAN_CREATE_ARTICLE), async (req, res) => {
    try {
      const articleId = parseInt(req.params.articleId as string);
      if (isNaN(articleId)) return res.status(400).json({ message: "Invalid article id" });
      generateSemanticLinks(articleId).catch(() => {});
      res.json({ message: "Link suggestion pass triggered" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/tools/wiki/link-suggestions/:id", requireAuth, requireRole(...CAN_CREATE_ARTICLE), async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid suggestion id" });
      const { action } = req.body as { action: "accept" | "dismiss" };
      if (action !== "accept" && action !== "dismiss") {
        return res.status(400).json({ message: "action must be 'accept' or 'dismiss'" });
      }

      if (action === "dismiss") {
        const updated = await storage.updateWikiLinkSuggestionStatus(id, "dismissed");
        return res.json(updated);
      }

      const { db: dbInstance } = await import("./db");
      const { wikiLinkSuggestions: wlsTable } = await import("@shared/schema");
      const { eq: eqFn } = await import("drizzle-orm");
      const [suggestion] = await dbInstance.select().from(wlsTable).where(eqFn(wlsTable.id, id)).limit(1);

      if (!suggestion) return res.status(404).json({ message: "Suggestion not found" });

      const sourceArticle = await storage.getArticleById(suggestion.sourceArticleId);
      const allArticles = await storage.getArticles();
      const targetArticle = allArticles.find((a) => a.id === suggestion.targetArticleId);

      if (!sourceArticle || !targetArticle) {
        return res.status(404).json({ message: "Source or target article not found" });
      }

      const anchorText = suggestion.suggestedAnchorText;
      const markdownLink = `[${anchorText}](/wiki/${targetArticle.slug})`;
      let updatedContent = sourceArticle.content;

      const anchorIndex = updatedContent.indexOf(anchorText);
      if (anchorIndex !== -1) {
        updatedContent = updatedContent.slice(0, anchorIndex) + markdownLink + updatedContent.slice(anchorIndex + anchorText.length);
      } else {
        updatedContent = updatedContent + `\n\nSee also: ${markdownLink}`;
      }

      await storage.updateArticle(sourceArticle.id, { content: updatedContent });

      await storage.createCrosslink({
        sourceArticleId: sourceArticle.id,
        targetArticleId: targetArticle.id,
        relevanceScore: 0.8,
        sharedKeywords: [],
      });

      const updated = await storage.updateWikiLinkSuggestionStatus(id, "accepted");
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ── Wiki LLM Cost Dashboard Routes (Task #319) ───────────────────────────────

  app.get("/api/tools/wiki/llm-cost", requireAuth, requireRole("admin", "executive"), async (req, res) => {
    try {
      const now = new Date();
      const year = parseInt((req.query.year as string) || String(now.getFullYear()), 10);
      const month = parseInt((req.query.month as string) || String(now.getMonth() + 1), 10);
      if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
        return res.status(400).json({ message: "Invalid year or month" });
      }
      const rows = await storage.getWikiLlmUsageSummary(year, month);
      const totalCost = rows.reduce((sum, r) => sum + r.totalCostUsd, 0);
      const totalCalls = rows.reduce((sum, r) => sum + r.callCount, 0);
      const settings = await storage.getPlatformSettings();
      const alertThreshold = parseFloat(settings["wiki.llmAlertThreshold"] || "0") || 0;
      res.json({ year, month, rows, totalCost, totalCalls, alertThreshold });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/tools/wiki/llm-rates", requireAuth, requireRole("admin", "executive"), async (_req, res) => {
    try {
      const settings = await storage.getPlatformSettings();
      const raw = settings["wiki.llmRates"];
      const defaultRates = {
        "claude-haiku": { inputPer1k: 0.0008, outputPer1k: 0.004 },
        "claude-sonnet": { inputPer1k: 0.003, outputPer1k: 0.015 },
        "default": { inputPer1k: 0.001, outputPer1k: 0.005 },
      };
      const rates = raw ? JSON.parse(raw) : defaultRates;
      res.json({ rates });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.put("/api/tools/wiki/llm-rates", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { rates } = req.body as { rates?: Record<string, { inputPer1k: number; outputPer1k: number }> };
      if (!rates || typeof rates !== "object") {
        return res.status(400).json({ message: "rates object required" });
      }
      await storage.setPlatformSetting("wiki.llmRates", JSON.stringify(rates));
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.put("/api/tools/wiki/llm-alert-threshold", requireAuth, requireRole("admin", "executive"), async (req, res) => {
    try {
      const { threshold } = req.body as { threshold?: number };
      if (typeof threshold !== "number" || threshold < 0) {
        return res.status(400).json({ message: "threshold must be a non-negative number" });
      }
      await storage.setPlatformSetting("wiki.llmAlertThreshold", String(threshold));
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.use("/api/freeball", freeballRouter);
  app.use("/api/sites", sitesRouter);
  app.use("/api/canvas", canvasRouter);

  app.get("/api/meta", async (_req, res) => {
    try {
      const settings = await storage.getPlatformSettings();
      res.json({
        faviconUrl: settings["platform.faviconUrl"] || null,
        ogImageUrl: settings["platform.ogImageUrl"] || null,
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Media library endpoints
  app.get("/api/media", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { supabase: supabaseAdmin } = await import("./supabase");
      if (!supabaseAdmin) {
        return res.status(503).json({ message: "Storage service not configured" });
      }
      const bucket = (req.query.bucket as string) || "";
      if (!bucket) {
        return res.status(400).json({ message: "bucket query param is required" });
      }
      const { data, error } = await supabaseAdmin.storage.from(bucket).list("", {
        limit: 500,
        offset: 0,
        sortBy: { column: "updated_at", order: "desc" },
      });
      if (error) {
        return res.status(500).json({ message: error.message });
      }
      const files = (data || [])
        .filter((f) => f.name !== ".emptyFolderPlaceholder")
        .map((f) => {
          return {
            name: f.name,
            size: f.metadata?.size ?? 0,
            updatedAt: f.updated_at,
            publicUrl: `/images/${bucket}/${f.name}`,
            mimeType: f.metadata?.mimetype ?? null,
          };
        });
      res.json(files);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/media", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { supabase: supabaseAdmin } = await import("./supabase");
      if (!supabaseAdmin) {
        return res.status(503).json({ message: "Storage service not configured" });
      }
      const bucket = (req.query.bucket as string) || "";
      const path = (req.query.path as string) || "";
      if (!bucket || !path) {
        return res.status(400).json({ message: "bucket and path query params are required" });
      }
      const { error } = await supabaseAdmin.storage.from(bucket).remove([path]);
      if (error) {
        return res.status(500).json({ message: error.message });
      }
      res.status(204).end();
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/media/rename", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { supabase: supabaseAdmin } = await import("./supabase");
      if (!supabaseAdmin) {
        return res.status(503).json({ message: "Storage service not configured" });
      }
      const { bucket, fromPath, toPath } = req.body as { bucket: string; fromPath: string; toPath: string };
      if (!bucket || !fromPath || !toPath) {
        return res.status(400).json({ message: "bucket, fromPath, and toPath are required" });
      }
      const { error: moveError } = await supabaseAdmin.storage.from(bucket).move(fromPath, toPath);
      if (moveError) {
        return res.status(500).json({ message: moveError.message });
      }
      res.json({ name: toPath, publicUrl: `/images/${bucket}/${toPath}` });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Server-side file upload — bypasses Supabase RLS by using service_role key
  app.post(
    "/api/upload",
    requireAuth,
    (req, res, next) => {
      // Parse raw binary body for this route only
      (require("express").raw({ type: "*/*", limit: "110mb" }))(req, res, next);
    },
    async (req, res) => {
      try {
        const { supabase: supabaseAdmin } = await import("./supabase");
        if (!supabaseAdmin) {
          return res.status(503).json({ message: "File upload service not configured" });
        }
        const bucket = (req.query.bucket as string) || "";
        const path = (req.query.path as string) || "";
        if (!bucket || !path) {
          return res.status(400).json({ message: "bucket and path query params are required" });
        }
        const contentType = req.headers["content-type"] || "application/octet-stream";
        const body = req.body as Buffer;
        if (!Buffer.isBuffer(body) || body.length === 0) {
          return res.status(400).json({ message: "Request body is empty" });
        }
        const isPrivate = req.query.private === "true";
        const { error: uploadError } = await supabaseAdmin.storage
          .from(bucket)
          .upload(path, body, { contentType, upsert: true });
        if (uploadError) {
          return res.status(500).json({ message: uploadError.message });
        }
        let publicUrl = path;
        if (!isPrivate) {
          publicUrl = `/images/${bucket}/${path}`;
        }
        res.json({ url: publicUrl, path });
      } catch (err: any) {
        res.status(500).json({ message: err.message });
      }
    }
  );

  app.get("/api/platform-settings", async (_req, res) => {
    try {
      const settings = await storage.getPlatformSettings();
      res.json(settings);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.put("/api/platform-settings", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const entries = req.body;
      if (typeof entries !== "object" || Array.isArray(entries)) {
        return res.status(400).json({ message: "Body must be a key-value object" });
      }
      const stringEntries: Record<string, string> = {};
      for (const [k, v] of Object.entries(entries)) {
        stringEntries[k] = String(v);
      }
      await storage.setPlatformSettings(stringEntries);
      const updated = await storage.getPlatformSettings();
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  function parseWatchedSites(raw: string | undefined): unknown[] {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  app.get("/api/traffic-settings", requireAuth, requireRole("admin"), async (_req, res) => {
    try {
      const settings = await storage.getPlatformSettings();
      const embedUrl = settings["traffic.embedUrl"] || "";
      const watchedSites = parseWatchedSites(settings["traffic.watchedSites"]);
      res.json({ embedUrl, watchedSites });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  const watchedSiteSchema = z.object({
    id: z.string(),
    name: z.string().min(1),
    url: z.string().url(),
    embedUrl: z.string().optional(),
  });

  const trafficSettingsSchema = z.object({
    embedUrl: z.string().optional(),
    watchedSites: z.array(watchedSiteSchema).optional(),
  });

  app.post("/api/traffic-settings", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const parsed = trafficSettingsSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid traffic settings", errors: parsed.error.flatten() });
      }
      const { embedUrl, watchedSites } = parsed.data;
      const entries: Record<string, string> = {};
      if (embedUrl !== undefined) entries["traffic.embedUrl"] = embedUrl;
      if (watchedSites !== undefined) entries["traffic.watchedSites"] = JSON.stringify(watchedSites);
      await storage.setPlatformSettings(entries);
      const settings = await storage.getPlatformSettings();
      res.json({ embedUrl: settings["traffic.embedUrl"] || "", watchedSites: parseWatchedSites(settings["traffic.watchedSites"]) });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/brand-assets", async (req, res) => {
    try {
      const user = req.user as any;
      const staffRoles = ["admin", "executive", "staff"];
      const isStaff = user && staffRoles.includes(user.role);
      const assets = isStaff
        ? await storage.getBrandAssets()
        : await storage.getBrandAssets(true);
      res.json(assets);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/brand-assets", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { insertBrandAssetSchema } = await import("@shared/schema");
      const parsed = insertBrandAssetSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const asset = await storage.createBrandAsset(parsed.data);
      res.status(201).json(asset);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/brand-assets/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { insertBrandAssetSchema } = await import("@shared/schema");
      const parsed = insertBrandAssetSchema.partial().safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const asset = await storage.updateBrandAsset(id, parsed.data);
      res.json(asset);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/brand-assets/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteBrandAsset(id);
      res.status(204).end();
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/gallery", async (req: any, res) => {
    try {
      const category = req.query.category as string | undefined;
      const isLoggedIn = !!req.user;
      const images = await storage.getGalleryImages(
        category || undefined,
        isLoggedIn ? undefined : true,
      );
      const currentUserId = req.user?.id as string | undefined;
      const enriched = await Promise.all(images.map(async (img) => {
        const { sparkCount, isSparkedByMe } = await storage.getGallerySparkInfo(img.id, currentUserId);
        let uploaderName: string | null = null;
        if (img.uploadedBy) {
          const uploader = await storage.getUser(img.uploadedBy);
          uploaderName = uploader?.displayName || uploader?.username || null;
        }
        return { ...img, sparkCount, isSparkedByMe, uploaderName };
      }));
      res.json(enriched);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/gallery", requireAuth, requireRole("admin", "executive", "staff"), async (req: any, res) => {
    try {
      const bodyWithUploader = { ...req.body, uploadedBy: req.user.id };
      const parsed = insertGalleryImageSchema.safeParse(bodyWithUploader);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const image = await storage.createGalleryImage(parsed.data);
      res.status(201).json(image);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/gallery/:id", requireAuth, requireRole("admin", "executive", "staff"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const image = await storage.updateGalleryImage(id, req.body);
      res.json(image);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/gallery/:id", requireAuth, requireRole("admin", "executive", "staff"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteGalleryImage(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  const MC_CACHE_MAX = 200;
  const mcStatusCache = new Map<string, { data: unknown; expiresAt: number }>();

  function mcCacheEvict() {
    const now = Date.now();
    for (const [key, entry] of mcStatusCache) {
      if (now >= entry.expiresAt) mcStatusCache.delete(key);
    }
    if (mcStatusCache.size > MC_CACHE_MAX) {
      const oldest = [...mcStatusCache.keys()].slice(0, mcStatusCache.size - MC_CACHE_MAX);
      for (const key of oldest) mcStatusCache.delete(key);
    }
  }

  app.get("/api/minecraft/servers", async (req, res) => {
    try {
      const servers = await storage.getMinecraftServers();
      res.json(servers);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/minecraft/servers/all", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const servers = await storage.getAllMinecraftServers();
      res.json(servers);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/minecraft/servers", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const parsed = insertMinecraftServerSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.flatten() });
      const server = await storage.createMinecraftServer(parsed.data);
      res.status(201).json(server);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/minecraft/servers/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const parsed = insertMinecraftServerSchema.partial().safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.flatten() });
      const server = await storage.updateMinecraftServer(id, parsed.data);
      res.json(server);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/minecraft/servers/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteMinecraftServer(id);
      res.status(204).end();
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/minecraft/status", async (req, res) => {
    const host = req.query.host as string;
    if (!host || typeof host !== "string") {
      return res.status(400).json({ message: "host query param required" });
    }

    mcCacheEvict();

    const cached = mcStatusCache.get(host);
    if (cached && Date.now() < cached.expiresAt) {
      return res.json(cached.data);
    }

    try {
      const upstream = await fetch(`https://api.mcsrvstat.us/3/${encodeURIComponent(host)}`, {
        headers: { "User-Agent": "SEVCO-Platform/1.0" },
        signal: AbortSignal.timeout(8000),
      });
      const raw = await upstream.json() as Record<string, unknown>;

      const playersRaw = raw.players as { online?: number; max?: number } | undefined;
      const result = {
        online: raw.online === true,
        players: {
          online: playersRaw?.online ?? 0,
          max: playersRaw?.max ?? 0,
        },
        motd: (raw.motd as { clean?: string[] } | undefined)?.clean?.[0] ?? undefined,
      };

      mcStatusCache.set(host, { data: result, expiresAt: Date.now() + 60_000 });
      return res.json(result);
    } catch {
      const fallback = { online: false, players: { online: 0, max: 0 } };
      mcStatusCache.set(host, { data: fallback, expiresAt: Date.now() + 30_000 });
      return res.json(fallback);
    }
  });

  app.get("/api/subscriptions", requireAuth, requireRole("admin", "executive"), async (_req, res) => {
    try {
      const subs = await storage.getSubscriptions();
      res.json(subs);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/subscriptions", requireAuth, requireRole("admin", "executive"), async (req, res) => {
    try {
      const parsed = insertSubscriptionSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.flatten() });
      const created = await storage.createSubscription(parsed.data);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/subscriptions/:id", requireAuth, requireRole("admin", "executive"), async (req, res) => {
    try {
      const parsed = insertSubscriptionSchema.partial().safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.flatten() });
      const updated = await storage.updateSubscription(parseInt(req.params.id), parsed.data);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/subscriptions/:id", requireAuth, requireRole("admin", "executive"), async (req, res) => {
    try {
      await storage.deleteSubscription(parseInt(req.params.id));
      res.status(204).send();
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/staff", requireAuth, requireRole("admin", "executive", "staff", "partner"), async (req, res) => {
    try {
      const staffUsers = await storage.getStaffUsers();
      res.json(staffUsers);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  const CAN_MANAGE_FINANCE: Role[] = ["admin", "executive"];

  app.get("/api/finance/summary", requireAuth, requireRole(...CAN_MANAGE_FINANCE), async (req, res) => {
    try {
      const summary = await storage.getFinanceSummary();
      res.json(summary);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/staff/org", requireAuth, requireRole("admin", "executive", "staff", "partner"), async (req, res) => {
    try {
      const nodes = await storage.getStaffOrgNodes();
      res.json(nodes);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/finance/transactions", requireAuth, requireRole(...CAN_MANAGE_FINANCE), async (req, res) => {
    try {
      const type = req.query.type as string | undefined;
      const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
      const transactions = await storage.getFinanceTransactions({ type, projectId });
      res.json(transactions);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/staff/org", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const parsed = insertStaffOrgNodeSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const node = await storage.createStaffOrgNode(parsed.data);
      res.status(201).json(node);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/finance/transactions", requireAuth, requireRole(...CAN_MANAGE_FINANCE), async (req, res) => {
    try {
      const parsed = insertFinanceTransactionSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const tx = await storage.createFinanceTransaction(parsed.data);
      res.status(201).json(tx);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/staff/org/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const node = await storage.updateStaffOrgNode(id, req.body);
      res.json(node);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/finance/transactions/:id", requireAuth, requireRole(...CAN_MANAGE_FINANCE), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const tx = await storage.updateFinanceTransaction(id, req.body);
      res.json(tx);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/staff/org/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteStaffOrgNode(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ─── Chat: User list (for DM targeting) ──────────────────────────────────
  app.get("/api/chat/users", requireAuth, async (req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      res.json(allUsers.map(({ password: _, emailVerificationToken: __, ...u }) => u));
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ─── Chat: Channels ───────────────────────────────────────────────────────
  app.get("/api/chat/channels", requireAuth, async (req, res) => {
    try {
      const channels = await storage.getChatChannels();
      res.json(channels);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/chat/channels", requireAuth, requireRole("admin", "executive", "staff"), async (req, res) => {
    try {
      const body = insertChatChannelSchema.parse(req.body);
      const channel = await storage.createChatChannel({ ...body, createdBy: req.user!.id });
      res.json(channel);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/chat/channels/:id", requireAuth, requireRole("admin", "executive", "staff"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const body = insertChatChannelSchema.partial().parse(req.body);
      const channel = await storage.updateChatChannel(id, body);
      res.json(channel);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/chat/channels/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteChatChannel(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/finance/transactions/:id", requireAuth, requireRole(...CAN_MANAGE_FINANCE), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteFinanceTransaction(id);
      res.status(204).end();
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/finance/projects", requireAuth, requireRole(...CAN_MANAGE_FINANCE), async (req, res) => {
    try {
      const projects = await storage.getProjects();
      res.json(projects);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/finance/projects/:id/summary", requireAuth, requireRole(...CAN_MANAGE_FINANCE), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const summary = await storage.getProjectFinancialSummary(id);
      res.json(summary);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/finance/projects", requireAuth, requireRole(...CAN_MANAGE_FINANCE), async (_req, res) => {
    res.status(410).json({ message: "Deprecated: use /api/projects to create projects" });
  });

  app.patch("/api/finance/projects/:id", requireAuth, requireRole(...CAN_MANAGE_FINANCE), async (_req, res) => {
    res.status(410).json({ message: "Deprecated: use /api/projects/:id to update projects" });
  });

  // ─── Chat: Channel messages ────────────────────────────────────────────────
  app.get("/api/chat/channels/:id/messages", requireAuth, async (req, res) => {
    try {
      const channelId = parseInt(req.params.id);
      const before = req.query.before ? parseInt(req.query.before as string) : undefined;
      const limit = req.query.limit ? Math.min(parseInt(req.query.limit as string), 100) : 50;
      const messages = await storage.getChannelMessages(channelId, before, limit);
      res.json(messages);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/chat/channels/:id/messages", requireAuth, async (req, res) => {
    try {
      const channelId = parseInt(req.params.id);
      const { content } = req.body;
      if (!content || typeof content !== "string" || !content.trim()) {
        return res.status(400).json({ message: "Content is required" });
      }
      const message = await storage.sendChannelMessage({ channelId, content: content.trim(), fromUserId: req.user!.id });
      res.json(message);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ─── Chat: DMs ────────────────────────────────────────────────────────────
  app.get("/api/chat/dm/:userId/messages", requireAuth, async (req, res) => {
    try {
      const otherUserId = req.params.userId;
      const before = req.query.before ? parseInt(req.query.before as string) : undefined;
      const limit = req.query.limit ? Math.min(parseInt(req.query.limit as string), 100) : 50;
      const messages = await storage.getDmMessages(req.user!.id, otherUserId, before, limit);
      res.json(messages);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/chat/dm/:userId", requireAuth, async (req, res) => {
    try {
      const toUserId = req.params.userId;
      const { content } = req.body;
      if (!content || typeof content !== "string" || !content.trim()) {
        return res.status(400).json({ message: "Content is required" });
      }
      const message = await storage.sendDmMessage(req.user!.id, toUserId, content.trim());
      const sender = req.user as any;
      notify(
        toUserId,
        "chat_dm",
        `New message from ${sender.displayName || sender.username}`,
        content.trim().slice(0, 80),
        "/messages"
      ).catch(() => {});
      res.json(message);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/chat/dm-threads", requireAuth, async (req, res) => {
    try {
      const threads = await storage.getDmThreads(req.user!.id);
      res.json(threads);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ─── Chat: Moderation log ─────────────────────────────────────────────────
  app.get("/api/chat/log", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const channelId = req.query.channelId ? parseInt(req.query.channelId as string) : undefined;
      const userId = req.query.userId as string | undefined;
      const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
      const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;
      const messages = await storage.getAllChatMessages({ channelId, userId, dateFrom, dateTo });
      res.json(messages);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/chat/messages/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const message = await storage.softDeleteChatMessage(id);
      res.json(message);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/finance/projects/:id", requireAuth, requireRole(...CAN_MANAGE_FINANCE), async (_req, res) => {
    res.status(410).json({ message: "Deprecated: finance projects are now managed via /api/projects" });
  });

  app.get("/api/finance/invoices", requireAuth, requireRole(...CAN_MANAGE_FINANCE), async (req, res) => {
    try {
      const invoices = await storage.getFinanceInvoices();
      res.json(invoices);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/finance/invoices", requireAuth, requireRole(...CAN_MANAGE_FINANCE), async (req, res) => {
    try {
      const invoiceNumber = await storage.getNextInvoiceNumber();
      const body = { ...req.body, invoiceNumber };
      const parsed = insertFinanceInvoiceSchema.safeParse(body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const invoice = await storage.createFinanceInvoice(parsed.data);
      res.status(201).json(invoice);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/finance/invoices/:id", requireAuth, requireRole(...CAN_MANAGE_FINANCE), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const invoice = await storage.updateFinanceInvoice(id, req.body);
      res.json(invoice);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/finance/invoices/:id", requireAuth, requireRole(...CAN_MANAGE_FINANCE), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteFinanceInvoice(id);
      res.status(204).end();
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/finance/invoices/:id/send", requireAuth, requireRole(...CAN_MANAGE_FINANCE), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const invoice = await storage.getFinanceInvoiceById(id);
      if (!invoice) return res.status(404).json({ message: "Invoice not found" });
      if (!invoice.clientEmail) return res.status(400).json({ message: "Invoice has no client email" });
      await sendInvoiceEmail(invoice);
      const updated = await storage.updateFinanceInvoice(id, { status: "sent" });
      res.json(updated);
    } catch (err: any) {
      const isConfigError = err.message?.includes('API key not found') || err.message?.includes('not configured');
      res.status(isConfigError ? 503 : 500).json({ message: err.message });
    }
  });

  app.post("/api/finance/invoices/:id/mark-paid", requireAuth, requireRole(...CAN_MANAGE_FINANCE), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updated = await storage.updateFinanceInvoice(id, { status: "paid" });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ── AI Agents ──────────────────────────────────────────────────────────────────

  app.get("/api/ai-agents", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const isPrivileged = ["admin", "executive"].includes(user?.role);
      const agents = await storage.getAiAgents(isPrivileged ? false : true);
      res.json(agents);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/ai-agents", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const data = insertAiAgentSchema.parse(req.body);
      const agent = await storage.createAiAgent(data);
      res.status(201).json(agent);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/ai-agents/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const agent = await storage.updateAiAgent(id, req.body);
      res.json(agent);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/ai-agents/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteAiAgent(id);
      res.status(204).end();
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // x.ai API key status — GET /api/ai/xai/status
  app.get("/api/ai/xai/status", requireAuth, requireRole("admin", "executive"), async (_req, res) => {
    res.json({ configured: !!process.env.XAI_API_KEY });
  });

  app.get("/api/ai/chat/:agentId", requireAuth, requireRole("admin", "executive"), async (req, res) => {
    try {
      const agentId = parseInt(req.params.agentId);
      const user = req.user as any;
      const messages = await storage.getAiMessages(agentId, user.id);
      res.json(messages);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/ai/chat/:agentId", requireAuth, requireRole("admin", "executive"), async (req, res) => {
    try {
      const agentId = parseInt(req.params.agentId);
      const user = req.user as any;
      const { message } = req.body;
      if (!message || typeof message !== "string") {
        return res.status(400).json({ message: "message is required" });
      }

      const agent = await storage.getAiAgentById(agentId);
      if (!agent) return res.status(404).json({ message: "Agent not found" });
      if (!agent.enabled) return res.status(403).json({ message: "Agent is disabled" });

      // Determine API provider based on model slug prefix
      // "xai/..." → x.ai direct API (OpenAI-compatible) — requires XAI_API_KEY from https://console.x.ai/
      // everything else → OpenRouter
      const modelSlug = agent.modelSlug;
      let apiUrl: string;
      let apiKey: string;
      let modelName: string;
      let extraHeaders: Record<string, string> = {};

      let isResponsesApiModel = false;
      if (modelSlug.startsWith("xai/")) {
        apiKey = process.env.XAI_API_KEY ?? "";
        modelName = modelSlug.replace("xai/", ""); // e.g. "grok-3" or "grok-4.20-reasoning"
        isResponsesApiModel = modelName.startsWith("grok-4");
        apiUrl = isResponsesApiModel
          ? "https://api.x.ai/v1/responses"
          : "https://api.x.ai/v1/chat/completions";
        if (!apiKey) {
          return res.status(500).json({ message: "XAI_API_KEY is not configured. Add it in Replit Secrets (get your key at https://console.x.ai/)." });
        }
      } else {
        apiUrl = "https://openrouter.ai/api/v1/chat/completions";
        apiKey = process.env.OPENROUTER_API_KEY ?? "";
        modelName = modelSlug;
        extraHeaders = { "HTTP-Referer": "https://sevco.us", "X-Title": "SEVCO Platform" };
        if (!apiKey) {
          return res.status(503).json({ message: "AI service not configured. Set OPENROUTER_API_KEY." });
        }
      }

      // Image generation branch for xAI image models
      const IMAGE_MODELS = ["grok-2-image-1212"];
      if (modelSlug.startsWith("xai/") && IMAGE_MODELS.includes(modelName)) {
        if (!process.env.XAI_API_KEY) {
          return res.status(500).json({ message: "XAI_API_KEY is required for Grok Imagine." });
        }
        const imgRes = await fetch("https://api.x.ai/v1/images/generations", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.XAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: modelName,
            prompt: message,
            n: 1,
            response_format: "url",
          }),
        });
        if (!imgRes.ok) {
          const errText = await imgRes.text();
          return res.status(502).json({ message: `x.ai image error: ${errText}` });
        }
        const imgData = await imgRes.json() as any;
        const imageUrl = imgData?.data?.[0]?.url;
        if (!imageUrl) return res.status(502).json({ message: "No image URL returned from x.ai." });

        await storage.createAiMessage({ agentId, userId: user.id, role: "user", content: message });
        const assistantContent = `![Generated image](${imageUrl})`;
        const assistantMsg = await storage.createAiMessage({
          agentId, userId: user.id, role: "assistant", content: assistantContent,
        });
        return res.json({ message: assistantMsg });
      }

      // Store user message
      await storage.createAiMessage({ agentId, userId: user.id, role: "user", content: message });

      // Build history for context (last 20 messages)
      const history = await storage.getAiMessages(agentId, user.id);
      const contextMessages = history.slice(-20).map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

      const requestBody = isResponsesApiModel
        ? {
            model: modelName,
            input: [
              { role: "system", content: agent.systemPrompt },
              ...contextMessages,
            ],
          }
        : {
            model: modelName,
            messages: [
              { role: "system", content: agent.systemPrompt },
              ...contextMessages,
            ],
            max_tokens: 1024,
          };

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          ...extraHeaders,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errText = await response.text();

        // For xai/ models, check for credits/permission errors and retry via OpenRouter
        if (modelSlug.startsWith("xai/")) {
          let errObj: any = {};
          try { errObj = JSON.parse(errText); } catch {}
          // xAI uses OpenAI-compatible format: error may be an object {message, type, code} or a plain string
          const errRaw = errObj?.error;
          const errMsgStr = typeof errRaw === "object" && errRaw !== null ? (errRaw.message ?? "") : (errRaw ?? "");
          const errCodeStr = typeof errRaw === "object" && errRaw !== null ? (errRaw.code ?? errRaw.type ?? "") : (errObj?.code ?? "");
          const errMsg = String(errMsgStr).toLowerCase();
          const errCode = String(errCodeStr).toLowerCase();
          const isCreditsError =
            errMsg.includes("credits") ||
            errMsg.includes("licenses") ||
            errCode.includes("permission") ||
            errCode.includes("insufficient");

          if (isCreditsError && process.env.OPENROUTER_API_KEY) {
            const fallbackRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://sevco.us",
                "X-Title": "SEVCO Platform",
              },
              body: JSON.stringify({
                model: `x-ai/${modelName}`,
                messages: [
                  { role: "system", content: agent.systemPrompt },
                  ...contextMessages,
                ],
                max_tokens: 1024,
              }),
            });
            if (fallbackRes.ok) {
              const fallbackData = await fallbackRes.json() as any;
              const assistantContent = fallbackData.choices?.[0]?.message?.content ?? "No response.";
              const assistantMsg = await storage.createAiMessage({
                agentId, userId: user.id, role: "assistant", content: assistantContent,
              });
              return res.json({ message: assistantMsg });
            }
          }

          // Still failing: return improved error with guidance
          const errDisplay = errMsgStr || errText;
          const teamUrl = typeof errDisplay === "string" ? errDisplay.match(/https:\/\/console\.x\.ai\/team\/[^\s"]+/)?.[0] : undefined;
          const purchaseLink = teamUrl
            ? ` Purchase credits: ${teamUrl}`
            : " Visit https://console.x.ai to add credits.";
          return res.status(502).json({
            message: `x.ai error: ${errDisplay}${purchaseLink} Or switch your agent to an OpenRouter Grok model (e.g. "Grok 3 (OpenRouter)").`,
          });
        }

        const provider = "OpenRouter";
        return res.status(502).json({ message: `${provider} error: ${errText}` });
      }

      const data = await response.json() as any;
      let assistantContent: string;
      if (isResponsesApiModel) {
        const msgOut = data?.output?.find((o: any) => o.type === "message");
        assistantContent = msgOut?.content?.[0]?.text
          ?? "I couldn't generate a response.";
      } else {
        assistantContent = data.choices?.[0]?.message?.content ?? "I couldn't generate a response.";
      }

      // Store assistant message
      const assistantMsg = await storage.createAiMessage({ agentId, userId: user.id, role: "assistant", content: assistantContent });

      res.json({ message: assistantMsg });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/ai/chat/:agentId/stream", requireAuth, requireRole("admin", "executive"), async (req, res) => {
    try {
      const agentId = parseInt(req.params.agentId);
      const user = req.user as any;
      const { message } = req.body;
      if (!message || typeof message !== "string") {
        return res.status(400).json({ message: "message is required" });
      }

      const agent = await storage.getAiAgentById(agentId);
      if (!agent) return res.status(404).json({ message: "Agent not found" });
      if (!agent.enabled) return res.status(403).json({ message: "Agent is disabled" });

      const modelSlug = agent.modelSlug;
      let apiUrl: string;
      let apiKey: string;
      let modelName: string;
      let extraHeaders: Record<string, string> = {};

      let isResponsesApiModel = false;
      if (modelSlug.startsWith("xai/")) {
        apiKey = process.env.XAI_API_KEY ?? "";
        modelName = modelSlug.replace("xai/", "");
        isResponsesApiModel = modelName.startsWith("grok-4");
        apiUrl = isResponsesApiModel
          ? "https://api.x.ai/v1/responses"
          : "https://api.x.ai/v1/chat/completions";
        if (!apiKey) {
          return res.status(500).json({ message: "XAI_API_KEY is not configured." });
        }
      } else {
        apiUrl = "https://openrouter.ai/api/v1/chat/completions";
        apiKey = process.env.OPENROUTER_API_KEY ?? "";
        modelName = modelSlug;
        extraHeaders = { "HTTP-Referer": "https://sevco.us", "X-Title": "SEVCO Platform" };
        if (!apiKey) {
          return res.status(503).json({ message: "AI service not configured. Set OPENROUTER_API_KEY." });
        }
      }

      const IMAGE_MODELS = ["grok-2-image-1212"];
      if (modelSlug.startsWith("xai/") && IMAGE_MODELS.includes(modelName)) {
        if (!process.env.XAI_API_KEY) {
          return res.status(500).json({ message: "XAI_API_KEY is required for Grok Imagine." });
        }
        const imgRes = await fetch("https://api.x.ai/v1/images/generations", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.XAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ model: modelName, prompt: message, n: 1, response_format: "url" }),
        });
        if (!imgRes.ok) {
          const errText = await imgRes.text();
          return res.status(502).json({ message: `x.ai image error: ${errText}` });
        }
        const imgData = await imgRes.json() as any;
        const imageUrl = imgData?.data?.[0]?.url;
        if (!imageUrl) return res.status(502).json({ message: "No image URL returned from x.ai." });

        await storage.createAiMessage({ agentId, userId: user.id, role: "user", content: message });
        const assistantContent = `![Generated image](${imageUrl})`;
        await storage.createAiMessage({ agentId, userId: user.id, role: "assistant", content: assistantContent });

        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.write(`data: ${JSON.stringify({ token: assistantContent })}\n\n`);
        res.write("data: [DONE]\n\n");
        return res.end();
      }

      await storage.createAiMessage({ agentId, userId: user.id, role: "user", content: message });

      const history = await storage.getAiMessages(agentId, user.id);
      const contextMessages = history.slice(-20).map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

      const streamRequestBody = isResponsesApiModel
        ? {
            model: modelName,
            input: [
              { role: "system", content: agent.systemPrompt },
              ...contextMessages,
            ],
            stream: true,
          }
        : {
            model: modelName,
            messages: [
              { role: "system", content: agent.systemPrompt },
              ...contextMessages,
            ],
            max_tokens: 1024,
            stream: true,
          };

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          ...extraHeaders,
        },
        body: JSON.stringify(streamRequestBody),
      });

      if (!response.ok) {
        const errText = await response.text();

        if (modelSlug.startsWith("xai/")) {
          let errObj: any = {};
          try { errObj = JSON.parse(errText); } catch {}
          // xAI uses OpenAI-compatible format: error may be an object {message, type, code} or a plain string
          const errRaw = errObj?.error;
          const errMsgStr = typeof errRaw === "object" && errRaw !== null ? (errRaw.message ?? "") : (errRaw ?? "");
          const errCodeStr = typeof errRaw === "object" && errRaw !== null ? (errRaw.code ?? errRaw.type ?? "") : (errObj?.code ?? "");
          const errMsg = String(errMsgStr).toLowerCase();
          const errCode = String(errCodeStr).toLowerCase();
          const isCreditsError = errMsg.includes("credits") || errMsg.includes("licenses") || errCode.includes("permission") || errCode.includes("insufficient");

          if (isCreditsError && process.env.OPENROUTER_API_KEY) {
            const fallbackRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://sevco.us",
                "X-Title": "SEVCO Platform",
              },
              body: JSON.stringify({
                model: `x-ai/${modelName}`,
                messages: [{ role: "system", content: agent.systemPrompt }, ...contextMessages],
                max_tokens: 1024,
                stream: true,
              }),
            });
            if (fallbackRes.ok && fallbackRes.body) {
              res.setHeader("Content-Type", "text/event-stream");
              res.setHeader("Cache-Control", "no-cache");
              res.setHeader("Connection", "keep-alive");

              let fullContent = "";
              const reader = fallbackRes.body.getReader();
              const decoder = new TextDecoder();
              let lineBuf = "";
              try {
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  lineBuf += decoder.decode(value, { stream: true });
                  const parts = lineBuf.split("\n");
                  lineBuf = parts.pop() || "";
                  for (const line of parts) {
                    const trimmed = line.trim();
                    if (trimmed.startsWith("data: ") && trimmed.slice(6) !== "[DONE]") {
                      try {
                        const parsed = JSON.parse(trimmed.slice(6));
                        const token = parsed.choices?.[0]?.delta?.content || "";
                        if (token) {
                          fullContent += token;
                          res.write(`data: ${JSON.stringify({ token })}\n\n`);
                        }
                      } catch {}
                    }
                  }
                }
              } catch {}
              if (fullContent) {
                await storage.createAiMessage({ agentId, userId: user.id, role: "assistant", content: fullContent });
              }
              res.write("data: [DONE]\n\n");
              return res.end();
            }
          }
          return res.status(502).json({ message: `x.ai error: ${errMsgStr || errText}` });
        }
        return res.status(502).json({ message: `OpenRouter error: ${errText}` });
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      let fullContent = "";
      const reader = response.body?.getReader();
      if (!reader) {
        res.write(`data: ${JSON.stringify({ error: "No stream body" })}\n\n`);
        return res.end();
      }

      const decoder = new TextDecoder();
      let lineBuf = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          lineBuf += decoder.decode(value, { stream: true });
          const parts = lineBuf.split("\n");
          lineBuf = parts.pop() || "";
          for (const line of parts) {
            const trimmed = line.trim();
            if (trimmed.startsWith("data: ") && trimmed.slice(6) !== "[DONE]") {
              try {
                const parsed = JSON.parse(trimmed.slice(6));
                let token: string;
                if (isResponsesApiModel) {
                  token = (parsed.type === "response.output_text.delta" && parsed.delta) ? parsed.delta : "";
                } else {
                  token = parsed.choices?.[0]?.delta?.content || "";
                }
                if (token) {
                  fullContent += token;
                  res.write(`data: ${JSON.stringify({ token })}\n\n`);
                }
              } catch {}
            }
          }
        }
      } catch (streamErr: any) {
        res.write(`data: ${JSON.stringify({ error: streamErr.message })}\n\n`);
      }

      if (fullContent) {
        await storage.createAiMessage({ agentId, userId: user.id, role: "assistant", content: fullContent });
      }
      res.write("data: [DONE]\n\n");
      res.end();
    } catch (err: any) {
      if (!res.headersSent) {
        res.status(500).json({ message: err.message });
      } else {
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
        res.end();
      }
    }
  });

  app.post("/api/ai/chat/:agentId/messages/:messageId/regenerate", requireAuth, requireRole("admin", "executive"), async (req, res) => {
    try {
      const agentId = parseInt(req.params.agentId);
      const messageId = parseInt(req.params.messageId);
      const user = req.user as any;

      const agent = await storage.getAiAgentById(agentId);
      if (!agent) return res.status(404).json({ message: "Agent not found" });

      const targetMsg = await storage.getAiMessageById(messageId);
      if (!targetMsg || targetMsg.agentId !== agentId || targetMsg.userId !== user.id || targetMsg.role !== "assistant") {
        return res.status(404).json({ message: "Message not found" });
      }

      await storage.deleteAiMessage(messageId, agentId, user.id);

      const modelSlug = agent.modelSlug;
      let apiUrl: string;
      let apiKey: string;
      let modelName: string;
      let extraHeaders: Record<string, string> = {};

      let isResponsesApiModel = false;
      if (modelSlug.startsWith("xai/")) {
        apiKey = process.env.XAI_API_KEY ?? "";
        modelName = modelSlug.replace("xai/", "");
        isResponsesApiModel = modelName.startsWith("grok-4");
        apiUrl = isResponsesApiModel
          ? "https://api.x.ai/v1/responses"
          : "https://api.x.ai/v1/chat/completions";
        if (!apiKey) return res.status(500).json({ message: "XAI_API_KEY is not configured." });
      } else {
        apiUrl = "https://openrouter.ai/api/v1/chat/completions";
        apiKey = process.env.OPENROUTER_API_KEY ?? "";
        modelName = modelSlug;
        extraHeaders = { "HTTP-Referer": "https://sevco.us", "X-Title": "SEVCO Platform" };
        if (!apiKey) return res.status(503).json({ message: "AI service not configured." });
      }

      const history = await storage.getAiMessages(agentId, user.id);
      const contextMessages = history.slice(-20).map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

      const regenRequestBody = isResponsesApiModel
        ? {
            model: modelName,
            input: [{ role: "system", content: agent.systemPrompt }, ...contextMessages],
            stream: true,
          }
        : {
            model: modelName,
            messages: [{ role: "system", content: agent.systemPrompt }, ...contextMessages],
            max_tokens: 1024,
            stream: true,
          };

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json", ...extraHeaders },
        body: JSON.stringify(regenRequestBody),
      });

      if (!response.ok) {
        const errText = await response.text();
        let errDisplay = errText;
        try {
          const errObj = JSON.parse(errText);
          const errRaw = errObj?.error;
          errDisplay = typeof errRaw === "object" && errRaw !== null ? (errRaw.message || errText) : (errRaw || errText);
        } catch {}
        return res.status(502).json({ message: `AI error: ${errDisplay}` });
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      let fullContent = "";
      const reader = response.body?.getReader();
      if (!reader) {
        res.write(`data: ${JSON.stringify({ error: "No stream body" })}\n\n`);
        return res.end();
      }

      const decoder = new TextDecoder();
      let lineBuf = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          lineBuf += decoder.decode(value, { stream: true });
          const parts = lineBuf.split("\n");
          lineBuf = parts.pop() || "";
          for (const line of parts) {
            const trimmed = line.trim();
            if (trimmed.startsWith("data: ") && trimmed.slice(6) !== "[DONE]") {
              try {
                const parsed = JSON.parse(trimmed.slice(6));
                let token: string;
                if (isResponsesApiModel) {
                  token = (parsed.type === "response.output_text.delta" && parsed.delta) ? parsed.delta : "";
                } else {
                  token = parsed.choices?.[0]?.delta?.content || "";
                }
                if (token) {
                  fullContent += token;
                  res.write(`data: ${JSON.stringify({ token })}\n\n`);
                }
              } catch {}
            }
          }
        }
      } catch (streamErr: any) {
        res.write(`data: ${JSON.stringify({ error: streamErr.message })}\n\n`);
      }

      if (fullContent) {
        await storage.createAiMessage({ agentId, userId: user.id, role: "assistant", content: fullContent });
      }
      res.write("data: [DONE]\n\n");
      res.end();
    } catch (err: any) {
      if (!res.headersSent) {
        res.status(500).json({ message: err.message });
      } else {
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
        res.end();
      }
    }
  });

  app.delete("/api/ai/chat/:agentId/messages/:messageId", requireAuth, requireRole("admin", "executive"), async (req, res) => {
    try {
      const agentId = parseInt(req.params.agentId);
      const messageId = parseInt(req.params.messageId);
      const user = req.user as any;
      await storage.deleteAiMessage(messageId, agentId, user.id);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/ai/chat/:agentId/messages/:messageId/feedback", requireAuth, requireRole("admin", "executive"), async (req, res) => {
    try {
      const agentId = parseInt(req.params.agentId);
      const messageId = parseInt(req.params.messageId);
      const user = req.user as any;
      const { vote } = req.body;
      if (!vote || !["up", "down"].includes(vote)) {
        return res.status(400).json({ message: "vote must be 'up' or 'down'" });
      }
      const msg = await storage.getAiMessageById(messageId);
      if (!msg || msg.agentId !== agentId || msg.userId !== user.id) {
        return res.status(404).json({ message: "Message not found" });
      }
      const result = await storage.upsertMessageFeedback({
        messageId,
        userId: user.id,
        agentId,
        vote,
      });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/ai/chat/:agentId/clear", requireAuth, requireRole("admin", "executive"), async (req, res) => {
    try {
      const agentId = parseInt(req.params.agentId);
      const user = req.user as any;
      await storage.clearAiConversation(agentId, user.id);
      res.status(204).end();
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ─── GA4 Analytics Routes ───────────────────────────────
  app.get("/api/analytics/ga4/status", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const settings = await storage.getPlatformSettings();
      const propertyId = settings["analytics.ga4PropertyId"];
      const measurementId = settings["analytics.ga4MeasurementId"];
      const status = await getGA4Status(propertyId, measurementId);
      res.json(status);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/analytics/ga4/summary", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const settings = await storage.getPlatformSettings();
      const propertyId = settings["analytics.ga4PropertyId"];
      if (!propertyId) return res.status(400).json({ message: "GA4 Property ID not configured" });
      const range = (req.query.range as string) || "28d";
      const data = await getSummary(propertyId, range);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/analytics/ga4/sessions", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const settings = await storage.getPlatformSettings();
      const propertyId = settings["analytics.ga4PropertyId"];
      if (!propertyId) return res.status(400).json({ message: "GA4 Property ID not configured" });
      const range = (req.query.range as string) || "28d";
      const data = await getSessionsOverTime(propertyId, range);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/analytics/ga4/pages", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const settings = await storage.getPlatformSettings();
      const propertyId = settings["analytics.ga4PropertyId"];
      if (!propertyId) return res.status(400).json({ message: "GA4 Property ID not configured" });
      const range = (req.query.range as string) || "28d";
      const data = await getTopPages(propertyId, range);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/analytics/ga4/sources", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const settings = await storage.getPlatformSettings();
      const propertyId = settings["analytics.ga4PropertyId"];
      if (!propertyId) return res.status(400).json({ message: "GA4 Property ID not configured" });
      const range = (req.query.range as string) || "28d";
      const data = await getTrafficSources(propertyId, range);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/analytics/ga4/countries", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const settings = await storage.getPlatformSettings();
      const propertyId = settings["analytics.ga4PropertyId"];
      if (!propertyId) return res.status(400).json({ message: "GA4 Property ID not configured" });
      const range = (req.query.range as string) || "28d";
      const data = await getCountryBreakdown(propertyId, range);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/analytics/ga4/devices", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const settings = await storage.getPlatformSettings();
      const propertyId = settings["analytics.ga4PropertyId"];
      if (!propertyId) return res.status(400).json({ message: "GA4 Property ID not configured" });
      const range = (req.query.range as string) || "28d";
      const data = await getDeviceSplit(propertyId, range);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/analytics/ga4/realtime", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const settings = await storage.getPlatformSettings();
      const propertyId = settings["analytics.ga4PropertyId"];
      if (!propertyId) return res.status(400).json({ message: "GA4 Property ID not configured" });
      const activeUsers = await getRealtimeActiveUsers(propertyId);
      res.json({ activeUsers });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/admin/run-wiki-seed", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { runWikiSeed } = await import("./wikiSeed");
      await runWikiSeed();
      res.json({ success: true, message: "Wiki seed completed" });
    } catch (err: any) {
      console.error("[routes] Wiki seed failed:", err?.message ?? err);
      res.status(500).json({ success: false, message: err?.message ?? "Wiki seed failed" });
    }
  });

  app.post("/api/admin/send-test-email", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { email } = req.body;
      if (!email || typeof email !== "string") {
        return res.status(400).json({ message: "Email address is required" });
      }
      await sendTestEmail(email);
      res.json({ success: true, message: `Test email sent to ${email}` });
    } catch (err: any) {
      console.error("[routes] Admin test email failed:", err?.message ?? err);
      res.status(500).json({ success: false, message: err?.message ?? "Failed to send test email" });
    }
  });

  // ── Inbound Email Diagnostics ─────────────────────────────────────────
  app.get("/api/admin/inbound-email-status", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const address = (req.query.address as string) ?? "";
      const match = address.match(/^(.+)@sevco\.us$/i);
      if (!match) {
        return res.status(400).json({ message: "Address must be a @sevco.us address" });
      }
      const username = match[1].toLowerCase();
      const user = await storage.getUserByUsername(username);
      const webhookConfigured = !!process.env.RESEND_WEBHOOK_SECRET;
      if (!user) {
        const mailbox = await storage.getSystemMailboxByAddress(address.toLowerCase());
        if (mailbox) {
          return res.json({ isSystemMailbox: true, isActive: mailbox.isActive, webhookConfigured });
        }
      }
      const userExists = !!user;
      const userRole = user?.role ?? null;
      const roleQualifies = userRole ? isClientPlus(userRole) : false;
      res.json({ userExists, userRole, roleQualifies, webhookConfigured });
    } catch (err: any) {
      res.status(500).json({ message: err?.message ?? "Status check failed" });
    }
  });

  app.post("/api/admin/inbound-email-simulate", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { address } = req.body;
      if (!address || typeof address !== "string") {
        return res.status(400).json({ message: "Address is required" });
      }
      const match = address.match(/^(.+)@sevco\.us$/i);
      if (!match) {
        return res.status(400).json({ message: "Address must be a @sevco.us address" });
      }
      const username = match[1].toLowerCase();
      const targetUser = await storage.getUserByUsername(username);
      if (!targetUser) {
        const mailbox = await storage.getSystemMailboxByAddress(address.toLowerCase());
        if (mailbox) {
          const timestamp = new Date().toISOString();
          await storage.createSystemMailboxEmail({
            mailboxId: mailbox.id,
            resendEmailId: `simulate-${Date.now()}`,
            direction: "inbound",
            fromAddress: "diagnostics@sevco.us",
            toAddresses: [mailbox.address],
            subject: "Inbound Email Test",
            bodyHtml: `<p>This is a simulated inbound email sent at <strong>${timestamp}</strong> to confirm end-to-end delivery is working.</p>`,
            bodyText: `This is a simulated inbound email sent at ${timestamp} to confirm end-to-end delivery is working.`,
            isRead: false,
            threadId: null,
          });
          return res.json({ success: true, message: `Simulated inbound email delivered to ${mailbox.address}` });
        }
        return res.status(404).json({ success: false, message: `No user account or system mailbox found for ${username}@sevco.us` });
      }
      if (!isClientPlus(targetUser.role)) {
        return res.status(403).json({ success: false, message: `User ${username} has role "${targetUser.role}" which does not qualify for inbound email (requires client, partner, staff, executive, or admin)` });
      }
      const timestamp = new Date().toISOString();
      await processInboundEmail({
        email_id: `simulate-${Date.now()}`,
        from: "diagnostics@sevco.us",
        to: [`${username}@sevco.us`],
        subject: "Inbound Email Test",
        text: `This is a simulated inbound email sent at ${timestamp} to confirm end-to-end delivery is working.`,
        html: `<p>This is a simulated inbound email sent at <strong>${timestamp}</strong> to confirm end-to-end delivery is working.</p>`,
      });
      res.json({ success: true, message: `Simulated inbound email delivered to ${username}@sevco.us` });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err?.message ?? "Simulation failed" });
    }
  });

  // ── System Mailboxes ──────────────────────────────────────────────────
  app.get("/api/admin/mailboxes", requireAuth, requireRole("admin"), async (_req, res) => {
    try {
      const [mailboxes, unreadCounts] = await Promise.all([
        storage.getSystemMailboxes(),
        storage.getSystemMailboxUnreadCounts(),
      ]);
      const withCounts = mailboxes.map((mb) => ({ ...mb, unreadCount: unreadCounts[mb.id] ?? 0 }));
      res.json(withCounts);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/admin/mailboxes", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { name, address, description } = req.body;
      if (!name || typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ message: "Name is required" });
      }
      if (!address || typeof address !== "string" || !address.trim()) {
        return res.status(400).json({ message: "Address is required" });
      }
      const addr = address.trim().toLowerCase();
      if (!/^[a-z0-9._+-]+@sevco\.us$/.test(addr)) {
        return res.status(400).json({ message: "Mailbox address must be a @sevco.us address" });
      }
      const existing = await storage.getSystemMailboxByAddress(addr);
      if (existing) {
        return res.status(409).json({ message: "A mailbox with that address already exists" });
      }
      const mailbox = await storage.createSystemMailbox({
        name: name.trim(),
        address: addr,
        description: description?.trim() || null,
        isActive: true,
      });
      res.json(mailbox);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/admin/mailboxes/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
      await storage.deleteSystemMailbox(id);
      res.status(204).send();
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/admin/mailboxes/:id/emails", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
      const emails = await storage.getSystemMailboxEmails(id);
      res.json(emails);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/admin/mailboxes/:id/emails/:emailId", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const emailId = parseInt(req.params.emailId);
      if (isNaN(id) || isNaN(emailId)) return res.status(400).json({ message: "Invalid id" });
      const email = await storage.getSystemMailboxEmail(id, emailId);
      if (!email) return res.status(404).json({ message: "Email not found" });
      await storage.markSystemMailboxEmailRead(id, emailId);
      res.json({ ...email, isRead: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/admin/mailboxes/:id/emails/:emailId/reply", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const emailId = parseInt(req.params.emailId);
      if (isNaN(id) || isNaN(emailId)) return res.status(400).json({ message: "Invalid id" });
      const { subject, body } = req.body;
      if (!body || typeof body !== "string" || !body.trim()) {
        return res.status(400).json({ message: "Reply body is required" });
      }
      const mailbox = await storage.getSystemMailboxes().then((mbs) => mbs.find((m) => m.id === id));
      if (!mailbox) return res.status(404).json({ message: "Mailbox not found" });
      const originalEmail = await storage.getSystemMailboxEmail(id, emailId);
      if (!originalEmail) return res.status(404).json({ message: "Email not found" });
      if (originalEmail.direction !== "inbound") {
        return res.status(400).json({ message: "Can only reply to inbound emails" });
      }

      const resend = await import("resend").then((m) => new m.Resend(process.env.RESEND_API_KEY));
      const replySubject = subject?.trim() || `Re: ${originalEmail.subject}`;
      const toAddress = originalEmail.fromAddress;

      const sendResult = await resend.emails.send({
        from: `${mailbox.name} <${mailbox.address}>`,
        to: [toAddress],
        subject: replySubject,
        text: body.trim(),
      });

      const resendEmailId = sendResult.data?.id ?? null;

      const saved = await storage.createSystemMailboxEmail({
        mailboxId: id,
        resendEmailId,
        direction: "outbound",
        fromAddress: mailbox.address,
        toAddresses: [toAddress],
        subject: replySubject,
        bodyHtml: "",
        bodyText: body.trim(),
        isRead: true,
        threadId: originalEmail.threadId ?? null,
      });

      res.json(saved);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ── News Categories ──────────────────────────────────────────────────
  app.get("/api/news", async (_req, res) => {
    try {
      const cats = await storage.getNewsCategories(true);
      res.json(cats);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/news/categories", requireAuth, requireRole("admin"), async (_req, res) => {
    try {
      const cats = await storage.getNewsCategories();
      res.json(cats);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/news/categories", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const data = insertNewsCategorySchema.parse(req.body);
      const created = await storage.createNewsCategory(data);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/news/categories/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const data = insertNewsCategorySchema.partial().parse(req.body);
      const updated = await storage.updateNewsCategory(id, data);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/news/categories/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteNewsCategory(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/news/ai-settings/admin", requireAuth, requireRole("admin"), async (_req, res) => {
    try {
      const settings = await storage.getPlatformSettings();
      const aiSettings = {
        summariesEnabled: settings["news.ai.summariesEnabled"] === "true",
        imageGenEnabled: settings["news.ai.imageGenEnabled"] === "true",
        dailyBriefingEnabled: settings["news.ai.dailyBriefingEnabled"] === "true",
        askGrokEnabled: settings["news.ai.askGrokEnabled"] === "true",
        breakingDetectionEnabled: settings["news.ai.breakingDetectionEnabled"] === "true",
        searchEnabled: settings["news.ai.searchEnabled"] === "true",
        trendingEnabled: settings["news.ai.trendingEnabled"] === "true",
        grokModel: settings["news.ai.grokModel"] || "x-ai/grok-3-mini",
        summaryStyle: settings["news.ai.summaryStyle"] || "concise",
        imagePromptTemplate: settings["news.ai.imagePromptTemplate"] || "",
        maxRequestsPerHour: parseInt(settings["news.ai.maxRequestsPerHour"] || "60") || 60,
      };
      res.json(aiSettings);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.put("/api/news/ai-settings/admin", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const body = req.body;
      const allowedModels = ["x-ai/grok-3-mini", "x-ai/grok-3", "x-ai/grok-3-mini-fast", "x-ai/grok-2", "openai/gpt-4o-mini", "openai/gpt-4o", "anthropic/claude-3.5-sonnet"];
      const allowedStyles = ["concise", "detailed", "editorial", "bullet"];

      if (body.grokModel !== undefined && !allowedModels.includes(String(body.grokModel))) {
        return res.status(400).json({ message: `Invalid model. Allowed: ${allowedModels.join(", ")}` });
      }
      if (body.summaryStyle !== undefined && !allowedStyles.includes(String(body.summaryStyle))) {
        return res.status(400).json({ message: `Invalid style. Allowed: ${allowedStyles.join(", ")}` });
      }
      if (body.maxRequestsPerHour !== undefined) {
        const val = Number(body.maxRequestsPerHour);
        if (!Number.isFinite(val) || val < 1 || val > 1000) {
          return res.status(400).json({ message: "maxRequestsPerHour must be between 1 and 1000." });
        }
      }

      const entries: Record<string, string> = {};
      if (body.summariesEnabled !== undefined) entries["news.ai.summariesEnabled"] = String(body.summariesEnabled);
      if (body.imageGenEnabled !== undefined) entries["news.ai.imageGenEnabled"] = String(body.imageGenEnabled);
      if (body.dailyBriefingEnabled !== undefined) entries["news.ai.dailyBriefingEnabled"] = String(body.dailyBriefingEnabled);
      if (body.askGrokEnabled !== undefined) entries["news.ai.askGrokEnabled"] = String(body.askGrokEnabled);
      if (body.breakingDetectionEnabled !== undefined) entries["news.ai.breakingDetectionEnabled"] = String(body.breakingDetectionEnabled);
      if (body.searchEnabled !== undefined) entries["news.ai.searchEnabled"] = String(body.searchEnabled);
      if (body.trendingEnabled !== undefined) entries["news.ai.trendingEnabled"] = String(body.trendingEnabled);
      if (body.grokModel !== undefined) entries["news.ai.grokModel"] = String(body.grokModel);
      if (body.summaryStyle !== undefined) entries["news.ai.summaryStyle"] = String(body.summaryStyle);
      if (body.imagePromptTemplate !== undefined) entries["news.ai.imagePromptTemplate"] = String(body.imagePromptTemplate);
      if (body.maxRequestsPerHour !== undefined) entries["news.ai.maxRequestsPerHour"] = String(Math.round(Number(body.maxRequestsPerHour)));
      await storage.setPlatformSettings(entries);
      const settings = await storage.getPlatformSettings();
      res.json({
        summariesEnabled: settings["news.ai.summariesEnabled"] === "true",
        imageGenEnabled: settings["news.ai.imageGenEnabled"] === "true",
        dailyBriefingEnabled: settings["news.ai.dailyBriefingEnabled"] === "true",
        askGrokEnabled: settings["news.ai.askGrokEnabled"] === "true",
        breakingDetectionEnabled: settings["news.ai.breakingDetectionEnabled"] === "true",
        searchEnabled: settings["news.ai.searchEnabled"] === "true",
        trendingEnabled: settings["news.ai.trendingEnabled"] === "true",
        grokModel: settings["news.ai.grokModel"] || "x-ai/grok-3-mini",
        summaryStyle: settings["news.ai.summaryStyle"] || "concise",
        imagePromptTemplate: settings["news.ai.imagePromptTemplate"] || "",
        maxRequestsPerHour: parseInt(settings["news.ai.maxRequestsPerHour"] || "60") || 60,
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/news/analytics", requireAuth, requireRole("admin"), async (_req, res) => {
    try {
      const [cats, settings] = await Promise.all([
        storage.getNewsCategories(),
        storage.getPlatformSettings(),
      ]);

      const bookmarkCounts: Record<string, number> = {};
      const topBookmarked: Array<{ title: string; url: string; count: number }> = [];

      const allUsers = await storage.getAllUsers();
      for (const u of allUsers) {
        const bookmarks = await storage.getNewsBookmarks(u.id);
        for (const b of bookmarks) {
          bookmarkCounts[b.articleCategory || "Uncategorized"] = (bookmarkCounts[b.articleCategory || "Uncategorized"] || 0) + 1;
          const existing = topBookmarked.find(t => t.url === b.articleUrl);
          if (existing) {
            existing.count++;
          } else {
            topBookmarked.push({ title: b.articleTitle, url: b.articleUrl, count: 1 });
          }
        }
      }
      topBookmarked.sort((a, b) => b.count - a.count);

      const enabledCategories = cats.filter(c => c.enabled).length;
      const totalCategories = cats.length;
      const featuredCategories = cats.filter(c => c.featured).length;
      const pinnedCategories = cats.filter(c => c.pinned).length;

      const categoryStats = cats.map(c => ({
        id: c.id,
        name: c.name,
        enabled: c.enabled,
        featured: c.featured,
        pinned: c.pinned,
        bookmarks: bookmarkCounts[c.name] || 0,
      }));

      const aiSummariesEnabled = settings["news.ai.summariesEnabled"] === "true";
      const aiImageGenEnabled = settings["news.ai.imageGenEnabled"] === "true";

      const statsDate = settings["news.stats.date"] || "";
      const today = new Date().toISOString().slice(0, 10);
      const isToday = statsDate === today;
      const aiSummariesGeneratedToday = isToday ? (parseInt(settings["news.stats.aiSummariesToday"] || "0") || 0) : 0;
      const aiImagesGeneratedToday = isToday ? (parseInt(settings["news.stats.aiImagesToday"] || "0") || 0) : 0;

      const mostReadCategories = [...categoryStats]
        .sort((a, b) => b.bookmarks - a.bookmarks)
        .slice(0, 5);

      // Real DB article counts from news_items table
      const cacheStats = await storage.getNewsCacheStats();
      const totalCached = cacheStats.total;

      const aggStatus = getAggregatorStatus();

      res.json({
        totalCategories,
        enabledCategories,
        featuredCategories,
        pinnedCategories,
        categoryStats,
        topBookmarked: topBookmarked.slice(0, 10),
        mostReadCategories,
        aiSummariesEnabled,
        aiImageGenEnabled,
        sourceType: "rss_tavily_x",
        articlesFetchedBySource: {
          rss: cacheStats.rss,
          tavily: cacheStats.tavily,
          x: cacheStats.x,
          total: totalCached,
        },
        aggregator: {
          lastRefreshAt: aggStatus.lastRefreshAt?.toISOString() ?? null,
          tavilyCallsToday: aggStatus.tavilyCallsToday,
          refreshIntervalMinutes: aggStatus.refreshIntervalMinutes,
          totalCachedArticles: totalCached,
        },
        aiOperationsToday: {
          summaries: aiSummariesGeneratedToday,
          images: aiImagesGeneratedToday,
        },
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  function articleToNewsArticle(item: NewsItem): import("./news").NewsArticle {
    return {
      title: item.title,
      link: item.link,
      description: item.description ?? "",
      pubDate: item.pubDate?.toISOString() ?? item.fetchedAt.toISOString(),
      source: item.source,
      imageUrl: item.imageUrl ?? null,
      aiInsight: item.aiInsight ?? undefined,
      sourceType: (item.sourceType as "rss" | "tavily" | "x") || undefined,
      category: item.categoryQuery ?? undefined,
    } as import("./news").NewsArticle;
  }

  app.get("/api/news/feed", async (req, res) => {
    try {
      const query = String(req.query.query ?? "");
      const limit = Math.min(parseInt(String(req.query.limit ?? "10")), 30);
      if (!query) return res.status(400).json({ message: "query param required" });

      const dbArticles = await storage.getNewsFeedItems(query, limit);
      if (dbArticles.length > 0) {
        return res.json(dbArticles.map(articleToNewsArticle));
      }

      const searchResults = await storage.searchNewsItems(query, limit);
      if (searchResults.length > 0) {
        return res.json(searchResults.map(articleToNewsArticle));
      }

      const xArticles = await fetchNewsArticles(query, limit).catch(() => []);
      res.json(xArticles);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/news/api-status", requireAuth, requireRole("admin"), async (_req, res) => {
    try {
      const xConfigured = !!process.env.X_BEARER_TOKEN;
      const tavilyConfigured = !!process.env.TAVILY_API_KEY;
      const aggStatus = getAggregatorStatus();
      res.json({
        rss: { active: true, description: "Primary news source — RSS feeds from configured categories" },
        tavily: { active: tavilyConfigured, callsToday: aggStatus.tavilyCallsToday, description: "AI web search (optional, max 3 calls/day)" },
        x: { active: xConfigured, description: "X/Twitter social buzz sidebar (optional)" },
        aggregator: {
          lastRefreshAt: aggStatus.lastRefreshAt?.toISOString() ?? null,
          refreshIntervalMinutes: aggStatus.refreshIntervalMinutes,
        },
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/news/force-refresh", requireAuth, requireRole("admin"), async (_req, res) => {
    try {
      await forceAggregatorRefresh();
      const cacheStats = await storage.getNewsCacheStats();
      res.json({ success: true, message: "News aggregator refreshed successfully.", cacheStats });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/news/feed/all", async (_req, res) => {
    try {
      const cats = await storage.getNewsCategories(true);
      if (cats.length === 0) return res.json([]);
      const results = await Promise.all(cats.map(c => storage.getNewsFeedItems(c.query, 8)));
      const interleaved: import("./news").NewsArticle[] = [];
      const maxLen = Math.max(...results.map((r) => r.length));
      for (let i = 0; i < maxLen; i++) {
        for (const arr of results) {
          if (arr[i]) interleaved.push(articleToNewsArticle(arr[i]));
        }
      }
      res.json(interleaved.slice(0, 40));
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  const newsSummaryCache = new Map<string, { summary: string; cachedAt: number }>();
  const NEWS_SUMMARY_CACHE_TTL_MS = 60 * 60 * 1000;

  const statsCounterDate = { date: "" };
  async function incrementNewsStat(key: string, amount = 1) {
    try {
      const today = new Date().toISOString().slice(0, 10);
      if (statsCounterDate.date !== today) {
        statsCounterDate.date = today;
        await storage.setPlatformSetting("news.stats.aiSummariesToday", "0");
        await storage.setPlatformSetting("news.stats.aiImagesToday", "0");
        await storage.setPlatformSetting("news.stats.articlesFetchedX", "0");
        await storage.setPlatformSetting("news.stats.date", today);
      }
      const settings = await storage.getPlatformSettings();
      const current = parseInt(settings[key] || "0") || 0;
      await storage.setPlatformSetting(key, String(current + amount));
    } catch {}
  }

  const aiRateLimit = { count: 0, resetAt: 0 };
  function checkAiRateLimit(maxPerHour: number): boolean {
    const now = Date.now();
    if (now > aiRateLimit.resetAt) {
      aiRateLimit.count = 0;
      aiRateLimit.resetAt = now + 60 * 60 * 1000;
    }
    if (aiRateLimit.count >= maxPerHour) return false;
    aiRateLimit.count++;
    return true;
  }

  app.put("/api/news/categories/reorder", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { order } = req.body as { order?: Array<{ id: number; displayOrder: number }> };
      if (!Array.isArray(order)) return res.status(400).json({ message: "order array required" });
      for (const item of order) {
        await storage.updateNewsCategory(item.id, { displayOrder: item.displayOrder });
      }
      const cats = await storage.getNewsCategories();
      res.json(cats);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.get("/api/news/summary", async (req, res) => {
    const url = String(req.query.url ?? "").trim();
    if (!url) return res.status(400).json({ message: "url param required" });

    const cached = newsSummaryCache.get(url);
    if (cached && Date.now() - cached.cachedAt < NEWS_SUMMARY_CACHE_TTL_MS) {
      return res.json({ summary: cached.summary });
    }

    const apiKey = process.env.OPENROUTER_API_KEY ?? "";
    if (!apiKey) return res.status(503).json({ message: "AI service not configured." });

    try {
      const settings = await storage.getPlatformSettings();
      const summariesEnabled = settings["news.ai.summariesEnabled"] === "true";
      if (!summariesEnabled) return res.status(403).json({ message: "AI summaries are disabled." });

      const maxRequestsPerHour = parseInt(settings["news.ai.maxRequestsPerHour"] || "60") || 60;
      if (!checkAiRateLimit(maxRequestsPerHour)) {
        return res.status(429).json({ message: "AI rate limit exceeded. Try again later." });
      }

      const grokModel = settings["news.ai.grokModel"] || "x-ai/grok-3-mini";
      const summaryStyle = settings["news.ai.summaryStyle"] || "concise";

      const stylePrompts: Record<string, string> = {
        concise: "Summarize this article in 2-3 sentences. Be concise and informative.",
        detailed: "Provide a detailed summary of this article in 4-5 sentences, covering key points and context.",
        editorial: "Summarize this article in 2-3 sentences in an editorial style. Be concise and informative.",
        bullet: "Summarize this article as 3-5 bullet points. Be concise and informative.",
      };
      const prompt = stylePrompts[summaryStyle] || stylePrompts.concise;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const pageRes = await fetch(url, {
        signal: controller.signal,
        headers: { "User-Agent": "SEVCO-News-Bot/1.0" },
      }).catch(() => null);
      clearTimeout(timeout);

      let articleText = "";
      if (pageRes && pageRes.ok) {
        const html = await pageRes.text();
        articleText = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 3000);
      }

      if (!articleText) return res.status(422).json({ message: "Could not extract article content." });

      const aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: grokModel,
          messages: [
            {
              role: "user",
              content: `${prompt}\n\n${articleText}`,
            },
          ],
          max_tokens: 150,
        }),
      });

      if (!aiRes.ok) {
        const errText = await aiRes.text();
        return res.status(502).json({ message: `AI error: ${errText.slice(0, 200)}` });
      }

      const aiData = await aiRes.json() as { choices?: Array<{ message?: { content?: string } }> };
      const summary = aiData?.choices?.[0]?.message?.content?.trim() ?? "";
      if (!summary) return res.status(502).json({ message: "AI returned empty summary." });

      newsSummaryCache.set(url, { summary, cachedAt: Date.now() });
      incrementNewsStat("news.stats.aiSummariesToday");
      res.json({ summary });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/news/ai-settings", async (_req, res) => {
    try {
      const settings = await getNewsAiSettings();
      const hasApiKey = !!(process.env.XAI_API_KEY || process.env.OPENROUTER_API_KEY);
      res.json({ ...settings, aiAvailable: hasApiKey });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  const grokRateLimitByIp = new Map<string, { count: number; resetAt: number }>();

  function getClientIp(req: Request): string {
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
    return req.ip || req.socket.remoteAddress || "unknown";
  }

  async function checkGrokRateLimit(req: Request): Promise<boolean> {
    const ip = getClientIp(req);
    const now = Date.now();
    let bucket = grokRateLimitByIp.get(ip);
    if (!bucket || now > bucket.resetAt) {
      bucket = { count: 0, resetAt: now + 60 * 60 * 1000 };
      grokRateLimitByIp.set(ip, bucket);
    }
    const maxPerHour = await getMaxRequestsPerHour();
    if (bucket.count >= maxPerHour) return false;
    bucket.count++;
    return true;
  }

  setInterval(() => {
    const now = Date.now();
    for (const [ip, bucket] of grokRateLimitByIp) {
      if (now > bucket.resetAt) grokRateLimitByIp.delete(ip);
    }
  }, 10 * 60 * 1000);

  app.post("/api/news/grok/summarize", async (req, res) => {
    try {
      if (!(await checkGrokRateLimit(req))) return res.status(429).json({ message: "AI rate limit exceeded. Try again later." });
      const settings = await getNewsAiSettings();
      if (!settings.summariesEnabled) return res.status(403).json({ message: "AI summaries are disabled" });
      const { url, title } = req.body as { url?: string; title?: string };
      if (!url || !title) return res.status(400).json({ message: "url and title are required" });
      const result = await grokSummarize(url, title);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/news/grok/image", async (req, res) => {
    try {
      if (!(await checkGrokRateLimit(req))) return res.status(429).json({ message: "AI rate limit exceeded. Try again later." });
      const settings = await getNewsAiSettings();
      if (!settings.imagesEnabled) return res.status(403).json({ message: "AI images are disabled" });
      const { prompt, cacheKey } = req.body as { prompt?: string; cacheKey?: string };
      if (!prompt) return res.status(400).json({ message: "prompt is required" });
      const url = await grokImage(prompt, cacheKey || prompt);
      if (!url) return res.status(502).json({ message: "Failed to generate image" });
      res.json({ url });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/news/grok/image/fallback", async (req, res) => {
    try {
      if (!(await checkGrokRateLimit(req))) return res.status(429).json({ message: "AI rate limit exceeded. Try again later." });
      const { prompt, cacheKey } = req.body as { prompt?: string; cacheKey?: string };
      if (!prompt) return res.status(400).json({ message: "prompt is required" });
      const url = await grokImageUnchecked(prompt, cacheKey || prompt);
      if (!url) return res.status(502).json({ message: "Failed to generate image" });
      res.json({ url });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/news/grok/ask", async (req, res) => {
    try {
      if (!(await checkGrokRateLimit(req))) return res.status(429).json({ message: "AI rate limit exceeded. Try again later." });
      const settings = await getNewsAiSettings();
      if (!settings.chatEnabled) return res.status(403).json({ message: "AI chat is disabled" });
      const { title, url, question } = req.body as { title?: string; url?: string; question?: string };
      if (!question) return res.status(400).json({ message: "question is required" });
      const answer = await askGrokAboutArticle(title || "News article", url || "", question);
      res.json({ answer });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/news/grok/summarize/stream", async (req, res) => {
    try {
      if (!(await checkGrokRateLimit(req))) return res.status(429).json({ message: "AI rate limit exceeded. Try again later." });
      const { url, title } = req.body as { url?: string; title?: string };
      if (!url || !title) return res.status(400).json({ message: "url and title are required" });
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      await streamSummarizeArticle(url, title, res);
    } catch (err: any) {
      if (!res.headersSent) res.status(500).json({ message: err.message });
      else res.end();
    }
  });

  app.post("/api/news/grok/ask/stream", async (req, res) => {
    try {
      if (!(await checkGrokRateLimit(req))) return res.status(429).json({ message: "AI rate limit exceeded. Try again later." });
      const { title, url, question } = req.body as { title?: string; url?: string; question?: string };
      if (!question) return res.status(400).json({ message: "question is required" });
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      await streamAskGrok(title || "News article", url || "", question, res);
    } catch (err: any) {
      if (!res.headersSent) res.status(500).json({ message: err.message });
      else res.end();
    }
  });

  app.post("/api/news/grok/search", async (req, res) => {
    try {
      if (!(await checkGrokRateLimit(req))) return res.status(429).json({ message: "AI rate limit exceeded. Try again later." });
      const settings = await getNewsAiSettings();
      if (!settings.searchEnabled) return res.status(403).json({ message: "AI search is disabled" });
      const { query } = req.body as { query?: string };
      if (!query) return res.status(400).json({ message: "query is required" });

      const aiResult = await searchNewsWithGrok(query);
      const allArticles = await Promise.all(
        aiResult.suggestedQueries.slice(0, 3).map((q) => fetchNewsArticles(q, 5))
      );
      const seen = new Set<string>();
      const articles = allArticles.flat().filter((a) => {
        if (seen.has(a.link)) return false;
        seen.add(a.link);
        return true;
      }).slice(0, 12);

      res.json({ interpretation: aiResult.interpretation, articles, liveResults: aiResult.liveResults || [] });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/news/grok/briefing", async (req, res) => {
    try {
      if (!(await checkGrokRateLimit(req))) return res.status(429).json({ message: "AI rate limit exceeded. Try again later." });
      const settings = await getNewsAiSettings();
      if (!settings.briefingEnabled) return res.status(403).json({ message: "AI briefing is disabled" });

      const cats = await storage.getNewsCategories(true);
      const headlinePromises = cats.slice(0, 5).map(async (cat) => {
        const articles = await fetchNewsArticles(cat.query, 4);
        return articles.map((a) => ({ title: a.title, source: a.source, category: cat.name }));
      });
      const allHeadlines = (await Promise.all(headlinePromises)).flat();
      const briefing = await generateDailyBriefing(allHeadlines);
      res.json(briefing);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/news/grok/trending-commentary", async (req, res) => {
    try {
      if (!(await checkGrokRateLimit(req))) return res.status(429).json({ message: "AI rate limit exceeded. Try again later." });
      const settings = await getNewsAiSettings();
      if (!settings.trendingEnabled) return res.status(403).json({ message: "AI trending is disabled" });
      const { topics } = req.body as { topics?: string[] };
      if (!topics?.length) return res.status(400).json({ message: "topics are required" });
      const commentary = await generateTrendingCommentary(topics);
      res.json(commentary);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  const trendingTopicsCache = new Map<string, { data: unknown; cachedAt: number }>();
  const TRENDING_CACHE_TTL = 5 * 60 * 1000;

  async function fetchTrendingTopicsFromXai(): Promise<string[]> {
    const xaiKey = process.env.XAI_API_KEY;
    if (!xaiKey) return [];

    const makeReq = async (model: string) =>
      fetch("https://api.x.ai/v1/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${xaiKey}` },
        body: JSON.stringify({
          model,
          input: [{ role: "user", content: "Use the x_search tool to search for what's trending on X in the US right now. Then list the top 10 trending topics as a JSON array of short topic strings, and nothing else. Example format: [\"Topic 1\", \"Topic 2\"]" }],
          tools: [{ type: "x_search" }],
        }),
      });

    let xaiRes = await makeReq("grok-4.20-reasoning");
    if (!xaiRes.ok) {
      xaiRes = await makeReq("grok-4");
      if (!xaiRes.ok) return [];
    }

    const data = await xaiRes.json() as any;
    const msgOutput = data?.output?.find((o: any) => o.type === "message");
    const outputText: string = msgOutput?.content?.[0]?.text ?? "";

    let topicNames: string[] = [];
    try {
      const jsonMatch = outputText.match(/\[[\s\S]*?\]/);
      if (jsonMatch) topicNames = JSON.parse(jsonMatch[0]);
    } catch {
      topicNames = outputText.split(/\n/).map((l: string) => l.replace(/^\d+[\.\)]\s*/, "").replace(/[#*"]/g, "").trim()).filter(Boolean).slice(0, 10);
    }
    return topicNames.slice(0, 10).filter(Boolean);
  }

  app.get("/api/market-data", async (_req, res) => {
    try {
      let rows = await storage.getLatestMarketData();
      const staleThresholdMs = 15 * 60 * 1000;
      const oldestFetchedAt = rows.length > 0
        ? Math.min(...rows.map((r) => new Date(r.fetchedAt).getTime()))
        : 0;
      const isStale = rows.length === 0 || Date.now() - oldestFetchedAt > staleThresholdMs;
      if (isStale) {
        try {
          const { fetchAllMarketData } = await import("./market-data");
          const fresh = await fetchAllMarketData();
          if (fresh.length > 0) {
            await storage.deleteExpiredMarketData(30);
            await storage.upsertMarketData(fresh);
            rows = await storage.getLatestMarketData();
          }
        } catch (fetchErr: any) {
          console.warn("[market-data] Fallback fetch failed:", fetchErr?.message);
        }
      }
      res.json(rows);
    } catch (err: any) {
      console.error("[market-data] Route error:", err.message);
      res.status(500).json({ error: "Failed to fetch market data" });
    }
  });

  app.get("/api/trending-topics", async (_req, res) => {
    try {
      const cacheKey = "trending-topics-us";
      const cached = trendingTopicsCache.get(cacheKey);
      if (cached && Date.now() - cached.cachedAt < TRENDING_CACHE_TTL) {
        return res.json(cached.data);
      }

      const xaiKey = process.env.XAI_API_KEY;
      if (!xaiKey) return res.json({ topics: [], source: "unavailable" });

      const topicNames = await fetchTrendingTopicsFromXai();
      if (topicNames.length === 0) return res.json({ topics: [], source: "error" });

      const topics = topicNames.map((name: string, i: number) => ({
        rank: i + 1,
        name,
        tweetCount: null,
      }));

      const result = { topics, source: "xai", fetchedAt: new Date().toISOString() };
      trendingTopicsCache.set(cacheKey, { data: result, cachedAt: Date.now() });
      res.json(result);
    } catch (err: any) {
      console.error("[trending-topics] Error:", err.message);
      res.json({ topics: [], source: "error" });
    }
  });

  const trendingNewsCache = new Map<string, { data: unknown; cachedAt: number }>();

  app.get("/api/trending-news", async (_req, res) => {
    try {
      const cacheKey = "trending-news";
      const cached = trendingNewsCache.get(cacheKey);
      if (cached && Date.now() - cached.cachedAt < TRENDING_CACHE_TTL) {
        return res.json(cached.data);
      }

      let topicNames: string[] = [];
      try {
        const topicsCacheKey = "trending-topics-us";
        const topicsCached = trendingTopicsCache.get(topicsCacheKey);
        if (topicsCached && Date.now() - topicsCached.cachedAt < TRENDING_CACHE_TTL) {
          const cachedTopics = topicsCached.data as { topics: Array<{ name: string }> };
          topicNames = cachedTopics.topics.slice(0, 5).map((t) => t.name);
        } else if (process.env.XAI_API_KEY) {
          const freshTopics = await fetchTrendingTopicsFromXai();
          if (freshTopics.length > 0) {
            const topicsData = {
              topics: freshTopics.map((name, i) => ({ rank: i + 1, name, tweetCount: null })),
              source: "xai",
              fetchedAt: new Date().toISOString(),
            };
            trendingTopicsCache.set(topicsCacheKey, { data: topicsData, cachedAt: Date.now() });
            topicNames = freshTopics.slice(0, 5);
          }
        }
      } catch (err) {
        console.error("[trending-news] Failed to fetch topics:", err);
      }

      if (topicNames.length === 0) {
        topicNames = ["breaking news", "technology", "politics", "entertainment", "sports"];
      }

      interface TrendingTweet {
        id: string;
        text: string;
        authorHandle: string;
        mediaUrl: string | null;
        likeCount: number;
        retweetCount: number;
        createdAt: string;
        url: string;
        category: string;
      }

      const tweetPromises = topicNames.slice(0, 5).map(async (topic) => {
        try {
          const query = `${topic} -is:retweet lang:en`;
          const tweets = await searchTweets(query, 3);
          return tweets.map((t): TrendingTweet => ({
            id: t.id,
            text: t.text,
            authorHandle: t.authorHandle,
            mediaUrl: t.mediaUrl,
            likeCount: t.likeCount,
            retweetCount: t.retweetCount,
            createdAt: t.createdAt,
            url: t.url,
            category: topic,
          }));
        } catch {
          return [];
        }
      });

      const allTweets = (await Promise.all(tweetPromises)).flat();
      const seen = new Set<string>();
      const uniqueTweets = allTweets.filter((t) => {
        if (seen.has(t.id)) return false;
        seen.add(t.id);
        return true;
      }).slice(0, 10);

      interface EnrichedTrendingArticle {
        id: string;
        headline: string;
        hook: string;
        summary: string;
        aiBlurb: string;
        aiInsight: string;
        timestamp: string;
        category: string;
        thumbnail: string | null;
        link: string;
        source: string;
      }

      const config = getApiConfig();
      let enrichedArticles: EnrichedTrendingArticle[] = [];

      const mapTweetToArticle = (t: TrendingTweet, i: number, blurb = "", insight = ""): EnrichedTrendingArticle => ({
        id: `trending-${i}`,
        headline: t.text.slice(0, 140),
        hook: t.text.slice(0, 120),
        summary: t.text,
        aiBlurb: blurb,
        aiInsight: insight,
        timestamp: t.createdAt,
        category: t.category,
        thumbnail: t.mediaUrl,
        link: t.url,
        source: t.authorHandle,
      });

      if (config && uniqueTweets.length > 0) {
        try {
          const headlineList = uniqueTweets.map((t, i) => `${i + 1}. [${t.category}] ${t.text.slice(0, 140)} (${t.authorHandle})`).join("\n");

          const aiRes = await fetch(config.apiUrl, {
            method: "POST",
            headers: config.headers,
            body: JSON.stringify({
              model: config.modelName,
              messages: [
                {
                  role: "system",
                  content: "You are a neutral editorial AI. Respond ONLY with valid JSON array, no markdown fences.",
                },
                {
                  role: "user",
                  content: `For each headline below, write a 2-sentence editorial blurb and a separate 1-sentence analytical insight. Respond with JSON array: [{"index": 0, "blurb": "2-sentence editorial", "insight": "1-sentence analysis"}]\n\nHeadlines:\n${headlineList}`,
                },
              ],
              max_tokens: 1200,
              temperature: 0.4,
            }),
          });

          let aiResults: Array<{ index: number; blurb: string; insight: string }> = [];
          if (aiRes.ok) {
            const aiData = await aiRes.json() as { choices?: Array<{ message?: { content?: string } }> };
            const content = aiData?.choices?.[0]?.message?.content?.trim() ?? "";
            try {
              const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
              aiResults = JSON.parse(cleaned);
            } catch {}
          }

          enrichedArticles = uniqueTweets.map((t, i) => {
            const aiMatch = aiResults.find((r) => r.index === i);
            return mapTweetToArticle(t, i, aiMatch?.blurb || "", aiMatch?.insight || "");
          });
        } catch (err) {
          console.error("[trending-news] AI enrichment error:", err);
          enrichedArticles = uniqueTweets.map((t, i) => mapTweetToArticle(t, i));
        }
      } else {
        enrichedArticles = uniqueTweets.map((t, i) => mapTweetToArticle(t, i));
      }

      trendingNewsCache.set(cacheKey, { data: enrichedArticles, cachedAt: Date.now() });
      res.json(enrichedArticles);
    } catch (err: any) {
      console.error("[trending-news] Error:", err.message);
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/news/wikify-ai", requireAuth, async (req, res) => {
    const { url, title } = req.body as { url?: string; title?: string };
    if (!url || !title) return res.status(400).json({ message: "url and title are required" });

    const apiKey = process.env.OPENROUTER_API_KEY ?? "";
    if (!apiKey) return res.status(503).json({ message: "AI service not configured." });

    try {
      const settings = await storage.getPlatformSettings();
      const grokModel = settings["news.ai.grokModel"] || "x-ai/grok-3";

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const pageRes = await fetch(url, {
        signal: controller.signal,
        headers: { "User-Agent": "SEVCO-News-Bot/1.0" },
      }).catch(() => null);
      clearTimeout(timeout);

      let articleText = "";
      if (pageRes && pageRes.ok) {
        const html = await pageRes.text();
        articleText = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 4000);
      }

      const prompt = articleText
        ? `You are a professional wiki editor. Based on the following article about "${title}", write a complete wiki article in markdown format. Include:\n- An intro paragraph summarizing the topic\n- ## Key Points section with 4-6 bullet points\n- ## Background section with context\n- ## Sources section listing the original article\n\nArticle content:\n${articleText}\n\nOriginal URL: ${url}\n\nWrite the wiki article now:`
        : `You are a professional wiki editor. Write a complete wiki article in markdown format about: "${title}". Include:\n- An intro paragraph\n- ## Key Points section with 4-6 bullet points\n- ## Background section\n- ## Sources section\n\nMake it informative and encyclopedic.`;

      const aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: grokModel,
          messages: [{ role: "user", content: prompt }],
          max_tokens: 1000,
        }),
      });

      if (!aiRes.ok) {
        const errText = await aiRes.text();
        return res.status(502).json({ message: `AI error: ${errText.slice(0, 200)}` });
      }

      const aiData = await aiRes.json() as { choices?: Array<{ message?: { content?: string } }> };
      const markdown = aiData?.choices?.[0]?.message?.content?.trim() ?? "";
      if (!markdown) return res.status(502).json({ message: "AI returned empty content." });

      const wikititle = title.replace(/\b\w/g, (c) => c.toUpperCase());
      res.json({ markdown, wikititle });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  const aiImageCache = new Map<string, { url: string; generatedAt: number }>();
  const AI_IMAGE_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

  async function generateImageForPost(text: string, link: string, promptTemplate?: string): Promise<string | null> {
    const cached = aiImageCache.get(link);
    if (cached && Date.now() - cached.generatedAt < AI_IMAGE_CACHE_TTL_MS) return cached.url;

    const prompt = promptTemplate
      ? promptTemplate.replace(/\{topic\}/gi, text.slice(0, 200)).replace(/\{\{text\}\}/gi, text.slice(0, 200))
      : `editorial news thumbnail for: ${text.slice(0, 200)}`;
    try {
      if (process.env.XAI_API_KEY) {
        const xaiRes = await fetch("https://api.x.ai/v1/images/generations", {
          method: "POST",
          headers: { Authorization: `Bearer ${process.env.XAI_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: "grok-2-image-1212", prompt, n: 1, response_format: "url" }),
        });
        if (xaiRes.ok) {
          const xaiData = await xaiRes.json() as { data?: Array<{ url?: string }> };
          const url = xaiData?.data?.[0]?.url;
          if (url) { aiImageCache.set(link, { url, generatedAt: Date.now() }); return url; }
        }
      }
      if (process.env.OPENROUTER_API_KEY) {
        const orRes = await fetch("https://openrouter.ai/api/v1/images/generations", {
          method: "POST",
          headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: "black-forest-labs/FLUX-1-schnell:free", prompt, n: 1 }),
        });
        if (orRes.ok) {
          const orData = await orRes.json() as { data?: Array<{ url?: string }> };
          const url = orData?.data?.[0]?.url;
          if (url) { aiImageCache.set(link, { url, generatedAt: Date.now() }); return url; }
        }
      }
    } catch {}
    return null;
  }

  app.get("/api/news/x-feed", async (req, res) => {
    const categoryName = String(req.query.category ?? "");
    const limit = Math.min(parseInt(String(req.query.limit ?? "10")), 20);
    const isAdmin = req.isAuthenticated?.() && (req.user as any)?.role === "admin";
    const xQueryOverride = isAdmin && req.query.xQueryOverride ? String(req.query.xQueryOverride) : null;

    if (!categoryName) {
      return res.status(400).json({ message: "category param required" });
    }

    let imageMode: "images_only" | "ai_generate" | "none" = "images_only";
    let allowedAccounts: string[] = [];
    let blockedAccounts: string[] = [];
    let minEngagement = 0;
    let globalImageGenEnabled = true;
    let categoryAiImageEnabled = true;
    let imagePromptTemplate = "";

    try {
      const settings = await storage.getPlatformSettings();
      imageMode = (settings["news.x.imageMode"] ?? "images_only") as typeof imageMode;
      const allowedAccountsRaw = settings["news.x.allowedAccounts"] ?? "";
      const blockedAccountsRaw = settings["news.x.blockedAccounts"] ?? "";
      minEngagement = parseInt(settings["news.x.minEngagement"] ?? "0") || 0;
      allowedAccounts = allowedAccountsRaw
        ? allowedAccountsRaw.split(",").map((h) => h.trim()).filter(Boolean)
        : [];
      blockedAccounts = blockedAccountsRaw
        ? blockedAccountsRaw.split(",").map((h) => h.trim()).filter(Boolean)
        : [];
      globalImageGenEnabled = settings["news.ai.imageGenEnabled"] === "true";
      imagePromptTemplate = settings["news.ai.imagePromptTemplate"] || "";
    } catch (settingsErr: any) {
      console.error("[news/x-feed] Failed to load platform settings, using defaults:", settingsErr.message);
    }

    let cat: { id: number; name: string; query: string; xQuery?: string | null; accentColor?: string | null } | undefined;
    try {
      const cats = await storage.getNewsCategories(true);
      cat = cats.find((c) => c.name.toLowerCase() === categoryName.toLowerCase()) ?? cats[0];
      if (cat) {
        try {
          const catSettings = await storage.getPlatformSettings();
          const catKey = `news.category.${cat.id}.aiImageGen`;
          categoryAiImageEnabled = catSettings[catKey] !== "false";
        } catch {}
      }
    } catch (catErr: any) {
      console.error("[news/x-feed] Failed to load news categories:", catErr.message);
    }

    const effectiveImageMode = (!globalImageGenEnabled || !categoryAiImageEnabled) && imageMode === "ai_generate"
      ? "images_only"
      : imageMode;

    const xConfigured = isXConfigured();
    let xArticles: Array<{
      title: string; link: string; description: string;
      pubDate: string; source: string; imageUrl: string | null; sourceType: "x";
      grokSummary?: string;
      authorHandle?: string; likeCount?: number; retweetCount?: number; replyCount?: number;
    }> = [];

    if (xConfigured && cat) {
      try {
        const tweets = await fetchCategoryNewsFromX(categoryName, cat?.query ?? categoryName, limit, {
          imagesOnly: effectiveImageMode === "images_only",
          allowedAccounts,
          blockedAccounts,
          minEngagement,
          customXQuery: xQueryOverride || cat?.xQuery || null,
        });

        const ai_generate_candidates: Array<{ text: string; link: string; idx: number }> = [];
        const mapped = tweets.map((t, idx) => {
          const imageUrl: string | null = t.mediaUrl ?? null;
          if (!imageUrl) {
            ai_generate_candidates.push({ text: t.text, link: t.url, idx });
          }
          return {
            title: t.text.slice(0, 140),
            link: t.url,
            description: t.text,
            pubDate: t.createdAt,
            source: t.authorName,
            imageUrl,
            sourceType: "x" as const,
            grokSummary: undefined as string | undefined,
            authorHandle: t.authorHandle,
            likeCount: t.likeCount,
            retweetCount: t.retweetCount,
            replyCount: t.replyCount,
          };
        });

        if (ai_generate_candidates.length > 0) {
          const toGenerate = ai_generate_candidates.slice(0, 10);
          try {
            const generated = await Promise.all(
              toGenerate.map((c) => generateImageForPost(c.text, c.link, imagePromptTemplate || undefined))
            );
            toGenerate.forEach((c, i) => {
              if (generated[i]) mapped[c.idx].imageUrl = generated[i];
            });
          } catch (imgErr: any) {
            console.error("[news/x-feed] AI image generation for X failed:", imgErr.message);
          }
        }

        const xFeedAiSettings = await getNewsAiSettings().catch(() => null);
        if (xFeedAiSettings?.summariesEnabled) {
          try {
            const summaryJobs = mapped.slice(0, 6).map(async (article, idx) => {
              const summary = await generateGrokSummaryForTweet(article.description, `xfeed:${article.link}`).catch(() => null);
              if (summary) mapped[idx].grokSummary = summary;
            });
            await Promise.allSettled(summaryJobs);
          } catch (summaryErr: any) {
            console.error("[news/x-feed] Grok summary generation failed:", summaryErr.message);
          }
        }

        mapped.sort((a, b) =>
          ((b.likeCount ?? 0) + (b.retweetCount ?? 0) + (b.replyCount ?? 0)) -
          ((a.likeCount ?? 0) + (a.retweetCount ?? 0) + (a.replyCount ?? 0))
        );
        xArticles = mapped;
        incrementNewsStat("news.stats.articlesFetchedX", mapped.length);
        const xAiGenCount = mapped.filter((m, i) => ai_generate_candidates.some(c => c.idx === i) && m.imageUrl).length;
        if (xAiGenCount > 0) incrementNewsStat("news.stats.aiImagesToday", xAiGenCount);
      } catch (xErr: any) {
        console.error("[news/x-feed] X API fetch failed:", xErr.message);
      }
    }

    res.json(xArticles.slice(0, limit + 5));
  });

  app.get("/api/news/breaking", async (_req, res) => {
    try {
      const settings = await storage.getPlatformSettings();
      if (settings["news.ai.breakingDetectionEnabled"] !== "true") {
        return res.json(null);
      }

      const cats = await storage.getNewsCategories(true);
      if (cats.length === 0) return res.json(null);

      const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;

      type BreakingCandidate = {
        title: string; link: string; description: string;
        pubDate: string; source: string; imageUrl: string | null;
        engagement: number;
      };

      let bestItem: BreakingCandidate | null = null;

      const updateBest = (candidate: BreakingCandidate) => {
        if (!bestItem || candidate.engagement > bestItem.engagement ||
          (candidate.engagement === bestItem.engagement && new Date(candidate.pubDate) > new Date(bestItem.pubDate))) {
          bestItem = candidate;
        }
      };

      const xConfigured = isXConfigured();
      for (const cat of cats) {
        try {
          if (xConfigured) {
            try {
              const tweets = await fetchCategoryNewsFromX(cat.name, cat.query, 20, {
                imagesOnly: false,
                allowedAccounts: [],
                blockedAccounts: [],
                minEngagement: 0,
              });
              for (const tweet of tweets) {
                try {
                  const d = new Date(tweet.createdAt).getTime();
                  if (d >= twoHoursAgo) {
                    const engagement = (tweet.likeCount ?? 0) + (tweet.retweetCount ?? 0) + (tweet.replyCount ?? 0);
                    updateBest({
                      title: tweet.text.slice(0, 140),
                      link: tweet.url,
                      description: tweet.text,
                      pubDate: tweet.createdAt,
                      source: tweet.authorName,
                      imageUrl: tweet.mediaUrl ?? null,
                      engagement,
                    });
                  }
                } catch {}
              }
            } catch {}
          }
        } catch {}
      }

      res.json(bestItem);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/news/bookmarks", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const bookmarks = await storage.getNewsBookmarks(userId);
      res.json(bookmarks);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/news/bookmarks", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const { articleUrl, articleTitle, articleImage, articleSource, articleCategory } = req.body as {
        articleUrl: string; articleTitle: string; articleImage?: string;
        articleSource?: string; articleCategory?: string;
      };
      if (!articleUrl || !articleTitle) return res.status(400).json({ message: "articleUrl and articleTitle required" });
      const existing = await storage.getNewsBookmarks(userId);
      const alreadyBookmarked = existing.find((b) => b.articleUrl === articleUrl);
      if (alreadyBookmarked) return res.json(alreadyBookmarked);
      const bookmark = await storage.createNewsBookmark({ userId, articleUrl, articleTitle, articleImage: articleImage ?? null, articleSource: articleSource ?? null, articleCategory: articleCategory ?? null });
      res.status(201).json(bookmark);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/news/bookmarks/:id", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const id = parseInt(req.params.id);
      const ok = await storage.deleteNewsBookmark(id, userId);
      if (!ok) return res.status(404).json({ message: "Bookmark not found" });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/news/preferences", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const prefs = await storage.getNewsPreferences(userId);
      res.json(prefs ?? { followedCategoryIds: [] });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.put("/api/news/preferences", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const { followedCategoryIds } = req.body as { followedCategoryIds: number[] };
      if (!Array.isArray(followedCategoryIds)) return res.status(400).json({ message: "followedCategoryIds must be an array" });
      const prefs = await storage.upsertNewsPreferences(userId, followedCategoryIds);
      res.json(prefs);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  const CLIENT_PLUS_ROLES: Role[] = ["client", "partner", "staff", "executive", "admin"];

  app.get("/api/email/address", requireAuth, (req, res) => {
    const user = req.user as any;
    if (!isClientPlus(user.role)) return res.status(403).json({ message: "Email is available for Client and above" });
    res.json({ address: getEmailAddress(user.username) });
  });

  app.get("/api/email/folders", requireAuth, requireRole(...CLIENT_PLUS_ROLES), async (req, res) => {
    try {
      const user = req.user as any;
      const counts = await storage.getEmailFolderCounts(user.id);
      res.json(counts);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/email/threads", requireAuth, requireRole(...CLIENT_PLUS_ROLES), async (req, res) => {
    try {
      const user = req.user as any;
      const folder = String(req.query.folder || "inbox");
      const limit = Math.min(parseInt(String(req.query.limit || "50")), 100);
      const page = Math.max(parseInt(String(req.query.page || "1")), 1);
      const search = req.query.search ? String(req.query.search) : undefined;
      const sender = req.query.sender ? String(req.query.sender) : undefined;
      const offset = (page - 1) * limit;

      const emailsResult = await storage.getEmails(user.id, folder, 500, 0, search);
      let allEmails = emailsResult.emails;

      if (sender) {
        const senderLower = sender.toLowerCase();
        allEmails = allEmails.filter((e) => e.fromAddress.toLowerCase().includes(senderLower));
      }

      const threadMap = new Map<string, Email[]>();
      for (const email of allEmails) {
        const key = email.threadId || `msg-${email.id}`;
        if (!threadMap.has(key)) threadMap.set(key, []);
        threadMap.get(key)!.push(email);
      }

      const threads = Array.from(threadMap.entries()).map(([groupKey, threadEmails]) => {
        threadEmails.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        const latest = threadEmails[threadEmails.length - 1];
        const participants = [...new Set(threadEmails.flatMap((e) => [e.fromAddress, ...e.toAddresses]))];
        const hasUnread = threadEmails.some((e) => !e.isRead);
        const hasAttachment = threadEmails.some(
          (e) => e.attachments && Array.isArray(e.attachments) && (e.attachments as any[]).length > 0
        );
        const latestSnippet = latest.bodyText?.replace(/\s+/g, " ").trim().slice(0, 120) || "";

        return {
          threadId: groupKey,
          subject: latest.subject || threadEmails[0].subject || "(no subject)",
          participants,
          latestDate: latest.createdAt,
          messageCount: threadEmails.length,
          hasUnread,
          hasAttachment,
          latestSnippet,
          emails: threadEmails,
        };
      });

      threads.sort((a, b) => new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime());

      const paginatedThreads = threads.slice(offset, offset + limit);
      res.json(paginatedThreads);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/email/messages", requireAuth, requireRole(...CLIENT_PLUS_ROLES), async (req, res) => {
    try {
      const user = req.user as any;
      const folder = String(req.query.folder || "inbox");
      const page = Math.max(1, parseInt(String(req.query.page || "1")));
      const limit = Math.min(Math.max(1, parseInt(String(req.query.limit || "25"))), 100);
      const offset = (page - 1) * limit;
      const search = req.query.search ? String(req.query.search) : undefined;

      const filters: { sender?: string; dateFrom?: string; dateTo?: string; hasAttachment?: boolean } = {};
      if (req.query.sender) filters.sender = String(req.query.sender);
      if (req.query.dateFrom) filters.dateFrom = String(req.query.dateFrom);
      if (req.query.dateTo) filters.dateTo = String(req.query.dateTo);
      if (req.query.hasAttachment === "true") filters.hasAttachment = true;

      const result = await storage.getEmails(user.id, folder, limit, offset, search, filters);
      const totalPages = Math.ceil(result.total / limit);
      res.json({
        emails: result.emails,
        total: result.total,
        page,
        totalPages,
        limit,
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/email/messages/:id", requireAuth, requireRole(...CLIENT_PLUS_ROLES), async (req, res) => {
    try {
      const user = req.user as any;
      const id = parseInt(req.params.id);
      const email = await storage.getEmail(id, user.id);
      if (!email) return res.status(404).json({ message: "Email not found" });
      if (!email.isRead) {
        await storage.updateEmail(id, user.id, { isRead: true });
      }
      res.json({ ...email, isRead: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/email/messages/:id", requireAuth, requireRole(...CLIENT_PLUS_ROLES), async (req, res) => {
    try {
      const user = req.user as any;
      const id = parseInt(req.params.id);
      const { isRead, isStarred, folder } = req.body as { isRead?: boolean; isStarred?: boolean; folder?: string };
      const updates: Partial<{ isRead: boolean; isStarred: boolean; folder: string }> = {};
      if (isRead !== undefined) updates.isRead = isRead;
      if (isStarred !== undefined) updates.isStarred = isStarred;
      if (folder !== undefined) updates.folder = folder;
      const updated = await storage.updateEmail(id, user.id, updates);
      if (!updated) return res.status(404).json({ message: "Email not found" });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/email/send", requireAuth, requireRole(...CLIENT_PLUS_ROLES), async (req, res) => {
    try {
      const user = req.user as any;
      const { to, cc, bcc, subject, bodyHtml, bodyText, html, text, replyTo, threadId, attachments: rawAttachments } = req.body as {
        to: string[];
        cc?: string[];
        bcc?: string[];
        subject: string;
        bodyHtml?: string;
        bodyText?: string;
        html?: string;
        text?: string;
        replyTo?: string;
        threadId?: string;
        attachments?: Array<{ filename: string; contentType: string; url: string; size: number }>;
      };

      const resolvedHtml = bodyHtml || html || "";
      const resolvedText = bodyText || text || (resolvedHtml ? resolvedHtml.replace(/<[^>]*>/g, "") : "");

      if (!to || !Array.isArray(to) || to.length === 0) {
        return res.status(400).json({ message: "At least one recipient is required" });
      }

      const resendApiKey = process.env.RESEND_API_KEY;
      let resendClient: Resend | null = null;

      try {
        const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
        const xReplitToken = process.env.REPL_IDENTITY
          ? "repl " + process.env.REPL_IDENTITY
          : process.env.WEB_REPL_RENEWAL
          ? "depl " + process.env.WEB_REPL_RENEWAL
          : null;
        if (hostname && xReplitToken) {
          const connRes = await fetch(`https://${hostname}/api/v2/connection?include_secrets=true&connector_names=resend`, {
            headers: { Accept: "application/json", "X-Replit-Token": xReplitToken },
          });
          if (connRes.ok) {
            const data = await connRes.json();
            const items: any[] = data.items ?? [];
            const apiKey = items[0]?.settings?.api_key;
            if (apiKey) resendClient = new Resend(apiKey);
          }
        }
      } catch {}

      if (!resendClient && resendApiKey) resendClient = new Resend(resendApiKey);

      const resendSend: ResendSendFn = async (payload) => {
        if (!resendClient) throw new Error("Resend API key not configured");
        const sendPayload: Parameters<typeof resendClient.emails.send>[0] = {
          from: payload.from,
          to: payload.to,
          subject: payload.subject,
          ...(payload.cc && payload.cc.length > 0 ? { cc: payload.cc } : {}),
          ...(payload.bcc && payload.bcc.length > 0 ? { bcc: payload.bcc } : {}),
          ...(payload.reply_to ? { reply_to: payload.reply_to } : {}),
          ...(payload.html ? { html: payload.html } : {}),
          ...(payload.text ? { text: payload.text } : {}),
        };
        if (payload.attachments && payload.attachments.length > 0) {
          sendPayload.attachments = payload.attachments.map(att => {
            if (att.content) {
              return { filename: att.filename, content: Buffer.from(att.content, "base64") };
            }
            return { filename: att.filename, path: att.path! };
          });
        }
        const { data, error } = await resendClient.emails.send(sendPayload);
        if (error) throw new Error(error.message);
        return { id: data?.id ?? null };
      };

      const fullUser = await storage.getUser(user.id);
      if (!fullUser) return res.status(404).json({ message: "User not found" });

      let resolvedThreadId: string | null = threadId ?? null;
      if (replyTo && !resolvedThreadId) {
        const userEmails = await storage.getEmails(user.id, "all", 100, 0);
        const originalEmail = userEmails.find(
          (e) => e.fromAddress.includes(replyTo) || e.toAddresses.some((a) => a.includes(replyTo))
        );
        if (originalEmail) {
          resolvedThreadId = originalEmail.threadId || originalEmail.resendEmailId || `msg-${originalEmail.id}`;
        }
      }

      const resendEmailId = await sendEmail({
        fromUser: fullUser,
        to,
        cc,
        bcc,
        subject,
        html: resolvedHtml,
        text: resolvedText,
        replyTo,
        threadId: resolvedThreadId,
        attachments: rawAttachments,
      }, resendSend);

      res.json({ success: true, resendEmailId });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/email/drafts", requireAuth, requireRole(...CLIENT_PLUS_ROLES), async (req, res) => {
    try {
      const user = req.user as any;
      const { to = [], cc = [], bcc = [], subject = "", bodyHtml, bodyText, html = "", text = "" } = req.body;
      const draftHtml = bodyHtml || html;
      const draftText = bodyText || text || (draftHtml ? draftHtml.replace(/<[^>]*>/g, "") : "");
      const fullUser = await storage.getUser(user.id);
      if (!fullUser) return res.status(404).json({ message: "User not found" });

      const draft = await storage.createEmail({
        userId: user.id,
        resendEmailId: null,
        direction: "outbound",
        fromAddress: getEmailAddress(fullUser.username),
        toAddresses: to,
        ccAddresses: cc,
        bccAddresses: bcc,
        replyTo: null,
        subject,
        bodyHtml: draftHtml,
        bodyText: draftText,
        folder: "drafts",
        isRead: true,
        isStarred: false,
        attachments: [],
        threadId: null,
      });

      res.json(draft);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.put("/api/email/drafts/:id", requireAuth, requireRole(...CLIENT_PLUS_ROLES), async (req, res) => {
    try {
      const user = req.user as any;
      const id = parseInt(req.params.id);
      const { to, cc, bcc, subject, html, text } = req.body;
      const updates: Record<string, any> = {};
      if (to !== undefined) updates.toAddresses = to;
      if (cc !== undefined) updates.ccAddresses = cc;
      if (bcc !== undefined) updates.bccAddresses = bcc;
      if (subject !== undefined) updates.subject = subject;
      if (html !== undefined) updates.bodyHtml = html;
      if (text !== undefined) updates.bodyText = text;
      const updated = await storage.updateEmail(id, user.id, updates);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/email/messages/:id/star", requireAuth, requireRole(...CLIENT_PLUS_ROLES), async (req, res) => {
    try {
      const user = req.user as any;
      const id = parseInt(req.params.id);
      const email = await storage.getEmail(id, user.id);
      if (!email) return res.status(404).json({ message: "Email not found" });
      const updated = await storage.updateEmail(id, user.id, { isStarred: !email.isStarred });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/email/messages/:id/move", requireAuth, requireRole(...CLIENT_PLUS_ROLES), async (req, res) => {
    try {
      const user = req.user as any;
      const id = parseInt(req.params.id);
      const { folder } = req.body as { folder: string };
      const validFolders = ["inbox", "sent", "drafts", "trash", "starred", "archive", "spam"];
      if (!folder || !validFolders.includes(folder)) return res.status(400).json({ message: "Invalid folder" });
      const updated = await storage.updateEmail(id, user.id, { folder });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/email/messages/:id", requireAuth, requireRole(...CLIENT_PLUS_ROLES), async (req, res) => {
    try {
      const user = req.user as any;
      const id = parseInt(req.params.id);
      await storage.deleteEmail(id, user.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/email/messages/:id/permanent", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.hardDeleteEmail(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/email/messages/:id/attachments/:index", requireAuth, requireRole(...CLIENT_PLUS_ROLES), async (req, res) => {
    try {
      const emailId = parseInt(req.params.id);
      const attachmentIndex = parseInt(req.params.index);
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ message: "Not authenticated" });

      const email = await storage.getEmail(emailId, userId);
      if (!email) return res.status(404).json({ message: "Email not found" });

      const attachments = (email.attachments as any[]) || [];
      const att = attachments[attachmentIndex];
      if (!att) return res.status(404).json({ message: "Attachment not found" });

      if (att.url && att.url.startsWith("http")) {
        return res.redirect(att.url);
      }

      if (att.content) {
        const buffer = Buffer.from(att.content, "base64");
        res.setHeader("Content-Type", att.contentType || "application/octet-stream");
        res.setHeader("Content-Disposition", `attachment; filename="${(att.filename || "attachment").replace(/"/g, "''")}"`);
        res.setHeader("Content-Length", buffer.length);
        return res.send(buffer);
      }

      return res.status(404).json({ message: "Attachment content not available" });
    } catch (err: any) {
      console.error("[email] Error serving attachment:", err);
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/email/inbound", async (req, res) => {
    try {
      const rawBodyRaw = (req as any).rawBody;
      const rawBody: Buffer = Buffer.isBuffer(rawBodyRaw)
        ? rawBodyRaw
        : Buffer.from(typeof rawBodyRaw === "string" ? rawBodyRaw : JSON.stringify(req.body));

      const webhookHeaders = {
        svixId: req.headers["svix-id"] as string | undefined,
        svixTimestamp: req.headers["svix-timestamp"] as string | undefined,
        svixSignature: req.headers["svix-signature"] as string | undefined,
        resendSignature: req.headers["resend-signature"] as string | undefined,
      };

      const hasSvixHeaders = !!(webhookHeaders.svixId && webhookHeaders.svixTimestamp && webhookHeaders.svixSignature);
      const hasResendSig = !!webhookHeaders.resendSignature;
      const body = req.body;
      const eventType = body?.type;
      const isWebhookFormat = !!(eventType && body?.data);

      console.log("[email/inbound] Received request — format:", isWebhookFormat ? "webhook" : "inbound-route", "headers:", JSON.stringify({
        hasSvixHeaders,
        hasResendSig,
        eventType: eventType ?? null,
        rawBodyLength: rawBody.length,
      }));

      if (isWebhookFormat || hasSvixHeaders || hasResendSig) {
        if (!verifyResendWebhookSignature(rawBody, webhookHeaders)) {
          console.warn("[email/inbound] Invalid webhook signature — rejecting request");
          return res.status(401).json({ message: "Invalid signature" });
        }
        console.log("[email/inbound] Webhook signature verified");

        if (eventType && eventType !== "email.received") {
          console.log(`[email/inbound] Ignoring non-inbound event: ${eventType}`);
          return res.status(200).json({ received: true, ignored: true });
        }

        const payload = body?.data ?? body;
        console.log("[email/inbound] Webhook payload keys:", Object.keys(payload || {}));
        console.log("[email/inbound] Webhook body fields — html:", typeof payload?.html, `(${(payload?.html || "").length}ch)`, "text:", typeof payload?.text, `(${(payload?.text || "").length}ch)`);
        await processInboundEmail(payload);
      } else {
        const inboundSecret = process.env.RESEND_INBOUND_SECRET || process.env.RESEND_WEBHOOK_SECRET;
        const providedSecret = req.query.secret as string | undefined;
        if (!inboundSecret) {
          console.error("[email/inbound] No RESEND_INBOUND_SECRET or RESEND_WEBHOOK_SECRET configured — rejecting unsigned inbound route request (fail-closed)");
          return res.status(401).json({ message: "Inbound route not configured" });
        }
        if (!providedSecret || providedSecret !== inboundSecret) {
          console.warn("[email/inbound] Invalid or missing ?secret= parameter on inbound route request — rejecting");
          return res.status(401).json({ message: "Invalid inbound route secret" });
        }
        console.log("[email/inbound] Inbound Route secret verified — processing payload");
        console.log("[email/inbound] Inbound Route keys:", Object.keys(body || {}));
        console.log("[email/inbound] Inbound Route body fields — html:", typeof body?.html, `(${(body?.html || "").length}ch)`, "text:", typeof body?.text, `(${(body?.text || "").length}ch)`, "attachments:", (body?.attachments || []).length);

        const payload = {
          email_id: body?.email_id ?? body?.message_id ?? undefined,
          from: body?.from,
          to: Array.isArray(body?.to) ? body.to : (body?.to ? [body.to] : []),
          cc: Array.isArray(body?.cc) ? body.cc : (body?.cc ? [body.cc] : []),
          reply_to: body?.reply_to,
          subject: body?.subject,
          html: body?.html ?? "",
          text: body?.text ?? "",
          attachments: (body?.attachments || []).map((a: any) => ({
            id: a.id,
            filename: a.filename ?? a.name,
            content_type: a.content_type ?? a.type,
            content_disposition: a.content_disposition,
            content_id: a.content_id ?? a.cid,
            content: a.content,
            url: a.url,
            size: a.size,
          })),
          headers: body?.headers,
          raw: body?.raw,
        };

        await processInboundEmail(payload);
      }

      res.status(200).json({ received: true });
    } catch (err: any) {
      console.error("[email/inbound] Error processing inbound email:", err);
      res.status(500).json({ message: err.message });
    }
  });

  // ─────────────────────────────────────────────────────────
  // X (Twitter) API
  // ─────────────────────────────────────────────────────────
  app.get("/api/social/x/status", async (_req, res) => {
    try {
      const configured = isXConfigured();
      const settings = await storage.getPlatformSettings();
      const handle = settings["social.x.handles"] ?? undefined;
      res.json({ configured, handle });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/social/x/feed", async (req, res) => {
    try {
      const settings = await storage.getPlatformSettings();
      const handlesParam = req.query.handles as string | undefined;
      const rawHandles = handlesParam || settings["social.x.handles"] || "";
      const limitParam = parseInt(req.query.limit as string) || parseInt(settings["social.x.maxTweets"] ?? "6") || 6;

      if (!rawHandles) {
        return res.json([]);
      }

      const handles = rawHandles.split(",").map((h: string) => h.trim()).filter(Boolean);

      const tweetArrays = await Promise.all(
        handles.map((handle: string) => fetchUserTweets(handle, limitParam))
      );

      const tweets = tweetArrays.flat();

      res.json(tweets);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ─────────────────────────────────────────────────────────
  // Tasks — personal (user) + staff tasks
  // ─────────────────────────────────────────────────────────
  const CAN_ACCESS_STAFF_TASKS: Role[] = ["admin", "executive", "staff"];

  // Staff task routes MUST be registered before /api/tasks/:id to avoid route conflicts

  // GET /api/tasks/staff — all staff tasks (staff+ only)
  app.get("/api/tasks/staff", requireRole(...CAN_ACCESS_STAFF_TASKS), async (_req, res) => {
    try {
      const tasks = await storage.getStaffTasks();
      res.json(tasks);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // POST /api/tasks/staff — create staff task (staff+ only)
  app.post("/api/tasks/staff", requireRole(...CAN_ACCESS_STAFF_TASKS), async (req, res) => {
    try {
      const createdById = (req.user as any).id as string;
      const { insertStaffTaskSchema } = await import("@shared/schema");
      const parsed = insertStaffTaskSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid data" });
      const task = await storage.createStaffTask({ ...parsed.data, createdById });
      storage.getUsersByRole(["admin", "executive", "staff"]).then((staffUsers) => {
        Promise.all(staffUsers.map((u) =>
          notify(u.id, "staff_task", "New staff task", task.title, "/command/staff")
        )).catch(() => {});
      }).catch(() => {});
      res.status(201).json(task);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // PATCH /api/tasks/staff/:id — update staff task (staff+ only)
  app.patch("/api/tasks/staff/:id", requireRole(...CAN_ACCESS_STAFF_TASKS), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const parsed = updateStaffTaskSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid data" });
      const task = await storage.updateStaffTask(id, parsed.data);
      if (!task) return res.status(404).json({ message: "Staff task not found" });
      res.json(task);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // DELETE /api/tasks/staff/:id — delete staff task (staff+ only)
  app.delete("/api/tasks/staff/:id", requireRole(...CAN_ACCESS_STAFF_TASKS), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteStaffTask(id);
      if (!deleted) return res.status(404).json({ message: "Staff task not found" });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // GET /api/tasks — personal tasks for current user
  app.get("/api/tasks", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id as string;
      const tasks = await storage.getUserTasks(userId);
      res.json(tasks);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // POST /api/tasks — create personal task
  app.post("/api/tasks", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id as string;
      const parsed = insertUserTaskSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid data" });
      const task = await storage.createUserTask({ ...parsed.data, userId });
      notify(userId, "task", "New task assigned", task.title, "/tools").catch(() => {});
      res.status(201).json(task);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // PATCH /api/tasks/:id — update personal task (only owner)
  app.patch("/api/tasks/:id", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id as string;
      const id = parseInt(req.params.id);
      const parsed = updateUserTaskSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid data" });
      const task = await storage.updateUserTask(id, userId, parsed.data);
      if (!task) return res.status(404).json({ message: "Task not found" });
      res.json(task);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // DELETE /api/tasks/:id — delete personal task (only owner)
  app.delete("/api/tasks/:id", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id as string;
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteUserTask(id, userId);
      if (!deleted) return res.status(404).json({ message: "Task not found" });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/domains", requireAuth, requireRole("admin", "executive", "staff"), async (_req, res) => {
    try {
      const result = await storage.getDomains();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/domains", requireAuth, requireRole("admin", "executive"), async (req, res) => {
    try {
      const parsed = insertDomainSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
      const domain = await storage.createDomain(parsed.data);
      res.status(201).json(domain);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/domains/:id", requireAuth, requireRole("admin", "executive"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const parsed = insertDomainSchema.partial().safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
      const domain = await storage.updateDomain(id, parsed.data);
      if (!domain) return res.status(404).json({ message: "Domain not found" });
      res.json(domain);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/domains/:id", requireAuth, requireRole("admin", "executive"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteDomain(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ─── Notifications ────────────────────────────────────────────────────────
  app.get("/api/notifications", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id as string;
      const notifs = await storage.getNotifications(userId);
      res.json(notifs);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/notifications/count", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id as string;
      const count = await storage.getUnreadNotificationCount(userId);
      res.json({ count });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/notifications/read-all", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id as string;
      await storage.markAllNotificationsRead(userId);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/notifications/:id/read", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id as string;
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
      await storage.markNotificationRead(id, userId);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ─── Paperclip Proxy Routes ────────────────────────────────────────────────
  async function getPaperclipConfig(): Promise<{ baseUrl: string; apiKey: string; companyId: string | null } | null> {
    const envBase = process.env.PAPERCLIP_BASE_URL;
    const envKey  = process.env.PAPERCLIP_API_KEY;
    if (envBase && envKey) {
      return { baseUrl: envBase, apiKey: envKey, companyId: process.env.PAPERCLIP_COMPANY_ID || null };
    }
    const settings = await storage.getPlatformSettings();
    const dbBase = settings["paperclip.baseUrl"];
    const dbKey  = settings["paperclip.apiKey"];
    if (dbBase && dbKey) {
      return { baseUrl: dbBase, apiKey: dbKey, companyId: settings["paperclip.companyId"] || null };
    }
    return null;
  }

  function paperclipProxy(getPath: string | ((cfg: { companyId: string | null }) => string)) {
    return async (req: any, res: any) => {
      const cfg = await getPaperclipConfig();
      if (!cfg) return res.json({ configured: false });
      const path = typeof getPath === "function" ? getPath(cfg) : getPath;
      const url = `${cfg.baseUrl.replace(/\/$/, "")}${path}`;
      try {
        const upstream = await fetch(url, {
          headers: { Authorization: `Bearer ${cfg.apiKey}`, "Content-Type": "application/json" },
        });
        let data: any;
        try { data = await upstream.json(); } catch { data = {}; }
        return res.status(upstream.status).json(data);
      } catch (err: any) {
        return res.status(502).json({ error: "unreachable", message: err.message });
      }
    };
  }

  const ADMIN_ONLY: Role[] = ["admin"];

  app.get("/api/paperclip/status", requireAuth, requireRole(...ADMIN_ONLY), async (req, res) => {
    const cfg = await getPaperclipConfig();
    if (!cfg) return res.json({ configured: false });
    const url = `${cfg.baseUrl.replace(/\/$/, "")}/api/health`;
    try {
      const upstream = await fetch(url, {
        headers: { Authorization: `Bearer ${cfg.apiKey}`, "Content-Type": "application/json" },
      });
      let data: any;
      try { data = await upstream.json(); } catch { data = {}; }
      if (!upstream.ok) {
        return res.json({ error: "unhealthy", status: upstream.status, baseUrl: cfg.baseUrl });
      }
      return res.json({ ...data, baseUrl: cfg.baseUrl });
    } catch (err: any) {
      return res.json({ error: "unreachable", message: err.message, baseUrl: cfg.baseUrl });
    }
  });

  app.get("/api/paperclip/dashboard", requireAuth, requireRole(...ADMIN_ONLY), paperclipProxy("/api/dashboard"));
  app.get("/api/paperclip/agents", requireAuth, requireRole(...ADMIN_ONLY),
    paperclipProxy((cfg) => cfg.companyId ? `/api/companies/${cfg.companyId}/agents` : "/api/agents")
  );
  app.get("/api/paperclip/activity", requireAuth, requireRole(...ADMIN_ONLY), paperclipProxy("/api/activity?limit=5"));
  app.get("/api/paperclip/costs", requireAuth, requireRole(...ADMIN_ONLY), paperclipProxy("/api/costs?limit=10"));

  app.get("/api/paperclip/config", requireAuth, requireRole(...ADMIN_ONLY), async (_req, res) => {
    try {
      const settings = await storage.getPlatformSettings();
      const envBase = process.env.PAPERCLIP_BASE_URL;
      const envKey  = process.env.PAPERCLIP_API_KEY;
      res.json({
        baseUrl: envBase || settings["paperclip.baseUrl"] || "",
        companyId: process.env.PAPERCLIP_COMPANY_ID || settings["paperclip.companyId"] || "",
        hasApiKey: !!(envKey || settings["paperclip.apiKey"]),
        source: envBase && envKey ? "env" : (settings["paperclip.baseUrl"] ? "db" : "none"),
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.put("/api/paperclip/config", requireAuth, requireRole(...ADMIN_ONLY), async (req, res) => {
    try {
      const { baseUrl, apiKey, companyId } = req.body as { baseUrl?: string; apiKey?: string; companyId?: string };
      const updates: Record<string, string> = {};
      if (baseUrl !== undefined) {
        const trimmed = baseUrl.trim();
        if (trimmed && !/^https?:\/\/.+/.test(trimmed)) {
          return res.status(400).json({ message: "baseUrl must start with http:// or https://" });
        }
        updates["paperclip.baseUrl"] = trimmed;
      }
      if (apiKey !== undefined && apiKey.trim()) updates["paperclip.apiKey"] = apiKey.trim();
      if (companyId !== undefined) updates["paperclip.companyId"] = companyId.trim();
      if (Object.keys(updates).length > 0) await storage.setPlatformSettings(updates);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ===== Sparks Currency Routes =====

  app.get("/api/sparks/social-stats", async (_req, res) => {
    try {
      const stats = await storage.getSocialSparkStats();
      const topSparkedPosts = stats.topItems
        .filter((i) => i.type === "post")
        .map((i) => ({
          postId: Number(i.id),
          sparkCount: i.sparkCount,
          authorUsername: i.authorUsername ?? "",
          contentPreview: i.title,
        }));
      const topSparkedArticles = stats.topItems
        .filter((i) => i.type === "article")
        .map((i) => ({ articleId: Number(i.id), sparkCount: i.sparkCount, title: i.title, slug: i.slug ?? String(i.id) }));
      const topSparkedImages = stats.topItems
        .filter((i) => i.type === "gallery")
        .map((i) => ({ imageId: Number(i.id), sparkCount: i.sparkCount, title: i.title, uploaderUsername: i.uploaderUsername ?? null }));
      res.json({
        totalSocialRewardsIssued: stats.totalIssued,
        uniqueAuthorsRewarded: stats.uniqueAuthorsRewarded,
        totalPostSparksGiven: stats.totalPostSparksGiven,
        totalArticleSparksGiven: stats.totalArticleSparksGiven,
        totalGallerySparksGiven: stats.totalGallerySparksGiven,
        topRewardedCreatorThisMonth: stats.topRewardedCreatorThisMonth,
        topSparkedPosts,
        topSparkedArticles,
        topSparkedImages,
        topItems: stats.topItems,
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Content sparking routes
  app.post("/api/posts/:id/spark", requireAuth, async (req: any, res) => {
    try {
      const contentId = parseInt(req.params.id);
      if (isNaN(contentId)) return res.status(400).json({ message: "Invalid id" });
      const senderId = req.user.id as string;

      const [post] = await db.select().from(posts).where(eq(posts.id, contentId)).limit(1);
      if (!post) return res.status(404).json({ message: "Post not found" });
      if (post.authorId === senderId) return res.status(400).json({ message: "Cannot spark your own content" });

      const already = await storage.hasContentSpark(senderId, "post", contentId);
      if (already) return res.status(409).json({ message: "Already sparked" });

      await storage.createContentSpark({ senderId, recipientId: post.authorId, contentType: "post", contentId, amount: 1 });
      await storage.creditSparks(post.authorId, 1, "content_spark", `Spark received on post #${contentId}`);

      const sender = await storage.getUser(senderId);
      const senderName = sender?.displayName || sender?.username || "Someone";
      notify(post.authorId, "spark", `⚡ ${senderName} sparked your post`, post.content.slice(0, 80), `/social`).catch(() => {});

      const count = await storage.getContentSparkCount("post", contentId);
      res.json({ success: true, sparksReceived: count });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/wiki/:slug/spark", requireAuth, async (req: any, res) => {
    try {
      const { slug } = req.params;
      const senderId = req.user.id as string;

      const article = await storage.getArticleBySlug(slug);
      if (!article) return res.status(404).json({ message: "Article not found" });

      const [authorRevision] = await db
        .select({ authorName: revisions.authorName })
        .from(revisions)
        .where(and(eq(revisions.articleId, article.id), eq(revisions.status, "approved")))
        .orderBy(desc(revisions.createdAt))
        .limit(1);

      const authorUser = authorRevision
        ? await storage.getUserByUsername(authorRevision.authorName)
        : undefined;

      if (!authorUser) return res.status(400).json({ message: "Author not found" });
      if (authorUser.id === senderId) return res.status(400).json({ message: "Cannot spark your own content" });

      const already = await storage.hasContentSpark(senderId, "article", article.id);
      if (already) return res.status(409).json({ message: "Already sparked" });

      await storage.createContentSpark({ senderId, recipientId: authorUser.id, contentType: "article", contentId: article.id, amount: 1 });
      await storage.creditSparks(authorUser.id, 1, "content_spark", `Spark received on article "${article.title}"`);

      const sender = await storage.getUser(senderId);
      const senderName = sender?.displayName || sender?.username || "Someone";
      notify(authorUser.id, "spark", `⚡ ${senderName} sparked your article`, article.title, `/wiki/${slug}`).catch(() => {});

      const count = await storage.getContentSparkCount("article", article.id);
      res.json({ success: true, sparksReceived: count });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/gallery/:id/spark", requireAuth, async (req: any, res) => {
    try {
      const contentId = parseInt(req.params.id);
      if (isNaN(contentId)) return res.status(400).json({ message: "Invalid id" });
      const senderId = req.user.id as string;

      const [img] = await db.select().from(galleryImages).where(eq(galleryImages.id, contentId)).limit(1);
      if (!img) return res.status(404).json({ message: "Gallery image not found" });

      const already = await storage.hasContentSpark(senderId, "gallery", contentId);
      if (already) return res.status(409).json({ message: "Already sparked" });

      // Gallery images don't have an author in schema, so skip recipient credit
      await storage.createContentSpark({ senderId, recipientId: senderId, contentType: "gallery", contentId, amount: 1 });

      const count = await storage.getContentSparkCount("gallery", contentId);
      res.json({ success: true, sparksReceived: count });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/sparks/leaderboard", async (req, res) => {
    try {
      const period = req.query.period === "all" ? "all" : "month";
      const data = await storage.getSparksLeaderboard(period as "month" | "all");
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/posts/:id/spark", requireAuth, async (req: any, res) => {
    try {
      const contentId = parseInt(req.params.id);
      if (isNaN(contentId)) return res.status(400).json({ message: "Invalid id" });
      const senderId = req.user.id as string;
      const sparked = await storage.hasContentSpark(senderId, "post", contentId);
      const count = await storage.getContentSparkCount("post", contentId);
      res.json({ sparked, count });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/sparks/balance", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any)?.id as string;
      const balance = await storage.getUserSparksBalance(userId);
      res.json({ balance });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/sparks/daily-quota", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any)?.id as string;
      const given = await storage.getUserDailySparksGiven(userId);
      const limit = 10;
      res.json({ given, limit, remaining: Math.max(0, limit - given) });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/sparks/transactions", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any)?.id as string;
      const limit = parseInt(req.query.limit as string ?? "20", 10);
      const offset = parseInt(req.query.offset as string ?? "0", 10);
      const txs = await storage.getUserSparkTransactions(userId, limit, offset);
      res.json(txs);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/sparks/checkout", requireAuth, async (req, res) => {
    try {
      const { packId, recurring } = z.object({ packId: z.number(), recurring: z.boolean().optional().default(false) }).parse(req.body);
      const userId = (req.user as any)?.id as string;
      const pack = await storage.getSparkPack(packId);
      if (!pack) return res.status(404).json({ message: "Pack not found" });
      if (!pack.active) return res.status(400).json({ message: "Pack is not available" });

      const priceId = recurring ? pack.stripeRecurringPriceId : pack.stripePriceId;
      if (!priceId) return res.status(400).json({ message: "Stripe price not configured for this pack" });

      const host = req.get("host");
      const proto = req.headers["x-forwarded-proto"] || req.protocol;
      const baseUrl = `${proto}://${host}`;

      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: recurring ? "subscription" : "payment",
        line_items: [{ price: priceId, quantity: 1 }],
        metadata: {
          sevco_user_id: userId,
          spark_pack_id: String(packId),
          sparks: String(pack.sparks),
          recurring: String(recurring),
        },
        success_url: `${baseUrl}/sparks/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/pricing`,
      });

      res.json({ url: session.url });
    } catch (err: any) {
      if (err?.name === "ZodError") return res.status(400).json({ message: "Invalid request body" });
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/sparks/packs", async (_req, res) => {
    try {
      const packs = await storage.listSparkPacks(true);
      res.json(packs);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/sparks/admin/stats", requireAuth, requireRole("admin"), async (_req, res) => {
    try {
      const stats = await storage.getSparkStats();
      res.json(stats);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/sparks/admin/transactions", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const userId = req.query.userId as string | undefined;
      const type = req.query.type as string | undefined;
      const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
      const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;
      const limit = parseInt(req.query.limit as string ?? "50", 10);
      const offset = parseInt(req.query.offset as string ?? "0", 10);
      const txs = await storage.getAllSparkTransactions({ userId, type, dateFrom, dateTo }, limit, offset);
      res.json(txs);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/sparks/admin/adjust", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { userId, amount, description } = z.object({
        userId: z.string(),
        amount: z.number().int(),
        description: z.string().min(1),
      }).parse(req.body);

      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      if (amount > 0) {
        await storage.creditSparks(userId, amount, "admin_credit", description);
      } else if (amount < 0) {
        await storage.debitSparks(userId, Math.abs(amount), "admin_debit", description);
      } else {
        return res.status(400).json({ message: "Amount cannot be zero" });
      }

      const balance = await storage.getUserSparksBalance(userId);
      res.json({ ok: true, balance });
    } catch (err: any) {
      if (err?.name === "ZodError") return res.status(400).json({ message: "Invalid request body" });
      if (err instanceof InsufficientSparksError) return res.status(400).json({ message: err.message, currentBalance: err.currentBalance, requested: err.requested });
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/sparks/admin/packs", requireAuth, requireRole("admin"), async (_req, res) => {
    try {
      const packs = await storage.listSparkPacks(true);
      res.json(packs);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/sparks/admin/packs", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { name, sparks, price, sortOrder } = z.object({
        name: z.string().min(1),
        sparks: z.number().int().positive(),
        price: z.number().int().positive(),
        sortOrder: z.number().int().optional().default(0),
      }).parse(req.body);

      const stripe = await getUncachableStripeClient();

      const product = await stripe.products.create({
        name,
        metadata: { type: "spark_pack" },
      });

      const oneTimePrice = await stripe.prices.create({
        product: product.id,
        unit_amount: price,
        currency: "usd",
      });

      const recurringPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: price,
        currency: "usd",
        recurring: { interval: "month" },
      });

      const pack = await storage.upsertSparkPack({
        name,
        sparks,
        price,
        sortOrder,
        stripeProductId: product.id,
        stripePriceId: oneTimePrice.id,
        stripeRecurringPriceId: recurringPrice.id,
        active: true,
      });

      res.json(pack);
    } catch (err: any) {
      console.error("[sparks/admin/packs POST] Error:", err?.message ?? err);
      if (err?.name === "ZodError") return res.status(400).json({ message: "Invalid request body" });
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/sparks/admin/packs/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid pack id" });

      const existing = await storage.getSparkPack(id);
      if (!existing) return res.status(404).json({ message: "Pack not found" });

      const data = z.object({
        name: z.string().min(1).optional(),
        sparks: z.number().int().positive().optional(),
        price: z.number().int().positive().optional(),
        sortOrder: z.number().int().optional(),
        active: z.boolean().optional(),
      }).parse(req.body);

      const updates: Partial<import("@shared/schema").InsertSparkPack> = { ...data };

      if (data.price !== undefined && data.price !== existing.price && existing.stripeProductId) {
        const stripe = await getUncachableStripeClient();
        const newOneTime = await stripe.prices.create({
          product: existing.stripeProductId,
          unit_amount: data.price,
          currency: "usd",
        });
        const newRecurring = await stripe.prices.create({
          product: existing.stripeProductId,
          unit_amount: data.price,
          currency: "usd",
          recurring: { interval: "month" },
        });
        updates.stripePriceId = newOneTime.id;
        updates.stripeRecurringPriceId = newRecurring.id;
      }

      const pack = await storage.updateSparkPack(id, updates);
      res.json(pack);
    } catch (err: any) {
      if (err?.name === "ZodError") return res.status(400).json({ message: "Invalid request body" });
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/sparks/admin/packs/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid pack id" });
      await storage.deleteSparkPack(id);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/sparks/success", requireAuth, async (req, res) => {
    try {
      const sessionId = req.query.session_id as string;
      if (!sessionId) return res.status(400).json({ message: "session_id required" });
      const userId = (req.user as any)?.id as string;
      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.metadata?.sevco_user_id !== userId) {
        return res.status(403).json({ message: "Session does not belong to the current user" });
      }
      const sparks = parseInt(session.metadata?.sparks ?? "0", 10);
      const balance = await storage.getUserSparksBalance(userId);
      res.json({ sparks, newBalance: balance });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  return httpServer;
}

async function notify(userId: string, type: string, title: string, body?: string, link?: string) {
  try {
    await storage.createNotification({ userId, type, title, body, link, isRead: false });
  } catch { /* non-blocking */ }
}

export { notify };
