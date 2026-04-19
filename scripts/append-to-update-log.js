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
import { basename, dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { request } from "http";

// Task #526 — The legacy hand-mapped 191-task list is gone. The canonical
// task ref is derived from the Replit-managed task-NNN.md file (Replit's
// project_tasks system writes one of these per task). See
// resolveTaskRefFromPlanFile() below.
const __dirname = dirname(fileURLToPath(import.meta.url));
const TASKS_DIR = resolve(__dirname, "..", ".local", "tasks");

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

// Task #526 — Resolve the canonical Replit task ref. Order:
//   1. CLI argv[3]  — explicit override (post-merge.sh can pass it).
//   2. Plan filename matches `task-NNN.md` → use NNN.
//   3. Plan content first line `# Task #NNN —` → use NNN.
//   4. Highest `task-NNN.md` file under .local/tasks/ — Replit's task
//      system writes one for the active task, so the newest such file is
//      the just-merged ref. This is the path most user-named plan files
//      take in practice.
//   5. Hard-fail. We will NOT silently invent a number — the whole point
//      of Task #526 is that the changelog mirrors the real task panel.
function parseTaskNumFromFilename(filename) {
  const m1 = filename.match(/^task-(\d+)\.md$/);
  if (m1) return parseInt(m1[1], 10);
  const m2 = filename.match(/^t(\d{3,})-/);
  if (m2) return parseInt(m2[1], 10);
  return null;
}

function parseTaskNumFromTitleLine(text) {
  for (const line of text.split("\n").slice(0, 30)) {
    const m = line.match(/^#\s*Task\s*#(\d+)\b/i);
    if (m) return parseInt(m[1], 10);
  }
  return null;
}

function highestReplitTaskFile() {
  if (!existsSync(TASKS_DIR)) return null;
  let best = null;
  for (const name of readdirSync(TASKS_DIR)) {
    const m = name.match(/^task-(\d+)\.md$/);
    if (!m) continue;
    const n = parseInt(m[1], 10);
    if (best === null || n > best) best = n;
  }
  return best;
}

function resolveTaskRef(taskFilename, planContent, cliRef) {
  // Plan-derived signals (filename, then title line) win over the CLI ref
  // because they are tied to the actual merged plan file. The CLI ref
  // comes from post-merge.sh which has the same chain — but if a caller
  // ever passes a stale or wrong CLI value, we want the plan to override
  // it rather than silently mislabel the changelog. If CLI disagrees with
  // a plan-derived ref we log a clear warning so the divergence is visible.
  const fromName = parseTaskNumFromFilename(taskFilename);
  if (fromName !== null) {
    if (cliRef && String(cliRef).match(/(\d+)/)?.[1] !== String(fromName)) {
      console.warn(
        `[update-log] WARNING: CLI ref "${cliRef}" disagrees with plan filename ref #${fromName}; using filename.`,
      );
    }
    return fromName;
  }
  const fromTitle = parseTaskNumFromTitleLine(planContent);
  if (fromTitle !== null) {
    if (cliRef && String(cliRef).match(/(\d+)/)?.[1] !== String(fromTitle)) {
      console.warn(
        `[update-log] WARNING: CLI ref "${cliRef}" disagrees with plan title ref #${fromTitle}; using title.`,
      );
    }
    return fromTitle;
  }
  if (cliRef) {
    const m = String(cliRef).match(/(\d+)/);
    if (m) return parseInt(m[1], 10);
  }
  const fromReplit = highestReplitTaskFile();
  if (fromReplit !== null) return fromReplit;
  return null;
}

(async () => {
  // ── 3. Create platform wiki article first, get wikiSlug ──
  let platformWikiSlug = null;
  const taskFilename = basename(planFilePath);
  const taskNum = resolveTaskRef(taskFilename, raw, taskRef);
  if (taskNum === null) {
    console.error(
      `[update-log] ABORT: Could not determine the Replit task ref for plan file "${planFilePath}". ` +
      `Tried CLI argv[3] ("${taskRef ?? ""}"), filename pattern (task-NNN.md), the plan title's leading "Task #N", ` +
      `and the highest .local/tasks/task-NNN.md file. Refusing to invent a number — fix one of these inputs and re-run.`
    );
    process.exit(1);
  }
  const platformSlug = `platform-task-${String(taskNum).padStart(3, "0")}`;
  const platformTitle = `Task #${taskNum} — ${title}`;

  console.log(`[update-log] Resolved task ref: #${taskNum} → slug: ${platformSlug}`);

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
