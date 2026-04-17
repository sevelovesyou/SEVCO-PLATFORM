import { Router, Request } from "express";
import { requireAuth } from "./middleware/permissions";
import { pool } from "./db";
import { storage } from "./storage";
import { z } from "zod";

const router = Router();

interface AuthRequest extends Request {
  user?: { id: string; username: string };
}

const CANONICAL_PLANETS = [
  { name: "Verdania", seed: 42, type: "verdania", size: 200 },
  { name: "Cratera", seed: 137, type: "desert", size: 150 },
  { name: "Glacius", seed: 256, type: "ice", size: 180 },
  { name: "Xenara", seed: 789, type: "alien", size: 160 },
];

interface PlanetRow {
  id: number;
  name: string;
  seed: number;
  type: string;
  size: number;
  owner_user_id: string | null;
}

interface ProgressRow {
  user_id: string;
  current_planet_id: number | null;
  sparks_spent: number;
  unlocked_sphere: boolean;
  inventory: Record<string, number>;
  discovered_planet_ids: string[] | null;
}

function mapProgress(r: ProgressRow) {
  return {
    userId: r.user_id,
    currentPlanetId: r.current_planet_id,
    sparksSpent: r.sparks_spent,
    unlockedSphere: r.unlocked_sphere,
    inventory: r.inventory,
    discoveredPlanetIds: Array.isArray(r.discovered_planet_ids) ? r.discovered_planet_ids : [],
  };
}

async function ensurePlanetsSeeded(): Promise<{ id: number; name: string; seed: number; type: string; size: number; ownerUserId: string | null }[]> {
  // Always seed and return exactly the four canonical planets in order
  const result: { id: number; name: string; seed: number; type: string; size: number; ownerUserId: string | null }[] = [];
  for (const p of CANONICAL_PLANETS) {
    const existing = await pool.query<PlanetRow>(`SELECT * FROM galaxy_planets WHERE name = $1`, [p.name]);
    if (existing.rows.length > 0) {
      const r = existing.rows[0];
      if (r.type !== p.type || r.seed !== p.seed || r.size !== p.size) {
        await pool.query(`UPDATE galaxy_planets SET type = $1, seed = $2, size = $3 WHERE id = $4`, [p.type, p.seed, p.size, r.id]);
      }
      result.push({ id: r.id, name: r.name, seed: p.seed, type: p.type, size: p.size, ownerUserId: r.owner_user_id });
    } else {
      const ins = await pool.query<PlanetRow>(
        `INSERT INTO galaxy_planets (name, seed, type, size) VALUES ($1, $2, $3, $4) RETURNING *`,
        [p.name, p.seed, p.type, p.size]
      );
      if (ins.rows.length > 0) {
        const r = ins.rows[0];
        result.push({ id: r.id, name: r.name, seed: r.seed, type: r.type, size: r.size, ownerUserId: r.owner_user_id });
      }
    }
  }
  return result;
}

router.get("/planets", requireAuth, async (req, res) => {
  try {
    const planets = await ensurePlanetsSeeded();
    res.json(planets);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

router.get("/progress", requireAuth, async (req, res) => {
  try {
    const userId = (req as AuthRequest).user!.id;
    const planets = await ensurePlanetsSeeded();
    const existing = await pool.query<ProgressRow>(`SELECT * FROM user_galaxy_progress WHERE user_id = $1`, [userId]);
    if (existing.rows.length === 0) {
      const defaultPlanetId = planets[0]?.id ?? null;
      await pool.query(
        `INSERT INTO user_galaxy_progress (user_id, current_planet_id, sparks_spent, unlocked_sphere, inventory)
         VALUES ($1, $2, 0, false, '{}') ON CONFLICT (user_id) DO NOTHING`,
        [userId, defaultPlanetId]
      );
      const fresh = await pool.query<ProgressRow>(`SELECT * FROM user_galaxy_progress WHERE user_id = $1`, [userId]);
      return res.json(mapProgress(fresh.rows[0]));
    }
    res.json(mapProgress(existing.rows[0]));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

const patchProgressSchema = z.object({
  currentPlanetId: z.number().int().nullable().optional(),
  inventory: z.record(z.number()).optional(),
  sparksSpent: z.number().int().min(0).optional(),
  discoveredPlanetIds: z.array(z.string().min(1).max(64)).max(256).optional(),
});

router.patch("/progress", requireAuth, async (req, res) => {
  try {
    const userId = (req as AuthRequest).user!.id;
    const parsed = patchProgressSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const { currentPlanetId, inventory, sparksSpent, discoveredPlanetIds } = parsed.data;

    // Ensure progress row exists (upsert-safe)
    const planets = await ensurePlanetsSeeded();
    await pool.query(
      `INSERT INTO user_galaxy_progress (user_id, current_planet_id, sparks_spent, unlocked_sphere, inventory)
       VALUES ($1, $2, 0, false, '{}') ON CONFLICT (user_id) DO NOTHING`,
      [userId, planets[0]?.id ?? null]
    );

    const updates: string[] = [];
    const values: (string | number | boolean | null | string[])[] = [userId];

    if (currentPlanetId !== undefined) {
      updates.push(`current_planet_id = $${values.length + 1}`);
      values.push(currentPlanetId);
    }

    if (inventory !== undefined) {
      updates.push(`inventory = $${values.length + 1}`);
      values.push(JSON.stringify(inventory));
    }

    if (sparksSpent !== undefined) {
      updates.push(`sparks_spent = $${values.length + 1}`);
      values.push(sparksSpent);
    }

    if (discoveredPlanetIds !== undefined) {
      // Merge with existing so discoveries are additive (never lost on partial updates)
      const existing = await pool.query<ProgressRow>(`SELECT discovered_planet_ids FROM user_galaxy_progress WHERE user_id = $1`, [userId]);
      const existingIds: string[] = Array.isArray(existing.rows[0]?.discovered_planet_ids) ? existing.rows[0].discovered_planet_ids : [];
      const merged = Array.from(new Set([...existingIds, ...discoveredPlanetIds]));
      updates.push(`discovered_planet_ids = $${values.length + 1}`);
      values.push(merged);
    }

    if (updates.length === 0) return res.json({ message: "no changes" });
    await pool.query(`UPDATE user_galaxy_progress SET ${updates.join(", ")} WHERE user_id = $1`, values);
    const fresh = await pool.query<ProgressRow>(`SELECT * FROM user_galaxy_progress WHERE user_id = $1`, [userId]);
    res.json(mapProgress(fresh.rows[0]));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

interface BuildRow {
  chunk_x: number;
  chunk_y: number;
  chunk_z: number;
  voxel_data: Record<string, number>;
}

router.get("/builds/:planetId", requireAuth, async (req, res) => {
  try {
    const userId = (req as AuthRequest).user!.id;
    const planetId = parseInt(req.params.planetId, 10);
    if (isNaN(planetId)) return res.status(400).json({ message: "Invalid planetId" });
    const result = await pool.query<BuildRow>(
      `SELECT chunk_x, chunk_y, chunk_z, voxel_data FROM user_voxel_builds WHERE user_id = $1 AND planet_id = $2`,
      [userId, planetId]
    );
    res.json(result.rows.map((r) => ({
      chunkX: r.chunk_x,
      chunkY: r.chunk_y,
      chunkZ: r.chunk_z,
      voxelData: r.voxel_data,
    })));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

const upsertBuildSchema = z.object({
  chunkX: z.number().int(),
  chunkY: z.number().int(),
  chunkZ: z.number().int(),
  voxelData: z.record(z.number()),
});

router.post("/builds/:planetId", requireAuth, async (req, res) => {
  try {
    const userId = (req as AuthRequest).user!.id;
    const planetId = parseInt(req.params.planetId, 10);
    if (isNaN(planetId)) return res.status(400).json({ message: "Invalid planetId" });
    const parsed = upsertBuildSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const { chunkX, chunkY, chunkZ, voxelData } = parsed.data;
    await pool.query(
      `INSERT INTO user_voxel_builds (user_id, planet_id, chunk_x, chunk_y, chunk_z, voxel_data)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, planet_id, chunk_x, chunk_y, chunk_z)
       DO UPDATE SET voxel_data = user_voxel_builds.voxel_data::jsonb || EXCLUDED.voxel_data::jsonb`,
      [userId, planetId, chunkX, chunkY, chunkZ, JSON.stringify(voxelData)]
    );
    res.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

const SPHERE_COST = 500;

const SPHERE_CRYSTAL_COST = 20;

router.post("/unlock-sphere", requireAuth, async (req, res) => {
  try {
    const userId = (req as AuthRequest).user!.id;
    const progressRes = await pool.query<ProgressRow>(`SELECT * FROM user_galaxy_progress WHERE user_id = $1`, [userId]);
    if (progressRes.rows.length === 0) return res.status(400).json({ message: "No game progress found. Visit /freeball first." });
    const prog = progressRes.rows[0];
    if (prog.unlocked_sphere) return res.json({ ok: true, message: "Already unlocked" });

    const crystals = typeof prog.inventory?.crystals === "number" ? prog.inventory.crystals : 0;

    if (crystals >= SPHERE_CRYSTAL_COST) {
      // Crystal-based crafting: deduct crystals from inventory
      const newInventory = { ...prog.inventory, crystals: crystals - SPHERE_CRYSTAL_COST };
      await pool.query(
        `UPDATE user_galaxy_progress SET unlocked_sphere = true, inventory = $2 WHERE user_id = $1`,
        [userId, JSON.stringify(newInventory)]
      );
      res.json({ ok: true, method: "craft", crystalsRemaining: newInventory.crystals });
    } else {
      // Sparks-based purchase
      const balance = await storage.getUserSparksBalance(userId);
      if (balance < SPHERE_COST) return res.status(402).json({ message: `Insufficient resources. Need ${SPHERE_CRYSTAL_COST} Crystals or ${SPHERE_COST} Sparks.` });
      await storage.debitSparks(userId, SPHERE_COST, "freeball_sphere_unlock", "SEVCO SPHERE vehicle unlock in Freeball");
      await pool.query(
        `UPDATE user_galaxy_progress SET unlocked_sphere = true, sparks_spent = sparks_spent + $2 WHERE user_id = $1`,
        [userId, SPHERE_COST]
      );
      const newBalance = await storage.getUserSparksBalance(userId);
      res.json({ ok: true, method: "sparks", newBalance });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

const chatMessageSchema = z.object({
  message: z.string().min(1).max(500),
});

interface ChatEntry {
  userId: string;
  username: string;
  message: string;
  timestamp: number;
}

const chatMessages: ChatEntry[] = [];

router.get("/chat", requireAuth, async (_req, res) => {
  res.json(chatMessages.slice(-50));
});

router.post("/chat", requireAuth, async (req, res) => {
  try {
    const userId = (req as AuthRequest).user!.id;
    const username = (req as AuthRequest).user!.username;
    const parsed = chatMessageSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const entry: ChatEntry = { userId, username, message: parsed.data.message, timestamp: Date.now() };
    chatMessages.push(entry);
    if (chatMessages.length > 200) chatMessages.splice(0, chatMessages.length - 200);
    res.json(entry);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

interface PresenceEntry {
  userId: string;
  username: string;
  x: number;
  y: number;
  z: number;
  planetId: number;
  timestamp: number;
}

const playerPositions: Record<string, PresenceEntry> = {};

router.post("/presence", requireAuth, async (req, res) => {
  try {
    const userId = (req as AuthRequest).user!.id;
    const username = (req as AuthRequest).user!.username;
    const { x = 0, y = 0, z = 0, planetId = 1 } = req.body as { x?: number; y?: number; z?: number; planetId?: number };
    playerPositions[userId] = { userId, username, x, y, z, planetId, timestamp: Date.now() };
    res.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

router.get("/presence", requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).user!.id;
  const now = Date.now();
  const active = Object.values(playerPositions).filter(
    (p) => p.userId !== userId && now - p.timestamp < 30000
  );
  res.json(active);
});

export { router as freeballRouter };
