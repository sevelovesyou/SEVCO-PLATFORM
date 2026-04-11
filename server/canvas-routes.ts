import { Router, Request, Response } from "express";
import { requireAuth } from "./middleware/permissions";
import { pool } from "./db";
import { z } from "zod";

const router = Router();

interface AuthRequest extends Request {
  user?: { id: string; username: string; role: string };
}

const createProjectSchema = z.object({
  name: z.string().min(1).max(255).default("Untitled Project"),
  tldrawJson: z.record(z.string(), z.unknown()).optional(),
  thumbnailUrl: z.string().optional().nullable(),
});

const updateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  tldrawJson: z.record(z.string(), z.unknown()).optional(),
  thumbnailUrl: z.string().optional().nullable(),
});

router.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const result = await pool.query(
      `SELECT id, user_id, name, thumbnail_url, created_at, updated_at
       FROM canvas_projects
       WHERE user_id = $1
       ORDER BY updated_at DESC`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("[canvas] GET /api/canvas error:", err);
    res.status(500).json({ message: "Failed to fetch canvas projects" });
  }
});

router.get("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });

    const result = await pool.query(
      `SELECT * FROM canvas_projects WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Project not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("[canvas] GET /api/canvas/:id error:", err);
    res.status(500).json({ message: "Failed to fetch project" });
  }
});

router.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const parsed = createProjectSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0].message });
    const { name, tldrawJson, thumbnailUrl } = parsed.data;

    const result = await pool.query(
      `INSERT INTO canvas_projects (user_id, name, tldraw_json, thumbnail_url)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [userId, name, tldrawJson ? JSON.stringify(tldrawJson) : null, thumbnailUrl ?? null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("[canvas] POST /api/canvas error:", err);
    res.status(500).json({ message: "Failed to create project" });
  }
});

router.put("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });

    const parsed = updateProjectSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0].message });

    const existing = await pool.query(
      `SELECT * FROM canvas_projects WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    if (existing.rows.length === 0) return res.status(404).json({ message: "Project not found" });

    const current = existing.rows[0];
    const { name, tldrawJson, thumbnailUrl } = parsed.data;

    const result = await pool.query(
      `UPDATE canvas_projects
       SET name = $1, tldraw_json = $2, thumbnail_url = $3, updated_at = NOW()
       WHERE id = $4 AND user_id = $5 RETURNING *`,
      [
        name ?? current.name,
        tldrawJson !== undefined ? JSON.stringify(tldrawJson) : current.tldraw_json,
        thumbnailUrl !== undefined ? thumbnailUrl : current.thumbnail_url,
        id,
        userId,
      ]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("[canvas] PUT /api/canvas/:id error:", err);
    res.status(500).json({ message: "Failed to update project" });
  }
});

router.delete("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });

    const result = await pool.query(
      `DELETE FROM canvas_projects WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Project not found" });
    res.json({ message: "Project deleted" });
  } catch (err) {
    console.error("[canvas] DELETE /api/canvas/:id error:", err);
    res.status(500).json({ message: "Failed to delete project" });
  }
});

const aiGenerateSchema = z.object({
  prompt: z.string().min(1).max(1000),
});

router.post("/ai-generate", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const parsed = aiGenerateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0].message });
    const { prompt } = parsed.data;

    const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
    if (!OPENROUTER_KEY) {
      return res.status(503).json({ message: "AI image generation is not configured." });
    }

    const response = await fetch("https://openrouter.ai/api/v1/images/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://sevco.us",
        "X-Title": "SEVCO Canvas",
      },
      body: JSON.stringify({
        model: "black-forest-labs/flux-schnell",
        prompt: prompt,
        n: 1,
        size: "1024x1024",
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[canvas] OpenRouter image generation error:", response.status, errText);
      return res.status(500).json({ message: "AI image generation failed. Please try again." });
    }

    const data = await response.json();
    const imageUrl =
      data?.data?.[0]?.url ??
      (data?.data?.[0]?.b64_json ? `data:image/png;base64,${data.data[0].b64_json}` : null);

    if (!imageUrl) {
      return res.status(500).json({ message: "AI generation returned no image." });
    }

    res.json({ imageUrl });
  } catch (err) {
    console.error("[canvas] POST /api/canvas/ai-generate error:", err);
    res.status(500).json({ message: "AI image generation failed" });
  }
});

export { router as canvasRouter };
