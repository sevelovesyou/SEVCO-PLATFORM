#!/usr/bin/env node
import { readFileSync } from "fs";
import { basename } from "path";
import { request } from "http";

const planFilePath = process.argv[2];

if (!planFilePath) {
  console.error("Usage: node scripts/create-wiki-article.js <path-to-task-plan.md>");
  process.exit(1);
}

const secret = process.env.WIKI_AUTO_ARTICLE_SECRET;
if (!secret) {
  console.error("Error: WIKI_AUTO_ARTICLE_SECRET environment variable is not set.");
  process.exit(1);
}

let raw;
try {
  raw = readFileSync(planFilePath, "utf8");
} catch (err) {
  console.error(`Error reading file ${planFilePath}: ${err.message}`);
  process.exit(1);
}

function deriveSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
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

  const slug = deriveSlug(title);

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
    : `Engineering wiki article for: ${title}`;

  const bodyParts = [];

  bodyParts.push(`# ${title}\n`);

  const orderedSections = [
    "What & Why",
    "Done looks like",
    "Out of scope",
    "Tasks",
    "Relevant files",
    "Origin / Request",
  ];

  for (const sName of orderedSections) {
    if (sections[sName]) {
      bodyParts.push(`## ${sName}\n\n${sections[sName]}\n`);
    }
  }

  for (const sName of Object.keys(sections)) {
    if (!orderedSections.includes(sName)) {
      bodyParts.push(`## ${sName}\n\n${sections[sName]}\n`);
    }
  }

  const content = bodyParts.join("\n");

  const tags = ["engineering", "auto-generated"];
  if (sections["What & Why"]) {
    const words = sections["What & Why"]
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 4)
      .slice(0, 5);
    tags.push(...words);
  }

  return { title, slug, summary, content, tags: [...new Set(tags)] };
}

const articleData = parsePlanFile(raw);

console.log(`Creating wiki article: "${articleData.title}" (slug: ${articleData.slug})`);

const payload = JSON.stringify(articleData);

const options = {
  hostname: "localhost",
  port: 5000,
  path: "/api/internal/wiki-article",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(payload),
    "x-internal-secret": secret,
  },
};

const req = request(options, (res) => {
  let body = "";
  res.on("data", (chunk) => { body += chunk; });
  res.on("end", () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      try {
        const result = JSON.parse(body);
        console.log(`Wiki article ${result.action} successfully: ${result.article?.slug}`);
      } catch {
        console.log("Wiki article operation succeeded.");
      }
      process.exit(0);
    } else {
      console.error(`Failed to create/update wiki article. HTTP ${res.statusCode}: ${body}`);
      process.exit(1);
    }
  });
});

req.on("error", (err) => {
  console.error(`Error posting to wiki API: ${err.message}`);
  process.exit(1);
});

req.write(payload);
req.end();
