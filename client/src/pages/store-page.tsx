import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  ShoppingBag, Plus, Package, ArrowUpDown, SlidersHorizontal,
  AlertCircle, Eye, ShoppingCart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePermission } from "@/hooks/use-permission";
import type { Product } from "@shared/schema";

const CAN_MANAGE_STORE = ["admin", "executive", "staff"];

type SortKey = "featured" | "price-asc" | "price-desc" | "name-asc" | "name-desc";
const SORT_LABELS: Record<SortKey, string> = {
  "featured":   "Featured",
  "price-asc":  "Price: Low to High",
  "price-desc": "Price: High to Low",
  "name-asc":   "Name: A–Z",
  "name-desc":  "Name: Z–A",
};

const CATEGORY_PALETTES: Record<string, { bg: string; text: string; border: string; gradient: string }> = {
  apparel:      { bg: "bg-indigo-500/10",  text: "text-indigo-700 dark:text-indigo-300",  border: "border-indigo-500/20",  gradient: "from-indigo-400 to-indigo-600" },
  music:        { bg: "bg-violet-500/10",  text: "text-violet-700 dark:text-violet-300",  border: "border-violet-500/20",  gradient: "from-violet-400 to-violet-600" },
  accessories:  { bg: "bg-rose-500/10",    text: "text-rose-700 dark:text-rose-300",      border: "border-rose-500/20",    gradient: "from-rose-400 to-rose-600" },
  vinyl:        { bg: "bg-amber-500/10",   text: "text-amber-700 dark:text-amber-400",    border: "border-amber-500/20",   gradient: "from-amber-400 to-amber-600" },
  electronics:  { bg: "bg-blue-500/10",    text: "text-blue-700 dark:text-blue-300",      border: "border-blue-500/20",    gradient: "from-blue-400 to-blue-600" },
  posters:      { bg: "bg-pink-500/10",    text: "text-pink-700 dark:text-pink-300",      border: "border-pink-500/20",    gradient: "from-pink-400 to-pink-600" },
  collectibles: { bg: "bg-teal-500/10",    text: "text-teal-700 dark:text-teal-300",      border: "border-teal-500/20",    gradient: "from-teal-400 to-teal-600" },
  art:          { bg: "bg-fuchsia-500/10", text: "text-fuchsia-700 dark:text-fuchsia-300",border: "border-fuchsia-500/20", gradient: "from-fuchsia-400 to-fuchsia-600" },
  digital:      { bg: "bg-sky-500/10",     text: "text-sky-700 dark:text-sky-300",        border: "border-sky-500/20",     gradient: "from-sky-400 to-sky-600" },
};
const DEFAULT_PALETTE = { bg: "bg-orange-500/10", text: "text-orange-700 dark:text-orange-300", border: "border-orange-500/20", gradient: "from-orange-400 to-amber-500" };

function getCategoryPalette(cat: string) {
  return CATEGORY_PALETTES[cat.toLowerCase()] ?? DEFAULT_PALETTE;
}

function ProductImageArea({ product }: { product: Product }) {
  const [imgError, setImgError] = useState(false);
  const soldOut = product.stockStatus === "sold_out";
  const palette = getCategoryPalette(product.categoryName);
  const initial = product.name.charAt(0).toUpperCase();

  return (
    <div className="relative aspect-square overflow-hidden bg-muted/40 rounded-t-xl">
      {product.imageUrl && !imgError ? (
        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className={`w-full h-full flex flex-col items-center justify-center gap-2 ${palette.bg}`}>
          <span className={`text-5xl font-black tracking-tight ${palette.text} opacity-40`}>{initial}</span>
          <Package className={`h-6 w-6 ${palette.text} opacity-20`} />
        </div>
      )}

      {soldOut && (
        <div className="absolute top-3 left-3">
          <span
            data-testid={`badge-sold-out-${product.id}`}
            className="bg-black/80 text-white text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-sm"
          >
            Sold Out
          </span>
        </div>
      )}

      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-end justify-center pb-4 opacity-0 group-hover:opacity-100">
        <div className="flex gap-2 translate-y-2 group-hover:translate-y-0 transition-transform duration-200">
          <Link href={`/store/products/${product.slug}`}>
            <Button
              size="sm"
              variant="secondary"
              className="bg-white text-black hover:bg-white/90 shadow-md text-xs font-semibold px-3"
              data-testid={`button-view-${product.id}`}
            >
              <Eye className="h-3 w-3 mr-1" />
              View
            </Button>
          </Link>
          {!soldOut && (
            <Button
              size="sm"
              className="bg-orange-500 hover:bg-orange-600 text-white shadow-md text-xs font-semibold px-3"
              data-testid={`button-add-to-cart-${product.id}`}
            >
              <ShoppingCart className="h-3 w-3 mr-1" />
              Add to Cart
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  const soldOut = product.stockStatus === "sold_out";
  return (
    <div
      data-testid={`card-product-${product.id}`}
      className="group cursor-pointer flex flex-col"
    >
      <ProductImageArea product={product} />
      <div className="pt-3 pb-1 px-0.5 flex flex-col gap-0.5">
        <p
          className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium truncate"
          data-testid={`text-category-${product.id}`}
        >
          {product.categoryName}
        </p>
        <h3
          className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors"
          data-testid={`text-name-${product.id}`}
        >
          {product.name}
        </h3>
        <p
          className="text-sm font-bold mt-0.5"
          data-testid={`text-price-${product.id}`}
        >
          {soldOut ? (
            <span className="text-muted-foreground line-through">${product.price.toFixed(2)}</span>
          ) : (
            <span className="text-orange-600 dark:text-orange-400">${product.price.toFixed(2)}</span>
          )}
        </p>
      </div>
    </div>
  );
}

function ProductCardSkeleton() {
  return (
    <div className="flex flex-col">
      <Skeleton className="aspect-square w-full rounded-xl" />
      <div className="pt-3 flex flex-col gap-1.5">
        <Skeleton className="h-2.5 w-16" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/3" />
      </div>
    </div>
  );
}

function CategoryBanner({ name, count, active, onClick }: {
  name: string; count: number; active: boolean; onClick: () => void;
}) {
  const palette = getCategoryPalette(name);
  return (
    <button
      onClick={onClick}
      data-testid={`banner-category-${name.toLowerCase().replace(/\s+/g, "-")}`}
      className={`group relative rounded-xl overflow-hidden border transition-all duration-200 cursor-pointer text-left shrink-0 w-36 md:w-auto ${
        active
          ? `${palette.bg} ${palette.border} border-2 shadow-sm`
          : "border-border bg-card hover:border-orange-300 dark:hover:border-orange-700"
      }`}
    >
      <div className={`h-20 w-full flex items-end p-3 ${active ? palette.bg : "bg-muted/30 group-hover:bg-muted/60 transition-colors"}`}>
        <div>
          <p className={`text-xs font-bold leading-tight ${active ? palette.text : "text-foreground"}`}>{name}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{count} item{count !== 1 ? "s" : ""}</p>
        </div>
      </div>
    </button>
  );
}

function AllCategoryBanner({ active, count, onClick }: { active: boolean; count: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      data-testid="banner-category-all"
      className={`group relative rounded-xl overflow-hidden border transition-all duration-200 cursor-pointer text-left shrink-0 w-36 md:w-auto ${
        active
          ? "bg-orange-500/10 border-orange-500/30 border-2 shadow-sm"
          : "border-border bg-card hover:border-orange-300 dark:hover:border-orange-700"
      }`}
    >
      <div className={`h-20 w-full flex items-end p-3 ${active ? "bg-orange-500/10" : "bg-muted/30 group-hover:bg-muted/60 transition-colors"}`}>
        <div>
          <p className={`text-xs font-bold leading-tight ${active ? "text-orange-700 dark:text-orange-300" : "text-foreground"}`}>All Products</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{count} item{count !== 1 ? "s" : ""}</p>
        </div>
      </div>
    </button>
  );
}

function sortProducts(products: Product[], sort: SortKey): Product[] {
  const sorted = [...products];
  switch (sort) {
    case "price-asc":  return sorted.sort((a, b) => a.price - b.price);
    case "price-desc": return sorted.sort((a, b) => b.price - a.price);
    case "name-asc":   return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case "name-desc":  return sorted.sort((a, b) => b.name.localeCompare(a.name));
    default:           return sorted.sort((a, b) => b.id - a.id);
  }
}

export default function StorePage() {
  const { role } = usePermission();
  const canManage = role && CAN_MANAGE_STORE.includes(role);
  const [activeCategory, setActiveCategory] = useState("all");
  const [sort, setSort] = useState<SortKey>("featured");

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["/api/store/products"],
  });

  const categoryMap = useMemo(() => {
    const map = new Map<string, number>();
    products.forEach((p) => map.set(p.categoryName, (map.get(p.categoryName) ?? 0) + 1));
    return map;
  }, [products]);

  const categories = useMemo(() => Array.from(categoryMap.keys()).sort(), [categoryMap]);

  const filtered = useMemo(() => {
    const base = activeCategory === "all" ? products : products.filter((p) => p.categoryName === activeCategory);
    return sortProducts(base, sort);
  }, [products, activeCategory, sort]);

  return (
    <div className="min-h-screen bg-background">
      <div className="relative overflow-hidden bg-gradient-to-br from-orange-600 via-orange-500 to-amber-400 px-6 py-14 md:py-20">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
        <div className="relative max-w-6xl mx-auto flex flex-col md:flex-row md:items-end md:justify-between gap-6">
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

      <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col gap-8">
        {(isLoading || categories.length > 0) && (
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-3 flex items-center gap-1.5">
              <SlidersHorizontal className="h-3 w-3" />
              Browse by Category
            </p>
            <div className="flex gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-4 lg:grid-cols-6 md:overflow-visible scrollbar-none">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-36 md:w-auto rounded-xl shrink-0" />
                ))
              ) : (
                <>
                  <AllCategoryBanner
                    active={activeCategory === "all"}
                    count={products.length}
                    onClick={() => setActiveCategory("all")}
                  />
                  {categories.map((cat) => (
                    <CategoryBanner
                      key={cat}
                      name={cat}
                      count={categoryMap.get(cat) ?? 0}
                      active={activeCategory === cat}
                      onClick={() => setActiveCategory(cat)}
                    />
                  ))}
                </>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2" data-testid="filter-pills">
            <button
              data-testid="pill-category-all"
              onClick={() => setActiveCategory("all")}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide border transition-colors duration-150 ${
                activeCategory === "all"
                  ? "bg-orange-500 text-white border-orange-500"
                  : "border-border text-muted-foreground hover:border-orange-400 hover:text-orange-500"
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                data-testid={`pill-category-${cat}`}
                onClick={() => setActiveCategory(cat === activeCategory ? "all" : cat)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide border transition-colors duration-150 ${
                  activeCategory === cat
                    ? "bg-orange-500 text-white border-orange-500"
                    : "border-border text-muted-foreground hover:border-orange-400 hover:text-orange-500"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger
                className="w-[170px] h-8 text-xs border-border/60"
                data-testid="select-sort"
              >
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                  <SelectItem key={key} value={key} data-testid={`sort-option-${key}`}>
                    {SORT_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-5 gap-y-8">
            {Array.from({ length: 8 }).map((_, i) => (
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
                  ? `No items in "${activeCategory}" yet.`
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-5 gap-y-8">
            {filtered.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
