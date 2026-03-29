#!/usr/bin/env node
/**
 * append-to-update-log.js
 *
 * Called by post-merge.sh after each task merge.
 * 1. Appends the task plan file to SEVCO_UPDATE_LOG.md (idempotent).
 * 2. Creates a structured changelog entry via the internal API.
 *
 * Usage:
 *   node scripts/append-to-update-log.js <path-to-plan-file.md>
 */

import { readFileSync, appendFileSync, existsSync } from "fs";
import { basename } from "path";
import { request } from "http";

const planFilePath = process.argv[2];

if (!planFilePath) {
  console.error("Usage: node scripts/append-to-update-log.js <path-to-task-plan.md>");
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
  return fileName.replace(/-/g, " ");
}

function extractSection(text, sectionName) {
  const regex = new RegExp(`^##\\s+${sectionName}$`, "im");
  const match = regex.exec(text);
  if (!match) return null;
  const start = match.index + match[0].length;
  const nextSection = text.slice(start).search(/^##\s/m);
  const end = nextSection === -1 ? text.length : start + nextSection;
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

const title = extractTitle(raw);
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

(async () => {
  try {
    const latestVersion = await fetchLatestVersion();
    const version = autoIncrementVersion(latestVersion);

    const result = await postChangelogEntry({ title, description, category, version });

    if (result.status >= 200 && result.status < 300) {
      const action = result.data?.action ?? "created";
      console.log(`[update-log] Changelog entry ${action}: "${title}" (${category}, v${version})`);
    } else {
      console.warn(`[update-log] Changelog API returned ${result.status}: ${JSON.stringify(result.data)}`);
    }
  } catch (err) {
    console.warn(`[update-log] Could not post changelog entry: ${err.message}`);
  }
})();
