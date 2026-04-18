#!/usr/bin/env node
/**
 * append-to-update-log.js
 *
 * Called by post-merge.sh after each task merge.
 * 1. Appends the task plan file to SEVCO_UPDATE_LOG.md (idempotent).
 * 2. Creates a structured changelog entry via the internal API.
 *
 * Usage:
 *   node scripts/append-to-update-log.js <path-to-plan-file.md> [taskRef] [taskTitle]
 */

import { readFileSync, appendFileSync, existsSync, readdirSync } from "fs";
import { basename } from "path";
import { request } from "http";

const planFilePath = process.argv[2];
const taskRef = process.argv[3] || null;
const taskTitleArg = process.argv[4] || null;

if (!planFilePath) {
  console.error("Usage: node scripts/append-to-update-log.js <path-to-task-plan.md> [taskRef] [taskTitle]");
  process.exit(1);
}

let raw;
try {
  raw = readFileSync(planFilePath, "utf8");
} catch (err) {
  console.error(`Error reading file ${planFilePath}: ${err.message}`);
  process.exit(1);
}

const LOG_FILE = "SEVCO_UPDATE_LOG.md";
const dateStr = new Date().toISOString().slice(0, 10);
const fileName = basename(planFilePath, ".md");

// ── 1. Extract metadata from plan file ─────────────────────────────────────

function extractTitle(text) {
  for (const line of text.split("\n")) {
    const m = line.match(/^#\s+(.+)/);
    if (m) return m[1].trim();
  }
  const fm = text.match(/^---[\s\S]*?title:\s*(.+?)[\s\S]*?---/m);
  if (fm) return fm[1].trim();
  return fileName.replace(/-/g, " ");
}

function extractSection(text, sectionName) {
  const sectionRegex = /^##\s+(.+)$/gm;
  const positions = [];
  let m;
  while ((m = sectionRegex.exec(text)) !== null) {
    positions.push({ name: m[1].trim(), start: m.index + m[0].length });
  }
  const idx = positions.findIndex((p) => p.name === sectionName);
  if (idx === -1) return null;
  const start = positions[idx].start;
  const end = idx + 1 < positions.length ? positions[idx + 1].start - positions[idx + 1].name.length - 4 : text.length;
  return text.slice(start, end).trim();
}

function detectCategory(text) {
  const lower = text.toLowerCase();
  if (/\bfix\b|\bbug\b|\bcrash\b|\berror\b|\bbroken\b|\bbreaks?\b/.test(lower)) return "fix";
  if (/\bnew page\b|\bnew feature\b|\badd(ed)?\b|\bcreate\b|\bbuil[dt]\b|\bredesign\b|\boverhaul\b/.test(lower)) return "feature";
  if (/\bimprov(e|ed|ement)\b|\benhance\b|\bupdat(e|ed)\b|\bupgrad\b|\bpolish\b|\brefine\b/.test(lower)) return "improvement";
  return "other";
}

function autoIncrementVersion(latest) {
  if (!latest) return "1.0.0";
  const parts = latest.split(".").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return "1.0.0";
  parts[2] += 1;
  return parts.join(".");
}

const title = taskTitleArg || extractTitle(raw);
const whySection = extractSection(raw, "What & Why");
const description = whySection
  ? whySection.split("\n")[0].replace(/^[-*]\s*/, "").trim()
  : `Platform update: ${title}`;
const category = detectCategory(raw);

// ── 2. Append to SEVCO_UPDATE_LOG.md (idempotent by filename) ──────────────

const sectionAnchor = `## Task — ${fileName}`;

let alreadyLogged = false;
if (existsSync(LOG_FILE)) {
  const existing = readFileSync(LOG_FILE, "utf8");
  if (existing.includes(sectionAnchor)) {
    alreadyLogged = true;
    console.log(`[update-log] Already logged: ${fileName} — skipping append.`);
  }
}

if (!alreadyLogged) {
  const separator = "\n\n---\n\n";
  const block = [
    `${sectionAnchor}`,
    `> Merged: ${dateStr}`,
    "",
    raw.trim(),
    "",
  ].join("\n");

  if (!existsSync(LOG_FILE)) {
    const header = [
      "# SEVCO Platform — Complete Development Update Log",
      "",
      "> Every Replit Agent task plan reproduced verbatim. Zero omissions.",
      `> Platform: sevco.us | Auto-generated | Last updated: ${dateStr}`,
      "",
      "---",
      "",
    ].join("\n");
    appendFileSync(LOG_FILE, header);
  }

  appendFileSync(LOG_FILE, block + separator);
  console.log(`[update-log] Appended task "${title}" to ${LOG_FILE}`);
}

// ── 3. Create changelog DB entry via internal API ──────────────────────────

const secret = process.env.WIKI_AUTO_ARTICLE_SECRET;
if (!secret) {
  console.warn("[update-log] WIKI_AUTO_ARTICLE_SECRET not set — skipping changelog entry.");
  process.exit(0);
}

// First fetch the latest version so we can auto-increment
function fetchLatestVersion() {
  return new Promise((resolve) => {
    const opts = {
      hostname: "localhost",
      port: 5000,
      path: "/api/changelog/latest",
      method: "GET",
    };
    const req = request(opts, (res) => {
      let body = "";
      res.on("data", (c) => { body += c; });
      res.on("end", () => {
        try {
          const data = JSON.parse(body);
          resolve(data?.version ?? null);
        } catch {
          resolve(null);
        }
      });
    });
    req.on("error", () => resolve(null));
    req.end();
  });
}

function postChangelogEntry(payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const opts = {
      hostname: "localhost",
      port: 5000,
      path: "/api/internal/changelog-entry",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
        "x-internal-secret": secret,
      },
    };
    const req = request(opts, (res) => {
      let resp = "";
      res.on("data", (c) => { resp += c; });
      res.on("end", () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(resp) }); }
        catch { resolve({ status: res.statusCode, data: resp }); }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// Fetch existing wiki article by slug for collision detection
function fetchWikiArticleBySlug(slug) {
  return new Promise((resolve) => {
    const opts = {
      hostname: "localhost",
      port: 5000,
      path: `/api/articles/${encodeURIComponent(slug)}`,
      method: "GET",
    };
    const req = request(opts, (res) => {
      let body = "";
      res.on("data", (c) => { body += c; });
      res.on("end", () => {
        if (res.statusCode === 404) return resolve(null);
        try { resolve(JSON.parse(body)); } catch { resolve(null); }
      });
    });
    req.on("error", () => resolve(null));
    req.end();
  });
}

function postWikiArticle(payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const opts = {
      hostname: "localhost",
      port: 5000,
      path: "/api/internal/wiki-article",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
        "x-internal-secret": secret,
      },
    };
    const req = request(opts, (res) => {
      let resp = "";
      res.on("data", (c) => { resp += c; });
      res.on("end", () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(resp) }); }
        catch { resolve({ status: res.statusCode, data: resp }); }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// The canonical ordered files list (must match PLATFORM_ORDERED_FILES in server/routes.ts)
const PLATFORM_ORDERED_FILES = [
  "rbac-role-system.md", "platform-shell.md", "landing-and-dashboard.md", "music-page.md", "store-page.md",
  "projects-page.md", "logo-favicon-update.md", "logo-display-fix.md", "logo-no-skew.md", "platform-footer.md",
  "platform-polish-and-changelog.md", "fix-production-auth.md", "stripe-checkout-cart.md", "command-center.md",
  "store-analytics.md", "store-redesign.md", "auto-wiki-engineering-articles.md", "sidebar-account-cleanup.md",
  "auth-copy-tweak.md", "pre-publish-fixes.md", "email-verification.md", "public-access-mega-menu.md",
  "home-contact-pages.md", "profile-page.md", "jobs-page.md", "services-page.md", "music-expansion.md",
  "projects-megamenu-marketing.md", "projects-dropdown-style-fix.md",
  "t28-bug-fixes-quick-wins.md", "t29-profile-user-enhancements.md", "t30-footer-social-links-admin.md",
  "t31-store-cmd-product-creation.md", "t32-music-player-playlist-cmd.md", "t33-wiki-archive.md",
  "t34-version-system-changelog.md", "t35-social-feed.md", "t36-notes-tool.md", "t39-nav-platform-housekeeping.md",
  "t40-cmd-restructure.md", "t41-hostinger-domains.md", "t42-engineering-articles-changelog.md",
  "t43-bug-fixes-nav-polish.md", "t44-project-social-links-about-page.md", "t45-listen-page-social-links-cmd.md",
  "t46-cmd-display-tab.md", "t47-platform-search.md", "t48-bug-fixes.md", "t49-cmd-enhancements.md",
  "t50-home-bulletin-footer-store-cleanup.md", "t51-gallery-tools-dropdown.md", "t52-brand-section-about.md",
  "t53-hosting-landing-page.md", "t54-project-service-icons-placeholder-products.md", "t55-spotify-integration.md",
  "t56-wiki-articles-changelog.md", "t57-supabase-storage.md", "t58-bug-fixes-2.md",
  "t59-display-tab-uploads-services.md", "t60-platform-colors.md", "t61-notes-export.md", "t62-bugs-polish.md",
  "t63-brand-colors-media-cdn.md", "t64-marketing-pages.md", "t65-support-tab-cmd.md", "t66-members-chat.md",
  "t67-minecraft-page.md", "t68-finance-tab-cmd.md", "t69-staff-tab-cmd.md", "t70-bugs-polish2.md",
  "t71-minecraft-project-cmd.md", "t72-hover-tooltips.md", "t73-hero-logo-brand-assets.md",
  "t74-services-menu-reorganization.md", "t75-finance-subscriptions.md", "t76-email-fix.md",
  "t77-ai-chat-agents.md", "t78-cmd-settings-tab.md", "t79-brand-color-theming.md", "t80-traffic-tab-cmd.md",
  "t81-bug-fixes-4.md", "t82-bug-fixes-5.md", "t83-extended-color-settings.md", "t84-admin-content-management.md",
  "t85-site-audit.md", "t86-google-analytics.md", "t87-registration-email-fix.md", "t88-bug-fixes-6.md",
  "t89-news-page.md", "t90-wiki-changelog-comprehensive.md", "t91-bug-fixes-7.md", "t92-news-improvements.md",
  "t93-nav-and-button-colors.md", "t94-bug-fixes-8.md", "t95-services-notes-display.md", "t96-settings-redesign.md",
  "t97-email-client.md", "t98-notes-fixes.md", "t99-notes-editor-final-fix.md", "t100-x-oauth-signin.md",
  "t101-home-consolidation-x-api.md", "t103-grok-agent-models.md", "t104-production-db-migration.md",
  "t105-x-secrets-setup.md", "t106-fix-x-oauth-callback-url.md", "t107-link-x-account.md",
  "t108-bug-fixes-11.md", "t109-x-feed-improvements.md", "t110-profile-overhaul.md", "t111-notes-save-x-post.md",
  "t112-grok-models-imagine.md", "t113-fullscreen-floating-chat.md", "t114-protect-planet-logo.md",
  "t116-chat-conflict-hero-button-color.md", "t117-brand-color-palette-replacement.md",
  "task-118.md", "task-119.md", "task-120.md", "task-121.md",
  "t132-grok-imagine-error-image-rendering.md",
  "sidebar-cleanup.md", "news-x-only-migration.md", "beautiful-news-images.md", "cmd-news-controls.md",
  "home-page-redesign-wiki-docs.md", "wikify-tool-page.md", "tools-marketing-page.md", "compile-update-log.md",
];

// Parse task number directly from filename patterns like task-192.md or t192-something.md
function parseTaskNumFromFilename(filename) {
  // task-NNN.md
  const m1 = filename.match(/^task-(\d+)\.md$/);
  if (m1) return parseInt(m1[1], 10);
  // tNNN-something.md (3+ digits after 't')
  const m2 = filename.match(/^t(\d{3,})-/);
  if (m2) return parseInt(m2[1], 10);
  return null;
}

// Fetch max platform task number from the changelog API
function fetchMaxPlatformTaskNum() {
  return new Promise((resolve) => {
    const opts = {
      hostname: "localhost",
      port: 5000,
      path: "/api/changelog",
      method: "GET",
    };
    const req = request(opts, (res) => {
      let body = "";
      res.on("data", (c) => { body += c; });
      res.on("end", () => {
        try {
          const entries = JSON.parse(body);
          let max = 191; // floor: we know 191 tasks exist
          for (const e of entries) {
            const m = e.title && e.title.match(/^Task #(\d+)/);
            if (m) {
              const n = parseInt(m[1], 10);
              if (n > max) max = n;
            }
          }
          resolve(max);
        } catch {
          resolve(191);
        }
      });
    });
    req.on("error", () => resolve(191));
    req.end();
  });
}

// Compute canonical task number for the given task filename — monotonic, collision-safe
async function computePlatformTaskNum(taskFilename) {
  // 1. Check ordered list first
  const orderedIdx = PLATFORM_ORDERED_FILES.indexOf(taskFilename);
  if (orderedIdx !== -1) return orderedIdx + 1;

  // 2. Try to parse task number directly from the filename (e.g. task-192.md → 192)
  const parsed = parseTaskNumFromFilename(taskFilename);
  if (parsed !== null) return parsed;

  // 3. Fetch max existing platform task number from the API and return max + 1
  const maxNum = await fetchMaxPlatformTaskNum();
  return maxNum + 1;
}

(async () => {
  // ── 3. Create platform wiki article first, get wikiSlug ──
  let platformWikiSlug = null;
  const taskFilename = basename(planFilePath);
  const taskNum = await computePlatformTaskNum(taskFilename);
  const platformSlug = `platform-task-${String(taskNum).padStart(3, "0")}`;
  const platformTitle = `Task #${taskNum} — ${title}`;

  console.log(`[update-log] Computed task number: ${taskNum} → slug: ${platformSlug}`);

  // Guard: check if this slug already belongs to a different task — abort on collision
  try {
    const existingArticle = await fetchWikiArticleBySlug(platformSlug);
    if (existingArticle && existingArticle.title && existingArticle.title !== platformTitle) {
      const existingTaskMatch = existingArticle.title.match(/^Task #(\d+)/);
      const newTaskNum = taskNum;
      if (existingTaskMatch && parseInt(existingTaskMatch[1], 10) !== newTaskNum) {
        // Different task number in existing article — hard abort: slug belongs to a different task
        console.error(`[update-log] ABORT: slug "${platformSlug}" is already owned by "${existingArticle.title}" (Task #${existingTaskMatch[1]}), ` +
          `but this merge computed Task #${newTaskNum}. ` +
          `This is a task number collision — check computePlatformTaskNum and the canonical task list.`);
        process.exit(1);
      } else {
        // Same task number, different title — warn but allow update (content/title refinement)
        console.warn(`[update-log] WARNING: "${platformSlug}" exists with title "${existingArticle.title}" — updating to "${platformTitle}". ` +
          `If this is unintended, abort and verify the task file.`);
      }
    }
  } catch (err) {
    console.warn(`[update-log] Could not pre-check slug collision: ${err.message}`);
  }

  // Task #517 — Hard-fail on wiki POST failure so /platform and /changelog
  // cannot drift. The changelog entry below is only written if the wiki
  // article POST succeeds, keeping the two sources in lockstep.
  try {
    const wikiResult = await postWikiArticle({
      title: platformTitle,
      slug: platformSlug,
      content: raw,
      summary: description,
      tags: ["platform-history", `task-${String(taskNum).padStart(3, "0")}`, "engineering"],
      categorySlug: "sevco-platform",
    });
    if (wikiResult.status >= 200 && wikiResult.status < 300) {
      const action = wikiResult.data?.action ?? "created";
      platformWikiSlug = platformSlug;
      console.log(`[update-log] Platform wiki article ${action}: "${platformTitle}" (${platformSlug})`);
    } else {
      console.error(`[update-log] ABORT: Platform wiki article API returned ${wikiResult.status}: ${JSON.stringify(wikiResult.data)}. ` +
        `Refusing to write changelog entry — fix the wiki side and re-run, otherwise /platform and /changelog will drift.`);
      process.exit(1);
    }
  } catch (err) {
    console.error(`[update-log] ABORT: Could not post platform wiki article: ${err.message}. ` +
      `Refusing to write changelog entry — fix the wiki side and re-run, otherwise /platform and /changelog will drift.`);
    process.exit(1);
  }

  // ── 4. Create/update changelog entry with wikiSlug cross-link ──
  // Use platformTitle ("Task #N — <title>") to match the seeder's dedup key format
  const changelogTitle = taskNum ? platformTitle : title;
  try {
    const latestVersion = await fetchLatestVersion();
    const version = autoIncrementVersion(latestVersion);

    const result = await postChangelogEntry({ title: changelogTitle, description, category, version, wikiSlug: platformWikiSlug });

    if (result.status >= 200 && result.status < 300) {
      const action = result.data?.action ?? "created";
      console.log(`[update-log] Changelog entry ${action}: "${changelogTitle}" (${category}, v${version})${platformWikiSlug ? ` → ${platformWikiSlug}` : ""}`);
    } else {
      console.warn(`[update-log] Changelog API returned ${result.status}: ${JSON.stringify(result.data)}`);
    }
  } catch (err) {
    console.warn(`[update-log] Could not post changelog entry: ${err.message}`);
  }
})();
