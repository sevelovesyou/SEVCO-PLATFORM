import { useQuery, useMutation } from "@tanstack/react-query";
import { usePermission } from "@/hooks/use-permission";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Shield, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import type { Product } from "@shared/schema";

const STOCK_STATUS_COLORS: Record<string, string> = {
  available:   "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  unavailable: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  preorder:    "bg-yellow-500/10 text-yellow-700 dark:text-yellow-500 border-yellow-500/20",
};

function StockBadge({ status }: { status: string }) {
  const className = STOCK_STATUS_COLORS[status] ?? "bg-muted text-muted-foreground border-border";
  return (
    <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded border capitalize ${className}`}>
      {status}
    </span>
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
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => toggleMutation.mutate()}
            disabled={toggleMutation.isPending || deleteMutation.isPending}
            title={isAvailable ? "Mark unavailable" : "Mark available"}
            data-testid={`button-toggle-stock-${product.id}`}
          >
            {isAvailable ? (
              <ToggleRight className="h-4 w-4 text-green-600 dark:text-green-400" />
            ) : (
              <ToggleLeft className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
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
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

export default function CommandStore() {
  const { isAdmin, isExecutive } = usePermission();

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/store/products"],
  });

  if (!isAdmin && !isExecutive) {
    return (
      <Card className="p-6 text-center overflow-visible">
        <Shield className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-40" />
        <p className="text-sm text-muted-foreground">Admin or Executive access required.</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <ShoppingBag className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Product Catalog
        </h2>
        {products && (
          <span className="text-xs text-muted-foreground ml-auto">
            {products.length} product{products.length !== 1 ? "s" : ""}
          </span>
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
    </div>
  );
}
