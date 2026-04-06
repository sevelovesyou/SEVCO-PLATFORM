import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { MarketData } from "@shared/schema";

function ChangeIndicator({ changePercent }: { changePercent: number }) {
  if (changePercent > 0) return <TrendingUp className="h-3 w-3 text-emerald-500 shrink-0" />;
  if (changePercent < 0) return <TrendingDown className="h-3 w-3 text-red-500 shrink-0" />;
  return <Minus className="h-3 w-3 text-muted-foreground shrink-0" />;
}

function formatPrice(price: number): string {
  if (price >= 10000) return price.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (price >= 100) return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

function TickerCard({ item }: { item: MarketData }) {
  const isPositive = item.changePercent > 0;
  const isNegative = item.changePercent < 0;

  return (
    <div
      className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors"
      data-testid={`market-ticker-${item.symbol}`}
    >
      <div className="min-w-0">
        <p className="text-xs font-bold text-foreground leading-tight truncate">{item.symbol.replace("^", "")}</p>
        <p className="text-[10px] text-muted-foreground truncate">{item.name}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-xs font-semibold text-foreground tabular-nums">${formatPrice(item.price)}</p>
        <div className="flex items-center gap-0.5 justify-end">
          <ChangeIndicator changePercent={item.changePercent} />
          <span
            className={`text-[10px] font-medium tabular-nums ${
              isPositive ? "text-emerald-500" : isNegative ? "text-red-500" : "text-muted-foreground"
            }`}
          >
            {isPositive ? "+" : ""}{item.changePercent.toFixed(2)}%
          </span>
        </div>
      </div>
    </div>
  );
}

function SectionBlock({ label, items }: { label: string; items: MarketData[] }) {
  if (!items.length) return null;
  return (
    <div>
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">{label}</p>
      <div className="space-y-1">
        {items.map((item) => (
          <TickerCard key={item.symbol} item={item} />
        ))}
      </div>
    </div>
  );
}

export function LiveMarkets() {
  const { data: marketItems, isLoading } = useQuery<MarketData[]>({
    queryKey: ["/api/market-data"],
    staleTime: 5 * 60 * 1000,
    refetchInterval: 7 * 60 * 1000,
  });

  const indices = marketItems?.filter((d) => d.instrumentType === "index") ?? [];
  const stocks = marketItems?.filter((d) => d.instrumentType === "stock") ?? [];
  const crypto = marketItems?.filter((d) => d.instrumentType === "crypto") ?? [];

  const hasData = indices.length > 0 || stocks.length > 0 || crypto.length > 0;

  if (isLoading) {
    return (
      <div className="w-full" data-testid="live-markets-loading">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold">Live Markets</h3>
        </div>
        <div className="space-y-1.5 border rounded-xl p-3 bg-card">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-9 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!marketItems || !hasData) return null;

  return (
    <div className="w-full" data-testid="live-markets">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-bold">Live Markets</h3>
        <span className="text-[10px] text-muted-foreground ml-auto">~7 min refresh</span>
      </div>
      <div className="border rounded-xl p-3 bg-card space-y-3">
        <SectionBlock label="Indices" items={indices} />
        <SectionBlock label="Stocks" items={stocks} />
        <SectionBlock label="Crypto" items={crypto} />
      </div>
    </div>
  );
}
