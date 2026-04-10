function sanitizeCssValue(value: string): string {
  return String(value).replace(/[<>"'`\\{}()\n\r]/g, "");
}

const FONT_FAMILY_MAP: Record<string, string> = {
  system: "system-ui, -apple-system, sans-serif",
  "system-ui": "system-ui, -apple-system, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  mono: "ui-monospace, 'Cascadia Code', 'Fira Code', monospace",
  monospace: "ui-monospace, 'Cascadia Code', 'Fira Code', monospace",
  rounded: "'Nunito', 'Varela Round', system-ui, sans-serif",
};

function resolveFontFamily(raw: string): string {
  const key = (raw || "").toLowerCase().trim();
  return FONT_FAMILY_MAP[key] || "system-ui, -apple-system, sans-serif";
}

function renderBlock(block: any): string {
  if (!block || !block.type) return "";
  const escape = (s: string) =>
    String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  switch (block.type) {
    case "hero":
      return `<section class="sevco-hero" style="padding:6rem 2rem;text-align:center;background:${sanitizeCssValue(block.bgColor || "#111")};color:${sanitizeCssValue(block.color || "#fff")}">
        <h1 style="font-size:3rem;font-weight:800;margin:0 0 1rem">${escape(block.heading || "")}</h1>
        ${block.subheading ? `<p style="font-size:1.25rem;opacity:.8;margin:0 0 2rem">${escape(block.subheading)}</p>` : ""}
        ${block.ctaText ? `<a href="${escape(block.ctaHref || "#")}" style="display:inline-block;padding:.75rem 2rem;background:#fff;color:#111;border-radius:8px;font-weight:700;text-decoration:none">${escape(block.ctaText)}</a>` : ""}
      </section>`;
    case "text":
      return `<section class="sevco-text" style="padding:4rem 2rem;max-width:800px;margin:0 auto">
        ${block.heading ? `<h2 style="font-size:2rem;font-weight:700;margin:0 0 1rem">${escape(block.heading)}</h2>` : ""}
        <div style="font-size:1.1rem;line-height:1.7;color:#374151">${escape(block.body || "").replace(/\n/g, "<br>")}</div>
      </section>`;
    case "gallery":
      return `<section class="sevco-gallery" style="padding:4rem 2rem">
        ${block.heading ? `<h2 style="text-align:center;font-size:2rem;font-weight:700;margin:0 0 2rem">${escape(block.heading)}</h2>` : ""}
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1.5rem;max-width:1200px;margin:0 auto">
          ${(block.images || [])
            .map(
              (img: any) => `<div style="border-radius:12px;overflow:hidden;background:#f3f4f6">
            <img src="${escape(img.url || "")}" alt="${escape(img.alt || "")}" style="width:100%;height:220px;object-fit:cover">
            ${img.caption ? `<p style="padding:.75rem 1rem;margin:0;font-size:.9rem;color:#6b7280">${escape(img.caption)}</p>` : ""}
          </div>`
            )
            .join("")}
        </div>
      </section>`;
    case "contact":
      return `<section class="sevco-contact" style="padding:4rem 2rem;text-align:center">
        ${block.heading ? `<h2 style="font-size:2rem;font-weight:700;margin:0 0 1rem">${escape(block.heading)}</h2>` : ""}
        ${block.email ? `<p><a href="mailto:${escape(block.email)}" style="color:#3b82f6;font-size:1.1rem">${escape(block.email)}</a></p>` : ""}
        ${block.body ? `<p style="color:#6b7280;margin-top:.5rem">${escape(block.body)}</p>` : ""}
      </section>`;
    case "embed":
      return `<section class="sevco-embed" style="padding:2rem;text-align:center;background:#f9fafb;border-radius:12px;margin:2rem">
        <p style="color:#9ca3af;font-size:.9rem">Embedded content</p>
      </section>`;
    case "divider":
      return `<hr style="border:none;border-top:1px solid #e5e7eb;margin:2rem auto;max-width:800px">`;
    default:
      return "";
  }
}

export function renderPageHtml(site: any, pageContentJson: any, meta: any): string {
  const escapeAttr = (s: string) =>
    String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const title = escapeAttr(meta?.title || site.title || "");
  const description = escapeAttr(meta?.description || site.description || "");
  const blocks: any[] = pageContentJson?.blocks || [];
  const bodyContent = blocks.map(renderBlock).join("\n");

  const theme = site.theme_json || {};
  const primaryColor = sanitizeCssValue(theme.primaryColor || "#3b82f6");
  const fontFamily = resolveFontFamily(theme.fontFamily || "system");
  const bgColor = sanitizeCssValue(theme.bgColor || "#ffffff");
  const textColor = sanitizeCssValue(theme.textColor || "#111827");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:type" content="website">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: ${fontFamily};
      background: ${bgColor};
      color: ${textColor};
      line-height: 1.6;
    }
    a { color: ${primaryColor}; }
    img { max-width: 100%; height: auto; display: block; }
    .sevco-footer {
      padding: 1.5rem 2rem;
      text-align: center;
      border-top: 1px solid #e5e7eb;
      font-size: .8rem;
      color: #9ca3af;
    }
    .sevco-footer a { color: inherit; text-decoration: underline; }
  </style>
</head>
<body>
${bodyContent}
<footer class="sevco-footer">
  Built with <a href="https://sevco.us/sites" target="_blank" rel="noopener">SEVCO Sites</a>
</footer>
</body>
</html>`;
}

export function renderFallbackHtml(hostname: string): string {
  const escapeHtml = (s: string) =>
    String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Site Not Found — SEVCO Sites</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0a0a0a; color: #f5f5f5;
           display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { text-align: center; max-width: 480px; padding: 3rem 2rem; }
    h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: .5rem; }
    p { color: #9ca3af; margin-bottom: 2rem; }
    a { display: inline-block; padding: .6rem 1.5rem; background: #3b82f6; color: #fff;
        border-radius: 8px; text-decoration: none; font-weight: 600; }
    .badge { font-size: .75rem; color: #6b7280; margin-top: 2rem; }
    .badge span { color: #3b82f6; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Site not found</h1>
    <p>There's no published site at <strong>${escapeHtml(hostname)}</strong>.</p>
    <a href="https://sevco.us/sites">Build your own on SEVCO Sites</a>
    <p class="badge">This site is powered by <span>SEVCO Sites</span> · Built on sev.cx</p>
  </div>
</body>
</html>`;
}
