import { createHash, randomBytes } from "crypto";
import { sql, and, gte, lt, eq } from "drizzle-orm";
import { db } from "./db";
import { pageviews, analyticsSalts } from "@shared/schema";

const BOT_REGEX = /bot|crawler|spider|crawling|preview|monitor|fetch|http|axios|curl|wget|googlebot|bingbot|baidu|duckduck|yandex|slack|discord|whatsapp|facebook|twitter|linkedin/i;

export function classifyDevice(ua: string): "mobile" | "tablet" | "desktop" | "bot" {
  if (!ua) return "desktop";
  if (BOT_REGEX.test(ua)) return "bot";
  if (/ipad|tablet/i.test(ua)) return "tablet";
  if (/mobile|iphone|android/i.test(ua)) return "mobile";
  return "desktop";
}

export function isBotUA(ua: string): boolean {
  return !!ua && BOT_REGEX.test(ua);
}

export function normalizePath(path: string): string {
  if (!path) return "/";
  let p = path.split("?")[0].split("#")[0].toLowerCase();
  if (p.length > 512) p = p.slice(0, 512);
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  return p || "/";
}

export function parseReferrerHost(ref: string | null | undefined): string | null {
  if (!ref) return null;
  try {
    const u = new URL(ref);
    return u.hostname.toLowerCase().slice(0, 255) || null;
  } catch {
    return null;
  }
}

function hash16(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 16);
}

async function getTodaySalt(): Promise<string> {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD UTC
  const [existing] = await db.select().from(analyticsSalts).where(eq(analyticsSalts.day, today));
  if (existing) return existing.salt;
  const salt = randomBytes(32).toString("hex");
  await db.insert(analyticsSalts).values({ day: today, salt }).onConflictDoNothing();
  const [row] = await db.select().from(analyticsSalts).where(eq(analyticsSalts.day, today));
  return row?.salt ?? salt;
}

// Session bucket: 30 minutes
function sessionBucket(now: Date): string {
  return String(Math.floor(now.getTime() / (30 * 60 * 1000)));
}

// Rate limiting (in-memory token bucket per IP)
const rateState = new Map<string, { secCount: number; secWindow: number; minCount: number; minWindow: number }>();
export function rateLimitAllow(ip: string): boolean {
  const now = Date.now();
  const secWin = Math.floor(now / 1000);
  const minWin = Math.floor(now / 60000);
  const s = rateState.get(ip) ?? { secCount: 0, secWindow: secWin, minCount: 0, minWindow: minWin };
  if (s.secWindow !== secWin) { s.secWindow = secWin; s.secCount = 0; }
  if (s.minWindow !== minWin) { s.minWindow = minWin; s.minCount = 0; }
  s.secCount++; s.minCount++;
  rateState.set(ip, s);
  if (rateState.size > 10000) {
    // Evict stale entries lazily
    for (const [k, v] of rateState) {
      if (now / 1000 - v.secWindow > 120) rateState.delete(k);
    }
  }
  return s.secCount <= 10 && s.minCount <= 60;
}

export async function recordPageview(input: {
  path: string;
  referrer: string | null | undefined;
  ip: string;
  userAgent: string;
  country: string | null | undefined;
}): Promise<void> {
  try {
    const path = normalizePath(input.path || "/");
    const referrerHost = parseReferrerHost(input.referrer);
    const ua = input.userAgent || "";
    const device = classifyDevice(ua);
    const isBot = device === "bot";
    const salt = await getTodaySalt();
    const ip = input.ip || "0.0.0.0";
    const visitorHash = hash16(`${salt}:${ip}:${ua}`);
    const sessionHash = hash16(`${visitorHash}:${sessionBucket(new Date())}`);
    const country = (input.country || "").toUpperCase().slice(0, 2) || null;

    await db.insert(pageviews).values({
      path,
      referrerHost: referrerHost ?? null,
      visitorHash,
      sessionHash,
      country,
      device,
      isBot,
    });
  } catch (err) {
    console.error("[internalAnalytics] recordPageview failed:", (err as Error).message);
  }
}

export type Range = "today" | "7d" | "28d" | "90d";

export function rangeToWindow(range: Range | string): { from: Date; to: Date; prevFrom: Date; prevTo: Date } {
  const to = new Date();
  let days = 28;
  if (range === "today") days = 1;
  else if (range === "7d") days = 7;
  else if (range === "28d") days = 28;
  else if (range === "90d") days = 90;
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  const prevFrom = new Date(from.getTime() - days * 24 * 60 * 60 * 1000);
  return { from, to, prevFrom, prevTo: from };
}

// Format a JS Date as an ISO timestamp string for safe interpolation into the
// drizzle sql template. Passing strings instead of raw Date objects avoids any
// parameter-binding ambiguity across driver versions.
function ts(d: Date): string {
  return d.toISOString();
}

const SEARCH_HOSTS = /(^|\.)(google|bing|duckduckgo|yahoo|yandex|baidu)\./i;
const SOCIAL_HOSTS = /(^|\.)(facebook|twitter|x\.com|linkedin|instagram|tiktok|reddit|youtube|pinterest|threads|bsky|mastodon)\./i;

function classifyChannel(referrerHost: string | null, ownHosts: Set<string>): string {
  if (!referrerHost) return "Direct";
  if (ownHosts.has(referrerHost)) return "Direct";
  if (SEARCH_HOSTS.test(referrerHost)) return "Search";
  if (SOCIAL_HOSTS.test(referrerHost)) return "Social";
  return "Referral";
}

export async function getSummary(range: Range | string) {
  const { from, to, prevFrom, prevTo } = rangeToWindow(range);

  // Main aggregates
  const main = await db.execute<{ total_users: number; total_sessions: number; total_pageviews: number }>(sql`
    SELECT
      COUNT(DISTINCT visitor_hash)::int AS total_users,
      COUNT(DISTINCT session_hash)::int AS total_sessions,
      COUNT(*)::int AS total_pageviews
    FROM pageviews
    WHERE is_bot = false AND created_at >= ${ts(from)} AND created_at < ${ts(to)}
  `);
  const m = main.rows[0] ?? { total_users: 0, total_sessions: 0, total_pageviews: 0 };

  // Avg session duration
  const durRes = await db.execute<{ avg_dur: number }>(sql`
    SELECT COALESCE(AVG(dur), 0)::float AS avg_dur FROM (
      SELECT EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at)))::float AS dur
      FROM pageviews
      WHERE is_bot = false AND created_at >= ${ts(from)} AND created_at < ${ts(to)}
      GROUP BY session_hash
    ) s
  `);
  const avgSessionDurationSec = Math.round(durRes.rows[0]?.avg_dur ?? 0);

  // Previous window pageviews for delta
  const prev = await db.execute<{ total_pageviews: number }>(sql`
    SELECT COUNT(*)::int AS total_pageviews FROM pageviews
    WHERE is_bot = false AND created_at >= ${ts(prevFrom)} AND created_at < ${ts(prevTo)}
  `);
  const prevPv = prev.rows[0]?.total_pageviews ?? 0;
  const deltaPct = prevPv > 0 ? ((m.total_pageviews - prevPv) / prevPv) * 100 : 0;

  // Sessions today (UTC)
  const todayStart = new Date(); todayStart.setUTCHours(0, 0, 0, 0);
  const todayRes = await db.execute<{ sessions_today: number }>(sql`
    SELECT COUNT(DISTINCT session_hash)::int AS sessions_today FROM pageviews
    WHERE is_bot = false AND created_at >= ${ts(todayStart)}
  `);
  const sessionsToday = todayRes.rows[0]?.sessions_today ?? 0;

  // Bounce rate: % of sessions with exactly 1 pageview
  const bounceRes = await db.execute<{ bounce: number }>(sql`
    SELECT COALESCE(AVG(CASE WHEN cnt = 1 THEN 100.0 ELSE 0 END), 0)::float AS bounce FROM (
      SELECT COUNT(*) AS cnt FROM pageviews
      WHERE is_bot = false AND created_at >= ${ts(from)} AND created_at < ${ts(to)}
      GROUP BY session_hash
    ) s
  `);
  const bounceRate = bounceRes.rows[0]?.bounce ?? 0;

  // 30d compat
  const thirty = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
  const thirtyRes = await db.execute<{ active_users_30d: number; pageviews_30d: number }>(sql`
    SELECT COUNT(DISTINCT visitor_hash)::int AS active_users_30d, COUNT(*)::int AS pageviews_30d
    FROM pageviews WHERE is_bot = false AND created_at >= ${ts(thirty)}
  `);
  const t30 = thirtyRes.rows[0] ?? { active_users_30d: 0, pageviews_30d: 0 };

  return {
    // New shape (task spec)
    totalUsers: m.total_users,
    totalSessions: m.total_sessions,
    totalPageviews: m.total_pageviews,
    avgSessionDurationSec,
    deltaPct: Math.round(deltaPct * 10) / 10,
    // Legacy compat for existing widget
    sessions: m.total_sessions,
    pageviews: m.total_pageviews,
    activeUsers: m.total_users,
    bounceRate,
    sessionsToday,
    activeUsers30d: t30.active_users_30d,
    pageviews30d: t30.pageviews_30d,
  };
}

export async function getTopPages(range: Range | string, limit = 10) {
  const { from, to } = rangeToWindow(range);
  const res = await db.execute<{ path: string; views: number }>(sql`
    SELECT path, COUNT(*)::int AS views FROM pageviews
    WHERE is_bot = false AND created_at >= ${ts(from)} AND created_at < ${ts(to)}
    GROUP BY path ORDER BY views DESC LIMIT ${limit}
  `);
  return res.rows.map((r) => ({
    pagePath: r.path,
    screenPageViews: r.views,
    // Legacy alias used by command-traffic
    page: r.path,
    pageviews: r.views,
  }));
}

export async function getTopSources(range: Range | string, limit = 10) {
  const { from, to } = rangeToWindow(range);
  const ownHosts = new Set<string>();
  const ownHost = (process.env.REPLIT_DEV_DOMAIN || "").toLowerCase();
  if (ownHost) ownHosts.add(ownHost);

  const res = await db.execute<{ referrer_host: string | null; sessions: number }>(sql`
    SELECT referrer_host, COUNT(DISTINCT session_hash)::int AS sessions FROM pageviews
    WHERE is_bot = false AND created_at >= ${ts(from)} AND created_at < ${ts(to)}
    GROUP BY referrer_host
  `);

  const buckets = new Map<string, number>();
  for (const row of res.rows) {
    const channel = classifyChannel(row.referrer_host, ownHosts);
    buckets.set(channel, (buckets.get(channel) ?? 0) + row.sessions);
  }
  return [...buckets.entries()]
    .map(([channel, sessions]) => ({
      sessionDefaultChannelGroup: channel,
      sessions,
      // Legacy alias
      source: channel,
    }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, limit);
}

export async function getSessionsOverTime(range: Range | string) {
  const { from, to } = rangeToWindow(range);
  const res = await db.execute<{ day: string; sessions: number }>(sql`
    SELECT to_char(date_trunc('day', created_at), 'YYYYMMDD') AS day,
           COUNT(DISTINCT session_hash)::int AS sessions
    FROM pageviews
    WHERE is_bot = false AND created_at >= ${ts(from)} AND created_at < ${ts(to)}
    GROUP BY day ORDER BY day ASC
  `);
  return res.rows.map((r) => ({ date: r.day, sessions: r.sessions }));
}

export async function getCountryBreakdown(range: Range | string, limit = 10) {
  const { from, to } = rangeToWindow(range);
  const res = await db.execute<{ country: string | null; sessions: number }>(sql`
    SELECT country, COUNT(DISTINCT session_hash)::int AS sessions FROM pageviews
    WHERE is_bot = false AND created_at >= ${ts(from)} AND created_at < ${ts(to)}
    GROUP BY country ORDER BY sessions DESC LIMIT ${limit}
  `);
  return res.rows.map((r) => ({ country: r.country || "Unknown", sessions: r.sessions }));
}

export async function getDeviceSplit(range: Range | string) {
  const { from, to } = rangeToWindow(range);
  const res = await db.execute<{ device: string; sessions: number }>(sql`
    SELECT device, COUNT(DISTINCT session_hash)::int AS sessions FROM pageviews
    WHERE is_bot = false AND created_at >= ${ts(from)} AND created_at < ${ts(to)}
    GROUP BY device ORDER BY sessions DESC
  `);
  return res.rows.map((r) => ({ device: r.device, sessions: r.sessions }));
}

export async function getRealtimeActiveUsers(): Promise<number> {
  const since = new Date(Date.now() - 5 * 60 * 1000);
  const res = await db.execute<{ c: number }>(sql`
    SELECT COUNT(DISTINCT visitor_hash)::int AS c FROM pageviews
    WHERE is_bot = false AND created_at >= ${ts(since)}
  `);
  return res.rows[0]?.c ?? 0;
}

export async function getInternalStatus() {
  return {
    configured: true,
    hasServiceAccount: true,
    propertyId: "internal",
    measurementId: "internal",
  };
}
