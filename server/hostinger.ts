import { storage } from "./storage";

let _cachedApiKey: string | null = null;
let _cacheExpiry = 0;

async function getEffectiveApiKey(): Promise<string | null> {
  if (process.env.HOSTINGER_API_KEY) return process.env.HOSTINGER_API_KEY;
  const now = Date.now();
  if (_cachedApiKey !== null && now < _cacheExpiry) return _cachedApiKey || null;
  try {
    const settings = await storage.getPlatformSettings();
    _cachedApiKey = settings["hosting.apiKey"] || "";
    _cacheExpiry = now + 30_000;
    return _cachedApiKey || null;
  } catch {
    return null;
  }
}

export function invalidateApiKeyCache() {
  _cachedApiKey = null;
  _cacheExpiry = 0;
}

let _cachedBaseUrl: string | null = null;
let _baseUrlExpiry = 0;

async function getEffectiveBaseUrl(): Promise<string> {
  const now = Date.now();
  if (_cachedBaseUrl !== null && now < _baseUrlExpiry) return _cachedBaseUrl;
  try {
    const settings = await storage.getPlatformSettings();
    _cachedBaseUrl = settings["hosting.apiBaseUrl"] || "https://developers.hostinger.com";
    _baseUrlExpiry = now + 30_000;
    return _cachedBaseUrl;
  } catch {
    return "https://developers.hostinger.com";
  }
}

export function invalidateBaseUrlCache() {
  _cachedBaseUrl = null;
  _baseUrlExpiry = 0;
}

async function hostingerHeaders(): Promise<Record<string, string>> {
  const key = await getEffectiveApiKey();
  if (!key) throw new Error("HOSTINGER_API_KEY is not configured");
  return {
    "Authorization": `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

async function hostingerFetch(path: string, options: RequestInit = {}) {
  const base = await getEffectiveBaseUrl();
  const url = `${base}${path}`;
  console.log(`[Hostinger] ${options.method ?? "GET"} ${path}`);
  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers: {
        ...await hostingerHeaders(),
        ...(options.headers as Record<string, string> ?? {}),
      },
    });
  } catch (networkErr: any) {
    console.error(`[Hostinger] Network error for ${path}:`, networkErr.message);
    throw new Error(`Hostinger API unreachable: ${networkErr.message}`);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(`[Hostinger] HTTP ${res.status} for ${path}: ${text}`);
    throw new Error(`Hostinger API error ${res.status}: ${text}`);
  }
  const json = await res.json().catch((parseErr: any) => {
    console.error(`[Hostinger] JSON parse error for ${path}:`, parseErr.message);
    throw new Error(`Hostinger API returned non-JSON response`);
  });
  console.log(`[Hostinger] OK ${res.status} for ${path}`);
  return json;
}

export async function isHostingerConfigured(): Promise<boolean> {
  const key = await getEffectiveApiKey();
  return !!key;
}

export async function getVirtualMachines() {
  return hostingerFetch("/api/vps/v1/virtual-machines");
}

export async function getVirtualMachine(id: number | string) {
  return hostingerFetch(`/api/vps/v1/virtual-machines/${id}`);
}

interface HostingerAvailabilityItem {
  domain?: string;
  name?: string;
  available?: boolean;
  is_available?: boolean;
  price?: number;
  unit_price?: number;
  period?: number;
}

interface NormalizedDomainResult {
  domain: string;
  available: boolean;
  price?: number;
  period?: number;
}

export async function checkDomainAvailability(domain: string, tlds: string[] = []) {
  const raw: HostingerAvailabilityItem[] | { data: HostingerAvailabilityItem[] } =
    await hostingerFetch("/api/domains/v1/availability", {
      method: "POST",
      body: JSON.stringify({ domain, tlds }),
    });
  const items: HostingerAvailabilityItem[] = Array.isArray(raw) ? raw : (raw?.data ?? []);
  const normalized: NormalizedDomainResult[] = items.map((item) => ({
    domain: item.domain ?? item.name ?? "",
    available: !!(item.available ?? item.is_available ?? false),
    price: item.price ?? item.unit_price ?? undefined,
    period: item.period ?? undefined,
  }));
  return { data: normalized };
}

export async function getDomainCatalog(tld?: string) {
  const params = new URLSearchParams({ category: "DOMAIN" });
  if (tld) params.set("name", `${tld}*`);
  return hostingerFetch(`/api/billing/v1/catalog?${params.toString()}`);
}

export async function getDomainPortfolio() {
  return hostingerFetch("/api/domains/v1/portfolio");
}

export async function purchaseDomain(payload: {
  domain: string;
  whoisId: number;
  paymentMethodId?: number;
}) {
  return hostingerFetch("/api/domains/v1/portfolio", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getWhoisProfiles() {
  return hostingerFetch("/api/domains/v1/whois");
}

export async function getBillingCatalog() {
  return hostingerFetch("/api/billing/v1/catalog?category=DOMAIN");
}
