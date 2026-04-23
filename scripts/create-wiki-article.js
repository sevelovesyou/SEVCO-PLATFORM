#!/usr/bin/env node
/**
 * create-wiki-article.js
 *
 * Called by post-merge.sh (with || true) after each task merge.
 * Appends to a feature wiki article if a feature-mapping keyword matches,
 * or creates/updates a standalone article in the sevco-platform category.
 *
 * Task #552 — Rewrote HTTP calls to localhost:5000 as direct DB writes so the
 * script succeeds at merge time when the Express server is not running.
 */

import { readFileSync } from "fs";
import { basename, dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const { Pool } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));

const planFilePath = process.argv[2];

if (!planFilePath) {
  console.error("Usage: node scripts/create-wiki-article.js <path-to-task-plan.md>");
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("Error: DATABASE_URL environment variable is not set.");
  process.exit(1);
}

let raw;
try {
  raw = readFileSync(planFilePath, "utf8");
} catch (err) {
  console.error(`Error reading file ${planFilePath}: ${err.message}`);
  process.exit(1);
}

// Load feature mapping
let featureMapping = { mappings: [] };
try {
  const mappingRaw = readFileSync(`${__dirname}/feature-mapping.json`, "utf8");
  featureMapping = JSON.parse(mappingRaw);
} catch (err) {
  console.warn("Warning: Could not load feature-mapping.json:", err.message);
}

function parsePlanFile(text) {
  const lines = text.split("\n");

  let title = "";
  for (const line of lines) {
    const match = line.match(/^#\s+(.+)/);
    if (match) {
      title = match[1].trim();
      break;
    }
  }

  if (!title) {
    const frontmatterMatch = text.match(/^---[\s\S]*?title:\s*(.+?)[\s\S]*?---/m);
    if (frontmatterMatch) {
      title = frontmatterMatch[1].trim();
    }
  }

  if (!title) {
    title = basename(planFilePath, ".md").replace(/-/g, " ");
  }

  const sectionRegex = /^##\s+(.+)$/gm;
  const sections = {};
  let match;
  const sectionPositions = [];

  while ((match = sectionRegex.exec(text)) !== null) {
    sectionPositions.push({ name: match[1].trim(), start: match.index + match[0].length });
  }

  for (let i = 0; i < sectionPositions.length; i++) {
    const s = sectionPositions[i];
    const end =
      i + 1 < sectionPositions.length
        ? sectionPositions[i + 1].start - sectionPositions[i + 1].name.length - 4
        : text.length;
    sections[s.name] = text.slice(s.start, end).trim();
  }

  const summary = sections["What & Why"]
    ? sections["What & Why"].split("\n")[0].trim()
    : `Platform update: ${title}`;

  return { title, sections, summary };
}

function extractTaskNumber(title) {
  const match = title.match(/task\s*#?(\d+)/i) || title.match(/#(\d+)/);
  return match ? match[1] : null;
}

function findFeatureSlug(title, content) {
  const searchText = (title + " " + content).toLowerCase();
  for (const mapping of featureMapping.mappings) {
    for (const keyword of mapping.keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        return mapping.slug;
      }
    }
  }
  return null;
}

function buildAppendSection(title, taskNumber, summary, sections) {
  const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const taskLabel = taskNumber ? `Task #${taskNumber} — ` : "";

  let section = `\n\n## ${taskLabel}${title}\n`;
  section += `_Completed: ${date}_\n\n`;

  if (summary) {
    section += `${summary}\n`;
  }

  if (sections["Done looks like"]) {
    const done = sections["Done looks like"].split("\n").slice(0, 3).join("\n").trim();
    if (done) {
      section += `\n**What changed:** ${done}\n`;
    }
  }

  return section;
}

function deriveSlug(t) {
  return t
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

const { title, sections, summary } = parsePlanFile(raw);
const taskNumber = extractTaskNumber(title);
const featureSlug = findFeatureSlug(title, raw);

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

try {
  if (featureSlug) {
    // Append a section to the existing feature article
    console.log(`Appending to feature article "${featureSlug}" for: "${title}"`);
    const appendSection = buildAppendSection(title, taskNumber, summary, sections);

    const { rows } = await pool.query(
      "SELECT id, content FROM articles WHERE slug = $1 LIMIT 1",
      [featureSlug]
    );
    if (rows.length === 0) {
      console.error(`Feature article not found: ${featureSlug}`);
    } else {
      const newContent = (rows[0].content || "") + appendSection;
      await pool.query(
        "UPDATE articles SET content = $1, updated_at = NOW() WHERE id = $2",
        [newContent, rows[0].id]
      );
      await pool.query(
        `INSERT INTO revisions (article_id, content, summary, edit_summary, status, author_name)
         VALUES ($1, $2, $3, $4, 'approved', 'Peter')`,
        [rows[0].id, newContent, summary, "Auto-appended by post-merge script on merge"]
      );
      console.log(`Successfully appended update to: ${featureSlug}`);
    }
  } else {
    // No feature match — create/update a standalone article in sevco-platform
    console.log(`No feature match found. Creating standalone article for: "${title}"`);

    const slug = deriveSlug(title);
    const bodyParts = [`# ${title}\n`];
    const orderedSections = ["What & Why", "Done looks like", "Out of scope", "Tasks", "Relevant files", "Origin / Request"];
    for (const sName of orderedSections) {
      if (sections[sName]) bodyParts.push(`## ${sName}\n\n${sections[sName]}\n`);
    }
    for (const sName of Object.keys(sections)) {
      if (!orderedSections.includes(sName)) bodyParts.push(`## ${sName}\n\n${sections[sName]}\n`);
    }
    const content = bodyParts.join("\n");

    // Find category
    let categoryId = null;
    for (const trySlug of ["sevco-platform", "engineering"]) {
      const { rows: catRows } = await pool.query(
        "SELECT id FROM categories WHERE slug = $1 LIMIT 1",
        [trySlug]
      );
      if (catRows.length > 0) {
        categoryId = catRows[0].id;
        break;
      }
    }

    const { rows: existing } = await pool.query(
      "SELECT id FROM articles WHERE slug = $1 LIMIT 1",
      [slug]
    );

    let articleId;
    if (existing.length > 0) {
      const { rows: updated } = await pool.query(
        "UPDATE articles SET title = $1, summary = $2, content = $3, tags = $4, status = 'published', updated_at = NOW() WHERE id = $5 RETURNING id",
        [title, summary, content, ["platform", "update"], existing[0].id]
      );
      articleId = updated[0].id;
      console.log(`Wiki article updated successfully: ${slug}`);
    } else {
      let inserted;
      if (categoryId) {
        const { rows } = await pool.query(
          "INSERT INTO articles (title, slug, content, summary, category_id, status, tags) VALUES ($1, $2, $3, $4, $5, 'published', $6) RETURNING id",
          [title, slug, content, summary, categoryId, ["platform", "update"]]
        );
        inserted = rows;
      } else {
        const { rows } = await pool.query(
          "INSERT INTO articles (title, slug, content, summary, status, tags) VALUES ($1, $2, $3, $4, 'published', $5) RETURNING id",
          [title, slug, content, summary, ["platform", "update"]]
        );
        inserted = rows;
      }
      articleId = inserted[0].id;
      console.log(`Wiki article created successfully: ${slug}`);
    }
    await pool.query(
      `INSERT INTO revisions (article_id, content, summary, edit_summary, status, author_name)
       VALUES ($1, $2, $3, $4, 'approved', 'Peter')`,
      [articleId, content, summary, "Auto-generated by post-merge script on merge"]
    );
  }
} catch (err) {
  console.error(`Error writing wiki article: ${err.message}`);
  process.exit(1);
} finally {
  await pool.end();
}
