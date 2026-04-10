import { Router, Request, Response } from "express";
import { requireAuth } from "./middleware/permissions";
import { pool } from "./db";
import { z } from "zod";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
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

    const inputJson = JSON.stringify({ prompt });

    let stdout: string;
    try {
      const result = await execFileAsync(
        "infsh",
        ["app", "run", "falai/flux-dev-lora", "--input", inputJson, "--json"],
        { timeout: 120000, maxBuffer: 10 * 1024 * 1024 }
      );
      stdout = result.stdout;
    } catch (execErr: unknown) {
      console.error("[canvas] AI generate exec error:", execErr);
      return res.status(500).json({ message: "AI image generation failed. Please try again." });
    }

    let imageUrl: string | null = null;
    try {
      const data = JSON.parse(stdout);
      imageUrl = data?.output?.images?.[0]?.url
        ?? data?.output?.image_url
        ?? data?.output?.url
        ?? data?.images?.[0]?.url
        ?? data?.url
        ?? null;

      if (!imageUrl && typeof data?.output === "string" && data.output.startsWith("http")) {
        imageUrl = data.output;
      }

      if (!imageUrl) {
        const urlMatch = stdout.match(/https?:\/\/[^\s"']+\.(png|jpg|jpeg|webp)/i);
        if (urlMatch) imageUrl = urlMatch[0];
      }
    } catch {
      const urlMatch = stdout.match(/https?:\/\/[^\s"']+\.(png|jpg|jpeg|webp)/i);
      if (urlMatch) imageUrl = urlMatch[0];
    }

    if (!imageUrl) {
      console.error("[canvas] Could not extract image URL from output:", stdout.slice(0, 500));
      return res.status(500).json({ message: "AI generation completed but no image URL was returned." });
    }

    res.json({ imageUrl });
  } catch (err) {
    console.error("[canvas] POST /api/canvas/ai-generate error:", err);
    res.status(500).json({ message: "AI image generation failed" });
  }
});

export { router as canvasRouter };
