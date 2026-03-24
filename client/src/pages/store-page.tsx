import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ShoppingBag, Plus, Package, Tag, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePermission } from "@/hooks/use-permission";
import type { Product } from "@shared/schema";

const CAN_MANAGE_STORE = ["admin", "executive", "staff"];

function ProductCard({ product }: { product: Product }) {
  const inStock = product.stockStatus === "available";
  return (
    <Link href={`/store/products/${product.slug}`}>
      <div
        data-testid={`card-product-${product.id}`}
        className="group border border-border rounded-xl bg-card hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col"
      >
        <div className="bg-muted/40 flex items-center justify-center h-44 rounded-t-xl overflow-hidden">
          <Package className="h-16 w-16 text-muted-foreground/30" />
        </div>
        <div className="p-4 flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-sm leading-tight group-hover:text-primary transition-colors line-clamp-2 min-w-0">
              {product.name}
            </h3>
            <Badge
              variant={inStock ? "default" : "secondary"}
              className="shrink-0 text-xs"
              data-testid={`status-stock-${product.id}`}
            >
              {inStock ? "In Stock" : "Sold Out"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-3">
            {product.description || "No description provided."}
          </p>
          <div className="flex items-center justify-between pt-1">
            <span className="text-muted-foreground text-xs flex items-center gap-1 truncate">
              <Tag className="h-3 w-3 shrink-0" />
              {product.categoryName}
            </span>
            <span
              className="font-bold text-base shrink-0"
              data-testid={`text-price-${product.id}`}
            >
              ${product.price.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function ProductCardSkeleton() {
  return (
    <div className="border border-border rounded-xl bg-card flex flex-col">
      <Skeleton className="h-44 w-full rounded-t-xl" />
      <div className="p-4 flex flex-col gap-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
        <div className="flex justify-between pt-1">
          <Skeleton className="h-3 w-1/4" />
          <Skeleton className="h-5 w-16" />
        </div>
      </div>
    </div>
  );
}

export default function StorePage() {
  const { role } = usePermission();
  const canManage = role && CAN_MANAGE_STORE.includes(role);
  const [activeCategory, setActiveCategory] = useState("all");

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["/api/store/products"],
  });

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => set.add(p.categoryName));
    return Array.from(set).sort();
  }, [products]);

  const filtered = useMemo(() => {
    if (activeCategory === "all") return products;
    return products.filter((p) => p.categoryName === activeCategory);
  }, [products, activeCategory]);

  return (
    <div className="min-h-screen bg-background">
      <div className="relative overflow-hidden bg-gradient-to-br from-orange-600 via-orange-500 to-amber-400 px-6 py-14 md:py-20">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
        <div className="relative max-w-5xl mx-auto flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
                <ShoppingBag className="h-5 w-5 text-white" />
              </div>
              <span className="text-white/80 text-sm font-medium tracking-widest uppercase">SEVCO Store</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">Shop</h1>
            <p className="text-white/70 mt-2 max-w-md text-sm">
              Merchandise, exclusive drops, and products from the SEVCO universe.
            </p>
          </div>
          {canManage && (
            <Link href="/store/products/new">
              <Button
                data-testid="button-add-product"
                className="bg-white text-orange-600 hover:bg-white/90 font-semibold shadow-md"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {categories.length > 0 && (
          <Tabs value={activeCategory} onValueChange={setActiveCategory} className="mb-8">
            <TabsList data-testid="tabs-category-filter" className="flex flex-wrap h-auto gap-1 bg-muted/60 p-1">
              <TabsTrigger value="all" data-testid="tab-category-all">All</TabsTrigger>
              {categories.map((cat) => (
                <TabsTrigger key={cat} value={cat} data-testid={`tab-category-${cat}`}>
                  {cat}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="h-14 w-14 rounded-2xl bg-orange-500/10 flex items-center justify-center">
              <AlertCircle className="h-7 w-7 text-orange-500" />
            </div>
            <div>
              <p className="font-semibold text-base">No products found</p>
              <p className="text-muted-foreground text-sm mt-1">
                {activeCategory !== "all"
                  ? `No items in the "${activeCategory}" category yet.`
                  : "The store is empty. Check back soon."}
              </p>
            </div>
            {canManage && activeCategory === "all" && (
              <Link href="/store/products/new">
                <Button variant="outline" size="sm" data-testid="button-add-first-product">
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Product
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
