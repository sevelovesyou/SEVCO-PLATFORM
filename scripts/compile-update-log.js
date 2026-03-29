#!/usr/bin/env node
/**
 * compile-update-log.js
 * Compiles SEVCO_UPDATE_LOG.md from all .local/tasks/*.md plan files.
 * Run once: node scripts/compile-update-log.js
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";

const TASKS_DIR = ".local/tasks";
const OUTPUT_FILE = "SEVCO_UPDATE_LOG.md";
const TODAY = new Date().toISOString().slice(0, 10);

const ORDERED_FILES = [
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

function extractTitle(content, fallback) {
  for (const line of content.split("\n")) {
    const m = line.match(/^#\s+(.+)/);
    if (m) return m[1].trim();
  }
  return fallback;
}

function readTask(filename) {
  const filePath = join(TASKS_DIR, filename);
  if (!existsSync(filePath)) return null;
  try {
    return readFileSync(filePath, "utf8").trim();
  } catch {
    return null;
  }
}

const allFilesInDir = readdirSync(TASKS_DIR).filter((f) => f.endsWith(".md"));
const orderedSet = new Set(ORDERED_FILES);

const mainSections = [];
const processedFiles = new Set();

ORDERED_FILES.forEach((filename, idx) => {
  const content = readTask(filename);
  if (!content) {
    console.warn(`[missing] ${filename}`);
    return;
  }
  processedFiles.add(filename);
  mainSections.push({
    taskNum: idx + 1,
    filename,
    title: extractTitle(content, filename.replace(".md", "").replace(/-/g, " ")),
    content,
  });
});

const appendixSections = [];
allFilesInDir.forEach((filename) => {
  if (!processedFiles.has(filename)) {
    const content = readTask(filename);
    if (!content) return;
    processedFiles.add(filename);
    appendixSections.push({
      filename,
      title: extractTitle(content, filename.replace(".md", "").replace(/-/g, " ")),
      content,
    });
  }
});

let doc = "";

doc += "# SEVCO Platform — Complete Development Update Log\n\n";
doc += "> Every Replit Agent task plan reproduced verbatim. Zero omissions.\n";
doc += `> Main tasks: ${mainSections.length} | Appendix: ${appendixSections.length}\n`;
doc += `> Platform: sevco.us | Last compiled: ${TODAY}\n\n`;
doc += "---\n\n";

// Table of Contents
doc += "## Table of Contents\n\n";
doc += "### Main Task Log\n\n";
mainSections.forEach(({ taskNum, filename, title }) => {
  doc += `- **#${taskNum}** — ${title} (\`${filename}\`)\n`;
});
doc += "\n### Appendix\n\n";
appendixSections.forEach(({ filename, title }) => {
  doc += `- ${title} (\`${filename}\`)\n`;
});
doc += "\n---\n\n";

// Main log
doc += "## Task Log\n\n";
mainSections.forEach(({ taskNum, filename, title, content }) => {
  doc += `### #${taskNum} — ${title}\n\n`;
  doc += `> File: \`${filename}\`\n\n`;
  doc += content + "\n\n";
  doc += "---\n\n";
});

// Appendix
if (appendixSections.length > 0) {
  doc += "## Appendix — Additional Tasks & Fixes\n\n";
  doc += "> Additional plan files not in the primary ordered sequence.\n\n";
  appendixSections.forEach(({ filename, title, content }) => {
    doc += `### ${title}\n\n`;
    doc += `> File: \`${filename}\`\n\n`;
    doc += content + "\n\n";
    doc += "---\n\n";
  });
}

writeFileSync(OUTPUT_FILE, doc, "utf8");
const lines = doc.split("\n").length;
const kb = Math.round(Buffer.byteLength(doc, "utf8") / 1024);
console.log(`Written: ${OUTPUT_FILE}`);
console.log(`  Lines: ${lines.toLocaleString()}`);
console.log(`  Size:  ${kb} KB`);
console.log(`  Main tasks: ${mainSections.length}`);
console.log(`  Appendix: ${appendixSections.length}`);
