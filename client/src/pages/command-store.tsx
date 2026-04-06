import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { usePermission } from "@/hooks/use-permission";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ShoppingBag,
  Shield,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Plus,
  CheckCircle,
  XCircle,
  DollarSign,
  TrendingUp,
  BarChart2,
  Package,
  Tag,
  Pencil,
} from "lucide-react";
import type { Product, Order, StoreCategory } from "@shared/schema";
import { PhotoUploadGrid } from "@/components/photo-upload-grid";

const STOCK_STATUS_COLORS: Record<string, string> = {
  available:   "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  unavailable: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  preorder:    "bg-yellow-500/10 text-yellow-700 dark:text-yellow-500 border-yellow-500/20",
};

const productFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
  description: z.string().optional(),
  price: z.string().min(1, "Price is required").refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, "Must be a valid price"),
  categoryName: z.string().min(1, "Category is required"),
  stockStatus: z.enum(["available", "unavailable", "preorder"]),
  imageUrls: z.array(z.string()).max(5).optional(),
});

type ProductFormData = z.infer<typeof productFormSchema>;

function slugify(str: string): string {
  return str.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function StockBadge({ status }: { status: string }) {
  const className = STOCK_STATUS_COLORS[status] ?? "bg-muted text-muted-foreground border-border";
  return (
    <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded border capitalize ${className}`}>
      {status}
    </span>
  );
}

function AddProductDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();

  const { data: storeCategories, isLoading: categoriesLoading } = useQuery<StoreCategory[]>({
    queryKey: ["/api/store/categories"],
  });

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      price: "",
      categoryName: "",
      stockStatus: "available",
      imageUrls: [],
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const imageUrls = data.imageUrls || [];
      const payload = {
        name: data.name,
        slug: data.slug,
        description: data.description || null,
        price: parseFloat(data.price),
        categoryName: data.categoryName,
        stockStatus: data.stockStatus,
        imageUrls,
        imageUrl: imageUrls[0] || null,
      };
      const res = await apiRequest("POST", "/api/store/products", payload);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create product");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/store/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/store/stats"] });
      toast({ title: "Product created" });
      form.reset();
      onClose();
    },
    onError: (err: any) => {
      toast({ title: err.message || "Failed to create product", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Product</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Product name"
                      data-testid="input-product-name"
                      onChange={(e) => {
                        field.onChange(e);
                        if (!form.getValues("slug") || form.getValues("slug") === slugify(form.getValues("name"))) {
                          form.setValue("slug", slugify(e.target.value));
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="product-slug" data-testid="input-product-slug" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price ($)</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" min="0" placeholder="0.00" data-testid="input-product-price" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="categoryName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    {categoriesLoading ? (
                      <Select disabled>
                        <FormControl>
                          <SelectTrigger data-testid="select-product-category">
                            <SelectValue placeholder="Loading…" />
                          </SelectTrigger>
                        </FormControl>
                      </Select>
                    ) : storeCategories && storeCategories.length > 0 ? (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger data-testid="select-product-category">
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {storeCategories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <FormControl>
                        <Input {...field} placeholder="e.g. Apparel" data-testid="select-product-category" />
                      </FormControl>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="stockStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stock Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger data-testid="select-product-stock">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="unavailable">Unavailable</SelectItem>
                      <SelectItem value="preorder">Pre-order</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Product description..." rows={2} data-testid="textarea-product-description" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="imageUrls"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Photos <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                  <FormControl>
                    <PhotoUploadGrid
                      value={field.value ?? []}
                      onChange={field.onChange}
                      max={5}
                      bucket="products"
                      slug={form.watch("slug") || "product"}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending} data-testid="button-submit-product">
                {mutation.isPending ? "Creating..." : "Create Product"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function ProductRow({ product }: { product: Product }) {
  const { toast } = useToast();

  const toggleMutation = useMutation({
    mutationFn: () => {
      const newStatus = product.stockStatus === "available" ? "unavailable" : "available";
      return apiRequest("PATCH", `/api/store/products/${product.id}`, { stockStatus: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/store/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/store/stats"] });
      toast({ title: "Stock status updated" });
    },
    onError: () => {
      toast({ title: "Failed to update stock status", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/store/products/${product.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/store/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/store/stats"] });
      toast({ title: "Product deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete product", variant: "destructive" });
    },
  });

  const isAvailable = product.stockStatus === "available";

  return (
    <tr
      className="border-b last:border-0 hover:bg-muted/30 transition-colors"
      data-testid={`row-product-${product.id}`}
    >
      <td className="p-3 font-medium text-sm">{product.name}</td>
      <td className="p-3 text-xs text-muted-foreground hidden md:table-cell capitalize">{product.categoryName}</td>
      <td className="p-3 text-xs font-medium" data-testid={`text-price-${product.id}`}>
        ${product.price.toFixed(2)}
      </td>
      <td className="p-3">
        <StockBadge status={product.stockStatus} />
      </td>
      <td className="p-3">
        <div className="flex items-center gap-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => toggleMutation.mutate()}
                disabled={toggleMutation.isPending || deleteMutation.isPending}
                data-testid={`button-toggle-stock-${product.id}`}
                aria-label={isAvailable ? "Mark unavailable" : "Mark available"}
              >
                {isAvailable ? (
                  <ToggleRight className="h-4 w-4 text-green-600 dark:text-green-400" aria-hidden="true" />
                ) : (
                  <ToggleLeft className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isAvailable ? "Mark unavailable" : "Mark available"}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => {
                  if (window.confirm(`Delete "${product.name}"? This cannot be undone.`)) {
                    deleteMutation.mutate();
                  }
                }}
                disabled={deleteMutation.isPending || toggleMutation.isPending}
                data-testid={`button-delete-product-${product.id}`}
                aria-label={`Delete ${product.name}`}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete</TooltipContent>
          </Tooltip>
        </div>
      </td>
    </tr>
  );
}

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

const STOCK_PIE_COLORS: Record<string, string> = {
  available: "hsl(var(--chart-2))",
  sold_out: "hsl(var(--destructive))",
};

function StoreAnalyticsTab() {
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
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: "Total Products", value: stats?.totalProducts, icon: ShoppingBag, color: "text-primary", testId: "stat-total-products" },
          { label: "In Stock", value: stats?.inStock, icon: CheckCircle, color: "text-green-600 dark:text-green-400", testId: "stat-in-stock" },
          { label: "Sold Out", value: stats?.outOfStock, icon: XCircle, color: "text-red-600 dark:text-red-400", testId: "stat-out-of-stock" },
          { label: "Catalog Value", value: stats?.catalogValue, icon: DollarSign, color: "text-blue-700 dark:text-blue-400", testId: "stat-catalog-value", formatter: (v: number) => `$${v.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` },
          { label: "Avg Price", value: stats?.avgPrice, icon: TrendingUp, color: "text-red-700 dark:text-red-500", testId: "stat-avg-price", formatter: (v: number) => `$${v.toFixed(2)}` },
        ].map(({ label, value, icon: Icon, color, testId, formatter }) => (
          <Card key={label} className="p-4 overflow-visible">
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
        ))}
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
                        fill={STOCK_PIE_COLORS[entry.originalStatus] ?? CHART_COLORS[idx % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                      fontSize: "12px",
                      color: "hsl(var(--foreground))",
                    }}
                  />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: "12px" }} />
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
                  <RechartsTooltip
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
              <BarChart data={stats?.byCategory} margin={{ top: 4, right: 8, bottom: 24, left: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} width={30} />
                <RechartsTooltip
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

      {topCategoriesByValue.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Top Categories by Value
          </h2>
          <Card className="overflow-hidden overflow-visible">
            <div className="divide-y">
              {topCategoriesByValue.map((cat, idx) => (
                <div key={cat.name} className="flex items-center gap-3 px-4 py-3" data-testid={`row-category-value-${idx}`}>
                  <span className="text-xs font-bold text-muted-foreground w-4 text-right shrink-0">{idx + 1}</span>
                  <span className="flex-1 text-sm font-medium">{cat.name}</span>
                  <span className="text-xs text-muted-foreground">{cat.count} products</span>
                  <span className="text-sm font-bold text-blue-700 dark:text-blue-400">
                    ${cat.value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

const ORDER_STATUS_OPTIONS = ["pending", "processing", "fulfilled", "shipped", "cancelled"];

const ORDER_STATUS_COLORS: Record<string, string> = {
  pending:    "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
  processing: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  fulfilled:  "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  shipped:    "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
  cancelled:  "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
};

function OrderStatusBadge({ status }: { status: string }) {
  const className = ORDER_STATUS_COLORS[status] ?? "bg-muted text-muted-foreground border-border";
  return (
    <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded border capitalize ${className}`}>
      {status}
    </span>
  );
}

function OrderRow({ order }: { order: Order }) {
  const { toast } = useToast();

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) => apiRequest("PATCH", `/api/orders/${order.id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({ title: "Order status updated" });
    },
    onError: () => {
      toast({ title: "Failed to update order status", variant: "destructive" });
    },
  });

  const items = Array.isArray(order.items) ? order.items as Array<{ quantity?: number }> : [];
  const itemCount = items.reduce((sum, item) => sum + (item.quantity ?? 1), 0);

  return (
    <tr className="border-b last:border-0 hover:bg-muted/30 transition-colors" data-testid={`row-order-${order.id}`}>
      <td className="p-3 text-xs font-mono text-muted-foreground">#{order.id}</td>
      <td className="p-3 text-xs">{order.userId ?? <span className="text-muted-foreground">Guest</span>}</td>
      <td className="p-3 text-xs text-muted-foreground hidden md:table-cell">
        {new Date(order.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
      </td>
      <td className="p-3 text-xs font-medium" data-testid={`text-order-total-${order.id}`}>
        ${(order.total / 100).toFixed(2)}
      </td>
      <td className="p-3">
        <OrderStatusBadge status={order.status} />
      </td>
      <td className="p-3 text-xs text-muted-foreground">{itemCount}</td>
      <td className="p-3">
        <Select
          value={order.status}
          onValueChange={(s) => updateStatusMutation.mutate(s)}
          disabled={updateStatusMutation.isPending}
        >
          <SelectTrigger className="h-7 text-xs w-32" data-testid={`select-order-status-${order.id}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ORDER_STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s} className="text-xs capitalize">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
    </tr>
  );
}

function StoreOrdersTab() {
  const { data: orders, isLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Package className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Orders
        </h2>
        {orders && (
          <span className="text-xs text-muted-foreground">
            {orders.length} order{orders.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>
      <Card className="overflow-hidden overflow-visible" data-testid="table-orders">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Order ID</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">User</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Date</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Total</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Items</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Update Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="p-3"><Skeleton className="h-4 w-10" /></td>
                    <td className="p-3"><Skeleton className="h-4 w-24" /></td>
                    <td className="p-3 hidden md:table-cell"><Skeleton className="h-4 w-20" /></td>
                    <td className="p-3"><Skeleton className="h-4 w-14" /></td>
                    <td className="p-3"><Skeleton className="h-4 w-16" /></td>
                    <td className="p-3"><Skeleton className="h-4 w-8" /></td>
                    <td className="p-3"><Skeleton className="h-7 w-28" /></td>
                  </tr>
                ))
              ) : orders && orders.length > 0 ? (
                orders.map((order) => (
                  <OrderRow key={order.id} order={order} />
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-sm text-muted-foreground">
                    No orders yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

const categoryFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().optional(),
  displayOrder: z.coerce.number().int().default(0),
});

type CategoryFormData = z.infer<typeof categoryFormSchema>;

function CategoryDialog({
  open,
  onClose,
  category,
}: {
  open: boolean;
  onClose: () => void;
  category?: StoreCategory;
}) {
  const { toast } = useToast();
  const isEdit = !!category;

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: category?.name ?? "",
      description: category?.description ?? "",
      displayOrder: category?.displayOrder ?? 0,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: category?.name ?? "",
        description: category?.description ?? "",
        displayOrder: category?.displayOrder ?? 0,
      });
    }
  }, [open, category]);

  const mutation = useMutation({
    mutationFn: async (data: CategoryFormData) => {
      const payload = {
        name: data.name,
        description: data.description || null,
        displayOrder: data.displayOrder,
      };
      const res = isEdit
        ? await apiRequest("PATCH", `/api/store/categories/${category!.id}`, payload)
        : await apiRequest("POST", "/api/store/categories", payload);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/store/categories"] });
      toast({ title: isEdit ? "Category updated" : "Category created" });
      form.reset();
      onClose();
    },
    onError: (err: any) => {
      toast({ title: err.message || "Failed to save category", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Category" : "Add Category"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. Apparel" data-testid="input-category-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Brief description…" rows={2} data-testid="textarea-category-description" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="displayOrder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Order</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" placeholder="0" data-testid="input-category-order" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending} data-testid="button-submit-category">
                {mutation.isPending ? "Saving…" : isEdit ? "Save Changes" : "Create Category"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function StoreCategoriesTab() {
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<StoreCategory | undefined>(undefined);

  const { data: categories, isLoading } = useQuery<StoreCategory[]>({
    queryKey: ["/api/store/categories"],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/store/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/store/categories"] });
      toast({ title: "Category deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete category", variant: "destructive" });
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Tag className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Categories
        </h2>
        {categories && (
          <span className="text-xs text-muted-foreground">
            {categories.length} categor{categories.length !== 1 ? "ies" : "y"}
          </span>
        )}
        <Button
          size="sm"
          className="ml-auto h-7 text-xs gap-1"
          onClick={() => setAddOpen(true)}
          data-testid="button-add-category"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Category
        </Button>
      </div>

      <Card className="overflow-hidden overflow-visible" data-testid="table-categories">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Name</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Description</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Order</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="p-3"><Skeleton className="h-4 w-24" /></td>
                    <td className="p-3 hidden md:table-cell"><Skeleton className="h-4 w-40" /></td>
                    <td className="p-3"><Skeleton className="h-4 w-8" /></td>
                    <td className="p-3"><Skeleton className="h-7 w-16" /></td>
                  </tr>
                ))
              ) : categories && categories.length > 0 ? (
                categories.map((cat) => (
                  <tr key={cat.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors" data-testid={`row-category-${cat.id}`}>
                    <td className="p-3 font-medium text-sm">{cat.name}</td>
                    <td className="p-3 text-xs text-muted-foreground hidden md:table-cell">
                      {cat.description ?? <span className="italic opacity-50">—</span>}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">{cat.displayOrder}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setEditCategory(cat)}
                              data-testid={`button-edit-category-${cat.id}`}
                              aria-label={`Edit ${cat.name}`}
                            >
                              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => {
                                if (window.confirm(`Delete category "${cat.name}"? This cannot be undone.`)) {
                                  deleteMutation.mutate(cat.id);
                                }
                              }}
                              disabled={deleteMutation.isPending}
                              data-testid={`button-delete-category-${cat.id}`}
                              aria-label={`Delete ${cat.name}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete</TooltipContent>
                        </Tooltip>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-sm text-muted-foreground">
                    No categories yet. Add one to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <CategoryDialog open={addOpen} onClose={() => setAddOpen(false)} />
      <CategoryDialog
        open={!!editCategory}
        onClose={() => setEditCategory(undefined)}
        category={editCategory}
      />
    </div>
  );
}

export default function CommandStore() {
  const { isAdmin, isExecutive, isStaff } = usePermission();
  const [showAddDialog, setShowAddDialog] = useState(false);

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/store/products"],
  });

  const canManageProducts = isAdmin || isExecutive || isStaff;

  if (!isAdmin && !isExecutive && !isStaff) {
    return (
      <Card className="p-6 text-center overflow-visible">
        <Shield className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-40" />
        <p className="text-sm text-muted-foreground">Staff access or higher required.</p>
      </Card>
    );
  }

  return (
    <Tabs defaultValue="catalog">
      <TabsList className="mb-6">
        <TabsTrigger value="catalog" data-testid="tab-store-catalog">
          <ShoppingBag className="h-3.5 w-3.5 mr-1.5" /> Catalog
        </TabsTrigger>
        <TabsTrigger value="categories" data-testid="tab-store-categories">
          <Tag className="h-3.5 w-3.5 mr-1.5" /> Categories
        </TabsTrigger>
        <TabsTrigger value="analytics" data-testid="tab-store-analytics">
          <BarChart2 className="h-3.5 w-3.5 mr-1.5" /> Analytics
        </TabsTrigger>
        <TabsTrigger value="orders" data-testid="tab-store-orders">
          <Package className="h-3.5 w-3.5 mr-1.5" /> Orders
        </TabsTrigger>
      </TabsList>

      <TabsContent value="catalog">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Product Catalog
            </h2>
            {products && (
              <span className="text-xs text-muted-foreground">
                {products.length} product{products.length !== 1 ? "s" : ""}
              </span>
            )}
            {canManageProducts && (
            <Button
              size="sm"
              className="ml-auto h-7 text-xs gap-1"
              onClick={() => setShowAddDialog(true)}
              data-testid="button-add-product"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Product
            </Button>
            )}
          </div>

          <Card className="overflow-hidden overflow-visible" data-testid="table-products">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">Name</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Category</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">Price</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">Stock</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="p-3"><Skeleton className="h-4 w-32" /></td>
                        <td className="p-3 hidden md:table-cell"><Skeleton className="h-4 w-20" /></td>
                        <td className="p-3"><Skeleton className="h-4 w-14" /></td>
                        <td className="p-3"><Skeleton className="h-4 w-16" /></td>
                        <td className="p-3"><Skeleton className="h-4 w-16" /></td>
                      </tr>
                    ))
                  ) : products && products.length > 0 ? (
                    products.map((product) => (
                      <ProductRow key={product.id} product={product} />
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-sm text-muted-foreground">
                        No products found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <AddProductDialog open={showAddDialog} onClose={() => setShowAddDialog(false)} />
        </div>
      </TabsContent>

      <TabsContent value="categories">
        <StoreCategoriesTab />
      </TabsContent>

      <TabsContent value="analytics">
        <StoreAnalyticsTab />
      </TabsContent>

      <TabsContent value="orders">
        <StoreOrdersTab />
      </TabsContent>
    </Tabs>
  );
}
