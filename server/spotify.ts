import type { Express, Request, Response } from "express";
import { storage } from "./storage";
import { requireAuth, requireRole } from "./middleware/permissions";
import type { Role } from "@shared/schema";

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID!;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET!;
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI!;

const SPOTIFY_SCOPES = [
  "user-read-private",
  "playlist-read-private",
  "playlist-modify-public",
  "playlist-modify-private",
  "user-library-read",
].join(" ");

const CAN_MANAGE_SPOTIFY: Role[] = ["admin", "executive"];

// ── Token helpers ──────────────────────────────────────────────────────────

async function getStoredTokens(): Promise<{
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiry: number | null;
}> {
  const settings = await storage.getPlatformSettings();
  return {
    accessToken: settings["spotify.accessToken"] || null,
    refreshToken: settings["spotify.refreshToken"] || null,
    tokenExpiry: settings["spotify.tokenExpiry"] ? Number(settings["spotify.tokenExpiry"]) : null,
  };
}

async function saveTokens(accessToken: string, refreshToken: string, expiresIn: number) {
  const expiry = Date.now() + expiresIn * 1000;
  await storage.setPlatformSettings({
    "spotify.accessToken": accessToken,
    "spotify.refreshToken": refreshToken,
    "spotify.tokenExpiry": String(expiry),
  });
}

async function refreshAccessToken(): Promise<string> {
  const { refreshToken } = await getStoredTokens();
  if (!refreshToken) throw new Error("No Spotify refresh token stored. Please re-authenticate.");

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const resp = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64")}`,
    },
    body: body.toString(),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: resp.statusText }));
    throw new Error(`Spotify token refresh failed: ${err.error_description || err.error || resp.statusText}`);
  }

  const data = await resp.json();
  const newRefresh = data.refresh_token || refreshToken;
  await saveTokens(data.access_token, newRefresh, data.expires_in);
  return data.access_token;
}

async function getValidAccessToken(): Promise<string> {
  const { accessToken, tokenExpiry } = await getStoredTokens();
  if (!accessToken) throw new Error("Spotify not connected. Please authorize first.");

  const bufferMs = 60 * 1000;
  if (tokenExpiry && Date.now() < tokenExpiry - bufferMs) {
    return accessToken;
  }
  return refreshAccessToken();
}

// ── Spotify API call with retry-after / backoff ────────────────────────────

async function spotifyFetch(path: string, options: RequestInit = {}, retries = 3): Promise<any> {
  const token = await getValidAccessToken();
  const url = `https://api.spotify.com/v1${path}`;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const resp = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

    if (resp.status === 429) {
      const retryAfter = parseInt(resp.headers.get("Retry-After") || "1", 10);
      const delay = retryAfter * 1000 * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, delay));
      continue;
    }

    if (resp.status === 204) return null;

    if (!resp.ok) {
      const errBody = await resp.json().catch(() => ({ error: { message: resp.statusText } }));
      const msg = errBody?.error?.message || resp.statusText;
      const err: any = new Error(msg);
      err.status = resp.status;
      throw err;
    }

    return resp.json();
  }
  throw new Error("Spotify rate limit exceeded after retries");
}

// ── Route registration ─────────────────────────────────────────────────────

export function registerSpotifyRoutes(app: Express) {
  // Auth: redirect to Spotify
  app.get("/api/spotify/auth", requireAuth, requireRole(...CAN_MANAGE_SPOTIFY), (_req, res) => {
    if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET || !SPOTIFY_REDIRECT_URI) {
      return res.status(503).json({ message: "Spotify credentials not configured" });
    }
    const params = new URLSearchParams({
      response_type: "code",
      client_id: SPOTIFY_CLIENT_ID,
      scope: SPOTIFY_SCOPES,
      redirect_uri: SPOTIFY_REDIRECT_URI,
      show_dialog: "true",
    });
    res.redirect(`https://accounts.spotify.com/authorize?${params.toString()}`);
  });

  // Callback: exchange code for tokens
  app.get("/api/spotify/callback", async (req: Request, res: Response) => {
    const { code, error } = req.query as { code?: string; error?: string };

    if (error) {
      return res.redirect(`/command/music?tab=spotify&error=${encodeURIComponent(error)}`);
    }
    if (!code) {
      return res.redirect("/command/music?tab=spotify&error=missing_code");
    }

    try {
      const body = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: SPOTIFY_REDIRECT_URI,
      });

      const resp = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64")}`,
        },
        body: body.toString(),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: resp.statusText }));
        throw new Error(err.error_description || err.error || "Token exchange failed");
      }

      const data = await resp.json();
      await saveTokens(data.access_token, data.refresh_token, data.expires_in);
      res.redirect("/command/music?tab=spotify&connected=1");
    } catch (err: any) {
      res.redirect(`/command/music?tab=spotify&error=${encodeURIComponent(err.message)}`);
    }
  });

  // Status: is Spotify connected?
  app.get("/api/spotify/status", requireAuth, requireRole(...CAN_MANAGE_SPOTIFY), async (_req, res) => {
    try {
      const { accessToken } = await getStoredTokens();
      res.json({ connected: !!accessToken });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Disconnect Spotify
  app.post("/api/spotify/disconnect", requireAuth, requireRole(...CAN_MANAGE_SPOTIFY), async (_req, res) => {
    try {
      await storage.setPlatformSettings({
        "spotify.accessToken": "",
        "spotify.refreshToken": "",
        "spotify.tokenExpiry": "",
      });
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ── Managed artists ────────────────────────────────────────────────────

  app.get("/api/spotify/artists", requireAuth, requireRole(...CAN_MANAGE_SPOTIFY), async (_req, res) => {
    try {
      const managed = await storage.getSpotifyArtists();
      res.json(managed);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/spotify/artists", requireAuth, requireRole(...CAN_MANAGE_SPOTIFY), async (req, res) => {
    try {
      const { spotifyArtistId, displayName, displayOrder } = req.body;
      if (!spotifyArtistId || !displayName) {
        return res.status(400).json({ message: "spotifyArtistId and displayName are required" });
      }
      const artist = await storage.addSpotifyArtist({ spotifyArtistId, displayName, displayOrder: displayOrder ?? 0 });
      res.status(201).json(artist);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/spotify/artists/:id", requireAuth, requireRole(...CAN_MANAGE_SPOTIFY), async (req, res) => {
    try {
      await storage.removeSpotifyArtist(Number(req.params.id));
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/spotify/artists/:spotifyId/stats", requireAuth, requireRole(...CAN_MANAGE_SPOTIFY), async (req, res) => {
    try {
      const data = await spotifyFetch(`/artists/${req.params.spotifyId}`);
      res.json(data);
    } catch (err: any) {
      res.status(err.status || 500).json({ message: err.message });
    }
  });

  // Preview artist before adding
  app.get("/api/spotify/artists/:spotifyId/preview", requireAuth, requireRole(...CAN_MANAGE_SPOTIFY), async (req, res) => {
    try {
      const data = await spotifyFetch(`/artists/${req.params.spotifyId}`);
      res.json({ id: data.id, name: data.name, images: data.images, followers: data.followers });
    } catch (err: any) {
      res.status(err.status || 500).json({ message: err.message });
    }
  });

  // ── Playlists ──────────────────────────────────────────────────────────

  app.get("/api/spotify/playlists", requireAuth, requireRole(...CAN_MANAGE_SPOTIFY), async (_req, res) => {
    try {
      const data = await spotifyFetch("/me/playlists?limit=50");
      res.json(data);
    } catch (err: any) {
      res.status(err.status || 500).json({ message: err.message });
    }
  });

  app.post("/api/spotify/playlists", requireAuth, requireRole(...CAN_MANAGE_SPOTIFY), async (req, res) => {
    try {
      const { name, description, isPublic } = req.body;
      if (!name) return res.status(400).json({ message: "name is required" });

      const me = await spotifyFetch("/me");
      const playlist = await spotifyFetch(`/users/${me.id}/playlists`, {
        method: "POST",
        body: JSON.stringify({ name, description: description || "", public: isPublic !== false }),
      });
      res.status(201).json(playlist);
    } catch (err: any) {
      res.status(err.status || 500).json({ message: err.message });
    }
  });

  app.get("/api/spotify/playlists/:id/tracks", requireAuth, requireRole(...CAN_MANAGE_SPOTIFY), async (req, res) => {
    try {
      const data = await spotifyFetch(`/playlists/${req.params.id}/items?limit=50&fields=items(track(id,name,duration_ms,artists,uri)),next`);
      res.json(data);
    } catch (err: any) {
      res.status(err.status || 500).json({ message: err.message });
    }
  });

  app.post("/api/spotify/playlists/:id/tracks", requireAuth, requireRole(...CAN_MANAGE_SPOTIFY), async (req, res) => {
    try {
      const { uris } = req.body;
      if (!uris || !Array.isArray(uris)) return res.status(400).json({ message: "uris array is required" });
      const data = await spotifyFetch(`/playlists/${req.params.id}/tracks`, {
        method: "POST",
        body: JSON.stringify({ uris }),
      });
      res.json(data);
    } catch (err: any) {
      res.status(err.status || 500).json({ message: err.message });
    }
  });

  app.delete("/api/spotify/playlists/:id/tracks", requireAuth, requireRole(...CAN_MANAGE_SPOTIFY), async (req, res) => {
    try {
      const { tracks } = req.body;
      if (!tracks || !Array.isArray(tracks)) return res.status(400).json({ message: "tracks array is required" });
      const data = await spotifyFetch(`/playlists/${req.params.id}/tracks`, {
        method: "DELETE",
        body: JSON.stringify({ tracks }),
      });
      res.json(data);
    } catch (err: any) {
      res.status(err.status || 500).json({ message: err.message });
    }
  });

  // Search tracks
  app.get("/api/spotify/search", requireAuth, requireRole(...CAN_MANAGE_SPOTIFY), async (req, res) => {
    try {
      const { q } = req.query as { q?: string };
      if (!q) return res.status(400).json({ message: "q is required" });
      const data = await spotifyFetch(`/search?q=${encodeURIComponent(q)}&type=track&limit=10`);
      res.json(data);
    } catch (err: any) {
      res.status(err.status || 500).json({ message: err.message });
    }
  });
}
