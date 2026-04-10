import { Request, Response, NextFunction } from "express";
import { pool } from "./db";
import { renderPageHtml, renderFallbackHtml } from "./sites-renderer";

function setSecurityHeaders(res: Response) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "img-src 'self' https: data:",
      "font-src 'self' https://fonts.gstatic.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "script-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'none'",
    ].join("; ")
  );
}

export async function sevcoSitesMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const hostname = req.hostname;

  const sevcxMatch = hostname.match(/^([a-z0-9-]+)\.sev\.cx$/i);
  const slug = sevcxMatch ? sevcxMatch[1] : null;

  if (!slug) {
    return next();
  }

  try {
    const query = `
      SELECT w.*, p.content_json AS homepage_content, p.meta AS homepage_meta
      FROM user_websites w
      LEFT JOIN website_pages p ON p.website_id = w.id AND p.is_homepage = TRUE
      WHERE w.is_published = TRUE AND w.slug = $1
      LIMIT 1
    `;
    const result = await pool.query(query, [slug]);

    setSecurityHeaders(res);
    res.setHeader("Content-Type", "text/html; charset=utf-8");

    if (result.rows.length === 0) {
      res.status(404).send(renderFallbackHtml(hostname));
      return;
    }

    const site = result.rows[0];
    const pageContent =
      typeof site.homepage_content === "string"
        ? JSON.parse(site.homepage_content)
        : site.homepage_content || { blocks: [] };
    const pageMeta =
      typeof site.homepage_meta === "string"
        ? JSON.parse(site.homepage_meta)
        : site.homepage_meta || {};

    res.status(200).send(renderPageHtml(site, pageContent, pageMeta));
  } catch (err) {
    console.error("[sevcoSites] Middleware error:", err);
    setSecurityHeaders(res);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(500).send(renderFallbackHtml(hostname));
  }
}
