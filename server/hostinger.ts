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
  const res = await fetch(url, {
    ...options,
    headers: {
      ...hostingerHeaders(),
      ...(options.headers as Record<string, string> ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Hostinger API error ${res.status}: ${text}`);
  }
  return res.json();
}

export async function getVirtualMachines() {
  return hostingerFetch("/api/vps/v1/virtual-machines");
}

export async function getVirtualMachine(id: number | string) {
  return hostingerFetch(`/api/vps/v1/virtual-machines/${id}`);
}

export async function checkDomainAvailability(domain: string, tlds: string[] = []) {
  return hostingerFetch("/api/domains/v1/availability", {
    method: "POST",
    body: JSON.stringify({ domain, tlds }),
  });
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
