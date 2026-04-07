#!/usr/bin/env node
import { readFileSync } from "fs";
import { basename, dirname } from "path";
import { fileURLToPath } from "url";
import { request } from "http";

const __dirname = dirname(fileURLToPath(import.meta.url));

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

const { title, sections, summary } = parsePlanFile(raw);
const taskNumber = extractTaskNumber(title);
const featureSlug = findFeatureSlug(title, raw);

function postRequest(path, payload, cb) {
  const data = JSON.stringify(payload);
  const options = {
    hostname: "localhost",
    port: 5000,
    path,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(data),
      "x-internal-secret": secret,
    },
  };

  const req = request(options, (res) => {
    let body = "";
    res.on("data", (chunk) => { body += chunk; });
    res.on("end", () => cb(null, res.statusCode, body));
  });
  req.on("error", (err) => cb(err));
  req.write(data);
  req.end();
}

if (featureSlug) {
  // Append a section to the existing feature article
  console.log(`Appending to feature article "${featureSlug}" for: "${title}"`);
  const appendSection = buildAppendSection(title, taskNumber, summary, sections);

  postRequest("/api/internal/wiki-article/append", { featureSlug, appendSection }, (err, status, body) => {
    if (err) {
      console.error(`Error calling append endpoint: ${err.message}`);
      process.exit(0);
    }
    if (status >= 200 && status < 300) {
      console.log(`Successfully appended update to: ${featureSlug}`);
      process.exit(0);
    } else {
      console.error(`Append returned HTTP ${status}: ${body}`);
      process.exit(0);
    }
  });
} else {
  // No feature match — create/update a standalone article in SEVCO Platform subcategory
  console.log(`No feature match found. Creating standalone article for: "${title}"`);

  function deriveSlug(t) {
    return t
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 80);
  }

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

  postRequest(
    "/api/internal/wiki-article",
    { title, slug, summary, content, tags: ["platform", "update"], categorySlug: "sevco-platform" },
    (err, status, body) => {
      if (err) {
        console.error(`Error creating wiki article: ${err.message}`);
        process.exit(0);
      }
      if (status >= 200 && status < 300) {
        try {
          const result = JSON.parse(body);
          console.log(`Wiki article ${result.action} successfully: ${result.article?.slug}`);
        } catch {
          console.log("Wiki article operation succeeded.");
        }
        process.exit(0);
      } else {
        console.error(`Failed to create wiki article. HTTP ${status}: ${body}`);
        process.exit(0);
      }
    }
  );
}
