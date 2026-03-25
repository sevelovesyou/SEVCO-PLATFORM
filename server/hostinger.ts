const HOSTINGER_BASE = "https://developers.hostinger.com";

function hostingerHeaders() {
  const key = process.env.HOSTINGER_API_KEY;
  if (!key) throw new Error("HOSTINGER_API_KEY is not configured");
  return {
    "Authorization": `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

async function hostingerFetch(path: string, options: RequestInit = {}) {
  const url = `${HOSTINGER_BASE}${path}`;
  console.log(`[Hostinger] ${options.method ?? "GET"} ${path}`);
  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers: {
        ...hostingerHeaders(),
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

export function isHostingerConfigured() {
  return !!process.env.HOSTINGER_API_KEY;
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
