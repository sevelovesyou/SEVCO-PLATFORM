#!/usr/bin/env node
/**
 * append-to-update-log.js
 *
 * Called by post-merge.sh after each task merge.
 * 1. Appends the task plan file to SEVCO_UPDATE_LOG.md (idempotent).
 * 2. Upserts a wiki article directly into the DB (no HTTP server needed).
 * 3. Upserts a changelog entry directly into the DB (no HTTP server needed).
 *
 * Task #552 — Rewrote HTTP calls to localhost:5000 as direct DB writes so the
 * script succeeds at merge time when the Express server is not running.
 *
 * Usage:
 *   node scripts/append-to-update-log.js <path-to-plan-file.md> [taskRef] [taskTitle]
 */

import { readFileSync, appendFileSync, existsSync, readdirSync } from "fs";
import { basename, dirname, resolve } from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const { Pool } = pg;

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

const rawTitle = taskTitleArg || extractTitle(raw);
// Strip leading "Task #NNN — " or "Task #NNN: " if the heading already includes it,
// so we don't end up with "Task #552 — Task #552 — ..." when building platformTitle.
const title = rawTitle.replace(/^Task\s*#\d+\s*[—:\-]\s*/i, "").trim() || rawTitle;
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

// ── 3. Check prerequisites ──────────────────────────────────────────────────

if (!process.env.DATABASE_URL) {
  console.error("[update-log] ABORT: DATABASE_URL not set — cannot write changelog or wiki entries.");
  process.exit(1);
}

// ── 4. Resolve task ref ─────────────────────────────────────────────────────
// Task #526 — Resolve the canonical Replit task ref. Order:
//   1. CLI argv[3]  — explicit override (post-merge.sh can pass it).
//   2. Plan filename matches `task-NNN.md` → use NNN.
//   3. Plan content first line `# Task #NNN —` → use NNN.
//   4. Highest `task-NNN.md` file under .local/tasks/ — Replit's task
//      system writes one for the active task, so the newest such file is
//      the just-merged ref.
//   5. Hard-fail. We will NOT silently invent a number.

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

// ── 5. Write directly to DB inside a single transaction ────────────────────
// All three writes (wiki article upsert, revision insert, changelog upsert)
// run inside one transaction so a mid-run failure leaves the DB in a clean
// state rather than a partial state that could cause drift.

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();

try {
  // Pre-flight reads happen outside the transaction (read-only, no locking needed)
  // so we don't hold the transaction open longer than necessary.

  // Find the 'sevco-platform' category (fall back to 'engineering')
  let categoryId = null;
  for (const trySlug of ["sevco-platform", "engineering"]) {
    const { rows: catRows } = await client.query(
      "SELECT id FROM categories WHERE slug = $1 LIMIT 1",
      [trySlug]
    );
    if (catRows.length > 0) {
      categoryId = catRows[0].id;
      break;
    }
  }

  // Find the Peter author user (NULL author_id is acceptable if Peter doesn't exist)
  let peterUserId = null;
  {
    const { rows: peterRows } = await client.query(
      "SELECT id FROM users WHERE username = $1 LIMIT 1",
      ["Peter"]
    );
    if (peterRows.length > 0) peterUserId = peterRows[0].id;
  }

  // Check existing article (slug collision guard, also outside transaction)
  const { rows: existingArticleRows } = await client.query(
    "SELECT id, title FROM articles WHERE slug = $1 LIMIT 1",
    [platformSlug]
  );
  if (existingArticleRows.length > 0) {
    const existingTitle = existingArticleRows[0].title;
    const existingTaskMatch = existingTitle.match(/^Task #(\d+)/);
    if (existingTaskMatch && parseInt(existingTaskMatch[1], 10) !== taskNum) {
      throw new Error(
        `slug "${platformSlug}" is already owned by "${existingTitle}" ` +
        `(Task #${existingTaskMatch[1]}), but this merge computed Task #${taskNum}. ` +
        `This is a task number collision — check the canonical task list.`
      );
    }
  }

  // Get latest version for auto-increment (outside transaction — snapshot is fine)
  const { rows: latestVersionRows } = await client.query(
    "SELECT version FROM changelog ORDER BY created_at DESC LIMIT 1"
  );
  const latestVersion = latestVersionRows[0]?.version ?? null;
  const version = autoIncrementVersion(latestVersion);

  // ── Begin transaction ────────────────────────────────────────────────────
  await client.query("BEGIN");

  try {
    // ── 5a. Upsert wiki article ────────────────────────────────────────────
    let articleId;
    if (existingArticleRows.length > 0) {
      const { rows: updatedRows } = await client.query(
        `UPDATE articles
            SET title = $1, summary = $2, content = $3,
                tags = $4, status = 'published', updated_at = NOW()
          WHERE id = $5
          RETURNING id`,
        [
          platformTitle,
          description,
          raw,
          ["platform-history", `task-${String(taskNum).padStart(3, "0")}`, "engineering"],
          existingArticleRows[0].id,
        ]
      );
      articleId = updatedRows[0].id;
      console.log(`[update-log] Platform wiki article updated: "${platformTitle}" (${platformSlug})`);
    } else {
      const insertCols = categoryId
        ? ["title", "slug", "content", "summary", "category_id", "status", "tags", "author_id"]
        : ["title", "slug", "content", "summary", "status", "tags", "author_id"];
      const insertVals = categoryId
        ? [platformTitle, platformSlug, raw, description, categoryId, "published",
            ["platform-history", `task-${String(taskNum).padStart(3, "0")}`, "engineering"],
            peterUserId]
        : [platformTitle, platformSlug, raw, description, "published",
            ["platform-history", `task-${String(taskNum).padStart(3, "0")}`, "engineering"],
            peterUserId];
      const placeholders = insertVals.map((_, i) => `$${i + 1}`).join(", ");

      const { rows: insertedRows } = await client.query(
        `INSERT INTO articles (${insertCols.join(", ")})
         VALUES (${placeholders})
         RETURNING id`,
        insertVals
      );
      articleId = insertedRows[0].id;
      console.log(`[update-log] Platform wiki article created: "${platformTitle}" (${platformSlug})`);
    }

    // ── 5b. Insert auto-approved revision ─────────────────────────────────
    await client.query(
      `INSERT INTO revisions (article_id, content, summary, edit_summary, status, author_name)
       VALUES ($1, $2, $3, $4, 'approved', 'Peter')`,
      [articleId, raw, description, "Auto-generated by post-merge script on merge"]
    );

    // ── 5c. Upsert changelog entry ─────────────────────────────────────────
    const validCategories = ["feature", "fix", "improvement", "other"];
    const safeCategory = validCategories.includes(category) ? category : "other";
    const changelogTitle = platformTitle;
    const changelogDescription = description.slice(0, 500);

    const { rows: existingChangelog } = await client.query(
      "SELECT id FROM changelog WHERE wiki_slug = $1 OR title = $2 LIMIT 1",
      [platformSlug, changelogTitle]
    );

    if (existingChangelog.length > 0) {
      await client.query(
        `UPDATE changelog
            SET title = $1, description = $2, category = $3, version = $4, wiki_slug = $5
          WHERE id = $6`,
        [changelogTitle, changelogDescription, safeCategory, version, platformSlug, existingChangelog[0].id]
      );
      console.log(`[update-log] Changelog entry updated: "${changelogTitle}" (${safeCategory}, v${version}) → ${platformSlug}`);
    } else {
      await client.query(
        `INSERT INTO changelog (title, description, category, version, wiki_slug)
         VALUES ($1, $2, $3, $4, $5)`,
        [changelogTitle, changelogDescription, safeCategory, version, platformSlug]
      );
      console.log(`[update-log] Changelog entry created: "${changelogTitle}" (${safeCategory}, v${version}) → ${platformSlug}`);
    }

    await client.query("COMMIT");

  } catch (txErr) {
    await client.query("ROLLBACK");
    throw txErr;
  }

} catch (err) {
  console.error(`[update-log] ABORT: DB write failed: ${err.message}`);
  process.exit(1);
} finally {
  client.release();
  await pool.end();
}
