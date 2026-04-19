#!/usr/bin/env node
/**
 * dump-changelog-snapshot.js
 *
 * Task #525 — Writes a versioned, fully-cleaned snapshot of every platform
 * task changelog row + its matching wiki article content to
 * data/changelog-snapshot.json.
 *
 * The snapshot writer is authoritative: it dedupes by task number, fills
 * every gap between #1 and the latest task with a "Task #N-M — (no logged
 * content)" range placeholder, and derives a canonical platform-task-* slug
 * for every entry — even rows whose wiki_slug column is NULL in the DB.
 * This keeps prod self-sync correct on the next deploy regardless of how
 * messy the source DB became.
 *
 * Called by post-merge.sh after the changelog/wiki upsert completes.
 * server/index.ts then upserts every entry into production's own DB at
 * startup — the live site stays aligned with the preview without ever
 * touching deployment secrets.
 */

import { writeFileSync, mkdirSync } from "fs";
import { dirname } from "path";
import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error("[snapshot] DATABASE_URL not set — cannot dump snapshot");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const SINGLE_TASK_RE = /^Task #(\d+)(?:[^\d-]|$)/;
const RANGE_TASK_RE  = /^Task #(\d+)-(\d+)/;

function pad3(n) {
  return String(n).padStart(3, "0");
}

try {
  // Pull every row that looks like a platform task — by title or by slug.
  // We do not require wiki_slug to start with platform-task-* because some
  // legacy rows have NULL slugs; the snapshot writer assigns canonical slugs
  // below.
  const { rows: changelogRows } = await pool.query(`
    SELECT id, title, description, category, version, wiki_slug AS "wikiSlug", created_at AS "createdAt"
      FROM changelog
     WHERE title ~ '^Task #[0-9]+'
        OR wiki_slug LIKE 'platform-task-%'
  `);

  // Index every wiki article whose slug starts with platform-task-* so we
  // can attach content to entries by canonical slug below.
  const { rows: articleRows } = await pool.query(`
    SELECT slug, content, summary, tags
      FROM articles
     WHERE slug LIKE 'platform-task-%'
  `);
  const articleBySlug = new Map(articleRows.map((a) => [a.slug, a]));

  // ── Step 1: classify each changelog row as single-task or range ──
  // A row is "single" if its title parses as Task #N (and not Task #N-M).
  // A row is "range" if its title parses as Task #N-M.
  // For singles, dedupe by task number (keep newest by createdAt).
  const singleByNum = new Map(); // taskNum -> row
  const rangeByKey  = new Map(); // "start-end" -> row

  for (const r of changelogRows) {
    const rangeMatch = r.title.match(RANGE_TASK_RE);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1], 10);
      const end   = parseInt(rangeMatch[2], 10);
      if (start > end) continue;
      const key = `${start}-${end}`;
      const prev = rangeByKey.get(key);
      if (!prev || new Date(r.createdAt) > new Date(prev.createdAt)) {
        rangeByKey.set(key, r);
      }
      continue;
    }
    const singleMatch = r.title.match(SINGLE_TASK_RE);
    if (!singleMatch) continue;
    const n = parseInt(singleMatch[1], 10);
    const prev = singleByNum.get(n);
    if (!prev || new Date(r.createdAt) > new Date(prev.createdAt)) {
      singleByNum.set(n, r);
    }
  }

  // ── Step 2: derive the canonical slug for every kept row and resolve
  //           article content by that slug ──
  const entries = [];

  function buildEntry({ taskNum, rangeStart, rangeEnd, row, isPlaceholder = false, version = null, createdAt = null }) {
    let slug;
    let title;
    let description;
    let category;
    if (rangeStart != null) {
      slug = `platform-task-${pad3(rangeStart)}-${pad3(rangeEnd)}`;
      title = row?.title ?? `Task #${rangeStart}-${rangeEnd} — (no logged content)`;
      description = row?.description ??
        `Tasks #${rangeStart} through #${rangeEnd} merged before the platform changelog was wired up, ` +
        `or their plan files were never persisted. This placeholder keeps the task ordering intact.`;
      category = row?.category ?? "other";
    } else {
      slug = `platform-task-${pad3(taskNum)}`;
      title = row.title;
      description = row.description;
      category = row.category ?? "improvement";
    }
    const article = articleBySlug.get(slug);
    const finalVersion = row?.version ?? version ?? null;
    // Fall back to a stub article body (same shape the runtime backfill uses
    // in server/index.ts) so the snapshot is self-contained — every entry
    // ships an article, which prevents the prod-side hard-sync assertion
    // from tripping on rows we just inserted.
    const stubContent =
      `# ${title}\n\n` +
      (finalVersion ? `_Version: ${finalVersion}_\n\n` : "") +
      `${description}\n\n---\n\n` +
      `_Auto-generated from the changelog snapshot (Task #525). ` +
      `Replace with the full task plan content by re-merging the original task._\n`;
    const stubTags = ["platform-history", "engineering", isPlaceholder ? "placeholder" : "snapshot"];
    return {
      title,
      description,
      category,
      version: finalVersion,
      wikiSlug: slug,
      createdAt: (row?.createdAt ?? createdAt ?? new Date()).toString(),
      articleContent: article?.content ?? stubContent,
      articleSummary: article?.summary ?? description,
      articleTags:    article?.tags    ?? stubTags,
      isPlaceholder,
    };
  }

  for (const [taskNum, row] of singleByNum) {
    entries.push(buildEntry({ taskNum, row }));
  }

  // ── Step 3: synthesize range placeholders for every gap between #1 and
  //           the highest known task number, derive version + createdAt
  //           from surrounding real entries so the timeline stays clean ──
  const sortedNums = Array.from(singleByNum.keys()).sort((a, b) => a - b);
  if (sortedNums.length > 0) {
    const maxTaskNum = sortedNums[sortedNums.length - 1];
    const present = new Set(sortedNums);
    let gapStart = null;
    const gaps = [];
    for (let n = 1; n <= maxTaskNum; n++) {
      if (present.has(n)) {
        if (gapStart !== null) {
          gaps.push({ start: gapStart, end: n - 1 });
          gapStart = null;
        }
      } else if (gapStart === null) {
        gapStart = n;
      }
    }
    // No trailing gap above maxTaskNum by design — the snapshot stops at the
    // newest known task.

    for (const gap of gaps) {
      const key = `${gap.start}-${gap.end}`;
      const existingRange = rangeByKey.get(key);

      const before = singleByNum.get(gap.start - 1);
      const after  = singleByNum.get(gap.end + 1);
      let createdAt;
      if (before && after) {
        createdAt = new Date((new Date(before.createdAt).getTime() + new Date(after.createdAt).getTime()) / 2);
      } else if (before) {
        createdAt = new Date(new Date(before.createdAt).getTime() + 1000);
      } else if (after) {
        createdAt = new Date(new Date(after.createdAt).getTime() - 1000);
      } else {
        createdAt = new Date();
      }
      const version = before?.version ?? after?.version ?? null;

      entries.push(
        buildEntry({
          rangeStart: gap.start,
          rangeEnd: gap.end,
          row: existingRange,
          isPlaceholder: true,
          version,
          createdAt,
        }),
      );
      // Mark this range as used so we do not double-emit below.
      rangeByKey.delete(key);
    }
  }

  // Any remaining range rows (ranges that don't correspond to a current
  // gap — e.g. a stale placeholder left behind after #192 / #193 were
  // re-merged as singles) are dropped from the snapshot. The startup
  // upsert keys by wikiSlug so dropping them here does not delete from
  // the DB; they just stop being shipped to prod.
  if (rangeByKey.size > 0) {
    console.log(`[snapshot] dropping ${rangeByKey.size} stale range row(s) that no longer correspond to gaps: ` +
      Array.from(rangeByKey.keys()).join(", "));
  }

  // ── Step 4: sort entries by leading task number so the snapshot is
  //           human-readable + diff-stable across merges ──
  function leadingNum(slug) {
    const m = slug.match(/^platform-task-(\d{3,})/);
    return m ? parseInt(m[1], 10) : 9999999;
  }
  entries.sort((a, b) => leadingNum(a.wikiSlug) - leadingNum(b.wikiSlug));

  // ── Step 5: contiguity self-check — every task number from 1 to max
  //           must be covered by either a single or a range entry ──
  const covered = new Set();
  for (const e of entries) {
    const single = e.wikiSlug.match(/^platform-task-(\d{3,})$/);
    if (single) {
      covered.add(parseInt(single[1], 10));
      continue;
    }
    const range = e.wikiSlug.match(/^platform-task-(\d{3,})-(\d{3,})$/);
    if (range) {
      const s = parseInt(range[1], 10);
      const ee = parseInt(range[2], 10);
      for (let i = s; i <= ee; i++) covered.add(i);
    }
  }
  const max = covered.size > 0 ? Math.max(...covered) : 0;
  const missing = [];
  for (let i = 1; i <= max; i++) if (!covered.has(i)) missing.push(i);
  if (missing.length > 0) {
    console.error(`[snapshot] FATAL: snapshot is not contiguous — missing task #s: ${missing.slice(0, 30).join(", ")}${missing.length > 30 ? " …" : ""}`);
    process.exit(1);
  }

  const out = "data/changelog-snapshot.json";
  mkdirSync(dirname(out), { recursive: true });
  const payload = {
    generatedAt: new Date().toISOString(),
    count: entries.length,
    coveredMin: 1,
    coveredMax: max,
    entries,
  };
  writeFileSync(out, JSON.stringify(payload, null, 2) + "\n");
  console.log(`[snapshot] wrote ${entries.length} entries (covering #1..#${max}) to ${out}`);
} catch (err) {
  console.error(`[snapshot] dump failed: ${err.message}`);
  process.exit(1);
} finally {
  await pool.end();
}
