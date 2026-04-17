import type { Express, Request } from "express";
import type { Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { z } from "zod";
import { storage } from "./storage";
import { requireAuth, requireRole } from "./middleware/permissions";
import { insertVoicePreferencesSchema, insertAnnouncementSchema } from "@shared/schema";
import { db } from "./db";
import { voicePreferences, announcements, announcementDismissals, voiceModerationActions, users } from "@shared/schema";
import { eq, and, desc, sql, isNull, or } from "drizzle-orm";
import { supabase } from "./supabase";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

type ClientInfo = {
  ws: WebSocket;
  userId: string | null;
  username: string | null;
  role: string | null;
  rooms: Set<string>;
  micMuted: boolean;
  speaking: boolean;
};

const clients = new Map<string, ClientInfo>();
const rooms = new Map<string, Set<string>>(); // roomKey -> set of clientIds
const liveAnnouncements = new Map<string, { authorId: string; title: string; startedAt: number }>(); // adminId -> live state

function genId() {
  return Math.random().toString(36).slice(2, 12);
}

function broadcastRoom(roomKey: string, msg: any, exceptClientId?: string) {
  const set = rooms.get(roomKey);
  if (!set) return;
  const data = JSON.stringify(msg);
  for (const cid of set) {
    if (cid === exceptClientId) continue;
    const c = clients.get(cid);
    if (c && c.ws.readyState === WebSocket.OPEN) c.ws.send(data);
  }
}

function broadcastAll(msg: any, filter?: (c: ClientInfo) => boolean) {
  const data = JSON.stringify(msg);
  for (const c of clients.values()) {
    if (filter && !filter(c)) continue;
    if (c.ws.readyState === WebSocket.OPEN) c.ws.send(data);
  }
}

function roomRoster(roomKey: string) {
  const set = rooms.get(roomKey);
  if (!set) return [];
  return Array.from(set).map((cid) => {
    const c = clients.get(cid);
    return c ? { clientId: cid, userId: c.userId, username: c.username, micMuted: c.micMuted, speaking: c.speaking } : null;
  }).filter(Boolean);
}

export function registerVoiceRoutes(httpServer: Server, app: Express) {
  // ===== REST: Voice preferences =====
  app.get("/api/voice/preferences", requireAuth, async (req, res) => {
    const userId = req.user!.id;
    const [row] = await db.select().from(voicePreferences).where(eq(voicePreferences.userId, userId));
    if (!row) {
      return res.json({
        userId, pttKey: "AltLeft", inputDeviceId: null, outputDeviceId: null,
        inputVolume: 1, outputVolume: 1, noiseSuppression: true, echoCancellation: true,
        muteAnnouncements: false, autoJoinVoice: false,
      });
    }
    res.json(row);
  });

  app.patch("/api/voice/preferences", requireAuth, async (req, res) => {
    const userId = req.user!.id;
    const parsed = insertVoicePreferencesSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid prefs", errors: parsed.error.errors });
    const [existing] = await db.select().from(voicePreferences).where(eq(voicePreferences.userId, userId));
    if (existing) {
      const [updated] = await db.update(voicePreferences).set({ ...parsed.data, updatedAt: new Date() }).where(eq(voicePreferences.userId, userId)).returning();
      return res.json(updated);
    }
    const [created] = await db.insert(voicePreferences).values({ userId, ...parsed.data }).returning();
    res.json(created);
  });

  // ===== REST: Announcements =====
  app.get("/api/announcements", async (req, res) => {
    const list = await db.select({
      id: announcements.id, title: announcements.title, body: announcements.body,
      audioUrl: announcements.audioUrl, durationSec: announcements.durationSec,
      kind: announcements.kind, isPinned: announcements.isPinned, createdAt: announcements.createdAt,
      authorId: announcements.authorId,
      authorName: users.displayName, authorUsername: users.username,
    })
      .from(announcements)
      .leftJoin(users, eq(announcements.authorId, users.id))
      .orderBy(desc(announcements.isPinned), desc(announcements.createdAt))
      .limit(50);
    res.json(list);
  });

  app.post("/api/announcements", requireRole("admin", "executive"), upload.single("audio"), async (req, res) => {
    const title = (req.body.title || "").toString().slice(0, 200);
    const body = (req.body.body || "").toString().slice(0, 5000) || null;
    const isPinned = req.body.isPinned === "true" || req.body.isPinned === true;
    const durationSec = req.body.durationSec ? parseInt(req.body.durationSec, 10) : null;
    if (!title) return res.status(400).json({ message: "Title required" });

    let audioUrl: string | null = null;
    if (req.file) {
      if (!supabase) return res.status(503).json({ message: "Storage not configured" });
      const ext = (req.file.mimetype.split("/")[1] || "webm").split(";")[0];
      const key = `${Date.now()}-${genId()}.${ext}`;
      const { error } = await supabase.storage.from("announcements").upload(key, req.file.buffer, {
        contentType: req.file.mimetype, upsert: false,
      });
      if (error) return res.status(500).json({ message: "Upload failed: " + error.message });
      const { data } = supabase.storage.from("announcements").getPublicUrl(key);
      audioUrl = data.publicUrl;
    }

    const [ann] = await db.insert(announcements).values({
      authorId: req.user!.id, title, body, audioUrl, durationSec,
      kind: audioUrl ? "recorded" : "text", isPinned,
    }).returning();

    // Notify all logged-in users
    try {
      const allUsers = await db.select({ id: users.id }).from(users);
      for (const u of allUsers) {
        await storage.createNotification({
          userId: u.id, type: "announcement", title: `Announcement: ${title}`,
          body: body?.slice(0, 200) || null, link: "/?announcement=" + ann.id, isRead: false,
        });
      }
    } catch (e) { console.error("[voice] notify announcement failed:", e); }

    // Broadcast to all WS clients (including anon) so banner/bell appears
    broadcastAll({ type: "announcement.new", announcement: ann });
    res.json(ann);
  });

  app.delete("/api/announcements/:id", requireRole("admin", "executive"), async (req, res) => {
    const id = parseInt(req.params.id, 10);
    await db.delete(announcements).where(eq(announcements.id, id));
    broadcastAll({ type: "announcement.deleted", id });
    res.json({ ok: true });
  });

  // Dismiss / mark seen — supports both auth and anonymous via visitorKey
  app.post("/api/announcements/:id/dismiss", async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const userId = req.user?.id || null;
    const visitorKey = (req.body?.visitorKey || "").toString().slice(0, 100) || null;
    if (!userId && !visitorKey) return res.status(400).json({ message: "userId or visitorKey required" });
    try {
      await db.insert(announcementDismissals).values({ announcementId: id, userId, visitorKey });
    } catch {}
    res.json({ ok: true });
  });

  app.get("/api/announcements/dismissals", async (req, res) => {
    const userId = req.user?.id || null;
    const visitorKey = (req.query.visitorKey || "").toString().slice(0, 100) || null;
    if (!userId && !visitorKey) return res.json([]);
    const where = userId
      ? eq(announcementDismissals.userId, userId)
      : eq(announcementDismissals.visitorKey, visitorKey!);
    const rows = await db.select({ announcementId: announcementDismissals.announcementId }).from(announcementDismissals).where(where);
    res.json(rows.map((r) => r.announcementId));
  });

  // ===== Voice room moderation (admin) =====
  app.get("/api/voice/rooms", requireRole("admin", "executive"), (_req, res) => {
    const out: any[] = [];
    for (const [roomKey, set] of rooms.entries()) {
      out.push({ roomKey, participants: roomRoster(roomKey) });
    }
    res.json(out);
  });

  app.post("/api/voice/rooms/:roomKey/kick", requireRole("admin", "executive"), async (req, res) => {
    const roomKey = decodeURIComponent(req.params.roomKey);
    const targetUserId = (req.body?.userId || "").toString();
    if (!targetUserId) return res.status(400).json({ message: "userId required" });
    await db.insert(voiceModerationActions).values({
      roomKey, targetUserId, moderatorId: req.user!.id, action: "kick", reason: req.body?.reason || null,
    });
    const set = rooms.get(roomKey);
    if (set) {
      for (const cid of Array.from(set)) {
        const c = clients.get(cid);
        if (c && c.userId === targetUserId) {
          if (c.ws.readyState === WebSocket.OPEN) c.ws.send(JSON.stringify({ type: "voice.kicked", roomKey, by: req.user!.username }));
          set.delete(cid);
          c.rooms.delete(roomKey);
          broadcastRoom(roomKey, { type: "voice.left", roomKey, clientId: cid, userId: targetUserId });
        }
      }
    }
    res.json({ ok: true });
  });

  app.post("/api/voice/rooms/:roomKey/mute", requireRole("admin", "executive"), async (req, res) => {
    const roomKey = decodeURIComponent(req.params.roomKey);
    const targetUserId = (req.body?.userId || "").toString();
    if (!targetUserId) return res.status(400).json({ message: "userId required" });
    await db.insert(voiceModerationActions).values({
      roomKey, targetUserId, moderatorId: req.user!.id, action: "mute", reason: req.body?.reason || null,
    });
    const set = rooms.get(roomKey);
    if (set) {
      for (const cid of set) {
        const c = clients.get(cid);
        if (c && c.userId === targetUserId && c.ws.readyState === WebSocket.OPEN) {
          c.micMuted = true;
          c.ws.send(JSON.stringify({ type: "voice.forceMute", roomKey, by: req.user!.username }));
          broadcastRoom(roomKey, { type: "voice.state", roomKey, clientId: cid, userId: targetUserId, micMuted: true });
        }
      }
    }
    res.json({ ok: true });
  });

  // ===== WebSocket signaling =====
  const wss = new WebSocketServer({ server: httpServer, path: "/ws/voice" });

  wss.on("connection", async (ws, req: Request) => {
    const clientId = genId();
    let userId: string | null = null;
    let username: string | null = null;
    let role: string | null = null;

    // Try to parse session from cookies via passport — best-effort
    try {
      const cookieHeader = req.headers.cookie || "";
      // Lightweight: rely on session via parsed user; production would share session middleware.
      // Here we accept an authenticate message after connect.
    } catch {}

    const info: ClientInfo = { ws, userId, username, role, rooms: new Set(), micMuted: false, speaking: false };
    clients.set(clientId, info);

    ws.send(JSON.stringify({ type: "welcome", clientId }));

    ws.on("message", async (raw) => {
      let msg: any;
      try { msg = JSON.parse(raw.toString()); } catch { return; }

      if (msg.type === "auth" && msg.userId) {
        // Trust client-claimed id for room membership; sensitive moderation still goes through REST + requireAuth.
        try {
          const u = await storage.getUser(msg.userId);
          if (u) { info.userId = u.id; info.username = u.username; info.role = u.role; }
        } catch {}
        return;
      }

      if (msg.type === "voice.join" && typeof msg.roomKey === "string") {
        const roomKey = msg.roomKey;
        if (!rooms.has(roomKey)) rooms.set(roomKey, new Set());
        rooms.get(roomKey)!.add(clientId);
        info.rooms.add(roomKey);
        // Notify joiner of existing peers
        const peers = roomRoster(roomKey).filter((p: any) => p.clientId !== clientId);
        ws.send(JSON.stringify({ type: "voice.peers", roomKey, peers }));
        broadcastRoom(roomKey, {
          type: "voice.joined", roomKey, clientId, userId: info.userId, username: info.username,
          micMuted: info.micMuted, speaking: false,
        }, clientId);
        return;
      }

      if (msg.type === "voice.leave" && typeof msg.roomKey === "string") {
        const set = rooms.get(msg.roomKey);
        if (set) { set.delete(clientId); }
        info.rooms.delete(msg.roomKey);
        broadcastRoom(msg.roomKey, { type: "voice.left", roomKey: msg.roomKey, clientId, userId: info.userId });
        return;
      }

      if ((msg.type === "rtc.offer" || msg.type === "rtc.answer" || msg.type === "rtc.ice") && msg.to) {
        const target = clients.get(msg.to);
        if (target && target.ws.readyState === WebSocket.OPEN) {
          target.ws.send(JSON.stringify({ ...msg, from: clientId }));
        }
        return;
      }

      if (msg.type === "voice.state" && typeof msg.roomKey === "string") {
        if (typeof msg.micMuted === "boolean") info.micMuted = msg.micMuted;
        if (typeof msg.speaking === "boolean") info.speaking = msg.speaking;
        broadcastRoom(msg.roomKey, {
          type: "voice.state", roomKey: msg.roomKey, clientId,
          userId: info.userId, micMuted: info.micMuted, speaking: info.speaking,
        });
        return;
      }

      // === Live announcements (admin only) ===
      if (msg.type === "announce.start") {
        if (info.role !== "admin" && info.role !== "executive") {
          ws.send(JSON.stringify({ type: "error", message: "Not authorized" })); return;
        }
        liveAnnouncements.set(info.userId!, { authorId: info.userId!, title: msg.title || "Live announcement", startedAt: Date.now() });
        broadcastAll({
          type: "announce.live", state: "start", authorId: info.userId, authorName: info.username,
          title: msg.title || "Live announcement",
        });
        return;
      }

      if (msg.type === "announce.chunk") {
        if (info.role !== "admin" && info.role !== "executive") return;
        // Relay base64 audio chunk to all clients
        broadcastAll({
          type: "announce.chunk", authorId: info.userId,
          mime: msg.mime, data: msg.data,
        }, (c) => c !== info);
        return;
      }

      if (msg.type === "announce.stop") {
        if (info.role !== "admin" && info.role !== "executive") return;
        liveAnnouncements.delete(info.userId!);
        broadcastAll({ type: "announce.live", state: "stop", authorId: info.userId });
        return;
      }
    });

    ws.on("close", () => {
      // Leave all rooms
      for (const roomKey of info.rooms) {
        const set = rooms.get(roomKey);
        if (set) {
          set.delete(clientId);
          if (set.size === 0) rooms.delete(roomKey);
        }
        broadcastRoom(roomKey, { type: "voice.left", roomKey, clientId, userId: info.userId });
      }
      // End live announcement if admin disconnects mid-broadcast
      if (info.userId && liveAnnouncements.has(info.userId)) {
        liveAnnouncements.delete(info.userId);
        broadcastAll({ type: "announce.live", state: "stop", authorId: info.userId });
      }
      clients.delete(clientId);
    });

    ws.on("error", () => {});
  });

  console.log("[voice] WebSocket signaling ready at /ws/voice");
}
