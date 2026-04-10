import { Router, Request, Response } from "express";
import { requireAuth } from "./middleware/permissions";
import { pool } from "./db";
import { z } from "zod";

function isPgUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as Record<string, unknown>)["code"] === "23505";
}

const router = Router();

interface AuthRequest extends Request {
  user?: { id: string; username: string; role: string };
}

const createSiteSchema = z.object({
  slug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
});

const updateSiteSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  contentJson: z.any().optional(),
  themeJson: z.any().optional(),
  customDomain: z.string().optional().nullable(),
});

const upsertPageSchema = z.object({
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  isHomepage: z.boolean().optional().default(false),
  contentJson: z.any().optional(),
  meta: z.any().optional(),
});

router.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const result = await pool.query(
      `SELECT w.*, COUNT(p.id)::int AS page_count
       FROM user_websites w
       LEFT JOIN website_pages p ON p.website_id = w.id
       WHERE w.user_id = $1
       GROUP BY w.id
       ORDER BY w.updated_at DESC`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("[sites] GET /api/sites error:", err);
    res.status(500).json({ message: "Failed to fetch sites" });
  }
});

router.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const parsed = createSiteSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0].message });
    const { slug, title, description } = parsed.data;

    const existing = await pool.query("SELECT id FROM user_websites WHERE slug = $1", [slug]);
    if (existing.rows.length > 0) return res.status(409).json({ message: "That site address is already taken" });

    const result = await pool.query(
      `INSERT INTO user_websites (user_id, slug, title, description)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [userId, slug, title, description ?? null]
    );
    const site = result.rows[0];

    await pool.query(
      `INSERT INTO website_pages (website_id, slug, is_homepage, content_json, meta)
       VALUES ($1, 'home', TRUE, $2, $3)`,
      [site.id, JSON.stringify({ blocks: [] }), JSON.stringify({ title, description: description ?? "" })]
    );

    res.status(201).json(site);
  } catch (err) {
    if (isPgUniqueViolation(err)) return res.status(409).json({ message: "That site address is already taken" });
    console.error("[sites] POST /api/sites error:", err);
    res.status(500).json({ message: "Failed to create site" });
  }
});

router.get("/by-domain/:domain", async (req: AuthRequest, res: Response) => {
  try {
    const domain = req.params.domain;
    const result = await pool.query(
      `SELECT w.*, p.content_json AS homepage_content, p.meta AS homepage_meta
       FROM user_websites w
       LEFT JOIN website_pages p ON p.website_id = w.id AND p.is_homepage = TRUE
       WHERE w.is_published = TRUE AND (w.slug = $1 OR w.custom_domain = $2)
       LIMIT 1`,
      [domain, domain]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Site not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("[sites] by-domain error:", err);
    res.status(500).json({ message: "Failed to resolve site" });
  }
});

router.get("/:slug", async (req: AuthRequest, res: Response) => {
  try {
    const site = await pool.query(
      "SELECT * FROM user_websites WHERE slug = $1",
      [req.params.slug]
    );
    if (site.rows.length === 0) return res.status(404).json({ message: "Site not found" });

    const siteRow = site.rows[0];
    const isOwner = req.user?.id === siteRow.user_id;
    if (!siteRow.is_published && !isOwner) return res.status(404).json({ message: "Site not found" });

    const pages = await pool.query(
      "SELECT * FROM website_pages WHERE website_id = $1 ORDER BY is_homepage DESC, slug ASC",
      [siteRow.id]
    );
    res.json({ ...siteRow, pages: pages.rows });
  } catch (err) {
    console.error("[sites] GET /api/sites/:slug error:", err);
    res.status(500).json({ message: "Failed to fetch site" });
  }
});

router.put("/:slug", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const parsed = updateSiteSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0].message });

    const site = await pool.query(
      "SELECT * FROM user_websites WHERE slug = $1 AND user_id = $2",
      [req.params.slug, userId]
    );
    if (site.rows.length === 0) return res.status(404).json({ message: "Site not found" });

    const { title, description, contentJson, themeJson, customDomain } = parsed.data;
    const current = site.rows[0];
    const result = await pool.query(
      `UPDATE user_websites SET
         title = $1, description = $2, content_json = $3, theme_json = $4, custom_domain = $5, updated_at = NOW()
       WHERE slug = $6 AND user_id = $7 RETURNING *`,
      [
        title ?? current.title,
        description !== undefined ? description : current.description,
        contentJson !== undefined ? JSON.stringify(contentJson) : current.content_json,
        themeJson !== undefined ? JSON.stringify(themeJson) : current.theme_json,
        customDomain !== undefined ? customDomain : current.custom_domain,
        req.params.slug,
        userId,
      ]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("[sites] PUT /api/sites/:slug error:", err);
    res.status(500).json({ message: "Failed to update site" });
  }
});

router.delete("/:slug", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const result = await pool.query(
      "DELETE FROM user_websites WHERE slug = $1 AND user_id = $2 RETURNING id",
      [req.params.slug, userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Site not found" });
    res.json({ message: "Site deleted" });
  } catch (err) {
    console.error("[sites] DELETE /api/sites/:slug error:", err);
    res.status(500).json({ message: "Failed to delete site" });
  }
});

router.post("/:slug/publish", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const site = await pool.query(
      "SELECT * FROM user_websites WHERE slug = $1 AND user_id = $2",
      [req.params.slug, userId]
    );
    if (site.rows.length === 0) return res.status(404).json({ message: "Site not found" });

    const newPublishedState = !site.rows[0].is_published;
    const result = await pool.query(
      "UPDATE user_websites SET is_published = $1, updated_at = NOW() WHERE slug = $2 AND user_id = $3 RETURNING *",
      [newPublishedState, req.params.slug, userId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("[sites] POST publish error:", err);
    res.status(500).json({ message: "Failed to update publish state" });
  }
});

router.post("/:slug/pages", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const parsed = upsertPageSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0].message });

    const site = await pool.query(
      "SELECT * FROM user_websites WHERE slug = $1 AND user_id = $2",
      [req.params.slug, userId]
    );
    if (site.rows.length === 0) return res.status(404).json({ message: "Site not found" });
    const websiteId = site.rows[0].id;

    const { slug: pageSlug, isHomepage, contentJson, meta } = parsed.data;
    if (isHomepage) {
      await pool.query("UPDATE website_pages SET is_homepage = FALSE WHERE website_id = $1", [websiteId]);
    }
    const result = await pool.query(
      `INSERT INTO website_pages (website_id, slug, is_homepage, content_json, meta)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (website_id, slug) DO UPDATE
         SET content_json = EXCLUDED.content_json, meta = EXCLUDED.meta, is_homepage = EXCLUDED.is_homepage
       RETURNING *`,
      [websiteId, pageSlug, isHomepage ?? false, JSON.stringify(contentJson ?? { blocks: [] }), JSON.stringify(meta ?? {})]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("[sites] POST page error:", err);
    res.status(500).json({ message: "Failed to create page" });
  }
});

router.put("/:slug/pages/:pageSlug", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const parsed = upsertPageSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0].message });

    const site = await pool.query(
      "SELECT * FROM user_websites WHERE slug = $1 AND user_id = $2",
      [req.params.slug, userId]
    );
    if (site.rows.length === 0) return res.status(404).json({ message: "Site not found" });
    const websiteId = site.rows[0].id;

    const page = await pool.query(
      "SELECT * FROM website_pages WHERE website_id = $1 AND slug = $2",
      [websiteId, req.params.pageSlug]
    );
    if (page.rows.length === 0) return res.status(404).json({ message: "Page not found" });
    const current = page.rows[0];

    const { isHomepage, contentJson, meta } = parsed.data;
    if (isHomepage) {
      await pool.query("UPDATE website_pages SET is_homepage = FALSE WHERE website_id = $1", [websiteId]);
    }
    const result = await pool.query(
      `UPDATE website_pages SET
         is_homepage = $1, content_json = $2, meta = $3
       WHERE website_id = $4 AND slug = $5 RETURNING *`,
      [
        isHomepage !== undefined ? isHomepage : current.is_homepage,
        contentJson !== undefined ? JSON.stringify(contentJson) : current.content_json,
        meta !== undefined ? JSON.stringify(meta) : current.meta,
        websiteId,
        req.params.pageSlug,
      ]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("[sites] PUT page error:", err);
    res.status(500).json({ message: "Failed to update page" });
  }
});

router.delete("/:slug/pages/:pageSlug", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const site = await pool.query(
      "SELECT id FROM user_websites WHERE slug = $1 AND user_id = $2",
      [req.params.slug, userId]
    );
    if (site.rows.length === 0) return res.status(404).json({ message: "Site not found" });

    const page = await pool.query(
      "SELECT is_homepage FROM website_pages WHERE website_id = $1 AND slug = $2",
      [site.rows[0].id, req.params.pageSlug]
    );
    if (page.rows.length === 0) return res.status(404).json({ message: "Page not found" });
    if (page.rows[0].is_homepage) return res.status(400).json({ message: "Cannot delete the homepage" });

    await pool.query(
      "DELETE FROM website_pages WHERE website_id = $1 AND slug = $2",
      [site.rows[0].id, req.params.pageSlug]
    );
    res.json({ message: "Page deleted" });
  } catch (err) {
    console.error("[sites] DELETE page error:", err);
    res.status(500).json({ message: "Failed to delete page" });
  }
});

export { router as sitesRouter };
