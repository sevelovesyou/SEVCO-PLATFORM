import type { InsertMarketData } from "@shared/schema";

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

const STOCK_SYMBOLS: Array<{ symbol: string; name: string }> = [
  { symbol: "AAPL", name: "Apple" },
  { symbol: "TSLA", name: "Tesla" },
  { symbol: "NVDA", name: "Nvidia" },
  { symbol: "MSFT", name: "Microsoft" },
  { symbol: "AMZN", name: "Amazon" },
];

// Finnhub free tier does NOT support raw index symbols (^DJI, ^GSPC, ^IXIC) —
// those require a paid "CFD indices" subscription. ETF proxies are used instead.
const INDEX_SYMBOLS: Array<{ symbol: string; name: string }> = [
  { symbol: "DIA", name: "Dow Jones (DIA)" },
  { symbol: "SPY", name: "S&P 500 (SPY)" },
  { symbol: "QQQ", name: "Nasdaq 100 (QQQ)" },
];

async function fetchFinnhubQuote(symbol: string): Promise<{ price: number; changePercent: number } | null> {
  if (!FINNHUB_API_KEY) return null;
  try {
    const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${FINNHUB_API_KEY}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!resp.ok) return null;
    const data = await resp.json() as { c: number; dp: number };
    if (!data.c || data.c === 0) return null;
    return { price: data.c, changePercent: data.dp ?? 0 };
  } catch {
    return null;
  }
}

async function fetchCryptoData(): Promise<InsertMarketData[]> {
  try {
    const url = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,solana&order=market_cap_desc&per_page=3&page=1&price_change_percentage=24h";
    const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!resp.ok) return [];
    const data = await resp.json() as Array<{
      id: string;
      symbol: string;
      name: string;
      current_price: number;
      price_change_percentage_24h: number;
    }>;
    return data.map((coin) => ({
      instrumentType: "crypto",
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      price: coin.current_price,
      changePercent: coin.price_change_percentage_24h ?? 0,
      currency: "USD",
    }));
  } catch {
    return [];
  }
}

export async function fetchAllMarketData(): Promise<InsertMarketData[]> {
  const results: InsertMarketData[] = [];

  const cryptoData = await fetchCryptoData();
  results.push(...cryptoData);

  if (FINNHUB_API_KEY) {
    for (const idx of INDEX_SYMBOLS) {
      const quote = await fetchFinnhubQuote(idx.symbol);
      if (quote) {
        results.push({
          instrumentType: "index",
          symbol: idx.symbol,
          name: idx.name,
          price: quote.price,
          changePercent: quote.changePercent,
          currency: "USD",
        });
      }
    }

    for (const stock of STOCK_SYMBOLS) {
      const quote = await fetchFinnhubQuote(stock.symbol);
      if (quote) {
        results.push({
          instrumentType: "stock",
          symbol: stock.symbol,
          name: stock.name,
          price: quote.price,
          changePercent: quote.changePercent,
          currency: "USD",
        });
      }
    }
  } else {
    console.warn("[market-data] FINNHUB_API_KEY not set — skipping equity/index quotes");
  }

  return results;
}
