import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Package, Tag, ShoppingBag, CircleCheck, CircleX, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/hooks/use-cart";
import type { Product } from "@shared/schema";

export default function StoreProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { addItem } = useCart();

  const { data: product, isLoading, isError } = useQuery<Product>({
    queryKey: ["/api/store/products", slug],
    queryFn: async () => {
      const res = await fetch(`/api/store/products/${slug}`);
      if (!res.ok) throw new Error("Product not found");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">
        <Skeleton className="h-5 w-28" />
        <div className="flex gap-8">
          <Skeleton className="h-64 w-64 rounded-xl shrink-0" />
          <div className="flex-1 space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16 flex flex-col items-center gap-4 text-center">
        <div className="h-14 w-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <CircleX className="h-7 w-7 text-destructive" />
        </div>
        <div>
          <p className="font-semibold text-lg">Product Not Found</p>
          <p className="text-muted-foreground text-sm mt-1">
            This product doesn't exist or has been removed.
          </p>
        </div>
        <Link href="/store">
          <Button variant="outline" size="sm" data-testid="button-back-to-store">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Store
          </Button>
        </Link>
      </div>
    );
  }

  const inStock = product.stockStatus === "available";

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8">
          <Link href="/store">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground -ml-2"
              data-testid="button-back-to-store"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Store
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
          <div className="bg-muted/40 border border-border rounded-2xl overflow-hidden flex items-center justify-center h-72 md:h-80">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <Package className="h-24 w-24 text-muted-foreground/25" />
            )}
          </div>

          <div className="flex flex-col gap-5">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  {product.categoryName}
                </span>
                <Badge
                  variant={inStock ? "default" : "secondary"}
                  className="flex items-center gap-1 text-xs"
                  data-testid="status-stock"
                >
                  {inStock
                    ? <><CircleCheck className="h-3 w-3" /> In Stock</>
                    : <><CircleX className="h-3 w-3" /> Sold Out</>
                  }
                </Badge>
              </div>
              <h1
                className="text-3xl font-black tracking-tight"
                data-testid="text-product-name"
              >
                {product.name}
              </h1>
            </div>

            <div
              className="text-4xl font-black text-orange-600 dark:text-orange-400"
              data-testid="text-product-price"
            >
              ${product.price.toFixed(2)}
            </div>

            {product.description && (
              <p
                className="text-muted-foreground text-sm leading-relaxed"
                data-testid="text-product-description"
              >
                {product.description}
              </p>
            )}

            <div className="border-t border-border pt-5 space-y-3">
              <div className="flex gap-2 text-sm">
                <span className="text-muted-foreground w-28 shrink-0">Category</span>
                <span className="font-medium">{product.categoryName}</span>
              </div>
              <div className="flex gap-2 text-sm">
                <span className="text-muted-foreground w-28 shrink-0">Availability</span>
                <span className={`font-medium ${inStock ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                  {inStock ? "Available" : "Sold Out"}
                </span>
              </div>
              <div className="flex gap-2 text-sm">
                <span className="text-muted-foreground w-28 shrink-0">SKU / Slug</span>
                <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{product.slug}</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                disabled={!inStock}
                onClick={() => product && addItem(product)}
                data-testid="button-add-to-cart"
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                {inStock ? "Add to Cart" : "Unavailable"}
              </Button>
            </div>
            {!inStock && (
              <p className="text-xs text-muted-foreground -mt-2">
                This item is currently sold out.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
