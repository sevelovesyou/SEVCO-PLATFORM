import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  ShoppingBag,
  CheckCircle,
  XCircle,
  DollarSign,
  TrendingUp,
  ArrowLeft,
  BarChart2,
} from "lucide-react";

interface StoreStats {
  totalProducts: number;
  inStock: number;
  outOfStock: number;
  catalogValue: number;
  avgPrice: number;
  byCategory: Array<{ name: string; count: number; value: number }>;
  byStockStatus: Array<{ status: string; count: number }>;
  byPriceRange: Array<{ range: string; count: number }>;
}

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const STOCK_COLORS: Record<string, string> = {
  available: "hsl(var(--chart-2))",
  sold_out: "hsl(var(--destructive))",
};

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  testId,
  formatter,
}: {
  label: string;
  value: number | undefined;
  icon: typeof ShoppingBag;
  color?: string;
  testId?: string;
  formatter?: (v: number) => string;
}) {
  return (
    <Card className="p-4 overflow-visible">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className={`h-4 w-4 ${color ?? "text-muted-foreground"}`} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      {value === undefined ? (
        <Skeleton className="h-7 w-20" />
      ) : (
        <p className="text-2xl font-bold" data-testid={testId}>
          {formatter ? formatter(value) : value}
        </p>
      )}
    </Card>
  );
}

function StockStatusLabel({ status }: { status: string }) {
  if (status === "available") return "In Stock";
  if (status === "sold_out") return "Sold Out";
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function StoreStatsPage() {
  const { data: stats, isLoading } = useQuery<StoreStats>({
    queryKey: ["/api/store/stats"],
  });

  const stockStatusData = stats?.byStockStatus.map((s) => ({
    name: s.status === "available" ? "In Stock" : s.status === "sold_out" ? "Sold Out" : s.status,
    value: s.count,
    originalStatus: s.status,
  })) ?? [];

  const topCategoriesByValue = [...(stats?.byCategory ?? [])].sort((a, b) => b.value - a.value).slice(0, 8);

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href="/store">
          <button
            className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 text-sm"
            data-testid="button-back-store"
          >
            <ArrowLeft className="h-4 w-4" />
            Store
          </button>
        </Link>
        <span className="text-muted-foreground/40">/</span>
        <div className="flex items-center gap-2">
          <BarChart2 className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold tracking-tight">Store Analytics</h1>
        </div>
      </div>

      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Catalog Summary
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard
            label="Total Products"
            value={stats?.totalProducts}
            icon={ShoppingBag}
            color="text-primary"
            testId="stat-total-products"
          />
          <StatCard
            label="In Stock"
            value={stats?.inStock}
            icon={CheckCircle}
            color="text-green-600 dark:text-green-400"
            testId="stat-in-stock"
          />
          <StatCard
            label="Sold Out"
            value={stats?.outOfStock}
            icon={XCircle}
            color="text-red-600 dark:text-red-400"
            testId="stat-out-of-stock"
          />
          <StatCard
            label="Catalog Value"
            value={stats?.catalogValue}
            icon={DollarSign}
            color="text-violet-600 dark:text-violet-400"
            testId="stat-catalog-value"
            formatter={(v) => `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          />
          <StatCard
            label="Avg Price"
            value={stats?.avgPrice}
            icon={TrendingUp}
            color="text-orange-600 dark:text-orange-400"
            testId="stat-avg-price"
            formatter={(v) => `$${v.toFixed(2)}`}
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Stock Status
          </h2>
          <Card className="p-4 overflow-visible">
            {isLoading ? (
              <Skeleton className="h-52 w-full" />
            ) : stockStatusData.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-sm text-muted-foreground">
                No products yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={stockStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                  >
                    {stockStatusData.map((entry, idx) => (
                      <Cell
                        key={entry.originalStatus}
                        fill={STOCK_COLORS[entry.originalStatus] ?? CHART_COLORS[idx % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                      fontSize: "12px",
                      color: "hsl(var(--foreground))",
                    }}
                  />
                  <Legend
                    iconSize={8}
                    wrapperStyle={{ fontSize: "12px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>

        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Price Distribution
          </h2>
          <Card className="p-4 overflow-visible">
            {isLoading ? (
              <Skeleton className="h-52 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stats?.byPriceRange ?? []} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                  <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} width={30} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                      fontSize: "12px",
                      color: "hsl(var(--foreground))",
                    }}
                    formatter={(v: number) => [v, "Products"]}
                  />
                  <Bar dataKey="count" fill="hsl(var(--chart-3))" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>
      </div>

      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Products by Category
        </h2>
        <Card className="p-4 overflow-visible">
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (stats?.byCategory.length ?? 0) === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
              No products yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={stats?.byCategory}
                margin={{ top: 4, right: 8, bottom: 24, left: 0 }}
              >
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  angle={-20}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} width={30} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                    fontSize: "12px",
                    color: "hsl(var(--foreground))",
                  }}
                  formatter={(v: number) => [v, "Products"]}
                />
                <Bar dataKey="count" fill="hsl(var(--chart-1))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Top Categories by Catalog Value
        </h2>
        <Card className="overflow-hidden overflow-visible">
          {isLoading ? (
            <div className="p-4 flex flex-col gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : topCategoriesByValue.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">No products yet</div>
          ) : (
            <div className="divide-y">
              {topCategoriesByValue.map((cat, idx) => (
                <div
                  key={cat.name}
                  className="flex items-center gap-3 px-4 py-3"
                  data-testid={`row-category-value-${idx}`}
                >
                  <span className="text-xs font-bold text-muted-foreground w-4 text-right shrink-0">
                    {idx + 1}
                  </span>
                  <span className="flex-1 text-sm font-medium">{cat.name}</span>
                  <span className="text-xs text-muted-foreground">{cat.count} products</span>
                  <span className="text-sm font-bold text-violet-600 dark:text-violet-400">
                    ${cat.value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
