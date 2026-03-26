import { BetaAnalyticsDataClient } from "@google-analytics/data";

interface ServiceAccountCredentials {
  type?: string;
  project_id?: string;
  private_key_id?: string;
  private_key?: string;
  client_email?: string;
  client_id?: string;
  auth_uri?: string;
  token_uri?: string;
  [key: string]: string | undefined;
}

let _client: BetaAnalyticsDataClient | null = null;

function getGA4Client(): BetaAnalyticsDataClient {
  if (!_client) {
    const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (!json) {
      throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON environment variable is not set");
    }
    let credentials: ServiceAccountCredentials;
    try {
      credentials = JSON.parse(json) as ServiceAccountCredentials;
    } catch {
      throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON");
    }
    if (!credentials.client_email || !credentials.private_key) {
      throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is missing required fields (client_email, private_key)");
    }
    _client = new BetaAnalyticsDataClient({ credentials });
  }
  return _client;
}

type CacheEntry = { data: unknown; expiresAt: number };
const cache = new Map<string, CacheEntry>();

const CACHE_TTL_MS = 5 * 60 * 1000;
const REALTIME_CACHE_TTL_MS = 60 * 1000;

function getCached(key: string): unknown | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCached(key: string, data: unknown) {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

function rangeToDates(range: string): { startDate: string; endDate: string } {
  const endDate = "today";
  const startDateMap: Record<string, string> = {
    "7d": "7daysAgo",
    "28d": "28daysAgo",
    "90d": "90daysAgo",
  };
  return { startDate: startDateMap[range] || "28daysAgo", endDate };
}

export async function getGA4Status(propertyId?: string, measurementId?: string) {
  const hasServiceAccount = !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  return {
    configured: !!(measurementId && propertyId && hasServiceAccount),
    hasServiceAccount,
    propertyId: propertyId || null,
    measurementId: measurementId || null,
  };
}

export async function getRealtimeActiveUsers(propertyId: string): Promise<number> {
  const cacheKey = `${propertyId}:realtime`;
  const entry = cache.get(cacheKey);
  if (entry && Date.now() <= entry.expiresAt) return entry.data as number;
  if (entry) cache.delete(cacheKey);

  const client = getGA4Client();
  const [response] = await client.runRealtimeReport({
    property: `properties/${propertyId}`,
    metrics: [{ name: "activeUsers" }],
  });

  const value = parseInt(response.rows?.[0]?.metricValues?.[0]?.value ?? "0", 10);
  cache.set(cacheKey, { data: value, expiresAt: Date.now() + REALTIME_CACHE_TTL_MS });
  return value;
}

export async function getSummary(propertyId: string, range: string) {
  const cacheKey = `${propertyId}:summary:${range}`;
  const cached = getCached(cacheKey);
  if (cached !== null) return cached;

  const client = getGA4Client();
  const { startDate, endDate } = rangeToDates(range);

  const [rangeResponse, todayResponse, thirtyDayResponse] = await Promise.all([
    client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate, endDate }],
      metrics: [
        { name: "sessions" },
        { name: "screenPageViews" },
        { name: "activeUsers" },
        { name: "bounceRate" },
      ],
    }),
    client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: "today", endDate: "today" }],
      metrics: [{ name: "sessions" }],
    }),
    client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
      metrics: [{ name: "activeUsers" }, { name: "screenPageViews" }],
    }),
  ]);

  const rangeRow = rangeResponse[0].rows?.[0];
  const todayRow = todayResponse[0].rows?.[0];
  const thirtyRow = thirtyDayResponse[0].rows?.[0];

  const data = {
    sessions: parseInt(rangeRow?.metricValues?.[0]?.value ?? "0", 10),
    pageviews: parseInt(rangeRow?.metricValues?.[1]?.value ?? "0", 10),
    activeUsers: parseInt(rangeRow?.metricValues?.[2]?.value ?? "0", 10),
    bounceRate: parseFloat(rangeRow?.metricValues?.[3]?.value ?? "0"),
    sessionsToday: parseInt(todayRow?.metricValues?.[0]?.value ?? "0", 10),
    activeUsers30d: parseInt(thirtyRow?.metricValues?.[0]?.value ?? "0", 10),
    pageviews30d: parseInt(thirtyRow?.metricValues?.[1]?.value ?? "0", 10),
  };

  setCached(cacheKey, data);
  return data;
}

export async function getSessionsOverTime(propertyId: string, range: string) {
  const cacheKey = `${propertyId}:sessions:${range}`;
  const cached = getCached(cacheKey);
  if (cached !== null) return cached;

  const client = getGA4Client();
  const { startDate, endDate } = rangeToDates(range);

  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: "date" }],
    metrics: [{ name: "sessions" }],
    orderBys: [{ dimension: { dimensionName: "date" }, desc: false }],
  });

  const data = (response.rows ?? []).map((row) => ({
    date: row.dimensionValues?.[0]?.value ?? "",
    sessions: parseInt(row.metricValues?.[0]?.value ?? "0", 10),
  }));

  setCached(cacheKey, data);
  return data;
}

export async function getTopPages(propertyId: string, range: string) {
  const cacheKey = `${propertyId}:pages:${range}`;
  const cached = getCached(cacheKey);
  if (cached !== null) return cached;

  const client = getGA4Client();
  const { startDate, endDate } = rangeToDates(range);

  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: "pagePath" }],
    metrics: [{ name: "screenPageViews" }],
    orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
    limit: 10,
  });

  const data = (response.rows ?? []).map((row) => ({
    page: row.dimensionValues?.[0]?.value ?? "",
    pageviews: parseInt(row.metricValues?.[0]?.value ?? "0", 10),
  }));

  setCached(cacheKey, data);
  return data;
}

export async function getTrafficSources(propertyId: string, range: string) {
  const cacheKey = `${propertyId}:sources:${range}`;
  const cached = getCached(cacheKey);
  if (cached !== null) return cached;

  const client = getGA4Client();
  const { startDate, endDate } = rangeToDates(range);

  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: "sessionDefaultChannelGroup" }],
    metrics: [{ name: "sessions" }],
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
  });

  const data = (response.rows ?? []).map((row) => ({
    source: row.dimensionValues?.[0]?.value ?? "Unknown",
    sessions: parseInt(row.metricValues?.[0]?.value ?? "0", 10),
  }));

  setCached(cacheKey, data);
  return data;
}

export async function getCountryBreakdown(propertyId: string, range: string) {
  const cacheKey = `${propertyId}:countries:${range}`;
  const cached = getCached(cacheKey);
  if (cached !== null) return cached;

  const client = getGA4Client();
  const { startDate, endDate } = rangeToDates(range);

  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: "country" }],
    metrics: [{ name: "sessions" }],
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    limit: 10,
  });

  const data = (response.rows ?? []).map((row) => ({
    country: row.dimensionValues?.[0]?.value ?? "Unknown",
    sessions: parseInt(row.metricValues?.[0]?.value ?? "0", 10),
  }));

  setCached(cacheKey, data);
  return data;
}

export async function getDeviceSplit(propertyId: string, range: string) {
  const cacheKey = `${propertyId}:devices:${range}`;
  const cached = getCached(cacheKey);
  if (cached !== null) return cached;

  const client = getGA4Client();
  const { startDate, endDate } = rangeToDates(range);

  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: "deviceCategory" }],
    metrics: [{ name: "sessions" }],
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
  });

  const data = (response.rows ?? []).map((row) => ({
    device: row.dimensionValues?.[0]?.value ?? "Unknown",
    sessions: parseInt(row.metricValues?.[0]?.value ?? "0", 10),
  }));

  setCached(cacheKey, data);
  return data;
}
